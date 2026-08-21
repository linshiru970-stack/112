import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPANIONS,
  companionAffinityTier,
  companionBattleBonus,
  companionBattleResultLine,
  companionGreeting,
  companionWrongDamageReduction,
  getCompanion,
  getCompanionChoice,
  getCompanionTopic,
} from "../app/companions.ts";
import { readFileSync } from "node:fs";

test("party has three distinct original companions with complete dialogue trees", () => {
  assert.equal(COMPANIONS.length, 3);
  assert.equal(new Set(COMPANIONS.map((companion) => companion.id)).size, 3);
  for (const companion of COMPANIONS) {
    assert.match(companion.image, /^\/game\/companions\/[a-z]+\.webp$/);
    assert.ok(companion.topics.length >= 4);
    assert.ok(companion.topics.every((topic) => topic.choices.length >= 3));
    assert.equal(companion.greetings.length, 5);
  }
});

test("affinity tiers have stable non-overlapping thresholds", () => {
  assert.equal(companionAffinityTier(0).label, "初識");
  assert.equal(companionAffinityTier(10).label, "熟悉");
  assert.equal(companionAffinityTier(25).label, "默契");
  assert.equal(companionAffinityTier(50).label, "信賴");
  assert.equal(companionAffinityTier(80).label, "羈絆");
  assert.equal(companionAffinityTier(999).level, 5);
});

test("dialogue topics and choices can be validated by server ids", () => {
  const companion = getCompanion("rinka");
  const topic = getCompanionTopic(companion.id, "story");
  assert.equal(topic?.minAffinity, 12);
  assert.equal(getCompanionChoice(companion.id, "story", "sword")?.label, "妳為什麼總帶著那把刀？");
  assert.equal(getCompanionChoice(companion.id, "story", "missing"), undefined);
  assert.match(companionGreeting(companion, 0), /今天|來了|路/);
});

test("companion passives now cover offense, defense and combo roles", () => {
  assert.equal(companionBattleBonus("rinka", true, 1), 3);
  assert.equal(companionBattleBonus("rinka", false, 0), 0);
  assert.equal(companionBattleBonus("sena", false, 0), 0);
  assert.equal(companionWrongDamageReduction("sena"), 1);
  assert.equal(companionWrongDamageReduction("rinka"), 0);
  assert.equal(companionBattleBonus("yori", true, 2), 5);
  assert.equal(companionBattleBonus("yori", true, 1), 0);
});

test("victory and defeat both receive companion-specific narrative follow-up", () => {
  assert.match(companionBattleResultLine("rinka", "victory"), /勝利|戰利品/);
  assert.match(companionBattleResultLine("sena", "defeat", "一般現在式"), /一般現在式/);
  assert.match(companionBattleResultLine("yori", "defeat"), /故事|敗北/);
});

test("v27 companion dialogue stores contextual replies and returns durable mission memories", () => {
  const api = readFileSync(new URL("../app/api/companions/route.ts", import.meta.url), "utf8");
  const client = readFileSync(new URL("../app/practice-client.tsx", import.meta.url), "utf8");
  assert.match(api, /contextualReply/);
  assert.match(api, /journey_sessions/);
  assert.match(api, /scenario_runs/);
  assert.match(api, /contextLines/);
  assert.match(api, /memories/);
  assert.match(client, /companion-memory-timeline/);
});
