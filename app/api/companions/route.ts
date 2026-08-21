import { getChatGPTUser } from "../../chatgpt-auth";
import { seedCompanionStates } from "../../companion-store";
import {
  COMPANIONS,
  companionAffinityTier,
  getCompanion,
  getCompanionChoice,
  getCompanionTopic,
  type CompanionId,
} from "../../companions";
import { ensureLearningSchema } from "../../learning-schema";
import { ensureJourneySchema } from "../../journey-store";
import { ensureScenarioSchema } from "../../scenario-store";
import { getScenarioMission, SCENARIO_WEAKNESS_INFO } from "../../scenario-mission";

type D1Row = Record<string, unknown>;

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("夥伴資料庫尚未連線。");
  return database;
}

async function currentUser() {
  const user = await getChatGPTUser();
  return { key: user?.email || "demo-local" };
}

function isCompanionId(value: unknown): value is CompanionId {
  return typeof value === "string" && COMPANIONS.some((companion) => companion.id === value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "夥伴資料同步失敗。";
}

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(String(value ?? "")) as T;
  } catch {
    return fallback;
  }
}

async function companionContext(database: D1Database, userKey: string, companionId: CompanionId) {
  const [journeys, scenario, weakness] = await Promise.all([
    database.prepare("SELECT COUNT(*) AS count FROM journey_sessions WHERE user_key = ?1 AND companion_id = ?2 AND status = 'completed'")
      .bind(userKey, companionId).first<{ count: number }>(),
    database.prepare("SELECT scenario_id, process_result, completed_at FROM scenario_runs WHERE user_key = ?1 AND companion_id = ?2 ORDER BY updated_at DESC LIMIT 1")
      .bind(userKey, companionId).first<{ scenario_id: string; process_result: string; completed_at: string }>(),
    database.prepare("SELECT weakness_key, misses, repaired, last_consequence, updated_at FROM scenario_skill_memory WHERE user_key = ?1 AND last_companion_id = ?2 ORDER BY updated_at DESC LIMIT 1")
      .bind(userKey, companionId).first<D1Row>(),
  ]);
  const weaknessKey = String(weakness?.weakness_key ?? "") as keyof typeof SCENARIO_WEAKNESS_INFO;
  return {
    journeyCount: Number(journeys?.count ?? 0),
    missionTitle: getScenarioMission(scenario?.scenario_id)?.title ?? null,
    missionResult: String(scenario?.process_result ?? "") || null,
    weaknessLabel: SCENARIO_WEAKNESS_INFO[weaknessKey]?.label ?? null,
    weaknessPending: Math.max(0, Number(weakness?.misses ?? 0) - Number(weakness?.repaired ?? 0)),
    lastConsequence: String(weakness?.last_consequence ?? "") || null,
  };
}

function contextualReply(base: string, topicId: string, context: Awaited<ReturnType<typeof companionContext>>) {
  if (topicId === "mistake" || topicId === "method" || topicId === "language") {
    if (context.weaknessLabel) return `${base} 我也還記得你在「${context.weaknessLabel}」停過；${context.weaknessPending ? "它還在待修復清單，下一次會換題再驗證。" : "那次已經修復過，但還要等延遲重測才算穩。"}`;
  }
  if (topicId === "expedition" && context.missionTitle) return `${base} 《${context.missionTitle}》留下的路線我還記得，今天會從那段旅程接下去。`;
  if ((topicId === "story" || topicId === "quiet") && context.journeyCount > 0) return `${base} 這是我們一起走完 ${context.journeyCount} 輪後才有的答案。`;
  return base;
}

