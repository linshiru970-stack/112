import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SCENARIO_MISSIONS,
  SCENARIO_QUESTIONS,
  SCENARIO_WEAKNESS_INFO,
  getScenarioMission,
  getScenarioNodeMeta,
  getScenarioQuestion,
  scenarioEnding,
  scenarioNodeSequence,
  scenarioProcessResult,
  scenarioQuestionsForNode,
} from "../app/scenario-mission.ts";

const nodeIds = [
  "board",
  "route-rinka",
  "route-sena",
  "route-yori",
  "announcement",
  "staff",
  "contact",
  "final",
];

test("v23 gives every reusable scenario node five genuinely separate question records", () => {
  for (const nodeId of nodeIds) {
    const questions = scenarioQuestionsForNode(nodeId);
    assert.ok(questions.length >= 5, `${nodeId} needs at least five variants`);
    assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
    assert.equal(new Set(questions.map((question) => question.variant?.fingerprint)).size, questions.length);
    assert.ok(questions.every((question) => question.unit === "U02"));
    assert.ok(questions.every((question) => question.sourceLabel.includes("U02")));
    assert.ok(questions.every((question) => question.mission.hint && question.mission.correctConsequence && question.mission.wrongConsequence));
    assert.ok(getScenarioNodeMeta(nodeId));
  }
});

test("three companions share a six-node mission but receive distinct route nodes", () => {
  const rinka = scenarioNodeSequence("rinka");
  const sena = scenarioNodeSequence("sena");
  const yori = scenarioNodeSequence("yori");
  assert.equal(rinka.length, 6);
  assert.equal(sena.length, 6);
  assert.equal(yori.length, 6);
  assert.deepEqual(rinka.filter((node) => !node.startsWith("route-")), sena.filter((node) => !node.startsWith("route-")));
  assert.deepEqual(sena.filter((node) => !node.startsWith("route-")), yori.filter((node) => !node.startsWith("route-")));
  assert.equal(rinka[1], "route-rinka");
  assert.equal(sena[1], "route-sena");
  assert.equal(yori[1], "route-yori");
});

test("scenario questions are server-addressable and listening variants preserve listen-once content", () => {
  assert.equal(new Set(SCENARIO_QUESTIONS.map((question) => question.id)).size, SCENARIO_QUESTIONS.length);
  for (const question of SCENARIO_QUESTIONS) assert.equal(getScenarioQuestion(question.id), question);
  const listening = scenarioQuestionsForNode("announcement");
  assert.equal(listening.length, 5);
  assert.ok(listening.every((question) => question.listeningText && question.skill.includes("聽力")));
  assert.ok(listening.every((question) => !question.prompt.includes(question.listeningText)));
});

test("errors change the route result without preventing either completion ending", () => {
  assert.equal(scenarioProcessResult(0), "clean");
  assert.equal(scenarioProcessResult(1), "recovered");
  assert.equal(scenarioProcessResult(2), "recovered");
  assert.equal(scenarioProcessResult(3), "detour");
  assert.equal(scenarioEnding(6), "full-intel");
  assert.equal(scenarioEnding(5), "full-intel");
  assert.equal(scenarioEnding(4), "standard-delivery");
  assert.equal(scenarioEnding(0), "standard-delivery");
});

test("the scenario keeps audio failure recoverable and never labels a wrong answer as successful evidence", () => {
  const client = readFileSync(new URL("../app/scenario-mission-client.tsx", import.meta.url), "utf8");
  assert.match(client, /顯示英文內容並以有支援模式繼續/);
  assert.match(client, /audioFallbackUsed: isListening \? audioFallbackUsed/);
  assert.match(client, /已保存錯誤與修復紀錄，不計為成功證據/);
});

