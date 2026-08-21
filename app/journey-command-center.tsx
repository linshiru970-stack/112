"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import type { AbilityAtlasItem, AbilityDomain } from "./ability-atlas";
import {
  JOURNEY_LENGTHS,
  JOURNEY_STEPS,
  JOURNEY_STEP_INFO,
  journeyProgressPercent,
  type AbilityStatus,
  type JourneyLength,
  type JourneyStep,
} from "./journey-system";

export type JourneySummary = {
  journeyLength?: JourneyLength;
  journeyLengthLabel?: string;
  answered?: number;
  correct?: number;
  wrong?: number;
  scenarioActions?: number;
  scenarioCorrect?: number;
  scenarioTarget?: number;
  novelEvidence?: number;
  highConfidenceWrong?: number;
  lowConfidenceCorrect?: number;
  topErrorCategory?: string | null;
  realImprovements?: string[];
  repairCompleted?: boolean;
  progressNotes?: Array<{ tone: string; title: string; detail: string }>;
  primaryWeaknessLabel?: string | null;
  battleGold?: number;
  scenarioGold?: number;
  affinity?: number;
  battleCount?: number;
  formalUnit?: string;
  story?: { title: string; kicker: string; line: string; imageSrc: string; imageAlt: string } | null;
};

export type JourneyRepairPlan = {
  weakness?: string;
  skillTag?: string | null;
  sourceQuestionId?: string;
  questionIds?: string[];
};

