import assert from "node:assert/strict";
import test from "node:test";
import { buildAdaptiveDailyQueue, buildBossQueue, deriveLearningFrontier } from "../app/learning-path.ts";
import { QUESTIONS, UNITS } from "../app/content.ts";

const units = ["U01", "U02", "U03", "U04", "U05"].map((id) => ({ id }));
const questions = units.flatMap((unit) => [1, 2].map((number) => ({ id: `${unit.id}-Q${number}`, unit: unit.id })));
const state = (questionId, unit, overrides = {}) => ({
  question_id: questionId,
  unit,
  last_correct: 1,
  confidence: 2,
  wrong_count: 0,
  next_review_at: "2099-01-01T00:00:00.000Z",
  ...overrides,
});

test("starts at U02 without requiring a missing U01 history", () => {
  const result = deriveLearningFrontier(units, questions, [], "U02");
  assert.equal(result.activeUnitId, "U02");
});

test("advances past U02 once U02 has one saved answer for every item even if U01 is incomplete", () => {
  const states = [state("U02-Q1", "U02"), state("U02-Q2", "U02")];
  const result = deriveLearningFrontier(units, questions, states, "U02");
  assert.equal(result.activeUnitId, "U03");
});

test("the real U02 frontier cannot advance until its new G03 and at/on/in core targets are covered", () => {
  const u02Core = QUESTIONS.filter((question) => question.unit === "U02" && question.role !== "transfer");
  const covered = (excludedId) => u02Core
    .filter((question) => question.id !== excludedId)
    .map((question) => state(question.id, "U02"));
  assert.equal(deriveLearningFrontier(UNITS, QUESTIONS, covered("U02-Q08"), "U02").activeUnitId, "U02");
  assert.equal(deriveLearningFrontier(UNITS, QUESTIONS, covered("U02-Q09"), "U02").activeUnitId, "U02");
  assert.equal(deriveLearningFrontier(UNITS, QUESTIONS, covered(undefined), "U02").activeUnitId, "U03");
});

test("later manual answers never teleport the formal frontier", () => {
  const states = [state("U05-Q1", "U05"), state("U03-Q1", "U03")];
  const result = deriveLearningFrontier(units, questions, states, "U02");
  assert.equal(result.activeUnitId, "U02");
});

test("after U02 coverage, a stray future answer still advances only to U03", () => {
  const states = [
    state("U02-Q1", "U02"),
    state("U02-Q2", "U02"),
    state("U05-Q1", "U05"),
  ];
  const result = deriveLearningFrontier(units, questions, states, "U02");
  assert.equal(result.activeUnitId, "U03");
});

test("a six-item round reserves 3 review, 2 fresh, and 1 unseen skill transfer", () => {
  const now = Date.parse("2026-08-07T04:00:00.000Z");
  const queueQuestions = [
    { id: "U01-OLD", unit: "U01", skillTags: ["legacy"] },
    { id: "U02-S1", unit: "U02", skillTags: ["G02"] },
    { id: "U02-X1", unit: "U02", skillTags: ["G08"], role: "transfer" },
    { id: "U03-S1", unit: "U03", skillTags: ["G03"] },
    { id: "U04-S1", unit: "U04", skillTags: ["G04"] },
    { id: "U05-N1", unit: "U05", skillTags: ["G05"] },
    { id: "U05-N2", unit: "U05", skillTags: ["G06"] },
    { id: "U05-N3", unit: "U05", skillTags: ["G07"] },
  ];
  const states = [
    state("U01-OLD", "U01", { last_correct: 0, confidence: 3, wrong_count: 2, next_review_at: "2026-08-07T03:00:00.000Z" }),
  ];
  const queue = buildAdaptiveDailyQueue(queueQuestions, states, "U05", {
    limit: 6,
    nowMs: now,
    random: () => 0.5,
    eligibleTransferUnitIds: ["U02", "U03", "U04", "U05"],
    skillStates: ["G02", "G03", "G04"].map((skill_tag) => ({ skill_tag, next_review_at: "2026-08-07T00:00:00.000Z", last_rating: 2 })),
    minimumUnseenCandidates: 1,
  });
  assert.equal(queue.length, 6);
  assert.deepEqual(new Set(queue.slice(0, 3)), new Set(["U02-S1", "U03-S1", "U04-S1"]));
  assert.equal(queue.slice(3, 5).filter((id) => id.startsWith("U05-N")).length, 2);
  assert.equal(queue[5], "U02-X1");
  assert.ok(!queue.includes("U01-OLD"), "legacy question FSRS must not outrank available unseen skill checks");
});

test("daily queue does not backfill unseen questions from old units", () => {
  const queue = buildAdaptiveDailyQueue(questions, [], "U03", { limit: 6, random: () => 0.5 });
  assert.deepEqual(new Set(queue), new Set(["U03-Q1", "U03-Q2"]));
});

