import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS, getQuestionSkillTags } from "../app/content.ts";
import {
  VARIANT_QUESTIONS,
  getUnseenVariantQuestions,
  getVariantFingerprint,
  getVariantQuestion,
} from "../app/question-variants.ts";
import { GRAMMAR_TRANSFER_SEEDS } from "../app/grammar-transfer-bank.ts";

test("variant engine provides a large deterministic pool with stable semantic fingerprints", () => {
  assert.ok(VARIANT_QUESTIONS.length >= 1200, `expected a long-lived unseen pool, got ${VARIANT_QUESTIONS.length}`);
  assert.equal(new Set(VARIANT_QUESTIONS.map((question) => question.id)).size, VARIANT_QUESTIONS.length);
  assert.ok(new Set(VARIANT_QUESTIONS.map((question) => question.variant?.fingerprint)).size >= 1000);

  for (const question of VARIANT_QUESTIONS) {
    assert.ok(question.variant?.fingerprint, `${question.id} needs a semantic fingerprint`);
    assert.equal(getVariantQuestion(question.id)?.id, question.id);
    assert.equal(getVariantFingerprint(question.id), question.variant.fingerprint);
    if (question.kind === "choice") {
      assert.equal(new Set(question.options.map((option) => option.id)).size, question.options.length, `${question.id} option ids`);
      assert.equal(new Set(question.options.map((option) => option.label)).size, question.options.length, `${question.id} option labels`);
      assert.equal(question.options.filter((option) => option.id === question.answerId).length, 1, `${question.id} answer key`);
    }
  }
});

test("U02 has far more than five unseen candidates for its current grammar and listening skills", () => {
  const u02 = VARIANT_QUESTIONS.filter((question) => question.unit === "U02");
  const g02 = u02.filter((question) => getQuestionSkillTags(question).includes("grammar.present_simple_do_does"));
  const listening = u02.filter((question) => getQuestionSkillTags(question).includes("listening.comprehension"));
  const output = u02.filter((question) => getQuestionSkillTags(question).includes("production.short_output"));
  assert.ok(g02.length >= 100, `G02 candidate pool too small: ${g02.length}`);
  assert.ok(listening.length >= 10, `listening candidate pool too small: ${listening.length}`);
  assert.ok(output.length >= 5, `output candidate pool too small: ${output.length}`);
});

test("U02 explicitly covers G03 and the fixed at/on/in time-preposition target", () => {
  const g03Core = QUESTIONS.find((question) => question.id === "U02-Q08");
  const timeCore = QUESTIONS.find((question) => question.id === "U02-Q09");
  assert.ok(g03Core && getQuestionSkillTags(g03Core).includes("grammar.subject_verb_agreement"));
  assert.ok(timeCore && getQuestionSkillTags(timeCore).includes("grammar.time_prepositions_basic"));
  const timeTransfer = VARIANT_QUESTIONS.filter((question) => (
    question.unit === "U02" && getQuestionSkillTags(question).includes("grammar.time_prepositions_basic")
  ));
  assert.ok(timeTransfer.length >= 5, `time-preposition transfer pool too small: ${timeTransfer.length}`);
  assert.ok(new Set(timeTransfer.map((question) => question.variant.fingerprint)).size >= 5);
});

test("every U03-U40 unit has at least five distinct unseen reading and listening evidence points", () => {
  for (let number = 3; number <= 40; number += 1) {
    const unit = `U${String(number).padStart(2, "0")}`;
    for (const tag of ["reading.comprehension", "listening.comprehension"]) {
      const candidates = VARIANT_QUESTIONS.filter((question) => question.unit === unit && getQuestionSkillTags(question).includes(tag));
      const fingerprints = new Set(candidates.map((question) => question.variant?.fingerprint).filter(Boolean));
      assert.ok(candidates.length >= 5, `${unit} ${tag} candidate pool too small: ${candidates.length}`);
      assert.ok(fingerprints.size >= 5, `${unit} ${tag} needs five distinct semantics, got ${fingerprints.size}`);
    }
  }
});

test("every G03-G25 objective has at least five truly distinct grammar-transfer contexts", () => {
  for (let number = 3; number <= 25; number += 1) {
    const objective = `G${String(number).padStart(2, "0")}`;
    const seeds = GRAMMAR_TRANSFER_SEEDS.filter((seed) => seed.objective === objective);
    assert.ok(seeds.length >= 5, `${objective} transfer seed pool too small: ${seeds.length}`);
    assert.equal(new Set(seeds.map((seed) => seed.key)).size, seeds.length, `${objective} seed keys must be unique`);
    const variants = VARIANT_QUESTIONS.filter((question) => question.variant?.family === `grammar-${objective.toLowerCase()}`);
    assert.equal(variants.length, seeds.length, `${objective} transfer variants should match the bank`);
    assert.ok(variants.every((question) => getQuestionSkillTags(question).some((tag) => tag !== "grammar.general" && (tag.startsWith("grammar.") || tag === "strategy.context_elimination"))), `${objective} must schedule a specific skill tag`);
  }
});

test("seen semantic fingerprints are removed even when other variant ids remain", () => {
  const semanticGroup = VARIANT_QUESTIONS.filter((question) => question.variant?.fingerprint === "v1:g02:statement:mina-commute");
  assert.ok(semanticGroup.length > 1, "test fixture must contain several surface forms for one semantic item");
  const seen = new Set([semanticGroup[0].variant.fingerprint]);
  const unseen = getUnseenVariantQuestions(seen);
  assert.equal(unseen.length, VARIANT_QUESTIONS.length - semanticGroup.length);
  assert.ok(unseen.every((question) => !seen.has(question.variant.fingerprint)));
});

test("generated formal items keep objective ids internal while still feeding skill scheduling", () => {
  const grammar = QUESTIONS.find((question) => question.id === "U03-Q03");
  const transfer = QUESTIONS.find((question) => question.id === "U03-Q06");
  assert.ok(grammar && transfer);
  assert.doesNotMatch(grammar.prompt, /G\d{2}/);
  assert.ok(getQuestionSkillTags(grammar).includes("grammar.past_future_timeline"));
  assert.ok(getQuestionSkillTags(transfer).includes("grammar.past_future_timeline"));
  assert.ok(getQuestionSkillTags(transfer).includes("grammar.infinitive_gerund"));
});
