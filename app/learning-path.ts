export type LearningUnitLike = { id: string };
export type LearningQuestionLike = {
  id: string;
  unit: string;
  skillTags?: readonly string[];
  role?: "core" | "transfer";
  fingerprint?: string;
};
export type LearningStateLike = {
  question_id: string;
  unit: string;
  last_correct?: number | null;
  confidence?: number | null;
  wrong_count?: number | null;
  next_review_at?: string | null;
};
export type SkillScheduleLike = {
  skill_tag: string;
  last_rating?: number | null;
  review_count?: number | null;
  distinct_question_count?: number | null;
  successful_unseen_count?: number | null;
  next_review_at?: string | null;
};

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isCurrentWeak(state: LearningStateLike) {
  return numeric(state.last_correct, 1) === 0 || numeric(state.confidence, 3) <= 1;
}

function riskScore(state: LearningStateLike) {
  const correct = numeric(state.last_correct, 1);
  const confidence = numeric(state.confidence, 3);
  const wrongCount = numeric(state.wrong_count, 0);
  return (correct === 0 && confidence >= 3 ? 100 : 0)
    + (wrongCount >= 2 ? 50 + Math.min(wrongCount, 10) : 0)
    + (correct === 0 ? 30 : 0)
    + (confidence <= 1 ? 20 : 0);
}

