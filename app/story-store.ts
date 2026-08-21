import { FIRST_ACT_CHAPTERS, type ContentDifficultyId, type StoryRouteId } from "./story-content";

export type StoryProfile = {
  selectedRoute: StoryRouteId;
  contentDifficulty: ContentDifficultyId;
  targetUnit: string;
  updatedAt: string | null;
};

export type StoryUnitState = {
  unit: string;
  status: "explored" | "completed";
  visitCount: number;
  firstSeenAt: string;
  updatedAt: string;
};

export type StoryChoiceState = {
  unit: string;
  choiceId: string;
  chosenAt: string;
};

export type StoryEvidenceState = {
  evidenceId: string;
  unit: string;
  collectedAt: string;
};

export type StoryPayload = {
  profile: StoryProfile;
  units: StoryUnitState[];
  choices: StoryChoiceState[];
  evidence: StoryEvidenceState[];
  synced: boolean;
};

export const STORY_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS story_profiles (
    user_key TEXT PRIMARY KEY,
    selected_route TEXT NOT NULL DEFAULT 'formal',
    content_difficulty TEXT NOT NULL DEFAULT 'standard',
    target_unit TEXT NOT NULL DEFAULT 'U01',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS story_unit_states (
    user_key TEXT NOT NULL,
    unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'explored',
    visit_count INTEGER NOT NULL DEFAULT 1,
    first_seen_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_key, unit)
  )`,
  `CREATE TABLE IF NOT EXISTS story_choices (
    user_key TEXT NOT NULL,
    unit TEXT NOT NULL,
    choice_id TEXT NOT NULL,
    chosen_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_key, unit)
  )`,
  `CREATE TABLE IF NOT EXISTS story_evidence_items (
    user_key TEXT NOT NULL,
    evidence_id TEXT NOT NULL,
    unit TEXT NOT NULL,
    collected_at TEXT NOT NULL,
    PRIMARY KEY (user_key, evidence_id)
  )`,
  "CREATE INDEX IF NOT EXISTS story_unit_states_user_updated_idx ON story_unit_states (user_key, updated_at)",
  "CREATE INDEX IF NOT EXISTS story_evidence_user_unit_idx ON story_evidence_items (user_key, unit)",
];

export async function ensureStorySchema(database: D1Database) {
  await database.batch(STORY_SCHEMA_STATEMENTS.map((statement) => database.prepare(statement)));
}

function isStoryRoute(value: unknown): value is StoryRouteId {
  return value === "formal" || value === "backtrack" || value === "leap";
}

function isContentDifficulty(value: unknown): value is ContentDifficultyId {
  return value === "steady" || value === "standard" || value === "leap";
}

export function normalizeStoryRoute(value: unknown): StoryRouteId {
  return isStoryRoute(value) ? value : "formal";
}

export function normalizeContentDifficulty(value: unknown): ContentDifficultyId {
  return isContentDifficulty(value) ? value : "standard";
}

export async function readStoryPayload(database: D1Database, userKey: string, synced: boolean): Promise<StoryPayload> {
  await ensureStorySchema(database);
  const now = new Date().toISOString();
  await database
    .prepare(`INSERT INTO story_profiles (user_key, selected_route, content_difficulty, target_unit, updated_at)
      VALUES (?1, 'formal', 'standard', 'U01', ?2)
      ON CONFLICT(user_key) DO NOTHING`)
    .bind(userKey, now)
    .run();

  const [profile, units, choices, evidence] = await Promise.all([
    database
      .prepare("SELECT selected_route, content_difficulty, target_unit, updated_at FROM story_profiles WHERE user_key = ?1")
      .bind(userKey)
      .first<Record<string, unknown>>(),
    database
      .prepare("SELECT unit, status, visit_count, first_seen_at, updated_at FROM story_unit_states WHERE user_key = ?1 ORDER BY unit ASC")
      .bind(userKey)
      .all<Record<string, unknown>>(),
    database
      .prepare("SELECT unit, choice_id, chosen_at FROM story_choices WHERE user_key = ?1 ORDER BY unit ASC")
      .bind(userKey)
      .all<Record<string, unknown>>(),
    database
      .prepare("SELECT evidence_id, unit, collected_at FROM story_evidence_items WHERE user_key = ?1 ORDER BY unit ASC")
      .bind(userKey)
      .all<Record<string, unknown>>(),
  ]);

  return {
    profile: {
      selectedRoute: normalizeStoryRoute(profile?.selected_route),
      contentDifficulty: normalizeContentDifficulty(profile?.content_difficulty),
      targetUnit: FIRST_ACT_CHAPTERS.some((chapter) => chapter.unit === profile?.target_unit) ? String(profile?.target_unit) : "U01",
      updatedAt: profile?.updated_at ? String(profile.updated_at) : null,
    },
    units: (units.results ?? []).map((row) => ({
      unit: String(row.unit ?? ""),
      status: row.status === "completed" ? "completed" : "explored",
      visitCount: Number(row.visit_count ?? 0),
      firstSeenAt: String(row.first_seen_at ?? ""),
      updatedAt: String(row.updated_at ?? ""),
    })),
    choices: (choices.results ?? []).map((row) => ({
      unit: String(row.unit ?? ""),
      choiceId: String(row.choice_id ?? ""),
      chosenAt: String(row.chosen_at ?? ""),
    })),
    evidence: (evidence.results ?? []).map((row) => ({
      evidenceId: String(row.evidence_id ?? ""),
      unit: String(row.unit ?? ""),
      collectedAt: String(row.collected_at ?? ""),
    })),
    synced,
  };
}
