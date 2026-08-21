import { GENERATED_QUESTIONS, GENERATED_UNITS } from "./course-data.generated";
import { CORE_VOCABULARY_ROWS, type CoreVocabularyRow } from "./core-vocabulary.generated";

export type Choice = {
  id: string;
  label: string;
};

export type UnitId = (typeof GENERATED_UNITS)[number]["id"];

export type PracticeQuestion = {
  id: string;
  unit: UnitId;
  kind: "choice" | "output";
  skill: string;
  prompt: string;
  passage?: string;
  listeningText?: string;
  hint?: string;
  options?: readonly Choice[];
  answerId?: string;
  outputPrompt?: string;
  referenceAnswer?: string;
  acceptedAnswers?: readonly string[];
  explanation: string;
  evidence: string;
  breakdown?: string;
  optionReasons?: Readonly<Record<string, string>>;
  sourceLabel: string;
  variant?: {
    fingerprint: string;
    family: string;
    pattern: string;
    version: number;
  };
};

export type VocabularyEntry = {
  id: string;
  canonicalId?: string;
  unit: UnitId;
  unitTitle: string;
  stage: string;
  item: string;
  detail: string;
  source: "bbc" | "core";
  level?: "A" | "B" | "C";
  partOfSpeech?: string;
  meaning?: string;
  collocation?: string;
  example?: string;
};

const GRAMMAR_OBJECTIVE_TAGS: Record<string, { tag: string; label: string }> = {
  G01: { tag: "grammar.sentence_core", label: "句子主幹與基本肯否定" },
  G02: { tag: "grammar.present_simple_do_does", label: "現在簡單式／第三人稱／do・does" },
  G03: { tag: "grammar.subject_verb_agreement", label: "主詞動詞一致" },
  G04: { tag: "grammar.past_future_timeline", label: "過去式／未來式與時間線" },
  G05: { tag: "grammar.progressive_aspect", label: "現在／過去進行式" },
  G06: { tag: "grammar.word_forms", label: "詞性與字族位置" },
  G07: { tag: "grammar.articles_quantifiers", label: "冠詞／可數性／數量詞" },
  G08: { tag: "grammar.pronouns", label: "代名詞與先行詞一致" },
  G09: { tag: "grammar.passive_voice", label: "被動語態" },
  G10: { tag: "grammar.modals", label: "情態動詞" },
  G11: { tag: "grammar.infinitive_gerund", label: "to V／V-ing 與動詞搭配" },
  G12: { tag: "grammar.participial_adjectives", label: "V-ing／V-ed 分詞修飾" },
  G13: { tag: "grammar.comparatives", label: "比較級／最高級與比較結構" },
  G14: { tag: "grammar.prepositions", label: "時間／地點／方向介系詞" },
  G15: { tag: "grammar.connectors_conditions", label: "原因／轉折／時間／條件連接" },
  G16: { tag: "grammar.relative_clauses", label: "關係子句與指涉" },
  G17: { tag: "grammar.present_perfect", label: "現在完成式與過去式" },
  G18: { tag: "grammar.questions_responses", label: "問句結構與 Part 2 回應" },
  G19: { tag: "grammar.noun_clauses_indirect_questions", label: "名詞子句與間接問句" },
  G20: { tag: "grammar.causatives", label: "使役與受詞補語" },
  G21: { tag: "grammar.reduced_relative_clauses", label: "關係子句簡化與分詞片語" },
  G22: { tag: "grammar.parallel_correlatives", label: "平行結構與成對連接詞" },
  G23: { tag: "grammar.mandative_subjunctive", label: "recommend/request/require that + 原形" },
  G24: { tag: "grammar.fixed_preposition_patterns", label: "固定句型與形容詞／動詞＋介系詞" },
  G25: { tag: "strategy.context_elimination", label: "依句意、結構與搭配排除干擾" },
};

const SKILL_TAG_LABELS: Record<string, string> = {
  "reading.comprehension": "閱讀理解",
  "listening.comprehension": "聽力理解",
  "vocabulary.collocation": "單字與固定搭配",
  "application.transfer": "情境遷移",
  "production.short_output": "英文短輸出",
  "grammar.general": "文法整合",
  "grammar.time_prepositions_basic": "時間介系詞 at／on／in",
  ...Object.fromEntries(Object.values(GRAMMAR_OBJECTIVE_TAGS).map(({ tag, label }) => [tag, label])),
};

