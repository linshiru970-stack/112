"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  QUESTIONS,
  UNITS,
  VOCABULARY,
  VOCABULARY_OCCURRENCES,
  getAcceptedOutputAnswers,
  getQuestionSkillTags,
  getVocabularyMemoryId,
  matchesAcceptedOutput,
  type PracticeQuestion,
  type UnitId,
  type VocabularyEntry,
} from "./content";
import { vocabularyInText } from "./vocabulary-matching";
import { buildAdaptiveDailyQueue, deriveLearningFrontier } from "./learning-path";
import {
  ADVENTURE_REGIONS,
  BATTLE_STANCES,
  BOSS_CORE_TARGET,
  BOSS_ENCOUNTERS,
  BOSS_TURN_LIMIT,
  REGION_ENCOUNTERS,
  XP_PER_LEVEL,
  adventureLevel,
  adventureRank,
  battleEventFor,
  battleIntentFor,
  battleTurnDamage,
  collectibleFor,
  getBattleStance,
  resolveBattleEventEffect,
  type BattleStanceId,
} from "./adventure";
import {
  COMPANIONS,
  DEFAULT_COMPANION_ID,
  companionAffinityTier,
  companionBattleBonus,
  companionBattleResultLine,
  companionGreeting,
  companionWrongDamageReduction,
  getCompanion,
  type CompanionId,
} from "./companions";
import {
  GAME_EQUIPMENT,
  GAME_ITEMS,
  GAME_LOADOUT_STYLES,
  GAME_MEMORIES,
  GAME_OUTFITS,
  MAX_WILLPOWER,
  battleBurstCost,
  battleEquipmentDamageBonus,
  battleStartingEnergy,
  expeditionBoonDamageBonus,
  expeditionBoonOptions,
  expeditionEnemyMaxHp,
  expeditionStartingEnergy,
  gameQuestRewardLabel,
  getExpeditionBoon,
  getGameEquipment,
  getGameItem,
  getGameOutfit,
  type BattleGrade,
  type ExpeditionBoonId,
  type GameEquipmentId,
  type GameItemId,
  type GameOutfitId,
  type GameQuestId,
  type GameQuestReward,
} from "./game-system";
import { VARIANT_QUESTIONS, getUnseenVariantQuestions, getVariantQuestion } from "./question-variants";
import { ScenarioMissionClient } from "./scenario-mission-client";
import {
  AbilityMapPanel,
  JourneyCommandCenter,
  type JourneyPayload,
  type JourneySession,
} from "./journey-command-center";
import { JOURNEY_LENGTHS, type JourneyLength } from "./journey-system";
import { FirstActStoryPanel, FirstActStoryPreview } from "./first-act-story";
import type { StoryPayload } from "./story-store";
import type { ContentDifficultyId, StoryRouteId } from "./story-content";
import {
  LearningToolkit,
  StudyItemActions,
  type ReportPeriod,
  type SpeechAccent,
} from "./learning-toolkit";
import { getCampaignCaseFile } from "./campaign-case-files";

type StoredState = {
  question_id: string;
  unit: string;
  kind: string;
  attempts: number;
  correct_count: number;
  wrong_count: number;
  last_answer?: string | null;
  last_correct: number | null;
  confidence: number | null;
  next_review_at: string;
  latest_output?: string | null;
  last_answered_at?: string | null;
};

type ProgressPayload = {
  user?: { name: string; synced: boolean };
  profile?: { streak_count?: number; last_activity_date?: string | null } | null;
  preferences?: {
    interfaceMode?: InterfaceMode;
    fontScale?: FontScale;
    motionMode?: MotionMode;
    speechAccent?: SpeechAccent;
    speechRate?: number;
    reportPeriod?: ReportPeriod;
    syncedAt?: string | null;
  };
  states?: StoredState[];
  wrong?: StoredState[];
  dueCount?: number;
  todayCount?: number;
  schemaVersion?: number;
  diagnostics?: Array<{
    tag: string;
    label: string;
    attempts: number;
    correct: number;
    wrong: number;
    highConfidenceWrong: number;
    lowConfidence: number;
    currentWeak: number;
    repeatedWrong: number;
  }>;
  skillStates?: Array<{
    skill_tag: string;
    last_rating: number | null;
    review_count: number;
    distinct_question_count: number;
    successful_unseen_count: number;
    next_review_at: string;
    validated: boolean;
  }>;
  mockExams?: Array<{
    id: number;
    unit: string;
    source_label: string;
    completed_questions: number;
    listening_correct: number | null;
    reading_correct: number | null;
    duration_minutes: number | null;
    interrupted: number;
    local_date: string;
    created_at: string;
  }>;
  passedMockUnits?: string[];
  evidenceFingerprints?: string[];
  formalQuestionIds?: string[];
  bossClears?: string[];
};

type VocabularyState = {
  vocab_id: string;
  unit: string;
  item: string;
  last_rating: number | null;
  review_count: number;
  next_review_at: string;
  note: string;
  due: boolean;
  mastery: { label: string; level: number };
};

type VocabularyPayload = {
  states?: VocabularyState[];
  dueCount?: number;
  synced?: boolean;
};

type CompanionState = {
  companion_id: CompanionId;
  affinity: number;
  selected: number;
  last_interaction_at?: string | null;
  tier?: { level: number; label: string; next: number };
};

type CompanionInteraction = {
  id: number;
  companion_id: CompanionId;
  topic_id: string;
  choice_id: string;
  player_line: string;
  reply: string;
  affinity_delta: number;
  local_date: string;
  created_at: string;
};

type CompanionPayload = {
  states?: CompanionState[];
  recent?: CompanionInteraction[];
  visitedChoiceKeys?: string[];
  memories?: Array<{ id: string; companionId: CompanionId; type: "mission" | "journey" | "repair"; title: string; detail: string; date: string; imageSrc: string }>;
  contextLines?: Partial<Record<CompanionId, string>>;
  synced?: boolean;
};

type GamePayload = {
  profile?: { coins: number; masteryMarks: number; wins: number; losses: number; commissionClaims?: number };
  inventory?: Array<{ itemId: string; quantity: number }>;
  equipment?: Array<{ slot: string; itemId: string }>;
  outfits?: Array<{ companionId: CompanionId; outfitId: GameOutfitId }>;
  unlocks?: Array<{ unlockId: string; source: string; unlockedAt: string }>;
  recentBattles?: Array<{ battle_id?: string; mode?: string; encounter_id?: string; outcome?: string; grade?: string; gold?: number; created_at?: string }>;
  dailyQuests?: Array<{
    id: GameQuestId;
    mark: string;
    title: string;
    detail: string;
    target: number;
    reward: GameQuestReward;
    progress: number;
    claimed: boolean;
  }>;
  questDate?: string;
  synced?: boolean;
};

type BattleReward = { gold: number; itemId: GameItemId | null; newUnlocks: string[]; boonId?: ExpeditionBoonId | null };

type View = "today" | "wrong" | "vocab" | "progress" | "course";
type UnitFilter = "path" | UnitId;
type StageFilter = "all" | "基礎建立" | "句型擴展" | "TOEIC 應用" | "整合與校準";
type VocabScope = "focus" | "all" | "saved" | "due";
type VocabTier = "all" | "A" | "B" | "C" | "bbc";
type OutputAssessment = "accepted" | "natural" | "understandable" | "needs-fix";
type AnswerDraft = { value: string; correct: boolean | null; output?: string; outputAssessment?: OutputAssessment };
type BattleHit = {
  answerReceiptId: string;
  questionId: string;
  skillLabel: string;
  correct: boolean;
  damage: number;
  boonDamage: number;
  eventDamage: number;
  eventSucceeded: boolean;
  eventName: string | null;
  chain: number;
  countered: boolean;
  energyGain: number;
  burst: boolean;
  coreHit: boolean;
  willpowerDamage: number;
  blockedDamage: number;
  contentAssist: boolean;
  stanceId: BattleStanceId;
  companionId: CompanionId;
};
type BattleImpact = BattleHit & { id: number };
type BattleMode = "expedition" | "boss" | "repair";
type BattleOutcome = "active" | "victory" | "defeat";
type AdventureTab = "mission" | "party" | "camp" | "world" | "learning";
type RepairPlan = {
  weakness: string;
  sourceQuestionId: string;
  questionIds: string[];
  correctCount: number;
  completed: boolean;
  retryMode: "expedition" | "boss";
  retryBossRegionId: string | null;
};
type ListeningMode = "learning" | "toeic" | "hard";
type InterfaceMode = "simple" | "detailed";
type FontScale = "standard" | "large";
type MotionMode = "standard" | "reduced";

const STAGES: Array<{ id: Exclude<StageFilter, "all">; range: string; caption: string }> = [
  { id: "基礎建立", range: "U01–U10", caption: "句子骨架、時態與高頻搭配" },
  { id: "句型擴展", range: "U11–U20", caption: "長句、指涉與跨句理解" },
  { id: "TOEIC 應用", range: "U21–U30", caption: "資訊定位、目的與有限推論" },
  { id: "整合與校準", range: "U31–U40", caption: "跨段證據、耐力與作答校準" },
];

const MOCK_GATE_UNITS: UnitId[] = ["U35", "U37", "U39"];
const STANDARD_EXPEDITION_SLOT_LABELS = ["複習", "複習", "弱點", "新題", "新題", "遷移"] as const;
const QUEUE_QUESTIONS = QUESTIONS.map((question) => ({
  ...question,
  skillTags: getQuestionSkillTags(question),
  role: question.skill.includes("情境遷移") ? ("transfer" as const) : ("core" as const),
}));
const STATIC_QUESTION_IDS = new Set(QUESTIONS.map((question) => question.id));
const VARIANT_QUEUE_QUESTIONS = VARIANT_QUESTIONS.map((question) => ({
  ...question,
  skillTags: getQuestionSkillTags(question),
  role: "transfer" as const,
  fingerprint: question.variant?.fingerprint,
}));

function getPlayableQuestion(id?: string) {
  if (!id) return undefined;
  return QUESTIONS.find((question) => question.id === id) ?? getVariantQuestion(id);
}

function todayInTaipei() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