function shuffleWith<T>(items: readonly T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function shuffleUniqueSemantics<T extends LearningQuestionLike>(items: readonly T[], random: () => number) {
  const seen = new Set<string>();
  return shuffleWith(items, random).filter((question) => {
    const semanticKey = question.fingerprint ?? question.id;
    if (seen.has(semanticKey)) return false;
    seen.add(semanticKey);
    return true;
  });
}

function isDue(value: unknown, nowMs: number) {
  const dueAt = Date.parse(String(value ?? ""));
  return Number.isFinite(dueAt) && dueAt <= nowMs;
}

/**
 * The formal curriculum position advances sequentially from the configured
 * baseline. Visiting or answering a later unit never teleports the frontier.
 * A unit is "covered" when every core practice item has one saved state; this
 * is deliberately different from mastery, which is tracked by skill evidence.
 * Gate units (U35/U37/U39) additionally require a recorded full mock exam.
 */
export function deriveLearningFrontier(
  units: readonly LearningUnitLike[],
  questions: readonly LearningQuestionLike[],
  states: readonly LearningStateLike[],
  baselineUnitId: string,
  options: { gateUnitIds?: readonly string[]; passedGateUnitIds?: readonly string[] } = {},
) {
  if (!units.length) {
    return {
      activeUnitIndex: -1,
      activeUnitId: "",
      activeAnswered: 0,
      activeQuestionCount: 0,
      startedUnitIds: new Set<string>(),
      completedUnitIds: new Set<string>(),
      waitingForGate: false,
    };
  }

  const unitIndex = new Map(units.map((unit, index) => [unit.id, index]));
  const knownQuestions = new Map(questions.map((question) => [question.id, question]));
  const stateIds = new Set<string>();
  const startedUnitIds = new Set<string>();
  const completedUnitIds = new Set<string>();
  const gateUnits = new Set(options.gateUnitIds ?? []);
  const passedGates = new Set(options.passedGateUnitIds ?? []);

  for (const state of states) {
    const question = knownQuestions.get(state.question_id);
    if (!question || question.unit !== state.unit || !unitIndex.has(state.unit)) continue;
    stateIds.add(state.question_id);
    startedUnitIds.add(state.unit);
  }

  const baselineIndex = unitIndex.get(baselineUnitId) ?? 0;
  let activeUnitIndex = baselineIndex;
  while (activeUnitIndex < units.length - 1) {
    const unitId = units[activeUnitIndex].id;
    const unitQuestions = questions.filter((question) => question.unit === unitId && question.role !== "transfer");
    const covered = unitQuestions.length > 0 && unitQuestions.every((question) => stateIds.has(question.id));
    if (!covered) break;
    if (gateUnits.has(unitId) && !passedGates.has(unitId)) break;
    completedUnitIds.add(unitId);
    activeUnitIndex += 1;
  }

  const activeUnitId = units[activeUnitIndex].id;
  const activeQuestions = questions.filter((question) => question.unit === activeUnitId && question.role !== "transfer");
  const activeAnswered = activeQuestions.filter((question) => stateIds.has(question.id)).length;
  const activeCovered = activeQuestions.length > 0 && activeAnswered === activeQuestions.length;
  startedUnitIds.add(activeUnitId);

  return {
    activeUnitIndex,
    activeUnitId,
    activeAnswered,
    activeQuestionCount: activeQuestions.length,
    startedUnitIds,
    completedUnitIds,
    waitingForGate: activeCovered && gateUnits.has(activeUnitId) && !passedGates.has(activeUnitId),
  };
}

/**
 * A six-question adaptive round reserves capacity for forward motion:
 *   3 due reviews + 2 unseen current-unit items + 1 unseen transfer check.
 * Empty categories yield their slots to the remaining pools. A transfer check
 * preferentially targets a due skill and never reaches beyond the learner's
 * formal curriculum frontier.
 */
export function buildAdaptiveDailyQueue(
  questions: readonly LearningQuestionLike[],
  states: readonly LearningStateLike[],
  activeUnitId: string,
  options: {
    limit?: number;
    nowMs?: number;
    random?: () => number;
    skillStates?: readonly SkillScheduleLike[];
    eligibleTransferUnitIds?: readonly string[];
    reviewSlots?: number;
    freshSlots?: number;
    transferSlots?: number;
    minimumUnseenCandidates?: number;
  } = {},
) {
  const limit = Math.max(1, Math.trunc(options.limit ?? 6));
  const nowMs = options.nowMs ?? Date.now();
  const random = options.random ?? Math.random;
  const reviewSlots = Math.max(0, Math.min(limit, Math.trunc(options.reviewSlots ?? Math.ceil(limit / 2))));
  const freshSlots = Math.max(0, Math.min(limit, Math.trunc(options.freshSlots ?? (limit >= 6 ? 2 : 1))));
  const transferSlots = Math.max(0, Math.min(limit, Math.trunc(options.transferSlots ?? (limit >= 6 ? 1 : 0))));
  const minimumUnseenCandidates = Math.max(1, Math.trunc(options.minimumUnseenCandidates ?? 5));
  const knownQuestionIds = new Set(questions.map((question) => question.id));
  const stateById = new Map(states.filter((state) => knownQuestionIds.has(state.question_id)).map((state) => [state.question_id, state]));
  const questionById = new Map(questions.map((question) => [question.id, question]));

  const dueStates = [...stateById.values()].filter((state) => isDue(state.next_review_at, nowMs));
  // Confidence is evidence, not decoration. A confidently wrong answer is
  // allowed to interrupt the due queue, while a correct answer with very low
  // confidence is routed to a different, unseen context before we trust it.
  const confidenceRiskStates = [...stateById.values()]
    .filter((state) => (
      numeric(state.last_correct, 1) === 0 && numeric(state.confidence, 0) >= 3
    ) || (
      numeric(state.last_correct, 1) === 1 && numeric(state.confidence, 3) <= 1
    ))
    .sort((a, b) => riskScore(b) - riskScore(a));
  const dueWeak = dueStates
    .filter(isCurrentWeak)
    .sort((a, b) => riskScore(b) - riskScore(a) || Date.parse(String(a.next_review_at)) - Date.parse(String(b.next_review_at)));
  const dueStable = dueStates
    .filter((state) => !isCurrentWeak(state))
    .sort((a, b) => Date.parse(String(a.next_review_at)) - Date.parse(String(b.next_review_at)));
  const dueReviewIds = [...confidenceRiskStates, ...dueWeak, ...dueStable]
    .map((state) => state.question_id)
    .filter((id, index, ids) => ids.indexOf(id) === index);

  const currentFresh = shuffleWith(
    questions
      .filter((question) => question.unit === activeUnitId && question.role !== "transfer" && !stateById.has(question.id))
      .map((question) => question.id),
    random,
  );

  const eligibleUnits = new Set(options.eligibleTransferUnitIds ?? [activeUnitId]);
  const dueSkillTags = (options.skillStates ?? [])
    .filter((state) => isDue(state.next_review_at, nowMs))
    .sort((a, b) => numeric(a.last_rating, 3) - numeric(b.last_rating, 3)
      || numeric(a.successful_unseen_count) - numeric(b.successful_unseen_count)
      || Date.parse(String(a.next_review_at)) - Date.parse(String(b.next_review_at)))
    .map((state) => state.skill_tag);
  const riskQuestionSkillTags = confidenceRiskStates.flatMap((state) => questionById.get(state.question_id)?.skillTags ?? []);
  const dueQuestionSkillTags = dueReviewIds.flatMap((id) => questionById.get(id)?.skillTags ?? []);
  const reviewTargetTags = [...new Set([...riskQuestionSkillTags, ...dueSkillTags, ...dueQuestionSkillTags])];

  const unseenEligible = shuffleUniqueSemantics(
    questions.filter((question) => eligibleUnits.has(question.unit) && !stateById.has(question.id)),
    random,
  );
  const reservedFresh = new Set(currentFresh.slice(0, freshSlots));
  const skillReviewIds: string[] = [];
  const reservedSkillQuestions = new Set<string>();
  for (const tag of reviewTargetTags) {
    const allCandidates = unseenEligible.filter((question) => !reservedFresh.has(question.id) && question.skillTags?.includes(tag));
    const transferCandidates = allCandidates.filter((question) => question.role === "transfer");
    const sourcePool = transferCandidates.length >= minimumUnseenCandidates ? transferCandidates : allCandidates;
    if (sourcePool.length < minimumUnseenCandidates) continue;
    // A review is promoted to fresh skill evidence only after at least five
    // genuinely unseen candidates exist. Sampling happens before selection so
    // the learner is not repeatedly handed the first templated surface form.
    const candidateWindow = shuffleWith(sourcePool, random).slice(0, minimumUnseenCandidates);
    const candidate = candidateWindow[Math.floor(random() * candidateWindow.length)]
      ?? candidateWindow.find((question) => !reservedSkillQuestions.has(question.id));
    if (!candidate) continue;
    if (reservedSkillQuestions.has(candidate.id)) {
      const alternative = candidateWindow.find((question) => !reservedSkillQuestions.has(question.id));
      if (!alternative) continue;
      reservedSkillQuestions.add(alternative.id);
      skillReviewIds.push(alternative.id);
      continue;
    }
    reservedSkillQuestions.add(candidate.id);
    skillReviewIds.push(candidate.id);
  }
  // Skill scheduling is primary. Question-level due dates remain only as a
  // compatibility fallback when there are not enough unseen skill checks.
  const reviewIds = [...skillReviewIds, ...dueReviewIds];
  const transferPool = unseenEligible.length >= minimumUnseenCandidates ? unseenEligible : [];
  const targetedTransfer = shuffleWith(
    transferPool.filter((question) => question.skillTags?.some((tag) => reviewTargetTags.includes(tag))),
    random,
  );
  const explicitTransfer = shuffleWith(transferPool.filter((question) => question.role === "transfer"), random);
  const generalTransfer = shuffleWith(transferPool.filter((question) => question.role !== "transfer"), random);

  const queue: string[] = [];
  const seen = new Set<string>();
  const add = (id: string | undefined) => {
    if (!id || seen.has(id) || !questionById.has(id) || queue.length >= limit) return false;
    seen.add(id);
    queue.push(id);
    return true;
  };
  const take = (pool: readonly string[], count: number) => {
    let added = 0;
    for (const id of pool) {
      if (added >= count || queue.length >= limit) break;
      if (add(id)) added += 1;
    }
  };

  take(reviewIds, reviewSlots);
  take(currentFresh, freshSlots);
  const transferIds = [...targetedTransfer, ...explicitTransfer, ...generalTransfer].map((question) => question.id);
  take(transferIds, transferSlots);

  // If a category is empty, use its vacant slots without letting reviews starve
  // all new material when unseen current-unit content exists.
  if (queue.length < limit) take(currentFresh, limit - queue.length);
  if (queue.length < limit) take(reviewIds, limit - queue.length);
  if (queue.length < limit) take(transferIds, limit - queue.length);
  return queue;
}

/**
 * Region bosses are optional game challenges. They sample only unseen transfer
 * material from already eligible units and try to spread the ten questions
 * across different skills. The caller remains responsible for excluding
 * previously exposed semantic fingerprints before passing the pool here.
 */
export function buildBossQueue(
  questions: readonly LearningQuestionLike[],
  states: readonly LearningStateLike[],
  eligibleUnitIds: readonly string[],
  options: { limit?: number; random?: () => number } = {},
) {
  const limit = Math.max(1, Math.trunc(options.limit ?? 10));
  const random = options.random ?? Math.random;
  const eligibleUnits = new Set(eligibleUnitIds);
  const seenIds = new Set(states.map((state) => state.question_id));
  const candidates = shuffleUniqueSemantics(
    questions.filter((question) => question.role === "transfer" && eligibleUnits.has(question.unit) && !seenIds.has(question.id)),
    random,
  );
  if (candidates.length < limit) return [];

  const queue: string[] = [];
  const used = new Set<string>();
  const tags = [...new Set(candidates.flatMap((question) => question.skillTags ?? []))];
  const tagOrder = shuffleWith(tags, random).sort((a, b) => {
    const weight = (tag: string) => tag.startsWith("grammar.") ? 0
      : tag === "listening.comprehension" || tag === "reading.comprehension" ? 1
        : tag === "production.short_output" ? 2
          : 3;
    return weight(a) - weight(b);
  });
  for (const tag of tagOrder) {
    if (queue.length >= limit) break;
    const candidate = candidates.find((question) => !used.has(question.id) && question.skillTags?.includes(tag));
    if (!candidate) continue;
    used.add(candidate.id);
    queue.push(candidate.id);
  }
  for (const candidate of candidates) {
    if (queue.length >= limit) break;
    if (used.has(candidate.id)) continue;
    used.add(candidate.id);
    queue.push(candidate.id);
  }
  return queue;
}
