"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { COMPANIONS, getCompanion, type CompanionId } from "./companions";
import { matchesAcceptedOutput, type UnitId } from "./content";
import {
  SCENARIO_ACTION_COPY,
  SCENARIO_ERROR_PATTERN_COPY,
  SCENARIO_MISSIONS,
  SCENARIO_PROCESS_COPY,
  SCENARIO_ROUTE_COPY,
  SCENARIO_WEAKNESS_INFO,
  getScenarioMission,
  getScenarioNodeMeta,
  getScenarioQuestion,
  scenarioMissionUnit,
  type ScenarioEnding,
  type ScenarioMissionKind,
  type ScenarioNodeId,
  type ScenarioProcessResult,
  type ScenarioSceneZone,
  type ScenarioWeaknessKey,
} from "./scenario-mission";
import { SCENARIO_CONTENT_VERSION, SITE_VERSION } from "./product-version";
import type { SpeechAccent } from "./learning-toolkit";

type ScenarioAnswerSummary = {
  nodeId: string;
  questionId: string;
  correct: boolean;
  supportMode: string;
  listenCount: number;
  replayCount: number;
  consequence: string;
  answeredAt: string;
};

type ScenarioRun = {
  id: string;
  missionId: string;
  companionId: CompanionId;
  status: string;
  currentIndex: number;
  currentNodeId: ScenarioNodeId | null;
  questionId: string | null;
  nodeSequence: ScenarioNodeId[];
  questionIds: string[];
  clues: number;
  setbacks: number;
  ending: ScenarioEnding | null;
  endingCopy?: { label: string; detail: string } | null;
  processResult: ScenarioProcessResult | null;
  processCopy?: { label: string; detail: string } | null;
  reward: { gold?: number; affinity?: number; companionId?: CompanionId; missionId?: string; previewOnly?: boolean };
  startedAt: string;
  completedAt: string | null;
  answers: ScenarioAnswerSummary[];
};

type ScenarioMissionSummary = {
  id: string;
  kind: ScenarioMissionKind;
  completedCount: number;
  pendingRepair: number;
};

type ScenarioMemory = {
  weaknessKey: ScenarioWeaknessKey;
  misses: number;
  repaired: number;
  pending: number;
  lastQuestionId: string;
  lastCompanionId: CompanionId | null;
  lastConsequence: string;
  lastSeenAt: string;
};

type ScenarioPayload = {
  scenario?: { id: string; title: string; kind: ScenarioMissionKind; totalNodes: number } | null;
  run?: ScenarioRun | null;
  completedCount?: number;
  missions?: ScenarioMissionSummary[];
  memory?: ScenarioMemory[];
  error?: string;
};

type AnswerReceipt = {
  error?: string;
  correct?: boolean;
  answerReceiptId?: string;
  strictEvidenceEligible?: boolean;
  novelSkillEvidence?: boolean;
  duplicate?: boolean;
};

type Resolution = {
  correct: boolean;
  answerReceiptId: string;
  strictEvidenceEligible: boolean;
  novelSkillEvidence: boolean;
};

type Props = {
  selectedCompanionId: CompanionId;
  companionImages: Record<CompanionId, string>;
  formalUnit: UnitId;
  requestedUnit?: UnitId;
  requestToken?: number;
  onSynchronized: () => void;
  journeyMode?: boolean;
  journeyTarget?: number;
  journeyCompleted?: number;
  onJourneyNodeCompleted?: () => void | Promise<void>;
  speechAccent?: SpeechAccent;
  speechRate?: number;
};

const MAIN_MISSION = SCENARIO_MISSIONS.find((mission) => mission.kind === "main")!;
const FIRST_CASE_MISSION = SCENARIO_MISSIONS.find((mission) => scenarioMissionUnit(mission) === "U01" && mission.caseFile) ?? MAIN_MISSION;
const PLAYABLE_MISSIONS = SCENARIO_MISSIONS.filter((mission) => mission.kind !== "repair");
const CORE_CASES = SCENARIO_MISSIONS.filter((mission) => mission.caseFile && (mission.kind === "chapter" || mission.kind === "main"));

function unitNumber(unit: string) {
  return Number(unit.replace("U", "")) || 0;
}

function todayInTaipei() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

function newRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ScenarioMissionClient({ selectedCompanionId, companionImages, formalUnit, requestedUnit = "U01", requestToken = 0, onSynchronized, journeyMode = false, journeyTarget = 1, journeyCompleted = 0, onJourneyNodeCompleted, speechAccent = "en-US", speechRate = 0.9 }: Props) {
  const [payload, setPayload] = useState<ScenarioPayload>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [chosenCompanionId, setChosenCompanionId] = useState<CompanionId>(selectedCompanionId);
  const [selectedMissionId, setSelectedMissionId] = useState(FIRST_CASE_MISSION.id);
  const [selectedCaseUnit, setSelectedCaseUnit] = useState<UnitId>(requestedUnit);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [outputDraft, setOutputDraft] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [firstAnswerLocked, setFirstAnswerLocked] = useState(false);
  const [listenCount, setListenCount] = useState(0);
  const [audioFallbackAvailable, setAudioFallbackAvailable] = useState(false);
  const [audioFallbackUsed, setAudioFallbackUsed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [sceneFocus, setSceneFocus] = useState<ScenarioSceneZone>("board");
  const requestId = useRef<string | null>(null);

  const run = payload.run ?? null;
  const selectedMission = getScenarioMission(selectedMissionId) ?? MAIN_MISSION;
  const mission = getScenarioMission(run?.missionId) ?? selectedMission;
  const missionUnit = scenarioMissionUnit(mission);
  const previewOnly = unitNumber(missionUnit) > unitNumber(formalUnit);
  const storyRoute = previewOnly ? "leap" : unitNumber(missionUnit) < unitNumber(formalUnit) ? "backtrack" : "formal";
  const question = getScenarioQuestion(run?.questionId);
  const node = getScenarioNodeMeta(run?.currentNodeId, mission.id);
  const companion = getCompanion(run?.companionId ?? chosenCompanionId);
  const isListening = Boolean(question?.listeningText);
  const answerOption = question?.options?.find((option) => option.id === selectedOptionId);
  const correctOption = question?.options?.find((option) => option.id === question.answerId);
  const answerValue = question?.kind === "output" ? outputDraft.trim() : selectedOptionId ?? "";
  const answerIsCorrect = question ? question.kind === "output" ? matchesAcceptedOutput(question, answerValue) : selectedOptionId === question.answerId : false;
  const hasAnswer = question?.kind === "output" ? outputDraft.trim().length > 0 : Boolean(selectedOptionId);
  const consequence = resolution && question
    ? resolution.correct ? question.mission.correctConsequence : question.mission.wrongConsequence
    : "";
  const completedAnswers = useMemo(() => new Map((run?.answers ?? []).map((answer) => [answer.nodeId, answer])), [run?.answers]);
  const missionSummary = useMemo(() => new Map((payload.missions ?? []).map((item) => [item.id, item])), [payload.missions]);
  const pendingMemory = useMemo(() => (payload.memory ?? []).filter((item) => item.pending > 0), [payload.memory]);

  function resetQuestionState(nextPayload: ScenarioPayload) {
    const nextQuestion = getScenarioQuestion(nextPayload.run?.questionId);
    setSelectedOptionId(null);
    setOutputDraft("");
    setConfidence(null);
    setHintVisible(false);
    setFirstAnswerLocked(false);
    setListenCount(0);
    setAudioFallbackAvailable(false);
    setAudioFallbackUsed(false);
    setSpeaking(false);
    setResolution(null);
    requestId.current = null;
    setSceneFocus(nextQuestion?.mission.zone ?? "board");
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }

  const loadScenario = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/scenario", { cache: "no-store" });
      const result = (await response.json()) as ScenarioPayload;
      if (!response.ok) throw new Error(result.error || "無法讀取情境任務。 ");
      setPayload(result);
      if (result.run?.companionId) setChosenCompanionId(result.run.companionId);
      if (result.run?.missionId) {
        setSelectedMissionId(result.run.missionId);
        const activeMission = getScenarioMission(result.run.missionId);
        if (activeMission) setSelectedCaseUnit(scenarioMissionUnit(activeMission));
      }
      const nextQuestion = getScenarioQuestion(result.run?.questionId);
      setSceneFocus(nextQuestion?.mission.zone ?? "board");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "無法讀取情境任務。 ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadScenario(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadScenario]);

  useEffect(() => {
    if (run) return;
    const timeoutId = window.setTimeout(() => {
      setSelectedCaseUnit(requestedUnit);
      const requestedMission = CORE_CASES.find((candidate) => scenarioMissionUnit(candidate) === requestedUnit);
      if (requestedMission) setSelectedMissionId(requestedMission.id);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [requestToken, requestedUnit, run]);

  useEffect(() => () => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  async function postScenario(body: Record<string, unknown>) {
    const response = await fetch("/api/scenario", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as ScenarioPayload;
    if (!response.ok) throw new Error(result.error || "情境任務操作失敗。 ");
    return result;
  }

  async function startScenario(missionId = selectedMissionId, action: "start" | "restart" = "start") {
    if (busy) return;
    if (action === "restart" && typeof window !== "undefined" && !window.confirm("重新開始會結束目前路線，但已留下的英文作答與旅伴記憶不會被刪除。確定重新開始嗎？")) return;
    setBusy(true);
    setError("");
    try {
      const result = await postScenario({ action, missionId, companionId: chosenCompanionId });
      resetQuestionState(result);
      setPayload(result);
      setSelectedMissionId(result.run?.missionId ?? missionId);
      const startedMission = getScenarioMission(result.run?.missionId ?? missionId);
      if (startedMission) setSelectedCaseUnit(scenarioMissionUnit(startedMission));
      onSynchronized();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "無法開始任務。 ");
    } finally {
      setBusy(false);
    }
  }

  function returnToHub() {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setPayload((current) => ({ ...current, scenario: null, run: null }));
    setError("");
    setResolution(null);
  }

  function playListening() {
    if (!question?.listeningText || speaking || resolution) return;
    const secondListen = firstAnswerLocked;
    if ((!secondListen && listenCount >= 1) || (secondListen && listenCount >= 2)) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setAudioFallbackAvailable(true);
      setError("目前瀏覽器無法播放英文語音；可改用文字救援完成這個節點。 ");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.listeningText);
    utterance.lang = speechAccent;
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.onend = () => {
      setListenCount((value) => Math.min(2, value + 1));
      setAudioFallbackAvailable(false);
      setSpeaking(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setAudioFallbackAvailable(true);
      setError("語音播放中斷，這次不會冒充首聽；可改用文字救援繼續。 ");
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function useAudioFallback() {
    setAudioFallbackAvailable(false);
    setAudioFallbackUsed(true);
    setHintVisible(true);
    setListenCount(1);
    setError("");
  }

  async function resolveAnswer() {
    if (!question || !hasAnswer || !confidence || resolution || busy) return;
    if (isListening && listenCount < 1) return;
    requestId.current ??= newRequestId();
    setBusy(true);
    setError("");
    try {
      const supportMode = mission.kind === "repair" || hintVisible ? "ward" : "blade";
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          unit: question.unit,
          kind: question.kind,
          answer: answerValue,
          correct: answerIsCorrect,
          output: question.kind === "output" ? answerValue : undefined,
          confidence,
          localDate: todayInTaipei(),
          listenCount: isListening ? listenCount : 0,
          replayCount: isListening ? Math.max(0, listenCount - 1) : 0,
          activeMs: 0,
          supportMode,
          listeningMode: isListening ? (hintVisible ? "learning" : "toeic") : undefined,
          audioFallbackUsed: isListening ? audioFallbackUsed : undefined,
          previewOnly,
          storyRoute,
          requestId: requestId.current,
        }),
      });
      const result = (await response.json()) as AnswerReceipt;
      if (!response.ok || !result.answerReceiptId) throw new Error(result.error || "無法保存這次任務作答。 ");
      setResolution({
        correct: result.correct === true,
        answerReceiptId: result.answerReceiptId,
        strictEvidenceEligible: result.strictEvidenceEligible === true,
        novelSkillEvidence: result.novelSkillEvidence === true,
      });
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : "無法保存這次任務作答。 ");
    } finally {
      setBusy(false);
    }
  }

  function commitAction() {
    if (isListening && !firstAnswerLocked) {
      setFirstAnswerLocked(true);
      if (typeof window !== "undefined") window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    void resolveAnswer();
  }

  async function continueScenario() {
    if (!run || !resolution || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await postScenario({ action: "advance", runId: run.id, answerReceiptId: resolution.answerReceiptId });
      resetQuestionState(result);
      setPayload(result);
      onSynchronized();
      if (journeyMode) await onJourneyNodeCompleted?.();
    } catch (advanceError) {
      setError(advanceError instanceof Error ? advanceError.message : "無法前往下一個任務節點。 ");
    } finally {
      setBusy(false);
    }
  }

  function chooseCaseUnit(unit: UnitId) {
    setSelectedCaseUnit(unit);
    const nextMission = CORE_CASES.find((candidate) => scenarioMissionUnit(candidate) === unit)
      ?? PLAYABLE_MISSIONS.find((candidate) => scenarioMissionUnit(candidate) === unit);
    if (nextMission) setSelectedMissionId(nextMission.id);
  }

  if (loading) {
    return <section className="scenario-mission scenario-loading"><div className="loader" /><strong>正在接回第一幕案件行動…</strong></section>;
  }

  if (!run) {
    const selectedSummary = missionSummary.get(selectedMission.id);
    const visibleMissions = PLAYABLE_MISSIONS.filter((candidate) => scenarioMissionUnit(candidate) === selectedCaseUnit);
    const selectedUnitPreview = unitNumber(selectedCaseUnit) > unitNumber(formalUnit);
    const completedCoreCases = CORE_CASES.filter((candidate) => (missionSummary.get(candidate.id)?.completedCount ?? 0) > 0).length;
    return (
      <section id="chapter-action-engine" className="scenario-mission scenario-hub" aria-labelledby="scenario-hub-title">
        {journeyMode && <div className="scenario-journey-banner"><b>今日旅程 · 情境行動 {journeyCompleted}/{journeyTarget}</b><span>本輪完成 {journeyTarget} 個任務節點；每個選擇的後果都會進入旅伴記憶。</span></div>}
        <header className="scenario-hub-head">
          <div><span>ACT I · ACTION ENGINE {SCENARIO_CONTENT_VERSION} · SITE {SITE_VERSION}</span><h3 id="scenario-hub-title">第一幕案件行動</h3><p>英文不再只是攻擊按鈕：你會用它觀察、問話、排序、核對來源、重建文件與寫出下一步。每個判斷都直接改變場景後果。</p></div>
          <div><strong>{completedCoreCases}<small>/8</small></strong><span>章案件完成</span><small>目前正式學習位置 {formalUnit}</small></div>
        </header>

        <div className="scenario-core-board" aria-label="第一幕案件板">
          {CORE_CASES.map((candidate) => {
            const unit = scenarioMissionUnit(candidate);
            const completed = (missionSummary.get(candidate.id)?.completedCount ?? 0) > 0;
            const ahead = unitNumber(unit) > unitNumber(formalUnit);
            return <button key={candidate.id} className={`${selectedCaseUnit === unit ? "scenario-core-active" : ""} ${completed ? "scenario-core-complete" : ""}`} onClick={() => chooseCaseUnit(unit)} aria-pressed={selectedCaseUnit === unit}><b>{completed ? "✓" : unit.replace("U", "")}</b><span><strong>{unit}</strong><small>{completed ? "案件已完成" : ahead ? "可預覽" : unit === formalUnit ? "目前正式" : "可回溯"}</small></span></button>;
          })}
        </div>

        <div className="scenario-case-heading">
          <div><span>{selectedCaseUnit} · CASE FILE</span><strong>{visibleMissions.length > 1 ? "主線案件與支線調查" : "本章核心案件"}</strong></div>
          <small>{selectedUnitPreview ? `躍遷預覽：只存案件探索，不建立 ${selectedCaseUnit} 正式證據。` : selectedCaseUnit === formalUnit ? "本章作答依支援狀態進入正式學習紀錄。" : "回溯案件會記為複習，不倒退正式位置。"}</small>
        </div>

        <div className="scenario-mission-grid" role="radiogroup" aria-label={`選擇 ${selectedCaseUnit} 情境任務`}>
          {visibleMissions.map((candidate) => {
            const selected = candidate.id === selectedMission.id;
            const summary = missionSummary.get(candidate.id);
            return (
              <button key={candidate.id} className={selected ? "scenario-mission-card-selected" : ""} onClick={() => setSelectedMissionId(candidate.id)} role="radio" aria-checked={selected}>
                <img src={candidate.imageSrc} alt="" />
                <span className="scenario-mission-card-shade" />
                <span className="scenario-mission-card-copy"><small>{candidate.kind === "chapter" ? "CHAPTER CASE" : candidate.kind === "main" ? "MAIN CASE" : "SIDE MISSION"}</small><strong>{candidate.title}</strong><em>{candidate.duration} · 已完成 {summary?.completedCount ?? 0} 次</em></span>
              </button>
            );
          })}
        </div>

        <div className="scenario-hub-selection">
          <div className="scenario-selected-mission-copy"><span>{selectedMission.kicker}</span><h4>{selectedMission.title}</h4><p>{selectedMission.description}</p><div><b>{selectedMission.sequence(chosenCompanionId).length} 個節點</b><b>{selectedMission.focus}</b><b>{selectedSummary?.completedCount ?? 0} 次完成</b></div></div>
          {selectedMission.caseFile && <div className="scenario-case-dossier"><div><span>CASE OBJECTIVE</span><strong>{selectedMission.caseFile.objective}</strong></div><div><span>ECHO THREAT</span><strong>{selectedMission.caseFile.threat}</strong></div><footer><b>{selectedMission.caseFile.sourceCount} 個來源</b><b>證物 · {selectedMission.caseFile.completionEvidence}</b></footer></div>}
          {selectedUnitPreview && <div className="scenario-preview-guard"><b>PREVIEW ONLY · {selectedCaseUnit}</b><span>案件後果與章節證物可以保存；答案不建立題目狀態、FSRS、能力證據、XP、金幣或旅伴好感。</span></div>}
          <div className="scenario-route-picker" role="radiogroup" aria-label="選擇同行旅伴">
            {COMPANIONS.map((candidate) => {
              const selected = chosenCompanionId === candidate.id;
              const copy = SCENARIO_ROUTE_COPY[candidate.id];
              return (
                <button key={candidate.id} className={selected ? "scenario-route-selected" : ""} onClick={() => setChosenCompanionId(candidate.id)} role="radio" aria-checked={selected}>
                  <img src={companionImages[candidate.id]} alt="" />
                  <b>{copy.mark}</b>
                  <span><strong>{candidate.name}</strong><small>{selectedMission.companionLines[candidate.id]}</small></span>
                </button>
              );
            })}
          </div>
          <button className="scenario-primary" onClick={() => void startScenario(selectedMission.id)} disabled={busy}>{busy ? "正在整理案件…" : `與${getCompanion(chosenCompanionId).name}開始《${selectedMission.shortTitle}》`}</button>
        </div>

        <section className="scenario-memory" aria-labelledby="scenario-memory-title">
          <div className="scenario-memory-head"><div><span>COMPANION MEMORY</span><h4 id="scenario-memory-title">旅伴把錯因留下，不把失誤變成懲罰</h4></div><p>U02 正式案件的錯因會開啟新情境修復；後段預覽只保存案件後果。立即修復永遠標為 assisted，之後仍需延遲重測。</p></div>
          {pendingMemory.length ? (
            <div className="scenario-memory-grid">
              {pendingMemory.map((memory) => {
                const info = SCENARIO_WEAKNESS_INFO[memory.weaknessKey];
                const memoryCompanion = getCompanion(memory.lastCompanionId ?? chosenCompanionId);
                return (
                  <article key={memory.weaknessKey}>
                    <div><img src={companionImages[memoryCompanion.id]} alt="" /><span><small>{memoryCompanion.name}的任務記憶</small><strong>{info.label}</strong></span><b>{memory.pending}</b></div>
                    <p>{info.short}</p>
                    {memory.lastConsequence && <blockquote>{memory.lastConsequence}</blockquote>}
                    <button onClick={() => void startScenario(info.repairMissionId)} disabled={busy}>用 2 個新情境修復</button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="scenario-memory-clear"><strong>目前沒有待修復錯因</strong><p>之後若在情境任務答錯，同行旅伴會記住錯因並開啟新的兩題修復委託；好感不會下降。</p></div>
          )}
        </section>
        {error && <p className="scenario-error" aria-live="polite">{error}</p>}
      </section>
    );
  }

  if (run.status === "completed") {
    const endingCopy = run.endingCopy ?? (run.ending ? mission.endings[run.ending] : null);
    const processCopy = run.processCopy ?? (run.processResult ? SCENARIO_PROCESS_COPY[run.processResult] : null);
    return (
      <section className={`scenario-mission scenario-complete ${mission.kind === "repair" ? "scenario-complete-repair" : ""}`} aria-labelledby="scenario-complete-title">
        <div className="scenario-complete-art">
          <img src={mission.imageSrc} alt={mission.imageAlt} />
          <div className="scenario-complete-companion"><img src={companionImages[companion.id]} alt="" /><span>{companion.name}</span></div>
          <div className="scenario-complete-stamp"><span>{mission.kind === "repair" ? "REPAIR COMPLETE" : mission.caseFile ? "CASE COMPLETE" : "MISSION COMPLETE"}</span><strong>{run.clues}/{run.nodeSequence.length}</strong></div>
        </div>
        <div className="scenario-complete-copy">
          <span>{missionUnit} · {processCopy?.label ?? "任務完成"}{previewOnly ? " · PREVIEW" : ""}</span>
          <h3 id="scenario-complete-title">{endingCopy?.label ?? "情境任務已完成"}</h3>
          <p>{endingCopy?.detail}</p>
          <blockquote>{mission.companionLines[companion.id]}</blockquote>
          <div className="scenario-result-metrics">
            <div><span>正確線索</span><strong>{run.clues}<small>/{run.nodeSequence.length}</small></strong></div>
            <div><span>自然後果</span><strong>{run.setbacks}<small> 次繞行</small></strong></div>
            <div><span>{previewOnly ? "預覽金幣" : "任務獎勵"}</span><strong>{run.reward.gold ?? 0}<small> G</small></strong></div>
            <div><span>{companion.name}{previewOnly ? "預覽好感" : "好感"}</span><strong>+{run.reward.affinity ?? 0}</strong></div>
          </div>
          <p className="scenario-evidence-note">{mission.kind === "repair" ? "兩題都屬立即修復並標記為 assisted；答對不會冒充無提示精通，之後仍由 FSRS 延遲重測。" : previewOnly ? `已保存 ${missionUnit} 案件後果與章節證物；本輪不建立 FSRS、能力證據、XP、金幣或好感，正式位置仍是 ${formalUnit}。` : `首答、提示、二聽與修復都已分開保存；完成案件不會自行把正式進度推到下一章。`}</p>
          <div className="scenario-complete-actions">
            <button className="scenario-primary" onClick={() => void startScenario(mission.id, "start")} disabled={busy}>{busy ? "正在換題…" : mission.kind === "repair" ? "再做一組新情境" : "使用新變體再玩一次"}</button>
            <button className="scenario-secondary" onClick={returnToHub} disabled={busy}>返回任務中心</button>
            <span>《{mission.shortTitle}》已完成 {payload.completedCount ?? 1} 次；同節點會優先避開最近用過的英文情境。</span>
          </div>
        </div>
        {error && <p className="scenario-error" aria-live="polite">{error}</p>}
      </section>
    );
  }

  if (!question || !node) {
    return <section className="scenario-mission scenario-loading"><strong>這個任務節點需要重新同步。</strong><button className="scenario-primary" onClick={() => void loadScenario()}>重新同步</button></section>;
  }

  const focusedZone = mission.sceneZones.find((zone) => zone.id === sceneFocus) ?? mission.sceneZones[0];
  const actionType = question.mission.actionType ?? (question.kind === "output" ? "compose" : question.mission.document ? "verify" : "observe");
  const actionCopy = SCENARIO_ACTION_COPY[actionType];
  const errorCopy = question.mission.errorPattern ? SCENARIO_ERROR_PATTERN_COPY[question.mission.errorPattern] : null;
  const visibleDocuments = question.mission.documents ?? (question.mission.document ? [question.mission.document] : []);

  return (
    <section className={`scenario-mission scenario-active scenario-kind-${mission.kind}`} aria-labelledby="scenario-active-title">
      {journeyMode && <div className="scenario-journey-banner"><b>今日旅程 · 情境 {journeyCompleted}/{journeyTarget}</b><span>接受後果後會保存這個節點；達到本輪目標才接到旅伴回應。</span></div>}
      {previewOnly && <div className="scenario-active-preview"><b>PREVIEW ONLY · {missionUnit}</b><span>你正在正式位置 {formalUnit} 之後試玩；案件後果會保存，學習證據與遊戲獎勵不會被灌入。</span></div>}
      <header className="scenario-active-head">
        <div><span>{mission.kicker} · {companion.name}</span><h3 id="scenario-active-title">{mission.title}</h3><p>{mission.companionLines[companion.id]}</p></div>
        <div className="scenario-clock"><span>{mission.clockLabel}</span><strong>{question.mission.time}</strong><small>{run.currentIndex + 1} / {run.nodeSequence.length}</small></div>
      </header>

      <div className={`scenario-stage scenario-zone-${question.mission.zone}`}>
        <img className="scenario-stage-bg" src={mission.imageSrc} alt={mission.imageAlt} />
        <div className="scenario-stage-shade" />
        {mission.sceneZones.map((zone) => (
          <button key={zone.id} className={`scenario-hotspot scenario-hotspot-slot-${zone.slot} ${question.mission.zone === zone.id ? "scenario-hotspot-active" : ""}`} onClick={() => setSceneFocus(zone.id)} aria-label={`查看${zone.label}`}>
            <b>{question.mission.zone === zone.id ? "目前" : "查看"}</b><span>{zone.label}</span>
          </button>
        ))}
        <div className="scenario-scene-focus"><span>{focusedZone.label}</span><strong>{focusedZone.detail}</strong><small>{sceneFocus === question.mission.zone ? "這裡是目前任務節點。" : "這裡暫時沒有新線索；可先觀察場景，再回到目前目標。"}</small></div>
        <div className="scenario-stage-companion"><img src={companionImages[companion.id]} alt="" /><span><b>{companion.name}</b><small>{node.short}</small></span></div>
      </div>

      <div className="scenario-node-track" aria-label="情境任務進度">
        {run.nodeSequence.map((nodeId, index) => {
          const meta = getScenarioNodeMeta(nodeId, mission.id)!;
          const answer = completedAnswers.get(nodeId);
          const current = index === run.currentIndex;
          return (
            <div key={nodeId} className={`${current ? "scenario-node-current" : ""} ${answer ? answer.correct ? "scenario-node-correct" : "scenario-node-recovered" : ""}`}>
              <b>{answer ? answer.correct ? "✓" : "↻" : meta.mark}</b><span><strong>{meta.label}</strong><small>{current ? meta.time : answer ? answer.correct ? "線索取得" : "已修復推進" : "尚未抵達"}</small></span>
            </div>
          );
        })}
      </div>

      <article className="scenario-question-card">
        <div className="scenario-question-context">
          <span>{node.mark} · {question.mission.location}</span>
          <h4>{node.label}</h4>
          <p>{question.mission.narration}</p>
          <div><b>目前目標</b><strong>{question.mission.objective}</strong></div>
        </div>

        <div className="scenario-action-brief">
          <b>{actionCopy.mark}</b>
          <div><span>{question.mission.actionLabel ?? actionCopy.label}</span><strong>{question.mission.actionInstruction ?? actionCopy.detail}</strong></div>
          {question.mission.sourceIds?.length ? <small>{question.mission.sourceIds.map((source) => <i key={source}>{source}</i>)}</small> : <small><i>現場英文</i></small>}
        </div>

        {mission.phraseTools?.length ? <details className="scenario-phrase-tools"><summary><span>PHRASE TOOLS</span><strong>本章已教片語工具 · 不標示答案</strong></summary><div>{mission.phraseTools.map((tool) => <article key={tool.english}><b>{tool.english}</b><span>{tool.chinese}</span><small>{tool.use}</small></article>)}</div></details> : null}

        {visibleDocuments.length > 0 && (
          <div className={`scenario-document-stack ${visibleDocuments.length > 1 ? "scenario-document-stack-multi" : ""}`}>
            {visibleDocuments.map((document) => <div className="scenario-document" aria-label={document.title} key={document.title}>
            <span>{document.title}</span>
            <div className="scenario-document-table" style={{ "--scenario-columns": document.columns.length } as CSSProperties}>
              {document.columns.map((column) => <b key={column}>{column}</b>)}
              {document.rows.flatMap((row, rowIndex) => row.map((cell, columnIndex) => <span key={`${rowIndex}-${columnIndex}`}>{cell}</span>))}
            </div>
            {document.note && <p>{document.note}</p>}
          </div>)}
          </div>
        )}
        {question.passage && <div className="scenario-passage"><span>FIELD NOTE</span><p>{question.passage}</p></div>}

        {isListening && (
          <>
            <div className="scenario-listening">
              <div><span>{audioFallbackUsed ? "ASSISTED TRANSCRIPT" : "LISTEN ONCE"}</span><strong>{audioFallbackUsed ? "音訊救援已啟用；依文字內容鎖定答案。" : listenCount === 0 ? "先完整播放一次，再鎖定首答。" : firstAnswerLocked ? "首答已鎖定；二聽只用來修復理解。" : "首聽完成，現在依第一次理解作答。"}</strong><small>{audioFallbackUsed ? "這次會保存為有支援練習，不計為無提示聽力證據。" : "逐字稿會在結果後才出現。"}</small></div>
              {!firstAnswerLocked ? <button onClick={playListening} disabled={speaking || listenCount >= 1}>{speaking ? "播放中…" : listenCount ? audioFallbackUsed ? "文字救援中" : "首聽完成" : "▶ 播放首聽"}</button> : !resolution && !audioFallbackUsed && <button onClick={playListening} disabled={speaking || listenCount >= 2}>{speaking ? "播放中…" : listenCount >= 2 ? "二聽完成" : "↻ 二聽一次"}</button>}
            </div>
            {audioFallbackAvailable && listenCount === 0 && <button className="scenario-audio-fallback" onClick={useAudioFallback}><span>音訊無法播放？</span><strong>顯示英文內容並以有支援模式繼續</strong></button>}
            {audioFallbackUsed && <div className="scenario-audio-transcript"><span>音訊救援逐字稿</span><p>{question.listeningText}</p></div>}
          </>
        )}

        <div className="scenario-prompt"><span>YOUR ACTION · {actionCopy.label.toUpperCase()}</span><h4>{question.prompt}</h4>{question.outputPrompt && <p>{question.outputPrompt}</p>}</div>
        {question.kind === "choice" ? <div className="scenario-options">
          {question.options?.map((option, index) => {
            const selected = selectedOptionId === option.id;
            const correct = Boolean(resolution) && option.id === question.answerId;
            const wrong = Boolean(resolution) && selected && !resolution?.correct;
            return <button key={option.id} className={`${selected ? "scenario-option-selected" : ""} ${correct ? "scenario-option-correct" : ""} ${wrong ? "scenario-option-wrong" : ""}`} onClick={() => setSelectedOptionId(option.id)} disabled={Boolean(resolution) || firstAnswerLocked || (isListening && listenCount === 0)}><b>{String.fromCharCode(65 + index)}</b><span>{option.label}</span></button>;
          })}
        </div> : <label className="scenario-output-field"><span>用英文完成任務</span><textarea value={outputDraft} onChange={(event) => setOutputDraft(event.target.value)} disabled={Boolean(resolution)} rows={3} maxLength={420} placeholder="Write your action in English…" /><small>先送出自己的版本；參考答案會在結果後出現。</small></label>}

        {!resolution && !firstAnswerLocked && (
          <button className="scenario-hint-toggle" onClick={() => setHintVisible(true)} disabled={hintVisible}><span>{hintVisible ? "ASSISTED" : "需要一個不洩漏答案的提示？"}</span><strong>{hintVisible ? question.mission.hint : `請${companion.name}提醒我`}</strong></button>
        )}
        {hintVisible && <div className="scenario-hint"><b>{companion.name}</b><p>{question.mission.hint}</p><small>這次作答會標記為有提示練習，不冒充無提示精通。</small></div>}
        {mission.kind === "repair" && !resolution && <p className="scenario-repair-mode-note">這是立即修復委託；即使不開提示，本輪也固定標記為 assisted，避免把短期記憶冒充精通。</p>}

        {!resolution && (!isListening || !firstAnswerLocked) && hasAnswer && (
          <div className="scenario-confidence">
            <span>在看結果前，你有多確定？</span>
            <div>{([[1, "低"], [2, "普通"], [3, "高"]] as const).map(([value, label]) => <button key={value} className={confidence === value ? "scenario-confidence-active" : ""} onClick={() => setConfidence(value)}>{label}</button>)}</div>
            <button className="scenario-primary" onClick={commitAction} disabled={!confidence || busy}>{busy ? "保存首答中…" : isListening ? "鎖定首答" : "採取行動"}</button>
          </div>
        )}

        {isListening && firstAnswerLocked && !resolution && (
          <div className="scenario-listening-gate">
            <div><span>FIRST ANSWER LOCKED</span><strong>第一次答案與信心不會被覆寫。</strong><p>{audioFallbackUsed ? "文字救援已獨立標記；可直接查看結果。" : listenCount >= 2 ? "二聽已完成並會另記。" : "可二聽一次，也可直接查看結果。"}</p></div>
            <button className="scenario-primary" onClick={() => void resolveAnswer()} disabled={busy || speaking}>{busy ? "保存中…" : "看結果"}</button>
          </div>
        )}

        {resolution && (
          <div className={`scenario-resolution ${resolution.correct ? "scenario-resolution-correct" : "scenario-resolution-wrong"}`} aria-live="polite">
            <div className="scenario-consequence"><b>{resolution.correct ? "路線成立" : "自然後果"}</b><strong>{consequence}</strong></div>
            <div className="scenario-answer-check"><span>你的行動</span><strong>{question.kind === "output" ? answerValue : answerOption?.label}</strong><span>參考判斷</span><strong>{question.kind === "output" ? question.referenceAnswer : correctOption?.label}</strong></div>
            {errorCopy && <div className="scenario-error-trace"><span>ECHO ERROR TRACE</span><strong>{errorCopy.label}</strong><p>{errorCopy.detail}</p></div>}
            <div className="scenario-explanation"><span>完成行動後的解析</span><p>{question.explanation}</p><small>證據：{question.evidence}</small></div>
            {isListening && <details className="scenario-transcript"><summary>查看首聽逐字稿</summary><p>{question.listeningText}</p><small>本輪首聽 {Math.min(1, listenCount)} 次 · 二聽 {Math.max(0, listenCount - 1)} 次，兩者分開保存。</small></details>}
            <div className="scenario-evidence-status"><span>{previewOnly ? "躍遷預覽 · event only" : mission.kind === "repair" ? "立即修復 · assisted" : resolution.strictEvidenceEligible ? "無提示作答" : "有支援練習"}</span><strong>{previewOnly ? `已保存 ${missionUnit} 案件後果，不建立正式能力證據` : resolution.correct ? mission.kind === "repair" ? "已保存修復結果，之後仍需延遲重測" : resolution.novelSkillEvidence ? "已形成新的未見能力證據" : "已保存作答，但不重複灌高能力" : "已保存錯誤與修復紀錄，不計為成功證據"}</strong></div>
            <button className="scenario-primary" onClick={() => void continueScenario()} disabled={busy}>{busy ? "同步任務後果中…" : journeyMode ? `接受後果 · 完成本輪 ${Math.min(journeyTarget, journeyCompleted + 1)}/${journeyTarget}` : run.currentIndex + 1 >= run.nodeSequence.length ? mission.kind === "repair" ? "完成本次修復" : "完成任務" : "接受後果 · 前往下一步"}</button>
          </div>
        )}
        {error && <p className="scenario-error" aria-live="polite">{error}</p>}
      </article>

      <footer className="scenario-footer">
        <span>{missionUnit} · 線索 {run.clues}/{run.nodeSequence.length} · 繞行 {run.setbacks} 次 · 答錯不扣好感、不刪進度</span>
        <div><button onClick={returnToHub} disabled={busy}>任務中心</button><button onClick={() => void startScenario(mission.id, "restart")} disabled={busy}>重新開始本任務</button></div>
      </footer>
    </section>
  );
}