test("a full mock is required to pass U35 even after all core questions are covered", () => {
  const gateUnits = ["U35", "U36"].map((id) => ({ id }));
  const gateQuestions = [1, 2].map((number) => ({ id: `U35-Q${number}`, unit: "U35" }));
  const states = gateQuestions.map((question) => state(question.id, "U35"));
  const blocked = deriveLearningFrontier(gateUnits, gateQuestions, states, "U35", { gateUnitIds: ["U35"] });
  assert.equal(blocked.activeUnitId, "U35");
  assert.equal(blocked.waitingForGate, true);

  const passed = deriveLearningFrontier(gateUnits, gateQuestions, states, "U35", {
    gateUnitIds: ["U35"],
    passedGateUnitIds: ["U35"],
  });
  assert.equal(passed.activeUnitId, "U36");
});

test("a due skill needs at least five unseen candidates before replacing an old memorized item", () => {
  const now = Date.parse("2026-08-07T04:00:00.000Z");
  const dueState = state("OLD", "U02", { next_review_at: "2026-08-07T03:00:00.000Z" });
  const old = { id: "OLD", unit: "U02", skillTags: ["G02"] };
  const four = Array.from({ length: 4 }, (_, index) => ({ id: `V${index}`, unit: "U02", skillTags: ["G02"], role: "transfer" }));
  const withFour = buildAdaptiveDailyQueue([old, ...four], [dueState], "U02", {
    limit: 1,
    nowMs: now,
    random: () => 0.2,
    eligibleTransferUnitIds: ["U02"],
    reviewSlots: 1,
    freshSlots: 0,
    transferSlots: 0,
  });
  assert.deepEqual(withFour, ["OLD"]);

  const five = [...four, { id: "V4", unit: "U02", skillTags: ["G02"], role: "transfer" }];
  const withFive = buildAdaptiveDailyQueue([old, ...five], [dueState], "U02", {
    limit: 1,
    nowMs: now,
    random: () => 0.2,
    eligibleTransferUnitIds: ["U02"],
    reviewSlots: 1,
    freshSlots: 0,
    transferSlots: 0,
  });
  assert.notEqual(withFive[0], "OLD");
  assert.ok(withFive[0].startsWith("V"));
});

test("a non-due low-confidence correct answer is migrated to an unseen context", () => {
  const source = { id: "SOURCE", unit: "U02", skillTags: ["G02"] };
  const variants = Array.from({ length: 5 }, (_, index) => ({ id: `LC${index}`, unit: "U02", skillTags: ["G02"], role: "transfer", fingerprint: `low-confidence-${index}` }));
  const queue = buildAdaptiveDailyQueue([source, ...variants], [state("SOURCE", "U02", {
    last_correct: 1,
    confidence: 1,
    next_review_at: "2099-01-01T00:00:00.000Z",
  })], "U02", {
    limit: 1,
    nowMs: Date.parse("2026-08-09T00:00:00.000Z"),
    random: () => 0.2,
    eligibleTransferUnitIds: ["U02"],
    reviewSlots: 1,
    freshSlots: 0,
    transferSlots: 0,
  });
  assert.equal(queue.length, 1);
  assert.match(queue[0], /^LC/);
});

test("boss queue contains ten unseen transfer items and spreads skill tags before filling", () => {
  const bossQuestions = Array.from({ length: 15 }, (_, index) => ({
    id: `B${index}`,
    unit: index < 8 ? "U01" : "U02",
    role: "transfer",
    skillTags: [`skill-${index % 6}`],
  }));
  const queue = buildBossQueue(bossQuestions, [], ["U01", "U02"], { limit: 10, random: () => 0.4 });
  assert.equal(queue.length, 10);
  assert.equal(new Set(queue).size, 10);
  const represented = new Set(queue.map((id) => bossQuestions.find((question) => question.id === id).skillTags[0]));
  assert.ok(represented.size >= 6);
});

test("adaptive and boss queues never show two surface forms with the same semantic fingerprint", () => {
  const semanticVariants = Array.from({ length: 12 }, (_, index) => ({
    id: `S${index}`,
    unit: "U02",
    role: "transfer",
    fingerprint: index < 4 ? "same-meaning" : `meaning-${index}`,
    skillTags: ["G02"],
  }));
  const adaptive = buildAdaptiveDailyQueue(semanticVariants, [], "U02", {
    limit: 6,
    random: () => 0.4,
    eligibleTransferUnitIds: ["U02"],
    reviewSlots: 0,
    freshSlots: 0,
    transferSlots: 6,
  });
  const fingerprints = adaptive.map((id) => semanticVariants.find((question) => question.id === id).fingerprint);
  assert.equal(new Set(fingerprints).size, fingerprints.length);

  const boss = buildBossQueue(semanticVariants, [], ["U02"], { limit: 6, random: () => 0.4 });
  const bossFingerprints = boss.map((id) => semanticVariants.find((question) => question.id === id).fingerprint);
  assert.equal(new Set(bossFingerprints).size, bossFingerprints.length);
});
