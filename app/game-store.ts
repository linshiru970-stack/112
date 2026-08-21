import { STARTER_EQUIPMENT, STARTER_ITEM_COUNTS, STARTER_OUTFITS } from "./game-system";

export async function getGameDatabase() {
  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("冒險背包資料庫尚未連線。");
  return database;
}

const GAME_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS game_profiles (
    user_key TEXT PRIMARY KEY,
    coins INTEGER NOT NULL DEFAULT 80,
    mastery_marks INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS game_inventory (
    user_key TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS game_equipment (
    user_key TEXT NOT NULL,
    slot TEXT NOT NULL,
    item_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, slot)
  )`,
  `CREATE TABLE IF NOT EXISTS game_outfits (
    user_key TEXT NOT NULL,
    companion_id TEXT NOT NULL,
    outfit_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, companion_id)
  )`,
  `CREATE TABLE IF NOT EXISTS game_unlocks (
    user_key TEXT NOT NULL,
    unlock_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, unlock_id)
  )`,
  `CREATE TABLE IF NOT EXISTS game_battle_results (
    user_key TEXT NOT NULL,
    battle_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    encounter_id TEXT NOT NULL,
    outcome TEXT NOT NULL,
    grade TEXT NOT NULL,
    gold INTEGER NOT NULL DEFAULT 0,
    reward_json TEXT NOT NULL DEFAULT '{}',
    local_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, battle_id)
  )`,
  "CREATE INDEX IF NOT EXISTS game_battle_results_user_created_idx ON game_battle_results (user_key, created_at)",
  `CREATE TABLE IF NOT EXISTS game_daily_quests (
    user_key TEXT NOT NULL,
    local_date TEXT NOT NULL,
    quest_id TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    claimed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, local_date, quest_id)
  )`,
  "CREATE INDEX IF NOT EXISTS game_daily_quests_user_claimed_idx ON game_daily_quests (user_key, claimed, updated_at)",
  `CREATE TABLE IF NOT EXISTS game_battle_item_uses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_key TEXT NOT NULL,
    battle_id TEXT NOT NULL,
    use_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    turn_index INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_key, use_id)
  )`,
  "CREATE INDEX IF NOT EXISTS game_battle_item_uses_battle_idx ON game_battle_item_uses (user_key, battle_id, turn_index, id)",
  `CREATE TABLE IF NOT EXISTS game_battle_receipts (
    user_key TEXT NOT NULL,
    request_id TEXT NOT NULL,
    battle_id TEXT NOT NULL,
    claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, request_id)
  )`,
  "CREATE INDEX IF NOT EXISTS game_battle_receipts_battle_idx ON game_battle_receipts (user_key, battle_id)",
  `CREATE TABLE IF NOT EXISTS game_quest_claim_receipts (
    user_key TEXT NOT NULL,
    local_date TEXT NOT NULL,
    quest_id TEXT NOT NULL,
    claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, local_date, quest_id)
  )`,
] as const;

export async function ensureGameSchema(database: D1Database) {
  await database.batch(GAME_SCHEMA_STATEMENTS.map((statement) => database.prepare(statement)));
}

export async function seedGameProfile(database: D1Database, userKey: string) {
  await ensureGameSchema(database);
  const now = new Date().toISOString();
  const statements = [
    database.prepare("INSERT OR IGNORE INTO game_profiles (user_key, coins, created_at, updated_at) VALUES (?1, 80, ?2, ?2)").bind(userKey, now),
    ...Object.entries(STARTER_ITEM_COUNTS).map(([itemId, quantity]) => database
      .prepare("INSERT OR IGNORE INTO game_inventory (user_key, item_id, quantity, updated_at) VALUES (?1, ?2, ?3, ?4)")
      .bind(userKey, itemId, quantity, now)),
    ...STARTER_EQUIPMENT.map((equipmentId) => database
      .prepare("INSERT OR IGNORE INTO game_unlocks (user_key, unlock_id, source, unlocked_at) VALUES (?1, ?2, '初始裝備', ?3)")
      .bind(userKey, `equipment:${equipmentId}`, now)),
    ...Object.values(STARTER_OUTFITS).map((outfitId) => database
      .prepare("INSERT OR IGNORE INTO game_unlocks (user_key, unlock_id, source, unlocked_at) VALUES (?1, ?2, '初始衣裝', ?3)")
      .bind(userKey, `outfit:${outfitId}`, now)),
    database
      .prepare("INSERT OR IGNORE INTO game_unlocks (user_key, unlock_id, source, unlocked_at) SELECT ?1, 'outfit:rinka-rain-vanguard', '凜夏事件《雨夜同行》', ?2 WHERE EXISTS (SELECT 1 FROM game_unlocks WHERE user_key = ?1 AND unlock_id = 'memory:rinka-rainy-night')")
      .bind(userKey, now),
    database
      .prepare("INSERT OR IGNORE INTO game_unlocks (user_key, unlock_id, source, unlocked_at) SELECT ?1, 'equipment:scarlet-chain', '凜夏事件《雨夜同行》', ?2 WHERE EXISTS (SELECT 1 FROM game_unlocks WHERE user_key = ?1 AND unlock_id = 'memory:rinka-rainy-night')")
      .bind(userKey, now),
    database.prepare("INSERT OR IGNORE INTO game_equipment (user_key, slot, item_id, updated_at) VALUES (?1, 'weapon', 'wayfarer-blade', ?2)").bind(userKey, now),
    database.prepare("INSERT OR IGNORE INTO game_equipment (user_key, slot, item_id, updated_at) VALUES (?1, 'charm', 'clear-lantern', ?2)").bind(userKey, now),
    ...Object.entries(STARTER_OUTFITS).map(([companionId, outfitId]) => database
      .prepare("INSERT OR IGNORE INTO game_outfits (user_key, companion_id, outfit_id, updated_at) VALUES (?1, ?2, ?3, ?4)")
      .bind(userKey, companionId, outfitId, now)),
  ];
  await database.batch(statements);
}
