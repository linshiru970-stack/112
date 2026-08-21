import { CORE_VOCABULARY_ROWS } from "./core-vocabulary.generated";
import { UNITS, getQuestion, getQuestionSkillTags, getSkillTagLabel, type PracticeQuestion } from "./content";
import { getVariantQuestion } from "./question-variants";
import { getScenarioQuestion } from "./scenario-mission";
import { GRAMMAR_OBJECTIVES, type AbilityStatus } from "./journey-system";

export type AbilityDomain = "grammar" | "vocabulary" | "listening" | "reading" | "part";

export type AbilityEvidenceDetail = {
  id: string;
  questionId: string;
  unit: string;
  prompt: string;
  answer: string;
  correct: boolean;
  confidence: number;
  support: "strict" | "assisted" | "preview";
  errorCategory: string | null;
  createdAt: string;
  localDate: string;
};

export type AbilityAtlasItem = {
  id: string;
  domain: AbilityDomain;
  tag: string;
  label: string;
  sublabel: string;
  firstUnit: string;
  status: AbilityStatus;
  evidenceLevel: number;
  evidenceLabel: string;
  attempts: number;
  correct: number;
  strictEvidence: number;
  assistedEvidence: number;
  previewEvidence: number;
  lowConfidenceCorrect: number;
  highConfidenceWrong: number;
  repeatedWrong: number;
  topErrorCategory: string | null;
  nextReviewAt: string | null;
  reason: string;
  recentEvidence: AbilityEvidenceDetail[];
};

export type AbilityAtlasInput = {
  activeUnitId: string;
  nowMs?: number;
  skillStates: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  vocabularyStates: Array<Record<string, unknown>>;
  vocabularyAttempts: Array<Record<string, unknown>>;
};

export const EVIDENCE_LADDER = [
  "尚未留下證據",
  "看過／完成首答",
  "提示後答對",
  "無提示新題答對",
  "換情境仍會",
  "聽讀轉換成功",
  "隔日重測穩定",
] as const;

const LISTENING_OBJECTIVES = [
  { id: "L01", tag: "listening.first_pass", label: "首聽理解", sublabel: "首聽一次後先鎖定答案與信心", firstUnit: "U02" },
  { id: "L02", tag: "listening.sound_recognition", label: "聲音辨認", sublabel: "把實際語音連回已知字詞與語塊", firstUnit: "U02" },
  { id: "L03", tag: "listening.detail_location", label: "關鍵資訊定位", sublabel: "抓人物、時間、地點、原因與下一步", firstUnit: "U02" },
  { id: "L04", tag: "listening.question_function", label: "問句功能與回應", sublabel: "分辨 what／where／when／why 與間接回應", firstUnit: "U02" },
  { id: "L05", tag: "listening.long_retention", label: "長聽力與短期保留", sublabel: "在較長對話或公告中保留跨句資訊", firstUnit: "U20" },
] as const;

const READING_OBJECTIVES = [
  { id: "R01", tag: "reading.explicit_detail", label: "明示細節定位", sublabel: "回到原句找可直接支持答案的資訊", firstUnit: "U01" },
  { id: "R02", tag: "reading.sentence_core", label: "句子主幹", sublabel: "先找主詞與主要動詞，再掛回修飾資訊", firstUnit: "U01" },
  { id: "R03", tag: "reading.timeline_update", label: "時間與新舊資訊", sublabel: "分清平常／現在、原定／最新異動", firstUnit: "U02" },
  { id: "R04", tag: "reading.paraphrase", label: "同義改寫", sublabel: "辨認不同表面文字所表達的相同意思", firstUnit: "U16" },
  { id: "R05", tag: "reading.cross_document", label: "跨文件整合", sublabel: "把郵件、公告、圖表或多篇文件連起來", firstUnit: "U24" },
] as const;

