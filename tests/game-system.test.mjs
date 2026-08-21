import assert from "node:assert/strict";
import test from "node:test";
import {
  GAME_EQUIPMENT,
  GAME_ITEMS,
  GAME_LOADOUT_STYLES,
  GAME_MEMORIES,
  GAME_OUTFITS,
  GAME_QUESTS,
  MAX_WILLPOWER,
  STARTER_ITEM_COUNTS,
  battleEquipmentDamageBonus,
  battleBurstCost,
  battleGrade,
  battleStartingEnergy,
  dailyGameQuestIds,
  expeditionBoonDamageBonus,
  expeditionBoonOptions,
  expeditionBurstCost,
  expeditionEnemyMaxHp,
  expeditionGoldMultiplier,
  gameQuestProgressDelta,
  resolveVerifiedBattle,
} from "../app/game-system.ts";
import { battleIntentFor, battleTurnDamage } from "../app/adventure.ts";

test("starter combat inventory has real convenience effects without hiding evidence assistance", () => {
  assert.equal(MAX_WILLPOWER, 5);
  assert.equal(GAME_ITEMS.length, 5);
  assert.equal(new Set(GAME_ITEMS.map((item) => item.id)).size, GAME_ITEMS.length);
  assert.ok(GAME_ITEMS.some((item) => item.id === "erase-rune" && item.contentAssist));
  assert.ok(GAME_ITEMS.some((item) => item.id === "guard-charm" && !item.contentAssist));
  assert.ok(Object.values(STARTER_ITEM_COUNTS).every((quantity) => quantity >= 1));
});

test("equipment changes battle play instead of only adding cosmetic rarity", () => {
  assert.equal(battleEquipmentDamageBonus(["wayfarer-blade"], "blade", true), 6);
  assert.equal(battleEquipmentDamageBonus(["wayfarer-blade"], "ward", true), 0);
  assert.equal(battleEquipmentDamageBonus(["guardian-edge", "wayfarer-blade"], "blade", true), 10);
  assert.equal(battleEquipmentDamageBonus(["tactician-compass"], "ward", true, true), 5);
  assert.equal(battleStartingEnergy(["resonance-earring"]), 1);
  assert.equal(battleEquipmentDamageBonus(["scarlet-chain"], "blade", true, false, 2, "rinka"), 8);
  assert.equal(battleEquipmentDamageBonus(["scarlet-chain"], "blade", true, false, 1, "rinka"), 0);
  assert.equal(battleEquipmentDamageBonus(["surveyors-staff"], "lantern", true, false, 1, "sena"), 8);
  assert.equal(battleEquipmentDamageBonus(["surveyors-staff"], "blade", true, false, 1, "sena"), 0);
  assert.equal(battleBurstCost("aegis-oath", ["starloop-core"], "yori"), 3);
  assert.equal(battleBurstCost("resonant-spark", ["starloop-core"], "yori"), 2);
  assert.equal(battleBurstCost("resonant-spark", ["starloop-core"], "rinka"), 3);
  assert.ok(GAME_EQUIPMENT.some((item) => item.id === "lone-ring" && item.slot === "accessory"));
  assert.equal(GAME_LOADOUT_STYLES.length, 3);
});

test("each expedition offers three distinct run-changing boons", () => {
  const options = expeditionBoonOptions("stable-battle-seed");
  assert.equal(options.length, 3);
  assert.equal(new Set(options).size, 3);
  assert.equal(expeditionBoonDamageBonus("hunter-oath", true, true), 10);
  assert.equal(expeditionBoonDamageBonus("hunter-oath", true, false), 0);
  assert.equal(expeditionBurstCost("resonant-spark"), 3);
  assert.equal(expeditionEnemyMaxHp(190, "bounty-seal"), 214);
  assert.equal(expeditionGoldMultiplier("bounty-seal"), 1.35);
});

test("daily commissions rotate without rewarding fake mastery evidence", () => {
  const quests = dailyGameQuestIds("2026-08-09");
  assert.equal(quests.length, 3);
  assert.equal(new Set(quests).size, 3);
  assert.equal(new Set(GAME_QUESTS.map((quest) => quest.id)).size, GAME_QUESTS.length);
  assert.equal(gameQuestProgressDelta("finish-run", { outcome: "defeat", correctCount: 2, counterCount: 0, contentAssistCount: 2, burstCount: 0 }), 1);
  assert.equal(gameQuestProgressDelta("clean-win", { outcome: "victory", correctCount: 5, counterCount: 2, contentAssistCount: 1, burstCount: 0 }), 0);
  assert.equal(gameQuestProgressDelta("clean-win", { outcome: "victory", correctCount: 5, counterCount: 2, contentAssistCount: 0, burstCount: 0 }), 1);
});

