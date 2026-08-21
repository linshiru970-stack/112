import { getChatGPTUser } from "../../chatgpt-auth";
import { seedCompanionStates } from "../../companion-store";
import { COMPANIONS, type CompanionId } from "../../companions";
import { getGameDatabase, seedGameProfile } from "../../game-store";
import { ensureLearningSchema } from "../../learning-schema";
import {
  SCENARIO_MISSIONS,
  SCENARIO_PROCESS_COPY,
  SCENARIO_WEAKNESS_INFO,
  getScenarioMission,
  getScenarioQuestion,
  scenarioEnding,
  scenarioMissionUnit,
  scenarioProcessResult,
  scenarioQuestionsForNode,
  type ScenarioEnding,
  type ScenarioMissionDefinition,
  type ScenarioNodeId,
  type ScenarioProcessResult,
  type ScenarioWeaknessKey,
} from "../../scenario-mission";
import { ensureScenarioSchema } from "../../scenario-store";
import { getFirstActChapter } from "../../story-content";
import { ensureStorySchema } from "../../story-store";

type D1Row = Record<string, unknown>;

async function currentUserKey() {
  const user = await getChatGPTUser();
  return user?.email || "demo-local";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "情境任務同步失敗。";
}

function isOpaqueId(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 8
    && value.length <= 120
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

function isCompanionId(value: unknown): value is CompanionId {
  return typeof value === "string" && COMPANIONS.some((companion) => companion.id === value);
}

function isWeaknessKey(value: unknown): value is ScenarioWeaknessKey {
  return typeof value === "string" && value in SCENARIO_WEAKNESS_INFO;
}

function parseJsonArray(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseJsonRecord(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function chooseQuestionIds(runId: string, mission: ScenarioMissionDefinition, sequence: ScenarioNodeId[], recentRows: D1Row[]) {
  const recentIds = new Set(recentRows.map((row) => String(row.question_id ?? "")).filter(Boolean));
  const chosen = new Set<string>();
  return sequence.map((nodeId) => {
    const candidates = scenarioQuestionsForNode(nodeId, mission.id);
    const minimumVariants = mission.kind === "chapter" ? 3 : 5;
    if (candidates.length < minimumVariants) throw new Error(`${mission.nodes[nodeId]?.label ?? nodeId} 的題目變體不足。`);
    const offset = stableHash(`${runId}:${mission.id}:${nodeId}`) % candidates.length;
    const ordered = candidates.map((_, index) => candidates[(offset + index) % candidates.length]);
    const selected = ordered.find((question) => !recentIds.has(question.id) && !chosen.has(question.id))
      ?? ordered.find((question) => !chosen.has(question.id))
      ?? ordered[0];
    chosen.add(selected.id);
    return selected.id;
  });
}

async function latestActiveRun(database: D1Database, userKey: string) {
  const rows = await database
    .prepare(`SELECT * FROM scenario_runs
      WHERE user_key = ?1 AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 12`)
    .bind(userKey)
    .all<D1Row>();
  return (rows.results ?? []).find((row) => Boolean(getScenarioMission(String(row.scenario_id ?? "")))) ?? null;
}

async function readMissionCounts(database: D1Database, userKey: string) {
  const rows = await database
    .prepare("SELECT scenario_id, COUNT(*) AS count FROM scenario_runs WHERE user_key = ?1 AND status = 'completed' GROUP BY scenario_id")
    .bind(userKey)
    .all<D1Row>();
  return new Map((rows.results ?? []).map((row) => [String(row.scenario_id ?? ""), Number(row.count ?? 0)]));
}

async function readMemory(database: D1Database, userKey: string) {
  const rows = await database
    .prepare(`SELECT weakness_key, misses, repaired, last_question_id, last_companion_id, last_consequence, last_seen_at, updated_at
      FROM scenario_skill_memory WHERE user_key = ?1 ORDER BY (misses - repaired) DESC, updated_at DESC`)
    .bind(userKey)
    .all<D1Row>();
  return (rows.results ?? [])
    .filter((row) => isWeaknessKey(row.weakness_key))
    .map((row) => {
      const weaknessKey = String(row.weakness_key) as ScenarioWeaknessKey;
      const misses = Math.max(0, Number(row.misses ?? 0));
      const repaired = Math.max(0, Number(row.repaired ?? 0));
      return {
        weaknessKey,
        misses,
        repaired,
        pending: Math.max(0, misses - repaired),
        lastQuestionId: String(row.last_question_id ?? ""),
        lastCompanionId: isCompanionId(row.last_companion_id) ? row.last_companion_id : null,
        lastConsequence: String(row.last_consequence ?? ""),
        lastSeenAt: String(row.last_seen_at ?? ""),
      };
    });
}

async function baseSnapshot(database: D1Database, userKey: string) {
  const [counts, memory] = await Promise.all([
    readMissionCounts(database, userKey),
    readMemory(database, userKey),
  ]);
  const pendingByWeakness = new Map(memory.map((item) => [item.weaknessKey, item.pending]));
  return {
    missions: SCENARIO_MISSIONS.map((mission) => ({
      id: mission.id,
      kind: mission.kind,
      completedCount: counts.get(mission.id) ?? 0,
      pendingRepair: mission.weaknessKey ? pendingByWeakness.get(mission.weaknessKey) ?? 0 : 0,
    })),
    memory,
  };
}

async function snapshot(database: D1Database, userKey: string, suppliedRun?: D1Row | null) {
  const [base, run] = await Promise.all([
    baseSnapshot(database, userKey),
    suppliedRun === undefined ? latestActiveRun(database, userKey) : Promise.resolve(suppliedRun),
  ]);
  if (!run) return { scenario: null, run: null, ...base };

  const mission = getScenarioMission(String(run.scenario_id ?? ""));
  if (!mission) return { scenario: null, run: null, ...base };
  const companionId = isCompanionId(run.companion_id) ? run.companion_id : "rinka";
  const sequence = mission.sequence(companionId);
  const questionIds = parseJsonArray(run.question_ids_json);
  const currentIndex = Math.max(0, Math.min(sequence.length, Number(run.current_index ?? 0)));
  const status = String(run.status ?? "active");
  const answerRows = await database
    .prepare("SELECT node_id, question_id, correct, support_mode, listen_count, replay_count, consequence, answered_at FROM scenario_answers WHERE user_key = ?1 AND run_id = ?2 ORDER BY answered_at ASC")
    .bind(userKey, String(run.id ?? ""))
    .all<D1Row>();
  const ending = String(run.ending ?? "") as ScenarioEnding;
  const processResult = String(run.process_result ?? "") as ScenarioProcessResult;
  const summary = base.missions.find((item) => item.id === mission.id);

  return {
    scenario: { id: mission.id, title: mission.title, kind: mission.kind, totalNodes: sequence.length },
    run: {
      id: String(run.id ?? ""),
      missionId: mission.id,
      companionId,
      status,
      currentIndex,
      currentNodeId: status === "active" ? sequence[currentIndex] ?? null : null,
      questionId: status === "active" ? questionIds[currentIndex] ?? null : null,
      nodeSequence: sequence,
      questionIds,
      clues: Number(run.clues ?? 0),
      setbacks: Number(run.setbacks ?? 0),
      ending: ending || null,
      endingCopy: ending && mission.endings[ending] ? mission.endings[ending] : null,
      processResult: processResult || null,
      processCopy: processResult && SCENARIO_PROCESS_COPY[processResult] ? SCENARIO_PROCESS_COPY[processResult] : null,
      reward: parseJsonRecord(run.reward_json),
      startedAt: String(run.started_at ?? ""),
      completedAt: run.completed_at ? String(run.completed_at) : null,
      answers: (answerRows.results ?? []).map((row) => ({
        nodeId: String(row.node_id ?? ""),
        questionId: String(row.question_id ?? ""),
        correct: Number(row.correct ?? 0) === 1,
        supportMode: String(row.support_mode ?? "blade"),
        listenCount: Number(row.listen_count ?? 0),
        replayCount: Number(row.replay_count ?? 0),
        consequence: String(row.consequence ?? ""),
        answeredAt: String(row.answered_at ?? ""),
      })),
    },
    completedCount: summary?.completedCount ?? 0,
    ...base,
  };
}

async function startRun(database: D1Database, userKey: string, missionId: string, companionId: CompanionId, forceRestart: boolean) {
  const mission = getScenarioMission(missionId);
  if (!mission) throw new Error("找不到這個情境案件。 ");
  if (mission.kind === "repair" && mission.weaknessKey) {
    const row = await database
      .prepare("SELECT misses, repaired FROM scenario_skill_memory WHERE user_key = ?1 AND weakness_key = ?2")
      .bind(userKey, mission.weaknessKey)
      .first<{ misses: number; repaired: number }>();
    if (!row || Number(row.misses ?? 0) <= Number(row.repaired ?? 0)) throw new Error("這個錯因目前沒有待修復紀錄。 ");
  }

  const active = await latestActiveRun(database, userKey);
  if (active && !forceRestart) return snapshot(database, userKey, active);

  const runId = globalThis.crypto.randomUUID();
  const now = new Date().toISOString();
  const sequence = mission.sequence(companionId);
  const recent = await database
    .prepare("SELECT question_id FROM scenario_answers WHERE user_key = ?1 ORDER BY answered_at DESC LIMIT 320")
    .bind(userKey)
    .all<D1Row>();
  const questionIds = chooseQuestionIds(runId, mission, sequence, (recent.results ?? []) as unknown as D1Row[]);
  const missionUnit = scenarioMissionUnit(mission);
  const statements: D1PreparedStatement[] = [
    database.prepare("UPDATE scenario_runs SET status = 'abandoned', updated_at = ?1 WHERE user_key = ?2 AND status = 'active'")
      .bind(now, userKey),
    database.prepare(`INSERT INTO scenario_runs
      (id, user_key, scenario_id, companion_id, question_ids_json, current_index, clues, setbacks, status, started_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, 0, 'active', ?6, ?6)`)
      .bind(runId, userKey, mission.id, companionId, JSON.stringify(questionIds), now),
    database.prepare("UPDATE companion_states SET selected = 0, updated_at = ?1 WHERE user_key = ?2")
      .bind(now, userKey),
    database.prepare("UPDATE companion_states SET selected = 1, updated_at = ?1 WHERE user_key = ?2 AND companion_id = ?3")
      .bind(now, userKey, companionId),
    database.prepare(`INSERT INTO learning_events
      (user_key, event_type, entity_id, unit, metadata_json, created_at)
      VALUES (?1, 'scenario_started', ?2, ?3, ?4, ?5)`)
      .bind(userKey, runId, missionUnit, JSON.stringify({ scenarioId: mission.id, missionKind: mission.kind, companionId, gameOnlyAdvance: true, doesNotAdvanceCurriculum: true }), now),
  ];
  if (mission.caseFile) {
    statements.push(
      database.prepare(`INSERT INTO story_unit_states (user_key, unit, status, visit_count, first_seen_at, updated_at)
        VALUES (?1, ?2, 'explored', 1, ?3, ?3)
        ON CONFLICT(user_key, unit) DO UPDATE SET visit_count = story_unit_states.visit_count + 1, updated_at = excluded.updated_at`)
        .bind(userKey, missionUnit, now),
    );
  }
  await database.batch(statements);
  const created = await database.prepare("SELECT * FROM scenario_runs WHERE id = ?1 AND user_key = ?2").bind(runId, userKey).first<D1Row>();
  return snapshot(database, userKey, created);
}

async function advanceRun(database: D1Database, userKey: string, runId: string, answerReceiptId: string) {
  const run = await database
    .prepare("SELECT * FROM scenario_runs WHERE id = ?1 AND user_key = ?2 LIMIT 1")
    .bind(runId, userKey)
    .first<D1Row>();
  if (!run) throw new Error("找不到這次情境任務，請重新整理。 ");
  const mission = getScenarioMission(String(run.scenario_id ?? ""));
  if (!mission) throw new Error("這個情境任務版本已無法辨識。 ");

  const usedReceipt = await database
    .prepare("SELECT run_id FROM scenario_answers WHERE user_key = ?1 AND answer_receipt_id = ?2 LIMIT 1")
    .bind(userKey, answerReceiptId)
    .first<{ run_id: string }>();
  if (usedReceipt) return snapshot(database, userKey, run);
  if (String(run.status ?? "") !== "active") throw new Error("這次任務已經結束；可以從任務中心重新出發。 ");

  const companionId = isCompanionId(run.companion_id) ? run.companion_id : "rinka";
  const sequence = mission.sequence(companionId);
  const questionIds = parseJsonArray(run.question_ids_json);
  const currentIndex = Number(run.current_index ?? 0);
  const nodeId = sequence[currentIndex];
  const expectedQuestionId = questionIds[currentIndex];
  const question = getScenarioQuestion(expectedQuestionId);
  if (!nodeId || !question || question.mission.nodeId !== nodeId || question.mission.missionId !== mission.id) {
    throw new Error("目前任務節點與題目不一致，請重新整理。 ");
  }

  const receipt = await database
    .prepare("SELECT question_id, response_json FROM answer_receipts WHERE user_key = ?1 AND request_id = ?2 LIMIT 1")
    .bind(userKey, answerReceiptId)
    .first<{ question_id: string; response_json: string }>();
  if (!receipt || receipt.question_id !== expectedQuestionId) throw new Error("這次作答沒有連到目前的任務節點。 ");
  const answer = parseJsonRecord(receipt.response_json);
  if (String(answer.questionId ?? "") !== expectedQuestionId) throw new Error("作答收據題目不一致。 ");

  const correct = answer.correct === true;
  const previewOnly = answer.previewOnly === true;
  const supportMode = ["blade", "ward", "lantern"].includes(String(answer.supportMode)) ? String(answer.supportMode) : "blade";
  const listenCount = Math.max(0, Math.min(2, Number(answer.listenCount ?? 0)));
  const replayCount = Math.max(0, Math.min(1, Number(answer.replayCount ?? 0)));
  const consequence = correct ? question.mission.correctConsequence : question.mission.wrongConsequence;
  const nextIndex = currentIndex + 1;
  const nextClues = Number(run.clues ?? 0) + (correct ? 1 : 0);
  const nextSetbacks = Number(run.setbacks ?? 0) + (correct ? 0 : 1);
  const completed = nextIndex >= sequence.length;
  const processResult = scenarioProcessResult(nextSetbacks, mission.recoveredMaxSetbacks);
  const ending = scenarioEnding(nextClues, mission.fullIntelThreshold);
  const gold = completed && !previewOnly
    ? (ending === "full-intel" ? mission.reward.fullGold : mission.reward.standardGold)
      + (processResult === "clean" ? mission.reward.cleanBonus : 0)
    : 0;
  const affinity = completed && !previewOnly
    ? ending === "full-intel" ? mission.reward.fullAffinity : mission.reward.standardAffinity
    : 0;
  const reward = completed ? { gold, affinity, companionId, missionId: mission.id, previewOnly } : {};
  const now = new Date().toISOString();
  const missionUnit = scenarioMissionUnit(mission);

  const statements: D1PreparedStatement[] = [
    database.prepare(`INSERT INTO scenario_answers
      (run_id, user_key, node_id, question_id, answer_receipt_id, correct, support_mode, listen_count, replay_count, consequence, answered_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
      .bind(runId, userKey, nodeId, expectedQuestionId, answerReceiptId, correct ? 1 : 0, supportMode, listenCount, replayCount, consequence, now),
    database.prepare(`UPDATE scenario_runs SET current_index = ?1, clues = ?2, setbacks = ?3, status = ?4,
      ending = ?5, process_result = ?6, reward_json = ?7, updated_at = ?8, completed_at = ?9
      WHERE id = ?10 AND user_key = ?11 AND status = 'active' AND current_index = ?12`)
      .bind(nextIndex, nextClues, nextSetbacks, completed ? "completed" : "active", completed ? ending : null, completed ? processResult : null, JSON.stringify(reward), now, completed ? now : null, runId, userKey, currentIndex),
  ];

  if (!correct && !previewOnly && mission.kind !== "repair" && question.mission.weaknessKey) {
    statements.push(
      database.prepare(`INSERT INTO scenario_skill_memory
        (user_key, weakness_key, misses, repaired, last_question_id, last_companion_id, last_consequence, last_seen_at, updated_at)
        VALUES (?1, ?2, 1, 0, ?3, ?4, ?5, ?6, ?6)
        ON CONFLICT(user_key, weakness_key) DO UPDATE SET misses = scenario_skill_memory.misses + 1,
          last_question_id = excluded.last_question_id, last_companion_id = excluded.last_companion_id,
          last_consequence = excluded.last_consequence, last_seen_at = excluded.last_seen_at, updated_at = excluded.updated_at`)
        .bind(userKey, question.mission.weaknessKey, expectedQuestionId, companionId, consequence, now),
    );
  }

  if (completed) {
    if (!previewOnly) {
      statements.push(
        database.prepare("UPDATE game_profiles SET coins = coins + ?1, updated_at = ?2 WHERE user_key = ?3")
          .bind(gold, now, userKey),
        database.prepare("UPDATE companion_states SET affinity = MIN(100, affinity + ?1), updated_at = ?2 WHERE user_key = ?3 AND companion_id = ?4")
          .bind(affinity, now, userKey, companionId),
      );
    }
    statements.push(
      database.prepare(`INSERT INTO learning_events
        (user_key, event_type, entity_id, unit, correct, metadata_json, created_at)
        VALUES (?1, 'scenario_completed', ?2, ?3, ?4, ?5, ?6)`)
        .bind(userKey, runId, missionUnit, ending === "full-intel" ? 1 : 0, JSON.stringify({ scenarioId: mission.id, missionKind: mission.kind, companionId, ending, processResult, clues: nextClues, setbacks: nextSetbacks, reward, previewOnly, doesNotAdvanceCurriculum: true }), now),
    );
    const storyChapter = mission.caseFile ? getFirstActChapter(missionUnit) : null;
    if (storyChapter) {
      statements.push(
        database.prepare(`INSERT INTO story_unit_states (user_key, unit, status, visit_count, first_seen_at, updated_at)
          VALUES (?1, ?2, 'completed', 1, ?3, ?3)
          ON CONFLICT(user_key, unit) DO UPDATE SET status = 'completed', updated_at = excluded.updated_at`)
          .bind(userKey, missionUnit, now),
        database.prepare(`INSERT INTO story_evidence_items (user_key, evidence_id, unit, collected_at)
          VALUES (?1, ?2, ?3, ?4)
          ON CONFLICT(user_key, evidence_id) DO NOTHING`)
          .bind(userKey, storyChapter.evidence.id, missionUnit, now),
      );
    }
    if (mission.kind === "repair" && mission.weaknessKey && ending === "full-intel") {
      statements.push(
        database.prepare(`UPDATE scenario_skill_memory
          SET repaired = MIN(misses, repaired + 1), updated_at = ?1
          WHERE user_key = ?2 AND weakness_key = ?3 AND repaired < misses`)
          .bind(now, userKey, mission.weaknessKey),
        database.prepare(`INSERT INTO learning_events
          (user_key, event_type, entity_id, unit, correct, metadata_json, created_at)
          VALUES (?1, 'scenario_weakness_repaired', ?2, 'U02', 1, ?3, ?4)`)
          .bind(userKey, runId, JSON.stringify({ scenarioId: mission.id, weaknessKey: mission.weaknessKey, immediateRepair: true, doesNotCountAsUnassistedMastery: true }), now),
      );
    }
  }
  await database.batch(statements);
  const updated = await database.prepare("SELECT * FROM scenario_runs WHERE id = ?1 AND user_key = ?2").bind(runId, userKey).first<D1Row>();
  return snapshot(database, userKey, updated);
}

async function prepareDatabase() {
  const database = await getGameDatabase();
  await ensureLearningSchema(database);
  await ensureScenarioSchema(database);
  await ensureStorySchema(database);
  const userKey = await currentUserKey();
  const now = new Date().toISOString();
  await seedGameProfile(database, userKey);
  await seedCompanionStates(database, userKey, now);
  return { database, userKey };
}

export async function GET() {
  try {
    const { database, userKey } = await prepareDatabase();
    return Response.json(await snapshot(database, userKey));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: "start" | "restart" | "advance";
      missionId?: string;
      companionId?: string;
      runId?: string;
      answerReceiptId?: string;
    };
    const { database, userKey } = await prepareDatabase();
    if (payload.action === "start" || payload.action === "restart") {
      if (!isCompanionId(payload.companionId)) return Response.json({ error: "請先選擇同行旅伴。" }, { status: 400 });
      if (!payload.missionId || !getScenarioMission(payload.missionId)) return Response.json({ error: "請先選擇情境案件。" }, { status: 400 });
      return Response.json(await startRun(database, userKey, payload.missionId, payload.companionId, payload.action === "restart"));
    }
    if (payload.action === "advance") {
      if (!isOpaqueId(payload.runId) || !isOpaqueId(payload.answerReceiptId)) {
        return Response.json({ error: "任務推進資料不完整。" }, { status: 400 });
      }
      return Response.json(await advanceRun(database, userKey, payload.runId, payload.answerReceiptId));
    }
    return Response.json({ error: "未知的情境任務操作。" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