const PART_OBJECTIVES = [
  { id: "P1", label: "Part 1 照片描述", sublabel: "人物動作、狀態與位置", firstUnit: "U17", marker: "Part 1" },
  { id: "P2", label: "Part 2 應答問題", sublabel: "問句功能與自然回應", firstUnit: "U18", marker: "Part 2" },
  { id: "P3", label: "Part 3 簡短對話", sublabel: "目的、細節與下一步", firstUnit: "U20", marker: "Part 3" },
  { id: "P4", label: "Part 4 簡短獨白", sublabel: "公告、留言、廣告與導覽", firstUnit: "U21", marker: "Part 4" },
  { id: "P5", label: "Part 5 句子填空", sublabel: "句子骨架、詞性、文法與搭配", firstUnit: "U19", marker: "Part 5" },
  { id: "P6", label: "Part 6 段落填空", sublabel: "句間邏輯與完整句插入", firstUnit: "U22", marker: "Part 6" },
  { id: "P7", label: "Part 7 閱讀理解", sublabel: "單篇、多篇、圖表與跨文件", firstUnit: "U23", marker: "Part 7" },
] as const;

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(String(value ?? "")) as T;
  } catch {
    return fallback;
  }
}

function unitNumber(unitId: string) {
  const value = Number(unitId.replace(/^U/, ""));
  return Number.isFinite(value) ? value : 0;
}

function practiceQuestion(id: string) {
  return getQuestion(id) ?? getVariantQuestion(id) ?? getScenarioQuestion(id);
}

function eventMetadata(event: Record<string, unknown>) {
  return parseJson<Record<string, unknown>>(event.metadata_json, {});
}

function eventTags(event: Record<string, unknown>) {
  const parsed = parseJson<unknown>(event.skill_tags_json, []);
  return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
}

function eventQuestion(event: Record<string, unknown>) {
  return practiceQuestion(String(event.entity_id ?? ""));
}

function questionText(question: PracticeQuestion) {
  return [question.skill, question.prompt, question.passage, question.listeningText, question.explanation, question.evidence, question.sourceLabel]
    .filter(Boolean)
    .join(" ");
}

function eventIsStrict(event: Record<string, unknown>) {
  const metadata = eventMetadata(event);
  return metadata.strictEvidenceEligible === true && metadata.novelEvidence === true;
}

function eventIsAssisted(event: Record<string, unknown>) {
  return Number(event.correct ?? 0) === 1 && !eventIsStrict(event);
}

function eventModalities(event: Record<string, unknown>) {
  const tags = eventTags(event);
  const modalities: string[] = [];
  if (tags.includes("listening.comprehension")) modalities.push("listening");
  if (tags.includes("reading.comprehension")) modalities.push("reading");
  if (!modalities.length) modalities.push("form");
  return modalities;
}

export function inferLearningErrorCategory(
  question: PracticeQuestion,
  input: { correct: boolean; confidence?: number; replayCount?: number; audioFallbackUsed?: boolean },
) {
  if (input.correct) return null;
  const tags = getQuestionSkillTags(question);
  const text = questionText(question).toLocaleLowerCase();
  if (/(refer|指涉|pronoun|先行詞|this |these |they )/.test(text)) return "指涉關係";
  if (/(paraphrase|同義|改寫|same meaning|means)/.test(text)) return "同義改寫";
  if (/(infer|suggest|imply|推論|超出|充分支持|only conclusion)/.test(text)) return "過度推論";
  if (tags.includes("listening.comprehension")) {
    if (input.audioFallbackUsed) return "音訊不可用";
    return Number(input.replayCount ?? 0) > 0 ? "聽力資訊定位" : "聲音辨認";
  }
  if (tags.includes("reading.comprehension")) return "閱讀資訊定位";
  if (tags.includes("vocabulary.collocation")) return "字彙／固定搭配";
  if (tags.some((tag) => tag.startsWith("grammar."))) return Number(input.confidence ?? 0) >= 3 ? "高信心錯誤直覺" : "文法結構";
  if (Number(input.confidence ?? 0) >= 3) return "注意力／錯誤直覺";
  return "情境判斷";
}