test("v24 exposes one main mission, three full side missions and four targeted repair missions", () => {
  const playable = SCENARIO_MISSIONS.filter((mission) => mission.kind === "main" || mission.kind === "side");
  const side = SCENARIO_MISSIONS.filter((mission) => mission.kind === "side");
  const repair = SCENARIO_MISSIONS.filter((mission) => mission.kind === "repair");
  assert.equal(playable.length, 4);
  assert.equal(side.length, 3);
  assert.equal(repair.length, 4);
  assert.deepEqual(new Set(repair.map((mission) => mission.weaknessKey)), new Set(Object.keys(SCENARIO_WEAKNESS_INFO)));
  assert.ok(playable.every((mission) => mission.imageSrc && mission.description && mission.focus));
  assert.ok(getScenarioMission("u02-0655-commute-detour"));
  assert.ok(getScenarioMission("u02-0800-shift-handover"));
  assert.ok(getScenarioMission("u02-platform-change-watch"));
});

test("every v24 node has five semantic records and repair missions always use two new-context nodes", () => {
  for (const mission of SCENARIO_MISSIONS.filter((candidate) => candidate.kind === "side" || candidate.kind === "repair")) {
    const sequence = mission.sequence("rinka");
    assert.equal(sequence.length, mission.kind === "repair" ? 2 : 3);
    for (const nodeId of sequence) {
      const questions = scenarioQuestionsForNode(nodeId, mission.id);
      assert.ok(questions.length >= 5, `${mission.id}/${nodeId} needs five variants`);
      assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
      assert.ok(questions.every((question) => question.unit === "U02"));
      assert.ok(questions.every((question) => question.mission.missionId === mission.id));
      assert.ok(questions.every((question) => question.mission.weaknessKey in SCENARIO_WEAKNESS_INFO));
    }
  }
});

test("v32 exposes one complete core case for every U01-U08 chapter", () => {
  const coreCases = SCENARIO_MISSIONS.filter((mission) => mission.caseFile && (mission.kind === "chapter" || mission.kind === "main"));
  assert.deepEqual(coreCases.map((mission) => mission.unit), ["U01", "U02", "U03", "U04", "U05", "U06", "U07", "U08"]);
  assert.ok(coreCases.every((mission) => mission.phraseTools?.length === 3));
  for (const mission of coreCases.filter((candidate) => candidate.kind === "chapter")) {
    const sequence = mission.sequence("sena");
    assert.ok(sequence.length >= 3);
    for (const nodeId of sequence) {
      const questions = scenarioQuestionsForNode(nodeId, mission.id);
      assert.ok(questions.length >= 3, `${mission.id}/${nodeId} needs three case variants`);
      assert.ok(questions.every((question) => question.unit === mission.unit));
      assert.ok(questions.every((question) => question.mission.actionType));
      assert.ok(questions.every((question) => question.mission.errorPattern));
      assert.equal(new Set(questions.map((question) => question.variant?.fingerprint)).size, questions.length);
    }
  }
});

test("v32 includes true English output and a multi-document U08 boss", () => {
  const chapterQuestions = SCENARIO_QUESTIONS.filter((question) => question.id.startsWith("CASE-V32"));
  assert.ok(chapterQuestions.some((question) => question.kind === "output" && question.acceptedAnswers?.length));
  const u08 = getScenarioMission("u08-missing-decision-boss");
  assert.ok(u08);
  assert.equal(u08.sequence("rinka").length, 4);
  assert.ok(chapterQuestions.some((question) => question.unit === "U08" && (question.mission.documents?.length ?? 0) >= 3));
});

test("v24 companion memory is server-owned and immediate repair is never submitted as blade evidence", () => {
  const client = readFileSync(new URL("../app/scenario-mission-client.tsx", import.meta.url), "utf8");
  const api = readFileSync(new URL("../app/api/scenario/route.ts", import.meta.url), "utf8");
  const store = readFileSync(new URL("../app/scenario-store.ts", import.meta.url), "utf8");
  assert.match(client, /mission\.kind === "repair" \|\| hintVisible \? "ward" : "blade"/);
  assert.match(client, /立即修復永遠標為 assisted/);
  assert.match(api, /scenario_skill_memory/);
  assert.match(api, /repaired = MIN\(misses, repaired \+ 1\)/);
  assert.match(api, /mission\.kind !== "repair"/);
  assert.match(store, /CREATE TABLE IF NOT EXISTS scenario_skill_memory/);
});