function newBattleId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `battle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shuffle<T>(items: readonly T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function stableQuestionOptions(question?: PracticeQuestion) {
  if (!question?.options) return [];
  const score = (value: string) => {
    let hash = 2166136261;
    for (const character of value) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };
  return [...question.options].sort((left, right) => score(`${question.id}:${left.id}`) - score(`${question.id}:${right.id}`));
}

function formatReviewTime(value?: string) {
  if (!value) return "尚未安排";
  const date = new Date(value);
  if (date.getTime() <= Date.now()) return "現在到期";
  return date.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", timeZone: "Asia/Taipei" });
}

function gameUnlockLabel(unlockId: string) {
  if (unlockId.startsWith("equipment:")) return getGameEquipment(unlockId.slice("equipment:".length))?.name ?? "新裝備";
  if (unlockId.startsWith("outfit:")) return `衣裝「${getGameOutfit(unlockId.slice("outfit:".length))?.name ?? "新旅裝"}」`;
  if (unlockId.startsWith("memory:")) {
    const memory = GAME_MEMORIES.find((entry) => entry.id === unlockId.slice("memory:".length));
    return memory ? `CG《${memory.title}》` : "新旅途回憶";
  }
  return "新收藏";
}

function optionReason(question: PracticeQuestion, optionId: string, optionLabel: string, isCorrect: boolean) {
  const tailored = question.optionReasons?.[optionId];
  if (tailored) return tailored;
  if (isCorrect) return "符合教材證據與本題規則，是這題的唯一正解。";
  if (question.skill.includes("閱讀")) return `「${optionLabel}」沒有得到文章充分支持，或把人物、時間、因果關係對錯了。`;
  if (question.skill.includes("聽力")) return `「${optionLabel}」與聽力中的關鍵資訊不一致；不要只因為聽到相似單字就選。`;
  if (question.skill.includes("文法") || question.sourceLabel.includes("G")) return `「${optionLabel}」不符合這題需要的句型或動詞形式；對照下方規則可以看出差異。`;
  if (question.skill.includes("單字") || question.skill.includes("搭配") || question.skill.includes("改寫")) return `「${optionLabel}」和題目要找的意思或固定搭配不同。`;
  return `「${optionLabel}」超出題目能支持的範圍，或把時間、條件、人物／下一步推錯了。`;
}

function accuracyFor(states: StoredState[]) {
  const attempts = states.reduce((sum, state) => sum + state.attempts, 0);
  const correct = states.reduce((sum, state) => sum + state.correct_count, 0);
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

function hasEnglishSpeech(text?: string | null) {
  return Boolean(text && /[A-Za-z]{2,}/.test(text));
}

function splitEnglishSentences(text: string) {
  const sentences = text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean);
  return sentences?.length ? sentences : [text.trim()];
}

export function PracticeClient({ displayName }: { displayName: string }) {
  const [view, setView] = useState<View>("today");
  const [progress, setProgress] = useState<ProgressPayload>({ states: [], wrong: [] });
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");
  const [queue, setQueue] = useState<string[]>([]);
  const [position, setPosition] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [draft, setDraft] = useState<AnswerDraft | null>(null);
  const [feedbackRevealed, setFeedbackRevealed] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [listeningPlayCount, setListeningPlayCount] = useState(0);
  const [answerListenCount, setAnswerListenCount] = useState<number | null>(null);
  const [practiceListeningQuestionId, setPracticeListeningQuestionId] = useState<string | null>(null);
  const [listeningMode, setListeningMode] = useState<ListeningMode>("learning");
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>("simple");
  const [fontScale, setFontScale] = useState<FontScale>("standard");
  const [motionMode, setMotionMode] = useState<MotionMode>("standard");
  const [speechAccent, setSpeechAccent] = useState<SpeechAccent>("en-US");
  const [speechRate, setSpeechRate] = useState(0.9);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("week");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesNotice, setPreferencesNotice] = useState("");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("path");
  const [courseStage, setCourseStage] = useState<StageFilter>("all");
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState<UnitId | null>(null);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [speakingUnit, setSpeakingUnit] = useState<UnitId | null>(null);
  const [audioNote, setAudioNote] = useState("");
  const [vocabProgress, setVocabProgress] = useState<VocabularyPayload>({ states: [] });
  const [vocabLoading, setVocabLoading] = useState(true);
  const [vocabError, setVocabError] = useState("");
  const [vocabSearch, setVocabSearch] = useState("");
  const [vocabScope, setVocabScope] = useState<VocabScope>("focus");
  const [vocabTier, setVocabTier] = useState<VocabTier>("all");
  const [vocabUnit, setVocabUnit] = useState<"all" | UnitId>("all");
  const [vocabLimit, setVocabLimit] = useState(24);
  const [vocabQueue, setVocabQueue] = useState<string[]>([]);
  const [vocabPosition, setVocabPosition] = useState(0);
  const [vocabRevealed, setVocabRevealed] = useState(false);
  const [vocabSaving, setVocabSaving] = useState(false);
  const [vocabMessage, setVocabMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [peekVocabId, setPeekVocabId] = useState<string | null>(null);
  const [peekSentence, setPeekSentence] = useState<string | null>(null);
  const [peekWord, setPeekWord] = useState<{ word: string; sentence: string } | null>(null);
  const [mockUnit, setMockUnit] = useState<UnitId>("U35");
  const [mockSource, setMockSource] = useState("");
  const [mockListening, setMockListening] = useState("");
  const [mockReading, setMockReading] = useState("");
  const [mockDuration, setMockDuration] = useState("120");
  const [mockInterrupted, setMockInterrupted] = useState(false);
  const [mockSaving, setMockSaving] = useState(false);
  const [mockMessage, setMockMessage] = useState("");
  const [roundStartXp, setRoundStartXp] = useState<number | null>(null);
  const [battleMode, setBattleMode] = useState<BattleMode>("expedition");
  const [bossRegionId, setBossRegionId] = useState<string | null>(null);
  const [bossRunId, setBossRunId] = useState<string | null>(null);
  const [battleStanceId, setBattleStanceId] = useState<BattleStanceId>("blade");
  const [battleHistory, setBattleHistory] = useState<BattleHit[]>([]);
  const [battleImpact, setBattleImpact] = useState<BattleImpact | null>(null);
  const [battleEnergy, setBattleEnergy] = useState(0);
  const [battleBurstArmed, setBattleBurstArmed] = useState(false);
  const [battleMessage, setBattleMessage] = useState("選好架勢後開始作答；每一題都會推動這場遭遇。");
  const [companionProgress, setCompanionProgress] = useState<CompanionPayload>({ states: [], recent: [] });
  const [companionLoading, setCompanionLoading] = useState(true);
  const [companionError, setCompanionError] = useState("");
  const [companionSaving, setCompanionSaving] = useState(false);
  const [focusedCompanionId, setFocusedCompanionId] = useState<CompanionId | null>(null);
  const [companionTopicId, setCompanionTopicId] = useState<string | null>(null);
  const [companionPlayerLine, setCompanionPlayerLine] = useState("");
  const [companionReply, setCompanionReply] = useState("");
  const [companionNotice, setCompanionNotice] = useState("");
  const [gameProgress, setGameProgress] = useState<GamePayload>({});
  const [gameLoading, setGameLoading] = useState(true);
  const [gameError, setGameError] = useState("");
  const [gameBusy, setGameBusy] = useState(false);
  const [battleOutcome, setBattleOutcome] = useState<BattleOutcome>("active");
  const [battleWillpower, setBattleWillpower] = useState(MAX_WILLPOWER);
  const [battleSessionId, setBattleSessionId] = useState("");
  const [battleGuardActive, setBattleGuardActive] = useState(false);
  const [battleCharmSpent, setBattleCharmSpent] = useState(false);
  const [battleReward, setBattleReward] = useState<BattleReward | null>(null);
  const [battleGrade, setBattleGrade] = useState<BattleGrade | null>(null);
  const [battleBoonOptions, setBattleBoonOptions] = useState<ExpeditionBoonId[]>([]);
  const [battleBoonId, setBattleBoonId] = useState<ExpeditionBoonId | null>(null);
  const [battleBoonGuardSpent, setBattleBoonGuardSpent] = useState(false);
  const [battleEliminatedOptionId, setBattleEliminatedOptionId] = useState<string | null>(null);
  const [battleItemHintVisible, setBattleItemHintVisible] = useState(false);
  const [questionItemAssisted, setQuestionItemAssisted] = useState(false);
  const [repairPlan, setRepairPlan] = useState<RepairPlan | null>(null);
  const [adventureTab, setAdventureTab] = useState<AdventureTab>("mission");
  const [openMemoryId, setOpenMemoryId] = useState<string | null>(null);
  const [questNotice, setQuestNotice] = useState("");
  const [journeyProgress, setJourneyProgress] = useState<JourneyPayload>({});
  const [journeyLength, setJourneyLength] = useState<JourneyLength>("standard");
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [journeyBusy, setJourneyBusy] = useState(false);
  const [journeyError, setJourneyError] = useState("");
  const [storyProgress, setStoryProgress] = useState<StoryPayload | null>(null);
  const [storyUnit, setStoryUnit] = useState<UnitId>("U01");
  const [storyRoute, setStoryRoute] = useState<StoryRouteId>("formal");
  const [contentDifficulty, setContentDifficulty] = useState<ContentDifficultyId>("standard");
  const [storyLoading, setStoryLoading] = useState(true);
  const [storyBusy, setStoryBusy] = useState(false);
  const [storyError, setStoryError] = useState("");
  const [scenarioFocusRequest, setScenarioFocusRequest] = useState<{ unit: UnitId; token: number }>({ unit: "U01", token: 0 });
  const [practicePreviewOnly, setPracticePreviewOnly] = useState(false);
  const [customPracticeName, setCustomPracticeName] = useState("");
  const [practiceRoute, setPracticeRoute] = useState<StoryRouteId>("formal");
  const [practiceDifficulty, setPracticeDifficulty] = useState<ContentDifficultyId>("standard");
  const hasBuiltInitialQueue = useRef(false);
  const effectiveActiveMs = useRef(0);
  const effectiveLastTick = useRef<number | null>(null);
  const effectiveLastInteraction = useRef<number | null>(null);
  const answerActiveMs = useRef<number | null>(null);
  const answerRequestId = useRef<string | null>(null);
  const questionAnswered = useRef(false);
  const listeningPlaybackToken = useRef(0);
  const battleImpactSequence = useRef(0);
  const bossStartPending = useRef(false);
  const journeyRestorePending = useRef(false);
  const journeyCheckpointTimer = useRef<number | null>(null);

  const states = useMemo(() => progress.states ?? [], [progress.states]);
  const journeySession = journeyProgress.session ?? null;
  const journeyPracticeActive = journeySession?.status === "active" && journeySession.currentStep === "practice";
  const journeyRepairActive = journeySession?.status === "active" && journeySession.currentStep === "repair";
  const activeJourneyConfig = journeySession ? JOURNEY_LENGTHS[journeySession.journeyLength] : null;
  const formalQuestionIds = useMemo(() => new Set(progress.formalQuestionIds ?? []), [progress.formalQuestionIds]);
  const formalStates = useMemo(() => states.filter((state) => {
    if (!STATIC_QUESTION_IDS.has(state.question_id)) return false;
    const unitNumber = Number(state.unit.replace("U", ""));
    return unitNumber <= 2 || formalQuestionIds.has(state.question_id);
  }), [formalQuestionIds, states]);
  const formalStateById = useMemo(() => new Map(formalStates.map((state) => [state.question_id, state])), [formalStates]);
  const wrongStates = progress.wrong ?? [];
  const evidenceFingerprints = useMemo(() => new Set(progress.evidenceFingerprints ?? []), [progress.evidenceFingerprints]);
  const clearedBossIds = useMemo(() => new Set(progress.bossClears ?? []), [progress.bossClears]);
  const [now, setNow] = useState(() => Date.now());
  const dueQuestionCount = useMemo(
    () => states.filter((state) => Date.parse(state.next_review_at) <= now).length,
    [now, states],
  );
  const dueSkillCount = useMemo(
    () => (progress.skillStates ?? []).filter((state) => Date.parse(state.next_review_at) <= now).length,
    [now, progress.skillStates],
  );
  const currentQuestion = getPlayableQuestion(queue[position]);
  const currentQuestionUnit = currentQuestion ? UNITS.find((unit) => unit.id === currentQuestion.unit) : undefined;
  const repairActive = battleMode === "repair";
  const repairSourceQuestion = repairPlan ? getPlayableQuestion(repairPlan.sourceQuestionId) : undefined;
  const currentQuestionIsListening = Boolean(currentQuestion?.listeningText || currentQuestion?.skill.includes("聽力"));
  const currentOptions = stableQuestionOptions(currentQuestion);
  const wardHiddenOptionId = battleStanceId === "ward" && currentQuestion?.kind === "choice" && !draft
    ? currentOptions.find((option) => option.id !== currentQuestion.answerId)?.id
    : undefined;
  const playableOptions = currentOptions.filter((option) => option.id !== wardHiddenOptionId && option.id !== battleEliminatedOptionId);
  const acceptedOutputAnswers = currentQuestion ? getAcceptedOutputAnswers(currentQuestion) : [];
  const hideListeningText = Boolean(currentQuestionIsListening && listeningMode !== "learning" && !feedbackRevealed);
  const strictEvidenceEligible = Boolean(
    currentQuestion
    && !repairActive
    && !practicePreviewOnly
    && battleStanceId === "blade"
    && !questionItemAssisted
    && (!currentQuestionIsListening || listeningMode !== "learning")
    && (currentQuestion.kind !== "output" || matchesAcceptedOutput(currentQuestion, draft?.output ?? output)),
  );
  const completedToday = progress.todayCount ?? 0;
  const todayDone = !loading && queue.length > 0 && (repairActive
    ? Boolean(repairPlan?.completed)
    : battleOutcome !== "active" || !currentQuestion || position >= queue.length);
  const learningFrontier = useMemo(
    () => deriveLearningFrontier(UNITS, QUESTIONS, formalStates, "U02", {
      gateUnitIds: MOCK_GATE_UNITS,
      passedGateUnitIds: progress.passedMockUnits ?? [],
    }),
    [formalStates, progress.passedMockUnits],
  );
  const activeUnitIndex = learningFrontier.activeUnitIndex;
  const activeUnit = UNITS[activeUnitIndex];
  const activeRecorded = learningFrontier.activeAnswered;
  const activeQuestionCount = learningFrontier.activeQuestionCount;
  const pathCoverage = activeQuestionCount ? Math.round((activeRecorded / activeQuestionCount) * 100) : 0;
  const pathLabel = `${activeUnit.id} · ${activeRecorded}/${activeQuestionCount} 題已走過`;
  const selectedUnit = selectedUnitId ? UNITS.find((unit) => unit.id === selectedUnitId) : null;
  const selectedCampaignCase = selectedUnit ? getCampaignCaseFile(selectedUnit.id) : undefined;
  const selectedUnitVocabulary = selectedUnit ? VOCABULARY_OCCURRENCES.filter((entry) => entry.unit === selectedUnit.id) : [];
  const visibleUnits = useMemo(() => {
    const query = courseSearch.trim().toLocaleLowerCase();
    return UNITS.filter((unit) => {
      if (courseStage !== "all" && unit.stage !== courseStage) return false;
      if (!query) return true;
      const extraVocabulary = VOCABULARY.filter((entry) => entry.unit === unit.id).flatMap((entry) => [entry.item, entry.detail]);
      const haystack = [unit.id, unit.title, unit.grammar, unit.goal, ...unit.words.flatMap((word) => [word.item, word.detail]), ...extraVocabulary].join(" ").toLocaleLowerCase();
      return haystack.includes(query);
    });
  }, [courseSearch, courseStage]);
  const vocabularyStates = useMemo(() => vocabProgress.states ?? [], [vocabProgress.states]);
  const vocabStateById = useMemo(() => new Map(vocabularyStates.map((state) => [state.vocab_id, state])), [vocabularyStates]);
  const dueVocabIds = useMemo(
    () => vocabularyStates.filter((state) => Date.parse(state.next_review_at) <= now).map((state) => state.vocab_id),
    [now, vocabularyStates],
  );
  const dueVocabCount = dueVocabIds.length;
  const stableVocabCount = vocabularyStates.filter((state) => state.mastery.level >= 4).length;
  const currentVocab = VOCABULARY.find((entry) => entry.id === vocabQueue[vocabPosition]);
  const vocabRoundDone = vocabQueue.length > 0 && vocabPosition >= vocabQueue.length;
  const peekVocab = peekVocabId
    ? VOCABULARY.find((entry) => entry.id === peekVocabId) ?? VOCABULARY_OCCURRENCES.find((entry) => entry.id === peekVocabId)
    : undefined;
  const validatedSkillCount = (progress.skillStates ?? []).filter((state) => state.validated).length;
  const skillStateByTag = useMemo(
    () => new Map((progress.skillStates ?? []).map((state) => [state.skill_tag, state])),
    [progress.skillStates],
  );
  const verifiedUnitIds = useMemo(() => {
    const verified = new Set<UnitId>();
    for (const unit of UNITS) {
      const unitQuestions = QUESTIONS.filter((question) => question.unit === unit.id && !question.skill.includes("情境遷移"));
      const tags = [...new Set(unitQuestions.flatMap((question) => getQuestionSkillTags(question)))];
      if (unitQuestions.length > 0 && unitQuestions.every((question) => formalStateById.has(question.id)) && tags.length > 0 && tags.every((tag) => skillStateByTag.get(tag)?.validated)) {
        verified.add(unit.id);
      }
    }
    return verified;
  }, [formalStateById, skillStateByTag]);
  const formalVariantEvidenceCount = [...formalQuestionIds].filter((questionId) => !STATIC_QUESTION_IDS.has(questionId)).length;
  const adventureEvidenceCount = formalStates.length + formalVariantEvidenceCount;
  const adventureXp = adventureEvidenceCount * 8
    + learningFrontier.completedUnitIds.size * 45
    + validatedSkillCount * 30
    + stableVocabCount * 4
    + (progress.passedMockUnits ?? []).length * 250;
  const adventureLevelValue = adventureLevel(adventureXp);
  const adventureLevelXp = adventureXp % XP_PER_LEVEL;
  const adventureLevelPercent = Math.round((adventureLevelXp / XP_PER_LEVEL) * 100);
  const roundXpGain = roundStartXp === null ? 0 : Math.max(0, adventureXp - roundStartXp);
  const activeUnitNumber = activeUnitIndex + 1;
  const currentRegion = ADVENTURE_REGIONS.find((region) => activeUnitNumber >= region.start && activeUnitNumber <= region.end) ?? ADVENTURE_REGIONS.at(-1)!;
  const bossRegion = bossRegionId ? ADVENTURE_REGIONS.find((region) => region.id === bossRegionId) : undefined;
  const currentEncounter = battleMode === "boss" && bossRegion
    ? (BOSS_ENCOUNTERS[bossRegion.id] ?? REGION_ENCOUNTERS[currentRegion.id])
    : (REGION_ENCOUNTERS[currentRegion.id] ?? REGION_ENCOUNTERS.trail);
  const companionStates = companionProgress.states ?? [];
  const visitedCompanionChoices = new Set(companionProgress.visitedChoiceKeys ?? []);
  const activeCompanionState = companionStates.find((state) => state.selected === 1)
    ?? companionStates.find((state) => state.companion_id === DEFAULT_COMPANION_ID);
  const activeCompanion = getCompanion(activeCompanionState?.companion_id ?? DEFAULT_COMPANION_ID);
  const activeCompanionAffinity = Number(activeCompanionState?.affinity ?? 0);
  const focusedCompanion = getCompanion(focusedCompanionId ?? activeCompanion.id);
  const focusedCompanionState = companionStates.find((state) => state.companion_id === focusedCompanion.id);
  const focusedCompanionAffinity = Number(focusedCompanionState?.affinity ?? 0);
  const focusedCompanionTier = companionAffinityTier(focusedCompanionAffinity);
  const focusedCompanionTopic = focusedCompanion.topics.find((topic) => topic.id === companionTopicId) ?? null;
  const focusedCompanionVisitedCount = focusedCompanion.topics.reduce((total, topic) => total + topic.choices.filter((choice) => visitedCompanionChoices.has(`${focusedCompanion.id}:${topic.id}:${choice.id}`)).length, 0);
  const focusedCompanionMemories = (companionProgress.memories ?? []).filter((memory) => memory.companionId === focusedCompanion.id);
  const focusedCompanionContextLine = companionProgress.contextLines?.[focusedCompanion.id] ?? "";
  const gameProfile = gameProgress.profile ?? { coins: 0, masteryMarks: 0, wins: 0, losses: 0, commissionClaims: 0 };
  const gameInventory = new Map((gameProgress.inventory ?? []).map((entry) => [entry.itemId, entry.quantity]));
  const equippedGameItems = new Set((gameProgress.equipment ?? []).map((entry) => entry.itemId));
  const selectedOutfitByCompanion = new Map((gameProgress.outfits ?? []).map((entry) => [entry.companionId, entry.outfitId]));
  const outfitForCompanion = (companionId: CompanionId) => {
    const selectedOutfit = getGameOutfit(selectedOutfitByCompanion.get(companionId) ?? "");
    return selectedOutfit?.companionId === companionId
      ? selectedOutfit
      : GAME_OUTFITS.find((outfit) => outfit.companionId === companionId);
  };
  const companionImageFor = (companionId: CompanionId) => outfitForCompanion(companionId)?.image ?? getCompanion(companionId).image;
  const gameUnlocks = new Set((gameProgress.unlocks ?? []).map((entry) => entry.unlockId));
  const dailyGameQuests = gameProgress.dailyQuests ?? [];
  const battleBoon = battleBoonId ? getExpeditionBoon(battleBoonId) : null;
  const battleBurstCostValue = battleBurstCost(battleBoonId, [...equippedGameItems], activeCompanion.id);
  const activeLoadoutStyle = GAME_LOADOUT_STYLES
    .map((style) => ({ style, score: style.keyItems.filter((itemId) => equippedGameItems.has(itemId)).length }))
    .sort((left, right) => right.score - left.score)[0];
  const battleStance = getBattleStance(battleStanceId);
  const battleDamage = battleHistory.reduce((sum, hit) => sum + hit.damage, 0);
  const battleEnemyMaxHp = expeditionEnemyMaxHp(currentEncounter.hp, battleBoonId);
  const battleEnemyHp = Math.max(0, battleEnemyMaxHp - battleDamage);
  const battleEnemySuppressed = battleMode === "expedition" && battleEnemyHp <= 0 && battleOutcome === "active";
  const bossCoreHits = battleHistory.filter((hit) => hit.coreHit).length;
  const battleEnemyPercent = battleMode === "boss"
    ? Math.max(0, Math.round(((BOSS_CORE_TARGET - bossCoreHits) / BOSS_CORE_TARGET) * 100))
    : Math.max(0, Math.round((battleEnemyHp / battleEnemyMaxHp) * 100));
  const battleVictory = battleOutcome === "victory";
  const battleDefeat = battleOutcome === "defeat";
  const battleCorrectCount = battleHistory.filter((hit) => hit.correct).length;
  const battleCurrentChain = (() => {
    let chain = 0;
    for (let index = battleHistory.length - 1; index >= 0 && battleHistory[index].correct; index -= 1) chain += 1;
    return chain;
  })();
  const battleIntent = battleIntentFor(currentEncounter.id, battleHistory.length);
  const battleEvent = battleEventFor(
    currentEncounter.id,
    battleHistory.length,
    battleMode === "boss" ? "boss" : "expedition",
  );
  const battleWrongSkills = battleHistory.filter((hit) => !hit.correct).reduce((counts, hit) => {
    counts.set(hit.skillLabel, (counts.get(hit.skillLabel) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const battlePrimaryWeakness = [...battleWrongSkills.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const battleResultLine = battleOutcome === "active" ? "" : companionBattleResultLine(activeCompanion.id, battleOutcome, battlePrimaryWeakness);
  const currentRegionProgress = Math.max(0, Math.min(100, Math.round(((activeUnitNumber - currentRegion.start) / Math.max(1, currentRegion.end - currentRegion.start)) * 100)));
  const unitsUntilBoss = Math.max(0, currentRegion.end - activeUnitNumber);
  const isRegionBossUnlocked = (region: (typeof ADVENTURE_REGIONS)[number]) => activeUnitNumber > region.end
    || (activeUnitNumber === region.end && activeQuestionCount > 0 && activeRecorded >= activeQuestionCount);
  const hasRevengeAchievement = (progress.skillStates ?? []).some((skill) => skill.validated && (progress.diagnostics ?? []).some((diagnostic) => diagnostic.tag === skill.skill_tag && diagnostic.wrong > 0));
  const achievements = [
    { id: "first", mark: "01", title: "第一次遠征", detail: "留下第一筆有效作答紀錄", unlocked: adventureEvidenceCount > 0 },
    { id: "revenge", mark: "02", title: "復仇者", detail: "曾答錯的 skill 用新情境驗證成功", unlocked: hasRevengeAchievement },
    { id: "memory", mark: "03", title: "真正記住了", detail: "10 組單字達到穩定記憶", unlocked: stableVocabCount >= 10 },
    { id: "hunter", mark: "04", title: "Skill Hunter", detail: "5 個 skill 通過未見題驗證", unlocked: validatedSkillCount >= 5 },
    { id: "guardian", mark: "05", title: "守門者突破", detail: "完成一場 10 題未見 Boss 戰", unlocked: clearedBossIds.size > 0 },
    { id: "mock", mark: "06", title: "完整模考", detail: "完成一次可信 200 題模考", unlocked: (progress.passedMockUnits ?? []).length > 0 },
  ];
  const unlockedAchievementCount = achievements.filter((achievement) => achievement.unlocked).length;
  const collectibleCount = Math.min(8, (adventureEvidenceCount > 0 ? 1 : 0) + Math.floor(adventureXp / 360));
  const collectibles = Array.from({ length: collectibleCount }, (_, index) => collectibleFor(displayName, index));
  const visibleVocabulary = useMemo(() => {
    const query = vocabSearch.trim().toLocaleLowerCase();
    return VOCABULARY.filter((entry) => {
      const state = vocabStateById.get(entry.id);
      if (vocabScope === "focus") {
        const dueToday = Boolean(state && Date.parse(state.next_review_at) <= now);
        const currentCore = entry.unit === activeUnit.id && entry.source === "core" && entry.level === "A";
        if (!dueToday && !currentCore) return false;
      }
      if (vocabUnit !== "all" && entry.unit !== vocabUnit) return false;
      if (vocabTier === "bbc" && entry.source !== "bbc") return false;
      if (vocabTier !== "all" && vocabTier !== "bbc" && entry.level !== vocabTier) return false;
      if (vocabScope === "saved" && !state) return false;
      if (vocabScope === "due" && (!state || Date.parse(state.next_review_at) > now)) return false;
      if (!query) return true;
      return [entry.item, entry.detail, entry.unit, entry.unitTitle].join(" ").toLocaleLowerCase().includes(query);
    });
  }, [activeUnit.id, now, vocabSearch, vocabScope, vocabStateById, vocabTier, vocabUnit]);
  const displayedVocabulary = visibleVocabulary.slice(0, vocabLimit);

  async function loadProgress(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/progress?date=${todayInTaipei()}`, { cache: "no-store" });
      const data = (await response.json()) as ProgressPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "進度同步失敗。");
      setProgress(data);
      if (data.preferences?.interfaceMode === "simple" || data.preferences?.interfaceMode === "detailed") {
        setInterfaceMode(data.preferences.interfaceMode);
        window.localStorage.setItem("english-interface-mode", data.preferences.interfaceMode);
      }
      if (data.preferences?.fontScale === "standard" || data.preferences?.fontScale === "large") {
        setFontScale(data.preferences.fontScale);
        window.localStorage.setItem("english-font-scale", data.preferences.fontScale);
      }
      if (data.preferences?.motionMode === "standard" || data.preferences?.motionMode === "reduced") {
        setMotionMode(data.preferences.motionMode);
        window.localStorage.setItem("english-motion-mode", data.preferences.motionMode);
      }
      if (["en-US", "en-GB", "en-AU"].includes(String(data.preferences?.speechAccent))) {
        setSpeechAccent(data.preferences!.speechAccent as SpeechAccent);
        window.localStorage.setItem("english-speech-accent", String(data.preferences!.speechAccent));
      }
      if (Number.isFinite(Number(data.preferences?.speechRate)) && Number(data.preferences?.speechRate) >= 0.6 && Number(data.preferences?.speechRate) <= 1.25) {
        setSpeechRate(Number(data.preferences!.speechRate));
        window.localStorage.setItem("english-speech-rate", String(data.preferences!.speechRate));
      }
      if (data.preferences?.reportPeriod === "week" || data.preferences?.reportPeriod === "month") {
        setReportPeriod(data.preferences.reportPeriod);
        window.localStorage.setItem("english-report-period", data.preferences.reportPeriod);
      }
      setSyncError("");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "進度同步失敗。");
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  async function loadVocabulary(quiet = false) {
    if (!quiet) setVocabLoading(true);
    try {
      const response = await fetch("/api/vocabulary", { cache: "no-store" });
      const data = (await response.json()) as VocabularyPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "單字進度同步失敗。");
      setVocabProgress(data);
      setVocabError("");
    } catch (error) {
      setVocabError(error instanceof Error ? error.message : "單字進度同步失敗。");
    } finally {
      if (!quiet) setVocabLoading(false);
    }
  }

  async function loadCompanions(quiet = false) {
    if (!quiet) setCompanionLoading(true);
    try {
      const response = await fetch("/api/companions", { cache: "no-store" });
      const data = (await response.json()) as CompanionPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "夥伴資料同步失敗。");
      setCompanionProgress(data);
      setCompanionError("");
    } catch (error) {
      setCompanionError(error instanceof Error ? error.message : "夥伴資料同步失敗。");
    } finally {
      if (!quiet) setCompanionLoading(false);
    }
  }

  async function loadGame(quiet = false) {
    if (!quiet) setGameLoading(true);
    try {
      const response = await fetch("/api/game", { cache: "no-store" });
      const data = (await response.json()) as GamePayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "冒險背包同步失敗。");
      setGameProgress(data);
      setGameError("");
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "冒險背包同步失敗。");
    } finally {
      if (!quiet) setGameLoading(false);
    }
  }

  async function loadJourney(quiet = false) {
    if (!quiet) setJourneyLoading(true);
    try {
      const response = await fetch(`/api/journey?date=${todayInTaipei()}`, { cache: "no-store" });
      const data = (await response.json()) as JourneyPayload;
      if (!response.ok) throw new Error(data.error || "今日旅程同步失敗。");
      setJourneyProgress(data);
      if (data.session?.journeyLength) setJourneyLength(data.session.journeyLength);
      setJourneyError("");
      return data;
    } catch (error) {
      setJourneyError(error instanceof Error ? error.message : "今日旅程同步失敗。");
      return null;
    } finally {
      if (!quiet) setJourneyLoading(false);
    }
  }

  async function loadStory(quiet = false) {
    if (!quiet) setStoryLoading(true);
    try {
      const response = await fetch("/api/story", { cache: "no-store" });
      const data = (await response.json()) as StoryPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "第一幕進度同步失敗。");
      setStoryProgress(data);
      if (/^U0[1-8]$/.test(data.profile.targetUnit)) setStoryUnit(data.profile.targetUnit as UnitId);
      setStoryRoute(data.profile.selectedRoute);
      setContentDifficulty(data.profile.contentDifficulty);
      setStoryError("");
      return data;
    } catch (error) {
      setStoryError(error instanceof Error ? error.message : "第一幕進度同步失敗。");
      return null;
    } finally {
      if (!quiet) setStoryLoading(false);
    }
  }

  async function postStory(action: "saveSettings" | "startRoute" | "choose", unit: UnitId, options?: { route?: StoryRouteId; difficulty?: ContentDifficultyId; choiceId?: string }) {
    if (storyBusy) return null;
    setStoryBusy(true);
    setStoryError("");
    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          unit,
          route: options?.route ?? storyRoute,
          difficulty: options?.difficulty ?? contentDifficulty,
          choiceId: options?.choiceId,
        }),
      });
      const data = (await response.json()) as StoryPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "第一幕進度沒有成功保存。");
      setStoryProgress(data);
      return data;
    } catch (error) {
      setStoryError(error instanceof Error ? error.message : "第一幕進度沒有成功保存。");
      return null;
    } finally {
      setStoryBusy(false);
    }
  }

  function selectStoryRoute(route: StoryRouteId) {
    setStoryRoute(route);
    void postStory("saveSettings", storyUnit, { route, difficulty: contentDifficulty });
  }

  function selectStoryDifficulty(difficulty: ContentDifficultyId) {
    setContentDifficulty(difficulty);
    void postStory("saveSettings", storyUnit, { route: storyRoute, difficulty });
  }

  function chooseStory(unit: UnitId, choiceId: string) {
    setStoryUnit(unit);
    void postStory("choose", unit, { choiceId });
  }

  function selectStoryChapter(unit: UnitId) {
    setStoryUnit(unit);
    void postStory("saveSettings", unit, { route: storyRoute, difficulty: contentDifficulty });
  }

  async function postJourney(action: "start" | "advance" | "complete", session = journeySession) {
    if (journeyBusy) return null;
    setJourneyBusy(true);
    setJourneyError("");
    try {
      const response = await fetch("/api/journey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, localDate: todayInTaipei(), journeyId: session?.id, journeyLength: action === "start" ? journeyLength : undefined }),
      });
      const data = (await response.json()) as JourneyPayload;
      if (!response.ok) throw new Error(data.error || "旅程沒有成功推進。");
      setJourneyProgress(data);
      if (data.session?.journeyLength) setJourneyLength(data.session.journeyLength);
      return data;
    } catch (error) {
      setJourneyError(error instanceof Error ? error.message : "旅程沒有成功推進。");
      return null;
    } finally {
      setJourneyBusy(false);
    }
  }

  function journeyBattleSnapshot() {
    return {
      version: 1,
      battleMode,
      battleOutcome,
      battleWillpower,
      battleSessionId,
      battleHistory,
      battleEnergy,
      battleBurstArmed,
      battleGuardActive,
      battleCharmSpent,
      battleReward,
      battleGrade,
      battleBoonOptions,
      battleBoonId,
      battleBoonGuardSpent,
      battleStanceId,
      roundStartXp,
    };
  }

  async function saveJourneyCheckpoint(session = journeySession) {
    if (!session || session.currentStep !== "practice" || journeyRestorePending.current) return;
    try {
      const response = await fetch("/api/journey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "checkpoint",
          localDate: todayInTaipei(),
          journeyId: session.id,
          currentIndex: position,
          battleState: journeyBattleSnapshot(),
        }),
      });
      const data = (await response.json()) as JourneyPayload;
      if (!response.ok) throw new Error(data.error || "旅程斷點保存失敗。");
      setJourneyProgress(data);
      setJourneyError("");
    } catch (error) {
      setJourneyError(error instanceof Error ? error.message : "旅程斷點保存失敗。");
    }
  }

  function restoreJourneyPractice(session: JourneySession) {
    const safeQueue = session.queue.filter((questionId) => Boolean(getPlayableQuestion(questionId)));
    if (!safeQueue.length) {
      setJourneyError("這次旅程題單已無法辨識，請重新整理後再試。");
      return;
    }
    journeyRestorePending.current = true;
    const snapshot = session.battleState ?? {};
    const restoredHistory = Array.isArray(snapshot.battleHistory) ? snapshot.battleHistory as BattleHit[] : [];
    const restoredOutcome = snapshot.battleOutcome === "victory" || snapshot.battleOutcome === "defeat" ? snapshot.battleOutcome : "active";
    const restoredBoonId = typeof snapshot.battleBoonId === "string" && getExpeditionBoon(snapshot.battleBoonId) ? snapshot.battleBoonId as ExpeditionBoonId : null;
    const restoredStance = typeof snapshot.battleStanceId === "string" && BATTLE_STANCES.some((stance) => stance.id === snapshot.battleStanceId) ? snapshot.battleStanceId as BattleStanceId : "blade";
    const restoredBoonOptions = Array.isArray(snapshot.battleBoonOptions)
      ? snapshot.battleBoonOptions.filter((value): value is ExpeditionBoonId => typeof value === "string" && Boolean(getExpeditionBoon(value))).slice(0, 3)
      : [];
    const defaultBoonOptions = expeditionBoonOptions(`${currentEncounter.id}:${session.localDate}:${session.id}`, 3).slice(0, 3);
    setUnitFilter("path");
    setPracticePreviewOnly(false);
    setPracticeRoute("formal");
    setPracticeDifficulty("standard");
    setBattleMode("expedition");
    setBossRegionId(null);
    setBossRunId(null);
    setQueue(safeQueue);
    setPosition(Math.max(0, Math.min(safeQueue.length, Number(session.currentIndex ?? 0))));
    setBattleHistory(restoredHistory.slice(0, safeQueue.length));
    setBattleImpact(null);
    setBattleOutcome(restoredOutcome);
    setBattleWillpower(Math.max(0, Math.min(MAX_WILLPOWER, Number(snapshot.battleWillpower ?? MAX_WILLPOWER))));
    setBattleSessionId(typeof snapshot.battleSessionId === "string" && snapshot.battleSessionId ? snapshot.battleSessionId : session.id);
    setBattleGuardActive(snapshot.battleGuardActive === true);
    setBattleCharmSpent(snapshot.battleCharmSpent === true);
    setBattleReward(snapshot.battleReward && typeof snapshot.battleReward === "object" ? snapshot.battleReward as BattleReward : null);
    setBattleGrade(snapshot.battleGrade === "S" || snapshot.battleGrade === "A" || snapshot.battleGrade === "B" ? snapshot.battleGrade : null);
    setBattleBoonOptions(restoredBoonOptions.length === 3 ? restoredBoonOptions : defaultBoonOptions);
    setBattleBoonId(restoredBoonId);
    setBattleBoonGuardSpent(snapshot.battleBoonGuardSpent === true);
    setBattleStanceId(restoredStance);
    setBattleEnergy(Math.max(0, Math.min(6, Number(snapshot.battleEnergy ?? 0))));
    setBattleBurstArmed(snapshot.battleBurstArmed === true);
    setRoundStartXp(typeof snapshot.roundStartXp === "number" ? snapshot.roundStartXp : adventureXp);
    setBattleMessage(restoredHistory.length
      ? `已接回第 ${Math.min(session.currentIndex + 1, safeQueue.length)}／${safeQueue.length} 個英文節點；前面的戰鬥與作答仍完整保留。`
      : `${session.journeyLengthInfo?.label ?? "標準"}旅程已開始。先選一份本輪加成，再完成到期複習與 ${session.formalUnit} 新內容。`);
    resetQuestion();
    setView("today");
    window.setTimeout(() => {
      journeyRestorePending.current = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  function beginJourneyRepair(session: JourneySession) {
    const plan = session.repairPlan;
    const expectedCount = Math.max(1, Number(session.journeyLengthInfo?.repairCount ?? 2));
    const questionIds = Array.isArray(plan?.questionIds) ? plan.questionIds.filter((questionId) => Boolean(getPlayableQuestion(questionId))).slice(0, expectedCount) : [];
    if (questionIds.length < expectedCount || !plan.sourceQuestionId) {
      setJourneyError(`目前找不到 ${expectedCount} 題不同語意的旅程修復題；本輪錯因仍已保留。`);
      return;
    }
    setRepairPlan({
      weakness: plan.weakness ?? "本輪弱點",
      sourceQuestionId: plan.sourceQuestionId,
      questionIds,
      correctCount: 0,
      completed: false,
      retryMode: "expedition",
      retryBossRegionId: null,
    });
    setBattleMode("repair");
    setBattleOutcome("active");
    setBattleSessionId("");
    setBattleHistory([]);
    setBattleImpact(null);
    setBattleBoonOptions(["aegis-oath"]);
    setBattleBoonId("aegis-oath");
    setBattleStanceId("blade");
    setBattleEnergy(0);
    setBattleBurstArmed(false);
    setQueue(questionIds);
    setPosition(0);
    resetQuestion();
    setBattleMessage(`完成 ${questionIds.length} 題不同情境的立即修復；這些題會保留為 assisted，不會冒充無提示精通。`);
    setView("today");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function continueJourney() {
    const session = journeySession;
    if (!session) {
      const data = await postJourney("start", null);
      if (data?.session) restoreJourneyPractice(data.session);
      return;
    }
    if (session.currentStep === "practice") {
      restoreJourneyPractice(session);
      return;
    }
    if (session.currentStep === "scenario") {
      setView("progress");
      setAdventureTab("mission");
      requestAnimationFrame(() => document.getElementById("journey-scenario-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    if (session.currentStep === "companion") {
      const data = await postJourney("advance", session);
      if (data?.session?.currentStep === "repair") beginJourneyRepair(data.session);
      return;
    }
    if (session.currentStep === "repair") {
      beginJourneyRepair(session);
      return;
    }
    await postJourney("complete", session);
    await Promise.all([loadProgress(true), loadVocabulary(true), loadCompanions(true), loadGame(true)]);
    setView("today");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function finishJourneyScenarioNode() {
    const session = journeyProgress.session;
    if (!session || session.currentStep !== "scenario") return;
    const data = await postJourney("advance", session);
    if (data?.session?.currentStep === "companion") {
      setView("today");
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  }

  async function selectCompanion(companionId: CompanionId) {
    if (companionSaving) return;
    setCompanionSaving(true);
    setCompanionNotice("");
    try {
      const response = await fetch("/api/companions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "select", companionId }),
      });
      const data = (await response.json()) as CompanionPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "無法更換出戰夥伴。");
      setCompanionProgress(data);
      setFocusedCompanionId(companionId);
      if (battleBurstArmed) {
        setBattleBurstArmed(false);
        setBattleMessage("切換夥伴後，原本的爆發待命已取消。");
      }
      setCompanionNotice(`${getCompanion(companionId).name}已加入這一輪遠征。`);
      setCompanionError("");
    } catch (error) {
      setCompanionError(error instanceof Error ? error.message : "無法更換出戰夥伴。");
    } finally {
      setCompanionSaving(false);
    }
  }

  function focusCompanion(companionId: CompanionId) {
    setFocusedCompanionId(companionId);
    setCompanionTopicId(null);
    setCompanionPlayerLine("");
    setCompanionReply("");
    setCompanionNotice("");
  }

  function openCompanionTopic(topicId: string) {
    setCompanionTopicId(topicId);
    setCompanionPlayerLine("");
    setCompanionReply("");
    setCompanionNotice("");
  }

  async function talkToCompanion(topicId: string, choiceId: string) {
    if (companionSaving) return;
    setCompanionSaving(true);
    setCompanionNotice("");
    try {
      const response = await fetch("/api/companions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "talk",
          companionId: focusedCompanion.id,
          topicId,
          choiceId,
          localDate: todayInTaipei(),
        }),
      });
      const data = (await response.json()) as CompanionPayload & { error?: string; reply?: string; playerLine?: string; gained?: number };
      if (!response.ok) throw new Error(data.error || "這段對話暫時沒有回應。");
      setCompanionProgress(data);
      setCompanionPlayerLine(data.playerLine ?? "");
      setCompanionReply(data.reply ?? "");
      setCompanionNotice(data.gained ? `第一次聊到這個選項 · 好感 +${data.gained}` : "這段話你們聊過了；重複聊天不會刷好感。" );
      setCompanionError("");
    } catch (error) {
      setCompanionError(error instanceof Error ? error.message : "這段對話暫時沒有回應。");
    } finally {
      setCompanionSaving(false);
    }
  }

  async function downloadLearningState() {
    if (exporting) return;
    setExporting(true);
    setExportMessage("");
    try {
      const response = await fetch("/api/export", { cache: "no-store" });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error || "目前無法整理學習狀態。");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `English_Learning_State_${todayInTaipei()}.md`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setExportMessage(`已整理 ${filename}。把這份檔案丟進新對話，就能接著教。`);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "目前無法整理學習狀態。");
    } finally {
      setExporting(false);
    }
  }

  async function saveMockExam() {
    if (mockSaving) return;
    setMockSaving(true);
    setMockMessage("");
    try {
      const response = await fetch("/api/mock-exams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unit: mockUnit,
          sourceLabel: mockSource,
          completedQuestions: 200,
          listeningCorrect: Number(mockListening),
          readingCorrect: Number(mockReading),
          durationMinutes: Number(mockDuration),
          interrupted: mockInterrupted,
          localDate: todayInTaipei(),
        }),
      });
      const result = (await response.json()) as { error?: string; gatePassed?: boolean };
      if (!response.ok) throw new Error(result.error || "模考紀錄保存失敗。");
      setMockMessage(result.gatePassed ? `${mockUnit} 完整模考紀錄已保存，可作為單元推進門檻。` : "已保存，但中斷的模考不會被當成完整門檻。");
      await loadProgress(true);
    } catch (error) {
      setMockMessage(error instanceof Error ? error.message : "模考紀錄保存失敗。");
    } finally {
      setMockSaving(false);
    }
  }

  function speakEnglish(text: string) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setVocabMessage("這個瀏覽器目前不支援內建英文朗讀。");
      return;
    }
    listeningPlaybackToken.current += 1;
    window.speechSynthesis.cancel();
    setSpeakingUnit(null);
    setPracticeListeningQuestionId(null);
    const utterance = new SpeechSynthesisUtterance(text.replace(/\.{3,}/g, " "));
    utterance.lang = speechAccent;
    utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
  }

  function resetVocabRound() {
    setVocabPosition(0);
    setVocabRevealed(false);
    setVocabMessage("");
  }

  function startVocabReview(unit?: UnitId) {
    const unitPool = unit ? VOCABULARY.filter((entry) => entry.unit === unit) : VOCABULARY;
    const allowed = new Set(unitPool.map((entry) => entry.id));
    const due = dueVocabIds.filter((id) => allowed.has(id));
    const newUnit = unit ?? activeUnit.id;
    const fresh = VOCABULARY
      .filter((entry) => entry.unit === newUnit && !vocabStateById.has(entry.id))
      .map((entry) => entry.id);
    const saved = vocabularyStates
      .filter((state) => allowed.has(state.vocab_id) && !due.includes(state.vocab_id) && !fresh.includes(state.vocab_id))
      .map((state) => state.vocab_id);
    const nextQueue = [...shuffle(due), ...shuffle(fresh), ...shuffle(saved)].slice(0, 6);
    setVocabQueue(nextQueue);
    resetVocabRound();
    setView("vocab");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function addVocabulary(entry: VocabularyEntry) {
    if (vocabSaving) return;
    setVocabSaving(true);
    setVocabMessage("");
    try {
      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "add", vocabId: entry.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "無法加入單字本。");
      setVocabMessage(`已把「${entry.item}」加入單字本`);
      await loadVocabulary(true);
    } catch (error) {
      setVocabMessage(error instanceof Error ? error.message : "無法加入單字本。");
    } finally {
      setVocabSaving(false);
    }
  }

  async function rateVocabulary(rating: 1 | 2 | 3 | 4) {
    if (!currentVocab || vocabSaving) return;
    setVocabSaving(true);
    setVocabMessage("");
    try {
      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rate", vocabId: currentVocab.id, rating }),
      });
      const result = (await response.json()) as { error?: string; nextReviewAt?: string };
      if (!response.ok) throw new Error(result.error || "無法保存單字複習紀錄。");
      setVocabMessage(result.nextReviewAt ? `已安排下次複習：${formatReviewTime(result.nextReviewAt)}` : "已保存複習紀錄");
      await loadVocabulary(true);
      window.setTimeout(() => {
        setVocabPosition((old) => old + 1);
        setVocabRevealed(false);
        setVocabMessage("");
      }, 360);
    } catch (error) {
      setVocabMessage(error instanceof Error ? error.message : "無法保存單字複習紀錄。");
    } finally {
      setVocabSaving(false);
    }
  }

  async function saveVocabularyNote(entry: VocabularyEntry, note: string) {
    if (vocabSaving) return;
    setVocabSaving(true);
    setVocabMessage("");
    try {
      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "note", vocabId: entry.id, note }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "無法保存單字筆記。");
      setVocabMessage(`「${entry.item}」的筆記已保存`);
      await loadVocabulary(true);
    } catch (error) {
      setVocabMessage(error instanceof Error ? error.message : "無法保存單字筆記。");
    } finally {
      setVocabSaving(false);
    }
  }

  function openVocabularyPeek(id: string, sentence?: string) {
    setPeekWord(null);
    setPeekSentence(sentence ?? null);
    setPeekVocabId(id);
  }

  function closeVocabularyPeek() {
    setPeekVocabId(null);
    setPeekSentence(null);
  }

  function renderPlayableWords(text: string, keyPrefix: string, contextSentence: string) {
    const nodes: ReactNode[] = [];
    const wordPattern = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = wordPattern.exec(text)) !== null) {
      if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
      const word = match[0];
      nodes.push(
        <button className="inline-word-audio" key={`${keyPrefix}-${match.index}-${word}`} type="button" onClick={() => {
          const knownEntry = VOCABULARY_OCCURRENCES.find((entry) => entry.item.toLocaleLowerCase() === word.toLocaleLowerCase())
            ?? VOCABULARY.find((entry) => entry.item.toLocaleLowerCase() === word.toLocaleLowerCase());
          if (knownEntry) {
            openVocabularyPeek(knownEntry.id, contextSentence);
          } else {
            setPeekVocabId(null);
            setPeekSentence(null);
            setPeekWord({ word, sentence: contextSentence });
          }
          speakEnglish(word);
        }} aria-label={`播放 ${word} 發音並開啟查字卡`} title="點一下聽發音">
          {word}
        </button>,
      );
      cursor = match.index + word.length;
    }
    if (cursor < text.length) nodes.push(text.slice(cursor));
    return nodes;
  }

  function renderInteractiveParagraph(text: string, entries: readonly VocabularyEntry[]) {
    const matches = vocabularyInText(text, entries);
    if (!matches.length) return renderPlayableWords(text, "plain", text);
    const nodes: ReactNode[] = [];
    let cursor = 0;
    matches.forEach((match, index) => {
      if (match.start > cursor) nodes.push(...renderPlayableWords(text.slice(cursor, match.start), `lead-${index}-${cursor}`, text));
      nodes.push(
        <button className="inline-vocab" key={`${match.entry.id}-${match.start}-${index}`} onClick={() => { openVocabularyPeek(match.entry.id, text); speakEnglish(text.slice(match.start, match.end)); }} type="button">
          {text.slice(match.start, match.end)}
        </button>,
      );
      cursor = match.end;
    });
    if (cursor < text.length) nodes.push(...renderPlayableWords(text.slice(cursor), `tail-${cursor}`, text));
    return nodes;
  }

  function renderVocabularyDetails(entry: VocabularyEntry, compact = false) {
    if (entry.meaning && entry.collocation && entry.example) {
      return (
        <div className={`vocab-structured ${compact ? "vocab-structured-compact" : ""}`}>
          <div className="vocab-detail-tags">
            {entry.level && <span className={`vocab-level vocab-level-${entry.level.toLocaleLowerCase()}`}>課程 {entry.level}</span>}
            {entry.partOfSpeech && <span>{entry.partOfSpeech}</span>}
          </div>
          <dl>
            <div><dt>中文</dt><dd>{entry.meaning}</dd></div>
            <div><dt>常見搭配</dt><dd>{entry.collocation}</dd></div>
            <div className="vocab-example-row"><dt>例句</dt><dd><span>{entry.example}</span><button className="audio-button audio-button-tiny" onClick={() => speakEnglish(entry.example!)} aria-label={`播放例句 ${entry.example}`}>▶</button></dd></div>
          </dl>
        </div>
      );
    }
    return <div className={`vocab-bbc-detail ${compact ? "vocab-structured-compact" : ""}`}><span>BBC 延伸</span><p>{entry.detail}</p></div>;
  }

  function resetQuestion() {
    setSelected(null);
    setOutput("");
    setDraft(null);
    setFeedbackRevealed(false);
    setConfidence(null);
    setSavedMessage("");
    setListeningPlayCount(0);
    setAnswerListenCount(null);
    setPracticeListeningQuestionId(null);
    setBattleEliminatedOptionId(null);
    setBattleItemHintVisible(false);
    setQuestionItemAssisted(false);
    effectiveActiveMs.current = 0;
    answerActiveMs.current = null;
    answerRequestId.current = null;
    questionAnswered.current = false;
    effectiveLastTick.current = null;
    effectiveLastInteraction.current = null;
    listeningPlaybackToken.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function resetBattleGameState(encounterId: string, allowBounty = true) {
    const sessionId = newBattleId();
    setBattleOutcome("active");
    setBattleWillpower(MAX_WILLPOWER);
    setBattleSessionId(sessionId);
    setBattleGuardActive(false);
    setBattleCharmSpent(false);
    setBattleReward(null);
    setBattleGrade(null);
    setBattleBoonId(null);
    const boonOptions = expeditionBoonOptions(`${encounterId}:${todayInTaipei()}:${sessionId}`, allowBounty ? 3 : 4)
      .filter((boonId) => allowBounty || boonId !== "bounty-seal")
      .slice(0, 3);
    setBattleBoonOptions(boonOptions);
    setBattleBoonGuardSpent(false);
    setBattleEnergy(0);
    setQuestNotice("");
    setRepairPlan(null);
  }

  function selectRepairQuestionIds(sourceQuestionId: string, excludedIds: readonly string[] = []) {
    const source = getPlayableQuestion(sourceQuestionId);
    const sourceTags = new Set((source ? getQuestionSkillTags(source) : []).filter((tag) => tag !== "application.transfer"));
    const excluded = new Set([sourceQuestionId, ...excludedIds]);
    const unseen = getUnseenVariantQuestions(evidenceFingerprints);
    const candidates = [...unseen, ...VARIANT_QUESTIONS].filter((question) => {
      if (excluded.has(question.id)) return false;
      const tags = getQuestionSkillTags(question);
      return sourceTags.size > 0
        ? tags.some((tag) => sourceTags.has(tag))
        : question.unit === source?.unit;
    });
    const selectedIds: string[] = [];
    const selectedFingerprints = new Set<string>();
    for (const question of candidates) {
      const fingerprint = question.variant?.fingerprint ?? question.id;
      if (selectedFingerprints.has(fingerprint)) continue;
      selectedFingerprints.add(fingerprint);
      selectedIds.push(question.id);
      if (selectedIds.length === 2) break;
    }
    return selectedIds;
  }

  function beginDefeatRepair() {
    if (!battleDefeat || !battleHistory.length) return;
    const sourceHit = battleHistory.find((hit) => !hit.correct && hit.skillLabel === battlePrimaryWeakness)
      ?? battleHistory.find((hit) => !hit.correct);
    if (!sourceHit) return;
    const questionIds = selectRepairQuestionIds(sourceHit.questionId, queue);
    if (questionIds.length < 2) {
      setGameError("目前找不到兩題不同語意的修復題；原本的錯題紀錄仍已保留。");
      return;
    }
    const plan: RepairPlan = {
      weakness: battlePrimaryWeakness ?? sourceHit.skillLabel,
      sourceQuestionId: sourceHit.questionId,
      questionIds,
      correctCount: 0,
      completed: false,
      retryMode: battleMode === "boss" ? "boss" : "expedition",
      retryBossRegionId: battleMode === "boss" ? bossRegionId : null,
    };
    setRepairPlan(plan);
    setBattleMode("repair");
    setBattleOutcome("active");
    setBattleSessionId("");
    setBattleHistory([]);
    setBattleImpact(null);
    setBattleBoonId("aegis-oath");
    setBattleStanceId("blade");
    setBattleEnergy(0);
    setBattleBurstArmed(false);
    setQueue(questionIds);
    setPosition(0);
    resetQuestion();
    setBattleMessage("先看一次弱點短教學，再完成兩題不同情境的立即修復。這兩題不會冒充無提示精通證據。");
    requestAnimationFrame(() => document.querySelector(".repair-arena")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function restartRepairRound() {
    if (!repairPlan) return;
    const questionIds = selectRepairQuestionIds(repairPlan.sourceQuestionId, repairPlan.questionIds);
    if (questionIds.length < 2) return;
    setRepairPlan({ ...repairPlan, questionIds, correctCount: 0, completed: false });
    setQueue(questionIds);
    setPosition(0);
    resetQuestion();
  }

  function retryAfterRepair() {
    if (!repairPlan) return;
    if (repairPlan.retryMode === "boss" && repairPlan.retryBossRegionId) {
      void startBossBattle(repairPlan.retryBossRegionId);
      return;
    }
    startToday(unitFilter);
  }

  function startToday(filter: UnitFilter = unitFilter, options?: { route?: StoryRouteId; difficulty?: ContentDifficultyId }) {
    setCustomPracticeName("");
    const targetIndex = filter === "path" ? activeUnitIndex : UNITS.findIndex((unit) => unit.id === filter);
    const previewOnly = filter !== "path" && targetIndex > activeUnitIndex;
    const inferredRoute: StoryRouteId = filter === "path"
      ? "formal"
      : previewOnly
        ? "leap"
        : targetIndex < activeUnitIndex
          ? "backtrack"
          : options?.route ?? "formal";
    const difficulty = filter === "path" ? "standard" : options?.difficulty ?? contentDifficulty;
    setPracticePreviewOnly(previewOnly);
    setPracticeRoute(inferredRoute);
    setPracticeDifficulty(difficulty);
    setRoundStartXp(adventureXp);
    setBattleMode("expedition");
    setBossRegionId(null);
    setBossRunId(null);
    setBattleHistory([]);
    setBattleImpact(null);
    setBattleBurstArmed(false);
    const expeditionEncounter = REGION_ENCOUNTERS[currentRegion.id] ?? REGION_ENCOUNTERS.trail;
    resetBattleGameState(expeditionEncounter.id);
    setBattleMessage(`遭遇 ${expeditionEncounter.name}。先選一份遠征祝福，再看敵方意圖決定架勢。`);
    const unseenVariantIds = new Set(getUnseenVariantQuestions(evidenceFingerprints).map((question) => question.id));
    const unseenVariants = VARIANT_QUEUE_QUESTIONS.filter((question) => unseenVariantIds.has(question.id));
    if (filter === "path") {
      setQueue(buildAdaptiveDailyQueue([...QUEUE_QUESTIONS, ...unseenVariants], states, activeUnit.id, {
        limit: 6,
        nowMs: now,
        skillStates: progress.skillStates ?? [],
        eligibleTransferUnitIds: UNITS.slice(0, activeUnitIndex + 1).map((unit) => unit.id),
        reviewSlots: 3,
        freshSlots: 2,
        transferSlots: 1,
        minimumUnseenCandidates: 5,
      }));
    } else {
      const coreQuestions = QUEUE_QUESTIONS.filter((question) => question.unit === filter);
      const transferQuestions = unseenVariants.filter((question) => question.unit === filter);
      if (difficulty === "leap") {
        setQueue([...shuffle(transferQuestions), ...shuffle(coreQuestions)].slice(0, 6).map((question) => question.id));
      } else {
        const allowed = difficulty === "steady" ? coreQuestions : [...coreQuestions, ...transferQuestions];
        setQueue(buildAdaptiveDailyQueue(allowed, states, filter, {
          limit: 6,
          nowMs: now,
          skillStates: progress.skillStates ?? [],
          eligibleTransferUnitIds: [filter],
          reviewSlots: inferredRoute === "backtrack" ? 4 : 3,
          freshSlots: inferredRoute === "backtrack" ? 1 : 2,
          transferSlots: difficulty === "steady" ? 0 : 1,
          minimumUnseenCandidates: 5,
        }));
      }
    }
    setPosition(0);
    resetQuestion();
  }

  function startUnit(unit: UnitId, options?: { route?: StoryRouteId; difficulty?: ContentDifficultyId }) {
    setUnitFilter(unit);
    setView("today");
    startToday(unit, options);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function startStoryPractice(unit: UnitId, route: StoryRouteId, difficulty: ContentDifficultyId) {
    setStoryUnit(unit);
    setStoryRoute(route);
    setContentDifficulty(difficulty);
    void postStory("startRoute", unit, { route, difficulty });
    startUnit(unit, { route, difficulty });
  }

  function startCustomPractice(questionIds: string[], name: string) {
    const safeQueue = [...new Set(questionIds)].filter((questionId) => Boolean(getPlayableQuestion(questionId))).slice(0, 40);
    if (!safeQueue.length) {
      setSyncError("這個自訂題組目前沒有可用題目。");
      return;
    }
    setUnitFilter("path");
    startToday("path");
    setCustomPracticeName(name);
    setPracticePreviewOnly(true);
    setPracticeRoute("backtrack");
    setPracticeDifficulty("steady");
    setQueue(safeQueue);
    setPosition(0);
    resetQuestion();
    setBattleMessage(`自訂題組「${name}」已載入。這輪保留練習事件，但不推進正式能力證據、FSRS、XP 或旅伴好感。`);
    setView("today");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function startStoryCase(unit: UnitId, route: StoryRouteId, difficulty: ContentDifficultyId) {
    setStoryUnit(unit);
    setStoryRoute(route);
    setContentDifficulty(difficulty);
    void postStory("startRoute", unit, { route, difficulty });
    setScenarioFocusRequest((current) => ({ unit, token: current.token + 1 }));
    requestAnimationFrame(() => document.getElementById("chapter-action-engine")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function startBossBattle(regionId: string) {
    if (bossStartPending.current) return;
    const region = ADVENTURE_REGIONS.find((item) => item.id === regionId);
    if (!region || !isRegionBossUnlocked(region)) {
      setSyncError("這個 Boss 還沒解鎖；正式課程照原順序繼續，不會因遊戲節點跳級。");
      return;
    }
    bossStartPending.current = true;
    setSyncError("");
    try {
      const response = await fetch("/api/adventure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "startBoss", regionId }),
      });
      const result = (await response.json()) as { error?: string; runId?: string; questionIds?: string[] };
      if (!response.ok) throw new Error(result.error || "Boss 題單建立失敗。");
      if (!result.runId || result.questionIds?.length !== BOSS_TURN_LIMIT || result.questionIds.some((id) => !getVariantQuestion(id))) {
        throw new Error("Boss 題單沒有完整通過伺服器驗證。");
      }
      setRoundStartXp(adventureXp);
      setBattleMode("boss");
      setBossRegionId(region.id);
      setBossRunId(result.runId);
      setBattleHistory([]);
      setBattleImpact(null);
      setBattleBurstArmed(false);
      resetBattleGameState((BOSS_ENCOUNTERS[region.id] ?? REGION_ENCOUNTERS[currentRegion.id]).id, false);
      setBattleMessage(`${region.bossName} 守住 ${BOSS_CORE_TARGET} 個核心。十題由伺服器鎖定為未見題；至少七次真正的新正解才能通關。`);
      setQueue(result.questionIds);
      setPosition(0);
      resetQuestion();
      setView("today");
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Boss 題單建立失敗。");
    } finally {
      bossStartPending.current = false;
    }
  }

  useEffect(() => {
    // Initial load intentionally hydrates the client from the cloud progress endpoint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProgress();
    void loadVocabulary();
    void loadCompanions();
    void loadGame();
    void loadJourney();
    void loadStory();
    const savedStance = window.localStorage.getItem("english-adventure-stance");
    if (BATTLE_STANCES.some((stance) => stance.id === savedStance)) {
      setBattleStanceId(savedStance as BattleStanceId);
    }
    const savedInterfaceMode = window.localStorage.getItem("english-interface-mode");
    if (savedInterfaceMode === "simple" || savedInterfaceMode === "detailed") setInterfaceMode(savedInterfaceMode);
    const savedFontScale = window.localStorage.getItem("english-font-scale");
    if (savedFontScale === "standard" || savedFontScale === "large") setFontScale(savedFontScale);
    const savedMotionMode = window.localStorage.getItem("english-motion-mode");
    if (savedMotionMode === "standard" || savedMotionMode === "reduced") setMotionMode(savedMotionMode);
    const savedSpeechAccent = window.localStorage.getItem("english-speech-accent");
    if (savedSpeechAccent === "en-US" || savedSpeechAccent === "en-GB" || savedSpeechAccent === "en-AU") setSpeechAccent(savedSpeechAccent);
    const savedSpeechRate = Number(window.localStorage.getItem("english-speech-rate"));
    if (Number.isFinite(savedSpeechRate) && savedSpeechRate >= 0.6 && savedSpeechRate <= 1.25) setSpeechRate(savedSpeechRate);
    const savedReportPeriod = window.localStorage.getItem("english-report-period");
    if (savedReportPeriod === "week" || savedReportPeriod === "month") setReportPeriod(savedReportPeriod);
    const savedListeningMode = window.localStorage.getItem("english-listening-mode");
    if (savedListeningMode === "learning" || savedListeningMode === "toeic" || savedListeningMode === "hard") setListeningMode(savedListeningMode);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  useEffect(() => {
    const markInteraction = () => {
      effectiveLastInteraction.current = performance.now();
    };
    const timer = window.setInterval(() => {
      const timestamp = performance.now();
      const lastTick = effectiveLastTick.current ?? timestamp;
      const lastInteraction = effectiveLastInteraction.current ?? timestamp;
      if (document.visibilityState === "visible" && !questionAnswered.current && timestamp - lastInteraction <= 30_000) {
        effectiveActiveMs.current += Math.max(0, Math.min(1_500, timestamp - lastTick));
      }
      effectiveLastTick.current = timestamp;
    }, 1_000);
    window.addEventListener("pointerdown", markInteraction, { passive: true });
    window.addEventListener("keydown", markInteraction);
    window.addEventListener("touchstart", markInteraction, { passive: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
    };
  }, []);

  useEffect(() => {
    effectiveActiveMs.current = 0;
    answerActiveMs.current = null;
    questionAnswered.current = !currentQuestion;
    const timestamp = performance.now();
    effectiveLastTick.current = timestamp;
    effectiveLastInteraction.current = timestamp;
  }, [currentQuestion]);

  useEffect(() => {
    if (!loading && !journeyLoading && !hasBuiltInitialQueue.current) {
      hasBuiltInitialQueue.current = true;
      const timeoutId = window.setTimeout(() => {
        if (journeyProgress.session?.currentStep === "practice") restoreJourneyPractice(journeyProgress.session);
        else startToday("path");
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    // The first queue is intentionally built once from the first cloud snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyLoading, loading]);

  useEffect(() => {
    if (!journeyPracticeActive || !journeySession || journeyRestorePending.current || !queue.length) return;
    if (journeyCheckpointTimer.current) window.clearTimeout(journeyCheckpointTimer.current);
    journeyCheckpointTimer.current = window.setTimeout(() => void saveJourneyCheckpoint(journeySession), 420);
    return () => {
      if (journeyCheckpointTimer.current) window.clearTimeout(journeyCheckpointTimer.current);
    };
    // The checkpoint deliberately follows the complete serializable battle snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleBoonGuardSpent, battleBoonId, battleBoonOptions, battleBurstArmed, battleCharmSpent, battleEnergy, battleGrade, battleGuardActive, battleHistory, battleOutcome, battleReward, battleSessionId, battleStanceId, battleWillpower, journeyPracticeActive, journeySession?.id, position, queue]);

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function selectChoice(choiceId: string) {
    if (!currentQuestion || !battleBoonId || draft) return;
    if (currentQuestionIsListening && listeningPlayCount === 0) {
      setSavedMessage("聽力題先播放首聽，再鎖定你的第一個答案。");
      return;
    }
    setSelected(choiceId);
    setSavedMessage("");
  }

  function lockAnswer() {
    if (!currentQuestion || !battleBoonId || draft || !confidence) return;
    const value = currentQuestion.kind === "choice" ? selected : output.trim();
    if (!value) return;
    if (currentQuestionIsListening && listeningPlayCount === 0) {
      setSavedMessage("先完成一次首聽，才能鎖定聽力首答。");
      return;
    }
    answerActiveMs.current = Math.round(effectiveActiveMs.current);
    questionAnswered.current = true;
    if (currentQuestionIsListening) setAnswerListenCount(listeningPlayCount);
    const acceptedOutput = currentQuestion.kind === "output" && matchesAcceptedOutput(currentQuestion, value);
    setDraft({
      value,
      correct: currentQuestion.kind === "choice" ? value === currentQuestion.answerId : acceptedOutput ? true : null,
      output: currentQuestion.kind === "output" ? output.trim() : undefined,
      outputAssessment: acceptedOutput ? "accepted" : undefined,
    });
    setFeedbackRevealed(currentQuestion.kind === "output" ? acceptedOutput : !currentQuestionIsListening);
    setSavedMessage(currentQuestion.kind === "output"
      ? acceptedOutput
        ? "這個寫法符合可接受答案；首答與信心已鎖定。"
        : "首答與信心已鎖定。先和可接受答案比較，再選擇三段判定。"
      : currentQuestionIsListening
        ? "首答與信心已鎖定；現在依聽力模式進入修復或解析。"
        : "答案與作答信心已鎖定。解析不會反過來改寫這次信心。"
    );
  }

  function markOutput(assessment: Exclude<OutputAssessment, "accepted">) {
    if (!draft) return;
    setDraft({
      ...draft,
      correct: assessment !== "needs-fix",
      output: output.trim(),
      outputAssessment: assessment,
    });
    setFeedbackRevealed(true);
  }

  async function savePreferences(next: {
    interfaceMode: InterfaceMode;
    fontScale: FontScale;
    motionMode: MotionMode;
    speechAccent: SpeechAccent;
    speechRate: number;
    reportPeriod: ReportPeriod;
  }) {
    setInterfaceMode(next.interfaceMode);
    setFontScale(next.fontScale);
    setMotionMode(next.motionMode);
    setSpeechAccent(next.speechAccent);
    setSpeechRate(next.speechRate);
    setReportPeriod(next.reportPeriod);
    window.localStorage.setItem("english-interface-mode", next.interfaceMode);
    window.localStorage.setItem("english-font-scale", next.fontScale);
    window.localStorage.setItem("english-motion-mode", next.motionMode);
    window.localStorage.setItem("english-speech-accent", next.speechAccent);
    window.localStorage.setItem("english-speech-rate", String(next.speechRate));
    window.localStorage.setItem("english-report-period", next.reportPeriod);
    setPreferencesSaving(true);
    setPreferencesNotice("正在同步設定…");
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "savePreferences", ...next }),
      });
      const result = (await response.json()) as { error?: string; synced?: boolean };
      if (!response.ok) throw new Error(result.error || "顯示設定同步失敗。");
      setPreferencesNotice(result.synced === false ? "設定已保存在這個帳號。" : "設定已跨裝置同步。");
    } catch (error) {
      setPreferencesNotice(error instanceof Error ? `${error.message} 這台裝置仍已套用。` : "同步失敗；這台裝置仍已套用。");
    } finally {
      setPreferencesSaving(false);
    }
  }

  function chooseInterfaceMode(mode: InterfaceMode) {
    void savePreferences({ interfaceMode: mode, fontScale, motionMode, speechAccent, speechRate, reportPeriod });
  }

  function chooseFontScale(scale: FontScale) {
    void savePreferences({ interfaceMode, fontScale: scale, motionMode, speechAccent, speechRate, reportPeriod });
  }

  function chooseMotionMode(mode: MotionMode) {
    void savePreferences({ interfaceMode, fontScale, motionMode: mode, speechAccent, speechRate, reportPeriod });
  }

  function chooseSpeechPreferences(accent: SpeechAccent, rate: number, period: ReportPeriod = reportPeriod) {
    void savePreferences({ interfaceMode, fontScale, motionMode, speechAccent: accent, speechRate: rate, reportPeriod: period });
  }

  function chooseListeningMode(mode: ListeningMode) {
    if (draft || listeningPlayCount > 0) return;
    setListeningMode(mode);
    window.localStorage.setItem("english-listening-mode", mode);
    setSavedMessage(mode === "learning"
      ? "學習模式：首聽前保留選項文字；這次不當作嚴格首聽證據。"
      : mode === "toeic"
        ? "多益模式：首聽時隱藏選項文字，答案選項會一起播放。"
        : "困難模式：題目與選項只完整播放一次，之後直接進解析。"
    );
  }

  function chooseBattleStance(stanceId: BattleStanceId) {
    if (draft || saving || !battleBoonId) return;
    setBattleStanceId(stanceId);
    window.localStorage.setItem("english-adventure-stance", stanceId);
    const stance = getBattleStance(stanceId);
    const counterText = stanceId === battleIntent.counter ? ` 正好克制「${battleIntent.name}」，命中時有戰術加成。` : ` 敵方目前是「${battleIntent.name}」，${getBattleStance(battleIntent.counter).name}可以克制。`;
    setBattleMessage(`${stance.name}已切換。${stance.evidenceLabel}。${counterText}`);
  }

  function chooseBattleBoon(boonId: ExpeditionBoonId) {
    if (battleBoonId || battleHistory.length > 0 || draft || saving) return;
    const boon = getExpeditionBoon(boonId);
    if (!boon || !battleBoonOptions.includes(boonId)) return;
    setBattleBoonId(boonId);
    const startingEnergy = Math.min(6, expeditionStartingEnergy(boonId) + battleStartingEnergy([...equippedGameItems]));
    setBattleEnergy(startingEnergy);
    setBattleMessage(`${boon.name}已生效。${boon.detail} 現在看敵方意圖，決定這題要用哪個架勢。`);
  }

  async function activateBattleItem(itemId: GameItemId) {
    if (practicePreviewOnly) {
      setBattleMessage("躍遷試玩不消耗背包道具；回到正式主線或回溯複習後即可使用。");
      return;
    }
    if (!currentQuestion || repairActive || !battleSessionId || !battleBoonId || draft || saving || gameBusy || battleOutcome !== "active") return;
    const item = getGameItem(itemId);
    if (!item || (gameInventory.get(itemId) ?? 0) <= 0) return;
    if (itemId === "erase-rune" && currentQuestion.kind !== "choice") {
      setBattleMessage("消去符只能在選擇題使用。");
      return;
    }
    if (itemId === "hint-lantern" && battleItemHintVisible) {
      setBattleMessage("這題的提示燈已經亮著了。");
      return;
    }
    if (itemId === "guard-charm" && battleGuardActive) {
      setBattleMessage("守心符已經生效；等下一次真正受到傷害再用新的。");
      return;
    }
    if (itemId === "trail-ration" && battleWillpower >= MAX_WILLPOWER) {
      setBattleMessage("意志已經全滿，先把旅糧留著。");
      return;
    }
    if (itemId === "echo-stone" && (!currentQuestionIsListening || listeningPlayCount < 1 || practiceListeningQuestionId)) {
      setBattleMessage(currentQuestionIsListening ? "先完成正常首聽，再用回聲石追加一次播放。" : "回聲石只能在聽力題使用。");
      return;
    }

    setGameBusy(true);
    setGameError("");
    try {
      const useId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : newBattleId();
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "consume", itemId, battleId: battleSessionId, turnIndex: position, useId }),
      });
      const data = (await response.json()) as GamePayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "道具沒有成功使用。");
      setGameProgress(data);
      if (itemId === "erase-rune") {
        const removable = currentOptions.find((option) => option.id !== currentQuestion.answerId && option.id !== wardHiddenOptionId && option.id !== battleEliminatedOptionId);
        if (removable) setBattleEliminatedOptionId(removable.id);
        setQuestionItemAssisted(true);
        setBattleMessage("消去符生效：已排除 1 個錯誤選項；這題仍可通關，但不算無提示精通證據。");
      } else if (itemId === "hint-lantern") {
        setBattleItemHintVisible(true);
        setQuestionItemAssisted(true);
        setBattleMessage("提示燈生效：已顯示這題的判斷提示；這題不算無提示精通證據。");
      } else if (itemId === "guard-charm") {
        setBattleGuardActive(true);
        setBattleMessage("守心符已展開：下一次實際意志傷害會被完全擋住。");
      } else if (itemId === "trail-ration") {
        setBattleWillpower((value) => Math.min(MAX_WILLPOWER, value + 1));
        setBattleMessage("使用旅糧：恢復 1 點意志。");
      } else if (itemId === "echo-stone") {
        setQuestionItemAssisted(true);
        setBattleMessage("回聲石啟動：額外完整播放 1 次；這題不算無提示首聽證據。");
        playCurrentQuestionListening(true);
      }
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "道具沒有成功使用。");
    } finally {
      setGameBusy(false);
    }
  }

  async function buyGameItem(itemId: GameItemId) {
    if (gameBusy) return;
    setGameBusy(true);
    setGameError("");
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "buy", itemId }),
      });
      const data = (await response.json()) as GamePayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "補給購買失敗。");
      setGameProgress(data);
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "補給購買失敗。");
    } finally {
      setGameBusy(false);
    }
  }

  async function equipGameItem(equipmentId: GameEquipmentId) {
    if (gameBusy) return;
    setGameBusy(true);
    setGameError("");
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "equip", equipmentId }),
      });
      const data = (await response.json()) as GamePayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "裝備切換失敗。");
      setGameProgress(data);
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "裝備切換失敗。");
    } finally {
      setGameBusy(false);
    }
  }

  async function equipGameOutfit(outfitId: GameOutfitId) {
    if (gameBusy) return;
    setGameBusy(true);
    setGameError("");
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "equipOutfit", outfitId }),
      });
      const data = (await response.json()) as GamePayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "衣裝切換失敗。");
      setGameProgress(data);
      setCompanionNotice(`${getGameOutfit(outfitId)?.name ?? "新衣裝"}已換上；衣裝只改外觀，不改學習判定。`);
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "衣裝切換失敗。");
    } finally {
      setGameBusy(false);
    }
  }

  async function claimGameQuest(questId: GameQuestId) {
    if (gameBusy) return;
    setGameBusy(true);
    setGameError("");
    setQuestNotice("");
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "claimQuest", questId, localDate: gameProgress.questDate ?? todayInTaipei() }),
      });
      const data = (await response.json()) as GamePayload & {
        error?: string;
        claimedReward?: { questId: GameQuestId; reward: GameQuestReward; newUnlocks: string[] };
      };
      if (!response.ok) throw new Error(data.error || "委託獎勵領取失敗。");
      setGameProgress(data);
      const unlocked = data.claimedReward?.newUnlocks.map(gameUnlockLabel).join("、");
      setQuestNotice(`已領取 ${data.claimedReward ? gameQuestRewardLabel(data.claimedReward.reward) : "委託獎勵"}${unlocked ? ` · NEW ${unlocked}` : ""}`);
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "委託獎勵領取失敗。");
    } finally {
      setGameBusy(false);
    }
  }

  async function settleGameBattle(outcome: Exclude<BattleOutcome, "active">, history: BattleHit[]) {
    const sessionId = battleSessionId || newBattleId();
    if (!battleSessionId) setBattleSessionId(sessionId);
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "settleBattle",
          battleId: sessionId,
          encounterId: currentEncounter.id,
          mode: battleMode,
          outcome,
          hits: history.map((hit) => ({
            answerReceiptId: hit.answerReceiptId,
            questionId: hit.questionId,
            stanceId: hit.stanceId,
            companionId: hit.companionId,
            burst: hit.burst,
          })),
          boonId: battleBoonId,
          localDate: todayInTaipei(),
        }),
      });
      const data = (await response.json()) as GamePayload & { error?: string; grade?: BattleGrade; reward?: BattleReward };
      if (!response.ok) throw new Error(data.error || "戰利品結算失敗。");
      setGameProgress(data);
      setBattleGrade(data.grade ?? "B");
      setBattleReward(data.reward ?? null);
      setGameError("");
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "戰利品結算失敗；學習紀錄不受影響。");
    }
  }

  function toggleBattleBurst() {
    if (draft || saving || !battleBoonId || battleEnergy < battleBurstCostValue) return;
    setBattleBurstArmed((armed) => !armed);
    setBattleMessage(battleBurstArmed
      ? `${activeCompanion.burstName}已取消，能量保留。`
      : `${activeCompanion.burstName}已待命；這回合結算時消耗 ${battleBurstCostValue} 點共鳴能量。`);
  }

  function resolveBattleTurn(correct: boolean, novelEvidence: boolean, strictEvidenceEligible: boolean, answerReceiptId: string) {
    let chainBefore = 0;
    for (let index = battleHistory.length - 1; index >= 0 && battleHistory[index].correct; index -= 1) chainBefore += 1;
    const chain = correct ? chainBefore + 1 : 0;
    const baseDamage = battleTurnDamage(battleStanceId, correct, chain);
    const supportBonus = correct ? companionBattleBonus(activeCompanion.id, correct, chain) : 0;
    const countered = battleStanceId === battleIntent.counter;
    const equipmentBonus = battleEquipmentDamageBonus([...equippedGameItems], battleStanceId, correct, countered, chain, activeCompanion.id);
    const counterBonus = correct && countered ? battleIntent.counterBonus : 0;
    const boonDamage = expeditionBoonDamageBonus(battleBoonId, correct, countered);
    const eventEffect = resolveBattleEventEffect(battleEvent, {
      correct,
      stanceId: battleStanceId,
      correctChain: chain,
      countered,
      strictEvidenceEligible,
    });
    const burstTriggered = battleBurstArmed && correct;
    const burstBonus = burstTriggered ? 18 + Math.floor(activeCompanionAffinity / 25) : 0;
    const damage = correct ? baseDamage + supportBonus + equipmentBonus + counterBonus + boonDamage + burstBonus + eventEffect.damageBonus : 0;
    const energyGain = Math.min(3, (correct ? 2 : 1) + (countered ? 1 : 0));
    const coreHit = battleMode === "boss" && correct && novelEvidence;
    let willpowerDamage = correct ? 0 : battleIntent.wrongDamage + eventEffect.wrongDamageBonus;
    if (!correct && battleStanceId === "ward") willpowerDamage = Math.max(0, willpowerDamage - 1);
    if (!correct) willpowerDamage = Math.max(0, willpowerDamage - companionWrongDamageReduction(activeCompanion.id));
    let blockedDamage = 0;
    if (!correct && willpowerDamage > 0 && battleBoonId === "aegis-oath" && !battleBoonGuardSpent) {
      blockedDamage += 1;
      willpowerDamage = Math.max(0, willpowerDamage - 1);
      setBattleBoonGuardSpent(true);
    }
    if (!correct && willpowerDamage > 0 && battleGuardActive) {
      blockedDamage += willpowerDamage;
      willpowerDamage = 0;
      setBattleGuardActive(false);
    } else if (!correct && willpowerDamage > 0 && equippedGameItems.has("clear-lantern") && !battleCharmSpent) {
      blockedDamage += 1;
      willpowerDamage = Math.max(0, willpowerDamage - 1);
      setBattleCharmSpent(true);
    }
    const contentAssist = battleStanceId !== "blade" || questionItemAssisted || (currentQuestionIsListening && listeningMode === "learning");
    const hit: BattleHit = {
      answerReceiptId,
      questionId: currentQuestion?.id ?? "unknown",
      skillLabel: currentQuestion?.skill ?? "未分類弱點",
      correct,
      damage,
      boonDamage,
      eventDamage: eventEffect.damageBonus,
      eventSucceeded: eventEffect.succeeded,
      eventName: battleEvent?.name ?? null,
      chain,
      countered,
      energyGain,
      burst: burstTriggered,
      coreHit,
      willpowerDamage,
      blockedDamage,
      contentAssist,
      stanceId: battleStanceId,
      companionId: activeCompanion.id,
    };
    battleImpactSequence.current += 1;
    const impactId = battleImpactSequence.current;
    setBattleHistory((history) => [...history, hit]);
    setBattleImpact({ ...hit, id: impactId });
    if (willpowerDamage) setBattleWillpower((value) => Math.max(0, value - willpowerDamage));
    setBattleEnergy((energy) => Math.max(0, Math.min(6, energy - (burstTriggered ? battleBurstCostValue : 0) + energyGain)));
    if (burstTriggered) setBattleBurstArmed(false);
    const supportText = supportBonus ? ` ${activeCompanion.name}支援 +${supportBonus}。` : "";
    const equipmentText = equipmentBonus ? ` 裝備追擊 +${equipmentBonus}。` : "";
    const boonText = boonDamage ? ` ${battleBoon?.name ?? "遠征祝福"} +${boonDamage}。` : "";
    const eventText = eventEffect.damageBonus && battleEvent ? ` 場地事件「${battleEvent.name}」成功，+${eventEffect.damageBonus}。` : "";
    const eventDangerText = eventEffect.wrongDamageBonus && battleEvent ? ` 「${battleEvent.name}」反噬 +${eventEffect.wrongDamageBonus}。` : "";
    const counterText = countered ? ` 克制「${battleIntent.name}」+${counterBonus}。` : "";
    const burstText = hit.burst ? ` ${activeCompanion.burstName} +${burstBonus}。` : "";
    const coreText = battleMode === "boss" ? (coreHit ? " 未見證據命中核心！" : correct ? " 這次不是新的語意證據，因此只計戰鬥傷害。" : " 核心沒有被假命中。") : "";
    setBattleMessage(correct
      ? `${chain >= 2 ? "連擊！" : "命中！"} ${battleStance.name}造成 ${damage} 點傷害。${counterText}${eventText}${boonText}${burstText}${supportText}${equipmentText}${coreText}`
      : `${blockedDamage ? `防禦擋下 ${blockedDamage} 點。` : "敵方反擊。"}${willpowerDamage ? ` 意志 -${willpowerDamage}。` : " 沒有失去意志。"}${eventDangerText} 這題仍完整留下錯因與學習紀錄，正式進度不倒退。${coreText}`);
    window.setTimeout(() => setBattleImpact((impact) => impact?.id === impactId ? null : impact), 720);
    return hit;
  }

  async function recordBossClear(regionId: string, runId: string) {
    const response = await fetch("/api/adventure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clearBoss", regionId, runId, localDate: todayInTaipei() }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error || "Boss 戰果保存失敗。");
  }

  async function saveAnswer() {
    if (!currentQuestion || !draft || draft.correct === null || !feedbackRevealed || !confidence || saving) return;
    const listenCount = currentQuestionIsListening ? (answerListenCount ?? listeningPlayCount) : 0;
    const replayCount = currentQuestionIsListening ? Math.max(0, listeningPlayCount - listenCount) : 0;
    answerRequestId.current ??= typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSaving(true);
    setSavedMessage("");
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          unit: currentQuestion.unit,
          kind: currentQuestion.kind,
          answer: draft.value,
          correct: draft.correct,
          confidence,
          output: draft.output,
          localDate: todayInTaipei(),
          listenCount,
          replayCount,
          activeMs: answerActiveMs.current ?? Math.round(effectiveActiveMs.current),
          supportMode: repairActive ? "lantern" : questionItemAssisted && battleStanceId === "blade" ? "ward" : battleStanceId,
          listeningMode: currentQuestionIsListening ? listeningMode : undefined,
          outputAssessment: draft.outputAssessment,
          requestId: answerRequestId.current,
          bossRunId: battleMode === "boss" ? bossRunId ?? undefined : undefined,
          battleId: !repairActive ? battleSessionId || undefined : undefined,
          previewOnly: practicePreviewOnly,
          storyRoute: practiceRoute,
          contentDifficulty: practiceDifficulty,
        }),
      });
      const result = (await response.json()) as { error?: string; synced?: boolean; companionBondGained?: number; novelSkillEvidence?: boolean; strictEvidenceEligible?: boolean; bossCoreHit?: boolean; duplicate?: boolean; answerReceiptId?: string; previewOnly?: boolean };
      if (!response.ok) throw new Error(result.error || "無法保存進度。");
      const bondText = result.companionBondGained ? ` · ${activeCompanion.name}好感 +${result.companionBondGained}` : "";
      const evidenceText = result.novelSkillEvidence
        ? " · 已計入新的無提示能力證據"
        : result.strictEvidenceEligible === false
          ? " · 本題保留為練習紀錄，不灌入嚴格未見能力證據"
          : "";
      setSavedMessage(result.previewOnly
        ? `已同步 ${currentQuestion.unit} 躍遷探索 · 不建立正式題目狀態、FSRS、能力證據、XP 或旅伴好感`
        : `${result.synced === false ? "已記錄在試行模式" : "已同步學習紀錄"}${bondText}${evidenceText}`);
      if (repairActive && repairPlan) {
        const nextCorrectCount = repairPlan.correctCount + (draft.correct ? 1 : 0);
        await Promise.all([loadProgress(true), result.companionBondGained ? loadCompanions(true) : Promise.resolve()]);
        if (position + 1 >= queue.length) {
          setRepairPlan({ ...repairPlan, correctCount: nextCorrectCount, completed: true });
          setBattleMessage(nextCorrectCount === queue.length
            ? `${queue.length} 題變式修復完成。這是立即教學後的修復紀錄，不會冒充無提示精通；下一場會重新換題。`
            : `${queue.length} 題修復已完成，答對 ${nextCorrectCount}/${queue.length}。錯因已保留，可以再做一組或回到原敵人重新驗證。`);
          if (journeyRepairActive && journeySession) await postJourney("advance", journeySession);
        } else {
          setRepairPlan({ ...repairPlan, correctCount: nextCorrectCount });
          window.setTimeout(() => {
            setPosition((old) => old + 1);
            resetQuestion();
            requestAnimationFrame(() => document.querySelector(".practice-card")?.scrollIntoView({ behavior: "smooth", block: "start" }));
          }, 420);
        }
        return;
      }
      const alreadyResolved = battleHistory.length > position;
      const hit = alreadyResolved
        ? battleHistory[position]
        : resolveBattleTurn(
          draft.correct,
          battleMode === "boss" ? result.bossCoreHit === true : result.novelSkillEvidence !== false,
          result.strictEvidenceEligible === true,
          result.answerReceiptId ?? answerRequestId.current!,
        );
      const nextHistory = alreadyResolved ? battleHistory : [...battleHistory, hit];
      const nextWillpower = alreadyResolved ? battleWillpower : Math.max(0, battleWillpower - hit.willpowerDamage);
      const nextBossCores = nextHistory.filter((entry) => entry.coreHit).length;
      const nextEnemyHp = Math.max(0, battleEnemyMaxHp - nextHistory.reduce((sum, entry) => sum + entry.damage, 0));
      let nextOutcome: BattleOutcome = "active";
      const journeyNeedsRemainingAnswers = journeyPracticeActive && battleMode === "expedition" && nextHistory.length < queue.length;
      if (nextWillpower <= 0 && !journeyNeedsRemainingAnswers) {
        nextOutcome = "defeat";
      } else if (battleMode === "boss" && nextHistory.length >= queue.length) {
        nextOutcome = queue.length === BOSS_TURN_LIMIT && nextBossCores >= BOSS_CORE_TARGET ? "victory" : "defeat";
      } else if (battleMode === "expedition" && nextHistory.length >= queue.length) {
        nextOutcome = nextEnemyHp <= 0 ? "victory" : "defeat";
      }
      if (nextOutcome === "victory" && battleMode === "boss" && bossRegionId && bossRunId) {
        await recordBossClear(bossRegionId, bossRunId);
      }
      await Promise.all([loadProgress(true), result.companionBondGained ? loadCompanions(true) : Promise.resolve()]);
      if (nextOutcome !== "active") {
        setBattleOutcome(nextOutcome);
        if (!practicePreviewOnly) await settleGameBattle(nextOutcome, nextHistory);
        else setBattleReward(null);
        if (journeyPracticeActive && journeySession && battleMode === "expedition") await postJourney("advance", journeySession);
        setBattleMessage(practicePreviewOnly
          ? `${currentQuestion.unit} 躍遷試玩已走完；探索事件已保存，但不結算正式證據、XP、好感或戰利品。`
          : nextOutcome === "victory"
            ? `${currentEncounter.name}已被突破。戰利品正在結算。`
            : `意志或輸出未能撐過這場遭遇。你輸了這一戰，但剛才的英文作答與錯因全部保留。`);
      } else {
        if (journeyNeedsRemainingAnswers && nextWillpower <= 0) {
          setBattleMessage(`意志已降到 0，但遊戲敗北不會截斷學習題單；再完成 ${queue.length - nextHistory.length} 個節點後一起結算。`);
        } else if (battleMode === "expedition" && nextEnemyHp <= 0) {
          setBattleMessage(`敵人已被壓制，但本輪還有 ${queue.length - nextHistory.length} 題；完成全部 ${queue.length} 個學習節點後才正式結算。`);
        }
        window.setTimeout(() => {
          setPosition((old) => old + 1);
          resetQuestion();
          requestAnimationFrame(() => document.querySelector(".practice-card")?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }, 760);
      }
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "保存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  }

  function openCourseUnit(unit: UnitId) {
    setSelectedUnitId(unit);
    setTranscriptVisible(false);
    setAudioNote("");
    listeningPlaybackToken.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingUnit(null);
    requestAnimationFrame(() => document.getElementById("course-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function toggleListening(unit: (typeof UNITS)[number]) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setAudioNote("這個瀏覽器目前不支援內建朗讀，可直接使用下方逐字稿練習。");
      return;
    }
    if (speakingUnit === unit.id) {
      listeningPlaybackToken.current += 1;
      window.speechSynthesis.cancel();
      setSpeakingUnit(null);
      setAudioNote("已停止播放。");
      return;
    }
    listeningPlaybackToken.current += 1;
    window.speechSynthesis.cancel();
    setPracticeListeningQuestionId(null);
    const utterance = new SpeechSynthesisUtterance(unit.listening.replace(/\n+/g, " "));
    utterance.lang = speechAccent;
    utterance.rate = speechRate;
    utterance.onend = () => setSpeakingUnit(null);
    utterance.onerror = () => {
      setSpeakingUnit(null);
      setAudioNote("朗讀沒有成功啟動，仍可展開逐字稿練習。");
    };
    setAudioNote("首聽先不要展開逐字稿；播完再確認自己聽懂多少。");
    setSpeakingUnit(unit.id);
    window.speechSynthesis.speak(utterance);
  }

  function playCurrentQuestionListening(forceItemReplay = false) {
    if (!currentQuestion || !battleBoonId) return;
    const listeningText = currentQuestion.listeningText ?? currentQuestionUnit?.listening;
    if (!listeningText) return;
    if (!forceItemReplay && listeningMode === "hard" && listeningPlayCount >= 1) {
      setSavedMessage("困難模式只完整播放一次；首聽已完成，接下來直接鎖定答案或看解析。");
      return;
    }
    if (!forceItemReplay && !draft && listeningPlayCount >= 1) {
      setSavedMessage("首聽已完成。先鎖定第一個答案與信心，之後才開放二聽。");
      return;
    }
    if (!forceItemReplay && draft && !feedbackRevealed && listeningPlayCount >= 2) {
      setSavedMessage("二聽已完成。你的首答仍然保留，現在可以看解析。");
      return;
    }
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSavedMessage("這個瀏覽器目前不支援內建英文朗讀。");
      return;
    }
    if (practiceListeningQuestionId === currentQuestion.id) {
      listeningPlaybackToken.current += 1;
      window.speechSynthesis.cancel();
      setPracticeListeningQuestionId(null);
      setSavedMessage("播放已停止；沒有完整播完，所以這一次不計入首聽／二聽次數。");
      return;
    }
    listeningPlaybackToken.current += 1;
    window.speechSynthesis.cancel();
    setSpeakingUnit(null);
    const playbackToken = listeningPlaybackToken.current;
    const spokenPrompt = listeningMode === "learning" || !hasEnglishSpeech(currentQuestion.prompt) ? "" : ` Question. ${currentQuestion.prompt}`;
    const spokenOptions = listeningMode === "learning" || !currentOptions.length
      ? ""
      : currentOptions.map((option, index) => ` Choice ${String.fromCharCode(65 + index)}. ${option.label}.`).join("");
    const utterance = new SpeechSynthesisUtterance(`${listeningText.replace(/\n+/g, " ")}${spokenPrompt}${spokenOptions}`);
    utterance.lang = speechAccent;
    utterance.rate = speechRate;
    utterance.onend = () => {
      if (listeningPlaybackToken.current !== playbackToken) return;
      setListeningPlayCount((count) => count + 1);
      setPracticeListeningQuestionId(null);
      setSavedMessage(forceItemReplay
        ? "回聲石的額外播放完成；這題已標記為有協助練習。"
        : draft
        ? "修復重聽完成；首答仍維持鎖定。"
        : listeningMode === "hard"
          ? "唯一一次播放已完成；現在鎖定第一個答案與信心。"
          : "首聽完整播放完成；現在可以鎖定第一個答案與信心。"
      );
    };
    utterance.onerror = () => {
      if (listeningPlaybackToken.current !== playbackToken) return;
      setPracticeListeningQuestionId(null);
      setSavedMessage("這次朗讀沒有完整完成，因此不計入首聽／二聽次數。");
    };
    setPracticeListeningQuestionId(currentQuestion.id);
    window.speechSynthesis.speak(utterance);
  }

  function revealListeningFeedback() {
    if (!draft || !currentQuestionIsListening) return;
    setFeedbackRevealed(true);
    setSavedMessage(listeningMode === "hard"
      ? "困難模式的唯一一次首聽已鎖定；現在進入逐字稿與錯聽解析。"
      : listeningPlayCount >= 2
        ? "已保留首聽答案與首答信心；二聽只作為理解修復紀錄。"
        : "已保留首聽答案與首答信心；這次選擇直接看解析。"
    );
  }

  function navigate(viewId: View) {
    setView(viewId);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function renderReviewCard(question: PracticeQuestion, state: StoredState) {
    const correctOption = question.options?.find((option) => option.id === question.answerId)?.label;
    const relatedSkillStates = getQuestionSkillTags(question)
      .map((tag) => (progress.skillStates ?? []).find((skill) => skill.skill_tag === tag))
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill));
    const strictRepairs = relatedSkillStates.length
      ? Math.min(...relatedSkillStates.map((skill) => Number(skill.successful_unseen_count ?? 0)))
      : 0;
    const remainingRepairs = Math.max(0, 2 - strictRepairs);
    return (
      <article className="review-card" key={question.id}>
        <div className="review-card-top">
          <div><span className="unit-chip">{question.unit}</span><span className="skill-chip">{question.skill}</span></div>
          <span className="review-date">下次 {formatReviewTime(state.next_review_at)}</span>
        </div>
        <h3>{question.prompt}</h3>
        {question.outputPrompt && <p className="review-output">{question.outputPrompt}</p>}
        <div className="review-history">
          <span>累計 {state.attempts} 次</span>
          <span>答錯 {state.wrong_count} 次</span>
          <span>{state.confidence === 1 ? "低信心" : state.last_correct === 0 ? "上次答錯" : "需要確認"}</span>
        </div>
        <div className="review-remediation">
          <strong>{strictRepairs > 0 ? `已完成第 ${Math.min(strictRepairs, 2)} 次無提示修正` : "尚未完成無提示修正"}</strong>
          <span>{remainingRepairs > 0 ? `還需要在不同情境中無提示答對 ${remainingRepairs} 次，才會移出弱點區。` : "嚴格修正證據已足夠；同步後會移出弱點區。"}</span>
        </div>
        <details className="review-explanation">
          <summary>查看解析</summary>
          <div>
            <strong>{question.kind === "output" ? `參考答案：${question.referenceAnswer}` : `正確答案：${correctOption ?? "請重新作答"}`}</strong>
            <p>{question.explanation}</p>
            <small>{question.evidence}</small>
          </div>
        </details>
        <StudyItemActions itemType="question" itemId={question.id} unit={question.unit} title={question.prompt} excerpt={question.explanation} />
        <button className="ghost-action" onClick={() => startUnit(question.unit)}>練習 {question.unit}</button>
      </article>
    );
  }

  const correctOptionLabel = currentQuestion?.options?.find((option) => option.id === currentQuestion.answerId)?.label;
  const selectedOptionLabel = currentQuestion?.options?.find((option) => option.id === selected)?.label;
  const outputNeedsPolish = draft?.outputAssessment === "understandable";
  const feedbackLabel = outputNeedsPolish ? "UNDERSTANDABLE" : draft?.correct ? "CORRECT" : "REVIEW THIS";
  const feedbackHeadline = outputNeedsPolish ? "意思可以理解，再對照更自然的寫法" : draft?.correct ? "答對了，確認你是怎麼判斷的" : "這題先把錯因弄懂";
  const expeditionSlotLabels = battleMode === "boss"
    ? Array.from({ length: BOSS_TURN_LIMIT }, (_, index) => `核心 ${index + 1}`)
    : repairActive
      ? Array.from({ length: queue.length }, (_, index) => `變式修復 ${index + 1}`)
      : journeyPracticeActive && journeySession
        ? Array.from({ length: queue.length }, (_, index) => {
          const config = JOURNEY_LENGTHS[journeySession.journeyLength];
          if (index < config.reviewSlots) return "複習";
          if (index < config.reviewSlots + config.freshSlots) return "新題";
          return "遷移";
        })
        : [...STANDARD_EXPEDITION_SLOT_LABELS];
  const openMemory = GAME_MEMORIES.find((memory) => memory.id === openMemoryId && gameUnlocks.has(`memory:${memory.id}`));
  const newlyUnlockedMemory = GAME_MEMORIES.find((memory) => battleReward?.newUnlocks.includes(`memory:${memory.id}`));

  return (
    <main className={`app-shell ${interfaceMode === "simple" ? "simple-mode" : "detailed-mode"} ${fontScale === "large" ? "font-large" : "font-standard"} ${motionMode === "reduced" ? "reduce-motion" : "standard-motion"}`}>
      <header className="topbar">
        <button className="brand-lockup" onClick={() => navigate("today")} aria-label="回到今日練習">
          <span className="brand-mark">E</span>
          <span>
            <span className="brand-kicker">TOEIC 700 · U01–U40</span>
            <strong>Everyday English</strong>
          </span>
        </button>
        <div className="topbar-actions">
          <div className="account-chip" title={displayName}>
            <span className="status-dot" />
            <b>Lv.{adventureLevelValue}</b>
            <span>{displayName}</span>
          </div>
          <button className="settings-button" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog" aria-label="開啟閱讀與語音設定"><span aria-hidden="true">Aa</span><b>設定</b></button>
        </div>
      </header>

      <div className="layout-grid">
        <aside className="side-nav" aria-label="學習導覽">
          <p className="nav-label">LEARNING QUEST</p>
          {([
            ["today", "今日練習", "01"],
            ["wrong", "錯題複習", "02"],
            ["vocab", "學習工具", "03"],
            ["progress", "冒險地圖", "04"],
            ["course", "完整課程", "05"],
          ] as const).map(([id, label, icon]) => (
            <button key={id} className={`nav-button ${view === id ? "nav-button-active" : ""}`} onClick={() => navigate(id)} aria-current={view === id ? "page" : undefined}>
              <span className="nav-number">{icon}</span><span>{label}</span>
              {id === "wrong" && wrongStates.length > 0 && <b>{wrongStates.length}</b>}
              {id === "vocab" && dueVocabCount > 0 && <b>{dueVocabCount}</b>}
            </button>
          ))}
          <div className="sync-note">
            <span className="sync-icon">●</span>
            <div><strong>學習紀錄</strong><p>{progress.user?.synced === false ? "目前為試行模式" : "已開啟跨裝置同步"}</p></div>
          </div>
        </aside>

        <section className="content-column">
          {syncError && <div className="error-banner">{syncError} 目前仍可閱讀教材，但答題紀錄尚未同步。</div>}

          {view === "today" && (
            <>
              <JourneyCommandCenter
                payload={journeyProgress}
                loading={journeyLoading}
                busy={journeyBusy}
                error={journeyError}
                companionName={activeCompanion.name}
                companionImage={companionImageFor(activeCompanion.id)}
                selectedLength={journeyLength}
                onLengthChange={setJourneyLength}
                onContinue={() => void continueJourney()}
                onOpenAbility={() => {
                  setView("progress");
                  setAdventureTab("learning");
                  requestAnimationFrame(() => document.getElementById("ability-map-v27")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }}
              />
              <FirstActStoryPreview
                formalUnit={activeUnit.id}
                hasStartedOpening={Boolean(
                  storyProgress?.units.some((item) => item.unit === "U01")
                  || storyProgress?.choices.some((item) => item.unit === "U01")
                  || storyProgress?.evidence.some((item) => item.unit === "U01")
                )}
                onOpen={() => {
                  setView("progress");
                  setAdventureTab("mission");
                  requestAnimationFrame(() => document.getElementById("first-act-story-title")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }}
              />
              <section className="study-dock" aria-label="今日學習摘要">
                <div className="study-dock-main">
                  <div className="study-dock-copy">
                    <div className="study-kicker"><span>{repairActive ? "REPAIR" : battleMode === "boss" ? "BOSS" : activeUnit.id}</span><span>{repairActive ? repairPlan?.weakness : battleMode === "boss" && bossRegion ? bossRegion.bossName : activeUnit.title}</span></div>
                    <h1>{repairActive ? "敗北後先修復，再回去打。" : battleMode === "boss" && bossRegion ? `${bossRegion.name}守門戰。` : `今天從 ${activeUnit.id} 繼續。`}</h1>
                    <p>{repairActive ? `先看一次本輪弱點，再完成 ${repairPlan?.questionIds.length ?? 2} 題不同情境的變式。這是立即修復，因此會保留紀錄，但不會冒充無提示精通。` : battleMode === "boss" ? `這 10 題全部從已教範圍的未見語意指紋抽出；至少 ${BOSS_CORE_TARGET} 次新的正解證據才能擊破遊戲核心，但輸掉不會卡住正式課程。` : learningFrontier.waitingForGate ? `${activeUnit.id} 的課內練習已走完；完成並記錄完整模考後才會正式往下一單元。` : journeyPracticeActive && activeJourneyConfig ? `${activeJourneyConfig.label}旅程共 ${queue.length} 題：${activeJourneyConfig.reviewSlots} 題優先複習、${activeJourneyConfig.freshSlots} 題目前單元、${activeJourneyConfig.transferSlots} 題未見遷移。` : `每 6 題優先保留 3 題到期複習、2 題 ${activeUnit.id} 新內容、1 題未見遷移驗證。`} {!repairActive && "一次只做一題，答完再看解析。"}</p>
                  </div>
                  <div className="study-dock-actions">
                    <button className="primary-button study-start" onClick={() => { setUnitFilter("path"); startToday("path"); }}>{repairActive ? "離開修復 · 回今日" : battleMode === "boss" ? "離開 Boss · 回今日" : "開始今日練習"}</button>
                    <button className="study-vocab" onClick={() => startVocabReview()}>單字快刷</button>
                  </div>
                </div>
                <div className="study-status-row" aria-label="可操作的學習狀態">
                  <button onClick={() => navigate("wrong")}><span>目前弱點</span><strong>{wrongStates.length}</strong><small>題</small></button>
                  <button onClick={() => navigate("vocab")}><span>單字到期</span><strong>{dueVocabCount}</strong><small>組</small></button>
                  <button onClick={() => navigate("progress")}><span>今日完成</span><strong>{completedToday}</strong><small>題</small></button>
                </div>
                <button className="adventure-mini" onClick={() => navigate("progress")}>
                  <span className="adventure-mini-level">LV {adventureLevelValue}</span>
                  <span><strong>{currentRegion.name} · {activeCompanion.name}同行</strong><small>{adventureRank(adventureLevelValue)} · {adventureLevelXp}/{XP_PER_LEVEL} XP</small></span>
                  <span className="adventure-mini-boss">{unitsUntilBoss ? `距 Boss ${unitsUntilBoss} 課` : "Boss 節點"} →</span>
                </button>
                <div className="study-path-row">
                  <div><span>正式學習位置 · {activeUnit.id}</span><strong>{activeRecorded}/{activeQuestionCount} 題已走過</strong></div>
                  <div className="study-path-track" aria-hidden="true"><span style={{ width: `${pathCoverage}%` }} /></div>
                </div>
              </section>

              {practicePreviewOnly && currentQuestionUnit && (
                <section className="preview-practice-banner" aria-label="躍遷預覽保護">
                  <b>{customPracticeName ? "CUSTOM PRACTICE" : `PREVIEW ONLY · ${currentQuestionUnit.id}`}</b>
                  <div><strong>{customPracticeName || `${currentQuestionUnit.title} · ${practiceDifficulty === "steady" ? "穩健" : practiceDifficulty === "leap" ? "挑戰" : "標準"}`}</strong><span>{customPracticeName ? "這是你自選的練習題組。答案會留下練習事件，但不建立正式題目狀態、FSRS、能力證據、XP 或旅伴好感。" : `你正在正式位置 ${activeUnit.id} 之後試玩。答案會保存成探索事件，但不建立題目狀態、FSRS、能力證據、XP 或旅伴好感。`}</span></div>
                  <button onClick={() => { setUnitFilter("path"); startToday("path"); }}>回正式主線</button>
                </section>
              )}

              <div className="practice-toolbar">
                <div><p className="eyebrow">{customPracticeName ? "CUSTOM PRACTICE · NON-FORMAL" : repairActive ? "DEFEAT REPAIR" : battleMode === "boss" ? "REGION BOSS · UNSEEN CHECK" : dueSkillCount ? `${dueSkillCount} 個技能已到期` : dueQuestionCount ? `${dueQuestionCount} 題舊排程待複習` : "TODAY'S PRACTICE"}</p><strong>{customPracticeName || (repairActive ? `${repairPlan?.weakness ?? "弱點"} · ${repairPlan?.questionIds.length ?? 2} 題修復` : battleMode === "boss" ? `${bossRegion?.bossName ?? "Boss"} · 10 回合` : journeyPracticeActive && activeJourneyConfig ? `${activeJourneyConfig.label}旅程 · ${queue.length} 題` : "今日練習")}</strong><small>{customPracticeName ? `${queue.length} 題自選練習 · 不列入正式精通` : repairActive ? `短教學 + ${repairPlan?.questionIds.length ?? 2} 題變式 · 不列入嚴格精通` : battleMode === "boss" ? `只用未見題 · ${bossCoreHits}/${BOSS_CORE_TARGET} 核心命中 · 不阻塞正式進度` : journeyPracticeActive && activeJourneyConfig ? `${activeJourneyConfig.reviewSlots} 複習 + ${activeJourneyConfig.freshSlots} 目前單元 + ${activeJourneyConfig.transferSlots} 遷移` : "3 技能到期複習 + 2 目前單元新題 + 1 未見遷移 · 舊題只在未見候選不足時補位"}</small></div>
              </div>

              <details className="practice-options-panel">
                <summary><span>調整本輪練習</span><b>{unitFilter === "path" ? `自動安排 · ${activeUnit.id}` : `${unitFilter} 指定練習`}</b><small>{interfaceMode === "simple" ? "專注介面" : "完整介面"}</small></summary>
                <div>
                  <label className="unit-select">
                    <span>練習範圍｜可回頭複習或提前試玩</span>
                    <select value={unitFilter} disabled={battleMode === "boss" || repairActive} onChange={(event) => { const filter = event.target.value as UnitFilter; setUnitFilter(filter); startToday(filter); }}>
                      <option value="path">自動安排 · {pathLabel}</option>
                      {UNITS.map((unit) => <option key={unit.id} value={unit.id}>{unit.id} · {unit.title}</option>)}
                    </select>
                    <small>指定後段單元只算自由探索，不會改變正式進度；回到「自動安排」會接回 U02 與到期複習。</small>
                  </label>
                  <div className="display-mode-toggle" role="group" aria-label="介面資訊量">
                    <span>資訊量</span>
                    <button className={interfaceMode === "simple" ? "display-mode-active" : ""} onClick={() => chooseInterfaceMode("simple")} aria-pressed={interfaceMode === "simple"}>專注學習</button>
                    <button className={interfaceMode === "detailed" ? "display-mode-active" : ""} onClick={() => chooseInterfaceMode("detailed")} aria-pressed={interfaceMode === "detailed"}>完整冒險</button>
                  </div>
                </div>
              </details>

              <div className="expedition-route" aria-label={repairActive ? `敗北後 ${queue.length} 題變式修復` : battleMode === "boss" ? "Boss 十個未見題節點" : `今日遠征 ${queue.length} 個節點`}>
                <div className="expedition-route-copy"><span>{repairActive ? "REPAIR ROUTE" : battleMode === "boss" ? "BOSS CORE CHECK" : "DAILY EXPEDITION"}</span><small>{repairActive ? `${queue.length} 個不同情境 · 完成後再換題挑戰` : battleMode === "boss" ? `10 個未見節點 · 目標 ${BOSS_CORE_TARGET} 核心` : `${queue.length} 個節點 · 必須完整走完才結算`}</small></div>
                <div className="expedition-nodes">
                  {expeditionSlotLabels.map((label, index) => {
                    const completed = todayDone || index < position;
                    const active = !todayDone && index === position;
                    return <div className={`expedition-node ${completed ? "expedition-node-done" : ""} ${active ? "expedition-node-active" : ""}`} key={`${label}-${index}`}><b>{completed ? "✓" : index + 1}</b><span>{label}</span></div>;
                  })}
                </div>
              </div>

              {repairActive && repairPlan ? (
                <section className="repair-arena" aria-labelledby="repair-arena-title">
                  <div className="repair-arena-copy">
                    <span>DEFEAT REPAIR · 立即修復</span>
                    <h3 id="repair-arena-title">先拆開「{repairPlan.weakness}」，再做 {repairPlan.questionIds.length} 題變式</h3>
                    <p>{repairSourceQuestion?.hint ?? UNITS.find((unit) => unit.id === repairSourceQuestion?.unit)?.grammar ?? "先找主詞與時間線，再決定句子的主要動詞形式。"}</p>
                    <small>{repairSourceQuestion?.evidence ?? "這是敗北後立即教學，因此會保留成修復紀錄，但不算無提示精通證據。"}</small>
                  </div>
                  <div className="repair-arena-steps" aria-label="敗北修復流程">
                    <div className="repair-step-done"><b>1</b><span>弱點短教學<small>已展開</small></span></div>
                    {repairPlan.questionIds.map((questionId, index) => <div key={questionId} className={todayDone || position > index ? "repair-step-done" : position === index ? "repair-step-active" : ""}><b>{index + 2}</b><span>變式題 {index + 1}<small>{todayDone || position > index ? "已完成" : position === index ? "作答中" : "等待中"}</small></span></div>)}
                    <div><b>{repairPlan.questionIds.length + 2}</b><span>重新挑戰<small>完成後換題驗證</small></span></div>
                  </div>
                  <div className="repair-integrity-note">立即看過教學的 {repairPlan.questionIds.length} 題只記為「有支援修復」；即使答對，也不會被 FSRS／能力系統誤判成嚴格精通。</div>
                </section>
              ) : (
              <section className={`battle-arena battle-region-${currentEncounter.regionId} ${battleMode === "boss" ? "battle-mode-boss" : ""} ${battleVictory ? "battle-arena-victory" : ""} ${battleDefeat ? "battle-arena-defeat" : ""}`} aria-label={`與 ${currentEncounter.name} 的遠征遭遇`} style={{ "--battle-accent": currentEncounter.accent } as CSSProperties}>
                <div className="battle-scene" style={{ backgroundImage: `url('${currentEncounter.background}')` }}>
                  <div className="battle-scene-shade" />
                  <div key={`player-${battleImpact?.id ?? "idle"}`} className={`battle-fighter battle-player ${battleImpact ? "battle-player-action" : ""}`}>
                    <div className="battle-nameplate battle-player-nameplate"><small>ACTIVE PARTNER · {activeCompanion.englishName}</small><strong>{activeCompanion.name} · {activeCompanion.epithet}</strong><span>意志（容錯） {battleWillpower}/{MAX_WILLPOWER} · 連續答對 {battleCurrentChain} · 技能能量 {battleEnergy}/6</span></div>
                    {/* eslint-disable-next-line @next/next/no-img-element -- generated transparent game sprite */}
                    <img src={companionImageFor(activeCompanion.id)} alt={`${activeCompanion.name} 戰鬥立繪`} />
                  </div>

                  <div className="battle-center-hud">
                    <span>{battleMode === "boss" ? `BOSS CORES · ${bossCoreHits}/${BOSS_CORE_TARGET}` : `ENCOUNTER · ${battleHistory.length}/${Math.max(queue.length, 6)}`}</span>
                    <strong>{battleVictory ? "VICTORY" : battleDefeat ? "DEFEAT" : battleEnemySuppressed ? "SECURED" : !battleBoonId ? "CHOOSE" : battleMode === "boss" ? "CORE RAID" : battleHistory.length ? "BATTLE" : "READY"}</strong>
                    {!todayDone && <div className="battle-intent-chip" title={battleIntent.tell}><b>{battleIntent.mark}</b><span>{battleIntent.name} · MISS -{battleIntent.wrongDamage}</span></div>}
                    {!todayDone && battleEvent && <div className="battle-event-chip" title={battleEvent.tell}><b>{battleEvent.mark}</b><span>{battleEvent.name}</span></div>}
                    <div className="battle-turn-pips" aria-label={`本輪已完成 ${battleHistory.length} 次戰鬥行動`}>
                      {Array.from({ length: Math.max(queue.length, 6) }, (_, index) => {
                        const hit = battleHistory[index];
                        return <i key={index} className={hit ? (hit.correct ? "battle-pip-hit" : "battle-pip-scout") : ""}>{hit ? (hit.correct ? "◆" : "◇") : ""}</i>;
                      })}
                    </div>
                    {battleImpact && <div key={battleImpact.id} className={`battle-impact ${battleImpact.correct ? "battle-impact-hit" : "battle-impact-scout"}`}>{battleImpact.correct ? `${battleImpact.coreHit ? "CORE " : battleImpact.chain >= 2 ? "COMBO " : ""}-${battleImpact.damage}` : battleImpact.willpowerDamage ? `WILL -${battleImpact.willpowerDamage}` : `BLOCK ${battleImpact.blockedDamage ? `+${battleImpact.blockedDamage}` : ""}`}</div>}
                  </div>

                  <div key={`enemy-${battleImpact?.id ?? "idle"}`} className={`battle-fighter battle-enemy ${battleImpact ? "battle-enemy-reacting" : ""} ${battleVictory ? "battle-enemy-defeated" : ""}`}>
                    <div className="battle-nameplate battle-enemy-nameplate">
                      <small>{currentEncounter.title}</small><strong>{currentEncounter.name}</strong>
                      <div className="battle-hp-row"><div className="battle-hp-track"><span style={{ width: `${battleEnemyPercent}%` }} /></div><b>{battleMode === "boss" ? `${bossCoreHits}/${BOSS_CORE_TARGET} 核心` : battleEnemySuppressed ? `已壓制 · ${battleHistory.length}/6` : `${battleEnemyHp}/${battleEnemyMaxHp}`}</b></div>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element -- pre-optimized transparent game sprite */}
                    <img src={currentEncounter.image} alt={currentEncounter.name} />
                  </div>
                </div>

                <div className="battle-mobile-status" aria-label="戰鬥狀態">
                  <div className="battle-mobile-status-card battle-mobile-player-status">
                    <small>ACTIVE · {activeCompanion.englishName}</small>
                    <strong>{activeCompanion.name} · {activeCompanion.epithet}</strong>
                    <span>意志（可承受錯誤） {battleWillpower}/{MAX_WILLPOWER} · 連續答對 {battleCurrentChain} · 技能能量 {battleEnergy}/6</span>
                  </div>
                  <div className="battle-mobile-status-card battle-mobile-enemy-status">
                    <small>{currentEncounter.title}</small>
                    <strong>{currentEncounter.name}</strong>
                    <div className="battle-hp-row"><div className="battle-hp-track"><span style={{ width: `${battleEnemyPercent}%` }} /></div><b>{battleMode === "boss" ? `${bossCoreHits}/${BOSS_CORE_TARGET} 核心` : battleEnemySuppressed ? `已壓制 · ${battleHistory.length}/6` : `${battleEnemyHp}/${battleEnemyMaxHp}`}</b></div>
                  </div>
                </div>

                <details className="game-term-guide">
                  <summary>戰鬥詞語說明</summary>
                  <dl>
                    <div><dt>意志</dt><dd>這一場還能承受多少次答錯；歸零只影響戰鬥，不刪學習紀錄。</dd></div>
                    <div><dt>架勢</dt><dd>作答支援程度：無提示、排除一個選項或顯示學習提示。</dd></div>
                    <div><dt>共鳴</dt><dd>技能能量；只改戰鬥表現，不改英文正確答案。</dd></div>
                  </dl>
                </details>

                <div className="battle-command-bar">
                  <div className="battle-command-copy"><span>{battleVictory ? "ENCOUNTER CLEARED" : battleDefeat ? "PARTY DOWN" : `BATTLE LOG · ${activeCompanion.name}`}</span><strong>{battleVictory ? `${currentEncounter.name}已被突破。` : battleDefeat ? "這一戰敗北；學習證據已保留。" : battleMessage}</strong><small>敵方意圖：{battleIntent.tell} · 答錯會消耗「意志（可承受錯誤）」；不扣 XP，也不刪正式進度。</small>{battleEvent && !todayDone && <div className="battle-field-event"><b>{battleEvent.mark}</b><span><small>REGION EVENT · {bossRegion?.name ?? currentRegion.name}</small><strong>{battleEvent.name}</strong><em>{battleEvent.tell}</em></span></div>}{battleBoon && <div className="battle-boon-active"><b>{battleBoon.mark}</b><span><small>EXPEDITION BOON · 本輪加成</small><strong>{battleBoon.name}</strong><em>{battleBoon.detail}</em></span></div>}</div>
                  {!todayDone && !battleBoonId && (
                    <div className="battle-boon-picker" aria-label="選擇本場遠征祝福">
                      <div><span>CHOOSE ONE · 本場限定</span><strong>遠征祝福｜選一項本輪加成</strong><small>效果只改戰鬥，不會改變答案或英文能力判定。</small></div>
                      <div className="battle-boon-options">
                        {battleBoonOptions.map((boonId) => {
                          const boon = getExpeditionBoon(boonId)!;
                          return <button key={boon.id} onClick={() => chooseBattleBoon(boon.id)} disabled={gameLoading}><b>{boon.mark}</b><span><strong>{boon.name}</strong><small>{boon.style} · {boon.detail}</small></span></button>;
                        })}
                      </div>
                    </div>
                  )}
                  {battleBoonId && <>
                  <div className="battle-party-commands">
                    <div className="battle-party-row" aria-label="切換出戰旅伴">
                      {COMPANIONS.map((companion) => {
                        const active = companion.id === activeCompanion.id;
                        const affinity = Number(companionStates.find((state) => state.companion_id === companion.id)?.affinity ?? 0);
                        return (
                          <button key={companion.id} className={active ? "battle-party-active" : ""} onClick={() => void selectCompanion(companion.id)} disabled={Boolean(draft) || saving || companionSaving || active} aria-pressed={active} title={companion.combatPassive}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- existing optimized companion sprite */}
                            <img src={companionImageFor(companion.id)} alt="" />
                            <span>{companion.name}<small>好感 {affinity}</small></span>
                          </button>
                        );
                      })}
                    </div>
                    <button className={`battle-burst-button ${battleBurstArmed ? "battle-burst-armed" : ""}`} onClick={toggleBattleBurst} disabled={Boolean(draft) || saving || !battleBoonId || battleEnergy < battleBurstCostValue} aria-pressed={battleBurstArmed}><b>{battleEnergy}/6</b><span>{battleBurstArmed ? `${activeCompanion.burstName} · 待命` : `${activeCompanion.burstName} · ${battleBurstCostValue} 能量`}</span></button>
                  </div>
                  <div className="battle-stance-picker" aria-label="選擇戰鬥架勢與作答支援">
                    {BATTLE_STANCES.map((stance) => <button key={stance.id} className={`${battleStanceId === stance.id ? "battle-stance-active" : ""} ${battleIntent.counter === stance.id ? "battle-stance-counter" : ""}`} onClick={() => chooseBattleStance(stance.id)} disabled={Boolean(draft) || saving || !battleBoonId} aria-pressed={battleStanceId === stance.id} title={stance.short}><b>{stance.mark}</b><span>{stance.name}</span><small>{battleIntent.counter === stance.id ? `克制 +${battleIntent.counterBonus}` : `命中 ${stance.correctDamage} · 偵察 ${stance.scoutDamage}`}</small></button>)}
                  </div>
                  </>}
                </div>
                <div className="battle-item-belt" aria-label="戰鬥道具">
                  <div className="battle-item-belt-title"><span>QUICK ITEMS</span><strong>{gameProfile.coins} G</strong>{battleGuardActive && <b>守心符生效中</b>}</div>
                  <div className="battle-item-buttons">
                    {GAME_ITEMS.map((item) => {
                      const quantity = gameInventory.get(item.id) ?? 0;
                      const contextBlocked = item.id === "erase-rune" ? currentQuestion?.kind !== "choice"
                        : item.id === "guard-charm" ? battleGuardActive
                          : item.id === "trail-ration" ? battleWillpower >= MAX_WILLPOWER
                            : item.id === "echo-stone" ? !currentQuestionIsListening || listeningPlayCount < 1 || Boolean(practiceListeningQuestionId)
                              : item.id === "hint-lantern" ? battleItemHintVisible
                                : false;
                      return <button key={item.id} onClick={() => void activateBattleItem(item.id)} disabled={practicePreviewOnly || todayDone || !battleBoonId || Boolean(draft) || saving || gameBusy || quantity <= 0 || contextBlocked} title={practicePreviewOnly ? "躍遷試玩不消耗背包道具" : item.detail}><b>{item.mark}</b><span>{item.name}<small>×{quantity}</small></span></button>;
                    })}
                  </div>
                </div>
              </section>
              )}

              <div className="practice-card">
                <div className="practice-progress-row">
                  <span>{todayDone ? "本輪完成" : `QUESTION ${position + 1} / ${queue.length}`}</span>
                  <span>{currentQuestion ? (feedbackRevealed ? currentQuestion.skill : "先作答，再看考點") : "可以休息一下"}</span>
                </div>
                <div className="progress-track"><span style={{ width: `${todayDone ? 100 : (position / Math.max(queue.length, 1)) * 100}%` }} /></div>

                {loading ? (
                  <div className="empty-state"><div className="loader" />正在整理你的今日練習…</div>
                ) : todayDone && repairActive && repairPlan ? (
                  <div className="complete-state repair-complete-state">
                    <span className="complete-icon">✓</span>
                    <p className="eyebrow">REPAIR COMPLETE</p>
                    <h3>{repairPlan.questionIds.length} 題變式修復已完成</h3>
                    <p>這組答對 {repairPlan.correctCount}/{repairPlan.questionIds.length} 題。剛才的教學與作答都已保留，但因為是立即修復，不會算成無提示精通；回到敵人後會換一組題目重新驗證。</p>
                    <div className="repair-score-row"><span>弱點</span><strong>{repairPlan.weakness}</strong><b>{repairPlan.correctCount}/{repairPlan.questionIds.length}</b></div>
                    <div className="complete-actions">
                      {journeySession?.currentStep === "settlement" ? (
                        <button className="primary-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>前往旅程統一結算</button>
                      ) : (
                        <>
                          <button className="primary-button" onClick={retryAfterRepair}>重新挑戰敵人</button>
                          {repairPlan.correctCount < repairPlan.questionIds.length && <button className="secondary-button" onClick={restartRepairRound}>再做一組修復題</button>}
                          <button className="secondary-button" onClick={() => navigate("progress")}>回營地整備</button>
                        </>
                      )}
                    </div>
                  </div>
                ) : todayDone ? (
                  <div className={`complete-state ${battleDefeat ? "complete-state-defeat" : ""}`}>
                    <span className="complete-icon">{battleVictory ? "◆" : "×"}</span>
                    <p className="eyebrow">{battleVictory ? "ENCOUNTER CLEARED" : "BATTLE LOST"}</p>
                    <h3>{battleVictory ? `${currentEncounter.name}突破成功` : `${currentEncounter.name}沒有被擊破`}</h3>
                    <p>{battleMode === "boss"
                      ? battleVictory
                        ? `10 個未見節點完成，${bossCoreHits} 個核心由新的正解證據擊破。`
                        : `這場 Boss 戰敗北；已完成的每一題仍保留成學習證據，不扣 XP、不刪弱點修正進度。`
                      : battleVictory
                        ? `${battleHistory.length} 次交鋒中有 ${battleCorrectCount} 次正解命中，剩餘意志 ${battleWillpower}/${MAX_WILLPOWER}。`
                        : `你在 ${battleHistory.length}/${queue.length} 回合後敗北，敵人還剩 ${battleEnemyHp} HP；英文作答、錯因與 FSRS 紀錄全部保留。`} {roundXpGain > 0 ? `本輪學習增加 ${roundXpGain} XP。` : "遊戲輸贏不會倒扣學習 XP。"}</p>
                    {journeySession?.currentStep !== "scenario" && <div className={`battle-result-companion ${battleDefeat ? "battle-result-campfire" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- existing companion sprite */}
                      <img src={companionImageFor(activeCompanion.id)} alt="" />
                      <div><span>{battleDefeat ? "CAMPFIRE REPORT" : "AFTER BATTLE"} · {activeCompanion.name}</span><strong>{battleResultLine}</strong>{battleDefeat && <small>{battlePrimaryWeakness ? `本輪優先弱點：${battlePrimaryWeakness}` : "本輪沒有足夠資料判定單一弱點；重新挑戰會換題，不讓你背答案。"}</small>}</div>
                    </div>}
                    {journeySession?.currentStep !== "scenario" && battleGrade && <div className={`battle-result-grade battle-result-${battleGrade.toLocaleLowerCase()}`}><b>{battleGrade}</b><span>{battleGrade === "S" ? "精通勝利" : battleGrade === "A" ? "漂亮通關" : battleVictory ? "通關" : "敗北"}</span></div>}
                    {journeySession?.currentStep !== "scenario" && battleVictory && battleReward && (
                      <div className="battle-reward-row">
                        <span>戰利品</span>
                        <b>+{battleReward.gold} G</b>
                        {battleReward.itemId && <b>+1 {getGameItem(battleReward.itemId)?.name ?? "道具"}</b>}
                        {battleReward.newUnlocks.map((unlockId) => <b className="battle-new-unlock" key={unlockId}>NEW · {gameUnlockLabel(unlockId)}</b>)}
                      </div>
                    )}
                    {journeySession?.currentStep !== "scenario" && newlyUnlockedMemory && <button className="memory-reward-button" onClick={() => setOpenMemoryId(newlyUnlockedMemory.id)}>查看新解鎖 CG《{newlyUnlockedMemory.title}》</button>}
                    {gameError && <p className="game-inline-error">{gameError}</p>}
                    <div className="complete-actions">
                      {journeySession?.currentStep === "scenario" && battleMode === "expedition" ? (
                        <button className="primary-button" onClick={() => void continueJourney()}>繼續旅程 · 情境行動</button>
                      ) : (
                        <>
                          {battleDefeat && battleHistory.some((hit) => !hit.correct) && <button className="primary-button" onClick={beginDefeatRepair}>先修復弱點 · 2 題</button>}
                          <button className={battleDefeat ? "secondary-button" : "primary-button"} onClick={() => battleMode === "boss" && bossRegion ? startBossBattle(bossRegion.id) : startToday(unitFilter)}>{battleDefeat ? "直接重新挑戰" : battleMode === "boss" ? "換一組未見題再挑戰" : "再做一輪"}</button>
                          <button className="secondary-button" onClick={() => navigate("progress")}>{battleDefeat ? "回營地整備" : "查看戰利品"}</button>
                        </>
                      )}
                    </div>
                  </div>
                ) : currentQuestion ? (
                  <div className="active-question">
                    {!battleBoonId && <div className="question-battle-lock"><b>先選遠征祝福</b><span>回到上方戰鬥區選一份本場能力，才會開放作答。</span></div>}
                    {repairActive ? (
                      <div className="question-repair-label"><b>變式修復 {position + 1}/{queue.length}</b><span>先自己作答；這題會記為立即教學後的修復，不列入嚴格精通。</span></div>
                    ) : (
                    <div className="question-learning-controls" aria-label="選擇作答支援">
                      <div><span>作答支援｜會影響證據等級</span><strong>{activeCompanion.name} 同行 · {getBattleStance(battleStanceId).evidenceLabel}</strong></div>
                      <div role="group" aria-label="作答支援程度">
                        {BATTLE_STANCES.map((stance) => (
                          <button key={stance.id} className={battleStanceId === stance.id ? "question-stance-active" : ""} onClick={() => chooseBattleStance(stance.id)} disabled={Boolean(draft) || saving || !battleBoonId} aria-pressed={battleStanceId === stance.id} title={stance.short}>
                            <b>{stance.name}</b><small>{stance.id === "blade" ? "無提示" : stance.id === "ward" ? "1 個提示" : "學習提示"}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                    )}
                    {!draft && battleStanceId === "ward" && (
                      <div className="question-assist-hint question-assist-ward">
                        <span>守勢提示</span>
                        <p>{currentQuestion.kind === "choice"
                          ? "已替你排除一個明顯錯誤選項；這次會記為有提示練習。"
                          : `第一個字：${acceptedOutputAnswers[0]?.trim().split(/\s+/)[0] ?? "先寫主詞"}`}</p>
                      </div>
                    )}
                    {!draft && battleStanceId === "lantern" && (
                      <div className="question-assist-hint question-assist-lantern">
                        <span>燈火學習提示</span>
                        <p>{currentQuestion.hint ?? currentQuestion.breakdown ?? currentQuestionUnit?.grammar ?? "先找主詞、時間線，再決定主要動詞形式。"}</p>
                      </div>
                    )}
                    {!draft && battleItemHintVisible && (
                      <div className="question-assist-hint question-assist-item">
                        <span>道具 · 提示燈</span>
                        <p>{currentQuestion.hint ?? currentQuestion.breakdown ?? currentQuestionUnit?.grammar ?? "先找主詞、時間線，再決定主要動詞形式。"}</p>
                      </div>
                    )}
                    {!draft && battleEliminatedOptionId && <div className="question-item-note">消去符已排除 1 個錯誤選項 · 本題不列入無提示精通證據</div>}
                    <div className="question-meta"><span className="unit-chip">{currentQuestion.unit}</span>{currentQuestion.variant && <span className="unseen-chip">UNSEEN</span>}{feedbackRevealed && <><span className="skill-chip">{currentQuestion.skill}</span><span>{currentQuestion.sourceLabel}</span></>}</div>
                    {currentQuestion.passage && <div className="question-passage"><span>READ FIRST</span><p>{currentQuestion.passage}</p></div>}
                    {currentQuestionIsListening && (
                      <>
                      <div className="listening-mode-picker" role="group" aria-label="聽力模式">
                        {([['learning', '學習', '看得到選項'], ['toeic', '多益', '選項只播音'], ['hard', '困難', '全程只播一次']] as const).map(([mode, label, detail]) => (
                          <button key={mode} className={listeningMode === mode ? "listening-mode-active" : ""} onClick={() => chooseListeningMode(mode)} disabled={!battleBoonId || Boolean(draft) || listeningPlayCount > 0} aria-pressed={listeningMode === mode}><strong>{label}</strong><small>{detail}</small></button>
                        ))}
                      </div>
                      <div className="question-listening-box">
                        <div><span>LISTEN FIRST</span><strong>{listeningPlayCount === 0 ? "先聽一次，再作答" : !draft ? "首聽完成 · 先鎖定首答" : !feedbackRevealed ? `首答已鎖定 · 已播放 ${listeningPlayCount} 次` : `解析階段 · 已播放 ${listeningPlayCount} 次`}</strong><small>{listeningMode === "learning" ? "選項文字可見；這輪是學習紀錄，不當成嚴格首聽證據。" : listeningMode === "toeic" ? "題目與選項文字先隱藏；首答鎖定後可做一次修復重聽。" : "題目與選項文字先隱藏，而且只完整播放一次。"}</small></div>
                        <button
                          type="button"
                          onClick={() => playCurrentQuestionListening()}
                          disabled={!battleBoonId || (practiceListeningQuestionId !== currentQuestion.id && (listeningMode === "hard" ? listeningPlayCount >= 1 : ((!draft && listeningPlayCount >= 1) || (Boolean(draft) && !feedbackRevealed && listeningPlayCount >= 2))))}
                        >{practiceListeningQuestionId === currentQuestion.id ? "■ 停止" : listeningPlayCount === 0 ? "▶ 播放首聽" : !draft ? "首聽完成" : !feedbackRevealed && listeningPlayCount < 2 ? "↻ 播放二聽" : !feedbackRevealed ? "二聽完成" : "↻ 解析後重聽"}</button>
                      </div>
                      </>
                    )}
                    <div className={`practice-prompt-row ${hideListeningText ? "practice-prompt-audio-only" : ""}`}>
                      <h3 className="practice-prompt">{hideListeningText ? "題目已包含在首聽音檔中" : currentQuestion.prompt}</h3>
                      {!hideListeningText && hasEnglishSpeech(currentQuestion.prompt) && <button className="sentence-audio-button sentence-audio-standalone" onClick={() => speakEnglish(currentQuestion.prompt)} aria-label="播放題目英文">▶<span>題目</span></button>}
                    </div>
                    {currentQuestion.outputPrompt && <p className="output-prompt output-prompt-large">{currentQuestion.outputPrompt}</p>}

                    {currentQuestion.kind === "choice" ? (
                      <div className="choice-grid">
                        {playableOptions.map((option) => {
                          const optionIndex = currentOptions.findIndex((candidate) => candidate.id === option.id);
                          const isChosen = selected === option.id;
                          const isCorrect = Boolean(draft) && feedbackRevealed && option.id === currentQuestion.answerId;
                          return (
                            <div className="choice-row" key={option.id}>
                              <button className={`choice-button ${isChosen ? "choice-selected" : ""} ${isCorrect ? "choice-correct" : ""} ${draft && feedbackRevealed && isChosen && draft.correct === false ? "choice-wrong" : ""}`} onClick={() => selectChoice(option.id)} disabled={!battleBoonId || Boolean(draft) || (currentQuestionIsListening && listeningPlayCount === 0)}>
                                <span className="choice-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{hideListeningText ? "只聽音檔作答" : option.label}</span>
                              </button>
                              {!hideListeningText && hasEnglishSpeech(option.label) && <button className="choice-audio-button" onClick={() => speakEnglish(option.label)} aria-label={`播放選項 ${String.fromCharCode(65 + optionIndex)}`}>▶</button>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="output-area">
                        <textarea value={output} onChange={(event) => setOutput(event.target.value)} placeholder="先自己寫英文，不看答案…" disabled={!battleBoonId || Boolean(draft)} rows={3} />
                        {draft && (
                          <div className="self-check">
                            <p>可接受答案：</p>
                            <ul className="accepted-answer-list">{acceptedOutputAnswers.map((answer) => <li key={answer}>{answer}</li>)}</ul>
                            {draft.outputAssessment === "accepted" ? (
                              <div className="output-auto-verdict"><strong>正確而自然</strong><span>你的首答符合可接受答案，可依目前作答架勢判斷是否形成嚴格能力證據。</span></div>
                            ) : (
                              <>
                                <p className="self-check-note">如果你的寫法不在上面，請比較意思與結構後選一級；自評「自然」仍只算練習，不會直接灌成嚴格未見證據。</p>
                                <div className="self-check-buttons self-check-buttons-three">
                                  <button className={draft.outputAssessment === "natural" ? "self-selected" : ""} onClick={() => markOutput("natural")}>正確而自然</button>
                                  <button className={draft.outputAssessment === "understandable" ? "self-selected" : ""} onClick={() => markOutput("understandable")}>可理解，可更自然</button>
                                  <button className={draft.outputAssessment === "needs-fix" ? "self-selected" : ""} onClick={() => markOutput("needs-fix")}>需要修正</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {!draft && ((currentQuestion.kind === "choice" && selected) || (currentQuestion.kind === "output" && output.trim())) && (
                      <div className="confidence-block confidence-before-feedback">
                        <div><p>在看答案以前，你有多確定？</p><span>這個信心會和首答一起鎖定，解析不會回頭污染它</span></div>
                        <div className="confidence-row">{([[1, "低"], [2, "普通"], [3, "高"]] as const).map(([value, label]) => <button key={value} className={confidence === value ? "confidence-selected" : ""} onClick={() => setConfidence(value)} aria-pressed={confidence === value}>{label}</button>)}</div>
                        <button className="primary-button lock-answer-button" onClick={lockAnswer} disabled={!battleBoonId || !confidence || (currentQuestionIsListening && listeningPlayCount === 0)}>鎖定答案與信心</button>
                        {savedMessage && <p className="saved-message">{savedMessage}</p>}
                      </div>
                    )}

                    {draft && currentQuestionIsListening && !feedbackRevealed && (
                      <div className="listening-review-gate" aria-live="polite">
                        <div><span>FIRST ANSWER LOCKED</span><strong>首答與信心已保存</strong><p>{listeningMode === "hard" ? "困難模式不開放二聽；現在直接進解析，首答不會被覆寫。" : "可以再聽一次修復理解，也可以直接看解析；不論哪一個，都不會改掉第一次答案。"}</p></div>
                        <div>{listeningMode !== "hard" && <button className="secondary-button" onClick={() => playCurrentQuestionListening()} disabled={listeningPlayCount >= 2 || practiceListeningQuestionId === currentQuestion.id}>{listeningPlayCount >= 2 ? "二聽完成" : "↻ 二聽一次"}</button>}<button className="primary-button" onClick={revealListeningFeedback} disabled={practiceListeningQuestionId === currentQuestion.id}>看答案與解析</button></div>
                      </div>
                    )}

                    {draft && feedbackRevealed && draft.correct !== null && (
                      <section className={`feedback-card ${draft.correct && !outputNeedsPolish ? "feedback-good" : "feedback-review"}`} aria-live="polite">
                        <div className="feedback-title-row">
                          <span className="feedback-symbol">{draft.correct && !outputNeedsPolish ? "✓" : "!"}</span>
                          <div><small>{feedbackLabel}</small><strong>{feedbackHeadline}</strong></div>
                        </div>
                        {currentQuestion.kind === "choice" && (
                          <div className="answer-compare">
                            <div><span>正確答案</span><strong>{correctOptionLabel}</strong></div>
                            {!draft.correct && <div><span>你的答案</span><strong>{selectedOptionLabel}</strong></div>}
                          </div>
                        )}
                        <div className="explanation-copy"><span>解題理由</span><p>{currentQuestion.explanation}</p></div>
                        <div className="evidence-box"><span>證據／規則</span><p>{currentQuestion.evidence}</p></div>
                        {currentQuestionIsListening && (currentQuestion.listeningText ?? currentQuestionUnit?.listening) && (
                          <details className="listening-analysis">
                            <summary>解析模式 · 逐字稿與錯聽檢查</summary>
                            <p>{currentQuestion.listeningText ?? currentQuestionUnit?.listening}</p>
                            <small>先用上面的證據句定位漏聽資訊，再回頭重聽完整內容；首答與首聽紀錄不會被改寫。</small>
                          </details>
                        )}
                        {currentQuestion.breakdown && <div className="sentence-breakdown"><span>句子拆解</span><p>{currentQuestion.breakdown}</p></div>}
                        {!draft.correct && currentQuestion.options && (
                          <details className="option-analysis" open>
                            <summary>為什麼其他選項不對</summary>
                            <div>{currentQuestion.options.map((option) => <div className={option.id === currentQuestion.answerId ? "option-analysis-correct" : ""} key={option.id}><b>{option.id === currentQuestion.answerId ? "✓" : "×"}</b><p><strong>{option.label}</strong><br />{optionReason(currentQuestion, option.id, option.label, option.id === currentQuestion.answerId)}</p></div>)}</div>
                          </details>
                        )}
                        <StudyItemActions itemType="question" itemId={currentQuestion.id} unit={currentQuestion.unit} title={currentQuestion.prompt} excerpt={currentQuestion.explanation} />
                      </section>
                    )}

                    {draft && feedbackRevealed && draft.correct !== null && (
                      <div className="confidence-block answer-commit-block">
                        <div><p>首答信心：{confidence === 1 ? "低" : confidence === 2 ? "普通" : "高"}</p><span>{strictEvidenceEligible ? "無提示且符合嚴格條件；若語意未見，可形成新的能力證據。" : "這次保留練習與錯因紀錄，但不當成嚴格未見能力證據。"}</span></div>
                        <button className="primary-button save-button" onClick={saveAnswer} disabled={saving}>{saving ? "記錄戰果中…" : "記錄並出招"}</button>
                        {savedMessage && <p className="saved-message">{savedMessage}</p>}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}

          {view === "wrong" && (
            <>
              <div className="section-heading"><div><p className="eyebrow">REVIEW QUEUE</p><h2>錯題與低信心</h2><p>只保留目前還需要處理的弱點；修正後不會永遠掛在錯題牆上。</p></div><span className="count-badge">{wrongStates.length} 題</span></div>
              {wrongStates.length === 0 ? (
                <div className="empty-panel"><span className="empty-emoji">✓</span><h3>目前沒有待處理弱點</h3><p>答錯或低信心的題目會自動出現在這裡。</p></div>
              ) : (
                <div className="review-list">{wrongStates.map((state) => { const question = getPlayableQuestion(state.question_id); return question ? renderReviewCard(question, state) : null; })}</div>
              )}
            </>
          )}

          {view === "vocab" && (
            <>
              <div className="section-heading vocab-heading">
                <div><p className="eyebrow">LEARNING TOOLKIT</p><h2>學習工具與單字</h2><p>搜尋、筆記、收藏、自訂題庫、文法、報告與備份集中在這裡；下方保留完整單字中心。</p></div>
                <span className="scope-badge">同步到帳號</span>
              </div>
              {vocabError && <div className="error-banner">{vocabError} 單字內容仍可查看，但雲端熟悉度暫時無法更新。</div>}

              <LearningToolkit
                activeUnit={activeUnit.id}
                speechAccent={speechAccent}
                speechRate={speechRate}
                reportPeriod={reportPeriod}
                onSpeechPreferencesChange={chooseSpeechPreferences}
                onStartPractice={startCustomPractice}
                onOpenUnit={(unit) => { setView("course"); openCourseUnit(unit); }}
                onSpeak={speakEnglish}
              />

              <div className="vocab-toolkit-divider"><span>VOCABULARY LAB</span><strong>單字中心</strong><p>{VOCABULARY.length} 組課內重點 · 先在句子與搭配裡認得，再用間隔複習留下來。</p></div>

              <div className="vocab-summary-grid">
                <div><span>今天到期</span><strong>{dueVocabCount}</strong><small>優先複習</small></div>
                <div><span>我的單字本</span><strong>{vocabularyStates.length}</strong><small>已留下紀錄</small></div>
                <div><span>穩定記得</span><strong>{stableVocabCount}</strong><small>間隔複習穩定度</small></div>
              </div>

              <section className="vocab-session-card">
                <div className="vocab-session-head">
                  <div><span className="eyebrow">SMART REVIEW</span><h3>單字快刷</h3><p>英文先出現；真的回想過，再看中文與例句。</p></div>
                  {!currentVocab && !vocabRoundDone && <button className="primary-button" onClick={() => startVocabReview()} disabled={vocabLoading}>開始 {dueVocabCount ? "到期複習" : `${activeUnit.id} 新單字`}</button>}
                </div>

                {vocabLoading ? (
                  <div className="vocab-session-empty"><div className="loader" />正在整理單字複習…</div>
                ) : vocabRoundDone ? (
                  <div className="vocab-session-empty">
                    <span className="complete-icon">✓</span>
                    <h3>這輪單字完成了</h3>
                    <p>每個詞都已依你剛才的回想難度安排下次出現時間。</p>
                    <button className="primary-button" onClick={() => startVocabReview()}>再來一輪</button>
                  </div>
                ) : currentVocab ? (
                  <div className="vocab-flashcard">
                    <div className="vocab-flashcard-meta"><span>{currentVocab.unit} · {currentVocab.unitTitle}</span><span>{vocabPosition + 1} / {vocabQueue.length}</span></div>
                    <div className="vocab-term-row">
                      <h3>{currentVocab.item}</h3>
                      <button className="audio-button" onClick={() => speakEnglish(currentVocab.item)} aria-label={`播放 ${currentVocab.item} 發音`}>▶</button>
                    </div>
                    {!vocabRevealed ? (
                      <div className="vocab-recall-prompt">
                        <p>先想一下：這個詞在句子裡是什麼意思？會怎麼搭配？</p>
                        <button className="reveal-button" onClick={() => setVocabRevealed(true)}>顯示意思與例句</button>
                      </div>
                    ) : (
                      <div className="vocab-reveal">
                        {renderVocabularyDetails(currentVocab, true)}
                        <div className="rating-help"><span>答不出來 → 忘了</span><span>答得出但很卡 → 很吃力</span></div>
                        <div className="fsrs-rating-grid" role="group" aria-label="單字熟悉度">
                          <button onClick={() => void rateVocabulary(1)} disabled={vocabSaving}><b>忘了</b><small>很快再出現</small></button>
                          <button onClick={() => void rateVocabulary(2)} disabled={vocabSaving}><b>很吃力</b><small>縮短間隔</small></button>
                          <button onClick={() => void rateVocabulary(3)} disabled={vocabSaving}><b>記得</b><small>正常延長</small></button>
                          <button onClick={() => void rateVocabulary(4)} disabled={vocabSaving}><b>很熟</b><small>更晚再複習</small></button>
                        </div>
                      </div>
                    )}
                    {vocabMessage && <p className="vocab-message" aria-live="polite">{vocabMessage}</p>}
                  </div>
                ) : (
                  <div className="vocab-session-empty"><p>先從今天到期的內容開始；沒有到期項目時，會帶你進入 {activeUnit.id} 的新單字。</p></div>
                )}
              </section>

              <section className="vocab-library">
                <div className="vocab-library-title"><div><span className="eyebrow">WORD LIBRARY</span><h3>課內單字與搭配</h3></div><small>{visibleVocabulary.length} 組符合目前篩選</small></div>
                <div className="vocab-toolbar">
                  <label className="vocab-search"><span>搜尋</span><input value={vocabSearch} onChange={(event) => { setVocabSearch(event.target.value); setVocabLimit(24); }} placeholder="搜尋單字、片語、中文、例句或 U 編號" /></label>
                  <label className="vocab-unit-filter"><span>單元</span><select value={vocabUnit} onChange={(event) => { setVocabUnit(event.target.value as "all" | UnitId); setVocabLimit(24); }}><option value="all">全部 U01–U40</option>{UNITS.map((unit) => <option value={unit.id} key={unit.id}>{unit.id} · {unit.title}</option>)}</select></label>
                </div>
                <div className="vocab-scope-tabs" role="group" aria-label="單字篩選">
                  {([['focus', `今日重點 · ${activeUnit.id} A級＋到期`], ['all', '全部'], ['saved', '我的單字本'], ['due', '到期複習']] as const).map(([scope, label]) => <button key={scope} className={vocabScope === scope ? "vocab-scope-active" : ""} onClick={() => { setVocabScope(scope); setVocabLimit(24); }}>{label}{scope === "due" && dueVocabCount > 0 ? ` ${dueVocabCount}` : ""}</button>)}
                </div>
                <div className="vocab-tier-tabs" role="group" aria-label="單字來源與優先級">
                  {([['all', '全部來源'], ['A', '核心 A'], ['B', '支援 B'], ['C', '增量 C'], ['bbc', 'BBC 延伸']] as const).map(([tier, label]) => <button key={tier} className={vocabTier === tier ? "vocab-tier-active" : ""} onClick={() => { setVocabTier(tier); setVocabLimit(24); }}>{label}</button>)}
                </div>

                {visibleVocabulary.length ? (
                  <>
                    <div className="vocab-card-grid">
                    {displayedVocabulary.map((entry) => {
                      const state = vocabStateById.get(entry.id);
                      return (
                        <article className="vocab-card" key={entry.id}>
                          <div className="vocab-card-top"><div className="vocab-card-origin"><span className="unit-chip">{entry.unit}</span><span className={`source-pill source-${entry.source}`}>{entry.source === "bbc" ? "BBC" : `課程 ${entry.level}`}</span></div>{state ? <span className={`mastery-pill mastery-${state.mastery.level}`}>{state.mastery.label}</span> : <span className="mastery-pill">未加入</span>}</div>
                          <div className="vocab-card-term"><h4>{entry.item}</h4><button className="audio-button audio-button-small" onClick={() => speakEnglish(entry.item)} aria-label={`播放 ${entry.item} 發音`}>▶</button></div>
                          <details className="vocab-definition"><summary>查看意思、例句與搭配</summary>{renderVocabularyDetails(entry)}</details>
                          {state && <p className="vocab-next-review">{state.due ? "現在已到期" : `下次 ${formatReviewTime(state.next_review_at)}`} · 已複習 {state.review_count} 次</p>}
                          <div className="vocab-card-actions">
                            {state ? <button onClick={() => { setVocabQueue([entry.id]); resetVocabRound(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>現在複習</button> : <button onClick={() => void addVocabulary(entry)} disabled={vocabSaving}>＋ 加入單字本</button>}
                            <button onClick={() => { setView("course"); openCourseUnit(entry.unit); }}>回到 {entry.unit}</button>
                          </div>
                          {state && (
                            <details className="vocab-note">
                              <summary>我的筆記</summary>
                              <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void saveVocabularyNote(entry, String(form.get("note") ?? "")); }}>
                                <textarea name="note" defaultValue={state.note} placeholder="例如：我常把 work at / work for 搞混…" rows={2} maxLength={1200} />
                                <button type="submit" disabled={vocabSaving}>儲存筆記</button>
                              </form>
                            </details>
                          )}
                        </article>
                      );
                    })}
                    </div>
                    {displayedVocabulary.length < visibleVocabulary.length && <button className="vocab-load-more" onClick={() => setVocabLimit((old) => old + 24)}>再顯示 24 組 <span>目前 {displayedVocabulary.length} / {visibleVocabulary.length}</span></button>}
                  </>
                ) : (
                  <div className="empty-panel compact-empty"><h3>目前沒有符合的單字</h3><p>換一個篩選範圍或搜尋內容即可。</p></div>
                )}
                {vocabMessage && !currentVocab && <p className="vocab-global-message" aria-live="polite">{vocabMessage}</p>}
              </section>
            </>
          )}

          {view === "progress" && (
            <>
              <div className="section-heading adventure-heading"><div><p className="eyebrow">ENGLISH ADVENTURE</p><h2>情境冒險與旅伴</h2><p>英文會決定你在場景裡採取的行動；戰鬥、FSRS、正式進度與能力驗證仍然各自獨立。</p></div><span className="adventure-level-badge">LV {adventureLevelValue}</span></div>

              <section className="adventure-hero" aria-label="冒險等級">
                <div className="adventure-level-orb"><span>LEVEL</span><strong>{adventureLevelValue}</strong></div>
                <div className="adventure-hero-copy">
                  <span className="eyebrow">{adventureRank(adventureLevelValue)}</span>
                  <h3>{currentRegion.name} · {activeUnit.id}</h3>
                  <p>{currentRegion.subtitle}。目前由 {activeCompanion.name} 同行；答錯會讓這一戰失去意志，但不倒扣學習 XP，同一語意只換人名／表面字樣也不會重複增加冒險等級或旅伴好感。</p>
                  <div className="adventure-xp-line"><span>{adventureLevelXp} / {XP_PER_LEVEL} XP</span><span>總計 {adventureXp} XP</span></div>
                  <div className="adventure-xp-track"><span style={{ width: `${adventureLevelPercent}%` }} /></div>
                  <button className="adventure-enter-battle" onClick={() => { setUnitFilter("path"); startToday("path"); setView("today"); requestAnimationFrame(() => document.querySelector(".battle-arena")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>進入今日戰鬥 · {currentEncounter.name} →</button>
                </div>
                <div className="adventure-boss-card">
                  <span>NEXT GUARDIAN</span><strong>{currentRegion.bossName}</strong><small>{unitsUntilBoss ? `距 U${String(currentRegion.end).padStart(2, "0")} 還有 ${unitsUntilBoss} 課` : `已抵達 U${String(currentRegion.end).padStart(2, "0")} 守門節點`}</small>
                  <div className="boss-progress"><span style={{ width: `${currentRegionProgress}%` }} /></div>
                  <button onClick={() => isRegionBossUnlocked(currentRegion) ? startBossBattle(currentRegion.id) : navigate("today")}>{isRegionBossUnlocked(currentRegion) ? (clearedBossIds.has(currentRegion.id) ? "再挑戰 10 題 Boss" : "挑戰 10 題 Boss") : "繼續遠征"}</button>
                </div>
              </section>

              <nav className="adventure-tabs" aria-label="冒險頁分類">
                {([
                  ["mission", "情境任務", `v33 · U01 起始案件行動`],
                  ["camp", "營地整備", `${dailyGameQuests.filter((quest) => !quest.claimed && quest.progress >= quest.target).length} 可領`],
                  ["party", "旅伴", `${activeCompanion.name} · 好感 ${activeCompanionAffinity}`],
                  ["world", "世界地圖", `${currentRegion.name} · ${activeUnit.id}`],
                  ["learning", "學習資料", `${wrongStates.length} 個弱點`],
                ] as const).map(([id, label, detail]) => (
                  <button key={id} className={adventureTab === id ? "adventure-tab-active" : ""} onClick={() => setAdventureTab(id)} aria-pressed={adventureTab === id} aria-label={`${label}：${detail}`}>
                    <strong>{label}</strong><small>{detail}</small>
                  </button>
                ))}
              </nav>

              <div id="journey-scenario-anchor" className={adventureTab !== "mission" ? "adventure-panel-hidden" : ""}>
                <FirstActStoryPanel
                  payload={storyProgress}
                  selectedUnit={storyUnit}
                  formalUnit={activeUnit.id}
                  route={storyRoute}
                  difficulty={contentDifficulty}
                  loading={storyLoading}
                  busy={storyBusy}
                  error={storyError}
                  onSelectUnit={selectStoryChapter}
                  onRouteChange={selectStoryRoute}
                  onDifficultyChange={selectStoryDifficulty}
                  onChoose={chooseStory}
                  onStart={startStoryPractice}
                  onStartCase={startStoryCase}
                  onOpenCourse={(unit) => { setSelectedUnitId(unit); setView("course"); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" })); }}
                />
                <ScenarioMissionClient
                  selectedCompanionId={activeCompanion.id}
                  formalUnit={activeUnit.id}
                  requestedUnit={scenarioFocusRequest.unit}
                  requestToken={scenarioFocusRequest.token}
                  companionImages={{
                    rinka: companionImageFor("rinka"),
                    sena: companionImageFor("sena"),
                    yori: companionImageFor("yori"),
                  }}
                  journeyMode={journeySession?.currentStep === "scenario"}
                  journeyTarget={journeySession?.journeyLengthInfo?.scenarioTarget ?? 1}
                  journeyCompleted={Number(journeySession?.summary?.scenarioActions ?? 0)}
                  speechAccent={speechAccent}
                  speechRate={speechRate}
                  onJourneyNodeCompleted={finishJourneyScenarioNode}
                  onSynchronized={() => { void Promise.all([loadProgress(true), loadCompanions(true), loadGame(true), loadStory(true)]); }}
                />
              </div>

              <section className={`companion-hub ${adventureTab !== "party" ? "adventure-panel-hidden" : ""}`} aria-labelledby="companion-hub-title">
                <div className="companion-hub-head">
                  <div><span>PARTY · BOND</span><h3 id="companion-hub-title">旅伴</h3><p>戰鬥中每回合都能換前鋒，也可以在這裡聊天。第一次聊到的新選項與真正新的題目語意證據會增加好感。</p></div>
                  <b>{activeCompanion.name} · 出戰中</b>
                </div>
                {companionError && <p className="companion-error" aria-live="polite">{companionError}</p>}
                <div className="companion-roster">
                  {COMPANIONS.map((companion) => {
                    const state = companionStates.find((item) => item.companion_id === companion.id);
                    const affinity = Number(state?.affinity ?? 0);
                    const tier = companionAffinityTier(affinity);
                    const active = activeCompanion.id === companion.id;
                    const focused = focusedCompanion.id === companion.id;
                    return (
                      <article className={`companion-card companion-card-${companion.id} ${active ? "companion-card-active" : ""} ${focused ? "companion-card-focused" : ""}`} key={companion.id}>
                        <button className="companion-portrait-button" onClick={() => focusCompanion(companion.id)} aria-label={`和 ${companion.name} 對話`}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- generated transparent character art */}
                          <img src={companionImageFor(companion.id)} alt="" />
                          <span>{active ? "ACTIVE" : tier.label}</span>
                        </button>
                        <div className="companion-card-copy">
                          <span>{companion.epithet}</span><strong>{companion.name}<small>{companion.englishName}</small></strong><p>{companion.role}</p>
                          <div className="companion-bond-line"><i><em style={{ width: `${affinity}%` }} /></i><b>{affinity}<small>/100</small></b></div>
                        </div>
                        <div className="companion-card-actions">
                          <button onClick={() => focusCompanion(companion.id)}>對話</button>
                          <button className={active ? "companion-active-button" : ""} onClick={() => void selectCompanion(companion.id)} disabled={companionSaving || active} aria-pressed={active}>{active ? "出戰中" : "設為出戰"}</button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className={`companion-dialogue companion-dialogue-${focusedCompanion.id}`}>
                  <div className="companion-dialogue-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element -- generated transparent character art */}
                    <img src={companionImageFor(focusedCompanion.id)} alt="" />
                  </div>
                  <div className="companion-dialogue-main">
                    <div className="companion-dialogue-head">
                      <div><span>{focusedCompanion.epithet} · BOND {focusedCompanionTier.level}</span><h3>{focusedCompanion.name}<small>{focusedCompanion.englishName}</small></h3></div>
                      <div className="companion-affinity"><span>{focusedCompanionTier.label}</span><strong>{focusedCompanionAffinity}</strong><small>/ 100</small></div>
                    </div>
                    <p className="companion-bio">{focusedCompanion.bio}</p>
                    {focusedCompanionContextLine && <div className="companion-memory-echo"><span>同行記憶</span><p>{focusedCompanionContextLine}</p></div>}
                    <div className="companion-talk" aria-live="polite">
                      {companionPlayerLine && <p className="companion-player-line"><span>你</span>{companionPlayerLine}</p>}
                      <p className="companion-reply"><span>{focusedCompanion.name}</span>{companionReply || companionGreeting(focusedCompanion, focusedCompanionAffinity)}</p>
                    </div>
                    <div className="companion-topic-list" aria-label={`${focusedCompanion.name} 的對話主題`}>
                      {focusedCompanion.topics.map((topic) => {
                        const locked = focusedCompanionAffinity < topic.minAffinity;
                        const visited = topic.choices.filter((choice) => visitedCompanionChoices.has(`${focusedCompanion.id}:${topic.id}:${choice.id}`)).length;
                        return <button key={topic.id} className={companionTopicId === topic.id ? "companion-topic-active" : ""} onClick={() => openCompanionTopic(topic.id)} disabled={locked}><strong>{locked ? "◇ " : visited < topic.choices.length ? "NEW · " : "✓ "}{topic.label}</strong><small>{locked ? `好感 ${topic.minAffinity} 解鎖` : `${topic.short} · ${visited}/${topic.choices.length}`}</small></button>;
                      })}
                    </div>
                    {focusedCompanionTopic && focusedCompanionAffinity >= focusedCompanionTopic.minAffinity && (
                      <div className="companion-choice-list">
                        <span>你想怎麼回？</span>
                        {focusedCompanionTopic.choices.map((choice) => {
                          const visited = visitedCompanionChoices.has(`${focusedCompanion.id}:${focusedCompanionTopic.id}:${choice.id}`);
                          return <button className={visited ? "companion-choice-visited" : "companion-choice-new"} key={choice.id} onClick={() => void talkToCompanion(focusedCompanionTopic.id, choice.id)} disabled={companionSaving}><span>{visited ? "✓ 已聊過" : "NEW"}</span>{choice.label}</button>;
                        })}
                      </div>
                    )}
                    <div className="companion-dialogue-footer">
                      <span>{companionLoading ? "正在同步旅伴狀態…" : companionNotice || focusedCompanion.combatPassive}</span>
                      <small>對話探索 {focusedCompanionVisitedCount}/{focusedCompanion.topics.reduce((sum, topic) => sum + topic.choices.length, 0)} · 好感不影響 FSRS、正式進度或 TOEIC 能力判定。</small>
                    </div>
                  </div>
                </div>

                <section className="companion-memory-timeline" aria-labelledby="companion-memory-title">
                  <div className="game-subhead"><span>PERSISTENT JOURNEY MEMORY</span><h4 id="companion-memory-title">和{focusedCompanion.name}一起留下的路</h4><p>任務後果、完成旅程與修復會跨裝置保存；之後的對話會引用這些共同經歷。</p></div>
                  {focusedCompanionMemories.length ? <div className="companion-memory-list">
                    {focusedCompanionMemories.slice(0, 6).map((memory) => (
                      <article key={memory.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- persisted mission artwork is already optimized */}
                        <img src={memory.imageSrc} alt="" />
                        <div><span>{memory.type === "mission" ? "MISSION" : memory.type === "repair" ? "REPAIR" : "JOURNEY"} · {memory.date.slice(0, 10)}</span><strong>{memory.title}</strong><p>{memory.detail}</p></div>
                      </article>
                    ))}
                  </div> : <div className="companion-memory-empty"><strong>第一段共同記憶還沒發生</strong><p>完成旅程中的情境節點後，任務插圖與後果會出現在這裡。</p></div>}
                </section>

                <div className="companion-event-grid">
                  <section className="bond-event-panel" aria-labelledby="bond-event-title">
                    <div className="game-subhead"><span>BOND STORY</span><h4 id="bond-event-title">羈絆事件</h4><p>事件不靠重複點對話刷出來；好感與實際遠征行為都要達成。</p></div>
                    {GAME_MEMORIES.filter((memory) => memory.companionId === focusedCompanion.id).map((memory) => {
                      const unlocked = gameUnlocks.has(`memory:${memory.id}`);
                      return (
                        <article className={`bond-event-card ${unlocked ? "bond-event-unlocked" : "bond-event-locked"}`} key={memory.id}>
                          <div><span>{unlocked ? "EVENT COMPLETE" : "EVENT CONDITION"}</span><strong>{unlocked ? memory.title : "尚未發生的旅途事件"}</strong><p>{unlocked ? memory.eventLine : memory.source}</p></div>
                          <button onClick={() => unlocked && setOpenMemoryId(memory.id)} disabled={!unlocked}>{unlocked ? "重看事件 CG" : "條件未完成"}</button>
                        </article>
                      );
                    })}
                  </section>
                  <section className="wardrobe-panel" aria-labelledby="wardrobe-title">
                    <div className="game-subhead"><span>WARDROBE</span><h4 id="wardrobe-title">旅伴衣裝</h4><p>衣裝會同步到戰鬥、旅伴卡與營火回應；只改外觀，不改能力證據。</p></div>
                    <div className="wardrobe-list">
                      {GAME_OUTFITS.filter((outfit) => outfit.companionId === focusedCompanion.id).map((outfit) => {
                        const unlocked = gameUnlocks.has(`outfit:${outfit.id}`);
                        const equipped = selectedOutfitByCompanion.get(outfit.companionId) === outfit.id;
                        return (
                          <article className={`${equipped ? "wardrobe-equipped" : ""} ${unlocked ? "wardrobe-unlocked" : "wardrobe-locked"}`} key={outfit.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- generated outfit sprite */}
                            <img src={outfit.image} alt={`${focusedCompanion.name} · ${outfit.name}`} />
                            <div><span>{equipped ? "EQUIPPED" : unlocked ? "OWNED" : "LOCKED"}</span><strong>{unlocked ? outfit.name : "？？？"}</strong><small>{unlocked ? outfit.detail : outfit.source}</small></div>
                            <button onClick={() => void equipGameOutfit(outfit.id)} disabled={!unlocked || equipped || gameBusy}>{equipped ? "穿著中" : unlocked ? "換上" : "未解鎖"}</button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </section>

              <section className={`battle-rules-strip ${adventureTab !== "camp" ? "adventure-panel-hidden" : ""}`} aria-label="遠征玩法">
                <div><b>01</b><span><strong>真的會輸</strong><small>意志從 {MAX_WILLPOWER} 開始；答錯會吃敵方反擊，歸零就敗北。</small></span></div>
                <div><b>02</b><span><strong>每場先選遠征祝福</strong><small>三選一改變攻擊、防守、爆發或高風險獎勵，每輪打法不再完全相同。</small></span></div>
                <div><b>03</b><span><strong>架勢、旅伴與配裝連動</strong><small>看敵方意圖換架勢，再用旅伴爆發、道具與裝備完成自己的打法。</small></span></div>
                <div><b>04</b><span><strong>勝敗都推動下一步</strong><small>勝利開寶箱與 CG；敗北有營火診斷；旅途委託另給短期目標與專屬裝備。</small></span></div>
              </section>

              <section className={`game-hub ${adventureTab !== "camp" ? "adventure-panel-hidden" : ""}`} aria-labelledby="game-hub-title">
                <div className="game-hub-head">
                  <div><span>LOADOUT · INVENTORY · MEMORIES</span><h3 id="game-hub-title">營地整備</h3><p>這裡是純遊戲層：可以讓戰鬥更方便，但有提示的題目不會被系統假裝成無提示能力證據。</p></div>
                  <div className="game-wallet"><b>{gameProfile.coins}<small> G</small></b><span>{gameProfile.wins} 勝 · {gameProfile.losses} 敗 · S 印記 {gameProfile.masteryMarks}</span></div>
                </div>
                {gameError && <p className="game-inline-error" aria-live="polite">{gameError}</p>}
                {gameLoading ? <div className="game-loading"><div className="loader" />正在整理背包與裝備…</div> : (
                  <>
                    <section className="quest-board" aria-labelledby="quest-board-title">
                      <div className="quest-board-head">
                        <div><span>DAILY COMMISSIONS · {gameProgress.questDate ?? todayInTaipei()}</span><h4 id="quest-board-title">旅途委託</h4><p>每天換三份短目標；漏一天不扣東西、不斷連續紀錄，勝敗都能推進部分委託。</p></div>
                        <b>{dailyGameQuests.filter((quest) => quest.claimed).length}<small> / {dailyGameQuests.length} 已領</small></b>
                      </div>
                      {questNotice && <div className="quest-notice" aria-live="polite">{questNotice}</div>}
                      <div className="quest-grid">
                        {dailyGameQuests.map((quest) => {
                          const complete = quest.progress >= quest.target;
                          return (
                            <article className={`${complete ? "quest-complete" : ""} ${quest.claimed ? "quest-claimed" : ""}`} key={quest.id}>
                              <b>{quest.mark}</b>
                              <div><span>{quest.claimed ? "REWARD CLAIMED" : complete ? "READY TO CLAIM" : "IN PROGRESS"}</span><strong>{quest.title}</strong><p>{quest.detail}</p><div className="quest-progress"><i><em style={{ width: `${Math.min(100, Math.round((quest.progress / quest.target) * 100))}%` }} /></i><small>{quest.progress}/{quest.target}</small></div></div>
                              <button onClick={() => void claimGameQuest(quest.id)} disabled={gameBusy || !complete || quest.claimed}>{quest.claimed ? "已領取" : gameQuestRewardLabel(quest.reward)}</button>
                            </article>
                          );
                        })}
                      </div>
                      <div className="quest-milestone"><span>委託裝備里程</span><strong>{gameProfile.commissionClaims ?? 0} 次</strong><small>{(gameProfile.commissionClaims ?? 0) < 1 ? "第一份解鎖 SR 共鳴耳墜" : (gameProfile.commissionClaims ?? 0) < 3 ? "第三份解鎖 SSR 戰術羅盤" : "兩件委託裝備皆已達成"}</small></div>
                    </section>
                    <section className="loadout-style-panel" aria-labelledby="loadout-style-title">
                      <div className="game-subhead"><span>BUILD ARCHETYPES</span><h4 id="loadout-style-title">配裝流派</h4><p>不再只有戰力數字：三條路線分別強化無提示連擊、有支援作答與旅伴爆發。</p></div>
                      <div className="loadout-style-grid">
                        {GAME_LOADOUT_STYLES.map((style) => {
                          const activeParts = style.keyItems.filter((itemId) => equippedGameItems.has(itemId)).length;
                          const ownedParts = style.keyItems.filter((itemId) => gameUnlocks.has(`equipment:${itemId}`)).length;
                          const active = activeLoadoutStyle?.style.id === style.id && activeLoadoutStyle.score > 0;
                          return (
                            <article className={active ? "loadout-style-active" : ""} key={style.id}>
                              <b>{style.mark}</b><div><span>{active ? `CURRENT STYLE · ${activeParts}/${style.keyItems.length} 已裝備` : `${ownedParts}/${style.keyItems.length} 核心裝備已解鎖`}</span><strong>{style.name}</strong><p>{style.detail}</p><small>{style.keyItems.map((itemId) => getGameEquipment(itemId)?.name).filter(Boolean).join(" · ")}</small></div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                    <div className="game-management-grid">
                      <div className="equipment-panel">
                        <div className="game-subhead"><span>EQUIPMENT</span><h4>裝備</h4><p>同一欄只能裝一件；換裝不會改 TOEIC／FSRS 判定。</p></div>
                        <div className="equipment-list">
                          {GAME_EQUIPMENT.map((equipment) => {
                            const unlocked = gameUnlocks.has(`equipment:${equipment.id}`);
                            const equipped = equippedGameItems.has(equipment.id);
                            return (
                              <article className={`${unlocked ? "equipment-owned" : "equipment-locked"} ${equipped ? "equipment-equipped" : ""}`} key={equipment.id}>
                                <span className={`equipment-rarity equipment-${equipment.rarity.toLocaleLowerCase()}`}>{equipment.rarity}</span>
                                <div><small>{equipment.slot === "weapon" ? "武器" : equipment.slot === "charm" ? "護符" : "飾品"}</small><strong>{equipment.name}</strong><p>{equipment.detail}</p><em>{equipment.source}</em></div>
                                <button onClick={() => void equipGameItem(equipment.id)} disabled={!unlocked || equipped || gameBusy}>{equipped ? "裝備中" : unlocked ? "裝備" : "未解鎖"}</button>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                      <div className="supply-panel">
                        <div className="game-subhead"><span>SUPPLY SHOP</span><h4>戰鬥道具</h4><p>勝利會掉，金幣也能補貨；戰鬥時從 QUICK ITEMS 直接使用。</p></div>
                        <div className="supply-list">
                          {GAME_ITEMS.map((item) => (
                            <article key={item.id}>
                              <b>{item.mark}</b><div><strong>{item.name}<small>×{gameInventory.get(item.id) ?? 0}</small></strong><p>{item.detail}</p>{item.contentAssist && <em>使用後該題不算無提示證據</em>}</div>
                              <button onClick={() => void buyGameItem(item.id)} disabled={gameBusy || gameProfile.coins < item.price}>{item.price} G</button>
                            </article>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="memory-gallery">
                      <div className="game-subhead"><span>CG GALLERY</span><h4>旅途回憶</h4><p>不是文字佔位：達成條件後會真的開出完整事件 CG。</p></div>
                      <div className="memory-grid">
                        {GAME_MEMORIES.map((memory) => {
                          const unlocked = gameUnlocks.has(`memory:${memory.id}`);
                          return (
                            <button className={unlocked ? "memory-card memory-unlocked" : "memory-card memory-locked"} key={memory.id} onClick={() => unlocked && setOpenMemoryId(memory.id)} disabled={!unlocked}>
                              {unlocked ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element -- generated gallery CG */}
                                  <img src={memory.image} alt={memory.title} />
                                  <span>UNLOCKED</span>
                                </>
                              ) : <div className="memory-lock-art"><b>◇</b><span>LOCKED</span></div>}
                              <strong>{unlocked ? memory.title : "？？？"}</strong><small>{unlocked ? memory.subtitle : memory.source}</small>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </section>

              <section className={`adventure-world ${adventureTab !== "world" ? "adventure-panel-hidden" : ""}`} aria-labelledby="world-map-title">
                <div className="panel-heading"><div><span className="eyebrow">U01–U40 WORLD MAP</span><h3 id="world-map-title">五區世界地圖</h3></div><small>○ 未到達　◐ 探索過　✓ 走完　★ 能力驗證</small></div>
                <div className="adventure-region-list">
                  {ADVENTURE_REGIONS.map((region) => {
                    const regionUnits = UNITS.slice(region.start - 1, region.end);
                    const regionCurrent = activeUnitNumber >= region.start && activeUnitNumber <= region.end;
                    const regionRouteCleared = activeUnitNumber > region.end || (activeUnitNumber === region.end && activeRecorded >= activeQuestionCount && activeQuestionCount > 0);
                    const regionBossUnlocked = isRegionBossUnlocked(region);
                    const regionBossCleared = clearedBossIds.has(region.id);
                    return (
                      <article className={`adventure-region adventure-map-${region.id} ${regionCurrent ? "adventure-region-current" : ""} ${regionRouteCleared ? "adventure-region-cleared" : ""}`} key={region.id} style={{ "--region-accent": REGION_ENCOUNTERS[region.id]?.accent ?? "#526dd0" } as CSSProperties}>
                        <div className="adventure-region-head"><span>{region.numeral}</span><div><strong>{region.name}</strong><small>U{String(region.start).padStart(2, "0")}–U{String(region.end).padStart(2, "0")} · {region.subtitle}</small></div><b>{regionBossCleared ? "BOSS CLEAR" : regionRouteCleared ? "ROUTE CLEAR" : regionCurrent ? "CURRENT" : "AHEAD"}</b></div>
                        <div className="adventure-unit-trail">
                          {regionUnits.map((unit) => {
                            const unitStates = formalStates.filter((state) => state.unit === unit.id);
                            const isCurrent = unit.id === activeUnit.id;
                            const isVerified = verifiedUnitIds.has(unit.id);
                            const isCovered = learningFrontier.completedUnitIds.has(unit.id);
                            const status = isCurrent ? "目前" : isVerified ? "★" : isCovered ? "✓" : unitStates.length ? "◐" : "○";
                            return <button className={`${isCurrent ? "adventure-unit-current" : ""} ${isVerified ? "adventure-unit-verified" : ""} ${isCovered ? "adventure-unit-covered" : ""} ${unitStates.length ? "adventure-unit-seen" : ""}`} key={unit.id} onClick={() => { setView("course"); openCourseUnit(unit.id); }} aria-label={`${unit.id} ${unit.title} · ${status}`}><strong>{unit.id}</strong><span>{status}</span></button>;
                          })}
                        </div>
                        <div className="adventure-region-boss">
                          {/* eslint-disable-next-line @next/next/no-img-element -- generated boss sprite */}
                          <img src={BOSS_ENCOUNTERS[region.id]?.image} alt="" />
                          <div><small>REGION BOSS · 10 UNSEEN</small><strong>{region.bossName}</strong></div>{regionBossUnlocked ? <button onClick={() => startBossBattle(region.id)}>{regionBossCleared ? "再挑戰" : "挑戰 Boss"}</button> : <b>{regionCurrent ? "前進中" : "未抵達"}</b>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <div className={`adventure-side-grid ${adventureTab !== "world" ? "adventure-panel-hidden" : ""}`}>
                <section className="adventure-achievements" aria-labelledby="achievement-title">
                  <div className="adventure-section-head"><div><span>ACHIEVEMENTS</span><h3 id="achievement-title">成就</h3></div><b>{unlockedAchievementCount}/{achievements.length}</b></div>
                  <div className="achievement-grid">{achievements.map((achievement) => <div className={achievement.unlocked ? "achievement-unlocked" : "achievement-locked"} key={achievement.id}><span>{achievement.unlocked ? "◆" : achievement.mark}</span><div><strong>{achievement.title}</strong><small>{achievement.detail}</small></div></div>)}</div>
                </section>
                <section className="adventure-collection" aria-labelledby="collection-title">
                  <div className="adventure-section-head"><div><span>EXPEDITION DROPS</span><h3 id="collection-title">遠征收藏</h3></div><b>{collectibleCount}</b></div>
                  <p>第一筆正式紀錄會找到起程收藏；之後依不可重刷的 XP 里程解鎖。收藏品沒有答題加成。</p>
                  {collectibles.length ? <div className="collectible-list">{collectibles.slice(-4).map((item, index) => <div key={`${item.name}-${index}`}><span className={`loot-rarity loot-${item.rarity.toLocaleLowerCase()}`}>{item.rarity}</span><strong>{item.name}</strong><small>{item.detail}</small></div>)}</div> : <div className="collection-empty">完成第一個學習節點後會出現第一件收藏。</div>}
                </section>
              </div>

              <section className={`codex-banner ${adventureTab !== "world" ? "adventure-panel-hidden" : ""}`} aria-label="七百字圖鑑進度">
                <div><span>VOCABULARY CODEX</span><strong>{vocabularyStates.length}<small> / 700 已建立記憶</small></strong><p>{stableVocabCount} 組已穩定 · {dueVocabCount} 組現在到期</p></div>
                <div className="codex-track"><span style={{ width: `${Math.min(100, Math.round((vocabularyStates.length / 700) * 100))}%` }} /></div>
                <button onClick={() => navigate("vocab")}>打開圖鑑</button>
              </section>

              <div className={`learning-data-divider ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`}><span>LEARNING DATA</span><div /><strong>真實能力資料</strong><p>下面才是判斷「學到哪裡、會不會」的資料；冒險等級不換算 TOEIC 分數。</p></div>
              <div className={`metric-grid ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`}>
                <div className="metric-card metric-accent"><span>今日完成</span><strong>{completedToday}</strong><small>題</small></div>
                <div className="metric-card"><span>到期技能</span><strong>{dueSkillCount}</strong><small>個</small></div>
                <div className="metric-card"><span>正式題走過</span><strong>{formalStates.length}</strong><small>/ {QUESTIONS.length}</small></div>
                <div className="metric-card"><span>目前弱點</span><strong>{wrongStates.length}</strong><small>題</small></div>
              </div>

              <section className={`learning-layers ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`} aria-label="三層學習進度">
                <div><span>01 · 正式位置</span><strong>{activeUnit.id}</strong><p>只依序推進；去後面單元試做不會跳級，回頭複習也不會倒退。</p></div>
                <div><span>02 · 單元走完</span><strong>{learningFrontier.completedUnitIds.size}<small> 個單元</small></strong><p>代表核心練習至少留下過一次紀錄，不等於已經學會。</p></div>
                <div><span>03 · 能力驗證</span><strong>{validatedSkillCount}<small> 個技能</small></strong><p>至少用兩個不同未見題、非低信心答對；同一題重刷不算新證據。</p></div>
              </section>

              <div className={adventureTab !== "learning" ? "adventure-panel-hidden" : ""}>
                <AbilityMapPanel abilities={journeyProgress.abilityAtlas ?? []} />
              </div>

              <section className={`handoff-export-panel ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`} aria-labelledby="handoff-export-title">
                <div className="handoff-export-copy">
                  <span className="eyebrow">CHATGPT HANDOFF</span>
                  <h3 id="handoff-export-title">匯出學習狀態</h3>
                  <p>整理真實進度、第一次作答、錯題、信心、能力弱點與單字記憶，產生一份可直接交給新對話的 Markdown。</p>
                </div>
                <div className="handoff-export-actions">
                  <button className="export-state-button" onClick={() => void downloadLearningState()} disabled={exporting || loading || vocabLoading}>
                    <span aria-hidden="true">↓</span>{exporting ? "正在整理…" : "下載學習狀態 .md"}
                  </button>
                  <small>每次下載都會依當下最新紀錄重新產生</small>
                </div>
                {exportMessage && <p className="export-state-message" aria-live="polite">{exportMessage}</p>}
              </section>

              <section className={`diagnostic-panel ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`} aria-labelledby="diagnostic-title">
                <div className="diagnostic-heading"><div><span className="eyebrow">SKILL DIAGNOSIS · V{progress.schemaVersion ?? 1}</span><h3 id="diagnostic-title">目前優先弱點</h3></div><small>同一題重做不會灌高能力證據；高信心錯與反覆不穩定優先</small></div>
                {(progress.diagnostics ?? []).length ? (
                  <div className="diagnostic-list">
                    {(progress.diagnostics ?? []).slice(0, 5).map((item) => {
                      const accuracy = item.attempts ? Math.round((item.correct / item.attempts) * 100) : 0;
                      return <div className="diagnostic-row" key={item.tag}><div><strong>{item.label}</strong><code>{item.tag}</code></div><div className="diagnostic-stats"><b>{accuracy}%</b><span>{item.currentWeak ? `目前 ${item.currentWeak} 題不穩` : `${item.wrong} 次答錯`}</span>{item.repeatedWrong > 0 && <em>反覆錯 {item.repeatedWrong}</em>}{item.highConfidenceWrong > 0 && <em>高信心錯 {item.highConfidenceWrong}</em>}</div></div>;
                    })}
                  </div>
                ) : <p className="diagnostic-empty">目前還沒有足夠的錯題／低信心資料；繼續作答後會自動建立弱點排序。</p>}
              </section>

              <div className={`vocab-progress-panel ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`}>
                <div><span className="eyebrow">VOCABULARY MEMORY</span><h3>單字記憶</h3><p>單字本 {vocabularyStates.length} 組 · 今天到期 {dueVocabCount} 組 · 穩定記得 {stableVocabCount} 組</p></div>
                <button className="secondary-button" onClick={() => startVocabReview()}>{dueVocabCount > 0 ? "開始到期單字" : "練目前單元"}</button>
              </div>

              <div className={`stage-progress-grid ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`}>
                {STAGES.map((stage) => {
                  const units = UNITS.filter((unit) => unit.stage === stage.id);
                  const unitIds = new Set(units.map((unit) => unit.id));
                  const stageStates = formalStates.filter((state) => unitIds.has(state.unit as UnitId));
                  const stageQuestionCount = QUESTIONS.filter((question) => unitIds.has(question.unit)).length;
                  const coverage = stageQuestionCount ? Math.round((stageStates.length / stageQuestionCount) * 100) : 0;
                  return <article className="stage-progress-card" key={stage.id}><div className="stage-progress-head"><div><span>{stage.range}</span><h3>{stage.id}</h3></div><strong>{coverage}%</strong></div><p>{stage.caption}</p><div className="progress-track"><span style={{ width: `${coverage}%` }} /></div><small>{stageStates.length} 題有紀錄{stageStates.length ? ` · 作答正確率 ${accuracyFor(stageStates)}%` : ""}</small></article>;
                })}
              </div>

              <div className={`unit-map-panel ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`}>
                <div className="panel-heading"><div><span className="eyebrow">U01–U40</span><h3>單元地圖</h3></div><small>點單元可看完整教材</small></div>
                <div className="unit-map">{UNITS.map((unit) => { const unitStates = formalStates.filter((state) => state.unit === unit.id); const needsReview = unitStates.some((state) => state.last_correct === 0 || state.confidence === 1); const isCurrent = unit.id === activeUnit.id; return <button key={unit.id} className={`${unitStates.length ? "unit-map-started" : ""} ${needsReview ? "unit-map-review" : ""} ${isCurrent ? "unit-map-current" : ""}`} onClick={() => { setView("course"); openCourseUnit(unit.id); }}><strong>{unit.id}</strong><span>{isCurrent ? `目前 · ${unitStates.length}/${QUESTIONS.filter((question) => question.unit === unit.id).length}` : unitStates.length ? `${unitStates.length} 題` : "未開始"}</span></button>; })}</div>
              </div>

              <div className={`review-rule ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`}><span>↻</span><div><h3>技能使用 FSRS，題目是驗證材料</h3><p>舊題排程仍保留作為相容 fallback；新版會先看哪個 skill 到期，能找到未見情境時優先換題驗證，不把背熟同一題當成能力進步。</p></div></div>
              <div className={`review-rule review-rule-fsrs ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`}><span>◇</span><div><h3>單字使用智慧間隔複習（FSRS）</h3><p>單字會依「忘了／很吃力／記得／很熟」與實際複習紀錄動態安排，不固定死背同一組。</p></div></div>

              <section className={`mock-exam-panel ${adventureTab !== "learning" ? "adventure-panel-hidden" : ""}`} aria-labelledby="mock-exam-title">
                <div className="mock-exam-head"><div><span className="eyebrow">U35 · U37 · U39 GATE</span><h3 id="mock-exam-title">完整模考紀錄</h3><p>BBC 延伸練習不等於 200 題完整模考。這三個單元只有在完整、未中斷的模考紀錄保存後才會通過門檻；網站不自行把答對題數換算成 TOEIC 分數。</p></div><span>{(progress.passedMockUnits ?? []).length}/3</span></div>
                <div className="mock-exam-form">
                  <label><span>對應單元</span><select value={mockUnit} onChange={(event) => setMockUnit(event.target.value as UnitId)}>{MOCK_GATE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
                  <label className="mock-source"><span>模考來源／名稱</span><input value={mockSource} onChange={(event) => setMockSource(event.target.value)} placeholder="例如：ETS Official Test 1" /></label>
                  <label><span>Listening 答對</span><input inputMode="numeric" value={mockListening} onChange={(event) => setMockListening(event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="0–100" /></label>
                  <label><span>Reading 答對</span><input inputMode="numeric" value={mockReading} onChange={(event) => setMockReading(event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="0–100" /></label>
                  <label><span>實際分鐘</span><input inputMode="numeric" value={mockDuration} onChange={(event) => setMockDuration(event.target.value.replace(/\D/g, "").slice(0, 3))} /></label>
                  <label className="mock-check"><input type="checkbox" checked={mockInterrupted} onChange={(event) => setMockInterrupted(event.target.checked)} /><span>這次有中斷／暫停</span></label>
                  <button className="primary-button" onClick={() => void saveMockExam()} disabled={mockSaving || !mockSource.trim() || !mockListening || !mockReading || !mockDuration}>{mockSaving ? "保存中…" : "保存 200 題完整模考"}</button>
                </div>
                {mockMessage && <p className="mock-message" aria-live="polite">{mockMessage}</p>}
                {(progress.mockExams ?? []).length > 0 && <div className="mock-history">{(progress.mockExams ?? []).slice(0, 3).map((record) => <span key={record.id}>{record.unit} · {record.local_date} · L {record.listening_correct ?? "—"} / R {record.reading_correct ?? "—"}{record.interrupted ? " · 有中斷" : " · 完整"}</span>)}</div>}
              </section>
            </>
          )}

          {view === "course" && (
            <>
              <div className="section-heading"><div><p className="eyebrow">FULL CURRICULUM</p><h2>完整 40 單元</h2><p>每課都有 BBC 語料改編閱讀、聽力、文法、搭配與原創練習；U01～U40 合計 {QUESTIONS.length} 題。</p></div><span className="scope-badge">{QUESTIONS.length} 題</span></div>

              <div className="stage-filter" role="group" aria-label="課程階段篩選">
                {(["all", ...STAGES.map((stage) => stage.id)] as StageFilter[]).map((stage) => <button key={stage} className={courseStage === stage ? "stage-filter-active" : ""} onClick={() => setCourseStage(stage)}>{stage === "all" ? "全部" : stage}</button>)}
              </div>
              <label className="course-search"><span>快速搜尋課程</span><input value={courseSearch} onChange={(event) => setCourseSearch(event.target.value)} placeholder="例如：does、because、traffic jam、U12" /></label>

              {selectedUnit && (
                <article className="course-detail" id="course-detail">
                  <div className="course-detail-hero">
                    <div><div className="course-detail-tags"><span>{selectedUnit.id}</span><span>{selectedUnit.stage}</span><span>{selectedUnit.toeicPart}</span></div><h2>{selectedUnit.title}</h2><p>{selectedUnit.goal}</p></div>
                    <div className="course-detail-actions"><button className="primary-button" onClick={() => startUnit(selectedUnit.id)}>開始這課練習</button><button className="secondary-button" onClick={() => startVocabReview(selectedUnit.id)}>單字快刷</button></div>
                  </div>
                  {selectedCampaignCase && (
                    <section className={`campaign-case-brief ${selectedCampaignCase.boss ? "campaign-case-boss" : ""}`} aria-label={`${selectedUnit.id} 案件任務`}>
                      <header><div><span>ACT {selectedCampaignCase.act.id} · {selectedCampaignCase.act.range}</span><strong>{selectedCampaignCase.title}</strong><small>{selectedCampaignCase.act.title} · {selectedCampaignCase.boss ? "校準關卡" : `${selectedCampaignCase.questionIds.length} 個英文行動節點`}</small></div><b>CASE {selectedCampaignCase.caseNumber}</b></header>
                      <div className="campaign-case-grid"><article><span>INCIDENT</span><p>{selectedCampaignCase.incident}</p></article><article><span>EVIDENCE</span><p>{selectedCampaignCase.evidence}</p></article><article><span>ENGLISH ACTION</span><p>{selectedCampaignCase.englishAction}</p></article><article><span>DECISION</span><p>{selectedCampaignCase.decision}</p></article></div>
                      <footer><p>{selectedCampaignCase.consequence}</p><button className="primary-button" onClick={() => startUnit(selectedUnit.id)}>{Number(selectedUnit.id.slice(1)) > activeUnitIndex + 1 ? "提前試玩案件" : "進入案件演練"}</button></footer>
                      <StudyItemActions itemType="unit" itemId={selectedUnit.id} unit={selectedUnit.id} title={selectedCampaignCase.title} excerpt={selectedCampaignCase.incident} />
                    </section>
                  )}
                  <div className="lesson-sections">
                    <details open>
                      <summary><span>01</span><div><strong>閱讀文章</strong><small>任何單字都可點一下聽發音；底線詞可看中文與例句</small></div></summary>
                      <div className="lesson-copy interactive-reading">
                        <div className="reading-tip"><span>點單字＝聽發音</span><span>藍色底線＝看意思＋例句</span><span>每句右側＝朗讀整句</span></div>
                        {selectedUnit.article.split("\n").flatMap((paragraph) => paragraph ? splitEnglishSentences(paragraph) : []).map((sentence, index) => (
                          <div className="reading-sentence-row" key={`${selectedUnit.id}-reading-${index}`}>
                            <p>{renderInteractiveParagraph(sentence, selectedUnitVocabulary)}</p>
                            <button className="sentence-audio-button" onClick={() => speakEnglish(sentence)} aria-label={`播放第 ${index + 1} 句英文`}>▶<span>整句</span></button>
                          </div>
                        ))}
                      </div>
                    </details>
                    <details>
                      <summary><span>02</span><div><strong>聽力練習</strong><small>第一次先不顯示逐字稿</small></div></summary>
                      <div className="listening-panel">
                        <div className="listening-actions"><button className="listen-button" onClick={() => toggleListening(selectedUnit)}>{speakingUnit === selectedUnit.id ? "■ 停止播放" : "▶ 播放首聽"}</button><button className="transcript-button" onClick={() => setTranscriptVisible((old) => !old)}>{transcriptVisible ? "隱藏逐字稿" : "顯示逐字稿"}</button></div>
                        {audioNote && <p className="audio-note">{audioNote}</p>}
                        {transcriptVisible && (
                          <div className="transcript-copy">
                            {selectedUnit.listening.split("\n").flatMap((paragraph) => paragraph ? splitEnglishSentences(paragraph) : []).map((sentence, index) => (
                              <div className="reading-sentence-row" key={`${selectedUnit.id}-listening-${index}`}>
                                <p>{renderInteractiveParagraph(sentence, selectedUnitVocabulary)}</p>
                                <button className="sentence-audio-button" onClick={() => speakEnglish(sentence)} aria-label={`播放逐字稿第 ${index + 1} 句`}>▶<span>整句</span></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                    <details><summary><span>03</span><div><strong>文法與判斷規則</strong><small>{selectedUnit.grammar}</small></div></summary><div className="grammar-copy">{selectedUnit.grammarNote.split("\n").map((line, index) => line ? <p key={index}>{line}</p> : null)}</div></details>
                    <details><summary><span>04</span><div><strong>單字與固定搭配</strong><small>點單字可播放英文；同一正式 ID 跨課共用一張記憶卡</small></div></summary><div className="vocab-grid">{selectedUnitVocabulary.map((entry) => { const memoryId = getVocabularyMemoryId(entry.id); const state = memoryId ? vocabStateById.get(memoryId) : undefined; return <div key={entry.id}><div className="lesson-vocab-head"><button className="lesson-vocab-term" onClick={() => openVocabularyPeek(entry.id)}>{entry.item}</button><button className="audio-button audio-button-small" onClick={() => speakEnglish(entry.item)} aria-label={`播放 ${entry.item} 發音`}>▶</button></div><p>{entry.detail}</p><div className="lesson-vocab-actions">{state && <span className={`mastery-pill mastery-${state.mastery.level}`}>{state.mastery.label}</span>}{memoryId ? <button className="lesson-vocab-save" onClick={() => { if (state) { setVocabQueue([memoryId]); resetVocabRound(); setView("vocab"); window.scrollTo({ top: 0, behavior: "smooth" }); } else { void addVocabulary(entry); } }}>{state ? "現在複習" : "＋ 加入單字本"}</button> : <span className="noncanonical-note">課堂複習片語</span>}</div></div>; })}</div></details>
                  </div>
                  <div className="source-line"><span>語料來源：{selectedUnit.sourceTitle}</span>{selectedUnit.sourceUrl && <a href={selectedUnit.sourceUrl} target="_blank" rel="noreferrer">BBC 官方來源 ↗</a>}</div>
                </article>
              )}

              <div className="course-grid">
                {visibleUnits.map((unit) => {
                  const unitQuestions = QUESTIONS.filter((question) => question.unit === unit.id);
                  const unitStates = formalStates.filter((state) => state.unit === unit.id);
                  const unitWrong = unitStates.filter((state) => state.last_correct === 0 || state.confidence === 1).length;
                  return (
                    <button className={`course-card ${selectedUnitId === unit.id ? "course-card-selected" : ""}`} key={unit.id} onClick={() => openCourseUnit(unit.id)}>
                      <div className="course-card-head"><span className="unit-chip">{unit.id}</span><span>{unit.stage}</span></div>
                      <h3>{unit.title}</h3>
                      <p>{unit.grammar}</p>
                      <div className="course-card-footer"><span>{unitStates.length ? `${unitStates.length}/${unitQuestions.length} 題有紀錄` : "尚未開始"}</span>{unitWrong ? <b>{unitWrong} 題需複習</b> : <b className="course-ready">閱讀＋聽力</b>}</div>
                    </button>
                  );
                })}
              </div>
              {visibleUnits.length === 0 && <div className="empty-panel compact-empty"><h3>找不到符合的單元</h3><p>可改用 U 編號、文法名稱、單字或中文主題搜尋。</p></div>}
              <p className="pronunciation-rule">教材顯示規則：不使用 IPA、KK 或中文諧音；發音練習以實際英文朗讀為主。</p>
            </>
          )}
        </section>
      </div>

      {peekVocab && (
        <aside className="vocab-peek" aria-live="polite" aria-label={`${peekVocab.item} 單字說明`}>
          <div className="vocab-peek-top"><span>{peekVocab.canonicalId ?? peekVocab.unit} · 點詞閱讀</span><button onClick={closeVocabularyPeek} aria-label="關閉單字說明">×</button></div>
          <div className="vocab-peek-term"><h3>{peekVocab.item}</h3><button className="audio-button" onClick={() => speakEnglish(peekVocab.item)} aria-label={`播放 ${peekVocab.item} 發音`}>▶</button></div>
          {renderVocabularyDetails(peekVocab, true)}
          {peekSentence && <div className="word-peek-context"><span>原句</span><p>{peekSentence}</p><button onClick={() => speakEnglish(peekSentence)}>▶ 播放原句</button></div>}
          <div className="vocab-peek-actions">
            {getVocabularyMemoryId(peekVocab.id) ? (vocabStateById.has(getVocabularyMemoryId(peekVocab.id)!)
              ? <button onClick={() => { setVocabQueue([getVocabularyMemoryId(peekVocab.id)!]); resetVocabRound(); closeVocabularyPeek(); setView("vocab"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>現在複習</button>
              : <button onClick={() => void addVocabulary(peekVocab)} disabled={vocabSaving}>＋ 加入單字本</button>)
              : <span className="noncanonical-note">這是課堂複習片語，不另外建立記憶卡。</span>}
            <button onClick={() => { closeVocabularyPeek(); setView("vocab"); setVocabSearch(peekVocab.item); window.scrollTo({ top: 0, behavior: "smooth" }); }}>到單字中心</button>
          </div>
        </aside>
      )}

      {peekWord && !peekVocab && (
        <aside className="vocab-peek word-peek" aria-live="polite" aria-label={`${peekWord.word} 查字卡`}>
          <div className="vocab-peek-top"><span>CONTEXT LOOKUP · 非正式課內字</span><button onClick={() => setPeekWord(null)} aria-label="關閉查字卡">×</button></div>
          <div className="vocab-peek-term"><h3>{peekWord.word}</h3><button className="audio-button" onClick={() => speakEnglish(peekWord.word)} aria-label={`再次播放 ${peekWord.word}`}>▶</button></div>
          <p className="word-peek-note">這個字不在目前 700 個正式單字概念中，因此不硬塞一個可能不符合句意的中文翻譯；先保留它在原句裡的意思。</p>
          <div className="word-peek-context"><span>原句</span><p>{peekWord.sentence}</p><button onClick={() => speakEnglish(peekWord.sentence)}>▶ 播放原句</button></div>
          <div className="vocab-peek-actions"><button onClick={() => speakEnglish(peekWord.word)}>▶ 單字發音</button><button onClick={() => { const word = peekWord.word; setPeekWord(null); setView("vocab"); setVocabSearch(word); window.scrollTo({ top: 0, behavior: "smooth" }); }}>到單字中心搜尋</button></div>
        </aside>
      )}

      {openMemory && (
        <div className="memory-modal" role="dialog" aria-modal="true" aria-label={`旅途回憶 ${openMemory.title}`} onClick={() => setOpenMemoryId(null)}>
          <div className="memory-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="memory-modal-close" onClick={() => setOpenMemoryId(null)} aria-label="關閉旅途回憶">×</button>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated story CG */}
            <img src={openMemory.image} alt={`${openMemory.title} · ${openMemory.subtitle}`} />
            <div><span>TRAVEL MEMORY · UNLOCKED</span><h3>{openMemory.title}</h3><p>{openMemory.subtitle}</p><blockquote>{openMemory.eventLine}</blockquote></div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="settings-modal" role="presentation" onClick={() => setSettingsOpen(false)}>
          <section className="settings-card" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}>
            <header><div><span>READING & VOICE SETTINGS · V33</span><h2 id="settings-title">閱讀與語音設定</h2><p>只調整呈現與朗讀方式，不會更動正式進度、答案或能力證據。</p></div><button className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="關閉設定">×</button></header>
            <div className="settings-group">
              <div><strong>畫面資訊量</strong><small>專注學習會收起日誌、道具與次要說明，但保留角色和題目。</small></div>
              <div className="settings-segment" role="group" aria-label="畫面資訊量">
                <button className={interfaceMode === "simple" ? "settings-active" : ""} onClick={() => chooseInterfaceMode("simple")} disabled={preferencesSaving} aria-pressed={interfaceMode === "simple"}>專注學習</button>
                <button className={interfaceMode === "detailed" ? "settings-active" : ""} onClick={() => chooseInterfaceMode("detailed")} disabled={preferencesSaving} aria-pressed={interfaceMode === "detailed"}>完整冒險</button>
              </div>
            </div>
            <div className="settings-group">
              <div><strong>英文口音</strong><small>套用到單字、例句、課程聽力與情境案件；系統會使用裝置上最接近的可用聲音。</small></div>
              <div className="settings-segment" role="group" aria-label="英文口音">
                {([['en-US', '美式'], ['en-GB', '英式'], ['en-AU', '澳式']] as const).map(([accent, label]) => <button key={accent} className={speechAccent === accent ? "settings-active" : ""} onClick={() => chooseSpeechPreferences(accent, speechRate)} disabled={preferencesSaving} aria-pressed={speechAccent === accent}>{label}</button>)}
              </div>
            </div>
            <div className="settings-group">
              <div><strong>朗讀速度</strong><small>速度是學習偏好，不會改變聽力模式的首聽、重播與嚴格證據規則。</small></div>
              <div className="settings-segment settings-segment-four" role="group" aria-label="朗讀速度">
                {([[0.75, '0.75×'], [0.9, '0.90×'], [1, '1.00×'], [1.15, '1.15×']] as const).map(([rate, label]) => <button key={rate} className={speechRate === rate ? "settings-active" : ""} onClick={() => chooseSpeechPreferences(speechAccent, rate)} disabled={preferencesSaving} aria-pressed={speechRate === rate}>{label}</button>)}
              </div>
            </div>
            <div className="settings-group">
              <div><strong>文字大小</strong><small>放大模式會提高介面與說明文字；英文題目原本就維持較大字級。</small></div>
              <div className="settings-segment" role="group" aria-label="文字大小">
                <button className={fontScale === "standard" ? "settings-active" : ""} onClick={() => chooseFontScale("standard")} disabled={preferencesSaving} aria-pressed={fontScale === "standard"}>標準</button>
                <button className={fontScale === "large" ? "settings-active" : ""} onClick={() => chooseFontScale("large")} disabled={preferencesSaving} aria-pressed={fontScale === "large"}>放大</button>
              </div>
            </div>
            <div className="settings-group">
              <div><strong>動畫效果</strong><small>減少動畫會關閉位移、閃爍與平滑捲動，戰鬥資訊仍完整保留。</small></div>
              <div className="settings-segment" role="group" aria-label="動畫效果">
                <button className={motionMode === "standard" ? "settings-active" : ""} onClick={() => chooseMotionMode("standard")} disabled={preferencesSaving} aria-pressed={motionMode === "standard"}>標準</button>
                <button className={motionMode === "reduced" ? "settings-active" : ""} onClick={() => chooseMotionMode("reduced")} disabled={preferencesSaving} aria-pressed={motionMode === "reduced"}>減少動畫</button>
              </div>
            </div>
            <footer><span aria-live="polite">{preferencesNotice || "設定會保存在帳號中，換裝置後自動接回。"}</span><button onClick={() => setSettingsOpen(false)}>完成</button></footer>
          </section>
        </div>
      )}

      <nav className="mobile-nav" aria-label="手機導覽">
        {([['today', '今日'], ['wrong', '錯題'], ['vocab', '工具'], ['progress', '冒險'], ['course', '課程']] as const).map(([id, label]) => <button key={id} className={view === id ? "mobile-nav-active" : ""} onClick={() => navigate(id)} aria-current={view === id ? "page" : undefined}><span>{label}</span>{id === "wrong" && wrongStates.length > 0 && <b>{wrongStates.length}</b>}{id === "vocab" && dueVocabCount > 0 && <b>{dueVocabCount}</b>}</button>)}
      </nav>
    </main>
  );
}
