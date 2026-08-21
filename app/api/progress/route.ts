import { createEmptyCard, fsrs, Rating, type Card, type CardInput, type Grade } from "ts-fsrs";
import { getChatGPTUser } from "../../chatgpt-auth";
import { seedCompanionStates } from "../../companion-store";
import { getQuestion, getQuestionSkillTags, getSkillTagLabel, matchesAcceptedOutput } from "../../content";
import { ensureLearningSchema, LEARNING_SCHEMA_VERSION } from "../../learning-schema";
import { getVariantQuestion } from "../../question-variants";
import { getScenarioQuestion } from "../../scenario-mission";
import { inferLearningErrorCategory } from "../../ability-atlas";

type D1Row = Record<string, unknown>;

function getPracticeQuestion(id: string) {
  return getQuestion(id) ?? getVariantQuestion(id) ?? getScenarioQuestion(id);
}

function parseQuestionIds(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const questionScheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ["10m"],
  relearning_steps: ["10m"],
});

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS progress_profiles (
    user_key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    last_activity_date TEXT,
    streak_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS question_states (
    user_key TEXT NOT NULL,
    question_id TEXT NOT NULL,
    unit TEXT NOT NULL,
    kind TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    last_answer TEXT,
    last_correct INTEGER,
    confidence INTEGER,
    interval_days REAL NOT NULL DEFAULT 1,
    next_review_at TEXT NOT NULL,
    last_answered_at TEXT NOT NULL,
    latest_output TEXT,
    PRIMARY KEY (user_key, question_id)
  )`,
  `CREATE TABLE IF NOT EXISTS practice_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_key TEXT NOT NULL,
    question_id TEXT NOT NULL,
    unit TEXT NOT NULL,
    kind TEXT NOT NULL,
    answer TEXT NOT NULL,
    correct INTEGER NOT NULL,
    confidence INTEGER NOT NULL,
    local_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS question_states_due_idx ON question_states (user_key, next_review_at)",
  "CREATE INDEX IF NOT EXISTS practice_attempts_day_idx ON practice_attempts (user_key, local_date)",
];

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) {
    throw new Error("雲端進度資料庫尚未連線。");
  }
  return database;
}

async function ensureSchema(database: D1Database) {
  await database.batch(schemaStatements.map((statement) => database.prepare(statement)));
  await ensureLearningSchema(database);
}