export function getQuestionSkillTags(question: PracticeQuestion) {
  const tags = new Set<string>();
  if (question.skill.includes("閱讀")) tags.add("reading.comprehension");
  if (question.skill.includes("聽力")) tags.add("listening.comprehension");
  if (question.skill.includes("單字") || question.skill.includes("搭配")) tags.add("vocabulary.collocation");
  if (question.skill.includes("情境遷移")) tags.add("application.transfer");
  if (question.kind === "output" || question.skill.includes("短輸出")) tags.add("production.short_output");
  if (question.skill.includes("時間介系詞")) tags.add("grammar.time_prepositions_basic");

  // Generated course items keep internal objective ids in their post-answer
  // explanation/evidence rather than in the learner-facing prompt. Read those
  // ids here so FSRS can schedule the actual grammar objective without leaking
  // a skill label before the learner commits an answer.
  const objectiveText = `${question.sourceLabel} ${question.explanation} ${question.evidence}`;
  const objectives = [...new Set(objectiveText.match(/G\d{2}/g) ?? [])];
  for (const objective of objectives) {
    const mapped = GRAMMAR_OBJECTIVE_TAGS[objective];
    if (mapped) tags.add(mapped.tag);
  }
  if ((question.skill.includes("文法") || objectives.length > 0) && ![...tags].some((tag) => tag.startsWith("grammar."))) {
    tags.add("grammar.general");
  }
  if (!tags.size) tags.add("application.transfer");
  return [...tags];
}

export function getSkillTagLabel(tag: string) {
  return SKILL_TAG_LABELS[tag] ?? tag;
}

export const UNITS = GENERATED_UNITS;