async function snapshot(database: D1Database, userKey: string) {
  const [states, recent, visited, journeyRows, scenarioRows, weaknessRows] = await Promise.all([
    database
      .prepare("SELECT * FROM companion_states WHERE user_key = ?1 ORDER BY companion_id ASC")
      .bind(userKey)
      .all<D1Row>(),
    database
      .prepare("SELECT * FROM companion_interactions WHERE user_key = ?1 ORDER BY id DESC LIMIT 18")
      .bind(userKey)
      .all<D1Row>(),
    database
      .prepare("SELECT DISTINCT companion_id || ':' || topic_id || ':' || choice_id AS choice_key FROM companion_interactions WHERE user_key = ?1")
      .bind(userKey)
      .all<{ choice_key: string }>(),
    database
      .prepare("SELECT id, companion_id, formal_unit, summary_json, completed_at FROM journey_sessions WHERE user_key = ?1 AND status = 'completed' ORDER BY completed_at DESC LIMIT 18")
      .bind(userKey)
      .all<D1Row>(),
    database
      .prepare("SELECT id, scenario_id, companion_id, process_result, ending, completed_at FROM scenario_runs WHERE user_key = ?1 AND status = 'completed' ORDER BY completed_at DESC LIMIT 18")
      .bind(userKey)
      .all<D1Row>(),
    database
      .prepare("SELECT weakness_key, misses, repaired, last_companion_id, last_consequence, updated_at FROM scenario_skill_memory WHERE user_key = ?1 ORDER BY updated_at DESC LIMIT 18")
      .bind(userKey)
      .all<D1Row>(),
  ]);
  const memories = [
    ...((scenarioRows.results ?? []) as D1Row[]).map((row) => {
      const mission = getScenarioMission(String(row.scenario_id ?? ""));
      return {
        id: `scenario:${String(row.id ?? "")}`,
        companionId: String(row.companion_id ?? ""),
        type: "mission",
        title: mission?.title ?? "U02 情境任務",
        detail: String(row.process_result ?? "") === "clean" ? "你們在沒有繞行的情況下完成任務。" : "你們接受現場後果，修正路線後繼續前進。",
        date: String(row.completed_at ?? ""),
        imageSrc: mission?.imageSrc ?? "/game/scenarios/station-platform-v23.webp",
      };
    }),
    ...((journeyRows.results ?? []) as D1Row[]).map((row) => {
      const summary = parseJson<Record<string, unknown>>(row.summary_json, {});
      const story = summary.story && typeof summary.story === "object" ? summary.story as Record<string, unknown> : {};
      return {
        id: `journey:${String(row.id ?? "")}`,
        companionId: String(row.companion_id ?? ""),
        type: "journey",
        title: story.title ? `旅程 · 《${String(story.title)}》` : `${String(row.formal_unit ?? "U02")} · ${String(summary.journeyLengthLabel ?? "標準")}旅程`,
        detail: Array.isArray(summary.realImprovements) && summary.realImprovements.length
          ? `真正新增：${summary.realImprovements.slice(0, 3).join("、")}`
          : "完成一輪作答、情境、旅伴回應與誠實結算。",
        date: String(row.completed_at ?? ""),
        imageSrc: String(story.imageSrc ?? "") || "/game/battle-bg.webp",
      };
    }),
    ...((weaknessRows.results ?? []) as D1Row[]).filter((row) => Number(row.repaired ?? 0) > 0).map((row) => {
      const key = String(row.weakness_key ?? "") as keyof typeof SCENARIO_WEAKNESS_INFO;
      return {
        id: `repair:${key}:${String(row.updated_at ?? "")}`,
        companionId: String(row.last_companion_id ?? ""),
        type: "repair",
        title: `修復 · ${SCENARIO_WEAKNESS_INFO[key]?.label ?? "情境弱點"}`,
        detail: "這次立即修復已保存；旅伴會記得，但能力仍等延遲重測。",
        date: String(row.updated_at ?? ""),
        imageSrc: "/game/scenarios/station-platform-v23.webp",
      };
    }),
  ].filter((memory) => isCompanionId(memory.companionId)).sort((left, right) => right.date.localeCompare(left.date)).slice(0, 24);
  const contextEntries = await Promise.all(COMPANIONS.map(async (companion) => {
    const context = await companionContext(database, userKey, companion.id);
    const line = context.missionTitle
      ? `我記得我們走過《${context.missionTitle}》${context.weaknessLabel ? `，也記得「${context.weaknessLabel}」那個停頓` : ""}。`
      : context.journeyCount > 0
        ? `我們已一起完成 ${context.journeyCount} 輪旅程；下一輪會從保存的證據接著走。`
        : "我們還沒有共同任務記憶；第一輪完成後，我會把路線與錯因留下來。";
    return [companion.id, line] as const;
  }));
  return {
    states: (states.results ?? []).map((row) => {
      const affinity = Number(row.affinity ?? 0);
      return { ...row, affinity, tier: companionAffinityTier(affinity) };
    }),
    recent: recent.results ?? [],
    visitedChoiceKeys: (visited.results ?? []).map((row) => row.choice_key),
    memories,
    contextLines: Object.fromEntries(contextEntries),
  };
}

