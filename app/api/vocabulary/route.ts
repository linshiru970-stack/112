import { createEmptyCard, fsrs, Rating, type Card, type CardInput, type Grade } from "ts-fsrs";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getVocabulary, getVocabularyMemoryId, getVocabularyStorageAliases } from "../../content";
import { ensureVocabularySchema } from "../../vocabulary-store";

type D1Row = Record<string, unknown>;

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ["10m"],
  relearning_steps: ["10m"],
});

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("雲端單字資料庫尚未連線。");
  return database;
}

async function currentUser() {
  const user = await getChatGPTUser();
  return {
    key: user?.email || "demo-local",
    name: user?.displayName || "試行使用者",
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "單字進度同步失敗。";
}

function parseCard(value: unknown): CardInput | Card {
  if (typeof value !== "string") return createEmptyCard<Card>(new Date());
  try {
    return JSON.parse(value) as CardInput;
  } catch {
    return createEmptyCard<Card>(new Date());
  }
}

function dateToIso(value: CardInput["due"] | Card["due"]) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mastery(row: D1Row) {
  const reviewCount = Number(row.review_count ?? 0);
  const lastRating = Number(row.last_rating ?? 0);
  const card = parseCard(row.card_json);
  if (!reviewCount) return { label: "已收藏", level: 0 };
  if (lastRating === Rating.Again) return { label: "需要重學", level: 1 };
  if (card.state === 2 && card.stability >= 21) return { label: "穩定記得", level: 4 };
  if (card.state === 2) return { label: "持續複習", level: 3 };
  if (reviewCount >= 2) return { label: "正在建立", level: 2 };
  return { label: "剛開始", level: 1 };
}

export async function GET() {
  try {
    const database = await getDatabase();
    await ensureVocabularySchema(database);
    const user = await currentUser();
    const now = new Date().toISOString();
    const result = await database
      .prepare("SELECT * FROM vocabulary_states WHERE user_key = ?1 ORDER BY next_review_at ASC")
      .bind(user.key)
      .all<D1Row>();
    const stateRows = (result.results ?? []) as unknown as D1Row[];
    const canonicalRows = new Map<string, D1Row>();
    let excludedLegacyCount = 0;
    let mergedAliasCount = 0;
    for (const row of stateRows) {
      const originalId = String(row.vocab_id ?? "");
      const canonicalId = getVocabularyMemoryId(originalId);
      if (!canonicalId) {
        excludedLegacyCount += 1;
        continue;
      }
      const normalized = { ...row, vocab_id: canonicalId };
      const current = canonicalRows.get(canonicalId);
      if (!current) {
        canonicalRows.set(canonicalId, normalized);
        continue;
      }
      mergedAliasCount += 1;
      const currentTime = Date.parse(String(current.updated_at ?? current.created_at ?? ""));
      const nextTime = Date.parse(String(normalized.updated_at ?? normalized.created_at ?? ""));
      if (!Number.isFinite(currentTime) || (Number.isFinite(nextTime) && nextTime >= currentTime)) canonicalRows.set(canonicalId, normalized);
    }
    const rows = [...canonicalRows.values()].map((row: D1Row) => ({
      ...row,
      due: String(row.next_review_at ?? "") <= now,
      mastery: mastery(row),
    }));

    return Response.json({
      states: rows,
      dueCount: rows.filter((row: D1Row & { due: boolean }) => row.due).length,
      synced: user.key !== "demo-local",
      mergedAliasCount,
      excludedLegacyCount,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: "add" | "rate" | "note";
      vocabId?: string;
      rating?: number;
      note?: string;
    };
    const requestedEntry = payload.vocabId ? getVocabulary(payload.vocabId) : undefined;
    const memoryId = payload.vocabId ? getVocabularyMemoryId(payload.vocabId) : undefined;
    const entry = memoryId ? getVocabulary(memoryId) : undefined;
    if (!requestedEntry || !entry || !memoryId || !payload.action) {
      return Response.json({ error: "找不到這個單字，請重新整理後再試。" }, { status: 400 });
    }
    if (payload.action === "rate" && ![1, 2, 3, 4].includes(Number(payload.rating))) {
      return Response.json({ error: "單字熟悉度資料不完整。" }, { status: 400 });
    }
    if (payload.action === "note" && typeof payload.note !== "string") {
      return Response.json({ error: "筆記內容不完整。" }, { status: 400 });
    }

    const database = await getDatabase();
    await ensureVocabularySchema(database);
    const user = await currentUser();
    const now = new Date();
    const nowIso = now.toISOString();
    const aliases = getVocabularyStorageAliases(memoryId);
    const placeholders = aliases.map((_, index) => `?${index + 2}`).join(", ");
    const previous = await database
      .prepare(`SELECT * FROM vocabulary_states WHERE user_key = ?1 AND vocab_id IN (${placeholders}) ORDER BY updated_at DESC LIMIT 1`)
      .bind(user.key, ...aliases)
      .first<D1Row>();

    if (payload.action === "note") {
      const note = payload.note!.trim().slice(0, 1200);
      const baseCard = parseCard(previous?.card_json);
      const nextReview = previous?.next_review_at ? String(previous.next_review_at) : dateToIso(baseCard.due);
      await database
        .prepare(`INSERT INTO vocabulary_states (user_key, vocab_id, unit, item, card_json, last_rating, review_count, next_review_at, note, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
          ON CONFLICT(user_key, vocab_id) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at`)
        .bind(user.key, memoryId, entry.unit, entry.item, JSON.stringify(baseCard), previous?.last_rating ?? null, Number(previous?.review_count ?? 0), nextReview, note, nowIso)
        .run();
      return Response.json({ saved: true, note, synced: user.key !== "demo-local" });
    }

    if (payload.action === "add") {
      if (!previous || String(previous.vocab_id ?? "") !== memoryId) {
        const card = previous?.card_json ? parseCard(previous.card_json) : createEmptyCard<Card>(now);
        const nextReview = previous?.next_review_at ? String(previous.next_review_at) : dateToIso(card.due);
        await database
          .prepare(`INSERT INTO vocabulary_states (user_key, vocab_id, unit, item, card_json, last_rating, review_count, next_review_at, note, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ON CONFLICT(user_key, vocab_id) DO NOTHING`)
          .bind(user.key, memoryId, entry.unit, entry.item, JSON.stringify(card), previous?.last_rating ?? null, Number(previous?.review_count ?? 0), nextReview, String(previous?.note ?? ""), nowIso)
          .run();
      }
      return Response.json({ saved: true, synced: user.key !== "demo-local" });
    }

    const rating = Number(payload.rating) as Grade;
    const currentCard = parseCard(previous?.card_json);
    const result = scheduler.next(currentCard, now, rating);
    const reviewCount = Number(previous?.review_count ?? 0) + 1;
    const nextReview = result.card.due.toISOString();

    await database.batch([
      database
        .prepare(`INSERT INTO vocabulary_states (user_key, vocab_id, unit, item, card_json, last_rating, review_count, next_review_at, note, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
          ON CONFLICT(user_key, vocab_id) DO UPDATE SET unit = excluded.unit, item = excluded.item, card_json = excluded.card_json, last_rating = excluded.last_rating, review_count = excluded.review_count, next_review_at = excluded.next_review_at, updated_at = excluded.updated_at`)
        .bind(user.key, memoryId, entry.unit, entry.item, JSON.stringify(result.card), rating, reviewCount, nextReview, String(previous?.note ?? ""), nowIso),
      database
        .prepare("INSERT INTO vocabulary_attempts (user_key, vocab_id, rating, reviewed_at) VALUES (?1, ?2, ?3, ?4)")
        .bind(user.key, memoryId, rating, nowIso),
    ]);

    return Response.json({
      saved: true,
      nextReviewAt: nextReview,
      reviewCount,
      synced: user.key !== "demo-local",
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