async function currentUser() {
  const user = await getChatGPTUser();
  return {
    key: user?.email || "demo-local",
    name: user?.displayName || "試行使用者",
  };
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function previousDate(localDate: string) {
  const date = new Date(`${localDate}T00:00:00+08:00`);
  date.setDate(date.getDate() - 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(date);
}

function parseCard(value: unknown): CardInput | Card {
  if (typeof value !== "string") return createEmptyCard<Card>(new Date());
  try {
    return JSON.parse(value) as CardInput;
  } catch {
    return createEmptyCard<Card>(new Date());
  }
}

function answerGrade(correct: boolean, confidence: number): Grade {
  if (!correct) return Rating.Again;
  if (confidence <= 1) return Rating.Hard;
  if (confidence === 2) return Rating.Good;
  return Rating.Easy;
}

function diagnosticPriority(row: {
  attempts: number;
  wrong: number;
  highConfidenceWrong: number;
  lowConfidence: number;
  currentWeak: number;
  repeatedWrong: number;
}) {
  const errorRate = row.attempts ? row.wrong / row.attempts : 0;
  return row.highConfidenceWrong * 6 + row.repeatedWrong * 5 + row.currentWeak * 4 + errorRate * 3 + row.lowConfidence;
}

function buildDiagnostics(attemptRows: D1Row[], stateRows: D1Row[]) {
  type Diagnostic = {
    tag: string;
    label: string;
    attempts: number;
    correct: number;
    wrong: number;
    highConfidenceWrong: number;
    lowConfidence: number;
    currentWeak: number;
    repeatedWrong: number;
  };
  const map = new Map<string, Diagnostic>();
  const ensure = (tag: string) => {
    const current = map.get(tag);
    if (current) return current;
    const row: Diagnostic = { tag, label: getSkillTagLabel(tag), attempts: 0, correct: 0, wrong: 0, highConfidenceWrong: 0, lowConfidence: 0, currentWeak: 0, repeatedWrong: 0 };
    map.set(tag, row);
    return row;
  };
  const stateByQuestion = new Map(stateRows.map((state) => [String(state.question_id ?? ""), state]));
  const attemptsByQuestion = new Map<string, D1Row[]>();
  for (const attempt of attemptRows) {
    const questionId = String(attempt.question_id ?? "");
    const list = attemptsByQuestion.get(questionId) ?? [];
    list.push(attempt);
    attemptsByQuestion.set(questionId, list);
  }
  for (const [questionId, questionAttempts] of attemptsByQuestion) {
    const question = getPracticeQuestion(questionId);
    if (!question) continue;
    const state = stateByQuestion.get(questionId);
    const latestAttempt = questionAttempts[questionAttempts.length - 1];
    const latestCorrect = Number(state?.last_correct ?? latestAttempt?.correct ?? 0) === 1;
    const latestConfidence = Number(state?.confidence ?? latestAttempt?.confidence ?? 0);
    const currentWeak = !latestCorrect || latestConfidence <= 1;
    const everHighConfidenceWrong = questionAttempts.some((attempt) => Number(attempt.correct) === 0 && Number(attempt.confidence) >= 3);
    const repeatedWrong = Number(state?.wrong_count ?? questionAttempts.filter((attempt) => Number(attempt.correct) === 0).length) >= 2;
    for (const tag of getQuestionSkillTags(question)) {
      const row = ensure(tag);
      row.attempts += 1;
      if (latestCorrect) row.correct += 1;
      else row.wrong += 1;
      if (everHighConfidenceWrong) row.highConfidenceWrong += 1;
      if (latestConfidence <= 1) row.lowConfidence += 1;
      if (currentWeak) row.currentWeak += 1;
      if (repeatedWrong) row.repeatedWrong += 1;
    }
  }
  return [...map.values()]
    .filter((row) => row.wrong > 0 || row.lowConfidence > 0 || row.currentWeak > 0)
    .sort((a, b) => diagnosticPriority(b) - diagnosticPriority(a) || b.attempts - a.attempts)
    .slice(0, 8);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "進度同步失敗。";
}

export async function GET(request: Request) {
  try {
    const database = await getDatabase();
    await ensureSchema(database);
    const user = await currentUser();
    const url = new URL(request.url);
    const localDate = isDate(url.searchParams.get("date"))
      ? url.searchParams.get("date")!
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
    const now = new Date().toISOString();
    await seedCompanionStates(database, user.key, now);

    const profile = await database
      .prepare("SELECT * FROM progress_profiles WHERE user_key = ?1")
      .bind(user.key)
      .first<D1Row>();
    const states = await database
      .prepare("SELECT * FROM question_states WHERE user_key = ?1 ORDER BY next_review_at ASC")
      .bind(user.key)
      .all<D1Row>();
    const today = await database
      .prepare("SELECT COUNT(*) AS count FROM practice_attempts WHERE user_key = ?1 AND local_date = ?2")
      .bind(user.key, localDate)
      .first<{ count: number }>();
    const attempts = await database
      .prepare("SELECT question_id, correct, confidence FROM practice_attempts WHERE user_key = ?1 ORDER BY id ASC")
      .bind(user.key)
      .all<D1Row>();
    const skillStates = await database
      .prepare("SELECT * FROM skill_fsrs_states WHERE user_key = ?1 ORDER BY next_review_at ASC")
      .bind(user.key)
      .all<D1Row>();
    const mockExams = await database
      .prepare("SELECT * FROM mock_exam_records WHERE user_key = ?1 ORDER BY created_at DESC")
      .bind(user.key)
      .all<D1Row>();
    const fingerprintEvidence = await database
      .prepare("SELECT fingerprint, question_id, family, first_seen_at FROM question_fingerprint_evidence WHERE user_key = ?1 ORDER BY first_seen_at ASC")
      .bind(user.key)
      .all<D1Row>();
    const formalEvidence = await database
      .prepare("SELECT question_id, unit, first_formal_at, last_formal_at FROM formal_question_evidence WHERE user_key = ?1 ORDER BY first_formal_at ASC")
      .bind(user.key)
      .all<D1Row>();
    const bossEvents = await database
      .prepare("SELECT entity_id, created_at FROM learning_events WHERE user_key = ?1 AND event_type = 'boss_cleared' ORDER BY created_at ASC")
      .bind(user.key)
      .all<D1Row>();
    const preferences = await database
      .prepare("SELECT interface_mode, font_scale, motion_mode, updated_at FROM interface_preferences WHERE user_key = ?1")
      .bind(user.key)
      .first<D1Row>();
    const toolPreferences = await database
      .prepare("SELECT speech_accent, speech_rate, report_period, updated_at FROM learning_tool_preferences WHERE user_key = ?1")
      .bind(user.key)
      .first<D1Row>();

    const stateRows = (states.results ?? []) as unknown as D1Row[];
    const skillStateRows = (skillStates.results ?? []) as unknown as D1Row[];
    const mockExamRows = (mockExams.results ?? []) as unknown as D1Row[];
    const validatedSkillTags = new Set(skillStateRows
      .filter((row) => Number(row.distinct_question_count ?? 0) >= 2
        && Number(row.successful_unseen_count ?? 0) >= 2
        && Number(row.last_rating ?? 0) >= Rating.Good)
      .map((row) => String(row.skill_tag ?? ""))
      .filter(Boolean));
    const wrong = stateRows
      .filter((row) => Number(row.last_correct ?? 1) === 0 || Number(row.confidence ?? 3) <= 1)
      .filter((row) => {
        const question = getPracticeQuestion(String(row.question_id ?? ""));
        if (!question) return true;
        const tags = getQuestionSkillTags(question);
        return tags.length === 0 || tags.some((tag) => !validatedSkillTags.has(tag));
      });
    const due = stateRows.filter((row) => String(row.next_review_at ?? "") <= now);

    return Response.json({
      user: { name: user.name, synced: user.key !== "demo-local" },
      profile,
      states: stateRows,
      wrong,
      dueCount: due.length,
      todayCount: Number(today?.count ?? 0),
      preferences: {
        interfaceMode: String(preferences?.interface_mode ?? "simple"),
        fontScale: String(preferences?.font_scale ?? "standard"),
        motionMode: String(preferences?.motion_mode ?? "standard"),
        speechAccent: String(toolPreferences?.speech_accent ?? "en-US"),
        speechRate: Number(toolPreferences?.speech_rate ?? 0.9),
        reportPeriod: String(toolPreferences?.report_period ?? "week"),
        syncedAt: toolPreferences?.updated_at
          ? String(toolPreferences.updated_at)
          : preferences?.updated_at ? String(preferences.updated_at) : null,
      },
      schemaVersion: LEARNING_SCHEMA_VERSION,
      diagnostics: buildDiagnostics((attempts.results ?? []) as unknown as D1Row[], stateRows),
      skillStates: skillStateRows.map((row) => ({
        ...row,
        validated: Number(row.distinct_question_count ?? 0) >= 2
          && Number(row.successful_unseen_count ?? 0) >= 2
          && Number(row.last_rating ?? 0) >= Rating.Good,
      })),
      mockExams: mockExamRows,
      evidenceFingerprints: (fingerprintEvidence.results ?? []).map((row) => String(row.fingerprint ?? "")).filter(Boolean),
      formalQuestionIds: (formalEvidence.results ?? []).map((row) => String(row.question_id ?? "")).filter(Boolean),
      bossClears: [...new Set((bossEvents.results ?? []).map((row) => String(row.entity_id ?? "")).filter(Boolean))],
      passedMockUnits: [...new Set(mockExamRows
        .filter((row) => Number(row.completed_questions ?? 0) >= 200 && Number(row.interrupted ?? 1) === 0)
        .map((row) => String(row.unit ?? "")))],
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: "savePreferences";
      interfaceMode?: "simple" | "detailed";
      fontScale?: "standard" | "large";
      motionMode?: "standard" | "reduced";
      speechAccent?: "en-US" | "en-GB" | "en-AU";
      speechRate?: number;
      reportPeriod?: "week" | "month";
      questionId?: string;
      unit?: string;
      kind?: string;
      answer?: string;
      correct?: boolean;
      confidence?: number;
      output?: string;
      localDate?: string;
      listenCount?: number;
      replayCount?: number;
      activeMs?: number;
      supportMode?: "blade" | "ward" | "lantern";
      listeningMode?: "learning" | "toeic" | "hard";
      audioFallbackUsed?: boolean;
      outputAssessment?: "accepted" | "natural" | "understandable" | "needs-fix";
      requestId?: string;
      bossRunId?: string;
      battleId?: string;
      previewOnly?: boolean;
      storyRoute?: "formal" | "backtrack" | "leap";
      contentDifficulty?: "steady" | "standard" | "leap";
    };
    if (payload.action === "savePreferences") {
      if (
        !["simple", "detailed"].includes(String(payload.interfaceMode))
        || !["standard", "large"].includes(String(payload.fontScale))
        || !["standard", "reduced"].includes(String(payload.motionMode))
        || !["en-US", "en-GB", "en-AU"].includes(String(payload.speechAccent))
        || !Number.isFinite(Number(payload.speechRate))
        || Number(payload.speechRate) < 0.6
        || Number(payload.speechRate) > 1.25
      ) {
        return Response.json({ error: "顯示或語音設定格式不正確。" }, { status: 400 });
      }
      const database = await getDatabase();
      await ensureSchema(database);
      const user = await currentUser();
      const now = new Date().toISOString();
      await database.batch([
        database.prepare(`INSERT INTO interface_preferences (user_key, interface_mode, font_scale, motion_mode, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5)
          ON CONFLICT(user_key) DO UPDATE SET interface_mode = excluded.interface_mode, font_scale = excluded.font_scale, motion_mode = excluded.motion_mode, updated_at = excluded.updated_at`)
        .bind(user.key, payload.interfaceMode, payload.fontScale, payload.motionMode, now)
        ,
        database.prepare(`INSERT INTO learning_tool_preferences (user_key, speech_accent, speech_rate, report_period, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5)
          ON CONFLICT(user_key) DO UPDATE SET speech_accent = excluded.speech_accent, speech_rate = excluded.speech_rate, report_period = excluded.report_period, updated_at = excluded.updated_at`)
          .bind(user.key, payload.speechAccent, Number(payload.speechRate), payload.reportPeriod === "month" ? "month" : "week", now),
      ]);
      return Response.json({
        saved: true,
        synced: user.key !== "demo-local",
        preferences: {
          interfaceMode: payload.interfaceMode,
          fontScale: payload.fontScale,
          motionMode: payload.motionMode,
          speechAccent: payload.speechAccent,
          speechRate: Number(payload.speechRate),
          reportPeriod: payload.reportPeriod === "month" ? "month" : "week",
          syncedAt: now,
        },
      });
    }
    if (
      !payload.questionId ||
      !payload.unit ||
      !payload.kind ||
      typeof payload.answer !== "string" ||
      typeof payload.correct !== "boolean" ||
      ![1, 2, 3].includes(Number(payload.confidence)) ||
      !isDate(payload.localDate) ||
      typeof payload.requestId !== "string" ||
      payload.requestId.length < 8 ||
      payload.requestId.length > 120 ||
      !/^[A-Za-z0-9._:-]+$/.test(payload.requestId)
    ) {
      return Response.json({ error: "作答資料不完整。" }, { status: 400 });
    }
    if (payload.battleId && (payload.battleId.length > 120 || !/^[A-Za-z0-9._:-]+$/.test(payload.battleId))) {
      return Response.json({ error: "戰鬥識別資料格式不正確。" }, { status: 400 });
    }
    const previewOnly = payload.previewOnly === true;
    if (previewOnly && payload.bossRunId) {
      return Response.json({ error: "躍遷預覽不能混入正式 Boss 證據場。" }, { status: 400 });
    }
    const question = getPracticeQuestion(payload.questionId);
    if (!question || question.unit !== payload.unit || question.kind !== payload.kind) {
      return Response.json({ error: "找不到這一題，請重新整理後再試。" }, { status: 400 });
    }
    const isCorrect = question.kind === "choice"
      ? payload.answer === question.answerId
      : payload.correct;
    const skillTags = getQuestionSkillTags(question);
    const supportMode = ["blade", "ward", "lantern"].includes(String(payload.supportMode)) ? payload.supportMode! : "blade";
    const listeningMode = ["learning", "toeic", "hard"].includes(String(payload.listeningMode)) ? payload.listeningMode! : "learning";
    const listenCount = Math.max(0, Math.min(100, Math.trunc(Number(payload.listenCount ?? 0)) || 0));
    const replayCount = Math.max(0, Math.min(99, Math.trunc(Number(payload.replayCount ?? 0)) || 0));
    const activeMs = Math.max(0, Math.min(10 * 60 * 1000, Math.trunc(Number(payload.activeMs ?? 0)) || 0));
    const audioFallbackUsed = payload.audioFallbackUsed === true;
    if (skillTags.includes("listening.comprehension") && listenCount < 1) {
      return Response.json({ error: "聽力題必須完整播完首聽，才能保存首答。" }, { status: 400 });
    }
    const strictEvidenceEligible = !previewOnly
      && supportMode === "blade"
      && !audioFallbackUsed
      && (!skillTags.includes("listening.comprehension") || listeningMode !== "learning")
      && (question.kind !== "output" || matchesAcceptedOutput(question, payload.answer));

    const database = await getDatabase();
    await ensureSchema(database);
    const user = await currentUser();
    const now = new Date().toISOString();
    await seedCompanionStates(database, user.key, now);
    const existingReceipt = await database
      .prepare("SELECT response_json FROM answer_receipts WHERE user_key = ?1 AND request_id = ?2")
      .bind(user.key, payload.requestId)
      .first<{ response_json: string }>();
    if (existingReceipt?.response_json) {
      try {
        return Response.json({ ...JSON.parse(existingReceipt.response_json), duplicate: true });
      } catch {
        return Response.json({ saved: true, synced: user.key !== "demo-local", duplicate: true });
      }
    }
    const variantFingerprint = question.variant?.fingerprint ?? null;
    let bossRun: D1Row | null = null;
    if (payload.bossRunId) {
      bossRun = await database
        .prepare("SELECT id, user_key, region_id, question_ids_json, status FROM boss_runs WHERE id = ?1 AND user_key = ?2 LIMIT 1")
        .bind(payload.bossRunId, user.key)
        .first<D1Row>();
      if (!bossRun || String(bossRun.status ?? "") !== "active") {
        return Response.json({ error: "這場 Boss 戰已結束或已被新的挑戰取代。" }, { status: 409 });
      }
      const bossQuestionIds = parseQuestionIds(bossRun.question_ids_json);
      if (!variantFingerprint || bossQuestionIds.length !== 10 || !bossQuestionIds.includes(payload.questionId)) {
        return Response.json({ error: "這一題不屬於伺服器核發的 Boss 題單。" }, { status: 409 });
      }
    }
    const [previous, previousFsrs, firstAttempt, previousSkillStates, previousFingerprint] = await Promise.all([
      database
        .prepare("SELECT * FROM question_states WHERE user_key = ?1 AND question_id = ?2")
        .bind(user.key, payload.questionId)
        .first<D1Row>(),
      database
        .prepare("SELECT * FROM question_fsrs_states WHERE user_key = ?1 AND question_id = ?2")
        .bind(user.key, payload.questionId)
        .first<D1Row>(),
      database
        .prepare("SELECT answer FROM practice_attempts WHERE user_key = ?1 AND question_id = ?2 ORDER BY id ASC LIMIT 1")
        .bind(user.key, payload.questionId)
        .first<{ answer: string }>(),
      database
        .prepare("SELECT * FROM skill_fsrs_states WHERE user_key = ?1")
        .bind(user.key)
        .all<D1Row>(),
      variantFingerprint
        ? database
          .prepare("SELECT fingerprint FROM question_fingerprint_evidence WHERE user_key = ?1 AND fingerprint = ?2")
          .bind(user.key, variantFingerprint)
          .first<{ fingerprint: string }>()
        : Promise.resolve(null),
    ]);
    const fsrsCard = parseCard(previousFsrs?.card_json);
    const grade = isCorrect && !strictEvidenceEligible
      ? Rating.Hard
      : answerGrade(isCorrect, Number(payload.confidence));
    const fsrsResult = questionScheduler.next(fsrsCard, new Date(now), grade);
    const next = fsrsResult.card.due.toISOString();
    const interval = Math.max(0, (fsrsResult.card.due.getTime() - new Date(now).getTime()) / (24 * 60 * 60 * 1000));
    const profile = await database
      .prepare("SELECT * FROM progress_profiles WHERE user_key = ?1")
      .bind(user.key)
      .first<D1Row>();
    const oldActivityDate = String(profile?.last_activity_date ?? "");
    const streak = oldActivityDate === payload.localDate
      ? Number(profile?.streak_count ?? 1)
      : oldActivityDate === previousDate(payload.localDate)
        ? Number(profile?.streak_count ?? 0) + 1
        : 1;
    const attempts = Number(previous?.attempts ?? 0) + 1;
    const correctCount = Number(previous?.correct_count ?? 0) + (isCorrect ? 1 : 0);
    const wrongCount = Number(previous?.wrong_count ?? 0) + (isCorrect ? 0 : 1);
    const fsrsReviewCount = Number(previousFsrs?.review_count ?? 0) + 1;
    const firstAnswer = firstAttempt?.answer ?? payload.answer;
    const isNewQuestionEncounter = !previewOnly && !previous && (!variantFingerprint || !previousFingerprint);
    const isNewQuestionEvidence = isNewQuestionEncounter && strictEvidenceEligible;
    const errorCategory = inferLearningErrorCategory(question, {
      correct: isCorrect,
      confidence: Number(payload.confidence),
      replayCount,
      audioFallbackUsed,
    });
    const previousSkillByTag = new Map(
      ((previousSkillStates.results ?? []) as unknown as D1Row[]).map((row) => [String(row.skill_tag ?? ""), row]),
    );
    const skillScheduleStatements = isNewQuestionEncounter ? skillTags.map((tag) => {
      const old = previousSkillByTag.get(tag);
      const skillResult = questionScheduler.next(parseCard(old?.card_json), new Date(now), grade);
      const skillReviewCount = Number(old?.review_count ?? 0) + 1;
      const distinctQuestionCount = Number(old?.distinct_question_count ?? 0) + 1;
      const successfulUnseenCount = Number(old?.successful_unseen_count ?? 0)
        + (isNewQuestionEvidence && isCorrect && Number(payload.confidence) >= 2 ? 1 : 0);
      return database
        .prepare(`INSERT INTO skill_fsrs_states (user_key, skill_tag, card_json, last_rating, review_count, distinct_question_count, successful_unseen_count, last_question_id, next_review_at, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
          ON CONFLICT(user_key, skill_tag) DO UPDATE SET card_json = excluded.card_json, last_rating = excluded.last_rating, review_count = excluded.review_count, distinct_question_count = excluded.distinct_question_count, successful_unseen_count = excluded.successful_unseen_count, last_question_id = excluded.last_question_id, next_review_at = excluded.next_review_at, updated_at = excluded.updated_at`)
        .bind(user.key, tag, JSON.stringify(skillResult.card), grade, skillReviewCount, distinctQuestionCount, successfulUnseenCount, payload.questionId, skillResult.card.due.toISOString(), now);
    }) : [];
    const responsePayload = {
      saved: true,
      nextReviewAt: previewOnly ? null : next,
      intervalDays: previewOnly ? null : interval,
      streak: previewOnly ? Number(profile?.streak_count ?? 0) : streak,
      synced: user.key !== "demo-local",
      scheduling: previewOnly ? "story-preview-event-only" : "skill-fsrs+question-fallback",
      schemaVersion: LEARNING_SCHEMA_VERSION,
      companionBondGained: isNewQuestionEncounter ? 1 : 0,
      novelSkillEvidence: isNewQuestionEvidence && isCorrect,
      strictEvidenceEligible,
      semanticFingerprintAccepted: variantFingerprint ? isNewQuestionEncounter : null,
      bossCoreHit: Boolean(bossRun && isCorrect && isNewQuestionEvidence),
      answerReceiptId: payload.requestId,
      questionId: payload.questionId,
      correct: isCorrect,
      supportMode,
      listenCount,
      replayCount,
      listeningMode: skillTags.includes("listening.comprehension") ? listeningMode : null,
      audioFallbackUsed,
      battleId: payload.battleId ?? null,
      previewOnly,
    };
    const formalDatabaseStatements = [
      database
        .prepare(`INSERT INTO progress_profiles (user_key, display_name, last_activity_date, streak_count, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5)
          ON CONFLICT(user_key) DO UPDATE SET display_name = excluded.display_name, last_activity_date = excluded.last_activity_date, streak_count = excluded.streak_count, updated_at = excluded.updated_at`)
        .bind(user.key, user.name, payload.localDate, streak, now),
      database
        .prepare(`INSERT INTO question_states (user_key, question_id, unit, kind, attempts, correct_count, wrong_count, last_answer, last_correct, confidence, interval_days, next_review_at, last_answered_at, latest_output)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
          ON CONFLICT(user_key, question_id) DO UPDATE SET unit = excluded.unit, kind = excluded.kind, attempts = excluded.attempts, correct_count = excluded.correct_count, wrong_count = excluded.wrong_count, last_answer = excluded.last_answer, last_correct = excluded.last_correct, confidence = excluded.confidence, interval_days = excluded.interval_days, next_review_at = excluded.next_review_at, last_answered_at = excluded.last_answered_at, latest_output = excluded.latest_output`)
        .bind(user.key, payload.questionId, payload.unit, payload.kind, attempts, correctCount, wrongCount, payload.answer, isCorrect ? 1 : 0, Number(payload.confidence), interval, next, now, payload.output ?? null),
      database
        .prepare("INSERT INTO practice_attempts (user_key, question_id, unit, kind, answer, correct, confidence, local_date) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
        .bind(user.key, payload.questionId, payload.unit, payload.kind, payload.answer, isCorrect ? 1 : 0, Number(payload.confidence), payload.localDate),
      database
        .prepare(`INSERT INTO question_fsrs_states (user_key, question_id, card_json, last_rating, review_count, next_review_at, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
          ON CONFLICT(user_key, question_id) DO UPDATE SET card_json = excluded.card_json, last_rating = excluded.last_rating, review_count = excluded.review_count, next_review_at = excluded.next_review_at, updated_at = excluded.updated_at`)
        .bind(user.key, payload.questionId, JSON.stringify(fsrsResult.card), grade, fsrsReviewCount, next, now),
    ];
    const learningEventStatement = database
      .prepare(`INSERT INTO learning_events (user_key, event_type, entity_id, unit, kind, answer, first_answer, correct, confidence, attempt_number, replay_count, skill_tags_json, metadata_json, local_date, created_at)
        VALUES (?1, 'question_answered', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`)
      .bind(
        user.key,
        payload.questionId,
        payload.unit,
        payload.kind,
        payload.answer,
        firstAnswer,
        isCorrect ? 1 : 0,
        Number(payload.confidence),
        attempts,
        replayCount,
        JSON.stringify(skillTags),
        JSON.stringify({ schemaVersion: LEARNING_SCHEMA_VERSION, sourceLabel: question.sourceLabel, scheduling: previewOnly ? "story-preview-event-only" : "skill-fsrs+question-fallback", previewOnly, storyRoute: previewOnly ? (payload.storyRoute ?? "leap") : (payload.storyRoute ?? "formal"), contentDifficulty: payload.contentDifficulty ?? "standard", formalProgressUnchanged: previewOnly, listenCount, activeMs, audioFallbackUsed, novelEncounter: isNewQuestionEncounter, novelEvidence: isNewQuestionEvidence && isCorrect, strictEvidenceEligible, supportMode, listeningMode: skillTags.includes("listening.comprehension") ? listeningMode : null, outputAssessment: payload.outputAssessment ?? null, fingerprint: variantFingerprint, variantFamily: question.variant?.family ?? null, bossRunId: bossRun ? String(bossRun.id ?? "") : null, battleId: payload.battleId ?? null, errorCategory }),
        payload.localDate,
        now,
      );
    const databaseStatements = previewOnly ? [learningEventStatement] : [...formalDatabaseStatements, learningEventStatement];
    const fingerprintStatement = !previewOnly && variantFingerprint
      ? database
        .prepare(`INSERT INTO question_fingerprint_evidence (user_key, fingerprint, question_id, family, skill_tags_json, first_seen_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6)
          ON CONFLICT(user_key, fingerprint) DO NOTHING`)
        .bind(user.key, variantFingerprint, payload.questionId, question.variant?.family ?? "variant", JSON.stringify(skillTags), now)
      : null;
    const companionBondStatement = !previewOnly && isNewQuestionEncounter
      ? database
        .prepare("UPDATE companion_states SET affinity = MIN(100, affinity + 1), updated_at = ?1 WHERE user_key = ?2 AND selected = 1")
        .bind(now, user.key)
      : null;
    const formalEvidenceStatement = !previewOnly
      ? database
        .prepare(`INSERT INTO formal_question_evidence (user_key, question_id, unit, first_formal_at, last_formal_at)
          VALUES (?1, ?2, ?3, ?4, ?4)
          ON CONFLICT(user_key, question_id) DO UPDATE SET unit = excluded.unit, last_formal_at = excluded.last_formal_at`)
        .bind(user.key, payload.questionId, payload.unit, now)
      : null;
    const bossRunAnswerStatement = bossRun && variantFingerprint
      ? database
        .prepare(`INSERT INTO boss_run_answers (run_id, user_key, question_id, fingerprint, correct, novel_evidence, answered_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
          ON CONFLICT(run_id, question_id) DO NOTHING`)
        .bind(String(bossRun.id ?? ""), user.key, payload.questionId, variantFingerprint, isCorrect ? 1 : 0, isNewQuestionEvidence ? 1 : 0, now)
      : null;
    const receiptStatement = database
      .prepare("INSERT INTO answer_receipts (user_key, request_id, question_id, response_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(user.key, payload.requestId, payload.questionId, JSON.stringify(responsePayload), now);
    try {
      await database.batch([
        ...databaseStatements,
        ...skillScheduleStatements,
        ...(fingerprintStatement ? [fingerprintStatement] : []),
        ...(companionBondStatement ? [companionBondStatement] : []),
        ...(formalEvidenceStatement ? [formalEvidenceStatement] : []),
        ...(bossRunAnswerStatement ? [bossRunAnswerStatement] : []),
        receiptStatement,
      ]);
    } catch (batchError) {
      const duplicateReceipt = await database
        .prepare("SELECT response_json FROM answer_receipts WHERE user_key = ?1 AND request_id = ?2")
        .bind(user.key, payload.requestId)
        .first<{ response_json: string }>();
      if (duplicateReceipt?.response_json) {
        return Response.json({ ...JSON.parse(duplicateReceipt.response_json), duplicate: true });
      }
      throw batchError;
    }

    return Response.json(responsePayload);
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
