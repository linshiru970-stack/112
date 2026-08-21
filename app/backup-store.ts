import { BACKUP_TABLES, ensureToolkitSchema, type ToolkitUser } from "./toolkit-store";
import { SITE_VERSION } from "./product-version";

type D1Row = Record<string, unknown>;

export type LearningBackup = {
  product: "Everyday English";
  formatVersion: 1;
  siteVersion: string;
  ownerKey: string;
  ownerName: string;
  createdAt: string;
  policy: {
    mode: "account-scoped-full-backup";
    strictEvidence: "restored-only-from-same-account-backup";
  };
  tables: Record<string, D1Row[]>;
};

function quotedIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export async function buildLearningBackup(database: D1Database, user: ToolkitUser): Promise<LearningBackup> {
  await ensureToolkitSchema(database);
  const tables: Record<string, D1Row[]> = {};
  for (const config of BACKUP_TABLES) {
    const result = await database
      .prepare(`SELECT * FROM ${quotedIdentifier(config.name)} WHERE user_key = ?1`)
      .bind(user.key)
      .all<D1Row>();
    tables[config.name] = ((result.results ?? []) as unknown as D1Row[]).map((row) => {
      const { user_key: _userKey, ...safeRow } = row;
      void _userKey;
      return safeRow;
    });
  }
  return {
    product: "Everyday English",
    formatVersion: 1,
    siteVersion: SITE_VERSION,
    ownerKey: user.key,
    ownerName: user.name,
    createdAt: new Date().toISOString(),
    policy: {
      mode: "account-scoped-full-backup",
      strictEvidence: "restored-only-from-same-account-backup",
    },
    tables,
  };
}

function isLearningBackup(value: unknown): value is LearningBackup {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<LearningBackup>;
  return backup.product === "Everyday English"
    && backup.formatVersion === 1
    && typeof backup.ownerKey === "string"
    && Boolean(backup.tables)
    && typeof backup.tables === "object";
}

async function tableColumns(database: D1Database, tableName: string) {
  const result = await database.prepare(`PRAGMA table_info(${quotedIdentifier(tableName)})`).all<D1Row>();
  return new Set(((result.results ?? []) as unknown as D1Row[]).map((row) => String(row.name ?? "")).filter(Boolean));
}

async function runInChunks(database: D1Database, statements: D1PreparedStatement[], size = 80) {
  for (let index = 0; index < statements.length; index += size) {
    await database.batch(statements.slice(index, index + size));
  }
}

export async function restoreLearningBackup(database: D1Database, user: ToolkitUser, value: unknown) {
  if (!isLearningBackup(value)) throw new Error("這不是 Everyday English 可識別的完整備份檔。");
  if (value.ownerKey !== user.key) throw new Error("完整學習證據只能還原到建立備份的同一個帳號。");
  await ensureToolkitSchema(database);

  const declaredTables = Object.entries(value.tables);
  const totalRows = declaredTables.reduce((sum, [, rows]) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  if (totalRows > 75_000) throw new Error("備份資料筆數超過安全上限，請分批處理或重新匯出。");

  let restoredTables = 0;
  let restoredRows = 0;
  for (const config of BACKUP_TABLES) {
    const rawRows = value.tables[config.name];
    if (!Array.isArray(rawRows)) continue;
    const columns = await tableColumns(database, config.name);
    await database
      .prepare(`DELETE FROM ${quotedIdentifier(config.name)} WHERE user_key = ?1`)
      .bind(user.key)
      .run();

    const statements: D1PreparedStatement[] = [];
    for (const rawRow of rawRows) {
      if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) continue;
      const source = rawRow as D1Row;
      const keys = ["user_key", ...Object.keys(source)]
        .filter((key, index, all) => all.indexOf(key) === index)
        .filter((key) => columns.has(key) && !config.omitOnRestore.includes(key as never));
      if (keys.length < 2) continue;
      const values = keys.map((key) => key === "user_key" ? user.key : source[key] === undefined ? null : source[key]);
      const placeholders = keys.map((_, index) => `?${index + 1}`).join(", ");
      const statement = database
        .prepare(`INSERT OR REPLACE INTO ${quotedIdentifier(config.name)} (${keys.map(quotedIdentifier).join(", ")}) VALUES (${placeholders})`)
        .bind(...values);
      statements.push(statement);
    }
    await runInChunks(database, statements);
    restoredTables += 1;
    restoredRows += statements.length;
  }

  const importId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `restore-${Date.now()}`;
  const now = new Date().toISOString();
  await database
    .prepare(`INSERT INTO learning_backup_imports (user_key, id, format_version, restored_tables, restored_rows, summary_json, imported_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
    .bind(user.key, importId, value.formatVersion, restoredTables, restoredRows, JSON.stringify({ backupCreatedAt: value.createdAt, siteVersion: value.siteVersion }), now)
    .run();

  return { importId, restoredTables, restoredRows, importedAt: now };
}