const FOUNDATION_QUESTIONS: PracticeQuestion[] = [
  {
    id: "U01-Q01",
    unit: "U01",
    kind: "choice",
    skill: "句子骨架",
    prompt: "The new employee ___ at the front desk.",
    options: [
      { id: "is", label: "is" },
      { id: "are", label: "are" },
      { id: "work", label: "work" },
    ],
    answerId: "is",
    explanation: "主詞 The new employee 是單數，這裡使用 be 動詞 is 表示所在位置。",
    evidence: "S + be + 地點：The new employee is at the front desk.",
    breakdown: "The new employee＝這位新員工；is＝是／位於；at the front desk＝在櫃台。",
    optionReasons: {
      is: "employee 是單數，而且後面是地點 at the front desk，所以用 is。",
      are: "are 要搭配 you／we／they 或複數主詞，不能搭配單數 employee。",
      work: "work 是一般動詞；若用 work，不能直接接成 work at 前還保留這個空格位置的 be 結構。",
    },
    sourceLabel: "U01／G01",
  },
  {
    id: "U01-Q02",
    unit: "U01",
    kind: "choice",
    skill: "主格代名詞",
    prompt: "Ms. Chen is a manager. ___ works in sales.",
    options: [
      { id: "she", label: "She" },
      { id: "her", label: "Her" },
      { id: "they", label: "They" },
    ],
    answerId: "she",
    explanation: "空格是下一句的主詞，要用主格 She；Her 必須放在名詞前或作受格。",
    evidence: "She works in sales. She 是 works 的主詞。",
    breakdown: "Ms. Chen＝陳女士；is a manager＝是一位經理；She＝她（主格）；works in sales＝在業務部門工作。",
    optionReasons: {
      she: "空格自己當 works 的主詞，所以要用主格 She。",
      her: "Her 不能單獨放在這裡當 works 的主詞。",
      they: "前句只有 Ms. Chen 一個人，代名詞要維持單數。",
    },
    sourceLabel: "U01／G08",
  },
  {
    id: "U01-Q03",
    unit: "U01",
    kind: "choice",
    skill: "複數主詞",
    prompt: "The employees ___ in the office.",
    options: [
      { id: "work", label: "work" },
      { id: "works", label: "works" },
      { id: "is-work", label: "is work" },
    ],
    answerId: "work",
    explanation: "employees 是複數，現在簡單式用原形 work；works 只搭配第三人稱單數。",
    evidence: "複數主詞 employees + work：The employees work in the office.",
    breakdown: "The employees＝這些員工；work＝工作；in the office＝在辦公室裡。",
    optionReasons: {
      work: "employees 是複數，現在簡單式使用原形 work。",
      works: "works 只用在 he／she／it 或其他第三人稱單數主詞。",
      "is-work": "be 動詞後不能直接接一般動詞原形 work；要嘛用 work，要嘛是 is working。",
    },
    sourceLabel: "U01／G01",
  },
  {
    id: "U01-Q04",
    unit: "U01",
    kind: "choice",
    skill: "受格代名詞",
    prompt: "Please give ___ the form. Mr. Lee is waiting for it.",
    options: [
      { id: "him", label: "him" },
      { id: "he", label: "he" },
      { id: "his", label: "his" },
    ],
    answerId: "him",
    explanation: "give 後面是接受動作的人，使用受格 him；he 是主格，his 是所有格。",
    evidence: "give + 人 + 物：give him the form.",
    breakdown: "Please give＝請交給；him＝他（受格，指 Mr. Lee）；the form＝這份表格；is waiting for it＝正在等它。",
    optionReasons: {
      him: "give 後面要放接受東西的人，所以用受格 him。",
      he: "he 是主格，通常放在句子的主詞位置，不能直接放在 give 後面當受詞。",
      his: "his 表示『他的』，後面通常還要接名詞，例如 his form。",
    },
    sourceLabel: "U01／G08",
  },
  {
    id: "U01-Q05",
    unit: "U01",
    kind: "output",
    skill: "短輸出",
    prompt: "把下面的意思寫成英文。",
    outputPrompt: "我在辦公室工作。",
    referenceAnswer: "I work in an office. / I work in the office.",
    explanation: "一般動詞 work 直接放在主詞 I 後面，不要寫成 I am work。an office 指某一間辦公室；the office 指雙方知道的那間辦公室。",
    evidence: "I + work + 地點：I work in an office.",
    breakdown: "I＝我；work＝工作；in＝在……裡面；an/the office＝一間／那間辦公室。",
    sourceLabel: "U01／短輸出",
  },
  {
    id: "U02-Q01",
    unit: "U02",
    kind: "choice",
    skill: "第三人稱單數",
    prompt: "Mr. Ito ___ the early shift.",
    options: [
      { id: "works", label: "works" },
      { id: "work", label: "work" },
      { id: "is-work", label: "is work" },
    ],
    answerId: "works",
    explanation: "Mr. Ito 是第三人稱單數，現在簡單式的一般動詞要加 -s：works。",
    evidence: "He works the early shift. 第三人稱單數 + verb-s。",
    breakdown: "Mr. Ito＝伊藤先生；works＝工作／上班（第三人稱單數）；the early shift＝早班。",
    optionReasons: {
      works: "Mr. Ito 可換成 he，所以現在簡單式用 works。",
      work: "work 搭配 I／you／we／they；第三人稱單數要加 -s。",
      "is-work": "be 動詞不能直接接一般動詞原形 work。",
    },
    sourceLabel: "U02／G02",
  },
  {
    id: "U02-Q02",
    unit: "U02",
    kind: "choice",
    skill: "Does 問句",
    prompt: "___ the train leave at 7:20?",
    options: [
      { id: "does", label: "Does" },
      { id: "do", label: "Do" },
      { id: "is", label: "Is" },
    ],
    answerId: "does",
    explanation: "the train 是單數主詞，使用 Does；Does 已經表達第三人稱變化，leave 維持原形。",
    evidence: "Does + the train + leave...?",
    breakdown: "Does＝助動詞（第三人稱單數問句）；the train＝這班火車；leave＝離開／發車；at 7:20＝在 7:20。",
    optionReasons: {
      does: "the train 是第三人稱單數，所以一般現在式問句用 Does。",
      do: "Do 通常搭配 I／you／we／they 或複數主詞。",
      is: "leave 是一般動詞，不能用 Is the train leave...? 這種結構。",
    },
    sourceLabel: "U02／G02／G18",
  },
  {
    id: "U02-Q03",
    unit: "U02",
    kind: "choice",
    skill: "現在進行式",
    prompt: "Look—several passengers ___ on platform three.",
    options: [
      { id: "are-waiting", label: "are waiting" },
      { id: "wait", label: "wait" },
      { id: "is-waiting", label: "is waiting" },
    ],
    answerId: "are-waiting",
    explanation: "Look 表示眼前正在發生；several passengers 是複數，所以用 are waiting。",
    evidence: "現在進行式：主詞 + am/is/are + V-ing。",
    breakdown: "Look＝你看；several passengers＝幾位乘客；are waiting＝正在等；on platform three＝在三號月台。",
    optionReasons: {
      "are-waiting": "Look 指向眼前正在發生的動作，複數 passengers 搭配 are waiting。",
      wait: "wait 是一般現在式，較像習慣或常態，和 Look 指出的眼前動作不合。",
      "is-waiting": "passengers 是複數，不能搭配 is。",
    },
    sourceLabel: "U02／G05",
  },
  {
    id: "U02-Q04",
    unit: "U02",
    kind: "choice",
    skill: "時間搭配",
    prompt: "I commute by train ___ weekday.",
    options: [
      { id: "every", label: "every" },
      { id: "during", label: "during" },
      { id: "while", label: "while" },
    ],
    answerId: "every",
    explanation: "every weekday 直接表示「每個平日」。during 與 while 都不能直接放在這個空格後接單數 weekday。",
    evidence: "I commute by train every weekday.",
    breakdown: "I commute＝我通勤；by train＝搭火車；every weekday＝每個平日。",
    optionReasons: {
      every: "every weekday 本身就是時間副詞片語，前面不需要介系詞。",
      during: "during 後面若要接 weekday，需要其他結構；during weekday 不能表達「每個平日」。",
      while: "while 通常接子句，例如 while I commute；不能說 while weekday。",
    },
    sourceLabel: "U02／G02／搭配",
  },
  {
    id: "U02-Q05",
    unit: "U02",
    kind: "choice",
    skill: "助動詞後原形",
    prompt: "Does Mina usually ___ on time?",
    options: [
      { id: "arrive", label: "arrive" },
      { id: "arrives", label: "arrives" },
      { id: "arriving", label: "arriving" },
    ],
    answerId: "arrive",
    explanation: "Does 已經承擔第三人稱單數，後面的主要動詞回到原形 arrive。",
    evidence: "Does + Mina + usually + arrive...?",
    breakdown: "Does Mina＝Mina 是否……；usually＝通常；arrive＝抵達；on time＝準時。",
    optionReasons: {
      arrive: "Does 已經帶出第三人稱單數，後面的動詞用原形 arrive。",
      arrives: "不能同時讓 Does 和 arrives 都帶第三人稱變化。",
      arriving: "Does 後面要接原形動詞，不接 V-ing。",
    },
    sourceLabel: "U02／G02／G18",
  },
  {
    id: "U02-Q06",
    unit: "U02",
    kind: "output",
    skill: "短輸出",
    prompt: "把下面的意思寫成英文。",
    outputPrompt: "我每個平日搭火車通勤。",
    referenceAnswer: "I commute by train every weekday.",
    explanation: "I 後面用 commute；交通方式使用 commute by train；every weekday 表示每個平日。",
    evidence: "I commute by train every weekday.",
    breakdown: "I＝我；commute＝通勤；by train＝搭火車；every weekday＝每個平日。",
    sourceLabel: "U02／短輸出",
  },
  {
    id: "U02-Q07",
    unit: "U02",
    kind: "output",
    skill: "短輸出",
    prompt: "把下面的意思寫成英文。",
    outputPrompt: "她現在正在三號月台等車。",
    referenceAnswer: "She is waiting for the train at platform three now.",
    acceptedAnswers: [
      "She is waiting for the train at platform three now.",
      "She is waiting for the train at platform three.",
      "She is waiting for a train at platform three now.",
      "She is waiting for a train at platform three.",
      "She is waiting for the train on platform three now.",
      "She is waiting on platform three now.",
    ],
    explanation: "is waiting 表示現在正在等；wait for the train 明確翻出「等車」。at platform three 與 on platform three 都可表達人在三號月台的位置。",
    evidence: "She + is waiting for the train + at platform three + now.",
    breakdown: "She＝她；is waiting for the train＝正在等車；at/on platform three＝在三號月台；now＝現在。",
    sourceLabel: "U02／G05 短輸出",
  },
  {
    id: "U02-Q08",
    unit: "U02",
    kind: "choice",
    skill: "主詞動詞一致",
    prompt: "Every train on this route ___ at Central Station.",
    options: [
      { id: "stops", label: "stops" },
      { id: "stop", label: "stop" },
      { id: "stopping", label: "stopping" },
    ],
    answerId: "stops",
    explanation: "every + 單數名詞會形成單數主詞；現在簡單式因此用 stops。",
    evidence: "G03 基礎：Every train ... stops at Central Station.",
    breakdown: "Every train＝每一班火車（單數核心）；on this route＝插入的路線資訊；stops＝第三人稱單數動詞。",
    optionReasons: {
      stops: "主詞核心是單數 train，所以現在簡單式用 stops。",
      stop: "stop 要搭配複數主詞或 I／you／we／they；every train 是單數。",
      stopping: "這裡描述固定路線，不是 be + V-ing 的進行式。",
    },
    sourceLabel: "U02／G03 基礎",
  },
  {
    id: "U02-Q09",
    unit: "U02",
    kind: "choice",
    skill: "時間介系詞",
    prompt: "Choose the set that completes the sentence: The train leaves ___ 7:20, has extra service ___ Monday, and is busiest ___ the morning.",
    options: [
      { id: "at-on-in", label: "at / on / in" },
      { id: "on-at-in", label: "on / at / in" },
      { id: "in-on-at", label: "in / on / at" },
    ],
    answerId: "at-on-in",
    explanation: "精確時刻用 at；星期用 on；morning／afternoon／evening 這類時段用 in。這三個都是 U02 藍圖的固定目標。",
    evidence: "The train leaves at 7:20, has extra service on Monday, and is busiest in the morning.",
    breakdown: "at 7:20＝在 7:20；on Monday＝在星期一；in the morning＝在早上。",
    optionReasons: {
      "at-on-in": "依序符合時刻、星期、時段三種時間搭配。",
      "on-at-in": "時刻不能用 on，星期也不能用 at。",
      "in-on-at": "精確時刻不用 in，morning 這種時段也通常不用 at。",
    },
    sourceLabel: "U02／時間介系詞固定目標",
  },
];

