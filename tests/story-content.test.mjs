import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTENT_DIFFICULTIES,
  FIRST_ACT_CHAPTERS,
  STORY_ROUTES,
  getFirstActChapter,
} from "../app/story-content.ts";

test("the first act is a complete ordered U01-U08 thread with unique evidence and choices", () => {
  assert.deepEqual(FIRST_ACT_CHAPTERS.map((chapter) => chapter.unit), ["U01", "U02", "U03", "U04", "U05", "U06", "U07", "U08"]);
  assert.equal(new Set(FIRST_ACT_CHAPTERS.map((chapter) => chapter.evidence.id)).size, 8);
  for (const chapter of FIRST_ACT_CHAPTERS) {
    assert.equal(chapter.choices.length, 2);
    assert.ok(chapter.coldOpen.length > 20);
    assert.ok(chapter.nextHook.length > 15);
    assert.ok(chapter.evidence.detail.length > 15);
  }
});

test("U03-U08 use dedicated artwork and expose three independent routes and difficulties", () => {
  for (const unit of ["U03", "U04", "U05", "U06", "U07", "U08"]) {
    const chapter = getFirstActChapter(unit);
    assert.ok(chapter);
    assert.match(chapter.imageSrc, /^\/game\/story\/u0[3-8]-[a-z-]+\.webp$/);
  }
  assert.deepEqual(STORY_ROUTES.map((route) => route.id), ["formal", "backtrack", "leap"]);
  assert.deepEqual(CONTENT_DIFFICULTIES.map((difficulty) => difficulty.id), ["steady", "standard", "leap"]);
});
