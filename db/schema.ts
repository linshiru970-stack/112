import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const progressProfiles = sqliteTable("progress_profiles", {
  userKey: text("user_key").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  lastActivityDate: text("last_activity_date"),
  streakCount: integer("streak_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const interfacePreferences = sqliteTable("interface_preferences", {
  userKey: text("user_key").primaryKey(),
  interfaceMode: text("interface_mode").notNull().default("simple"),
  fontScale: text("font_scale").notNull().default("standard"),
  motionMode: text("motion_mode").notNull().default("standard"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const learningToolPreferences = sqliteTable("learning_tool_preferences", {
  userKey: text("user_key").primaryKey(),
  speechAccent: text("speech_accent").notNull().default("en-US"),
  speechRate: real("speech_rate").notNull().default(0.9),
  reportPeriod: text("report_period").notNull().default("week"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const learningNotes = sqliteTable(
  "learning_notes",
  {
    userKey: text("user_key").notNull(),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    unit: text("unit"),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    tagsJson: text("tags_json").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userItem: primaryKey({ columns: [table.userKey, table.itemType, table.itemId] }),
    userUpdated: index("learning_notes_user_updated_idx").on(table.userKey, table.updatedAt),
    userUnit: index("learning_notes_user_unit_idx").on(table.userKey, table.unit, table.itemType),
  }),
);

export const learningBookmarks = sqliteTable(
  "learning_bookmarks",
  {
    userKey: text("user_key").notNull(),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    unit: text("unit"),
    title: text("title").notNull().default(""),
    excerpt: text("excerpt").notNull().default(""),
    tagsJson: text("tags_json").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userItem: primaryKey({ columns: [table.userKey, table.itemType, table.itemId] }),
    userUpdated: index("learning_bookmarks_user_updated_idx").on(table.userKey, table.updatedAt),
    userUnit: index("learning_bookmarks_user_unit_idx").on(table.userKey, table.unit, table.itemType),
  }),
);

export const customPracticeSets = sqliteTable(
  "custom_practice_sets",
  {
    userKey: text("user_key").notNull(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    questionIdsJson: text("question_ids_json").notNull().default("[]"),
    filtersJson: text("filters_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userSet: primaryKey({ columns: [table.userKey, table.id] }),
    userUpdated: index("custom_practice_sets_user_updated_idx").on(table.userKey, table.updatedAt),
  }),
);

export const learningBackupImports = sqliteTable(
  "learning_backup_imports",
  {
    userKey: text("user_key").notNull(),
    id: text("id").notNull(),
    formatVersion: integer("format_version").notNull(),
    restoredTables: integer("restored_tables").notNull().default(0),
    restoredRows: integer("restored_rows").notNull().default(0),
    summaryJson: text("summary_json").notNull().default("{}"),
    importedAt: text("imported_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userImport: primaryKey({ columns: [table.userKey, table.id] }),
    userDate: index("learning_backup_imports_user_date_idx").on(table.userKey, table.importedAt),
  }),
);

export const questionStates = sqliteTable(
  "question_states",
  {
    userKey: text("user_key").notNull(),
    questionId: text("question_id").notNull(),
    unit: text("unit").notNull(),
    kind: text("kind").notNull(),
    attempts: integer("attempts").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    wrongCount: integer("wrong_count").notNull().default(0),
    lastAnswer: text("last_answer"),
    lastCorrect: integer("last_correct"),
    confidence: integer("confidence"),
    intervalDays: real("interval_days").notNull().default(1),
    nextReviewAt: text("next_review_at").notNull(),
    lastAnsweredAt: text("last_answered_at").notNull(),
    latestOutput: text("latest_output"),
  },
  (table) => ({
    userQuestion: primaryKey({ columns: [table.userKey, table.questionId] }),
  }),
);

export const practiceAttempts = sqliteTable("practice_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userKey: text("user_key").notNull(),
  questionId: text("question_id").notNull(),
  unit: text("unit").notNull(),
  kind: text("kind").notNull(),
  answer: text("answer").notNull(),
  correct: integer("correct").notNull(),
  confidence: integer("confidence").notNull(),
  localDate: text("local_date").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const learningSchemaMeta = sqliteTable("learning_schema_meta", {
  schemaKey: text("schema_key").primaryKey(),
  version: integer("version").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const learningEvents = sqliteTable(
  "learning_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userKey: text("user_key").notNull(),
    eventType: text("event_type").notNull(),
    entityId: text("entity_id").notNull(),
    unit: text("unit"),
    kind: text("kind"),
    answer: text("answer"),
    firstAnswer: text("first_answer"),
    correct: integer("correct"),
    confidence: integer("confidence"),
    attemptNumber: integer("attempt_number"),
    replayCount: integer("replay_count").notNull().default(0),
    skillTagsJson: text("skill_tags_json").notNull().default("[]"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    localDate: text("local_date"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userCreated: index("learning_events_user_created_idx").on(table.userKey, table.createdAt),
    userEntity: index("learning_events_entity_idx").on(table.userKey, table.entityId, table.eventType),
  }),
);

export const answerReceipts = sqliteTable(
  "answer_receipts",
  {
    userKey: text("user_key").notNull(),
    requestId: text("request_id").notNull(),
    questionId: text("question_id").notNull(),
    responseJson: text("response_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userRequest: primaryKey({ columns: [table.userKey, table.requestId] }),
    userQuestion: index("answer_receipts_question_idx").on(table.userKey, table.questionId, table.createdAt),
  }),
);

export const questionFingerprintEvidence = sqliteTable(
  "question_fingerprint_evidence",
  {
    userKey: text("user_key").notNull(),
    fingerprint: text("fingerprint").notNull(),
    questionId: text("question_id").notNull(),
    family: text("family").notNull(),
    skillTagsJson: text("skill_tags_json").notNull().default("[]"),
    firstSeenAt: text("first_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userFingerprint: primaryKey({ columns: [table.userKey, table.fingerprint] }),
    userQuestion: index("question_fingerprint_question_idx").on(table.userKey, table.questionId),
  }),
);

export const formalQuestionEvidence = sqliteTable(
  "formal_question_evidence",
  {
    userKey: text("user_key").notNull(),
    questionId: text("question_id").notNull(),
    unit: text("unit").notNull(),
    firstFormalAt: text("first_formal_at").notNull(),
    lastFormalAt: text("last_formal_at").notNull(),
  },
  (table) => ({
    userQuestion: primaryKey({ columns: [table.userKey, table.questionId] }),
    userUnit: index("formal_question_evidence_user_unit_idx").on(table.userKey, table.unit, table.lastFormalAt),
  }),
);

export const questionFsrsStates = sqliteTable(
  "question_fsrs_states",
  {
    userKey: text("user_key").notNull(),
    questionId: text("question_id").notNull(),
    cardJson: text("card_json").notNull(),
    lastRating: integer("last_rating"),
    reviewCount: integer("review_count").notNull().default(0),
    nextReviewAt: text("next_review_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userQuestion: primaryKey({ columns: [table.userKey, table.questionId] }),
    due: index("question_fsrs_due_idx").on(table.userKey, table.nextReviewAt),
  }),
);

export const skillFsrsStates = sqliteTable(
  "skill_fsrs_states",
  {
    userKey: text("user_key").notNull(),
    skillTag: text("skill_tag").notNull(),
    cardJson: text("card_json").notNull(),
    lastRating: integer("last_rating"),
    reviewCount: integer("review_count").notNull().default(0),
    distinctQuestionCount: integer("distinct_question_count").notNull().default(0),
    successfulUnseenCount: integer("successful_unseen_count").notNull().default(0),
    lastQuestionId: text("last_question_id"),
    nextReviewAt: text("next_review_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userSkill: primaryKey({ columns: [table.userKey, table.skillTag] }),
    due: index("skill_fsrs_due_idx").on(table.userKey, table.nextReviewAt),
  }),
);

export const mockExamRecords = sqliteTable(
  "mock_exam_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userKey: text("user_key").notNull(),
    unit: text("unit").notNull(),
    sourceLabel: text("source_label").notNull(),
    completedQuestions: integer("completed_questions").notNull(),
    listeningCorrect: integer("listening_correct"),
    readingCorrect: integer("reading_correct"),
    durationMinutes: integer("duration_minutes"),
    interrupted: integer("interrupted").notNull().default(0),
    localDate: text("local_date").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userUnit: index("mock_exam_records_user_unit_idx").on(table.userKey, table.unit, table.createdAt),
  }),
);

export const companionStates = sqliteTable(
  "companion_states",
  {
    userKey: text("user_key").notNull(),
    companionId: text("companion_id").notNull(),
    affinity: integer("affinity").notNull().default(0),
    selected: integer("selected").notNull().default(0),
    lastInteractionAt: text("last_interaction_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userCompanion: primaryKey({ columns: [table.userKey, table.companionId] }),
    selectedCompanion: index("companion_states_selected_idx").on(table.userKey, table.selected),
  }),
);

export const companionInteractions = sqliteTable(
  "companion_interactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userKey: text("user_key").notNull(),
    companionId: text("companion_id").notNull(),
    topicId: text("topic_id").notNull(),
    choiceId: text("choice_id").notNull(),
    playerLine: text("player_line").notNull(),
    reply: text("reply").notNull(),
    affinityDelta: integer("affinity_delta").notNull().default(0),
    localDate: text("local_date").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userCreated: index("companion_interactions_user_created_idx").on(table.userKey, table.createdAt),
    userChoice: index("companion_interactions_choice_idx").on(table.userKey, table.companionId, table.topicId, table.choiceId),
  }),
);

export const bossRuns = sqliteTable(
  "boss_runs",
  {
    id: text("id").primaryKey(),
    userKey: text("user_key").notNull(),
    regionId: text("region_id").notNull(),
    endUnit: text("end_unit").notNull(),
    questionIdsJson: text("question_ids_json").notNull(),
    status: text("status").notNull().default("active"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => ({
    userRegion: index("boss_runs_user_region_idx").on(table.userKey, table.regionId, table.startedAt),
  }),
);

export const bossRunAnswers = sqliteTable(
  "boss_run_answers",
  {
    runId: text("run_id").notNull(),
    userKey: text("user_key").notNull(),
    questionId: text("question_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    correct: integer("correct").notNull(),
    novelEvidence: integer("novel_evidence").notNull(),
    answeredAt: text("answered_at").notNull(),
  },
  (table) => ({
    runQuestion: primaryKey({ columns: [table.runId, table.questionId] }),
    userRun: index("boss_run_answers_user_run_idx").on(table.userKey, table.runId, table.answeredAt),
  }),
);

export const vocabularyStates = sqliteTable(
  "vocabulary_states",
  {
    userKey: text("user_key").notNull(),
    vocabId: text("vocab_id").notNull(),
    unit: text("unit").notNull(),
    item: text("item").notNull(),
    cardJson: text("card_json").notNull(),
    lastRating: integer("last_rating"),
    reviewCount: integer("review_count").notNull().default(0),
    nextReviewAt: text("next_review_at").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userVocabulary: primaryKey({ columns: [table.userKey, table.vocabId] }),
  }),
);

export const vocabularyAttempts = sqliteTable("vocabulary_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userKey: text("user_key").notNull(),
  vocabId: text("vocab_id").notNull(),
  rating: integer("rating").notNull(),
  reviewedAt: text("reviewed_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const gameProfiles = sqliteTable("game_profiles", {
  userKey: text("user_key").primaryKey(),
  coins: integer("coins").notNull().default(80),
  masteryMarks: integer("mastery_marks").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const gameInventory = sqliteTable(
  "game_inventory",
  {
    userKey: text("user_key").notNull(),
    itemId: text("item_id").notNull(),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({ userItem: primaryKey({ columns: [table.userKey, table.itemId] }) }),
);

export const gameEquipment = sqliteTable(
  "game_equipment",
  {
    userKey: text("user_key").notNull(),
    slot: text("slot").notNull(),
    itemId: text("item_id").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({ userSlot: primaryKey({ columns: [table.userKey, table.slot] }) }),
);

export const gameOutfits = sqliteTable(
  "game_outfits",
  {
    userKey: text("user_key").notNull(),
    companionId: text("companion_id").notNull(),
    outfitId: text("outfit_id").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({ userCompanion: primaryKey({ columns: [table.userKey, table.companionId] }) }),
);

export const gameUnlocks = sqliteTable(
  "game_unlocks",
  {
    userKey: text("user_key").notNull(),
    unlockId: text("unlock_id").notNull(),
    source: text("source").notNull().default(""),
    unlockedAt: text("unlocked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({ userUnlock: primaryKey({ columns: [table.userKey, table.unlockId] }) }),
);

export const gameBattleResults = sqliteTable(
  "game_battle_results",
  {
    userKey: text("user_key").notNull(),
    battleId: text("battle_id").notNull(),
    mode: text("mode").notNull(),
    encounterId: text("encounter_id").notNull(),
    outcome: text("outcome").notNull(),
    grade: text("grade").notNull(),
    gold: integer("gold").notNull().default(0),
    rewardJson: text("reward_json").notNull().default("{}"),
    localDate: text("local_date"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userBattle: primaryKey({ columns: [table.userKey, table.battleId] }),
    userCreated: index("game_battle_results_user_created_idx").on(table.userKey, table.createdAt),
  }),
);

export const gameDailyQuests = sqliteTable(
  "game_daily_quests",
  {
    userKey: text("user_key").notNull(),
    localDate: text("local_date").notNull(),
    questId: text("quest_id").notNull(),
    progress: integer("progress").notNull().default(0),
    claimed: integer("claimed").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userQuest: primaryKey({ columns: [table.userKey, table.localDate, table.questId] }),
    userClaimed: index("game_daily_quests_user_claimed_idx").on(table.userKey, table.claimed, table.updatedAt),
  }),
);

export const gameBattleItemUses = sqliteTable(
  "game_battle_item_uses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userKey: text("user_key").notNull(),
    battleId: text("battle_id").notNull(),
    useId: text("use_id").notNull(),
    itemId: text("item_id").notNull(),
    turnIndex: integer("turn_index").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userUse: uniqueIndex("game_battle_item_uses_user_use_idx").on(table.userKey, table.useId),
    userBattle: index("game_battle_item_uses_battle_idx").on(table.userKey, table.battleId, table.turnIndex, table.id),
  }),
);

export const gameBattleReceipts = sqliteTable(
  "game_battle_receipts",
  {
    userKey: text("user_key").notNull(),
    requestId: text("request_id").notNull(),
    battleId: text("battle_id").notNull(),
    claimedAt: text("claimed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userRequest: primaryKey({ columns: [table.userKey, table.requestId] }),
    userBattle: index("game_battle_receipts_battle_idx").on(table.userKey, table.battleId),
  }),
);

export const gameQuestClaimReceipts = sqliteTable(
  "game_quest_claim_receipts",
  {
    userKey: text("user_key").notNull(),
    localDate: text("local_date").notNull(),
    questId: text("quest_id").notNull(),
    claimedAt: text("claimed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userQuest: primaryKey({ columns: [table.userKey, table.localDate, table.questId] }),
  }),
);

export const storyProfiles = sqliteTable("story_profiles", {
  userKey: text("user_key").primaryKey(),
  selectedRoute: text("selected_route").notNull().default("formal"),
  contentDifficulty: text("content_difficulty").notNull().default("standard"),
  targetUnit: text("target_unit").notNull().default("U01"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const storyUnitStates = sqliteTable(
  "story_unit_states",
  {
    userKey: text("user_key").notNull(),
    unit: text("unit").notNull(),
    status: text("status").notNull().default("explored"),
    visitCount: integer("visit_count").notNull().default(1),
    firstSeenAt: text("first_seen_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userUnit: primaryKey({ columns: [table.userKey, table.unit] }),
    userUpdated: index("story_unit_states_user_updated_idx").on(table.userKey, table.updatedAt),
  }),
);

export const storyChoices = sqliteTable(
  "story_choices",
  {
    userKey: text("user_key").notNull(),
    unit: text("unit").notNull(),
    choiceId: text("choice_id").notNull(),
    chosenAt: text("chosen_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userUnit: primaryKey({ columns: [table.userKey, table.unit] }),
  }),
);

export const storyEvidenceItems = sqliteTable(
  "story_evidence_items",
  {
    userKey: text("user_key").notNull(),
    evidenceId: text("evidence_id").notNull(),
    unit: text("unit").notNull(),
    collectedAt: text("collected_at").notNull(),
  },
  (table) => ({
    userEvidence: primaryKey({ columns: [table.userKey, table.evidenceId] }),
    userUnit: index("story_evidence_user_unit_idx").on(table.userKey, table.unit),
  }),
);

export const scenarioRuns = sqliteTable(
  "scenario_runs",
  {
    id: text("id").primaryKey(),
    userKey: text("user_key").notNull(),
    scenarioId: text("scenario_id").notNull(),
    companionId: text("companion_id").notNull(),
    questionIdsJson: text("question_ids_json").notNull().default("[]"),
    currentIndex: integer("current_index").notNull().default(0),
    clues: integer("clues").notNull().default(0),
    setbacks: integer("setbacks").notNull().default(0),
    status: text("status").notNull().default("active"),
    ending: text("ending"),
    processResult: text("process_result"),
    rewardJson: text("reward_json").notNull().default("{}"),
    startedAt: text("started_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => ({
    userStatus: index("scenario_runs_user_status_idx").on(table.userKey, table.status, table.updatedAt),
  }),
);

export const scenarioAnswers = sqliteTable(
  "scenario_answers",
  {
    runId: text("run_id").notNull(),
    userKey: text("user_key").notNull(),
    nodeId: text("node_id").notNull(),
    questionId: text("question_id").notNull(),
    answerReceiptId: text("answer_receipt_id").notNull(),
    correct: integer("correct").notNull(),
    supportMode: text("support_mode").notNull().default("blade"),
    listenCount: integer("listen_count").notNull().default(0),
    replayCount: integer("replay_count").notNull().default(0),
    consequence: text("consequence").notNull().default(""),
    answeredAt: text("answered_at").notNull(),
  },
  (table) => ({
    runNode: primaryKey({ columns: [table.runId, table.nodeId] }),
    userReceipt: uniqueIndex("scenario_answers_user_receipt_idx").on(table.userKey, table.answerReceiptId),
    userNode: index("scenario_answers_user_node_idx").on(table.userKey, table.nodeId, table.answeredAt),
  }),
);

export const journeySessions = sqliteTable(
  "journey_sessions",
  {
    id: text("id").primaryKey(),
    userKey: text("user_key").notNull(),
    localDate: text("local_date").notNull(),
    formalUnit: text("formal_unit").notNull(),
    status: text("status").notNull().default("active"),
    currentStep: text("current_step").notNull().default("practice"),
    stepStartedAt: text("step_started_at").notNull(),
    queueJson: text("queue_json").notNull().default("[]"),
    currentIndex: integer("current_index").notNull().default(0),
    battleStateJson: text("battle_state_json").notNull().default("{}"),
    companionId: text("companion_id").notNull().default("rinka"),
    companionLine: text("companion_line").notNull().default(""),
    repairPlanJson: text("repair_plan_json").notNull().default("{}"),
    summaryJson: text("summary_json").notNull().default("{}"),
    startedAt: text("started_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => ({
    userStatus: index("journey_sessions_user_status_idx").on(table.userKey, table.status, table.updatedAt),
    userDate: index("journey_sessions_user_date_idx").on(table.userKey, table.localDate, table.updatedAt),
  }),
);
