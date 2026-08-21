import { getQuestion, getSkillTagLabel } from "../../content";
import { restoreLearningBackup } from "../../backup-store";
import {
  ensureToolkitSchema,
  getToolkitDatabase,
  getToolkitUser,
  safeJsonArray,
  safeJsonObject,
  toolkitError,
} from "../../toolkit-store";

type D1Row = Record<string, unknown>;
type ItemType = "question" | "unit" | "vocabulary" | "grammar" | "lesson" | "general";

const ITEM_TYPES = new Set<ItemType>(["question", "unit", "vocabulary", "grammar", "lesson", "general"]);
const ACCENTS = new Set(["en-US", "en-GB", "en-AU"]);

function asText(value: unknown, max: number, label: string, allowEmpty = true) {
  const text = typeof value === "string" ? value.trim() : "";
  if ((!allowEmpty && !text) || text.length > max) throw new Error(`${label}格式不正確。`);
  return text;
}

function asItemType(value: unknown): ItemType {
  if (!ITEM_TYPES.has(value as ItemType)) throw new Error("學習項目類型不正確。");
  return value as ItemType;
}

function asTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((tag) => String(tag).trim()).filter((tag) => tag.length > 0 && tag.length <= 30))].slice(0, 10);
}

function taipeiDateDaysAgo(days: number) {
  const value = new Date(Date.now() - days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(value);
}

function eventActiveMs(row: D1Row) {
  const metadata = safeJsonObject(row.metadata_json);
  const value = Number(metadata.activeMs ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 30 * 60_000) : 0;
}

function buildPeriodReport(days: number, attempts: D1Row[], events: D1Row[], vocabAttempts: D1Row[]) {
  const firstDate = taipeiDateDaysAgo(days - 1);
  const periodAttempts = attempts.filter((row) => String(row.local_date ?? "") >= firstDate);
  const periodEvents = events.filter((row) => String(row.local_date ?? "") >= firstDate);
  const firstDateIso = `${firstDate}T00:00:00.000Z`;
  const periodVocab = vocabAttempts.filter((row) => String(row.reviewed_at ?? row.created_at ?? "") >= firstDateIso);
  const correct = periodAttempts.filter((row) => Number(row.correct ?? 0) === 1).length;
  const highConfidenceWrong = periodAttempts.filter((row) => Number(row.correct ?? 0) === 0 && Number(row.confidence ?? 0) >= 3).length;
  const listeningEvents = periodEvents.filter((row) => safeJsonArray(row.skill_tags_json).includes("listening.comprehension"));
  const activeMs = periodEvents.reduce((sum, row) => sum + eventActiveMs(row), 0);
  const dailyMap = new Map<string, { date: string; attempts: number; correct: number; activeMs: number }>();
  for (const row of periodAttempts) {
    const date = String(row.local_date ?? "");
    if (!date) continue;
    const day = dailyMap.get(date) ?? { date, attempts: 0, correct: 0, activeMs: 0 };
    day.attempts += 1;
    if (Number(row.correct ?? 0) === 1) day.correct += 1;
    dailyMap.set(date, day);
  }
  for (const row of periodEvents) {
    const date = String(row.local_date ?? "");
    if (!date) continue;
    const day = dailyMap.get(date) ?? { date, attempts: 0, correct: 0, activeMs: 0 };
    day.activeMs += eventActiveMs(row);
    dailyMap.set(date, day);
  }
  return {
    days,
    firstDate,
    attempts: periodAttempts.length,
    correct,
    accuracy: periodAttempts.length ? Math.round((correct / periodAttempts.length) * 100) : null,
    highConfidenceWrong,
    activeMinutes: Math.round(activeMs / 60_000),
    activeDays: new Set(periodAttempts.map((row) => String(row.local_date ?? "")).filter(Boolean)).size,
    listeningAnswers: listeningEvents.length,
    listeningReplays: listeningEvents.filter((row) => Number(row.replay_count ?? 0) >= 1).length,
    vocabularyReviews: periodVocab.length,
    daily: [...dailyMap.values()].sort((left, right) => left.date.localeCompare(right.date)),
  };
}

function estimatedMockRange(row: D1Row | undefined) {
  if (!row || Number(row.interrupted ?? 1) !== 0 || Number(row.completed_questions ?? 0) < 200) return null;
  const listening = Number(row.listening_correct ?? 0);
  const reading = Number(row.reading_correct ?? 0);
  if (!Number.isFinite(listening) || !Number.isFinite(reading)) return null;
  const center = Math.max(10, Math.min(990, Math.round((10 + (listening + reading) * 4.9) / 5) * 5));
  return {
    low: Math.max(10, center - 35),
    high: Math.min(990, center + 35),
    center,
    source: String(row.source_label ?? "完整模考"),
    date: String(row.local_date ?? ""),
    caveat: "依站內完整模考答對數做區間估算，不是 ETS 官方換算或正式成績。",
  };
}

export async function GET() {
  try {
    const database = await getToolkitDatabase();
    const user = await getToolkitUser();
    await ensureToolkitSchema(database);
    const now = new Date().toISOString();
    const [notes, bookmarks, sets, preferences, attempts, events, vocabAttempts, dueQuestions, dueVocabulary, skills, mocks, profile, imports] = await Promise.all([
      database.prepare("SELECT * FROM learning_notes WHERE user_key = ?1 ORDER BY updated_at DESC").bind(user.key).all<D1Row>(),
      database.prepare("SELECT * FROM learning_bookmarks WHERE user_key = ?1 ORDER BY updated_at DESC").bind(user.key).all<D1Row>(),
      database.prepare("SELECT * FROM custom_practice_sets WHERE user_key = ?1 ORDER BY updated_at DESC").bind(user.key).all<D1Row>(),
      database.prepare("SELECT * FROM learning_tool_preferences WHERE user_key = ?1").bind(user.key).first<D1Row>(),
      database.prepare("SELECT question_id, unit, correct, confidence, local_date, created_at FROM practice_attempts WHERE user_key = ?1 AND local_date >= ?2 ORDER BY id ASC").bind(user.key, taipeiDateDaysAgo(29)).all<D1Row>(),
      database.prepare("SELECT entity_id, correct, confidence, replay_count, skill_tags_json, metadata_json, local_date, created_at FROM learning_events WHERE user_key = ?1 AND event_type = 'question_answered' AND local_date >= ?2 ORDER BY id ASC").bind(user.key, taipeiDateDaysAgo(29)).all<D1Row>(),
      database.prepare("SELECT reviewed_at, created_at FROM vocabulary_attempts WHERE user_key = ?1 AND reviewed_at >= ?2 ORDER BY id ASC").bind(user.key, `${taipeiDateDaysAgo(29)}T00:00:00.000Z`).all<D1Row>(),
      database.prepare("SELECT COUNT(*) AS count FROM question_states WHERE user_key = ?1 AND next_review_at <= ?2").bind(user.key, now).first<D1Row>(),
      database.prepare("SELECT COUNT(*) AS count FROM vocabulary_states WHERE user_key = ?1 AND next_review_at <= ?2").bind(user.key, now).first<D1Row>(),
      database.prepare("SELECT skill_tag, last_rating, review_count, distinct_question_count, successful_unseen_count, next_review_at FROM skill_fsrs_states WHERE user_key = ?1 ORDER BY next_review_at ASC").bind(user.key).all<D1Row>(),
      database.prepare("SELECT * FROM mock_exam_records WHERE user_key = ?1 ORDER BY created_at DESC").bind(user.key).all<D1Row>(),
      database.prepare("SELECT streak_count, last_activity_date FROM progress_profiles WHERE user_key = ?1").bind(user.key).first<D1Row>(),
      database.prepare("SELECT id, format_version, restored_tables, restored_rows, imported_at FROM learning_backup_imports WHERE user_key = ?1 ORDER BY imported_at DESC LIMIT 5").bind(user.key).all<D1Row>(),
    ]);

    const attemptRows = (attempts.results ?? []) as unknown as D1Row[];
    const eventRows = (events.results ?? []) as unknown as D1Row[];
    const vocabAttemptRows = (vocabAttempts.results ?? []) as unknown as D1Row[];
    const skillRows = (skills.results ?? []) as unknown as D1Row[];
    const mockRows = (mocks.results ?? []) as unknown as D1Row[];

    return Response.json({
      user,
      notes: ((notes.results ?? []) as unknown as D1Row[]).map((row) => ({ ...row, tags: safeJsonArray(row.tags_json) })),
      bookmarks: ((bookmarks.results ?? []) as unknown as D1Row[]).map((row) => ({ ...row, tags: safeJsonArray(row.tags_json) })),
      practiceSets: ((sets.results ?? []) as unknown as D1Row[]).map((row) => ({ ...row, questionIds: safeJsonArray(row.question_ids_json), filters: safeJsonObject(row.filters_json) })),
      preferences: {
        speechAccent: String(preferences?.speech_accent ?? "en-US"),
        speechRate: Number(preferences?.speech_rate ?? 0.9),
        reportPeriod: String(preferences?.report_period ?? "week"),
        updatedAt: preferences?.updated_at ? String(preferences.updated_at) : null,
      },
      report: {
        week: buildPeriodReport(7, attemptRows, eventRows, vocabAttemptRows),
        month: buildPeriodReport(30, attemptRows, eventRows, vocabAttemptRows),
        dueQuestions: Number(dueQuestions?.count ?? 0),
        dueVocabulary: Number(dueVocabulary?.count ?? 0),
        streak: Number(profile?.streak_count ?? 0),
        lastActivityDate: profile?.last_activity_date ? String(profile.last_activity_date) : null,
        skills: skillRows.slice(0, 12).map((row) => ({
          tag: String(row.skill_tag ?? ""),
          label: getSkillTagLabel(String(row.skill_tag ?? "")),
          reviewCount: Number(row.review_count ?? 0),
          distinctQuestions: Number(row.distinct_question_count ?? 0),
          unseenSuccess: Number(row.successful_unseen_count ?? 0),
          nextReviewAt: String(row.next_review_at ?? ""),
          validated: Number(row.distinct_question_count ?? 0) >= 2 && Number(row.successful_unseen_count ?? 0) >= 2 && Number(row.last_rating ?? 0) >= 3,
        })),
        latestMocks: mockRows.slice(0, 5),
        estimatedMockRange: estimatedMockRange(mockRows.find((row) => Number(row.interrupted ?? 1) === 0 && Number(row.completed_questions ?? 0) >= 200)),
      },
      recentImports: (imports.results ?? []) as unknown as D1Row[],
    });
  } catch (error) {
    return Response.json({ error: toolkitError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const database = await getToolkitDatabase();
    const user = await getToolkitUser();
    await ensureToolkitSchema(database);
    const now = new Date().toISOString();

    if (action === "upsertNote") {
      const itemType = asItemType(payload.itemType);
      const itemId = asText(payload.itemId, 180, "項目識別", false);
      const unit = asText(payload.unit, 8, "單元") || null;
      const title = asText(payload.title, 160, "筆記標題");
      const body = asText(payload.body, 8_000, "筆記內容", false);
      const tags = asTags(payload.tags);
      await database.prepare(`INSERT INTO learning_notes (user_key, item_type, item_id, unit, title, body, tags_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
        ON CONFLICT(user_key, item_type, item_id) DO UPDATE SET unit = excluded.unit, title = excluded.title, body = excluded.body, tags_json = excluded.tags_json, updated_at = excluded.updated_at`)
        .bind(user.key, itemType, itemId, unit, title, body, JSON.stringify(tags), now).run();
      return Response.json({ saved: true, synced: user.synced, updatedAt: now });
    }

    if (action === "deleteNote") {
      const itemType = asItemType(payload.itemType);
      const itemId = asText(payload.itemId, 180, "項目識別", false);
      await database.prepare("DELETE FROM learning_notes WHERE user_key = ?1 AND item_type = ?2 AND item_id = ?3").bind(user.key, itemType, itemId).run();
      return Response.json({ deleted: true });
    }

    if (action === "toggleBookmark") {
      const itemType = asItemType(payload.itemType);
      const itemId = asText(payload.itemId, 180, "項目識別", false);
      if (payload.active === false) {
        await database.prepare("DELETE FROM learning_bookmarks WHERE user_key = ?1 AND item_type = ?2 AND item_id = ?3").bind(user.key, itemType, itemId).run();
        return Response.json({ active: false });
      }
      const unit = asText(payload.unit, 8, "單元") || null;
      const title = asText(payload.title, 160, "收藏標題", false);
      const excerpt = asText(payload.excerpt, 1_200, "收藏摘要");
      const tags = asTags(payload.tags);
      await database.prepare(`INSERT INTO learning_bookmarks (user_key, item_type, item_id, unit, title, excerpt, tags_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
        ON CONFLICT(user_key, item_type, item_id) DO UPDATE SET unit = excluded.unit, title = excluded.title, excerpt = excluded.excerpt, tags_json = excluded.tags_json, updated_at = excluded.updated_at`)
        .bind(user.key, itemType, itemId, unit, title, excerpt, JSON.stringify(tags), now).run();
      return Response.json({ active: true, synced: user.synced, updatedAt: now });
    }

    if (action === "savePracticeSet") {
      const id = asText(payload.id, 120, "題組識別") || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `set-${Date.now()}`);
      if (!/^[A-Za-z0-9._:-]+$/.test(id)) throw new Error("題組識別格式不正確。");
      const name = asText(payload.name, 80, "題組名稱", false);
      const description = asText(payload.description, 500, "題組說明");
      const questionIds = [...new Set(Array.isArray(payload.questionIds) ? payload.questionIds.map(String) : [])]
        .filter((questionId) => Boolean(getQuestion(questionId)))
        .slice(0, 40);
      if (!questionIds.length) throw new Error("自訂題組至少需要一題有效題目。");
      const filters = payload.filters && typeof payload.filters === "object" && !Array.isArray(payload.filters) ? payload.filters : {};
      await database.prepare(`INSERT INTO custom_practice_sets (user_key, id, name, description, question_ids_json, filters_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
        ON CONFLICT(user_key, id) DO UPDATE SET name = excluded.name, description = excluded.description, question_ids_json = excluded.question_ids_json, filters_json = excluded.filters_json, updated_at = excluded.updated_at`)
        .bind(user.key, id, name, description, JSON.stringify(questionIds), JSON.stringify(filters), now).run();
      return Response.json({ saved: true, id, questionCount: questionIds.length, updatedAt: now });
    }

    if (action === "deletePracticeSet") {
      const id = asText(payload.id, 120, "題組識別", false);
      await database.prepare("DELETE FROM custom_practice_sets WHERE user_key = ?1 AND id = ?2").bind(user.key, id).run();
      return Response.json({ deleted: true });
    }

    if (action === "saveToolPreferences") {
      const speechAccent = String(payload.speechAccent ?? "");
      const speechRate = Number(payload.speechRate);
      const reportPeriod = payload.reportPeriod === "month" ? "month" : "week";
      if (!ACCENTS.has(speechAccent) || !Number.isFinite(speechRate) || speechRate < 0.6 || speechRate > 1.25) throw new Error("語音設定格式不正確。");
      await database.prepare(`INSERT INTO learning_tool_preferences (user_key, speech_accent, speech_rate, report_period, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(user_key) DO UPDATE SET speech_accent = excluded.speech_accent, speech_rate = excluded.speech_rate, report_period = excluded.report_period, updated_at = excluded.updated_at`)
        .bind(user.key, speechAccent, speechRate, reportPeriod, now).run();
      return Response.json({ saved: true, synced: user.synced, preferences: { speechAccent, speechRate, reportPeriod, updatedAt: now } });
    }

    if (action === "importBackup") {
      if (payload.confirm !== "RESTORE") throw new Error("還原確認文字不正確。");
      const result = await restoreLearningBackup(database, user, payload.backup);
      return Response.json({ restored: true, ...result });
    }

    return Response.json({ error: "找不到這個學習工具操作。" }, { status: 400 });
  } catch (error) {
    const message = toolkitError(error);
    const status = /資料庫|連線|同步/.test(message) ? 500 : 400;
    return Response.json({ error: message }, { status });
  }
}
