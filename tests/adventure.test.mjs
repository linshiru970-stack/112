import assert from "node:assert/strict";
import test from "node:test";
import {
  ADVENTURE_REGIONS,
  BATTLE_INTENTS,
  BOSS_CORE_TARGET,
  BOSS_ENCOUNTERS,
  BOSS_TURN_LIMIT,
  REGION_BATTLE_EVENTS,
  REGION_BATTLE_INTENTS,
  REGION_ENCOUNTERS,
  battleEventFor,
  battleIntentFor,
  battleTurnDamage,
  getBattleStance,
  resolveBattleEventEffect,
} from "../app/adventure.ts";

test("battle stances now encode distinct learning support as well as combat damage", () => {
  assert.equal(getBattleStance("blade").correctDamage, 30);
  assert.equal(getBattleStance("blade").learningMode, "unassisted");
  assert.equal(getBattleStance("ward").learningMode, "hint");
  assert.equal(getBattleStance("lantern").learningMode, "learning");
  assert.equal(battleTurnDamage("blade", false, 0), 0);
  assert.equal(battleTurnDamage("ward", false, 0), 0);
});

test("wrong answers never damage the enemy, while a correct streak can still clear the encounter", () => {
  const missDamage = Array.from({ length: 6 }, () => battleTurnDamage("blade", false, 0))
    .reduce((sum, value) => sum + value, 0);
  const correctDamage = [1, 2, 3, 4, 5, 6]
    .map((combo) => battleTurnDamage("blade", true, combo))
    .reduce((sum, value) => sum + value, 0);
  assert.equal(missDamage, 0);
  assert.ok(missDamage < REGION_ENCOUNTERS.trail.hp);
  assert.ok(correctDamage >= REGION_ENCOUNTERS.trail.hp);
});

test("lantern stance gives its combo bonus only after a correct chain forms", () => {
  assert.equal(battleTurnDamage("lantern", true, 1), 26);
  assert.equal(battleTurnDamage("lantern", true, 2), 32);
  assert.equal(battleTurnDamage("lantern", false, 0), 0);
});

test("enemy intents rotate through all three stance counters and bosses leave room for recovery", () => {
  const intents = Array.from({ length: 3 }, (_, index) => battleIntentFor("mist-sentinel", index));
  assert.equal(new Set(intents.map((intent) => intent.counter)).size, 3);
  assert.deepEqual([...new Set(intents.map((intent) => intent.wrongDamage))].sort(), [1, 2]);
  assert.equal(BATTLE_INTENTS.length, 3);
  assert.equal(BOSS_TURN_LIMIT, 10);
  assert.ok(BOSS_CORE_TARGET < BOSS_TURN_LIMIT);
});

test("v21 gives all five regions distinct encounter art, bosses, intent language, and field events", () => {
  const regionIds = ADVENTURE_REGIONS.map((region) => region.id);
  assert.equal(regionIds.length, 5);
  assert.equal(new Set(regionIds.map((id) => REGION_ENCOUNTERS[id].background)).size, 5);
  assert.equal(new Set(regionIds.map((id) => REGION_ENCOUNTERS[id].image)).size, 5);
  assert.equal(new Set(regionIds.map((id) => BOSS_ENCOUNTERS[id].image)).size, 5);
  assert.equal(new Set(regionIds.map((id) => REGION_BATTLE_EVENTS[id].effect)).size, 5);
  for (const regionId of regionIds) {
    assert.equal(REGION_BATTLE_INTENTS[regionId].length, 3);
    assert.equal(new Set(REGION_BATTLE_INTENTS[regionId].map((intent) => intent.counter)).size, 3);
    assert.ok(battleEventFor(REGION_ENCOUNTERS[regionId].id, 1, "expedition"));
    assert.ok(battleEventFor(BOSS_ENCOUNTERS[regionId].id, 7, "boss"));
  }
});

test("regional events change combat only and never manufacture strict evidence", () => {
  const archiveEvent = battleEventFor("archive-knight", 1, "expedition");
  const assisted = resolveBattleEventEffect(archiveEvent, { correct: true, stanceId: "lantern", correctChain: 2, countered: true, strictEvidenceEligible: false });
  const strict = resolveBattleEventEffect(archiveEvent, { correct: true, stanceId: "blade", correctChain: 1, countered: false, strictEvidenceEligible: true });
  assert.equal(assisted.damageBonus, 0);
  assert.equal(strict.damageBonus, 12);

  const galeEvent = battleEventFor("clock-hound", 1, "expedition");
  assert.equal(resolveBattleEventEffect(galeEvent, { correct: false, stanceId: "blade", correctChain: 0, countered: false, strictEvidenceEligible: false }).wrongDamageBonus, 1);
  assert.equal(resolveBattleEventEffect(galeEvent, { correct: false, stanceId: "ward", correctChain: 0, countered: true, strictEvidenceEligible: false }).wrongDamageBonus, 0);
});
