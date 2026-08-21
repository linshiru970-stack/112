import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("answer confidence is locked before feedback and listening replay is gated behind the first answer", () => {
  const client = read("app/practice-client.tsx");
  const progressRoute = read("app/api/progress/route.ts");
  const confidenceGate = client.indexOf("在看答案以前，你有多確定？");
  const feedbackCard = client.indexOf("feedback-card");
  assert.ok(confidenceGate > -1);
  assert.ok(feedbackCard > confidenceGate);
  assert.match(client, /首聽已完成。先鎖定第一個答案與信心/);
  assert.match(client, /FIRST ANSWER LOCKED/);
  assert.match(client, /revealListeningFeedback/);
  assert.match(client, /utterance\.onend = \(\) => \{[\s\S]{0,500}setListeningPlayCount/);
  assert.match(progressRoute, /skillTags\.includes\("listening\.comprehension"\) && listenCount < 1/);
});

test("repeated questions or repeated semantic fingerprints cannot advance skill evidence and answer posts are idempotent", () => {
  const progressRoute = read("app/api/progress/route.ts");
  const schema = read("app/learning-schema.ts");
  assert.match(progressRoute, /const isNewQuestionEvidence = isNewQuestionEncounter && strictEvidenceEligible/);
  assert.match(progressRoute, /successfulUnseenCount[\s\S]{0,220}isNewQuestionEvidence && isCorrect/);
  assert.match(progressRoute, /SELECT response_json FROM answer_receipts/);
  assert.match(progressRoute, /INSERT INTO answer_receipts/);
  assert.match(progressRoute, /previousFingerprint/);
  assert.match(progressRoute, /question_fingerprint_evidence/);
  assert.match(schema, /LEARNING_SCHEMA_VERSION = 11/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS answer_receipts/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS question_fingerprint_evidence/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS formal_question_evidence/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS boss_runs/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS boss_run_answers/);
});

test("hinted, learning-mode, and unlisted self-rated output cannot masquerade as strict unseen evidence", () => {
  const client = read("app/practice-client.tsx");
  const progressRoute = read("app/api/progress/route.ts");
  assert.match(progressRoute, /strictEvidenceEligible = !previewOnly[\s\S]{0,80}supportMode === "blade"/);
  assert.match(progressRoute, /listeningMode !== "learning"/);
  assert.match(progressRoute, /matchesAcceptedOutput\(question, payload\.answer\)/);
  assert.match(client, /本題保留為練習紀錄，不灌入嚴格未見能力證據/);
  assert.match(client, /自評「自然」仍只算練習/);
});

test("listening modes expose learning, audio-only TOEIC, and single-play hard behavior", () => {
  const client = read("app/practice-client.tsx");
  assert.match(client, /\['learning', '學習', '看得到選項'\]/);
  assert.match(client, /\['toeic', '多益', '選項只播音'\]/);
  assert.match(client, /\['hard', '困難', '全程只播一次'\]/);
  assert.match(client, /listeningMode === "hard" && listeningPlayCount >= 1/);
});

test("boss runs are server-issued and only clear after ten recorded answers with enough novel correct evidence", () => {
  const adventureRoute = read("app/api/adventure/route.ts");
  const progressRoute = read("app/api/progress/route.ts");
  const client = read("app/practice-client.tsx");
  assert.match(adventureRoute, /buildBossQueue\(unseen, states, eligibleUnitIds/);
  assert.match(adventureRoute, /question_ids_json/);
  assert.match(adventureRoute, /questionIds\.length !== BOSS_TURN_LIMIT/);
  assert.match(adventureRoute, /new Set\(questionIds\)\.size !== BOSS_TURN_LIMIT/);
  assert.match(adventureRoute, /novelCorrect < BOSS_CORE_TARGET/);
  assert.match(progressRoute, /INSERT INTO boss_run_answers/);
  assert.match(progressRoute, /novel_evidence/);
  assert.match(progressRoute, /bossQuestionIds\.includes\(payload\.questionId\)/);
  assert.match(client, /action: "startBoss"/);
  assert.match(client, /action: "clearBoss", regionId, runId/);
});

test("listening export classifies replay from replay_count rather than counting the first listen twice", () => {
  const exportRoute = read("app/api/export/route.ts");
  assert.match(exportRoute, /replayedListenEvents = listeningEvents\.filter\(\(event\) => asNumber\(event\.replay_count\) >= 1\)/);
  assert.doesNotMatch(exportRoute, /replayedListenEvents = listeningEvents\.filter\(\(event\) => listenCountForEvent\(event\) >= 2\)/);
});

test("foundation questions keep corrected U01 and U02 wording", () => {
  const content = read("app/content.ts");
  assert.match(content, /Please give ___ the form\. Mr\. Lee is waiting for it\./);
  assert.doesNotMatch(content, /Please give Mr\. Lee ___ the form\./);
  assert.match(content, /我每個平日搭火車通勤。/);
  assert.match(content, /She is waiting on platform three now\./);
});

test("companion dialogue returns durable visited-choice history", () => {
  const route = read("app/api/companions/route.ts");
  const client = read("app/practice-client.tsx");
  assert.match(route, /SELECT DISTINCT companion_id \|\| ':' \|\| topic_id/);
  assert.match(route, /visitedChoiceKeys/);
  assert.match(client, /companion-choice-visited/);
  assert.match(client, /對話探索/);
});

test("v20 completes all six turns, repairs defeat with variants, and verifies rewards from server receipts", () => {
  const client = read("app/practice-client.tsx");
  const gameRoute = read("app/api/game/route.ts");
  const gameStore = read("app/game-store.ts");
  assert.match(client, /nextHistory\.length >= queue\.length[\s\S]{0,100}nextEnemyHp <= 0 \? "victory" : "defeat"/);
  assert.match(client, /selectRepairQuestionIds/);
  assert.match(client, /questionIds\.length < 2/);
  assert.match(client, /supportMode: repairActive \? "lantern"/);
  assert.match(client, /重新挑戰敵人/);
  assert.match(gameRoute, /SELECT request_id, question_id, response_json FROM answer_receipts/);
  assert.match(gameRoute, /resolveVerifiedBattle/);
  assert.match(gameRoute, /INSERT INTO game_battle_receipts/);
  assert.match(gameStore, /CREATE TABLE IF NOT EXISTS game_quest_claim_receipts/);
});

test("v22 bond events, outfits and companion builds are server-backed without changing mastery evidence", () => {
  const client = read("app/practice-client.tsx");
  const gameRoute = read("app/api/game/route.ts");
  const gameStore = read("app/game-store.ts");
  const gameSystem = read("app/game-system.ts");
  assert.match(gameStore, /CREATE TABLE IF NOT EXISTS game_outfits/);
  assert.match(gameStore, /memory:rinka-rainy-night[\s\S]{0,300}outfit:rinka-rain-vanguard|outfit:rinka-rain-vanguard[\s\S]{0,300}memory:rinka-rainy-night/);
  assert.match(gameRoute, /singleCompanion === "sena"[\s\S]{0,180}counterCount >= 3/);
  assert.match(gameRoute, /singleCompanion === "yori"[\s\S]{0,180}burstCount >= 1/);
  assert.match(gameRoute, /getGameOutfit[\s\S]{0,500}game_outfits/);
  assert.match(gameSystem, /surveyors-staff[\s\S]{0,300}仍不算無提示證據/);
  assert.match(client, /衣裝只改外觀，不改學習判定/);
  assert.match(client, /BOND STORY/);
  assert.match(client, /BUILD ARCHETYPES/);
});

test("v28 mobile battle keeps status outside the artwork and simple mode preserves scene size", () => {
  const client = read("app/practice-client.tsx");
  const styles = read("app/globals.css");
  const version = read("app/product-version.ts");
  assert.match(version, /SITE_VERSION = "v33"/);
  assert.match(client, /battle-mobile-status/);
  assert.match(client, /battle-mobile-player-status/);
  assert.match(client, /battle-mobile-enemy-status/);
  assert.match(styles, /\.battle-nameplate \{ display: none; \}/);
  assert.match(styles, /\.simple-mode \.battle-scene[\s\S]{0,180}height: clamp\(272px, 78vw, 326px\)/);
  assert.match(styles, /\.simple-mode \.battle-item-belt \{ display: none; \}/);
  assert.match(styles, /padding-bottom: calc\(96px \+ env\(safe-area-inset-bottom\)\)/);
});

test("v29 prioritizes the next learning action and syncs readable display preferences", () => {
  const client = read("app/practice-client.tsx");
  const command = read("app/journey-command-center.tsx");
  const progressRoute = read("app/api/progress/route.ts");
  const schema = read("app/learning-schema.ts");
  const styles = read("app/globals.css");
  assert.match(command, /TODAY’S NEXT STEP · V33/);
  assert.match(command, /journey-system-details/);
  assert.match(client, /practice-options-panel/);
  assert.match(client, /閱讀與語音設定/);
  assert.match(client, /意志（可承受錯誤）/);
  assert.match(client, /架勢[\s\S]{0,100}作答支援程度/);
  assert.match(client, /action: "savePreferences"/);
  assert.match(progressRoute, /payload\.action === "savePreferences"/);
  assert.match(progressRoute, /INSERT INTO interface_preferences/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS interface_preferences/);
  assert.match(styles, /\.reduce-motion \*/);
  assert.match(styles, /\.font-large small/);
  assert.match(styles, /button:not\(\.inline-word-audio\):not\(\.inline-vocab\)[\s\S]{0,80}min-height: 44px/);
});

test("v32 keeps the complete U01-U08 first act durable while keeping leap answers out of formal scheduling", () => {
  const client = read("app/practice-client.tsx");
  const storyComponent = read("app/first-act-story.tsx");
  const storyRoute = read("app/api/story/route.ts");
  const storyStore = read("app/story-store.ts");
  const progressRoute = read("app/api/progress/route.ts");
  const styles = read("app/globals.css");
  assert.match(client, /targetIndex > activeUnitIndex/);
  assert.match(client, /previewOnly: practicePreviewOnly/);
  assert.match(client, /不建立正式題目狀態、FSRS、能力證據、XP 或旅伴好感/);
  assert.match(storyComponent, /ACT I · MAIN STORY · U01–U08 · V33/);
  assert.match(storyComponent, /EVIDENCE BOOK/);
  assert.match(storyComponent, /STORY_ROUTES/);
  assert.match(storyComponent, /CONTENT_DIFFICULTIES/);
  assert.match(storyRoute, /INSERT INTO story_choices/);
  assert.match(storyRoute, /INSERT INTO story_evidence_items/);
  assert.match(storyStore, /CREATE TABLE IF NOT EXISTS story_profiles/);
  assert.match(storyStore, /CREATE TABLE IF NOT EXISTS story_unit_states/);
  assert.match(progressRoute, /const databaseStatements = previewOnly \? \[learningEventStatement\] : \[\.\.\.formalDatabaseStatements, learningEventStatement\]/);
  assert.match(progressRoute, /scheduling: previewOnly \? "story-preview-event-only"/);
  assert.match(progressRoute, /const fingerprintStatement = !previewOnly && variantFingerprint/);
  assert.match(progressRoute, /const companionBondStatement = !previewOnly && isNewQuestionEncounter/);
  assert.match(progressRoute, /INSERT INTO formal_question_evidence/);
  assert.match(client, /unitNumber <= 2 \|\| formalQuestionIds\.has\(state\.question_id\)/);
  assert.match(styles, /\.story-preview-guard/);
  assert.match(styles, /\.preview-practice-banner/);
});

test("v31 opens the main story at U01 and the compact mobile adventure tabs scroll away", () => {
  const client = read("app/practice-client.tsx");
  const storyComponent = read("app/first-act-story.tsx");
  const storyStore = read("app/story-store.ts");
  const styles = read("app/globals.css");
  const migration = read("drizzle/0016_black_pride.sql");
  assert.match(client, /useState<UnitId>\("U01"\)/);
  assert.match(storyComponent, /完整主線從 U01 開始/);
  assert.match(storyComponent, /主線從 U01〈名冊上的陌生人〉正式開場/);
  assert.match(storyStore, /target_unit TEXT NOT NULL DEFAULT 'U01'/);
  assert.match(storyStore, /VALUES \(\?1, 'formal', 'standard', 'U01', \?2\)/);
  assert.match(migration, /UPDATE `story_profiles` SET `target_unit` = 'U01'/);
  assert.match(styles, /\.adventure-tabs \{[\s\S]{0,100}position: static/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]{0,1600}\.adventure-tabs[\s\S]{0,380}grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.adventure-tabs button small \{ display: none; \}/);
});

test("v32 chapter cases turn English into actions while preview cases remain non-formal", () => {
  const client = read("app/scenario-mission-client.tsx");
  const content = read("app/chapter-case-content-v32.ts");
  const api = read("app/api/scenario/route.ts");
  const story = read("app/first-act-story.tsx");
  assert.match(client, /SCENARIO_ACTION_COPY/);
  assert.match(client, /previewOnly,/);
  assert.match(client, /storyRoute,/);
  assert.match(client, /matchesAcceptedOutput/);
  assert.match(client, /scenario-document-stack-multi/);
  assert.match(content, /MULTI-DOCUMENT CASE BOSS/);
  assert.match(content, /actionType: "compose"/);
  assert.match(content, /confirm the source/);
  assert.match(api, /const previewOnly = answer\.previewOnly === true/);
  assert.match(api, /if \(!correct && !previewOnly/);
  assert.match(api, /if \(!previewOnly\)/);
  assert.match(api, /INSERT INTO story_evidence_items/);
  assert.match(story, /進入 \$\{chapter\.unit\} 案件行動/);
});

test("v33 learning toolkit keeps notes, bookmarks, custom sets, reports and preferences account-scoped", () => {
  const schema = read("app/learning-schema.ts");
  const route = read("app/api/toolkit/route.ts");
  const client = read("app/learning-toolkit.tsx");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS learning_notes/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS learning_bookmarks/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS custom_practice_sets/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS learning_tool_preferences/);
  assert.match(route, /action === "upsertNote"/);
  assert.match(route, /action === "toggleBookmark"/);
  assert.match(route, /action === "savePracticeSet"/);
  assert.match(route, /buildPeriodReport\(7/);
  assert.match(route, /buildPeriodReport\(30/);
  assert.match(client, /自選練習只作練習紀錄，不冒充正式能力證據/);
  assert.match(client, /SEARCH EVERYTHING/);
  assert.match(client, /G01–G25 REFERENCE/);
});

test("v33 full backup is same-account only and restores strict evidence from an owned backup", () => {
  const backup = read("app/backup-store.ts");
  const exportRoute = read("app/api/toolkit/export/route.ts");
  assert.match(backup, /account-scoped-full-backup/);
  assert.match(backup, /value\.ownerKey !== user\.key/);
  assert.match(backup, /restored-only-from-same-account-backup/);
  assert.match(backup, /DELETE FROM \$\{quotedIdentifier\(config\.name\)\} WHERE user_key = \?1/);
  assert.match(exportRoute, /format === "csv"/);
  assert.match(exportRoute, /everyday-english-backup/);
});

test("v33 speech choices apply to practice, course and scenario audio without changing evidence rules", () => {
  const client = read("app/practice-client.tsx");
  const scenario = read("app/scenario-mission-client.tsx");
  const progressRoute = read("app/api/progress/route.ts");
  assert.match(client, /utterance\.lang = speechAccent/);
  assert.match(client, /utterance\.rate = speechRate/);
  assert.match(scenario, /utterance\.lang = speechAccent/);
  assert.match(scenario, /utterance\.rate = speechRate/);
  assert.match(progressRoute, /INSERT INTO learning_tool_preferences/);
  assert.match(client, /速度是學習偏好，不會改變聽力模式的首聽、重播與嚴格證據規則/);
});

test("v33 gives U09-U40 a playable English-action case framework and keeps offline cache away from APIs", () => {
  const campaign = read("app/campaign-case-files.ts");
  const client = read("app/practice-client.tsx");
  const worker = read("public/sw.js");
  assert.match(campaign, /U09–U16/);
  assert.match(campaign, /U17–U26/);
  assert.match(campaign, /U27–U34/);
  assert.match(campaign, /U35–U40/);
  assert.match(campaign, /QUESTIONS\.filter\(\(question\) => question\.unit === unit\.id\)/);
  assert.match(client, /campaign-case-brief/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /request\.mode === "navigate"/);
});