function eventDetail(event: Record<string, unknown>, preview = false): AbilityEvidenceDetail | null {
  const questionId = String(event.entity_id ?? "");
  const question = practiceQuestion(questionId);
  if (!question) return null;
  const metadata = eventMetadata(event);
  const correct = Number(event.correct ?? 0) === 1;
  const confidence = Number(event.confidence ?? 0);
  const strict = eventIsStrict(event);
  const storedCategory = typeof metadata.errorCategory === "string" ? metadata.errorCategory : null;
  const category = storedCategory ?? inferLearningErrorCategory(question, {
    correct,
    confidence,
    replayCount: Number(event.replay_count ?? metadata.replayCount ?? 0),
    audioFallbackUsed: metadata.audioFallbackUsed === true,
  });
  const answerValue = String(event.answer ?? "");
  const answerLabel = question.options?.find((option) => option.id === answerValue)?.label ?? answerValue;
  return {
    id: `${questionId}:${String(event.created_at ?? "")}`,
    questionId,
    unit: String(event.unit ?? question.unit),
    prompt: question.listeningText ? `聽力：${question.prompt}` : question.passage ? `閱讀：${question.prompt}` : question.prompt,
    answer: answerLabel,
    correct,
    confidence,
    support: preview ? "preview" : strict ? "strict" : "assisted",
    errorCategory: category,
    createdAt: String(event.created_at ?? ""),
    localDate: String(event.local_date ?? ""),
  };
}