export const QUESTIONS: readonly PracticeQuestion[] = [
  ...FOUNDATION_QUESTIONS,
  ...(GENERATED_QUESTIONS as readonly PracticeQuestion[]),
];

export function getQuestion(id: string) {
  return QUESTIONS.find((question) => question.id === id);
}

const BBC_VOCABULARY: VocabularyEntry[] = UNITS.flatMap((unit) =>
  unit.words.map((word) => ({
    id: `${unit.id}::${word.item}`,
    canonicalId: word.detail.match(/(?:BBC-V\d{3}|U\d{2}-[ABC]\d{2})/)?.[0],
    unit: unit.id,
    unitTitle: unit.title,
    stage: unit.stage,
    item: word.item,
    detail: word.detail,
    source: "bbc" as const,
  })),
);

const ACTION_STARTS = new Set([
  "answer", "apologize", "apply", "approve", "arrange", "arrive", "ask", "assess", "assign", "assist", "attach", "attend",
  "borrow", "board", "book", "bring", "build", "calculate", "call", "cancel", "carry", "change", "check", "choose", "classify",
  "click", "collect", "compare", "complete", "comply", "conduct", "confirm", "conserve", "contact", "continue", "coordinate", "deliver",
  "depart", "enter", "eliminate", "exchange", "explain", "facilitate", "file", "fill", "find", "finish", "follow", "get", "grant",
  "hear", "hold", "host", "identify", "implement", "improve", "include", "increase", "infer", "inspect", "install", "interpret", "issue",
  "join", "keep", "leave", "lean", "lend", "look", "maintain", "make", "manage", "meet", "monitor", "negotiate", "notify", "obtain",
  "omit", "open", "operate", "order", "overlook", "participate", "pay", "place", "post", "postpone", "prepare", "proceed", "produce",
  "protect", "provide", "reach", "read", "receive", "recognize", "record", "recycle", "reduce", "register", "remain", "remind", "renew",
  "repair", "repeat", "replace", "reply", "report", "request", "require", "reserve", "reschedule", "resolve", "respond", "retire", "retry",
  "return", "review", "schedule", "select", "send", "show", "sign", "sit", "speak", "stand", "start", "stay", "submit", "suggest",
  "take", "target", "track", "transfer", "turn", "update", "use", "verify", "visit", "wait", "walk", "work",
]);

