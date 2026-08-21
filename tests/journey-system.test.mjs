import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildAbilityMap, companionJourneyLine, JOURNEY_LENGTHS, JOURNEY_STEPS } from "../app/journey-system.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("v27 keeps the U02 ability frontier explicit instead of unlocking future grammar from previews", () => {
  const map = buildAbilityMap("U02", [], [], Date.parse("2026-08-09T00:00:00Z"));
  const byId = new Map(map.map((item) => [item.id, item]));
  for (const id of ["G02", "G03", "G05", "G18"]) assert.equal(byId.get(id)?.status, "current", `${id} should be active in U02`);
  for (const id of ["G04", "G06", "G07", "G09", "G25"]) assert.equal(byId.get(id)?.status, "locked", `${id} must stay locked before its formal unit`);
  assert.equal(byId.get("G01")?.status, "taught");
  assert.equal(byId.get("G08")?.status, "taught");
});

test("ability status separates weak, due, delayed retest, and stable evidence", () => {
  const now = Date.parse("2026-08-09T00:00:00Z");
  const map = buildAbilityMap("U16", [
    { skillTag: "grammar.present_simple_do_does", validated: true, successfulUnseenCount: 2, nextReviewAt: "2026-08-20T00:00:00Z" },
    { skillTag: "grammar.subject_verb_agreement", successfulUnseenCount: 1, nextReviewAt: "2026-08-20T00:00:00Z" },
    { skillTag: "grammar.progressive_aspect", successfulUnseenCount: 0, nextReviewAt: "2026-08-01T00:00:00Z" },
  ], [{ tag: "grammar.present_simple_do_does", currentWeak: 1 }], now);
  const byId = new Map(map.map((item) => [item.id, item.status]));
  assert.equal(byId.get("G02"), "weak", "current weakness must override an old stable flag");
  assert.equal(byId.get("G03"), "retest");
  assert.equal(byId.get("G05"), "due");
  const stable = buildAbilityMap("U16", [{ skillTag: "grammar.present_simple_do_does", validated: true, successfulUnseenCount: 2 }], [], now);
  assert.equal(stable.find((item) => item.id === "G02")?.status, "stable");
  const dueStable = buildAbilityMap("U16", [{ skillTag: "grammar.present_simple_do_does", validated: true, successfulUnseenCount: 3, nextReviewAt: "2026-08-01T00:00:00Z" }], [], now);
  assert.equal(dueStable.find((item) => item.id === "G02")?.status, "due", "a stable skill becomes due when its scheduled retest arrives");
});

test("journey has five ordered phases and companion responses remain character-specific", () => {
  assert.deepEqual(JOURNEY_STEPS, ["practice", "scenario", "companion", "repair", "settlement"]);
  const lines = ["rinka", "sena", "yori"].map((id) => companionJourneyLine(id, "U02", "Does 問句", 5, 6));
  assert.equal(new Set(lines).size, 3);
  assert.ok(lines.every((line) => line.includes("U02") && line.includes("Does 問句")));
});

test("v27 offers short, standard and full journeys without changing the formal unit", () => {
  assert.deepEqual(Object.keys(JOURNEY_LENGTHS), ["short", "standard", "full"]);
  assert.deepEqual([JOURNEY_LENGTHS.short.practiceCount, JOURNEY_LENGTHS.standard.practiceCount, JOURNEY_LENGTHS.full.practiceCount], [3, 6, 10]);
  assert.deepEqual([JOURNEY_LENGTHS.short.scenarioTarget, JOURNEY_LENGTHS.standard.scenarioTarget, JOURNEY_LENGTHS.full.scenarioTarget], [1, 1, 2]);
  assert.equal(JOURNEY_LENGTHS.standard.reviewSlots + JOURNEY_LENGTHS.standard.freshSlots + JOURNEY_LENGTHS.standard.transferSlots, 6);
});

test("journey companion lines recall completed missions and repaired weaknesses", () => {
  const line = companionJourneyLine("sena", "U02", "問句功能", 4, 6, {
    previousJourneyCount: 2,
    lastMissionTitle: "07:20 的失序列車",
    repairedWeakness: "does 後動詞原形",
  });
  assert.match(line, /07:20 的失序列車/);
  assert.match(line, /does 後動詞原形/);
  assert.match(line, /U02/);
});

test("v27 journey state is server-backed, resumable, verified, and ends in one settlement", () => {
  const api = read("app/api/journey/route.ts");
  const store = read("app/journey-store.ts");
  const client = read("app/practice-client.tsx");
  const command = read("app/journey-command-center.tsx");
  assert.match(store, /CREATE TABLE IF NOT EXISTS journey_sessions/);
  assert.match(store, /battle_state_json/);
  assert.match(api, /action === "checkpoint"/);
  assert.match(api, /queue\.some\(\(questionId\) => !answered\.has\(questionId\)\)/);
  assert.match(api, /SELECT run_id, question_id FROM scenario_answers/);
  assert.match(api, /battle_id = \?2/);
  assert.match(api, /scenarioEvidence/);
  assert.match(api, /journeyLength/);
  assert.match(api, /abilityAtlas/);
  assert.match(api, /progressNotes/);
  assert.match(api, /current_step = \?1/);
  assert.match(api, /status = 'completed'/);
  assert.match(client, /restoreJourneyPractice/);
  assert.match(client, /saveJourneyCheckpoint/);
  assert.match(command, /統一結算/);
  assert.match(command, /網站 \{versions\?\.site/);
  assert.match(command, /情境內容包 \{versions\?\.scenarioContent/);
  assert.match(command, /正式學習位置 \{versions\?\.formalProgress/);
});