function evidenceStats(events: Array<Record<string, unknown>>, preview = false) {
  const sorted = [...events].sort((left, right) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")));
  const correct = sorted.filter((event) => Number(event.correct ?? 0) === 1);
  const strict = correct.filter(eventIsStrict);
  const assisted = correct.filter(eventIsAssisted);
  const uniqueContexts = new Set(strict.map((event) => {
    const metadata = eventMetadata(event);
    return String(metadata.fingerprint ?? event.entity_id ?? "");
  }).filter(Boolean));
  const modalities = new Set(strict.flatMap(eventModalities));
  const dates = new Set(strict.map((event) => String(event.local_date ?? "")).filter(Boolean));
  const lowConfidenceCorrect = correct.filter((event) => Number(event.confidence ?? 0) <= 1).length;
  const wrong = sorted.filter((event) => Number(event.correct ?? 0) === 0);
  const highConfidenceWrong = wrong.filter((event) => Number(event.confidence ?? 0) >= 3).length;
  const categories = new Map<string, number>();
  for (const event of wrong) {
    const detail = eventDetail(event, preview);
    if (detail?.errorCategory) categories.set(detail.errorCategory, (categories.get(detail.errorCategory) ?? 0) + 1);
  }
  let level = sorted.length ? 1 : 0;
  if (assisted.length) level = Math.max(level, 2);
  if (strict.length) level = Math.max(level, 3);
  if (uniqueContexts.size >= 2) level = Math.max(level, 4);
  if (modalities.has("listening") && modalities.has("reading")) level = Math.max(level, 5);
  if (dates.size >= 2 && uniqueContexts.size >= 2 && Number(sorted[0]?.correct ?? 0) === 1) level = 6;
  return {
    attempts: sorted.length,
    correct: correct.length,
    strictEvidence: strict.length,
    assistedEvidence: assisted.length,
    previewEvidence: preview ? sorted.length : 0,
    lowConfidenceCorrect,
    highConfidenceWrong,
    repeatedWrong: wrong.length >= 2 ? wrong.length : 0,
    topErrorCategory: [...categories.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null,
    evidenceLevel: level,
    recentEvidence: sorted.map((event) => eventDetail(event, preview)).filter((detail): detail is AbilityEvidenceDetail => Boolean(detail)).slice(0, 4),
    distinctStrictDates: dates.size,
  };
}

function statusReason(status: AbilityStatus, firstUnit: string, activeUnitId: string, stats: ReturnType<typeof evidenceStats>) {
  if (status === "locked") return stats.previewEvidence
    ? `${firstUnit} 才正式教；目前 ${stats.previewEvidence} 筆只是提前接觸，不會解鎖或推進正式進度。`
    : `${firstUnit} 才正式教；現在不把未教內容當成唯一答案線索。`;
  if (status === "weak") return stats.highConfidenceWrong
    ? `有 ${stats.highConfidenceWrong} 次高信心答錯，已列為最高優先修復。`
    : stats.lowConfidenceCorrect
      ? `答對但信心仍低，會安排不同情境遷移，不急著判定為學會。`
      : `最近仍有錯誤或不穩定證據，下一輪會換情境再驗證。`;
  if (status === "due") return "間隔複習已到期；需要用未見題重新確認，而不是重刷舊答案。";
  if (status === "stable") return "已在不同情境與不同日期留下嚴格證據；之後仍會依 FSRS 再出現。";
  if (status === "retest") return "已有無提示或跨情境證據，仍要等待隔日／延遲重測才算穩定。";
  if (status === "current") return `${activeUnitId} 正在正式練習；完成題目不等於自動穩定。`;
  return "已正式教過，但目前證據還不足以判定為穩定。";
}

function statusFor(firstUnit: string, activeUnitId: string, stats: ReturnType<typeof evidenceStats>, nextReviewAt: string | null, nowMs: number): AbilityStatus {
  if (unitNumber(firstUnit) > unitNumber(activeUnitId)) return "locked";
  const latest = stats.recentEvidence[0];
  if (latest && (!latest.correct || stats.highConfidenceWrong > 0 && stats.evidenceLevel < 4)) return "weak";
  if (stats.lowConfidenceCorrect > 0 && stats.evidenceLevel < 4) return "weak";
  const dueAt = Date.parse(String(nextReviewAt ?? ""));
  if (Number.isFinite(dueAt) && dueAt <= nowMs && stats.attempts > 0) return "due";
  if (stats.evidenceLevel >= 6) return "stable";
  if (stats.evidenceLevel >= 3) return "retest";
  if (unitNumber(firstUnit) === unitNumber(activeUnitId)) return "current";
  return "taught";
}

function atlasItem(input: {
  id: string;
  domain: AbilityDomain;
  tag: string;
  label: string;
  sublabel: string;
  firstUnit: string;
  activeUnitId: string;
  events: Array<Record<string, unknown>>;
  nextReviewAt?: string | null;
  nowMs: number;
  preview?: boolean;
}): AbilityAtlasItem {
  const stats = evidenceStats(input.events, input.preview === true);
  const status = statusFor(input.firstUnit, input.activeUnitId, stats, input.nextReviewAt ?? null, input.nowMs);
  return {
    id: input.id,
    domain: input.domain,
    tag: input.tag,
    label: input.label,
    sublabel: input.sublabel,
    firstUnit: input.firstUnit,
    status,
    evidenceLevel: stats.evidenceLevel,
    evidenceLabel: EVIDENCE_LADDER[stats.evidenceLevel] ?? EVIDENCE_LADDER[0],
    attempts: stats.attempts,
    correct: stats.correct,
    strictEvidence: stats.strictEvidence,
    assistedEvidence: stats.assistedEvidence,
    previewEvidence: stats.previewEvidence,
    lowConfidenceCorrect: stats.lowConfidenceCorrect,
    highConfidenceWrong: stats.highConfidenceWrong,
    repeatedWrong: stats.repeatedWrong,
    topErrorCategory: stats.topErrorCategory,
    nextReviewAt: input.nextReviewAt ?? null,
    reason: statusReason(status, input.firstUnit, input.activeUnitId, stats),
    recentEvidence: stats.recentEvidence,
  };
}

function matchesListeningObjective(id: string, event: Record<string, unknown>) {
  const question = eventQuestion(event);
  if (!question || !eventTags(event).includes("listening.comprehension")) return false;
  const text = questionText(question).toLocaleLowerCase();
  const metadata = eventMetadata(event);
  if (id === "L01") return Number(metadata.listenCount ?? 0) >= 1;
  if (id === "L02") return metadata.audioFallbackUsed !== true;
  if (id === "L03") return /(what|where|when|which|who|why|how|目的|時間|地點|原因|下一步)/.test(text);
  if (id === "L04") return eventTags(event).includes("grammar.questions_responses") || /(question|response|問句|回應)/.test(text);
  return (question.listeningText?.length ?? 0) >= 150 || unitNumber(question.unit) >= 20;
}

function matchesReadingObjective(id: string, event: Record<string, unknown>) {
  const question = eventQuestion(event);
  if (!question) return false;
  const tags = eventTags(event);
  const text = questionText(question).toLocaleLowerCase();
  const readingLike = tags.includes("reading.comprehension") || Boolean(question.passage);
  if (id === "R01") return readingLike;
  if (id === "R02") return tags.some((tag) => ["grammar.sentence_core", "grammar.present_simple_do_does", "grammar.subject_verb_agreement"].includes(tag));
  if (id === "R03") return readingLike && (tags.some((tag) => ["grammar.present_simple_do_does", "grammar.progressive_aspect"].includes(tag)) || /(usually|today|now|latest|original|delay|時間|異動)/.test(text));
  if (id === "R04") return readingLike && /(paraphrase|同義|改寫|same meaning|means)/.test(text);
  return readingLike && ((question.passage?.length ?? 0) >= 500 || unitNumber(question.unit) >= 24);
}

function unitPartMarkers(unitId: string) {
  const unit = UNITS.find((candidate) => candidate.id === unitId);
  return String(unit?.toeicPart ?? "");
}

function cardStability(value: unknown) {
  const card = parseJson<Record<string, unknown>>(value, {});
  return Number(card.stability ?? 0);
}

function vocabularyItem(
  row: (typeof CORE_VOCABULARY_ROWS)[number],
  activeUnitId: string,
  state: Record<string, unknown> | undefined,
  attempts: Array<Record<string, unknown>>,
  nowMs: number,
): AbilityAtlasItem {
  const firstNumber = unitNumber(row.unit);
  const activeNumber = unitNumber(activeUnitId);
  const reviewCount = Number(state?.review_count ?? 0);
  const lastRating = Number(state?.last_rating ?? 0);
  const nextReviewAt = state ? String(state.next_review_at ?? "") || null : null;
  const dueAt = Date.parse(String(nextReviewAt ?? ""));
  const stability = cardStability(state?.card_json);
  const distinctReviewDates = new Set(attempts.map((attempt) => String(attempt.reviewed_at ?? attempt.created_at ?? "").slice(0, 10)).filter(Boolean)).size;
  let status: AbilityStatus;
  if (firstNumber > activeNumber) status = "locked";
  else if (lastRating === 1) status = "weak";
  else if (Number.isFinite(dueAt) && dueAt <= nowMs && reviewCount > 0) status = "due";
  else if (stability >= 21 && lastRating >= 3 && distinctReviewDates >= 2) status = "stable";
  else if (reviewCount > 0) status = "retest";
  else if (firstNumber === activeNumber) status = "current";
  else status = "taught";
  let evidenceLevel = state ? 1 : 0;
  if (lastRating === 2) evidenceLevel = Math.max(evidenceLevel, 2);
  if (lastRating >= 3) evidenceLevel = Math.max(evidenceLevel, 3);
  if (reviewCount >= 2) evidenceLevel = Math.max(evidenceLevel, 4);
  if (status === "stable") evidenceLevel = 6;
  const recentEvidence = [...attempts]
    .sort((left, right) => String(right.reviewed_at ?? "").localeCompare(String(left.reviewed_at ?? "")))
    .slice(0, 4)
    .map((attempt, index) => {
      const rating = Number(attempt.rating ?? 0);
      const label = rating === 1 ? "忘了" : rating === 2 ? "很吃力" : rating === 3 ? "記得" : "很熟";
      const createdAt = String(attempt.reviewed_at ?? attempt.created_at ?? "");
      return {
        id: `${row.id}:${createdAt}:${index}`,
        questionId: row.id,
        unit: row.unit,
        prompt: `${row.item} · ${row.collocation}`,
        answer: label,
        correct: rating >= 3,
        confidence: rating >= 4 ? 3 : rating === 3 ? 2 : 1,
        support: rating >= 3 ? "strict" as const : "assisted" as const,
        errorCategory: rating === 1 ? "字彙／固定搭配" : null,
        createdAt,
        localDate: createdAt.slice(0, 10),
      };
    });
  const reason = status === "locked" ? `${row.unit} 才正式加入；現在不會因看到過就解鎖。`
    : status === "weak" ? "最近一次標記為忘記，會優先回到搭配與短句。"
      : status === "due" ? "這張單字卡已到期，等待一次真實回想。"
        : status === "stable" ? "已經過多次間隔複習並達到穩定記憶。"
          : status === "retest" ? "正在建立記憶，仍需下一次間隔回想。"
            : status === "current" ? `${activeUnitId} 目前正式使用這個字與固定搭配。`
              : "已在先前單元正式出現，尚未留下足夠記憶證據。";
  return {
    id: row.id,
    domain: "vocabulary",
    tag: `vocabulary.${row.id}`,
    label: row.item,
    sublabel: `${row.meaning} · ${row.collocation}`,
    firstUnit: row.unit,
    status,
    evidenceLevel,
    evidenceLabel: EVIDENCE_LADDER[evidenceLevel] ?? EVIDENCE_LADDER[0],
    attempts: attempts.length,
    correct: attempts.filter((attempt) => Number(attempt.rating ?? 0) >= 3).length,
    strictEvidence: attempts.filter((attempt) => Number(attempt.rating ?? 0) >= 3).length,
    assistedEvidence: attempts.filter((attempt) => Number(attempt.rating ?? 0) === 2).length,
    previewEvidence: 0,
    lowConfidenceCorrect: attempts.filter((attempt) => Number(attempt.rating ?? 0) === 3).length,
    highConfidenceWrong: 0,
    repeatedWrong: attempts.filter((attempt) => Number(attempt.rating ?? 0) === 1).length >= 2 ? attempts.filter((attempt) => Number(attempt.rating ?? 0) === 1).length : 0,
    topErrorCategory: lastRating === 1 ? "字彙／固定搭配" : null,
    nextReviewAt,
    reason,
    recentEvidence,
  };
}

export function buildAbilityAtlas(input: AbilityAtlasInput) {
  const nowMs = input.nowMs ?? Date.now();
  const activeNumber = unitNumber(input.activeUnitId);
  const skillStateByTag = new Map(input.skillStates.map((row) => [String(row.skill_tag ?? ""), row]));
  const vocabularyStateById = new Map(input.vocabularyStates.map((row) => [String(row.vocab_id ?? ""), row]));
  const vocabularyAttemptsById = new Map<string, Array<Record<string, unknown>>>();
  for (const attempt of input.vocabularyAttempts) {
    const id = String(attempt.vocab_id ?? "");
    const values = vocabularyAttemptsById.get(id) ?? [];
    values.push(attempt);
    vocabularyAttemptsById.set(id, values);
  }

  const grammar = GRAMMAR_OBJECTIVES.map((objective) => {
    const state = skillStateByTag.get(objective.tag);
    return atlasItem({
      id: objective.id,
      domain: "grammar",
      tag: objective.tag,
      label: getSkillTagLabel(objective.tag),
      sublabel: `主教單元 ${objective.firstUnit}`,
      firstUnit: objective.firstUnit,
      activeUnitId: input.activeUnitId,
      events: input.events.filter((event) => eventTags(event).includes(objective.tag)),
      nextReviewAt: state ? String(state.next_review_at ?? "") || null : null,
      nowMs,
    });
  });

  const vocabulary = CORE_VOCABULARY_ROWS.map((row) => vocabularyItem(
    row,
    input.activeUnitId,
    vocabularyStateById.get(row.id),
    vocabularyAttemptsById.get(row.id) ?? [],
    nowMs,
  ));

  const listening = LISTENING_OBJECTIVES.map((objective) => atlasItem({
    ...objective,
    domain: "listening",
    activeUnitId: input.activeUnitId,
    events: input.events.filter((event) => matchesListeningObjective(objective.id, event)),
    nextReviewAt: skillStateByTag.get("listening.comprehension") ? String(skillStateByTag.get("listening.comprehension")?.next_review_at ?? "") || null : null,
    nowMs,
  }));

  const reading = READING_OBJECTIVES.map((objective) => atlasItem({
    ...objective,
    domain: "reading",
    activeUnitId: input.activeUnitId,
    events: input.events.filter((event) => matchesReadingObjective(objective.id, event)),
    nextReviewAt: skillStateByTag.get("reading.comprehension") ? String(skillStateByTag.get("reading.comprehension")?.next_review_at ?? "") || null : null,
    nowMs,
  }));

  const part = PART_OBJECTIVES.map((objective) => {
    const preview = unitNumber(objective.firstUnit) > activeNumber;
    const events = input.events.filter((event) => unitPartMarkers(String(event.unit ?? "")).includes(objective.marker));
    return atlasItem({
      id: objective.id,
      domain: "part",
      tag: `toeic.${objective.id.toLocaleLowerCase()}`,
      label: objective.label,
      sublabel: objective.sublabel,
      firstUnit: objective.firstUnit,
      activeUnitId: input.activeUnitId,
      events,
      nowMs,
      preview,
    });
  });

  return [...grammar, ...vocabulary, ...listening, ...reading, ...part];
}