const CORE_SPECIAL_EXAMPLES: Record<string, string> = {
  "U01-A01": "I spoke with a person in the office.",
  "U01-B03": "Please ask for the form at the front desk.",
  "U01-C01": "The meeting is at company headquarters.",
  "U02-A03": "We discussed commuting by train during the meeting.",
  "U02-A05": "The train arrived on time.",
  "U02-A06": "There was a thirty-minute delay this morning.",
  "U02-B01": "I commute by train on weekdays.",
  "U02-B03": "Our train leaves from platform number three.",
  "U02-C01": "We discussed the travel itinerary during the meeting.",
  "U04-A03": "The train was delayed; as a result, we arrived late.",
  "U04-B01": "The technician checked a broken machine.",
  "U04-B03": "I wanted to buy it; however, the store is closed.",
  "U04-B04": "The flight was delayed because of the weather.",
  "U05-A06": "The building has an accessible entrance.",
  "U06-B03": "The elevator is under repair.",
  "U06-B04": "The room is ready for use.",
  "U07-A01": "The meeting room is available after two.",
  "U07-A05": "The store is open until six.",
  "U07-A06": "Please submit it by Thursday.",
  "U07-B02": "The room is occupied.",
  "U08-B03": "According to the schedule, the meeting starts at nine.",
  "U09-A05": "The team has already finished the first task.",
  "U09-A06": "The package has not arrived yet.",
  "U09-B04": "The project is behind schedule.",
  "U11-B01": "The item is back in stock.",
  "U11-B02": "The laptop is still under warranty.",
  "U11-C02": "You may be eligible for a refund.",
  "U12-A05": "Our flight was delayed by an hour.",
  "U13-B03": "The package is in transit.",
  "U16-A01": "What is the purpose of this notice?",
  "U16-A02": "What will probably happen next?",
  "U16-A03": "What is mentioned about the new policy?",
  "U16-A04": "What does the notice indicate?",
  "U16-A05": "What is suggested about the schedule?",
  "U16-A06": "What does ‘it’ refer to?",
  "U16-B01": "What is the talk mainly about?",
  "U16-B02": "Mina is responsible for the weekly report.",
  "U16-C01": "What does the speaker imply?",
  "U16-C02": "She is likely to attend the meeting.",
  "U17-A06": "The files are on a shelf near the door.",
  "U17-B02": "The new products are displayed near the entrance.",
  "U17-B03": "The boxes are stacked beside the wall.",
  "U17-B04": "There are trees along the path.",
  "U17-C01": "The lights are reflected in the window.",
  "U17-C02": "The lights are suspended overhead.",
  "U18-B04": "The meeting can be either Monday or Tuesday.",
  "U19-A04": "She was promoted to manager last month.",
  "U21-C01": "The ticket machine is temporarily unavailable.",
  "U22-A01": "I planned to attend; however, the date changed.",
  "U22-A02": "The time changed; therefore, please confirm your booking.",
  "U22-A03": "Although the store is closed, online orders are available.",
  "U22-A04": "Despite the delay, we arrived before the meeting started.",
  "U22-A05": "Please keep your phone silent during the meeting.",
  "U22-A06": "Please wait while the system is updating.",
  "U22-B01": "The venue is convenient; furthermore, parking is free.",
  "U22-B02": "Please reply today; otherwise, contact us tomorrow.",
  "U22-B03": "We updated the schedule in response to your request.",
  "U22-B04": "The meeting moved as a result of the change.",
  "U22-C01": "The venue was unavailable; consequently, the event moved.",
  "U22-C02": "This plan is faster, whereas the other plan is cheaper.",
  "U23-B03": "More information is available upon request.",
  "U23-B04": "This coupon is valid until June.",
  "U24-A04": "The payment is due on Friday.",
  "U24-B03": "Please pay the outstanding balance by Friday.",
  "U25-B04": "Wheelchair access is available at the main entrance.",
  "U26-B03": "Lena is responsible for delivery.",
  "U26-B04": "We handled the request in accordance with the policy.",
  "U28-B03": "The train was delayed by twenty minutes.",
  "U20-B03": "The system can update automatically overnight.",
  "U35-B01": "The test uses a scaled score.",
  "U38-B03": "No item should remain blank at the end of the test.",
  "U39-A03": "Scores can fluctuate from one test to another.",
};

