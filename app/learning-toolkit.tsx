"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  QUESTIONS,
  UNITS,
  VOCABULARY,
  getQuestionSkillTags,
  getSkillTagLabel,
  type UnitId,
} from "./content";
import { GRAMMAR_LIBRARY } from "./grammar-library";

export type SpeechAccent = "en-US" | "en-GB" | "en-AU";
export type ReportPeriod = "week" | "month";
type ToolkitTab = "search" | "library" | "sets" | "grammar" | "reports" | "backup";
type SearchType = "all" | "question" | "unit" | "vocabulary" | "grammar";
type ItemType = Exclude<SearchType, "all"> | "lesson" | "general";

type NoteRow = {
  item_type: ItemType;
  item_id: string;
  unit?: string | null;
  title: string;
  body: string;
  tags?: string[];
  updated_at: string;
};

type BookmarkRow = {
  item_type: ItemType;
  item_id: string;
  unit?: string | null;
  title: string;
  excerpt: string;
  tags?: string[];
  updated_at: string;
};

type PracticeSetRow = {
  id: string;
  name: string;
  description: string;
  questionIds?: string[];
  filters?: Record<string, unknown>;
  updated_at: string;
};

type PeriodReport = {
  days: number;
  firstDate: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
  highConfidenceWrong: number;
  activeMinutes: number;
  activeDays: number;
  listeningAnswers: number;
  listeningReplays: number;
  vocabularyReviews: number;
  daily: Array<{ date: string; attempts: number; correct: number; activeMs: number }>;
};

type ToolkitPayload = {
  user?: { name: string; synced: boolean };
  notes?: NoteRow[];
  bookmarks?: BookmarkRow[];
  practiceSets?: PracticeSetRow[];
  preferences?: { speechAccent: SpeechAccent; speechRate: number; reportPeriod: ReportPeriod; updatedAt?: string | null };
  report?: {
    week: PeriodReport;
    month: PeriodReport;
    dueQuestions: number;
    dueVocabulary: number;
    streak: number;
    lastActivityDate?: string | null;
    skills: Array<{ tag: string; label: string; reviewCount: number; distinctQuestions: number; unseenSuccess: number; nextReviewAt: string; validated: boolean }>;
    latestMocks: Array<Record<string, unknown>>;
    estimatedMockRange?: { low: number; high: number; center: number; source: string; date: string; caveat: string } | null;
  };
  recentImports?: Array<{ id: string; restored_tables: number; restored_rows: number; imported_at: string }>;
  error?: string;
};

type SearchItem = {
  type: Exclude<SearchType, "all">;
  id: string;
  unit?: UnitId;
  title: string;
  summary: string;
  tags: string[];
  questionId?: string;
};

type Props = {
  activeUnit: UnitId;
  speechAccent: SpeechAccent;
  speechRate: number;
  reportPeriod: ReportPeriod;
  onSpeechPreferencesChange: (accent: SpeechAccent, rate: number, period: ReportPeriod) => void;
  onStartPractice: (questionIds: string[], name: string) => void;
  onOpenUnit: (unit: UnitId) => void;
  onSpeak: (text: string) => void;
};

const TAB_OPTIONS: Array<{ id: ToolkitTab; label: string; short: string }> = [
  { id: "search", label: "統一搜尋", short: "搜尋" },
  { id: "library", label: "筆記收藏", short: "筆記" },
  { id: "sets", label: "自訂題庫", short: "題庫" },
  { id: "grammar", label: "文法庫", short: "文法" },
  { id: "reports", label: "週期報告", short: "報告" },
  { id: "backup", label: "匯出備份", short: "備份" },
];

const TYPE_LABELS: Record<Exclude<SearchType, "all">, string> = {
  question: "題目",
  unit: "課程",
  vocabulary: "單字",
  grammar: "文法",
};

const OFFLINE_QUEUE_KEY = "english-toolkit-offline-queue-v1";

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" });
}

