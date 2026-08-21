import { getChatGPTUser } from "../../chatgpt-auth";
import { seedCompanionStates } from "../../companion-store";
import { QUESTIONS, UNITS, getQuestion, getQuestionSkillTags, getSkillTagLabel } from "../../content";
import { getGameDatabase } from "../../game-store";
import { ensureJourneySchema } from "../../journey-store";
import { buildAbilityAtlas } from "../../ability-atlas";
import {
  buildAbilityMap,
  companionJourneyLine,
  JOURNEY_LENGTHS,
  JOURNEY_STEP_INFO,
  JOURNEY_STEPS,
  type JourneyLength,
  type JourneyStep,
} from "../../journey-system";
import { buildAdaptiveDailyQueue, deriveLearningFrontier } from "../../learning-path";
import { ensureLearningSchema } from "../../learning-schema";
import {
  FORMAL_PROGRESS_BASELINE,
  JOURNEY_SCHEMA_VERSION,
  SCENARIO_CONTENT_VERSION,
  SITE_VERSION,
} from "../../product-version";
import { getScenarioMission, getScenarioQuestion, SCENARIO_WEAKNESS_INFO } from "../../scenario-mission";
import { ensureScenarioSchema } from "../../scenario-store";
import { ensureVocabularySchema } from "../../vocabulary-store";
import { VARIANT_QUESTIONS, getUnseenVariantQuestions, getVariantQuestion } from "../../question-variants";
import { DEFAULT_COMPANION_ID, type CompanionId } from "../../companions";

type D1Row = Record<string, unknown>;
type JourneyScenarioEvidence = { runId: string; questionId: string };

const STATIC_QUESTION_IDS = new Set(QUESTIONS.map((question) => question.id));
const QUEUE_QUESTIONS = QUESTIONS.map((question) => ({
  ...question,
  skillTags: getQuestionSkillTags(question),
  role: question.skill.includes("情境遷移") ? ("transfer" as const) : ("core" as const),
}));
const VARIANT_QUEUE_QUESTIONS = VARIANT_QUESTIONS.map((question) => ({
  ...question,
  skillTags: getQuestionSkillTags(question),
  role: "transfer" as const,
  fingerprint: question.variant?.fingerprint,
}));

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(String(value ?? "")) as T;
  } catch {
    return fallback;
  }
}

function parseStringArray(value: unknown) {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function scenarioEvidence(row: D1Row): JourneyScenarioEvidence[] {
  const summary = parseJson<Record<string, unknown>>(row.summary_json, {});
  if (!Array.isArray(summary.scenarioEvidence)) return [];
  return summary.scenarioEvidence.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    const runId = String(value.runId ?? "");
    const questionId = String(value.questionId ?? "");
    return runId && questionId ? [{ runId, questionId }] : [];
  });
}

function isJourneyStep(value: unknown): value is JourneyStep {
  return typeof value === "string" && JOURNEY_STEPS.includes(value as JourneyStep);
}

function isCompanionId(value: unknown): value is CompanionId {
  return value === "rinka" || value === "sena" || value === "yori";
}

function isJourneyLength(value: unknown): value is JourneyLength {
  return value === "short" || value === "standard" || value === "full";
}

