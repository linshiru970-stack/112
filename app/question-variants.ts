import { CORE_VOCABULARY_ROWS } from "./core-vocabulary.generated";
import { GENERATED_UNITS } from "./course-data.generated";
import { GRAMMAR_TRANSFER_SEEDS } from "./grammar-transfer-bank";
import type { PracticeQuestion, UnitId } from "./content";

type VariantMeta = NonNullable<PracticeQuestion["variant"]>;

type ChoiceVariantInput = {
  unit: UnitId;
  family: string;
  pattern: string;
  fingerprint: string;
  skill: string;
  sourceLabel: string;
  prompt: string;
  options: readonly [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  evidence: string;
  breakdown?: string;
  passage?: string;
  listeningText?: string;
};

type OutputVariantInput = {
  unit: UnitId;
  family: string;
  pattern: string;
  fingerprint: string;
  skill: string;
  sourceLabel: string;
  prompt: string;
  outputPrompt: string;
  referenceAnswer: string;
  explanation: string;
  evidence: string;
  breakdown?: string;
};

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function variantMeta(family: string, pattern: string, fingerprint: string): VariantMeta {
  return { family, pattern, fingerprint, version: 1 };
}

function choiceVariant(input: ChoiceVariantInput): PracticeQuestion {
  const ids = ["a", "b", "c"] as const;
  const identity = [
    input.fingerprint,
    input.prompt,
    input.passage ?? "",
    input.listeningText ?? "",
    ...input.options,
  ].join("|");
  return {
    // Question identity and semantic identity are deliberately different.
    // Surface-only changes can share one fingerprint without colliding as
    // stored questions, so they are treated as near-duplicates for evidence.
    id: `VX-${input.unit}-${input.family}-${stableHash(identity)}`,
    unit: input.unit,
    kind: "choice",
    skill: input.skill,
    prompt: input.prompt,
    passage: input.passage,
    listeningText: input.listeningText,
    options: input.options.map((label, index) => ({ id: ids[index], label })),
    answerId: ids[input.answerIndex],
    explanation: input.explanation,
    evidence: input.evidence,
    breakdown: input.breakdown,
    sourceLabel: input.sourceLabel,
    variant: variantMeta(input.family, input.pattern, input.fingerprint),
  };
}

function outputVariant(input: OutputVariantInput): PracticeQuestion {
  const identity = [input.fingerprint, input.prompt, input.outputPrompt, input.referenceAnswer].join("|");
  return {
    id: `VX-${input.unit}-${input.family}-${stableHash(identity)}`,
    unit: input.unit,
    kind: "output",
    skill: input.skill,
    prompt: input.prompt,
    outputPrompt: input.outputPrompt,
    referenceAnswer: input.referenceAnswer,
    explanation: input.explanation,
    evidence: input.evidence,
    breakdown: input.breakdown,
    sourceLabel: input.sourceLabel,
    variant: variantMeta(input.family, input.pattern, input.fingerprint),
  };
}

function buildU01GrammarVariants() {
  const result: PracticeQuestion[] = [];
  const subjects = [
    { key: "employee", text: "The new employee", be: "is", otherBe: "are" },
    { key: "manager", text: "The manager", be: "is", otherBe: "are" },
    { key: "employees", text: "The two employees", be: "are", otherBe: "is" },
    { key: "coworkers", text: "My coworkers", be: "are", otherBe: "is" },
  ] as const;
  const places = [
    { key: "front-desk", text: "at the front desk" },
    { key: "office", text: "in the office" },
    { key: "sales", text: "in the sales department" },
    { key: "window", text: "near the window" },
  ] as const;
  for (const subject of subjects) {
    for (const place of places) {
      result.push(choiceVariant({
        unit: "U01",
        family: "g01-core",
        pattern: "be-place",
        fingerprint: `v1:g01:be-place:${subject.key}:${place.key}`,
        skill: "句子骨架 · 情境遷移",
        sourceLabel: "U01／G01／未見變體",
        prompt: `${subject.text} ___ ${place.text}.`,
        options: [subject.be, subject.otherBe, "work"],
        answerIndex: 0,
        explanation: `這句是在說位置；${subject.text} 要搭配 ${subject.be}。`,
        evidence: `S + be + 地點：${subject.text} ${subject.be} ${place.text}.`,
        breakdown: `${subject.text}＝主詞；${subject.be}＝be 動詞；${place.text}＝地點。`,
      }));
    }
  }

  const actions = [
    { key: "employee-start", subject: "The new employee", correct: "starts", wrong: "start", rest: "work at eight" },
    { key: "manager-work", subject: "The manager", correct: "works", wrong: "work", rest: "in sales" },
    { key: "employees-finish", subject: "The employees", correct: "finish", wrong: "finishes", rest: "at five" },
    { key: "coworkers-work", subject: "My coworkers", correct: "work", wrong: "works", rest: "in the same department" },
    { key: "employee-work", subject: "One employee", correct: "works", wrong: "work", rest: "near the station" },
    { key: "managers-start", subject: "Two managers", correct: "start", wrong: "starts", rest: "at nine" },
  ] as const;
  for (const action of actions) {
    result.push(choiceVariant({
      unit: "U01",
      family: "g01-core",
      pattern: "subject-verb",
      fingerprint: `v1:g01:subject-verb:${action.key}`,
      skill: "句子主幹 · 情境遷移",
      sourceLabel: "U01／G01／未見變體",
      prompt: `${action.subject} ___ ${action.rest}.`,
      options: [action.correct, action.wrong, "is work"],
      answerIndex: 0,
      explanation: `先找主詞 ${action.subject}，再決定一般動詞形式；這裡要用 ${action.correct}。`,
      evidence: `${action.subject} ${action.correct} ${action.rest}.`,
    }));
  }

  const pronouns = [
    { key: "chen-subject", lead: "Ms. Chen is a manager.", prompt: "___ works in sales.", correct: "She", wrongCase: "Her", wrongPerson: "They" },
    { key: "lee-subject", lead: "Mr. Lee is a new employee.", prompt: "___ starts at eight.", correct: "He", wrongCase: "Him", wrongPerson: "They" },
    { key: "staff-subject", lead: "Mina and Leo are coworkers.", prompt: "___ work in the same office.", correct: "They", wrongCase: "Them", wrongPerson: "She" },
    { key: "chen-object", lead: "Ms. Chen is waiting for the form.", prompt: "Please give ___ the form.", correct: "her", wrongCase: "she", wrongPerson: "their" },
    { key: "lee-object", lead: "Mr. Lee needs the key.", prompt: "Please give ___ the key.", correct: "him", wrongCase: "he", wrongPerson: "his" },
    { key: "staff-object", lead: "The two employees need the schedule.", prompt: "Please show ___ the schedule.", correct: "them", wrongCase: "they", wrongPerson: "their" },
  ] as const;
  for (const item of pronouns) {
    result.push(choiceVariant({
      unit: "U01",
      family: "g08-pronoun",
      pattern: item.key.includes("object") ? "object-pronoun" : "subject-pronoun",
      fingerprint: `v1:g08:${item.key}`,
      skill: "代名詞 · 情境遷移",
      sourceLabel: "U01／G08／未見變體",
      prompt: `${item.lead} ${item.prompt}`,
      options: [item.correct, item.wrongCase, item.wrongPerson],
      answerIndex: 0,
      explanation: item.key.includes("object") ? "空格接受前面動詞的動作，要用受格。" : "空格自己是下一句的主詞，要用主格。",
      evidence: `${item.lead} ${item.prompt.replace("___", item.correct)}`,
    }));
  }

  const outputs = [
    ["work-office", "我在辦公室工作。", "I work in an office. / I work in the office."],
    ["manager-sales", "她是業務部門的經理。", "She is a manager in the sales department."],
    ["employees-desk", "這兩位員工在櫃台。", "The two employees are at the front desk."],
    ["coworkers-office", "我的同事在同一間辦公室工作。", "My coworkers work in the same office."],
    ["start-eight", "我八點開始工作。", "I start work at eight."],
    ["finish-five", "我們五點下班。", "We finish work at five."],
  ] as const;
  for (const [key, chinese, answer] of outputs) {
    result.push(outputVariant({
      unit: "U01",
      family: "u01-output",
      pattern: "short-output",
      fingerprint: `v1:u01:output:${key}`,
      skill: "短輸出 · 情境遷移",
      sourceLabel: "U01／G01／短輸出／未見變體",
      prompt: "把下面的意思寫成英文。",
      outputPrompt: chinese,
      referenceAnswer: answer,
      explanation: "先用 U01 的主詞＋be／一般動詞骨架完成意思，再檢查地點片語。",
      evidence: answer,
    }));
  }
  return result;
}

const U02_SCENARIOS = [
  { key: "mina-commute", subject: "Mina", pronoun: "she", base: "commute", third: "commutes", ing: "commuting", rest: "by train" },
  { key: "ito-shift", subject: "Mr. Ito", pronoun: "he", base: "work", third: "works", ing: "working", rest: "the early shift" },
  { key: "train-leave", subject: "The train", pronoun: "it", base: "leave", third: "leaves", ing: "leaving", rest: "from platform three" },
  { key: "shuttle-arrive", subject: "The shuttle", pronoun: "it", base: "arrive", third: "arrives", ing: "arriving", rest: "at Central Station" },
  { key: "store-open", subject: "The station store", pronoun: "it", base: "open", third: "opens", ing: "opening", rest: "at nine" },
  { key: "manager-start", subject: "The manager", pronoun: "she", base: "start", third: "starts", ing: "starting", rest: "work at eight" },
  { key: "technician-finish", subject: "The technician", pronoun: "he", base: "finish", third: "finishes", ing: "finishing", rest: "work at five" },
  { key: "employee-check", subject: "The employee", pronoun: "she", base: "check", third: "checks", ing: "checking", rest: "the departure board" },
  { key: "ferry-depart", subject: "The ferry", pronoun: "it", base: "depart", third: "departs", ing: "departing", rest: "at 6:30" },
  { key: "station-close", subject: "The station", pronoun: "it", base: "close", third: "closes", ing: "closing", rest: "at midnight" },
  { key: "nina-walk", subject: "Nina", pronoun: "she", base: "walk", third: "walks", ing: "walking", rest: "to the station" },
  { key: "leo-cycle", subject: "Leo", pronoun: "he", base: "cycle", third: "cycles", ing: "cycling", rest: "to work" },
] as const;

function buildU02GrammarVariants() {
  const result: PracticeQuestion[] = [];
  const frequencies = ["usually", "often", "normally", "always"] as const;
  for (const scenario of U02_SCENARIOS) {
    for (const frequency of frequencies) {
      result.push(choiceVariant({
        unit: "U02",
        family: "g02-routine",
        pattern: "third-person-statement",
        fingerprint: `v1:g02:statement:${scenario.key}`,
        skill: "第三人稱單數 · 情境遷移",
        sourceLabel: "U02／G02／未見變體",
        prompt: `${scenario.subject} ${frequency} ___ ${scenario.rest}.`,
        options: [scenario.third, scenario.base, scenario.ing],
        answerIndex: 0,
        explanation: `${scenario.subject} 是第三人稱單數；一般現在式肯定句用 ${scenario.third}。`,
        evidence: `${scenario.subject} ${frequency} ${scenario.third} ${scenario.rest}.`,
      }));
      result.push(choiceVariant({
        unit: "U02",
        family: "g02-routine",
        pattern: "does-base",
        fingerprint: `v1:g02:does-base:${scenario.key}`,
        skill: "Does 問句 · 情境遷移",
        sourceLabel: "U02／G02／G18／未見變體",
        prompt: `Does ${scenario.subject} ${frequency} ___ ${scenario.rest}?`,
        options: [scenario.base, scenario.third, scenario.ing],
        answerIndex: 0,
        explanation: `Does 已經承擔第三人稱變化，後面的主要動詞回到原形 ${scenario.base}。`,
        evidence: `Does + ${scenario.subject} + ${frequency} + ${scenario.base} ...?`,
      }));
      result.push(choiceVariant({
        unit: "U02",
        family: "g02-routine",
        pattern: "does-not-base",
        fingerprint: `v1:g02:negative:${scenario.key}`,
        skill: "一般現在式否定 · 情境遷移",
        sourceLabel: "U02／G02／未見變體",
        prompt: `${scenario.subject} doesn't ${frequency} ___ ${scenario.rest}.`,
        options: [scenario.base, scenario.third, scenario.ing],
        answerIndex: 0,
        explanation: `doesn't 後面接原形，所以用 ${scenario.base}。`,
        evidence: `${scenario.subject} doesn't ${frequency} ${scenario.base} ${scenario.rest}.`,
      }));
      result.push(choiceVariant({
        unit: "U02",
        family: "g18-question-form",
        pattern: "auxiliary-choice",
        fingerprint: `v1:g18:auxiliary:${scenario.key}`,
        skill: "基本問句 · 情境遷移",
        sourceLabel: "U02／G02／G18／未見變體",
        prompt: `___ ${scenario.subject} ${frequency} ${scenario.base} ${scenario.rest}?`,
        options: ["Does", "Do", "Is"],
        answerIndex: 0,
        explanation: `${scenario.subject} 是第三人稱單數，而且主要動詞是 ${scenario.base}，所以一般現在式問句用 Does。`,
        evidence: `Does ${scenario.subject} ${frequency} ${scenario.base} ${scenario.rest}?`,
      }));
    }
  }

  const agreement = [
    { key: "two-trains-leave", subject: "Two trains", correct: "leave", wrong: "leaves", rest: "before eight" },
    { key: "one-train-leaves", subject: "One train", correct: "leaves", wrong: "leave", rest: "at 7:20" },
    { key: "passengers-check", subject: "Several passengers", correct: "check", wrong: "checks", rest: "the departure board" },
    { key: "worker-checks", subject: "The station worker", correct: "checks", wrong: "check", rest: "the platform number" },
    { key: "buses-arrive", subject: "The buses", correct: "arrive", wrong: "arrives", rest: "on time" },
    { key: "bus-arrives", subject: "The bus", correct: "arrives", wrong: "arrive", rest: "on time" },
    { key: "employees-start", subject: "The employees", correct: "start", wrong: "starts", rest: "at eight" },
    { key: "employee-starts", subject: "One employee", correct: "starts", wrong: "start", rest: "at eight" },
  ] as const;
  for (const item of agreement) {
    result.push(choiceVariant({
      unit: "U02",
      family: "g03-agreement",
      pattern: "basic-number-agreement",
      fingerprint: `v1:g03:basic:${item.key}`,
      skill: "主詞動詞一致 · 情境遷移",
      sourceLabel: "U02／G03 基礎／未見變體",
      prompt: `${item.subject} ___ ${item.rest}.`,
      options: [item.correct, item.wrong, "is work"],
      answerIndex: 0,
      explanation: `先看主詞核心 ${item.subject} 的單複數，再決定動詞形式；這裡用 ${item.correct}。`,
      evidence: `${item.subject} ${item.correct} ${item.rest}.`,
    }));
  }

  const progressing = [
    { key: "mina-wait", subject: "Mina", correct: "is waiting", simple: "waits", wrongBe: "are waiting", rest: "on platform three" },
    { key: "passengers-wait", subject: "Several passengers", correct: "are waiting", simple: "wait", wrongBe: "is waiting", rest: "near the gate" },
    { key: "technician-check", subject: "The technician", correct: "is checking", simple: "checks", wrongBe: "are checking", rest: "the machine" },
    { key: "employees-talk", subject: "Two employees", correct: "are talking", simple: "talk", wrongBe: "is talking", rest: "near the desk" },
    { key: "train-arrive", subject: "The train", correct: "is arriving", simple: "arrives", wrongBe: "are arriving", rest: "at platform two" },
    { key: "manager-speak", subject: "The manager", correct: "is speaking", simple: "speaks", wrongBe: "are speaking", rest: "to a coworker" },
    { key: "workers-load", subject: "The workers", correct: "are loading", simple: "load", wrongBe: "is loading", rest: "the boxes" },
    { key: "courier-carry", subject: "A courier", correct: "is carrying", simple: "carries", wrongBe: "are carrying", rest: "a package" },
  ] as const;
  const signals = ["Look—", "Right now,", "At the moment,", "Now,"] as const;
  for (const action of progressing) {
    for (const signal of signals) {
      result.push(choiceVariant({
        unit: "U02",
        family: "g05-progressive",
        pattern: "current-action",
        fingerprint: `v1:g05:now:${action.key}`,
        skill: "現在進行式 · 情境遷移",
        sourceLabel: "U02／G05／未見變體",
        prompt: `${signal} ${action.subject} ___ ${action.rest}.`,
        options: [action.correct, action.simple, action.wrongBe],
        answerIndex: 0,
        explanation: `${signal.replace(/[,—]/g, "")} 指向眼前正在發生的動作；${action.subject} 要用 ${action.correct}。`,
        evidence: `${action.subject} ${action.correct} ${action.rest}.`,
      }));
    }
  }

  const timeFrames = [
    ["weekday", "I commute by train ___ weekday.", "every"],
    ["morning", "I check the departure board ___ morning.", "every"],
    ["monday", "Mina takes the early train ___ Monday.", "every"],
    ["week", "The schedule changes ___ week.", "every"],
    ["evening", "Leo walks home ___ evening.", "every"],
    ["friday", "The manager checks the shift list ___ Friday.", "every"],
  ] as const;
  for (const [key, prompt, answer] of timeFrames) {
    result.push(choiceVariant({
      unit: "U02",
      family: "g02-time",
      pattern: "every-time",
      fingerprint: `v1:g02:every:${key}`,
      skill: "時間搭配 · 情境遷移",
      sourceLabel: "U02／G02／搭配／未見變體",
      prompt,
      options: [answer, `on ${answer}`, `in ${answer}`],
      answerIndex: 0,
      explanation: `${answer} + 時間名詞本身就能形成頻率時間片語，這裡前面不再加 on／in。`,
      evidence: prompt.replace("___", answer),
    }));
  }

  const timePrepositions = [
    ["at-720", "The train leaves ___ 7:20.", "at", "on", "in"],
    ["at-noon", "The station store closes ___ noon today.", "at", "on", "in"],
    ["at-nine", "Mina starts work ___ nine o'clock.", "at", "on", "in"],
    ["at-midnight", "The last bus arrives ___ midnight.", "at", "on", "in"],
    ["on-monday", "The early shift begins ___ Monday.", "on", "at", "in"],
    ["on-friday", "The timetable changes ___ Friday.", "on", "at", "in"],
    ["on-tuesday", "Leo works from home ___ Tuesday.", "on", "at", "in"],
    ["on-sunday", "The station store is closed ___ Sunday.", "on", "at", "in"],
    ["in-morning", "The platform is busiest ___ the morning.", "in", "on", "at"],
    ["in-afternoon", "The manager checks the schedule ___ the afternoon.", "in", "on", "at"],
    ["in-evening", "The trains are less crowded ___ the evening.", "in", "on", "at"],
    ["in-august", "The new timetable starts ___ August.", "in", "on", "at"],
  ] as const;
  for (const [key, prompt, correct, wrong1, wrong2] of timePrepositions) {
    result.push(choiceVariant({
      unit: "U02",
      family: "u02-time-prepositions",
      pattern: key.split("-")[0],
      fingerprint: `v2:u02:time-preposition:${key}`,
      skill: "時間介系詞 · 情境遷移",
      sourceLabel: "U02／時間介系詞基礎／未見變體",
      prompt,
      options: [correct, wrong1, wrong2],
      answerIndex: 0,
      explanation: correct === "at"
        ? "精確時刻使用 at。"
        : correct === "on"
          ? "星期／特定日使用 on。"
          : "月份與 morning／afternoon／evening 這類時段使用 in。",
      evidence: prompt.replace("___", correct),
    }));
  }

  for (const scenario of U02_SCENARIOS) {
    result.push(choiceVariant({
      unit: "U02",
      family: "g18-listening",
      pattern: "yes-no-response",
      fingerprint: `v1:g18:listening:${scenario.key}`,
      skill: "聽力情境遷移",
      sourceLabel: "U02／G02／G18／首聽／未見變體",
      listeningText: `Does ${scenario.subject} usually ${scenario.base} ${scenario.rest}?`,
      prompt: "根據你剛剛聽到的問句，哪一句是最直接自然的回答？",
      options: [`Yes, ${scenario.pronoun} usually does.`, "At the front desk.", "Yesterday afternoon."],
      answerIndex: 0,
      explanation: "首句是 Does 開頭的是非問句；直接回答可用 Yes + 代名詞 + does。",
      evidence: `Does ${scenario.subject} ...? → Yes, ${scenario.pronoun} usually does.`,
    }));
  }

  const readings = [
    { key: "mina", passage: "Mina usually commutes by train. Today she is walking because the station entrance is closed.", prompt: "How does Mina usually commute?", correct: "By train.", d1: "On foot.", d2: "By car." },
    { key: "ito", passage: "Mr. Ito usually works the early shift. Today he starts at noon because a coworker changed shifts with him.", prompt: "When does Mr. Ito usually work?", correct: "The early shift.", d1: "At noon every day.", d2: "Only on weekends." },
    { key: "train", passage: "The train usually leaves from platform three. Today it is leaving from platform five because of maintenance.", prompt: "Which platform does the train usually use?", correct: "Platform three.", d1: "Platform five.", d2: "Platform eight." },
    { key: "store", passage: "The station store normally opens at nine. Today it is opening at ten because the manager is delayed.", prompt: "When does the store normally open?", correct: "At nine.", d1: "At ten.", d2: "At noon." },
    { key: "leo", passage: "Leo often cycles to work. Today he is taking the bus because it is raining.", prompt: "How does Leo often get to work?", correct: "By bicycle.", d1: "By bus.", d2: "By train." },
    { key: "shuttle", passage: "The shuttle normally arrives on time. Today it is fifteen minutes late because traffic is heavy.", prompt: "What is true about the shuttle today?", correct: "It is late.", d1: "It is early.", d2: "It is canceled." },
  ] as const;
  for (const item of readings) {
    result.push(choiceVariant({
      unit: "U02",
      family: "u02-reading",
      pattern: "routine-vs-now",
      fingerprint: `v1:u02:reading:${item.key}`,
      skill: "閱讀情境遷移",
      sourceLabel: "U02／閱讀／G02／G05／未見變體",
      passage: item.passage,
      prompt: item.prompt,
      options: [item.correct, item.d1, item.d2],
      answerIndex: 0,
      explanation: "先分清楚 usually／normally／often 的平常情況與 today 的例外，再回答題目真正問的時間線。",
      evidence: item.passage,
    }));
  }

  const outputs = [
    ["commute", "她通常搭火車通勤。", "She usually commutes by train.", "G02"],
    ["does-arrive", "Mina 通常會準時抵達嗎？", "Does Mina usually arrive on time?", "G02／G18"],
    ["does-leave", "這班火車通常從三號月台發車嗎？", "Does the train usually leave from platform three?", "G02／G18"],
    ["weekday", "我每個平日搭火車通勤。", "I commute by train every weekday.", "G02"],
    ["wait-now", "她現在正在三號月台等車。", "She is waiting on platform three now.", "G05"],
    ["check-now", "那位員工現在正在查看發車資訊。", "The employee is checking the departure information now.", "G05"],
    ["work-shift", "伊藤先生通常上早班。", "Mr. Ito usually works the early shift.", "G02"],
    ["train-time", "火車通常會準時抵達。", "The train usually arrives on time.", "G02"],
  ] as const;
  for (const [key, chinese, answer, objectives] of outputs) {
    result.push(outputVariant({
      unit: "U02",
      family: "u02-output",
      pattern: "short-output",
      fingerprint: `v1:u02:output:${key}`,
      skill: "短輸出 · 情境遷移",
      sourceLabel: `U02／${objectives}／短輸出／未見變體`,
      prompt: "把下面的意思寫成英文。",
      outputPrompt: chinese,
      referenceAnswer: answer,
      explanation: "先判斷這句是在說固定習慣、問句，還是眼前正在發生，再使用 U02 已教過的結構。",
      evidence: answer,
    }));
  }
  return result;
}

function rotateChoices(correct: string, wrong1: string, wrong2: string, identity: string) {
  const source = [correct, wrong1, wrong2] as const;
  const rotation = parseInt(stableHash(identity), 36) % source.length;
  const options = [source[rotation], source[(rotation + 1) % 3], source[(rotation + 2) % 3]] as [string, string, string];
  return { options, answerIndex: options.indexOf(correct) as 0 | 1 | 2 };
}

function buildGrammarTransferVariants() {
  return GRAMMAR_TRANSFER_SEEDS.map((seed) => {
    const { options, answerIndex } = rotateChoices(seed.correct, seed.wrong1, seed.wrong2, `${seed.objective}:${seed.key}`);
    const completed = seed.prompt.replace("___", seed.correct);
    return choiceVariant({
      unit: seed.unit as UnitId,
      family: `grammar-${seed.objective.toLocaleLowerCase()}`,
      pattern: seed.key,
      fingerprint: `v2:grammar:${seed.objective.toLocaleLowerCase()}:${seed.key}`,
      skill: "文法情境遷移",
      sourceLabel: `${seed.unit}／${seed.objective}／未見文法遷移`,
      prompt: seed.prompt,
      options,
      answerIndex,
      explanation: seed.rule,
      evidence: completed,
      breakdown: `先找會決定形式的訊號與句子主幹，再檢查：${completed}`,
    });
  });
}

function splitCorpusSentences(text: string, minimumLength: number) {
  return text
    .replace(/\r/g, "")
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= minimumLength && sentence.length <= 260);
}