function parseTagInput(value: string) {
  return [...new Set(value.split(/[,，、#\s]+/).map((tag) => tag.trim()).filter(Boolean))].slice(0, 10);
}

function newClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readOfflineQueue() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object").slice(-50) as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
}

function queueOfflineAction(action: Record<string, unknown>) {
  const queue = [...readOfflineQueue(), { ...action, queuedAt: new Date().toISOString() }].slice(-50);
  window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

async function toolkitPost(payload: Record<string, unknown>) {
  const response = await fetch("/api/toolkit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as Record<string, unknown> & { error?: string };
  if (!response.ok) throw new Error(result.error || "學習工具同步失敗。");
  return result;
}

export function StudyItemActions({ itemType, itemId, unit, title, excerpt, onChanged }: {
  itemType: ItemType;
  itemId: string;
  unit?: string;
  title: string;
  excerpt?: string;
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function bookmark() {
    setBusy(true);
    try {
      await toolkitPost({ action: "toggleBookmark", active: true, itemType, itemId, unit, title, excerpt: excerpt ?? "", tags: parseTagInput(tags) });
      setNotice("已收藏；可在學習工具統一整理。");
      onChanged?.();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "收藏失敗。");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await toolkitPost({ action: "upsertNote", itemType, itemId, unit, title, body, tags: parseTagInput(tags) });
      setNotice("題目筆記已跨裝置同步。");
      setOpen(false);
      onChanged?.();
    } catch (error) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        queueOfflineAction({ action: "upsertNote", itemType, itemId, unit, title, body, tags: parseTagInput(tags) });
        setNotice("目前離線；筆記草稿已留在這台裝置，連線後再同步。");
        setOpen(false);
      } else {
        setNotice(error instanceof Error ? error.message : "筆記保存失敗。");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="study-item-actions">
      <div><button type="button" onClick={() => void bookmark()} disabled={busy}>☆ 收藏</button><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>✎ 題目筆記</button></div>
      {open && <form onSubmit={save}><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={8000} rows={3} placeholder="記下錯因、判斷線索或下次要注意的地方…" /><input value={tags} onChange={(event) => setTags(event.target.value)} maxLength={180} placeholder="標籤：時態、易錯、重聽" /><button type="submit" disabled={busy || !body.trim()}>{busy ? "同步中…" : "儲存筆記"}</button></form>}
      {notice && <small aria-live="polite">{notice}</small>}
    </div>
  );
}

export function LearningToolkit({ activeUnit, speechAccent, speechRate, reportPeriod, onSpeechPreferencesChange, onStartPractice, onOpenUnit, onSpeak }: Props) {
  const [payload, setPayload] = useState<ToolkitPayload>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<ToolkitTab>("search");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<SearchType>("all");
  const [unitFilter, setUnitFilter] = useState<"all" | UnitId>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<SearchItem | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [setName, setSetName] = useState("");
  const [setDescription, setSetDescription] = useState("");
  const [smartUnit, setSmartUnit] = useState<"all" | UnitId>(activeUnit);
  const [smartSkill, setSmartSkill] = useState("all");
  const [smartCount, setSmartCount] = useState(12);
  const [grammarQuery, setGrammarQuery] = useState("");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [online, setOnline] = useState(true);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [reportNow] = useState(() => Date.now());

  async function loadToolkit(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/toolkit", { cache: "no-store" });
      const data = await response.json() as ToolkitPayload;
      if (!response.ok) throw new Error(data.error || "學習工具同步失敗。");
      setPayload(data);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "學習工具同步失敗。");
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  async function flushOfflineQueue() {
    const queue = readOfflineQueue();
    if (!queue.length || !navigator.onLine) return;
    const remaining: Record<string, unknown>[] = [];
    for (const action of queue) {
      try {
        const { queuedAt: _queuedAt, ...payloadAction } = action;
        void _queuedAt;
        await toolkitPost(payloadAction);
      } catch {
        remaining.push(action);
      }
    }
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    if (remaining.length < queue.length) {
      setNotice(remaining.length ? "部分離線草稿已同步，仍有草稿等待重試。" : "離線草稿已同步到帳號。");
      await loadToolkit(true);
    }
  }

  useEffect(() => {
    const initialTimeout = window.setTimeout(() => {
      void loadToolkit();
      setOnline(navigator.onLine);
    }, 0);
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void flushOfflineQueue();
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timeout = window.setTimeout(() => void flushOfflineQueue(), 500);
    return () => {
      window.clearTimeout(initialTimeout);
      window.clearTimeout(timeout);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchCatalog = useMemo<SearchItem[]>(() => {
    const units: SearchItem[] = UNITS.map((unit) => ({
      type: "unit", id: unit.id, unit: unit.id, title: `${unit.id} · ${unit.title}`,
      summary: `${unit.goal}｜${unit.grammar}`, tags: [unit.stage, "課程", ...unit.grammar.split(/[、／/]/).slice(0, 4)],
    }));
    const questions: SearchItem[] = QUESTIONS.map((question) => ({
      type: "question", id: question.id, unit: question.unit, questionId: question.id,
      title: question.outputPrompt ? `${question.prompt} ${question.outputPrompt}` : question.prompt,
      summary: question.explanation,
      tags: [question.skill, ...getQuestionSkillTags(question).map(getSkillTagLabel), question.sourceLabel],
    }));
    const vocabulary: SearchItem[] = VOCABULARY.map((entry) => ({
      type: "vocabulary", id: entry.id, unit: entry.unit, title: entry.item,
      summary: [entry.meaning, entry.collocation, entry.example, entry.detail].filter(Boolean).join("｜"),
      tags: [entry.source === "bbc" ? "BBC" : `核心 ${entry.level ?? ""}`, entry.partOfSpeech ?? "單字", entry.unit],
    }));
    const grammar: SearchItem[] = GRAMMAR_LIBRARY.map((guide) => ({
      type: "grammar", id: guide.id, unit: guide.firstUnit as UnitId, title: `${guide.id} · ${guide.title}`,
      summary: `${guide.pattern}｜${guide.use}`, tags: [...guide.tags, guide.firstUnit],
    }));
    return [...units, ...questions, ...vocabulary, ...grammar];
  }, []);

  const visibleSearchItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const normalizedTag = tagFilter.trim().toLocaleLowerCase();
    return searchCatalog.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (unitFilter !== "all" && item.unit !== unitFilter) return false;
      if (normalizedTag && !item.tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedTag))) return false;
      if (!normalizedQuery) return typeFilter !== "all" || unitFilter !== "all" || Boolean(normalizedTag);
      return [item.id, item.title, item.summary, item.unit, ...item.tags].join(" ").toLocaleLowerCase().includes(normalizedQuery);
    }).slice(0, 80);
  }, [query, searchCatalog, tagFilter, typeFilter, unitFilter]);

  const bookmarkKeys = useMemo(() => new Set((payload.bookmarks ?? []).map((item) => `${item.item_type}:${item.item_id}`)), [payload.bookmarks]);
  const skillOptions = useMemo(() => [...new Set(QUESTIONS.map((question) => question.skill))].sort((left, right) => left.localeCompare(right, "zh-Hant")), []);
  const smartQuestionIds = useMemo(() => QUESTIONS.filter((question) => {
    if (smartUnit !== "all" && question.unit !== smartUnit) return false;
    if (smartSkill !== "all" && question.skill !== smartSkill) return false;
    return true;
  }).slice(0, smartCount).map((question) => question.id), [smartCount, smartSkill, smartUnit]);
  const report = payload.report?.[reportPeriod];
  const maxDailyAttempts = Math.max(1, ...(report?.daily ?? []).map((day) => day.attempts));

  async function postAndReload(action: Record<string, unknown>, success: string, queueable = false) {
    setBusy(true);
    try {
      await toolkitPost(action);
      setNotice(success);
      await loadToolkit(true);
      return true;
    } catch (error) {
      if (queueable && !navigator.onLine) {
        queueOfflineAction(action);
        setNotice("目前離線；變更已留在這台裝置，恢復連線後會同步。");
        return true;
      }
      setNotice(error instanceof Error ? error.message : "操作失敗。");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleBookmark(item: SearchItem) {
    const active = !bookmarkKeys.has(`${item.type}:${item.id}`);
    await postAndReload({ action: "toggleBookmark", active, itemType: item.type, itemId: item.id, unit: item.unit, title: item.title, excerpt: item.summary, tags: item.tags }, active ? "已加入收藏。" : "已移出收藏。", true);
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    if (!editingItem || !noteBody.trim()) return;
    const saved = await postAndReload({ action: "upsertNote", itemType: editingItem.type, itemId: editingItem.id, unit: editingItem.unit, title: editingItem.title, body: noteBody, tags: parseTagInput(noteTags) }, "筆記已同步。", true);
    if (saved) {
      setEditingItem(null);
      setNoteBody("");
      setNoteTags("");
    }
  }

  function editExistingNote(note: NoteRow) {
    setEditingItem({ type: note.item_type as SearchItem["type"], id: note.item_id, unit: note.unit as UnitId | undefined, title: note.title, summary: note.body, tags: note.tags ?? [] });
    setNoteBody(note.body);
    setNoteTags((note.tags ?? []).join("、"));
    setTab("library");
  }

  async function savePracticeSet() {
    const questionIds = selectedQuestions.length ? selectedQuestions : smartQuestionIds;
    const name = setName.trim() || `${smartUnit === "all" ? "跨單元" : smartUnit} · ${smartSkill === "all" ? "自訂練習" : smartSkill}`;
    const saved = await postAndReload({
      action: "savePracticeSet",
      id: newClientId("set"),
      name,
      description: setDescription,
      questionIds,
      filters: { unit: smartUnit, skill: smartSkill, source: selectedQuestions.length ? "manual-selection" : "smart-filter" },
    }, `已建立「${name}」。`, true);
    if (saved) {
      setSetName("");
      setSetDescription("");
      setSelectedQuestions([]);
    }
  }

  function updateSpeech(nextAccent: SpeechAccent, nextRate: number, nextPeriod = reportPeriod) {
    onSpeechPreferencesChange(nextAccent, nextRate, nextPeriod);
    setNotice("語音與報告偏好正在同步；全站下一次朗讀立即套用。");
  }

  async function restoreBackup() {
    if (!restoreFile) return;
    if (!window.confirm("完整還原會以備份內容取代這個帳號目前的學習資料。此操作無法自動復原，是否繼續？")) return;
    setBusy(true);
    try {
      const backup = JSON.parse(await restoreFile.text()) as unknown;
      const result = await toolkitPost({ action: "importBackup", confirm: "RESTORE", backup });
      setNotice(`還原完成：${Number(result.restoredRows ?? 0)} 筆、${Number(result.restoredTables ?? 0)} 個資料表。頁面將重新整理。`);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "備份還原失敗。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="learning-toolkit" aria-labelledby="learning-toolkit-title">
      <header className="toolkit-head">
        <div><span>LEARNING TOOLKIT · CLOUD SYNC</span><h3 id="learning-toolkit-title">學習工具</h3><p>把題目、課程、單字、文法、筆記與收藏放在同一個入口；自選練習只作練習紀錄，不冒充正式能力證據。</p></div>
        <div className={online ? "toolkit-online" : "toolkit-offline"}><i />{online ? payload.user?.synced === false ? "本機試行" : "帳號同步" : `離線草稿 ${readOfflineQueue().length}`}</div>
      </header>

      <nav className="toolkit-tabs" aria-label="學習工具分頁">
        {TAB_OPTIONS.map((item) => <button key={item.id} className={tab === item.id ? "toolkit-tab-active" : ""} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}><strong>{item.short}</strong><span>{item.label}</span></button>)}
      </nav>

      {notice && <div className="toolkit-notice" aria-live="polite">{notice}</div>}
      {loading ? <div className="toolkit-loading"><span className="loader" />正在接回筆記、收藏與學習報告…</div> : (
        <>
          {tab === "search" && (
            <div className="toolkit-panel toolkit-search-panel">
              <div className="toolkit-panel-title"><div><span>SEARCH EVERYTHING</span><h4>統一搜尋與標籤</h4></div><b>{visibleSearchItems.length}{visibleSearchItems.length === 80 ? "+" : ""} 筆結果</b></div>
              <div className="toolkit-search-controls">
                <label className="toolkit-search-input"><span>搜尋</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋題目、中文解釋、單字、搭配、文法或 U 編號" /></label>
                <label><span>類型</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as SearchType)}><option value="all">全部類型</option><option value="question">題目</option><option value="unit">課程</option><option value="vocabulary">單字</option><option value="grammar">文法</option></select></label>
                <label><span>單元</span><select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value as "all" | UnitId)}><option value="all">U01–U40</option>{UNITS.map((unit) => <option key={unit.id} value={unit.id}>{unit.id}</option>)}</select></label>
                <label><span>標籤</span><input value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="例如：時態、BBC、閱讀" /></label>
              </div>
              {!query.trim() && typeFilter === "all" && unitFilter === "all" && !tagFilter.trim() ? (
                <div className="toolkit-search-empty"><strong>從所有教材中找同一個概念</strong><p>例如搜尋「現在完成式」、「confirm」、「U15」或「高信心錯」。也可以只選類型、單元或標籤。</p></div>
              ) : visibleSearchItems.length ? (
                <div className="toolkit-result-list">
                  {visibleSearchItems.map((item) => {
                    const selected = Boolean(item.questionId && selectedQuestions.includes(item.questionId));
                    const bookmarked = bookmarkKeys.has(`${item.type}:${item.id}`);
                    return <article key={`${item.type}:${item.id}`}>
                      <div className="toolkit-result-meta"><span>{TYPE_LABELS[item.type]}</span>{item.unit && <b>{item.unit}</b>}{item.tags.slice(0, 3).map((tag) => <em key={tag}>{tag}</em>)}</div>
                      <h5>{item.title}</h5><p>{item.summary}</p>
                      <div className="toolkit-result-actions">
                        {item.questionId && <button className={selected ? "toolkit-action-active" : ""} onClick={() => setSelectedQuestions((current) => selected ? current.filter((id) => id !== item.questionId) : [...current, item.questionId!])}>{selected ? "✓ 已選入題組" : "＋ 選入題組"}</button>}
                        <button className={bookmarked ? "toolkit-action-active" : ""} onClick={() => void toggleBookmark(item)}>{bookmarked ? "★ 已收藏" : "☆ 收藏"}</button>
                        <button onClick={() => { setEditingItem(item); setNoteBody(""); setNoteTags(item.tags.slice(0, 2).join("、")); }}>✎ 筆記</button>
                        {item.unit && <button onClick={() => onOpenUnit(item.unit!)}>打開 {item.unit}</button>}
                        {item.type === "vocabulary" && <button onClick={() => onSpeak(item.title)}>▶ 發音</button>}
                      </div>
                    </article>;
                  })}
                </div>
              ) : <div className="toolkit-search-empty"><strong>沒有符合的內容</strong><p>清除一個篩選條件，或換成更短的關鍵字。</p></div>}
              {selectedQuestions.length > 0 && <div className="toolkit-selection-bar"><span>已選 {selectedQuestions.length} 題</span><button onClick={() => setSelectedQuestions([])}>清除</button><button className="primary-button" onClick={() => setTab("sets")}>建立自訂題組</button></div>}
              {editingItem && <form className="toolkit-note-editor" onSubmit={saveNote}><div><span>{TYPE_LABELS[editingItem.type]}筆記</span><strong>{editingItem.title}</strong></div><textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={4} maxLength={8000} placeholder="記下錯因、判斷線索、例句或下次要注意的地方…" /><input value={noteTags} onChange={(event) => setNoteTags(event.target.value)} maxLength={180} placeholder="標籤，用逗號或空格分隔" /><div><button type="button" onClick={() => setEditingItem(null)}>取消</button><button className="primary-button" type="submit" disabled={busy || !noteBody.trim()}>儲存並同步</button></div></form>}
            </div>
          )}

          {tab === "library" && (
            <div className="toolkit-panel">
              <div className="toolkit-panel-title"><div><span>MY LEARNING LIBRARY</span><h4>筆記與收藏</h4></div><b>{(payload.notes ?? []).length} 筆 · {(payload.bookmarks ?? []).length} 收藏</b></div>
              <label className="toolkit-library-search"><span>在我的資料中搜尋</span><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="搜尋標題、內容或標籤" /></label>
              {editingItem && <form className="toolkit-note-editor" onSubmit={saveNote}><div><span>編輯筆記</span><strong>{editingItem.title}</strong></div><textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={5} maxLength={8000} /><input value={noteTags} onChange={(event) => setNoteTags(event.target.value)} maxLength={180} placeholder="標籤" /><div><button type="button" onClick={() => setEditingItem(null)}>取消</button><button className="primary-button" type="submit" disabled={busy || !noteBody.trim()}>儲存修改</button></div></form>}
              <div className="toolkit-library-grid">
                <section><div className="toolkit-subhead"><strong>題目與課程筆記</strong><span>{(payload.notes ?? []).length}</span></div>
                  {(payload.notes ?? []).filter((note) => !libraryQuery.trim() || [note.title, note.body, ...(note.tags ?? [])].join(" ").toLocaleLowerCase().includes(libraryQuery.toLocaleLowerCase())).length ? <div className="toolkit-note-list">{(payload.notes ?? []).filter((note) => !libraryQuery.trim() || [note.title, note.body, ...(note.tags ?? [])].join(" ").toLocaleLowerCase().includes(libraryQuery.toLocaleLowerCase())).map((note) => <article key={`${note.item_type}:${note.item_id}`}><div><span>{note.unit ?? note.item_type}</span><small>{dateLabel(note.updated_at)}</small></div><strong>{note.title}</strong><p>{note.body}</p><footer>{(note.tags ?? []).map((tag) => <em key={tag}>#{tag}</em>)}<button onClick={() => editExistingNote(note)}>編輯</button><button onClick={() => void postAndReload({ action: "deleteNote", itemType: note.item_type, itemId: note.item_id }, "筆記已刪除。")}>刪除</button></footer></article>)}</div> : <div className="toolkit-mini-empty">還沒有符合的筆記。</div>}
                </section>
                <section><div className="toolkit-subhead"><strong>收藏</strong><span>{(payload.bookmarks ?? []).length}</span></div>
                  {(payload.bookmarks ?? []).filter((bookmark) => !libraryQuery.trim() || [bookmark.title, bookmark.excerpt, ...(bookmark.tags ?? [])].join(" ").toLocaleLowerCase().includes(libraryQuery.toLocaleLowerCase())).length ? <div className="toolkit-bookmark-list">{(payload.bookmarks ?? []).filter((bookmark) => !libraryQuery.trim() || [bookmark.title, bookmark.excerpt, ...(bookmark.tags ?? [])].join(" ").toLocaleLowerCase().includes(libraryQuery.toLocaleLowerCase())).map((bookmark) => <article key={`${bookmark.item_type}:${bookmark.item_id}`}><div><span>{bookmark.unit ?? bookmark.item_type}</span><small>{TYPE_LABELS[bookmark.item_type as Exclude<SearchType, "all">] ?? "資料"}</small></div><strong>{bookmark.title}</strong><p>{bookmark.excerpt}</p><footer>{bookmark.unit && <button onClick={() => onOpenUnit(bookmark.unit as UnitId)}>打開 {bookmark.unit}</button>}<button onClick={() => void postAndReload({ action: "toggleBookmark", active: false, itemType: bookmark.item_type, itemId: bookmark.item_id }, "已移出收藏。", true)}>移除</button></footer></article>)}</div> : <div className="toolkit-mini-empty">還沒有符合的收藏。</div>}
                </section>
              </div>
            </div>
          )}

          {tab === "sets" && (
            <div className="toolkit-panel">
              <div className="toolkit-panel-title"><div><span>CUSTOM PRACTICE</span><h4>自訂題庫</h4><p>從搜尋手動挑題，或用單元與技能快速組題。自選練習會保留作答事件，但不推進正式 FSRS、XP 或能力驗證。</p></div><b>{(payload.practiceSets ?? []).length} 組</b></div>
              <div className="toolkit-set-builder">
                <div className="toolkit-set-fields"><label><span>題組名稱</span><input value={setName} onChange={(event) => setSetName(event.target.value)} maxLength={80} placeholder="例如：U03 時態修復" /></label><label><span>說明</span><input value={setDescription} onChange={(event) => setSetDescription(event.target.value)} maxLength={500} placeholder="這組要練什麼？" /></label></div>
                <div className="toolkit-smart-filters"><label><span>單元</span><select value={smartUnit} onChange={(event) => setSmartUnit(event.target.value as "all" | UnitId)}><option value="all">跨單元</option>{UNITS.map((unit) => <option key={unit.id} value={unit.id}>{unit.id} · {unit.title}</option>)}</select></label><label><span>技能</span><select value={smartSkill} onChange={(event) => setSmartSkill(event.target.value)}><option value="all">全部技能</option>{skillOptions.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></label><label><span>題數</span><select value={smartCount} onChange={(event) => setSmartCount(Number(event.target.value))}>{[6, 12, 20, 30, 40].map((count) => <option value={count} key={count}>{count} 題</option>)}</select></label></div>
                <div className="toolkit-builder-summary"><div><strong>{selectedQuestions.length ? `手動選取 ${selectedQuestions.length} 題` : `智慧篩選找到 ${smartQuestionIds.length} 題`}</strong><span>{selectedQuestions.length ? "會優先使用統一搜尋中勾選的題目。" : `${smartUnit === "all" ? "U01–U40" : smartUnit} · ${smartSkill === "all" ? "全部技能" : smartSkill}`}</span></div><button className="primary-button" onClick={() => void savePracticeSet()} disabled={busy || (!selectedQuestions.length && !smartQuestionIds.length)}>儲存題組</button></div>
              </div>
              <div className="toolkit-set-list">{(payload.practiceSets ?? []).length ? (payload.practiceSets ?? []).map((practiceSet) => <article key={practiceSet.id}><div><span>CUSTOM · {(practiceSet.questionIds ?? []).length} 題</span><small>{dateLabel(practiceSet.updated_at)}</small></div><strong>{practiceSet.name}</strong><p>{practiceSet.description || "沒有附加說明。"}</p><footer><button className="primary-button" onClick={() => onStartPractice(practiceSet.questionIds ?? [], practiceSet.name)} disabled={!(practiceSet.questionIds ?? []).length}>開始這組練習</button><button onClick={() => void postAndReload({ action: "deletePracticeSet", id: practiceSet.id }, `已刪除「${practiceSet.name}」。`)}>刪除</button></footer></article>) : <div className="toolkit-search-empty"><strong>還沒有自訂題組</strong><p>可從統一搜尋勾選題目，或直接用上面的單元／技能篩選建立。</p></div>}</div>
            </div>
          )}

          {tab === "grammar" && (
            <div className="toolkit-panel">
              <div className="toolkit-panel-title"><div><span>G01–G25 REFERENCE</span><h4>中文文法庫</h4><p>規則、結構、例句與常見錯法放在答題後可查的參考區；正式作答前不會先洩漏本題考點。</p></div><b>25 個目標</b></div>
              <label className="toolkit-library-search"><span>搜尋文法</span><input value={grammarQuery} onChange={(event) => setGrammarQuery(event.target.value)} placeholder="例如：完成式、介系詞、間接問句" /></label>
              <div className="toolkit-grammar-grid">{GRAMMAR_LIBRARY.filter((guide) => !grammarQuery.trim() || [guide.id, guide.title, guide.pattern, guide.use, guide.commonError, ...guide.tags].join(" ").toLocaleLowerCase().includes(grammarQuery.toLocaleLowerCase())).map((guide) => <details key={guide.id}><summary><span>{guide.id}</span><div><strong>{guide.title}</strong><small>首次出現 {guide.firstUnit}</small></div></summary><div className="toolkit-grammar-detail"><p><b>結構</b>{guide.pattern}</p><p><b>什麼時候用</b>{guide.use}</p><div><span>例句</span><strong>{guide.example}</strong><button onClick={() => onSpeak(guide.example)} aria-label={`播放 ${guide.id} 例句`}>▶</button></div><p className="toolkit-common-error"><b>常見錯法</b>{guide.commonError}</p><footer>{guide.tags.map((tag) => <em key={tag}>#{tag}</em>)}<button onClick={() => onOpenUnit(guide.firstUnit as UnitId)}>打開 {guide.firstUnit}</button></footer></div></details>)}</div>
            </div>
          )}

          {tab === "reports" && report && payload.report && (
            <div className="toolkit-panel toolkit-report-panel">
              <div className="toolkit-panel-title"><div><span>LEARNING REPORT</span><h4>{reportPeriod === "week" ? "本週學習報告" : "近 30 天學習報告"}</h4><p>只把實際作答、有效作答時間、聽力重播與單字複習列入；冒險 XP 不換算能力。</p></div><div className="toolkit-period-switch"><button className={reportPeriod === "week" ? "toolkit-action-active" : ""} onClick={() => updateSpeech(speechAccent, speechRate, "week")}>7 天</button><button className={reportPeriod === "month" ? "toolkit-action-active" : ""} onClick={() => updateSpeech(speechAccent, speechRate, "month")}>30 天</button></div></div>
              <div className="toolkit-report-metrics"><div><span>作答</span><strong>{report.attempts}</strong><small>{report.activeDays} 個活躍日</small></div><div><span>正確率</span><strong>{report.accuracy === null ? "—" : `${report.accuracy}%`}</strong><small>{report.correct} 題答對</small></div><div><span>有效時間</span><strong>{report.activeMinutes}</strong><small>分鐘</small></div><div><span>單字複習</span><strong>{report.vocabularyReviews}</strong><small>次</small></div><div><span>聽力首答</span><strong>{report.listeningAnswers}</strong><small>重播 {report.listeningReplays}</small></div><div><span>高信心錯</span><strong>{report.highConfidenceWrong}</strong><small>優先校正</small></div></div>
              <div className="toolkit-report-grid">
                <section className="toolkit-trend-card"><div className="toolkit-subhead"><strong>作答趨勢</strong><span>始於 {report.firstDate}</span></div>{report.daily.length ? <div className="toolkit-bars" aria-label="每日作答趨勢">{report.daily.map((day) => <div key={day.date} title={`${day.date}：${day.attempts} 題、答對 ${day.correct} 題`}><span><i style={{ height: `${Math.max(7, Math.round((day.attempts / maxDailyAttempts) * 100))}%` }} /></span><small>{day.date.slice(5).replace("-", "/")}</small></div>)}</div> : <div className="toolkit-mini-empty">這個期間還沒有作答紀錄。</div>}</section>
                <section className="toolkit-due-card"><div className="toolkit-subhead"><strong>接下來要處理</strong><span>間隔複習</span></div><div><p><span>到期題目</span><strong>{payload.report.dueQuestions}</strong></p><p><span>到期單字</span><strong>{payload.report.dueVocabulary}</strong></p><p><span>連續學習</span><strong>{payload.report.streak} 天</strong></p></div><small>到期只代表該再次確認，不等於退步或答錯。</small></section>
              </div>
              <section className="toolkit-skill-report"><div className="toolkit-subhead"><strong>技能排程與證據</strong><span>未見題至少兩題才算驗證</span></div>{payload.report.skills.length ? <div>{payload.report.skills.map((skill) => <article key={skill.tag}><span className={skill.validated ? "toolkit-skill-stable" : "toolkit-skill-due"}>{skill.validated ? "穩定" : new Date(skill.nextReviewAt).getTime() <= reportNow ? "到期" : "建立中"}</span><div><strong>{skill.label}</strong><code>{skill.tag}</code></div><p>{skill.distinctQuestions} 個不同題目 · 未見答對 {skill.unseenSuccess}</p></article>)}</div> : <div className="toolkit-mini-empty">繼續作答後會建立技能排程。</div>}</section>
              {payload.report.estimatedMockRange ? <section className="toolkit-score-estimate"><div><span>完整模考區間估算</span><strong>{payload.report.estimatedMockRange.low}–{payload.report.estimatedMockRange.high}</strong><small>中心約 {payload.report.estimatedMockRange.center} · {payload.report.estimatedMockRange.date}</small></div><p>{payload.report.estimatedMockRange.caveat}</p></section> : <section className="toolkit-score-estimate toolkit-score-empty"><div><span>TOEIC 區間</span><strong>尚無可信估算</strong></div><p>完成一次不中斷的 200 題模考後才顯示區間；一般練習、遊戲 XP 與提前預覽都不拿來猜分數。</p></section>}
            </div>
          )}

          {tab === "backup" && (
            <div className="toolkit-panel">
              <div className="toolkit-panel-title"><div><span>EXPORT · IMPORT · RESTORE</span><h4>完整匯出與備份還原</h4><p>Markdown 適合交給新對話；CSV 適合試算表；JSON 是同帳號完整備份。列印功能可另存 PDF。</p></div><b>私人資料</b></div>
              <div className="toolkit-export-grid"><a href="/api/export" download><span>MD</span><strong>學習交接 Markdown</strong><small>進度、錯題、信心、弱點與單字記憶</small></a><a href="/api/toolkit/export?format=csv" download><span>CSV</span><strong>可分析資料表</strong><small>作答、單字、筆記、收藏與自訂題組</small></a><a href="/api/toolkit/export?format=json" download><span>JSON</span><strong>完整帳號備份</strong><small>正式證據、排程、故事、遊戲與工具資料</small></a><button onClick={() => window.print()}><span>PDF</span><strong>列印／另存 PDF</strong><small>將目前報告排版成可保存文件</small></button></div>
              <section className="toolkit-restore"><div><span>RESTORE</span><h5>從 JSON 完整還原</h5><p>為保護正式能力證據，只接受同一帳號產生的 Everyday English 備份。還原會取代目前帳號資料，開始前請先下載一份新備份。</p></div><label><span>選擇 .json 備份</span><input type="file" accept="application/json,.json" onChange={(event: ChangeEvent<HTMLInputElement>) => setRestoreFile(event.target.files?.[0] ?? null)} /></label><button className="toolkit-danger-button" onClick={() => void restoreBackup()} disabled={busy || !restoreFile}>{busy ? "處理中…" : "確認並完整還原"}</button></section>
              <div className="toolkit-backup-safety"><strong>備份安全說明</strong><ul><li>檔案包含你的作答、筆記與學習狀態，請不要公開分享。</li><li>匯入不接受別的帳號，因此不能用備份複製或偽造能力證據。</li><li>離線草稿只包含學習工具變更；正式作答不會離線冒充證據。</li></ul></div>
              {(payload.recentImports ?? []).length > 0 && <div className="toolkit-import-history"><span>最近還原</span>{(payload.recentImports ?? []).map((item) => <p key={item.id}><strong>{dateLabel(item.imported_at)}</strong><span>{item.restored_rows} 筆 · {item.restored_tables} 個資料表</span></p>)}</div>}
            </div>
          )}
        </>
      )}

      <section className="toolkit-voice-settings" aria-label="全站語音設定">
        <div><span>VOICE SETTINGS</span><strong>語音速度與口音</strong><small>全站單字、例句、課程聽力與案件語音一起套用。</small></div>
        <label><span>口音</span><select value={speechAccent} onChange={(event) => updateSpeech(event.target.value as SpeechAccent, speechRate)}><option value="en-US">美式 English (US)</option><option value="en-GB">英式 English (UK)</option><option value="en-AU">澳式 English (AU)</option></select></label>
        <label><span>速度</span><select value={speechRate} onChange={(event) => updateSpeech(speechAccent, Number(event.target.value))}><option value={0.75}>0.75× 慢速</option><option value={0.9}>0.90× 學習</option><option value={1}>1.00× 自然</option><option value={1.15}>1.15× 挑戰</option></select></label>
        <button onClick={() => onSpeak("Please confirm the source before you submit the final report.")}>▶ 試聽</button>
      </section>
    </section>
  );
}