export async function GET() {
  try {
    const database = await getDatabase();
    await ensureLearningSchema(database);
    await ensureScenarioSchema(database);
    await ensureJourneySchema(database);
    const user = await currentUser();
    await seedCompanionStates(database, user.key);
    return Response.json({ ...(await snapshot(database, user.key)), synced: user.key !== "demo-local" });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: "select" | "talk";
      companionId?: string;
      topicId?: string;
      choiceId?: string;
      localDate?: string;
    };
    if (!isCompanionId(payload.companionId) || !payload.action) {
      return Response.json({ error: "找不到這位旅伴。" }, { status: 400 });
    }

    const database = await getDatabase();
    await ensureLearningSchema(database);
    await ensureScenarioSchema(database);
    await ensureJourneySchema(database);
    const user = await currentUser();
    const now = new Date().toISOString();
    await seedCompanionStates(database, user.key, now);

    if (payload.action === "select") {
      await database.batch([
        database.prepare("UPDATE companion_states SET selected = 0, updated_at = ?1 WHERE user_key = ?2").bind(now, user.key),
        database.prepare("UPDATE companion_states SET selected = 1, updated_at = ?1 WHERE user_key = ?2 AND companion_id = ?3").bind(now, user.key, payload.companionId),
      ]);
      return Response.json({ saved: true, selected: payload.companionId, ...(await snapshot(database, user.key)) });
    }

    if (payload.action !== "talk" || !payload.topicId || !payload.choiceId || !isDate(payload.localDate)) {
      return Response.json({ error: "對話資料不完整。" }, { status: 400 });
    }
    const topic = getCompanionTopic(payload.companionId, payload.topicId);
    const choice = getCompanionChoice(payload.companionId, payload.topicId, payload.choiceId);
    if (!topic || !choice) return Response.json({ error: "這段對話已經找不到了。" }, { status: 400 });

    const state = await database
      .prepare("SELECT affinity FROM companion_states WHERE user_key = ?1 AND companion_id = ?2")
      .bind(user.key, payload.companionId)
      .first<{ affinity: number }>();
    const affinity = Number(state?.affinity ?? 0);
    if (affinity < topic.minAffinity) {
      return Response.json({ error: `好感 ${topic.minAffinity} 才會解鎖這段對話。` }, { status: 403 });
    }

    const companion = getCompanion(payload.companionId);
    const memoryContext = await companionContext(database, user.key, companion.id);
    const reply = contextualReply(choice.response, topic.id, memoryContext);
    await database.batch([
      database
        .prepare(`UPDATE companion_states
          SET affinity = MIN(100, affinity + 2), last_interaction_at = ?1, updated_at = ?1
          WHERE user_key = ?2 AND companion_id = ?3
            AND NOT EXISTS (
              SELECT 1 FROM companion_interactions
              WHERE user_key = ?2 AND companion_id = ?3 AND topic_id = ?4 AND choice_id = ?5
            )`)
        .bind(now, user.key, companion.id, topic.id, choice.id),
      database
        .prepare(`INSERT INTO companion_interactions (user_key, companion_id, topic_id, choice_id, player_line, reply, affinity_delta, local_date, created_at)
          VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6,
            CASE WHEN EXISTS (
              SELECT 1 FROM companion_interactions
              WHERE user_key = ?1 AND companion_id = ?2 AND topic_id = ?3 AND choice_id = ?4
            ) THEN 0 ELSE 2 END,
            ?7, ?8
          )`)
        .bind(user.key, companion.id, topic.id, choice.id, choice.label, reply, payload.localDate, now),
      database
        .prepare("UPDATE companion_states SET last_interaction_at = ?1, updated_at = ?1 WHERE user_key = ?2 AND companion_id = ?3")
        .bind(now, user.key, companion.id),
    ]);
    const latest = await database
      .prepare("SELECT affinity_delta FROM companion_interactions WHERE user_key = ?1 AND companion_id = ?2 ORDER BY id DESC LIMIT 1")
      .bind(user.key, companion.id)
      .first<{ affinity_delta: number }>();
    const gained = Number(latest?.affinity_delta ?? 0);
    const data = await snapshot(database, user.key);
    return Response.json({ saved: true, reply, playerLine: choice.label, gained, ...data });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
