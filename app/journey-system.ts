import { getSkillTagLabel } from "./content";
import type { CompanionId } from "./companions";

export type JourneyStep = "practice" | "scenario" | "companion" | "repair" | "settlement";
export type JourneyStatus = "active" | "completed" | "abandoned";
export type AbilityStatus = "locked" | "current" | "weak" | "due" | "retest" | "stable" | "taught";
export type JourneyLength = "short" | "standard" | "full";

export const JOURNEY_LENGTHS: Record<JourneyLength, {
  label: string;
  duration: string;
  detail: string;
  practiceCount: number;
  reviewSlots: number;
  freshSlots: number;
  transferSlots: number;
  scenarioTarget: number;
  repairCount: number;
}> = {
  short: {
    label: "短程",
    duration: "約 8–10 分鐘",
    detail: "3 題英文＋1 個情境節點；有弱點時補 1 題新情境。",
    practiceCount: 3,
    reviewSlots: 1,
    freshSlots: 1,
    transferSlots: 1,
    scenarioTarget: 1,
    repairCount: 1,
  },
  standard: {
    label: "標準",
    duration: "約 15–20 分鐘",
    detail: "6 題英文＋1 個情境節點；沿用完整的 3／2／1 配比。",
    practiceCount: 6,
    reviewSlots: 3,
    freshSlots: 2,
    transferSlots: 1,
    scenarioTarget: 1,
    repairCount: 2,
  },
  full: {
    label: "完整",
    duration: "約 25–35 分鐘",
    detail: "10 題英文＋2 個情境節點；增加遷移與跨形式證據。",
    practiceCount: 10,
    reviewSlots: 4,
    freshSlots: 3,
    transferSlots: 3,
    scenarioTarget: 2,
    repairCount: 2,
  },
};

export const JOURNEY_STEPS: readonly JourneyStep[] = ["practice", "scenario", "companion", "repair", "settlement"];

export const JOURNEY_STEP_INFO: Record<JourneyStep, { label: string; short: string; detail: string }> = {
  practice: { label: "到期複習＋目前單元", short: "英文行動", detail: "先處理到期技能，再保留目前單元新內容與未見遷移。" },
  scenario: { label: "情境行動", short: "推進任務", detail: "完成一個會改變場景後果的 U02 任務節點。" },
  companion: { label: "旅伴回應", short: "同行記憶", detail: "旅伴依本輪路線、錯因與進步回應，不因答錯扣好感。" },
  repair: { label: "弱點修復", short: "新情境修復", detail: "只在本輪出現弱點時依旅程長度加入新情境；立即修復不冒充精通。" },
  settlement: { label: "旅程結算", short: "一次結算", detail: "把練習、情境、旅伴、修復與遊戲獎勵合併成一張報告。" },
};

export const GRAMMAR_OBJECTIVES = [
  { id: "G01", tag: "grammar.sentence_core", firstUnit: "U01" },
  { id: "G02", tag: "grammar.present_simple_do_does", firstUnit: "U02" },
  { id: "G03", tag: "grammar.subject_verb_agreement", firstUnit: "U02" },
  { id: "G04", tag: "grammar.past_future_timeline", firstUnit: "U03" },
  { id: "G05", tag: "grammar.progressive_aspect", firstUnit: "U02" },
  { id: "G06", tag: "grammar.word_forms", firstUnit: "U05" },
  { id: "G07", tag: "grammar.articles_quantifiers", firstUnit: "U11" },
  { id: "G08", tag: "grammar.pronouns", firstUnit: "U01" },
  { id: "G09", tag: "grammar.passive_voice", firstUnit: "U06" },
  { id: "G10", tag: "grammar.modals", firstUnit: "U07" },
  { id: "G11", tag: "grammar.infinitive_gerund", firstUnit: "U03" },
  { id: "G12", tag: "grammar.participial_adjectives", firstUnit: "U05" },
  { id: "G13", tag: "grammar.comparatives", firstUnit: "U11" },
  { id: "G14", tag: "grammar.prepositions", firstUnit: "U07" },
  { id: "G15", tag: "grammar.connectors_conditions", firstUnit: "U04" },
  { id: "G16", tag: "grammar.relative_clauses", firstUnit: "U12" },
  { id: "G17", tag: "grammar.present_perfect", firstUnit: "U09" },
  { id: "G18", tag: "grammar.questions_responses", firstUnit: "U02" },
  { id: "G19", tag: "grammar.noun_clauses_indirect_questions", firstUnit: "U15" },
  { id: "G20", tag: "grammar.causatives", firstUnit: "U15" },
  { id: "G21", tag: "grammar.reduced_relative_clauses", firstUnit: "U12" },
  { id: "G22", tag: "grammar.parallel_correlatives", firstUnit: "U14" },
  { id: "G23", tag: "grammar.mandative_subjunctive", firstUnit: "U10" },
  { id: "G24", tag: "grammar.fixed_preposition_patterns", firstUnit: "U15" },
  { id: "G25", tag: "strategy.context_elimination", firstUnit: "U16" },
] as const;