test("S rank requires a clean unassisted victory while assisted wins can still clear", () => {
  assert.equal(battleGrade({ outcome: "victory", correctCount: 5, turnCount: 5, requiredTurnCount: 6, contentAssistCount: 0, remainingWillpower: 5, onlyBlade: true, itemUseCount: 0 }), "A");
  assert.equal(battleGrade({ outcome: "victory", correctCount: 6, turnCount: 6, requiredTurnCount: 6, contentAssistCount: 0, remainingWillpower: 5, onlyBlade: true, itemUseCount: 0 }), "S");
  assert.equal(battleGrade({ outcome: "victory", correctCount: 5, turnCount: 5, contentAssistCount: 0, remainingWillpower: 5, onlyBlade: true, itemUseCount: 1 }), "A");
  assert.equal(battleGrade({ outcome: "victory", correctCount: 5, turnCount: 5, contentAssistCount: 1, remainingWillpower: 5, onlyBlade: true }), "A");
  assert.equal(battleGrade({ outcome: "defeat", correctCount: 5, turnCount: 6, contentAssistCount: 0, remainingWillpower: 2, onlyBlade: true }), "B");
});

test("an expedition cannot settle early even when damage crosses the old HP threshold", () => {
  const turn = (index) => ({
    questionId: `variant-${index}`,
    correct: true,
    strictEvidenceEligible: true,
    bossCoreHit: false,
    stanceId: "blade",
    companionId: "rinka",
    companionAffinity: 0,
    burstRequested: false,
    itemIds: [],
  });
  const early = resolveVerifiedBattle({
    mode: "expedition",
    encounterId: "mist-sentinel",
    enemyBaseHp: 190,
    boonId: "hunter-oath",
    equipped: ["wayfarer-blade"],
    turns: Array.from({ length: 5 }, (_, index) => turn(index)),
  });
  assert.equal(early.valid, false);
  assert.equal(early.outcome, "active");

  const complete = resolveVerifiedBattle({
    mode: "expedition",
    encounterId: "mist-sentinel",
    enemyBaseHp: 190,
    boonId: "hunter-oath",
    equipped: ["wayfarer-blade"],
    turns: Array.from({ length: 6 }, (_, index) => turn(index)),
  });
  assert.equal(complete.valid, true);
  assert.equal(complete.outcome, "victory");
  assert.equal(complete.correctCount, 6);
  assert.ok(complete.totalDamage >= 190);
});

test("server battle resolution recomputes the Region III signal-window bonuses", () => {
  const encounterId = "signal-raider";
  const turns = Array.from({ length: 6 }, (_, index) => ({
    questionId: `harbor-variant-${index}`,
    correct: true,
    strictEvidenceEligible: true,
    bossCoreHit: false,
    stanceId: battleIntentFor(encounterId, index).counter,
    companionId: "rinka",
    companionAffinity: 0,
    burstRequested: false,
    itemIds: [],
  }));
  const resolved = resolveVerifiedBattle({
    mode: "expedition",
    encounterId,
    enemyBaseHp: 206,
    boonId: "aegis-oath",
    equipped: [],
    turns,
  });
  const combatFloor = turns.reduce((sum, turn, index) => {
    const intent = battleIntentFor(encounterId, index);
    return sum + battleTurnDamage(turn.stanceId, true, index + 1) + intent.counterBonus;
  }, 0);
  assert.equal(resolved.valid, true);
  assert.equal(resolved.outcome, "victory");
  assert.equal(resolved.counterCount, 6);
  assert.ok(resolved.totalDamage >= combatFloor + 24);
});

test("gallery and wardrobe contain concrete art for all three companion event paths", () => {
  assert.equal(GAME_MEMORIES[0].id, "rinka-rainy-night");
  assert.equal(GAME_MEMORIES.length, 3);
  assert.equal(new Set(GAME_MEMORIES.map((memory) => memory.companionId)).size, 3);
  assert.ok(GAME_MEMORIES.every((memory) => /^\/game\/cg\/.+\.webp$/.test(memory.image) && memory.eventLine.length > 20));
  assert.equal(GAME_OUTFITS.length, 6);
  assert.equal(GAME_OUTFITS.filter((outfit) => !outfit.source.includes("初始")).length, 3);
  assert.ok(GAME_OUTFITS.every((outfit) => /^\/game\/(companions|outfits)\/.+\.webp$/.test(outfit.image)));
});
