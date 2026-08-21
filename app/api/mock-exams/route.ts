import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureLearningSchema } from "../../learning-schema";

const MOCK_UNITS = new Set(["U35", "U37", "U39"]);

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("雲端模考紀錄資料庫尚未連線。");
  return database;
}

async function currentUser() {
  const user = await getChatGPTUser();
  return { key: user?.email || "demo-local" };
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function boundedInteger(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      unit?: string;
      sourceLabel?: string;
      completedQuestions?: number;
      listeningCorrect?: number;
      readingCorrect?: number;
      durationMinutes?: number;
      interrupted?: boolean;
      localDate?: string;
    };
    const unit = String(payload.unit ?? "");
    const sourceLabel = String(payload.sourceLabel ?? "").trim().slice(0, 160);
    const completedQuestions = boundedInteger(payload.completedQuestions, 1, 200);
    const listeningCorrect = boundedInteger(payload.listeningCorrect, 0, 100);
    const readingCorrect = boundedInteger(payload.readingCorrect, 0, 100);
    const durationMinutes = boundedInteger(payload.durationMinutes, 1, 300);
    const interrupted = payload.interrupted === true;

    if (!MOCK_UNITS.has(unit) || !sourceLabel || completedQuestions === null || durationMinutes === null || !isDate(payload.localDate)) {
      return Response.json({ error: "模考紀錄不完整。" }, { status: 400 });
    }
    if (completedQuestions === 200 && (listeningCorrect === null || readingCorrect === null)) {
      return Response.json({ error: "完整 200 題模考請填 Listening 與 Reading 各自答對題數。" }, { status: 400 });
    }

    const database = await getDatabase();
    await ensureLearningSchema(database);
    const user = await currentUser();
    await database
      .prepare(`INSERT INTO mock_exam_records (user_key, unit, source_label, completed_questions, listening_correct, reading_correct, duration_minutes, interrupted, local_date)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
      .bind(user.key, unit, sourceLabel, completedQuestions, listeningCorrect, readingCorrect, durationMinutes, interrupted ? 1 : 0, payload.localDate)
      .run();

    return Response.json({
      saved: true,
      gatePassed: completedQuestions === 200 && !interrupted && listeningCorrect !== null && readingCorrect !== null,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "模考紀錄保存失敗。" }, { status: 500 });
  }
}
