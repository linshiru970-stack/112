import { buildLearningBackup } from "../../../backup-store";
import { getQuestion } from "../../../content";
import { getToolkitDatabase, getToolkitUser, safeJsonArray, toolkitError } from "../../../toolkit-store";

type D1Row = Record<string, unknown>;

function csvCell(value: unknown) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function backupCsv(tables: Record<string, D1Row[]>) {
  const rows: unknown[][] = [["類型", "日期", "單元", "項目 ID", "標題／內容", "結果／狀態", "信心", "筆記", "標籤"]];
  for (const attempt of tables.practice_attempts ?? []) {
    const question = getQuestion(String(attempt.question_id ?? ""));
    rows.push([
      "作答",
      attempt.local_date,
      attempt.unit,
      attempt.question_id,
      question?.prompt ?? "",
      Number(attempt.correct ?? 0) === 1 ? "答對" : "答錯",
      attempt.confidence,
      attempt.answer,
      question?.skill ?? "",
    ]);
  }
  for (const state of tables.vocabulary_states ?? []) {
    rows.push([
      "單字",
      state.updated_at,
      state.unit,
      state.vocab_id,
      state.item,
      `複習 ${Number(state.review_count ?? 0)} 次`,
      state.last_rating,
      state.note,
      "vocabulary",
    ]);
  }
  for (const note of tables.learning_notes ?? []) {
    rows.push([
      "筆記",
      note.updated_at,
      note.unit,
      `${note.item_type}:${note.item_id}`,
      note.title,
      "",
      "",
      note.body,
      safeJsonArray(note.tags_json).join("、"),
    ]);
  }
  for (const bookmark of tables.learning_bookmarks ?? []) {
    rows.push([
      "收藏",
      bookmark.updated_at,
      bookmark.unit,
      `${bookmark.item_type}:${bookmark.item_id}`,
      bookmark.title,
      "已收藏",
      "",
      bookmark.excerpt,
      safeJsonArray(bookmark.tags_json).join("、"),
    ]);
  }
  for (const practiceSet of tables.custom_practice_sets ?? []) {
    rows.push([
      "自訂題組",
      practiceSet.updated_at,
      "",
      practiceSet.id,
      practiceSet.name,
      `${safeJsonArray(practiceSet.question_ids_json).length} 題`,
      "",
      practiceSet.description,
      "custom-practice",
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export async function GET(request: Request) {
  try {
    const database = await getToolkitDatabase();
    const user = await getToolkitUser();
    const backup = await buildLearningBackup(database, user);
    const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
    if (format === "csv") {
      return new Response(backupCsv(backup.tables), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="everyday-english-${date}.csv"`,
          "cache-control": "no-store",
        },
      });
    }
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="everyday-english-backup-${date}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: toolkitError(error, "無法產生學習備份。") }, { status: 500 });
  }
}