export type JourneySession = {
  id: string;
  localDate: string;
  formalUnit: string;
  status: string;
  currentStep: JourneyStep;
  stepInfo: { label: string; short: string; detail: string };
  stepStartedAt: string;
  queue: string[];
  currentIndex: number;
  battleState: Record<string, unknown>;
  companionId: string;
  companionLine: string;
  repairPlan: JourneyRepairPlan;
  summary: JourneySummary;
  journeyLength: JourneyLength;
  journeyLengthInfo: { label: string; duration: string; practiceCount: number; scenarioTarget: number; repairCount: number };
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type JourneyPayload = {
  user?: { name: string; synced: boolean };
  versions?: { site: string; scenarioContent: string; formalProgress: string; journeySchema: number };
  formalProgress?: { unitId: string; title: string; answered: number; total: number; completedUnits: number };
  abilityMap?: Array<{ id: string; tag: string; label: string; firstUnit: string; status: AbilityStatus }>;
  abilityAtlas?: AbilityAtlasItem[];
  pendingScenarioRepairs?: number;
  activeScenario?: { runId: string; missionId: string; title: string; imageSrc: string; companionId: string; currentIndex: number } | null;
  session?: JourneySession | null;
  lastCompleted?: JourneySession | null;
  error?: string;
};

const ABILITY_STATUS_COPY: Record<AbilityStatus, string> = {
  locked: "尚未正式教",
  current: "正在練",
  weak: "優先修復",
  due: "已到期重測",
  retest: "等待延遲重測",
  stable: "能力穩定",
  taught: "已教待證據",
};

const DOMAIN_COPY: Record<AbilityDomain, { mark: string; label: string; short: string }> = {
  grammar: { mark: "G", label: "文法", short: "G01–G25" },
  vocabulary: { mark: "V", label: "字彙", short: "480 字與搭配" },
  listening: { mark: "L", label: "聽力", short: "首聽到跨句" },
  reading: { mark: "R", label: "閱讀", short: "定位到整合" },
  part: { mark: "P", label: "TOEIC Part", short: "P1–P7" },
};

const EVIDENCE_LADDER = ["尚未留下證據", "看過／完成首答", "提示後答對", "無提示新題答對", "換情境仍會", "聽讀轉換成功", "隔日重測穩定"] as const;

function actionLabel(session: JourneySession | null | undefined, busy: boolean) {
  if (busy) return "正在接回旅程…";
  if (!session) return "開始今天的旅程";
  if (session.currentStep === "practice") return session.currentIndex > 0
    ? `接回第 ${Math.min(session.currentIndex + 1, session.queue.length)}／${session.queue.length} 題`
    : `開始 ${session.queue.length} 題英文行動`;
  if (session.currentStep === "scenario") return `繼續情境行動 · ${Number(session.summary.scenarioActions ?? 0)}/${session.journeyLengthInfo.scenarioTarget}`;
  if (session.currentStep === "companion") return "收下回應 · 安排修復";
  if (session.currentStep === "repair") return `開始 ${session.repairPlan.questionIds?.length ?? session.journeyLengthInfo.repairCount} 題新情境修復`;
  return "完成這次統一結算";
}

function Summary({ summary, completed = false }: { summary: JourneySummary; completed?: boolean }) {
  const totalGold = Number(summary.battleGold ?? 0) + Number(summary.scenarioGold ?? 0);
  return (
    <div className={`journey-settlement ${completed ? "journey-summary-completed" : ""}`}>
      <div className="journey-summary-grid">
        <div><span>英文作答</span><strong>{summary.correct ?? 0}<small>／{summary.answered ?? 0} 正確</small></strong></div>
        <div><span>情境行動</span><strong>{summary.scenarioActions ?? 0}<small> 個節點</small></strong></div>
        <div><span>嚴格新證據</span><strong>{summary.novelEvidence ?? 0}<small> 筆</small></strong></div>
        <div><span>本輪獎勵</span><strong>{totalGold}<small> G{summary.affinity ? ` · 好感 +${summary.affinity}` : ""}</small></strong></div>
      </div>
      <div className="journey-progress-notes">
        {(summary.progressNotes ?? []).map((note, index) => (
          <article className={`journey-note-${note.tone}`} key={`${note.title}-${index}`}><i /> <div><strong>{note.title}</strong><p>{note.detail}</p></div></article>
        ))}
      </div>
    </div>
  );
}

export function JourneyCommandCenter({
  payload,
  loading,
  busy,
  error,
  companionName,
  companionImage,
  selectedLength,
  onLengthChange,
  onContinue,
  onOpenAbility,
}: {
  payload: JourneyPayload;
  loading: boolean;
  busy: boolean;
  error: string;
  companionName: string;
  companionImage: string;
  selectedLength: JourneyLength;
  onLengthChange: (value: JourneyLength) => void;
  onContinue: () => void;
  onOpenAbility: () => void;
}) {
  const session = payload.session ?? null;
  const lastCompleted = payload.lastCompleted ?? null;
  const currentStep = session?.currentStep ?? null;
  const formal = payload.formalProgress;
  const versions = payload.versions;
  const summary = session?.summary ?? lastCompleted?.summary ?? {};
  const completedToday = !session && Boolean(lastCompleted);
  const story = summary.story;

  return (
    <section className={`journey-command ${completedToday ? "journey-command-completed" : ""}`} aria-labelledby="journey-command-title">
      <div className="journey-command-main">
        <div className="journey-command-copy">
          <p className="eyebrow">TODAY’S NEXT STEP · V33</p>
          <h2 id="journey-command-title">{completedToday ? "今天真的進步了什麼，已經分開結算。" : session ? `從「${JOURNEY_STEP_INFO[session.currentStep].label}」接著走。` : "先選旅程長度，再讓系統接好今天的路。"}</h2>
          <p>{completedToday
            ? `正式位置仍是 ${formal?.unitId ?? "U02"}；只有新題、換情境或延遲重測形成的證據才會升級能力。`
            : session
              ? JOURNEY_STEP_INFO[session.currentStep].detail
              : "系統會先排需要複習的內容，再接目前單元與新情境；正式學習位置不會因試玩後段章節而跳級。"}</p>

          {!session && (
            <div className="journey-length-picker" role="radiogroup" aria-label="選擇今日旅程長度">
              {(Object.keys(JOURNEY_LENGTHS) as JourneyLength[]).map((length) => {
                const info = JOURNEY_LENGTHS[length];
                return <button key={length} role="radio" aria-checked={selectedLength === length} className={selectedLength === length ? "journey-length-active" : ""} onClick={() => onLengthChange(length)}><span>{info.label}<small>{info.duration}</small></span><b>{info.practiceCount} 題 · {info.scenarioTarget} 情境</b><em>{info.detail}</em></button>;
              })}
            </div>
          )}

          {session?.currentStep === "companion" && session.companionLine && (
            <blockquote className="journey-companion-line"><img src={companionImage} alt="" /><span><b>{companionName}</b>{session.companionLine}</span></blockquote>
          )}
          {session?.currentStep === "repair" && session.repairPlan?.weakness && (
            <div className="journey-repair-callout"><span>本輪要修復</span><strong>{session.repairPlan.weakness}</strong><small>{session.repairPlan.questionIds?.length ?? 0} 題都使用新情境並標記 assisted；之後仍需延遲重測。</small></div>
          )}
        </div>

        <div className="journey-command-action">
          <div className="journey-orb"><span>{completedToday ? "DONE" : currentStep ? `${JOURNEY_STEPS.indexOf(currentStep) + 1}/5` : "READY"}</span><strong>{formal?.unitId ?? "U02"}</strong><small>{session?.journeyLengthInfo?.label ?? JOURNEY_LENGTHS[selectedLength].label}旅程</small></div>
          <button onClick={onContinue} disabled={loading || busy}>{loading ? "正在讀取旅程…" : completedToday ? "再開始一輪" : actionLabel(session, busy)}</button>
          <button className="journey-ability-link" onClick={onOpenAbility} disabled={loading}>查看能力與複習依據</button>
        </div>
      </div>

      <details className="journey-system-details">
        <summary>這條旅程怎麼安排？</summary>
        <div>
          <p>高信心答錯會優先修復；低信心答對會換情境確認。提示後答對、無提示新題與隔日重測會分開記錄。</p>
          <div className="journey-version-strip" aria-label="版本與正式學習位置">
            <span>網站 {versions?.site ?? "v29"}</span>
            <span>情境內容包 {versions?.scenarioContent ?? "v33"}</span>
            <strong>正式學習位置 {versions?.formalProgress ?? formal?.unitId ?? "U02"}</strong>
          </div>
        </div>
      </details>

      {story && (
        <article className="journey-story-beat">
          <img src={story.imageSrc} alt={story.imageAlt} />
          <div className="journey-story-shade" />
          <img className="journey-story-companion" src={companionImage} alt="" />
          <div><span>{story.kicker}</span><strong>{story.title}</strong><p>{story.line}</p><small>這個後果與同行記憶已保存，插圖會跟著任務而不是只留在收藏頁。</small></div>
        </article>
      )}

      {session && (
        <div className="journey-step-rail" aria-label="今日旅程進度">
          {JOURNEY_STEPS.map((step, index) => {
            const activeIndex = JOURNEY_STEPS.indexOf(session.currentStep);
            const complete = index < activeIndex;
            const active = step === session.currentStep;
            return <div key={step} className={`${complete ? "journey-step-done" : ""} ${active ? "journey-step-active" : ""}`}><b>{complete ? "✓" : index + 1}</b><span>{JOURNEY_STEP_INFO[step].short}<small>{active ? "目前" : complete ? "已保存" : "等待"}</small></span></div>;
          })}
          <div className="journey-step-progress" aria-hidden="true"><span style={{ width: `${journeyProgressPercent(session.currentStep)}%` }} /></div>
        </div>
      )}

      {(session?.currentStep === "settlement" || completedToday) && <Summary summary={summary} completed={completedToday} />}
      {formal && <div className="journey-formal-note"><span>正式進度</span><strong>{formal.unitId} · {formal.title}</strong><small>{formal.answered}/{formal.total} 題已有紀錄；試玩、完成章節與真正穩定分開計算。</small></div>}
      {error && <p className="journey-error" aria-live="polite">{error}</p>}
    </section>
  );
}

type AbilityScope = "action" | "available" | "stable" | "locked" | "all";

function EvidenceDetail({ ability }: { ability: AbilityAtlasItem }) {
  return (
    <aside className="ability-detail-v27" aria-live="polite">
      <header><div><span>{DOMAIN_COPY[ability.domain].label} · {ability.id}</span><h4>{ability.label}</h4><p>{ability.sublabel}</p></div><b className={`ability-detail-status ability-status-${ability.status}`}>{ABILITY_STATUS_COPY[ability.status]}</b></header>
      <div className="ability-evidence-ladder" aria-label={`證據階梯：${ability.evidenceLabel}`}>
        {EVIDENCE_LADDER.map((label, index) => <div className={index <= ability.evidenceLevel ? "ability-evidence-reached" : ""} key={label}><i>{index}</i><span>{label}</span></div>)}
      </div>
      <p className="ability-detail-reason">{ability.reason}</p>
      <div className="ability-detail-metrics">
        <div><span>作答</span><strong>{ability.attempts}</strong></div>
        <div><span>嚴格證據</span><strong>{ability.strictEvidence}</strong></div>
        <div><span>提示後</span><strong>{ability.assistedEvidence}</strong></div>
        <div><span>高信心錯</span><strong>{ability.highConfidenceWrong}</strong></div>
      </div>
      {ability.topErrorCategory && <div className="ability-error-cause"><span>主要錯因</span><strong>{ability.topErrorCategory}</strong></div>}
      {ability.nextReviewAt && <div className="ability-next-review"><span>下一次重測</span><strong>{new Date(ability.nextReviewAt).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong></div>}
      <div className="ability-evidence-history">
        <h5>最近證據與最後答案</h5>
        {ability.recentEvidence.length ? ability.recentEvidence.map((evidence) => (
          <article key={evidence.id} className={evidence.correct ? "ability-evidence-correct" : "ability-evidence-wrong"}>
            <div><span>{evidence.unit} · {evidence.support === "strict" ? "無提示" : evidence.support === "preview" ? "提前接觸" : "有支援"}</span><time>{evidence.localDate || evidence.createdAt.slice(0, 10)}</time></div>
            <strong>{evidence.prompt}</strong><p>最後答案：{evidence.answer || "—"}</p><small>{evidence.correct ? `答對 · 信心 ${evidence.confidence || "未標"}` : `${evidence.errorCategory ?? "錯因待分類"} · 信心 ${evidence.confidence || "未標"}`}</small>
          </article>
        )) : <p className="ability-empty-evidence">還沒有作答證據。正式教到後，第一次接觸、提示、無提示與延遲重測會分開留下來。</p>}
      </div>
    </aside>
  );
}

export function AbilityMapPanel({ abilities }: { abilities: AbilityAtlasItem[] }) {
  const [domain, setDomain] = useState<AbilityDomain>("grammar");
  const [scope, setScope] = useState<AbilityScope>("action");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("G02");
  const [limit, setLimit] = useState(80);
  const domainItems = useMemo(() => abilities.filter((ability) => ability.domain === domain), [abilities, domain]);
  const filtered = useMemo(() => domainItems.filter((ability) => {
    const matchesQuery = !query.trim() || `${ability.id} ${ability.label} ${ability.sublabel}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const matchesScope = scope === "all" || (scope === "action" && ["weak", "due", "retest", "current"].includes(ability.status)) || (scope === "available" && ability.status !== "locked") || ability.status === scope;
    return matchesQuery && matchesScope;
  }), [domainItems, query, scope]);
  const visible = filtered.slice(0, limit);
  const selected = abilities.find((ability) => ability.id === selectedId && ability.domain === domain) ?? visible[0] ?? domainItems[0];
  const counts = abilities.reduce((map, item) => map.set(item.status, (map.get(item.status) ?? 0) + 1), new Map<AbilityStatus, number>());

  function chooseDomain(next: AbilityDomain) {
    setDomain(next);
    setLimit(80);
    const actionItems = abilities.filter((ability) => ability.domain === next && ["weak", "due", "retest", "current"].includes(ability.status));
    if (scope === "action" && !actionItems.length) setScope("all");
    const first = actionItems[0] ?? abilities.find((ability) => ability.domain === next);
    if (first) setSelectedId(first.id);
  }

  return (
    <section className="ability-map-v27" id="ability-map-v27" aria-labelledby="ability-map-title">
      <header className="ability-map-head"><div><span>G／V／L／R／PART · EVIDENCE ATLAS</span><h3 id="ability-map-title">五域能力圖譜</h3><p>每格都能打開看證據、錯因、最後答案與下一步。提前接觸不會解鎖正式進度。</p></div><div><b>{counts.get("stable") ?? 0}</b><span>隔日穩定</span><small>{counts.get("weak") ?? 0} 項待優先修復</small></div></header>
      <div className="ability-domain-tabs" role="tablist" aria-label="能力領域">
        {(Object.keys(DOMAIN_COPY) as AbilityDomain[]).map((id) => {
          const copy = DOMAIN_COPY[id];
          const count = abilities.filter((ability) => ability.domain === id).length;
          return <button key={id} role="tab" aria-selected={domain === id} onClick={() => chooseDomain(id)}><b>{copy.mark}</b><span>{copy.label}<small>{copy.short}</small></span><em>{count}</em></button>;
        })}
      </div>
      <div className="ability-atlas-controls">
        <label><span>搜尋這個領域</span><input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(80); }} placeholder={domain === "vocabulary" ? "輸入單字、中文或 V 編號" : "輸入能力名稱或編號"} /></label>
        <div role="group" aria-label="能力篩選">
          {([['action', '現在要處理'], ['available', '已教範圍'], ['stable', '穩定'], ['locked', '未教'], ['all', '全部']] as const).map(([value, label]) => <button key={value} className={scope === value ? "ability-scope-active" : ""} onClick={() => { setScope(value); setLimit(80); }}>{label}</button>)}
        </div>
      </div>
      <div className="ability-legend">
        {(["current", "weak", "due", "retest", "stable", "taught", "locked"] as AbilityStatus[]).map((status) => <span className={`ability-status-${status}`} key={status}><i />{ABILITY_STATUS_COPY[status]} {counts.get(status) ?? 0}</span>)}
      </div>
      <div className="ability-atlas-layout">
        <div className="ability-grid-v27">
          {visible.map((ability) => (
            <button className={`ability-card ability-card-${ability.status} ${selected?.id === ability.id ? "ability-card-selected" : ""}`} key={ability.id} onClick={() => setSelectedId(ability.id)} aria-pressed={selected?.id === ability.id}>
              <span><b>{ability.id}</b><em>{ABILITY_STATUS_COPY[ability.status]}</em></span>
              <strong>{ability.label}</strong><small>{ability.sublabel}</small>
              <div><i style={{ width: `${Math.round((ability.evidenceLevel / 6) * 100)}%` }} /><span>{ability.evidenceLabel}</span></div>
              {(ability.highConfidenceWrong > 0 || ability.lowConfidenceCorrect > 0) && <mark>{ability.highConfidenceWrong ? `高信心錯 ${ability.highConfidenceWrong}` : `低信心答對 ${ability.lowConfidenceCorrect}`}</mark>}
            </button>
          ))}
          {!visible.length && <div className="ability-atlas-empty"><strong>這個篩選目前沒有項目</strong><p>改看「全部」或換一個領域。</p></div>}
          {visible.length < filtered.length && <button className="ability-load-more" onClick={() => setLimit((value) => value + 80)}>再顯示 {Math.min(80, filtered.length - visible.length)} 項<small>目前 {visible.length}/{filtered.length}</small></button>}
        </div>
        {selected && <EvidenceDetail ability={selected} />}
      </div>
    </section>
  );
}