function journeyConfiguration(row: D1Row) {
  const summary = parseJson<Record<string, unknown>>(row.summary_json, {});
  const journeyLength = isJourneyLength(summary.journeyLength) ? summary.journeyLength : "standard";
  return { journeyLength, ...JOURNEY_LENGTHS[journeyLength] };
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function unitNumber(unitId: string) {
  const parsed = Number(unitId.replace(/^U/, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function seededRandom(seed: string) {
  let value = 2166136261;
  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function practiceQuestion(id: string) {
  return getQuestion(id) ?? getVariantQuestion(id) ?? getScenarioQuestion(id);
}

async function currentUser() {
  const user = await getChatGPTUser();
  return { key: user?.email || "demo-local", name: user?.displayName || "試行使用者" };
}

async function prepareDatabase() {
  const database = await getGameDatabase();
  await ensureLearningSchema(database);
  await ensureScenarioSchema(database);
  await ensureJourneySchema(database);
  await ensureVocabularySchema(database);
  const user = await currentUser();
  await seedCompanionStates(database, user.key);
  return { database, user };
}

async function activeSession(database: D1Database, userKey: string) {
  return database
    .prepare("SELECT * FROM journey_sessions WHERE user_key = ?1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1")
    .bind(userKey)
    .first<D1Row>();
}

async function latestCompletedSession(database: D1Database, userKey: string, localDate: string) {
  return database
    .prepare("SELECT * FROM journey_sessions WHERE user_key = ?1 AND local_date = ?2 AND status = 'completed' ORDER BY completed_at DESC LIMIT 1")
    .bind(userKey, localDate)
    .first<D1Row>();
}

async function readLearningSnapshot(database: D1Database, userKey: string) {
  const [stateResult, skillResult, eventResult, vocabularyStateResult, vocabularyAttemptResult, fingerprintResult, companion, pendingScenario, activeScenario] = await Promise.all([
    database.prepare("SELECT * FROM question_states WHERE user_key = ?1 ORDER BY next_review_at ASC").bind(userKey).all<D1Row>(),
    database.prepare("SELECT * FROM skill_fsrs_states WHERE user_key = ?1 ORDER BY next_review_at ASC").bind(userKey).all<D1Row>(),
    database.prepare(`SELECT entity_id, unit, answer, correct, confidence, replay_count, skill_tags_json, metadata_json, local_date, created_at
      FROM learning_events WHERE user_key = ?1 AND event_type = 'question_answered' ORDER BY created_at DESC LIMIT 1400`).bind(userKey).all<D1Row>(),
    database.prepare("SELECT * FROM vocabulary_states WHERE user_key = ?1 ORDER BY updated_at DESC").bind(userKey).all<D1Row>(),
    database.prepare("SELECT * FROM vocabulary_attempts WHERE user_key = ?1 ORDER BY reviewed_at DESC LIMIT 1200").bind(userKey).all<D1Row>(),
    database.prepare("SELECT fingerprint FROM question_fingerprint_evidence WHERE user_key = ?1").bind(userKey).all<D1Row>(),
    database.prepare("SELECT companion_id FROM companion_states WHERE user_key = ?1 AND selected = 1 LIMIT 1").bind(userKey).first<{ companion_id: string }>(),
    database.prepare("SELECT COALESCE(SUM(MAX(0, misses - repaired)), 0) AS count FROM scenario_skill_memory WHERE user_key = ?1").bind(userKey).first<{ count: number }>(),
    database.prepare("SELECT id, scenario_id, companion_id, current_index, updated_at FROM scenario_runs WHERE user_key = ?1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1").bind(userKey).first<D1Row>(),
  ]);
  const states = (stateResult.results ?? []) as D1Row[];
  const skillStates = (skillResult.results ?? []) as D1Row[];
  const learningEvents = (eventResult.results ?? []) as D1Row[];
  const formalStates = states.filter((state) => STATIC_QUESTION_IDS.has(String(state.question_id ?? "")));
  const frontier = deriveLearningFrontier(UNITS, QUESTIONS, formalStates.map((state) => ({
    question_id: String(state.question_id ?? ""),
    unit: String(state.unit ?? ""),
    last_correct: Number(state.last_correct ?? 0),
    confidence: Number(state.confidence ?? 0),
    wrong_count: Number(state.wrong_count ?? 0),
    next_review_at: String(state.next_review_at ?? ""),
  })), FORMAL_PROGRESS_BASELINE);
  const activeUnit = UNITS[frontier.activeUnitIndex] ?? UNITS.find((unit) => unit.id === FORMAL_PROGRESS_BASELINE) ?? UNITS[0];
  const diagnostics = new Map<string, { tag: string; currentWeak: number; lowConfidence: number; repeatedWrong: number; highConfidenceWrong: number }>();
  for (const state of states) {
    const question = practiceQuestion(String(state.question_id ?? ""));
    if (!question) continue;
    const currentWeak = Number(state.last_correct ?? 1) === 0 || Number(state.confidence ?? 3) <= 1;
    if (!currentWeak) continue;
    for (const tag of getQuestionSkillTags(question)) {
      const item = diagnostics.get(tag) ?? { tag, currentWeak: 0, lowConfidence: 0, repeatedWrong: 0, highConfidenceWrong: 0 };
      item.currentWeak += 1;
      if (Number(state.confidence ?? 3) <= 1) item.lowConfidence += 1;
      if (Number(state.wrong_count ?? 0) >= 2) item.repeatedWrong += 1;
      if (Number(state.last_correct ?? 1) === 0 && Number(state.confidence ?? 0) >= 3) item.highConfidenceWrong += 1;
      diagnostics.set(tag, item);
    }
  }
  const abilityMap = buildAbilityMap(activeUnit.id, skillStates.map((row) => ({
    skillTag: String(row.skill_tag ?? ""),
    validated: Number(row.distinct_question_count ?? 0) >= 2
      && Number(row.successful_unseen_count ?? 0) >= 2
      && Number(row.last_rating ?? 0) >= 3,
    lastRating: Number(row.last_rating ?? 0),
    successfulUnseenCount: Number(row.successful_unseen_count ?? 0),
    nextReviewAt: String(row.next_review_at ?? ""),
  })), [...diagnostics.values()]);
  const abilityAtlas = buildAbilityAtlas({
    activeUnitId: activeUnit.id,
    skillStates,
    events: learningEvents,
    vocabularyStates: (vocabularyStateResult.results ?? []) as D1Row[],
    vocabularyAttempts: (vocabularyAttemptResult.results ?? []) as D1Row[],
  });
  return {
    states,
    skillStates,
    fingerprints: new Set((fingerprintResult.results ?? []).map((row) => String(row.fingerprint ?? "")).filter(Boolean)),
    frontier,
    activeUnit,
    abilityMap,
    abilityAtlas,
    companionId: isCompanionId(companion?.companion_id) ? companion.companion_id : DEFAULT_COMPANION_ID,
    pendingScenarioRepairs: Math.max(0, Number(pendingScenario?.count ?? 0)),
    activeScenario: activeScenario ? {
      runId: String(activeScenario.id ?? ""),
      missionId: String(activeScenario.scenario_id ?? ""),
      title: getScenarioMission(String(activeScenario.scenario_id ?? ""))?.title ?? "U02 情境任務",
      imageSrc: getScenarioMission(String(activeScenario.scenario_id ?? ""))?.imageSrc ?? "/game/scenarios/station-platform-v23.webp",
      companionId: String(activeScenario.companion_id ?? ""),
      currentIndex: Number(activeScenario.current_index ?? 0),
    } : null,
  };
}

function normalizeBattleState(value: unknown) {
  const parsed = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const serialized = JSON.stringify(parsed);
  if (serialized.length > 48_000) throw new Error("旅程斷點資料過大，請重新開始本輪。 ");
  return parsed;
}

function sessionPayload(row: D1Row | null) {
  if (!row) return null;
  const currentStep = isJourneyStep(row.current_step) ? row.current_step : "practice";
  const config = journeyConfiguration(row);
  return {
    id: String(row.id ?? ""),
    localDate: String(row.local_date ?? ""),
    formalUnit: String(row.formal_unit ?? FORMAL_PROGRESS_BASELINE),
    status: String(row.status ?? "active"),
    currentStep,
    stepInfo: JOURNEY_STEP_INFO[currentStep],
    stepStartedAt: String(row.step_started_at ?? row.started_at ?? ""),
    queue: parseStringArray(row.queue_json),
    currentIndex: Math.max(0, Number(row.current_index ?? 0)),
    battleState: parseJson<Record<string, unknown>>(row.battle_state_json, {}),
    companionId: isCompanionId(row.companion_id) ? row.companion_id : DEFAULT_COMPANION_ID,
    companionLine: String(row.companion_line ?? ""),
    repairPlan: parseJson<Record<string, unknown>>(row.repair_plan_json, {}),
    summary: parseJson<Record<string, unknown>>(row.summary_json, {}),
    journeyLength: config.journeyLength,
    journeyLengthInfo: {
      label: config.label,
      duration: config.duration,
      practiceCount: config.practiceCount,
      scenarioTarget: config.scenarioTarget,
      repairCount: config.repairCount,
    },
    startedAt: String(row.started_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

async function journeySummary(database: D1Database, userKey: string, session: D1Row) {
  const startedAt = String(session.started_at ?? "");
  const config = journeyConfiguration(session);
  const recordedScenarioEvidence = scenarioEvidence(session);
  const scenarioEvidenceKeys = new Set(recordedScenarioEvidence.map((item) => `${item.runId}:${item.questionId}`));
  const scenarioRunIds = new Set(recordedScenarioEvidence.map((item) => item.runId));
  const [events, scenarioAnswers, battleRows, scenarioRows] = await Promise.all([
    database.prepare(`SELECT entity_id, unit, answer, correct, confidence, skill_tags_json, metadata_json, local_date, created_at FROM learning_events
      WHERE user_key = ?1 AND event_type = 'question_answered' AND created_at >= ?2 ORDER BY created_at ASC`)
      .bind(userKey, startedAt).all<D1Row>(),
    database.prepare("SELECT run_id, question_id, correct, consequence, answered_at FROM scenario_answers WHERE user_key = ?1 AND answered_at >= ?2 ORDER BY answered_at ASC")
      .bind(userKey, startedAt).all<D1Row>(),
    database.prepare("SELECT outcome, grade, gold, reward_json FROM game_battle_results WHERE user_key = ?1 AND battle_id = ?2 LIMIT 1")
      .bind(userKey, String(session.id ?? "")).all<D1Row>(),
    database.prepare("SELECT id, scenario_id, companion_id, reward_json, started_at, completed_at FROM scenario_runs WHERE user_key = ?1 ORDER BY updated_at DESC LIMIT 24")
      .bind(userKey).all<D1Row>(),
  ]);
  const scenarioAnswerRows = ((scenarioAnswers.results ?? []) as D1Row[]).filter((row) => (
    scenarioEvidenceKeys.has(`${String(row.run_id ?? "")}:${String(row.question_id ?? "")}`)
  ));
  const repairPlan = parseJson<Record<string, unknown>>(session.repair_plan_json, {});
  const repairQuestionIds = Array.isArray(repairPlan.questionIds)
    ? repairPlan.questionIds.filter((value): value is string => typeof value === "string")
    : [];
  const journeyQuestionIds = new Set([
    ...parseStringArray(session.queue_json),
    ...repairQuestionIds,
    ...scenarioAnswerRows.map((row) => String(row.question_id ?? "")).filter(Boolean),
  ]);
  const eventRows = ((events.results ?? []) as D1Row[])
    .filter((row) => journeyQuestionIds.has(String(row.entity_id ?? "")));
  const wrongTags = new Map<string, number>();
  const strictTags = new Map<string, number>();
  const errorCategories = new Map<string, number>();
  let novelEvidence = 0;
  let highConfidenceWrong = 0;
  let lowConfidenceCorrect = 0;
  for (const event of eventRows) {
    if (Number(event.correct ?? 0) === 0) {
      for (const tag of parseStringArray(event.skill_tags_json)) wrongTags.set(tag, (wrongTags.get(tag) ?? 0) + 1);
      if (Number(event.confidence ?? 0) >= 3) highConfidenceWrong += 1;
    }
    const metadata = parseJson<Record<string, unknown>>(event.metadata_json, {});
    if (typeof metadata.errorCategory === "string") errorCategories.set(metadata.errorCategory, (errorCategories.get(metadata.errorCategory) ?? 0) + 1);
    if (Number(event.correct ?? 0) === 1 && Number(event.confidence ?? 0) <= 1) lowConfidenceCorrect += 1;
    if (metadata.novelEvidence === true && Number(event.correct ?? 0) === 1) {
      novelEvidence += 1;
      for (const tag of parseStringArray(event.skill_tags_json)) strictTags.set(tag, (strictTags.get(tag) ?? 0) + 1);
    }
  }
  const primaryWeaknessTag = [...wrongTags.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const realImprovements = [...strictTags.keys()].slice(0, 4).map(getSkillTagLabel);
  const topErrorCategory = [...errorCategories.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const battleGold = (battleRows.results ?? []).reduce((sum, row) => sum + Number(row.gold ?? 0), 0);
  const relevantScenarioRows = ((scenarioRows.results ?? []) as D1Row[])
    .filter((row) => scenarioRunIds.has(String(row.id ?? "")));
  const scenarioRewards = relevantScenarioRows.map((row) => parseJson<Record<string, unknown>>(row.reward_json, {}));
  const latestScenario = relevantScenarioRows.at(-1);
  const mission = latestScenario ? getScenarioMission(String(latestScenario.scenario_id ?? "")) : null;
  const latestConsequence = String(scenarioAnswerRows.at(-1)?.consequence ?? "");
  const repairCorrect = repairQuestionIds.length > 0 && repairQuestionIds.every((questionId) => (
    eventRows.some((event) => String(event.entity_id ?? "") === questionId && Number(event.correct ?? 0) === 1)
  ));
  const progressNotes = [
    ...(realImprovements.length ? [{ tone: "improved", title: "真正新增的能力證據", detail: realImprovements.join("、") }] : []),
    ...(repairCorrect ? [{ tone: "repaired", title: "本輪已完成立即修復", detail: String(repairPlan.weakness ?? "本輪弱點") + "；仍會等待延遲重測。" }] : []),
    ...(highConfidenceWrong ? [{ tone: "priority", title: "高信心錯誤已優先排回", detail: `${highConfidenceWrong} 題答錯時信心高；下一輪會先用未見情境驗證。` }] : []),
    ...(lowConfidenceCorrect ? [{ tone: "retest", title: "答對但尚未當作穩定", detail: `${lowConfidenceCorrect} 題正確但信心低；會改用不同情境做遷移。` }] : []),
    ...(!realImprovements.length && !repairCorrect ? [{ tone: "honest", title: "這輪沒有虛報精通", detail: "作答、提示與錯因都有保存；等未見題或隔日重測後才會升級證據。" }] : []),
  ];
  return {
    journeyLength: config.journeyLength,
    journeyLengthLabel: config.label,
    scenarioTarget: config.scenarioTarget,
    repairCount: config.repairCount,
    answered: eventRows.length,
    correct: eventRows.filter((row) => Number(row.correct ?? 0) === 1).length,
    wrong: eventRows.filter((row) => Number(row.correct ?? 0) === 0).length,
    scenarioActions: scenarioAnswerRows.length,
    scenarioCorrect: scenarioAnswerRows.filter((row) => Number(row.correct ?? 0) === 1).length,
    novelEvidence,
    highConfidenceWrong,
    lowConfidenceCorrect,
    topErrorCategory,
    realImprovements,
    repairCompleted: repairCorrect,
    progressNotes,
    primaryWeaknessTag,
    primaryWeaknessLabel: primaryWeaknessTag ? getSkillTagLabel(primaryWeaknessTag) : null,
    battleGold,
    scenarioGold: scenarioRewards.reduce((sum, reward) => sum + Number(reward.gold ?? 0), 0),
    affinity: scenarioRewards.reduce((sum, reward) => sum + Number(reward.affinity ?? 0), 0),
    battleCount: (battleRows.results ?? []).length,
    formalUnit: String(session.formal_unit ?? FORMAL_PROGRESS_BASELINE),
    scenarioEvidence: recordedScenarioEvidence,
    story: mission ? {
      title: mission.title,
      kicker: `${mission.kicker} · ${scenarioAnswerRows.length}/${config.scenarioTarget} 節點`,
      line: latestConsequence || mission.description,
      imageSrc: mission.imageSrc,
      imageAlt: mission.imageAlt,
    } : null,
  };
}

async function companionMemoryContext(database: D1Database, userKey: string, companionId: CompanionId) {
  const [journeyCount, lastMission, repaired] = await Promise.all([
    database.prepare("SELECT COUNT(*) AS count FROM journey_sessions WHERE user_key = ?1 AND companion_id = ?2 AND status = 'completed'")
      .bind(userKey, companionId).first<{ count: number }>(),
    database.prepare("SELECT scenario_id FROM scenario_runs WHERE user_key = ?1 AND companion_id = ?2 ORDER BY updated_at DESC LIMIT 1")
      .bind(userKey, companionId).first<{ scenario_id: string }>(),
    database.prepare("SELECT weakness_key, last_consequence FROM scenario_skill_memory WHERE user_key = ?1 AND last_companion_id = ?2 AND repaired > 0 ORDER BY updated_at DESC LIMIT 1")
      .bind(userKey, companionId).first<{ weakness_key: string; last_consequence: string }>(),
  ]);
  const weaknessKey = String(repaired?.weakness_key ?? "") as keyof typeof SCENARIO_WEAKNESS_INFO;
  return {
    previousJourneyCount: Number(journeyCount?.count ?? 0),
    lastMissionTitle: getScenarioMission(lastMission?.scenario_id)?.title ?? null,
    repairedWeakness: SCENARIO_WEAKNESS_INFO[weaknessKey]?.label ?? null,
    lastConsequence: String(repaired?.last_consequence ?? "") || null,
  };
}

async function buildRepairPlan(database: D1Database, userKey: string, session: D1Row) {
  const config = journeyConfiguration(session);
  const startedAt = String(session.started_at ?? "");
  const events = await database.prepare(`SELECT entity_id, skill_tags_json FROM learning_events
      WHERE user_key = ?1 AND event_type = 'question_answered' AND correct = 0 AND created_at >= ?2
      ORDER BY created_at DESC LIMIT 24`)
    .bind(userKey, startedAt)
    .all<D1Row>();
  const journeyQuestionIds = new Set([
    ...parseStringArray(session.queue_json),
    ...scenarioEvidence(session).map((item) => item.questionId),
  ]);
  const wrongRows = ((events.results ?? []) as D1Row[])
    .filter((row) => journeyQuestionIds.has(String(row.entity_id ?? "")));
  if (!wrongRows.length) return null;
  const tagCounts = new Map<string, number>();
  for (const row of wrongRows) for (const tag of parseStringArray(row.skill_tags_json)) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  const primaryTag = [...tagCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  const sourceQuestionId = String(wrongRows.find((row) => !primaryTag || parseStringArray(row.skill_tags_json).includes(primaryTag))?.entity_id ?? "");
  const source = practiceQuestion(sourceQuestionId);
  if (!source) return null;
  const fingerprintRows = await database.prepare("SELECT fingerprint FROM question_fingerprint_evidence WHERE user_key = ?1").bind(userKey).all<D1Row>();
  const seen = new Set((fingerprintRows.results ?? []).map((row) => String(row.fingerprint ?? "")).filter(Boolean));
  const excluded = new Set([...parseStringArray(session.queue_json), sourceQuestionId]);
  const activeNumber = unitNumber(String(session.formal_unit ?? FORMAL_PROGRESS_BASELINE));
  const candidates = [...getUnseenVariantQuestions(seen), ...VARIANT_QUESTIONS].filter((question) => {
    if (excluded.has(question.id) || unitNumber(question.unit) > activeNumber) return false;
    const tags = getQuestionSkillTags(question);
    return primaryTag ? tags.includes(primaryTag) : question.unit === source.unit;
  });
  const questionIds: string[] = [];
  const fingerprints = new Set<string>();
  for (const question of candidates) {
    const fingerprint = question.variant?.fingerprint ?? question.id;
    if (fingerprints.has(fingerprint)) continue;
    fingerprints.add(fingerprint);
    questionIds.push(question.id);
    if (questionIds.length === config.repairCount) break;
  }
  if (questionIds.length < config.repairCount) return null;
  return {
    weakness: primaryTag ? getSkillTagLabel(primaryTag) : source.skill,
    skillTag: primaryTag ?? null,
    sourceQuestionId,
    questionIds,
  };
}

async function basePayload(database: D1Database, userKey: string, localDate: string, supplied?: D1Row | null) {
  const [learning, current, completed] = await Promise.all([
    readLearningSnapshot(database, userKey),
    supplied === undefined ? activeSession(database, userKey) : Promise.resolve(supplied),
    latestCompletedSession(database, userKey, localDate),
  ]);
  return {
    versions: {
      site: SITE_VERSION,
      scenarioContent: SCENARIO_CONTENT_VERSION,
      formalProgress: learning.activeUnit.id,
      journeySchema: JOURNEY_SCHEMA_VERSION,
    },
    formalProgress: {
      unitId: learning.activeUnit.id,
      title: learning.activeUnit.title,
      answered: learning.frontier.activeAnswered,
      total: learning.frontier.activeQuestionCount,
      completedUnits: learning.frontier.completedUnitIds.size,
    },
    abilityMap: learning.abilityMap,
    abilityAtlas: learning.abilityAtlas,
    pendingScenarioRepairs: learning.pendingScenarioRepairs,
    activeScenario: learning.activeScenario,
    session: sessionPayload(current),
    lastCompleted: sessionPayload(completed),
  };
}

async function startJourney(database: D1Database, userKey: string, localDate: string, journeyLength: JourneyLength) {
  const existing = await activeSession(database, userKey);
  if (existing) return existing;
  const learning = await readLearningSnapshot(database, userKey);
  const config = JOURNEY_LENGTHS[journeyLength];
  const id = globalThis.crypto.randomUUID();
  const unseenVariantIds = new Set(getUnseenVariantQuestions(learning.fingerprints).map((question) => question.id));
  const unseenVariants = VARIANT_QUEUE_QUESTIONS.filter((question) => unseenVariantIds.has(question.id));
  const queue = buildAdaptiveDailyQueue([...QUEUE_QUESTIONS, ...unseenVariants], learning.states.map((row) => ({
    question_id: String(row.question_id ?? ""),
    unit: String(row.unit ?? ""),
    last_correct: Number(row.last_correct ?? 0),
    confidence: Number(row.confidence ?? 0),
    wrong_count: Number(row.wrong_count ?? 0),
    next_review_at: String(row.next_review_at ?? ""),
  })), learning.activeUnit.id, {
    limit: config.practiceCount,
    nowMs: Date.now(),
    random: seededRandom(`${id}:${learning.activeUnit.id}`),
    skillStates: learning.skillStates.map((row) => ({
      skill_tag: String(row.skill_tag ?? ""),
      last_rating: Number(row.last_rating ?? 0),
      review_count: Number(row.review_count ?? 0),
      distinct_question_count: Number(row.distinct_question_count ?? 0),
      successful_unseen_count: Number(row.successful_unseen_count ?? 0),
      next_review_at: String(row.next_review_at ?? ""),
    })),
    eligibleTransferUnitIds: UNITS.slice(0, learning.frontier.activeUnitIndex + 1).map((unit) => unit.id),
    reviewSlots: config.reviewSlots,
    freshSlots: config.freshSlots,
    transferSlots: config.transferSlots,
    minimumUnseenCandidates: 5,
  });
  if (queue.length !== config.practiceCount || queue.some((questionId) => !practiceQuestion(questionId))) throw new Error(`目前無法建立完整的${config.label}旅程題單。 `);
  const now = new Date().toISOString();
  await database.batch([
    database.prepare("UPDATE journey_sessions SET status = 'abandoned', updated_at = ?1 WHERE user_key = ?2 AND status = 'active'").bind(now, userKey),
    database.prepare(`INSERT INTO journey_sessions
      (id, user_key, local_date, formal_unit, status, current_step, step_started_at, queue_json, current_index,
       battle_state_json, companion_id, companion_line, repair_plan_json, summary_json, started_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, 'active', 'practice', ?5, ?6, 0, '{}', ?7, '', '{}', ?8, ?5, ?5)`)
      .bind(id, userKey, localDate, learning.activeUnit.id, now, JSON.stringify(queue), learning.companionId, JSON.stringify({ journeyLength, scenarioTarget: config.scenarioTarget, repairCount: config.repairCount })),
    database.prepare(`INSERT INTO learning_events (user_key, event_type, entity_id, unit, metadata_json, local_date, created_at)
      VALUES (?1, 'journey_started', ?2, ?3, ?4, ?5, ?6)`)
      .bind(userKey, id, learning.activeUnit.id, JSON.stringify({ journeyLength, queueLength: queue.length, scenarioTarget: config.scenarioTarget, repairCount: config.repairCount, siteVersion: SITE_VERSION, formalProgressUnchanged: true }), localDate, now),
  ]);
  return database.prepare("SELECT * FROM journey_sessions WHERE id = ?1 AND user_key = ?2").bind(id, userKey).first<D1Row>();
}

async function answeredSince(database: D1Database, userKey: string, since: string) {
  const rows = await database.prepare(`SELECT entity_id FROM learning_events
    WHERE user_key = ?1 AND event_type = 'question_answered' AND created_at >= ?2 ORDER BY created_at ASC`)
    .bind(userKey, since).all<D1Row>();
  return new Set((rows.results ?? []).map((row) => String(row.entity_id ?? "")).filter(Boolean));
}

async function advanceJourney(database: D1Database, userKey: string, session: D1Row) {
  const step = isJourneyStep(session.current_step) ? session.current_step : "practice";
  const config = journeyConfiguration(session);
  const now = new Date().toISOString();
  let nextStep: JourneyStep = step;
  let nextStepStartedAt = now;
  let companionLine = String(session.companion_line ?? "");
  let repairPlan = parseJson<Record<string, unknown>>(session.repair_plan_json, {});
  let summarySource = session;
  let summary = await journeySummary(database, userKey, session);

  if (step === "practice") {
    const queue = parseStringArray(session.queue_json);
    const answered = await answeredSince(database, userKey, String(session.started_at ?? ""));
    if (queue.some((questionId) => !answered.has(questionId))) throw new Error("先完成本輪全部英文節點，才能進入情境行動。 ");
    nextStep = "scenario";
  } else if (step === "scenario") {
    const scenarioAnswers = await database.prepare("SELECT run_id, question_id FROM scenario_answers WHERE user_key = ?1 AND answered_at >= ?2 ORDER BY answered_at ASC LIMIT 8")
      .bind(userKey, String(session.step_started_at ?? "")).all<{ run_id: string; question_id: string }>();
    const answerRows = scenarioAnswers.results ?? [];
    if (!answerRows.length) throw new Error(`先完成 ${config.scenarioTarget} 個情境任務節點，旅伴才會接著回應。 `);
    const existingEvidence = scenarioEvidence(session);
    const currentEvidence = answerRows.map((row) => ({ runId: String(row.run_id ?? ""), questionId: String(row.question_id ?? "") }));
    const nextEvidence = [...existingEvidence, ...currentEvidence].filter((item, index, items) => (
      item.runId && item.questionId && items.findIndex((candidate) => candidate.runId === item.runId && candidate.questionId === item.questionId) === index
    ));
    summarySource = {
      ...session,
      summary_json: JSON.stringify({ ...parseJson<Record<string, unknown>>(session.summary_json, {}), scenarioEvidence: nextEvidence }),
    };
    if (nextEvidence.length < config.scenarioTarget) {
      nextStep = "scenario";
      nextStepStartedAt = String(session.step_started_at ?? now);
    } else {
      const companionId = isCompanionId(session.companion_id) ? session.companion_id : DEFAULT_COMPANION_ID;
      const memory = await companionMemoryContext(database, userKey, companionId);
      companionLine = companionJourneyLine(companionId, String(session.formal_unit ?? FORMAL_PROGRESS_BASELINE), String(summary.primaryWeaknessLabel ?? "") || null, Number(summary.correct ?? 0), Number(summary.answered ?? 0), memory);
      nextStep = "companion";
    }
  } else if (step === "companion") {
    const builtRepair = await buildRepairPlan(database, userKey, session);
    repairPlan = builtRepair ?? {};
    nextStep = builtRepair ? "repair" : "settlement";
  } else if (step === "repair") {
    const questionIds = Array.isArray(repairPlan.questionIds) ? repairPlan.questionIds.filter((value): value is string => typeof value === "string") : [];
    const answered = await answeredSince(database, userKey, String(session.step_started_at ?? ""));
    if (questionIds.length && questionIds.some((questionId) => !answered.has(questionId))) throw new Error(`先完成 ${questionIds.length} 題新情境修復，再進入旅程結算。 `);
    nextStep = "settlement";
  } else {
    throw new Error("本輪已在結算頁，請完成結算或開始下一輪。 ");
  }

  summary = await journeySummary(database, userKey, summarySource);
  await database.prepare(`UPDATE journey_sessions SET current_step = ?1, step_started_at = ?2, companion_line = ?3,
    repair_plan_json = ?4, summary_json = ?5, updated_at = ?2 WHERE id = ?6 AND user_key = ?7 AND status = 'active'`)
    .bind(nextStep, nextStepStartedAt, companionLine, JSON.stringify(repairPlan), JSON.stringify(summary), String(session.id ?? ""), userKey)
    .run();
  return database.prepare("SELECT * FROM journey_sessions WHERE id = ?1 AND user_key = ?2").bind(String(session.id ?? ""), userKey).first<D1Row>();
}

async function completeJourney(database: D1Database, userKey: string, session: D1Row) {
  if (String(session.current_step ?? "") !== "settlement") throw new Error("旅程還沒走到結算。 ");
  const now = new Date().toISOString();
  const summary = await journeySummary(database, userKey, session);
  await database.batch([
    database.prepare(`UPDATE journey_sessions SET status = 'completed', summary_json = ?1, updated_at = ?2, completed_at = ?2
      WHERE id = ?3 AND user_key = ?4 AND status = 'active'`)
      .bind(JSON.stringify(summary), now, String(session.id ?? ""), userKey),
    database.prepare(`INSERT INTO learning_events (user_key, event_type, entity_id, unit, metadata_json, local_date, created_at)
      VALUES (?1, 'journey_completed', ?2, ?3, ?4, ?5, ?6)`)
      .bind(userKey, String(session.id ?? ""), String(session.formal_unit ?? FORMAL_PROGRESS_BASELINE), JSON.stringify({ ...summary, siteVersion: SITE_VERSION, formalProgressUnchanged: true }), String(session.local_date ?? ""), now),
  ]);
  return database.prepare("SELECT * FROM journey_sessions WHERE id = ?1 AND user_key = ?2").bind(String(session.id ?? ""), userKey).first<D1Row>();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "旅程同步失敗。";
}

export async function GET(request: Request) {
  try {
    const { database, user } = await prepareDatabase();
    const url = new URL(request.url);
    const localDate = isDate(url.searchParams.get("date"))
      ? url.searchParams.get("date")!
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
    return Response.json({ user: { name: user.name, synced: user.key !== "demo-local" }, ...(await basePayload(database, user.key, localDate)) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: "start" | "checkpoint" | "advance" | "complete";
      localDate?: string;
      journeyId?: string;
      journeyLength?: JourneyLength;
      currentIndex?: number;
      battleState?: Record<string, unknown>;
    };
    const { database, user } = await prepareDatabase();
    const localDate = isDate(payload.localDate)
      ? payload.localDate
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
    if (payload.action === "start") {
      const created = await startJourney(database, user.key, localDate, isJourneyLength(payload.journeyLength) ? payload.journeyLength : "standard");
      return Response.json(await basePayload(database, user.key, localDate, created));
    }
    const session = await activeSession(database, user.key);
    if (!session || !payload.journeyId || String(session.id ?? "") !== payload.journeyId) {
      return Response.json({ error: "找不到這次進行中的旅程，請重新整理。" }, { status: 409 });
    }
    if (payload.action === "checkpoint") {
      if (String(session.current_step ?? "") !== "practice") {
        return Response.json(await basePayload(database, user.key, localDate, session));
      }
      const queue = parseStringArray(session.queue_json);
      const currentIndex = Math.max(0, Math.min(queue.length, Math.trunc(Number(payload.currentIndex ?? 0))));
      const battleState = normalizeBattleState(payload.battleState);
      const now = new Date().toISOString();
      await database.prepare("UPDATE journey_sessions SET current_index = ?1, battle_state_json = ?2, updated_at = ?3 WHERE id = ?4 AND user_key = ?5")
        .bind(currentIndex, JSON.stringify(battleState), now, payload.journeyId, user.key).run();
      const updated = await database.prepare("SELECT * FROM journey_sessions WHERE id = ?1 AND user_key = ?2").bind(payload.journeyId, user.key).first<D1Row>();
      return Response.json(await basePayload(database, user.key, localDate, updated));
    }
    if (payload.action === "advance") {
      const updated = await advanceJourney(database, user.key, session);
      return Response.json(await basePayload(database, user.key, localDate, updated));
    }
    if (payload.action === "complete") {
      const completed = await completeJourney(database, user.key, session);
      return Response.json(await basePayload(database, user.key, localDate, null).then((result) => ({ ...result, lastCompleted: sessionPayload(completed) })));
    }
    return Response.json({ error: "未知的旅程操作。" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
