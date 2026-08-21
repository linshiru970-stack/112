import assert from "node:assert/strict";
import test from "node:test";
import { buildAbilityAtlas } from "../app/ability-atlas.ts";
import { QUESTIONS, getQuestionSkillTags } from "../app/content.ts";

function strictEvent(question, date, fingerprint) {
  return {
    entity_id: question.id,
    unit: question.unit,
    answer: question.answerId ?? question.referenceAnswer ?? "answer",
    correct: 1,
    confidence: 3,
    replay_count: 0,
    skill_tags_json: JSON.stringify(getQuestionSkillTags(question)),
    metadata_json: JSON.stringify({ strictEvidenceEligible: true, novelEvidence: true, fingerprint }),
    local_date: date,
    created_at: `${date}T08:00:00.000Z`,
  };
}

test("v27 atlas exposes grammar, 480 vocabulary concepts, listening, reading and TOEIC Parts", () => {
  const atlas = buildAbilityAtlas({
    activeUnitId: "U02",
    skillStates: [],
    events: [],
    vocabularyStates: [],
    vocabularyAttempts: [],
    nowMs: Date.parse("2026-08-09T00:00:00.000Z"),
  });
  const counts = atlas.reduce((map, item) => map.set(item.domain, (map.get(item.domain) ?? 0) + 1), new Map());
  assert.equal(counts.get("grammar"), 25);
  assert.equal(counts.get("vocabulary"), 480);
  assert.equal(counts.get("listening"), 5);
  assert.equal(counts.get("reading"), 5);
  assert.equal(counts.get("part"), 7);
  assert.equal(atlas.find((item) => item.id === "P1")?.status, "locked");
});

test("future Part exposure remains preview evidence and never unlocks formal U02 progress", () => {
  const previewQuestion = QUESTIONS.find((question) => question.unit === "U17");
  assert.ok(previewQuestion);
  const atlas = buildAbilityAtlas({
    activeUnitId: "U02",
    skillStates: [],
    events: [strictEvent(previewQuestion, "2026-08-09", "future-part-preview")],
    vocabularyStates: [],
    vocabularyAttempts: [],
  });
  const partOne = atlas.find((item) => item.id === "P1");
  assert.equal(partOne?.status, "locked");
  assert.ok((partOne?.previewEvidence ?? 0) >= 1);
  assert.match(partOne?.reason ?? "", /提前接觸|不會解鎖/);
});

test("stable evidence needs separate contexts and separate dates", () => {
  const questions = QUESTIONS.filter((question) => getQuestionSkillTags(question).includes("grammar.present_simple_do_does")).slice(0, 2);
  assert.equal(questions.length, 2);
  const base = {
    activeUnitId: "U02",
    skillStates: [],
    vocabularyStates: [],
    vocabularyAttempts: [],
  };
  const sameDay = buildAbilityAtlas({
    ...base,
    events: [strictEvent(questions[0], "2026-08-09", "context-a"), strictEvent(questions[1], "2026-08-09", "context-b")],
  }).find((item) => item.id === "G02");
  assert.equal(sameDay?.status, "retest");
  const delayed = buildAbilityAtlas({
    ...base,
    events: [strictEvent(questions[0], "2026-08-08", "context-a"), strictEvent(questions[1], "2026-08-09", "context-b")],
  }).find((item) => item.id === "G02");
  assert.equal(delayed?.status, "stable");
  assert.equal(delayed?.evidenceLevel, 6);
});