function fiveSpreadIndices(length: number, requireNeighbors: boolean) {
  const start = requireNeighbors ? 1 : 0;
  const end = requireNeighbors ? length - 1 : length;
  const available = Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
  if (available.length <= 5) return available;
  return Array.from({ length: 5 }, (_, index) => available[Math.round((index * (available.length - 1)) / 4)]);
}

function sentenceDistractors(sentences: readonly string[], targetIndex: number, blocked: ReadonlySet<number>) {
  const candidates: string[] = [];
  const start = (targetIndex + 3) % sentences.length;
  for (let offset = 0; offset < sentences.length && candidates.length < 2; offset += 1) {
    const index = (start + offset) % sentences.length;
    if (blocked.has(index) || candidates.includes(sentences[index])) continue;
    candidates.push(sentences[index]);
  }
  return candidates;
}

function buildCorpusTransferVariants() {
  const result: PracticeQuestion[] = [];
  for (const unit of GENERATED_UNITS) {
    if (unit.number < 3) continue;
    const g25Label = /^G25\b/.test(unit.grammar) ? "／G25" : "";
    const readingSentences = splitCorpusSentences(unit.article, 36);
    for (const targetIndex of fiveSpreadIndices(readingSentences.length, true)) {
      const blocked = new Set([targetIndex - 1, targetIndex, targetIndex + 1]);
      const distractors = sentenceDistractors(readingSentences, targetIndex, blocked);
      if (distractors.length < 2) continue;
      const target = readingSentences[targetIndex];
      const { options, answerIndex } = rotateChoices(target, distractors[0], distractors[1], `${unit.id}:reading:${targetIndex}`);
      result.push(choiceVariant({
        unit: unit.id as UnitId,
        family: "corpus-reading-gap",
        pattern: "cohesion-gap",
        fingerprint: `v2:corpus:reading-gap:${unit.id}:${targetIndex}`,
        skill: "閱讀情境遷移",
        sourceLabel: `${unit.id}${g25Label}／BBC 改編閱讀／未見證據點`,
        passage: `${readingSentences[targetIndex - 1]}\n\n[ ... ]\n\n${readingSentences[targetIndex + 1]}`,
        prompt: "哪一句最自然、最有前後文證據地補回空格？",
        options,
        answerIndex,
        explanation: "先看空格前後的主詞、時間線與因果／轉折，再排除雖然同主題但接不回這個位置的句子。",
        evidence: target,
        breakdown: "這是新的篇章位置證據；同一句就算之後換選項順序，也只算同一個語意指紋。",
      }));
    }

    const listeningSentences = splitCorpusSentences(unit.listening, 24);
    for (const targetIndex of fiveSpreadIndices(listeningSentences.length, false)) {
      const target = listeningSentences[targetIndex];
      const distractors = sentenceDistractors(listeningSentences, targetIndex, new Set([targetIndex]));
      if (distractors.length < 2) continue;
      const { options, answerIndex } = rotateChoices(target, distractors[0], distractors[1], `${unit.id}:listening:${targetIndex}`);
      result.push(choiceVariant({
        unit: unit.id as UnitId,
        family: "corpus-listening-detail",
        pattern: "detail-match",
        fingerprint: `v2:corpus:listening-detail:${unit.id}:${targetIndex}`,
        skill: "聽力情境遷移",
        sourceLabel: `${unit.id}${g25Label}／BBC 改編首聽／未見證據點`,
        listeningText: target,
        prompt: "根據剛剛這一小段首聽，哪一句與內容一致？",
        options,
        answerIndex,
        explanation: "首答只用實際聽到的資訊；另外兩句來自相近課程情境，但沒有出現在這一次音訊證據中。",
        evidence: target,
        breakdown: "首聽完成後才作答；鎖定首答與信心後，二聽只用來修復理解。",
      }));
    }
  }
  return result;
}

