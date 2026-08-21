import { ADVENTURE_REGIONS, BOSS_CORE_TARGET, BOSS_TURN_LIMIT } from "../../adventure";
import { getChatGPTUser } from "../../chatgpt-auth";
import { QUESTIONS, UNITS, getQuestionSkillTags } from "../../content";
import { ensureLearningSchema } from "../../learning-schema";
import { buildBossQueue, deriveLearningFrontier } from "../../learning-path";
import { getUnseenVariantQuestions } from "../../question-variants";

type D1Row = Record<string, unknown>;
const MOCK_GATE_UNITS = ["U35", "U37", "U39"];

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("冒險資料庫尚未連線。");
  return database;
}

async function currentUserKey() {
  const user = await getChatGPTUser();
  return user?.email || "demo-local";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "冒險紀錄保存失敗。";
}

function parseQuestionIds(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function verifyRegionUnlocked(database: D1Database, userKey: string, region: (typeof ADVENTURE_REGIONS)[number]) {
  const [stateResult, mockResult] = await Promise.all([
    database
      .prepare("SELECT question_id, unit, last_correct, confidence, wrong_count, next_review_at FROM question_states WHERE user_key = ?1")
      .bind(userKey)
      .all<D1Row>(),
    database
      .prepare("SELECT unit, completed_questions, interrupted FROM mock_exam_records WHERE user_key = ?1")
      .bind(userKey)
      .all<D1Row>(),
  ]);
  const states = (stateResult.results ?? []).map((row) => ({
    question_id: String(row.question_id ?? ""),
    unit: String(row.unit ?? ""),
    last_correct: Number(row.last_correct ?? 0),
    confidence: Number(row.confidence ?? 0),
    wrong_count: Number(row.wrong_count ?? 0),
    next_review_at: String(row.next_review_at ?? ""),
  }));
  const passedMockUnits = [...new Set((mockResult.results ?? [])
    .filter((row) => Number(row.completed_questions ?? 0) >= 200 && Number(row.interrupted ?? 1) === 0)
    .map((row) => String(row.unit ?? "")))];
  const frontier = deriveLearningFrontier(UNITS, QUESTIONS, states, "U02", {
    gateUnitIds: MOCK_GATE_UNITS,
    passedGateUnitIds: passedMockUnits,
  });
  const activeNumber = frontier.activeUnitIndex + 1;
  const endUnit = `U${String(region.end).padStart(2, "0")}`;
  const endQuestionIds = QUESTIONS.filter((question) => question.unit === endUnit).map((question) => question.id);
  const answeredIds = new Set(states.filter((state) => state.unit === endUnit).map((state) => state.question_id));
  const endCovered = endQuestionIds.length > 0 && endQuestionIds.every((id) => answeredIds.has(id));
  if (!(activeNumber > region.end || (activeNumber === region.end && endCovered))) {
    throw new Error(`${endUnit} 還沒有走完，Boss 戰不會提前解鎖。`);
  }
  return { states, endUnit };
}

async function startBoss(database: D1Database, userKey: string, region: (typeof ADVENTURE_REGIONS)[number]) {
  const { states, endUnit } = await verifyRegionUnlocked(database, userKey, region);
  const fingerprintRows = await database
    .prepare("SELECT fingerprint FROM question_fingerprint_evidence WHERE user_key = ?1")
    .bind(userKey)
    .all<{ fingerprint: string }>();
  const seenFingerprints = new Set((fingerprintRows.results ?? []).map((row) => String(row.fingerprint ?? "")).filter(Boolean));
  const eligibleUnitIds = UNITS.slice(0, region.end).map((unit) => unit.id);
  const eligibleUnitSet = new Set(eligibleUnitIds);
  const unseen = getUnseenVariantQuestions(seenFingerprints, eligibleUnitSet).map((question) => ({
    id: question.id,
    unit: question.unit,
    role: "transfer" as const,
    fingerprint: question.variant?.fingerprint,
    skillTags: getQuestionSkillTags(question),
  }));
  const questionIds = buildBossQueue(unseen, states, eligibleUnitIds, { limit: BOSS_TURN_LIMIT });
  if (questionIds.length !== BOSS_TURN_LIMIT) {
    throw new Error("目前沒有足夠的未見題組成完整 Boss 戰；系統不會拿舊題硬湊。");
  }

  const runId = globalThis.crypto.randomUUID();
  const now = new Date().toISOString();
  await database.batch([
    database
      .prepare("UPDATE boss_runs SET status = 'abandoned', completed_at = ?1 WHERE user_key = ?2 AND region_id = ?3 AND status = 'active'")
      .bind(now, userKey, region.id),
    database
      .prepare(`INSERT INTO boss_runs (id, user_key, region_id, end_unit, question_ids_json, status, started_at)
        VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6)`)
      .bind(runId, userKey, region.id, endUnit, JSON.stringify(questionIds), now),
  ]);
  return { runId, questionIds };
}

async function clearBoss(database: D1Database, userKey: string, region: (typeof ADVENTURE_REGIONS)[number], runId: string, localDate?: string) {
  const run = await database
    .prepare("SELECT * FROM boss_runs WHERE id = ?1 AND user_key = ?2 AND region_id = ?3 LIMIT 1")
    .bind(runId, userKey, region.id)
    .first<D1Row>();
  if (!run || String(run.status ?? "") !== "active") {
    return Response.json({ error: "這場 Boss 戰不存在、已結束或已被新的挑戰取代。" }, { status: 409 });
  }
  const questionIds = parseQuestionIds(run.question_ids_json);
  if (questionIds.length !== BOSS_TURN_LIMIT || new Set(questionIds).size !== BOSS_TURN_LIMIT) {
    return Response.json({ error: "這場 Boss 戰的伺服器題單不完整。" }, { status: 409 });
  }
  const answerRows = await database
    .prepare("SELECT question_id, correct, novel_evidence FROM boss_run_answers WHERE user_key = ?1 AND run_id = ?2")
    .bind(userKey, runId)
    .all<D1Row>();
  const answerByQuestion = new Map((answerRows.results ?? []).map((row) => [String(row.question_id ?? ""), row]));
  const allAnswered = questionIds.every((id) => answerByQuestion.has(id));
  const novelCorrect = questionIds.reduce((count, id) => {
    const row = answerByQuestion.get(id);
    return count + (Number(row?.correct ?? 0) === 1 && Number(row?.novel_evidence ?? 0) === 1 ? 1 : 0);
  }, 0);
  const now = new Date().toISOString();
  if (!allAnswered || novelCorrect < BOSS_CORE_TARGET) {
    if (allAnswered) {
      await database.prepare("UPDATE boss_runs SET status = 'failed', completed_at = ?1 WHERE id = ?2 AND user_key = ?3").bind(now, runId, userKey).run();
    }
    return Response.json({
      error: allAnswered
        ? `這場只取得 ${novelCorrect}/${BOSS_CORE_TARGET} 次有效核心命中，伺服器不會把它記成通關。`
        : `伺服器只收到 ${answerByQuestion.size}/${BOSS_TURN_LIMIT} 題完整作答，不能提前結算 Boss。`,
      novelCorrect,
      answered: answerByQuestion.size,
    }, { status: 409 });
  }

  const existing = await database
    .prepare("SELECT id FROM learning_events WHERE user_key = ?1 AND event_type = 'boss_cleared' AND entity_id = ?2 LIMIT 1")
    .bind(userKey, region.id)
    .first<{ id: number }>();
  const statements = [
    database.prepare("UPDATE boss_runs SET status = 'cleared', completed_at = ?1 WHERE id = ?2 AND user_key = ?3").bind(now, runId, userKey),
  ];
  if (!existing) {
    statements.push(database
      .prepare(`INSERT INTO learning_events (user_key, event_type, entity_id, unit, metadata_json, local_date, created_at)
        VALUES (?1, 'boss_cleared', ?2, ?3, ?4, ?5, ?6)`)
      .bind(
        userKey,
        region.id,
        String(run.end_unit ?? ""),
        JSON.stringify({ gameOnly: true, doesNotAdvanceCurriculum: true, bossName: region.bossName, runId, answered: BOSS_TURN_LIMIT, novelCorrect }),
        typeof localDate === "string" ? localDate : null,
        now,
      ));
  }
  await database.batch(statements);
  return Response.json({ saved: true, duplicate: Boolean(existing), regionId: region.id, novelCorrect, answered: BOSS_TURN_LIMIT });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { action?: string; regionId?: string; runId?: string; localDate?: string };
    if (!payload.regionId || !["startBoss", "clearBoss"].includes(String(payload.action))) {
      return Response.json({ error: "未知的冒險操作。" }, { status: 400 });
    }
    const region = ADVENTURE_REGIONS.find((item) => item.id === payload.regionId);
    if (!region) return Response.json({ error: "找不到這個區域 Boss。" }, { status: 400 });

    const database = await getDatabase();
    await ensureLearningSchema(database);
    const userKey = await currentUserKey();
    if (payload.action === "startBoss") {
      try {
        return Response.json(await startBoss(database, userKey, region));
      } catch (error) {
        return Response.json({ error: errorMessage(error) }, { status: 409 });
      }
    }
    if (!payload.runId) return Response.json({ error: "缺少這場 Boss 戰的伺服器紀錄。" }, { status: 400 });
    return clearBoss(database, userKey, region, payload.runId, payload.localDate);
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
