import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS, VOCABULARY, getQuestion, matchesAcceptedOutput } from "../app/content.ts";
import { GENERATED_QUESTIONS, GENERATED_UNITS } from "../app/course-data.generated.ts";
import { vocabularyInText } from "../app/vocabulary-matching.ts";

test("generated curriculum keeps one stable question id and one unique answer per item", () => {
  assert.equal(GENERATED_UNITS.length, 40);
  assert.equal(GENERATED_QUESTIONS.length, 228);
  assert.equal(new Set(GENERATED_QUESTIONS.map((question) => question.id)).size, GENERATED_QUESTIONS.length);
  assert.equal(new Set(GENERATED_QUESTIONS.map((question) => question.prompt)).size, GENERATED_QUESTIONS.length);

  for (const question of GENERATED_QUESTIONS) {
    assert.equal(question.kind, "choice", `${question.id} must remain a choice item`);
    assert.ok(question.options.length >= 3, `${question.id} needs at least three options`);
    assert.equal(new Set(question.options.map((option) => option.id)).size, question.options.length, `${question.id} option ids must be unique`);
    assert.equal(new Set(question.options.map((option) => option.label)).size, question.options.length, `${question.id} option text must be unique`);
    assert.equal(question.options.filter((option) => option.id === question.answerId).length, 1, `${question.id} must have one keyed answer`);
    assert.ok(question.explanation.trim().length >= 18, `${question.id} needs a useful explanation`);
    assert.ok(question.evidence.trim().length >= 12, `${question.id} needs direct evidence`);
  }
});

test("generated prompts do not reveal internal skill ids or grammar labels before answering", () => {
  const leakPattern = /\bG\d{2}\b|現在簡單式|現在進行式|過去式|被動語態|關係子句|名詞子句/;
  for (const question of GENERATED_QUESTIONS) {
    assert.doesNotMatch(question.prompt, leakPattern, `${question.id} leaks its tested skill`);
  }
});

test("U03 through U40 keep six curated items per unit", () => {
  for (let unitNumber = 3; unitNumber <= 40; unitNumber += 1) {
    const id = `U${String(unitNumber).padStart(2, "0")}`;
    assert.equal(GENERATED_QUESTIONS.filter((question) => question.unit === id).length, 6, `${id} should have six items`);
  }
});

test("the visible curriculum total and vocabulary concept total stay synchronized", () => {
  assert.equal(QUESTIONS.length, 242);
  assert.equal(VOCABULARY.length, 700);
  assert.equal(VOCABULARY.filter((entry) => entry.source === "core").length, 480);
});

test("U02 weekday question has one defensible answer and output accepts the tested natural variant", () => {
  const weekday = getQuestion("U02-Q04");
  assert.ok(weekday);
  assert.deepEqual(weekday.options.map((option) => option.label), ["every", "during", "while"]);
  assert.equal(weekday.options.filter((option) => option.id === weekday.answerId).length, 1);
  assert.ok(!weekday.options.some((option) => /on every/i.test(option.label)));

  const platform = getQuestion("U02-Q07");
  assert.ok(platform);
  assert.equal(matchesAcceptedOutput(platform, "She is waiting for the train at platform three."), true);
  assert.equal(matchesAcceptedOutput(platform, "She waits train platform three."), false);
});

test("all 480 core vocabulary concepts have grammatical example templates", () => {
  const core = VOCABULARY.filter((entry) => entry.source === "core");
  assert.ok(core.every((entry) => entry.example?.trim()));
  assert.equal(VOCABULARY.find((entry) => entry.id === "U02-A03")?.example, "We discussed commuting by train during the meeting.");
  assert.equal(VOCABULARY.find((entry) => entry.id === "U02-C01")?.example, "We discussed the travel itinerary during the meeting.");
  assert.equal(core.filter((entry) => /^v\./i.test(entry.partOfSpeech ?? "") && /^We discussed (?!commuting)/i.test(entry.example ?? "")).length, 0);
});

test("reading vocabulary matches keep inflected words intact instead of creating s or ed buttons", () => {
  const text = "Evan commutes by train, leaves home, arrives early, and was delayed.";
  const entries = ["commute", "leave", "arrive", "delay"].map((item) => ({ item }));
  const surfaces = vocabularyInText(text, entries).map((match) => text.slice(match.start, match.end));
  assert.deepEqual(surfaces, ["commutes", "leaves", "arrives", "delayed"]);
});