export type AbilityInput = {
  skillTag: string;
  validated?: boolean;
  lastRating?: number | null;
  successfulUnseenCount?: number;
  nextReviewAt?: string | null;
};

export type DiagnosticInput = {
  tag: string;
  currentWeak?: number;
  lowConfidence?: number;
  repeatedWrong?: number;
  highConfidenceWrong?: number;
};

function unitNumber(unitId: string) {
  const value = Number(unitId.replace(/^U/, ""));
  return Number.isFinite(value) ? value : 0;
}

export function buildAbilityMap(
  activeUnitId: string,
  skillStates: readonly AbilityInput[],
  diagnostics: readonly DiagnosticInput[],
  nowMs = Date.now(),
) {
  const activeNumber = unitNumber(activeUnitId);
  const states = new Map(skillStates.map((state) => [state.skillTag, state]));
  const weak = new Map(diagnostics.map((item) => [item.tag, item]));
  return GRAMMAR_OBJECTIVES.map((objective) => {
    const firstNumber = unitNumber(objective.firstUnit);
    const state = states.get(objective.tag);
    const diagnostic = weak.get(objective.tag);
    const isWeak = Boolean(diagnostic && (
      Number(diagnostic.currentWeak ?? 0) > 0
      || Number(diagnostic.lowConfidence ?? 0) > 0
      || Number(diagnostic.repeatedWrong ?? 0) > 0
      || Number(diagnostic.highConfidenceWrong ?? 0) > 0
    ));
    const dueAt = Date.parse(String(state?.nextReviewAt ?? ""));
    let status: AbilityStatus;
    if (firstNumber > activeNumber) status = "locked";
    else if (isWeak) status = "weak";
    else if (Number.isFinite(dueAt) && dueAt <= nowMs) status = "due";
    else if (state?.validated) status = "stable";
    else if (state && Number(state.successfulUnseenCount ?? 0) > 0) status = "retest";
    else if (firstNumber === activeNumber) status = "current";
    else status = "taught";
    return {
      id: objective.id,
      tag: objective.tag,
      label: getSkillTagLabel(objective.tag),
      firstUnit: objective.firstUnit,
      status,
      successfulUnseenCount: Number(state?.successfulUnseenCount ?? 0),
      nextReviewAt: state?.nextReviewAt ?? null,
    };
  });
}

export function companionJourneyLine(
  companionId: CompanionId,
  formalUnit: string,
  weaknessLabel: string | null,
  correctCount: number,
  answeredCount: number,
  memory?: { previousJourneyCount?: number; lastMissionTitle?: string | null; repairedWeakness?: string | null; lastConsequence?: string | null },
) {
  const result = answeredCount ? `${correctCount}/${answeredCount}` : "這一段";
  const weakness = weaknessLabel ? `我記住了你剛才在「${weaknessLabel}」停了一下` : "這一輪沒有留下明顯的新錯因";
  const history = memory?.lastMissionTitle
    ? `《${memory.lastMissionTitle}》留下的路線與後果，我還記得。`
    : Number(memory?.previousJourneyCount ?? 0) > 0
      ? `這已經是我們一起走完的第 ${Number(memory?.previousJourneyCount ?? 0) + 1} 輪。`
      : "這是我們第一次把整段旅程接在一起。";
  const recovery = memory?.repairedWeakness ? `之前的「${memory.repairedWeakness}」已經完成一次修復，但還要等延遲重測。` : "";
  if (companionId === "sena") return `${history}${result}。${weakness}；等等我會把證據換成新的情境，再陪你確認一次。${recovery}正式位置仍是 ${formalUnit}。`;
  if (companionId === "yori") return `${history}${result}。${weakness}。不用把答錯當失敗；我們換條路，把同一能力帶回來就好。${recovery}正式位置仍是 ${formalUnit}。`;
  return `${history}${result}。${weakness}；先把這個節點收乾淨，再繼續往前。${recovery}完成遊戲不會跳過 ${formalUnit}。`;
}

export function journeyProgressPercent(step: JourneyStep) {
  const index = JOURNEY_STEPS.indexOf(step);
  return index < 0 ? 0 : Math.round((index / Math.max(1, JOURNEY_STEPS.length - 1)) * 100);
}
