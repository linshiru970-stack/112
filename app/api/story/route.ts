import { getChatGPTUser } from "../../chatgpt-auth";
import { FIRST_ACT_CHAPTERS, getFirstActChapter } from "../../story-content";
import {
  ensureStorySchema,
  normalizeContentDifficulty,
  normalizeStoryRoute,
  readStoryPayload,
} from "../../story-store";

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("故事進度資料庫尚未連線。");
  return database;
}

async function currentUser() {
  const user = await getChatGPTUser();
  return {
    key: user?.email || "demo-local",
    synced: Boolean(user?.email),
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "故事進度同步失敗。";
}

function validUnit(value: unknown) {
  return typeof value === "string" && FIRST_ACT_CHAPTERS.some((chapter) => chapter.unit === value);
}

export async function GET() {
  try {
    const database = await getDatabase();
    const user = await currentUser();
    return Response.json(await readStoryPayload(database, user.key, user.synced));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: "saveSettings" | "startRoute" | "choose";
      route?: unknown;
      difficulty?: unknown;
      unit?: unknown;
      choiceId?: unknown;
    };
    if (!payload.action || !["saveSettings", "startRoute", "choose"].includes(payload.action)) {
      return Response.json({ error: "故事操作格式不正確。" }, { status: 400 });
    }
    if (!validUnit(payload.unit)) {
      return Response.json({ error: "這個章節目前不在第一幕範圍內。" }, { status: 400 });
    }

    const database = await getDatabase();
    await ensureStorySchema(database);
    const user = await currentUser();
    const now = new Date().toISOString();
    const unit = String(payload.unit);
    const route = normalizeStoryRoute(payload.route);
    const difficulty = normalizeContentDifficulty(payload.difficulty);

    if (payload.action === "choose") {
      const chapter = getFirstActChapter(unit)!;
      const choice = chapter.choices.find((item) => item.id === payload.choiceId);
      if (!choice) return Response.json({ error: "找不到這個故事選擇。" }, { status: 400 });
      await database.batch([
        database
          .prepare(`INSERT INTO story_choices (user_key, unit, choice_id, chosen_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?4)
            ON CONFLICT(user_key, unit) DO UPDATE SET choice_id = excluded.choice_id, chosen_at = excluded.chosen_at, updated_at = excluded.updated_at`)
          .bind(user.key, unit, choice.id, now),
        database
          .prepare(`INSERT INTO story_evidence_items (user_key, evidence_id, unit, collected_at)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(user_key, evidence_id) DO NOTHING`)
          .bind(user.key, chapter.evidence.id, unit, now),
        database
          .prepare(`INSERT INTO story_unit_states (user_key, unit, status, visit_count, first_seen_at, updated_at)
            VALUES (?1, ?2, 'explored', 1, ?3, ?3)
            ON CONFLICT(user_key, unit) DO UPDATE SET updated_at = excluded.updated_at`)
          .bind(user.key, unit, now),
        database
          .prepare(`INSERT INTO story_profiles (user_key, selected_route, content_difficulty, target_unit, updated_at)
            VALUES (?1, 'formal', 'standard', ?2, ?3)
            ON CONFLICT(user_key) DO UPDATE SET target_unit = excluded.target_unit, updated_at = excluded.updated_at`)
          .bind(user.key, unit, now),
      ]);
    } else {
      const statements = [
        database
          .prepare(`INSERT INTO story_profiles (user_key, selected_route, content_difficulty, target_unit, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(user_key) DO UPDATE SET selected_route = excluded.selected_route, content_difficulty = excluded.content_difficulty, target_unit = excluded.target_unit, updated_at = excluded.updated_at`)
          .bind(user.key, route, difficulty, unit, now),
      ];
      if (payload.action === "startRoute") {
        statements.push(database
          .prepare(`INSERT INTO story_unit_states (user_key, unit, status, visit_count, first_seen_at, updated_at)
            VALUES (?1, ?2, 'explored', 1, ?3, ?3)
            ON CONFLICT(user_key, unit) DO UPDATE SET visit_count = story_unit_states.visit_count + 1, updated_at = excluded.updated_at`)
          .bind(user.key, unit, now));
      }
      await database.batch(statements);
    }

    return Response.json(await readStoryPayload(database, user.key, user.synced));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