function pickDistractors<T extends { id: string }>(row: T, pool: readonly T[], uniqueKey: (value: T) => string) {
  const used = new Set([uniqueKey(row)]);
  const candidates: T[] = [];
  const start = stableHash(row.id).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % Math.max(1, pool.length);
  for (let offset = 1; offset <= pool.length && candidates.length < 2; offset += 1) {
    const candidate = pool[(start + offset) % pool.length];
    const key = uniqueKey(candidate);
    if (candidate.id === row.id || used.has(key)) continue;
    used.add(key);
    candidates.push(candidate);
  }
  return candidates;
}

function buildVocabularyTransferVariants() {
  const result: PracticeQuestion[] = [];
  const rowsByUnit = new Map<string, typeof CORE_VOCABULARY_ROWS>();
  for (const row of CORE_VOCABULARY_ROWS) {
    const rows = rowsByUnit.get(row.unit) ?? [];
    rowsByUnit.set(row.unit, [...rows, row]);
  }
  for (const row of CORE_VOCABULARY_ROWS) {
    const unitPool = rowsByUnit.get(row.unit) ?? CORE_VOCABULARY_ROWS;
    const meaningDistractors = pickDistractors(row, unitPool, (candidate) => candidate.meaning);
    const collocationDistractors = pickDistractors(row, unitPool, (candidate) => candidate.collocation);
    if (meaningDistractors.length === 2) {
      result.push(choiceVariant({
        unit: row.unit as UnitId,
        family: "vocab-meaning",
        pattern: "meaning-recall",
        fingerprint: `v1:vocab:meaning:${row.id}`,
        skill: "單字情境遷移",
        sourceLabel: `${row.unit}／${row.id}／未見變體`,
        prompt: `「${row.item}」在這套課程中最接近哪個意思？`,
        options: [row.meaning, meaningDistractors[0].meaning, meaningDistractors[1].meaning],
        answerIndex: 0,
        explanation: `「${row.item}」在課程字彙表中的核心意思是「${row.meaning}」。`,
        evidence: `固定搭配：${row.collocation}`,
        breakdown: `${row.item}＝${row.meaning}；${row.collocation}。`,
      }));
    }
    if (collocationDistractors.length === 2) {
      result.push(choiceVariant({
        unit: row.unit as UnitId,
        family: "vocab-collocation",
        pattern: "collocation-recall",
        fingerprint: `v1:vocab:collocation:${row.id}`,
        skill: "單字與固定搭配 · 情境遷移",
        sourceLabel: `${row.unit}／${row.id}／未見變體`,
        prompt: `哪個固定搭配最適合和「${row.item}」一起記？`,
        options: [row.collocation, collocationDistractors[0].collocation, collocationDistractors[1].collocation],
        answerIndex: 0,
        explanation: `課程把「${row.item}」和「${row.collocation}」綁在一起學，避免只背單獨中文。`,
        evidence: `${row.id}：${row.item} · ${row.meaning} · ${row.collocation}`,
      }));
    }
  }
  return result;
}

export const VARIANT_QUESTIONS: readonly PracticeQuestion[] = [
  ...buildU01GrammarVariants(),
  ...buildU02GrammarVariants(),
  ...buildGrammarTransferVariants(),
  ...buildCorpusTransferVariants(),
  ...buildVocabularyTransferVariants(),
];

const VARIANT_BY_ID = new Map(VARIANT_QUESTIONS.map((question) => [question.id, question]));

export function getVariantQuestion(id: string) {
  return VARIANT_BY_ID.get(id);
}

export function getVariantFingerprint(id: string) {
  return VARIANT_BY_ID.get(id)?.variant?.fingerprint;
}

export function getUnseenVariantQuestions(seenFingerprints: ReadonlySet<string>, eligibleUnitIds?: ReadonlySet<string>) {
  return VARIANT_QUESTIONS.filter((question) => {
    const fingerprint = question.variant?.fingerprint;
    if (!fingerprint || seenFingerprints.has(fingerprint)) return false;
    return !eligibleUnitIds || eligibleUnitIds.has(question.unit);
  });
}

export function isGeneratedVariant(question: PracticeQuestion | undefined): question is PracticeQuestion & { variant: VariantMeta } {
  return Boolean(question?.variant);
}
