import { COMPANIONS, DEFAULT_COMPANION_ID } from "./companions";

export async function seedCompanionStates(database: D1Database, userKey: string, now = new Date().toISOString()) {
  await database.batch(COMPANIONS.map((companion) => database
    .prepare(`INSERT OR IGNORE INTO companion_states (user_key, companion_id, affinity, selected, updated_at)
      VALUES (?1, ?2, 0, ?3, ?4)`)
    .bind(userKey, companion.id, companion.id === DEFAULT_COMPANION_ID ? 1 : 0, now)));
}