function makeCoreExample(row: CoreVocabularyRow) {
  const special = CORE_SPECIAL_EXAMPLES[row.id];
  if (special) return special;

  const collocation = row.collocation.trim().replace(/\s+/g, " ");
  if (/^[“\"]/.test(collocation) || /[.!?]$/.test(collocation)) return collocation;
  if (/^(who|where|when|why|how|which|could you|would you|why don.t we)/i.test(collocation)) return `${collocation}?`;

  const lower = collocation.toLocaleLowerCase();
  const firstWord = lower.split(/[\s,]+/)[0];
  if (ACTION_STARTS.has(firstWord)) return `We need to ${collocation}.`;
  if (firstWord === "be") return `You need to ${collocation}.`;
  if (/^(the |payment |products |boxes |lights |scores |no item |wheelchair access )/i.test(collocation) && /\b(is|are|has|have|should|can|will|expires|fluctuate)\b/i.test(collocation)) {
    return `${collocation.charAt(0).toUpperCase()}${collocation.slice(1)}.`;
  }
  if (/^(in stock|under warranty|in transit)$/i.test(collocation)) return `The item is ${collocation}.`;
  if (/^eligible\b/i.test(collocation)) return `You may be ${collocation}.`;
  if (/^delayed\b/i.test(collocation)) return `The service was ${collocation}.`;
  if (/^(available|temporarily unavailable)\b/i.test(collocation)) return `The service is ${collocation}.`;
  if (/^valid\b/i.test(collocation)) return `The ticket is ${collocation}.`;
  if (/^(however|therefore|furthermore|otherwise|consequently),/i.test(collocation)) return `${collocation.charAt(0).toUpperCase()}${collocation.slice(1)}.`;

  // The old catch-all "We discussed ${collocation}" template turned bare
  // verb phrases (for example "commute by train") into ungrammatical
  // sentences and omitted determiners from many singular noun phrases.
  if (/^v\./i.test(row.partOfSpeech)) return `We need to ${collocation}.`;

  const hasDeterminer = /^(?:a|an|the|my|your|our|their|this|that|these|those|some|any|no|each|every|another)\b/i.test(collocation);
  if (/^(?:n\.|adj\.)/i.test(row.partOfSpeech)) {
    return `We discussed ${hasDeterminer ? collocation : `the ${collocation}`} during the meeting.`;
  }

  return `We discussed the phrase “${collocation}” during the meeting.`;
}

function normalizeOutputAnswer(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getAcceptedOutputAnswers(question: PracticeQuestion) {
  if (question.kind !== "output") return [];
  if (question.acceptedAnswers?.length) return [...question.acceptedAnswers];
  return (question.referenceAnswer ?? "")
    .split(/\s*\/\s*/)
    .map((answer) => answer.trim())
    .filter(Boolean);
}

export function matchesAcceptedOutput(question: PracticeQuestion, answer: string) {
  const normalized = normalizeOutputAnswer(answer);
  return Boolean(normalized) && getAcceptedOutputAnswers(question).some((candidate) => normalizeOutputAnswer(candidate) === normalized);
}

const UNIT_BY_ID = new Map(UNITS.map((unit) => [unit.id, unit]));
const BBC_VOCABULARY_KEYS = new Set(BBC_VOCABULARY.map((entry) => `${entry.unit}\u0000${entry.item.toLocaleLowerCase()}`));
const CORE_ROW_BY_KEY = new Map(CORE_VOCABULARY_ROWS.map((row) => [`${row.unit}\u0000${row.item.toLocaleLowerCase()}`, row]));
const ENRICHED_BBC_VOCABULARY: VocabularyEntry[] = BBC_VOCABULARY.map((entry) => {
  const core = CORE_ROW_BY_KEY.get(`${entry.unit}\u0000${entry.item.toLocaleLowerCase()}`);
  if (!core) return entry;
  return {
    ...entry,
    level: core.level,
    partOfSpeech: core.partOfSpeech,
    meaning: core.meaning,
    collocation: core.collocation,
    example: makeCoreExample(core),
  };
});

const ALL_CORE_VOCABULARY: VocabularyEntry[] = CORE_VOCABULARY_ROWS.map((row) => {
    const unit = UNIT_BY_ID.get(row.unit as UnitId);
    if (!unit) throw new Error(`Unknown vocabulary unit: ${row.unit}`);
    const example = makeCoreExample(row);
    return {
      id: row.id,
      canonicalId: row.id,
      unit: unit.id,
      unitTitle: unit.title,
      stage: unit.stage,
      item: row.item,
      detail: `${row.meaning} · ${row.collocation} · ${example}`,
      source: "core" as const,
      level: row.level,
      partOfSpeech: row.partOfSpeech,
      meaning: row.meaning,
      collocation: row.collocation,
      example,
    };
  });

// Reading has 709 surface occurrences: 700 official memory concepts, eight
// repeated appearances that share a canonical ID, and one non-canonical
// grammar-review phrase. Keep those occurrences for in-context lookup, but do
// not turn them into separate FSRS cards.
const CORE_VOCABULARY_OCCURRENCES = ALL_CORE_VOCABULARY.filter(
  (entry) => !BBC_VOCABULARY_KEYS.has(`${entry.unit}\u0000${entry.item.toLocaleLowerCase()}`),
);

export const VOCABULARY_OCCURRENCES: readonly VocabularyEntry[] = [
  ...ENRICHED_BBC_VOCABULARY,
  ...CORE_VOCABULARY_OCCURRENCES,
].sort((a, b) => {
  const unitOrder = a.unit.localeCompare(b.unit);
  if (unitOrder !== 0) return unitOrder;
  if (a.source !== b.source) return a.source === "bbc" ? -1 : 1;
  return a.item.localeCompare(b.item, "en");
});

const VOCABULARY_CONCEPTS = new Map<string, VocabularyEntry>();
for (const entry of ALL_CORE_VOCABULARY) {
  VOCABULARY_CONCEPTS.set(entry.id, entry);
}
for (const entry of ENRICHED_BBC_VOCABULARY) {
  if (!entry.canonicalId || VOCABULARY_CONCEPTS.has(entry.canonicalId)) continue;
  VOCABULARY_CONCEPTS.set(entry.canonicalId, { ...entry, id: entry.canonicalId });
}

export const VOCABULARY: readonly VocabularyEntry[] = [...VOCABULARY_CONCEPTS.values()].sort((a, b) => {
  const unitOrder = a.unit.localeCompare(b.unit);
  if (unitOrder !== 0) return unitOrder;
  if (a.source !== b.source) return a.source === "core" ? -1 : 1;
  return a.item.localeCompare(b.item, "en");
});

export function getVocabulary(id: string) {
  return VOCABULARY.find((entry) => entry.id === id)
    ?? VOCABULARY_OCCURRENCES.find((entry) => entry.id === id);
}

export function getVocabularyMemoryId(id: string) {
  const entry = getVocabulary(id);
  const canonicalId = entry?.canonicalId ?? entry?.id;
  return canonicalId && /^(?:U\d{2}-[ABC]\d{2}|BBC-V\d{3})$/.test(canonicalId) ? canonicalId : undefined;
}

export function getVocabularyStorageAliases(canonicalId: string) {
  const aliases = VOCABULARY_OCCURRENCES
    .filter((entry) => (entry.canonicalId ?? entry.id) === canonicalId)
    .map((entry) => entry.id);
  return [...new Set([canonicalId, ...aliases])];
}
