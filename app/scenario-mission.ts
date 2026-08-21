import type { PracticeQuestion, UnitId } from "./content";
import type { CompanionId } from "./companions";
import { V24_SCENARIO_MISSIONS, V24_SCENARIO_QUESTIONS } from "./scenario-content-v24";
import { V32_CHAPTER_CASE_MISSIONS, V32_CHAPTER_CASE_QUESTIONS } from "./chapter-case-content-v32";

export const SCENARIO_MISSION_ID = "u02-0720-disrupted-train";
export const SCENARIO_MISSION_TITLE = "07:20 的失序列車";

export type ScenarioNodeId = string;
export type ScenarioSceneZone = string;
export type ScenarioProcessResult = "clean" | "recovered" | "detour";
export type ScenarioEnding = "full-intel" | "standard-delivery";
export type ScenarioMissionKind = "main" | "side" | "repair" | "chapter";
export type ScenarioWeaknessKey = "does-base" | "third-person" | "habit-now" | "schedule-reading";
export type ScenarioActionType = "observe" | "ask" | "order" | "verify" | "reconstruct" | "compose";
export type ScenarioErrorPattern = "keyword-echo" | "timeline-shift" | "missing-actor" | "source-forgery" | "reference-trap";

export type ScenarioPhraseTool = {
  english: string;
  chinese: string;
  use: string;
};

export type ScenarioCaseFile = {
  objective: string;
  threat: string;
  sourceCount: number;
  completionEvidence: string;
};

export type ScenarioDocument = {
  title: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
  note?: string;
};

export type ScenarioMissionQuestion = PracticeQuestion & {
  mission: {
    missionId: string;
    nodeId: ScenarioNodeId;
    time: string;
    location: string;
    zone: ScenarioSceneZone;
    objective: string;
    narration: string;
    hint: string;
    clue: string;
    correctConsequence: string;
    wrongConsequence: string;
    weaknessKey?: ScenarioWeaknessKey;
    actionType?: ScenarioActionType;
    actionLabel?: string;
    actionInstruction?: string;
    sourceIds?: readonly string[];
    errorPattern?: ScenarioErrorPattern;
    document?: ScenarioDocument;
    documents?: readonly ScenarioDocument[];
  };
};

export type ScenarioNodeMeta = {
  id: ScenarioNodeId;
  mark: string;
  label: string;
  short: string;
  time: string;
  zone: ScenarioSceneZone;
};

export type ScenarioSceneZoneMeta = {
  id: ScenarioSceneZone;
  slot: "left" | "center" | "right" | "lower";
  label: string;
  detail: string;
};

export type ScenarioMissionDefinition = {
  id: string;
  unit?: UnitId;
  title: string;
  shortTitle: string;
  kicker: string;
  description: string;
  kind: ScenarioMissionKind;
  duration: string;
  focus: string;
  imageSrc: string;
  imageAlt: string;
  clockLabel: string;
  nodes: Readonly<Record<string, ScenarioNodeMeta>>;
  sceneZones: readonly ScenarioSceneZoneMeta[];
  sequence: (companionId: CompanionId) => ScenarioNodeId[];
  questions: readonly ScenarioMissionQuestion[];
  fullIntelThreshold: number;
  recoveredMaxSetbacks: number;
  reward: {
    standardGold: number;
    fullGold: number;
    cleanBonus: number;
    standardAffinity: number;
    fullAffinity: number;
  };
  endings: Record<ScenarioEnding, { label: string; detail: string }>;
  companionLines: Record<CompanionId, string>;
  weaknessKey?: ScenarioWeaknessKey;
  caseFile?: ScenarioCaseFile;
  phraseTools?: readonly ScenarioPhraseTool[];
};

export const SCENARIO_WEAKNESS_INFO: Record<ScenarioWeaknessKey, { label: string; short: string; repairMissionId: string }> = {
  "does-base": { label: "does 後動詞原形", short: "Does 已負責變化，主要動詞要回原形。", repairMissionId: "u02-repair-does-base" },
  "third-person": { label: "第三人稱單數", short: "he／she／it 的一般現在式要加 -s／-es。", repairMissionId: "u02-repair-third-person" },
  "habit-now": { label: "平常與現在", short: "usually／every 表常態；now／today 常指眼前狀況。", repairMissionId: "u02-repair-habit-now" },
  "schedule-reading": { label: "班表與時間資訊", short: "先鎖定班次，再比對時間、月台與最新狀態。", repairMissionId: "u02-repair-schedule-reading" },
};

export const SCENARIO_ACTION_COPY: Record<ScenarioActionType, { mark: string; label: string; detail: string }> = {
  observe: { mark: "觀", label: "觀察", detail: "從英文場景或圖像描述鎖定人物、物件與狀態。" },
  ask: { mark: "問", label: "問話／回應", detail: "用自然英文取得資訊，或直接回應對方真正的問題。" },
  order: { mark: "序", label: "排序", detail: "依英文時間線、原因與條件決定先後順序。" },
  verify: { mark: "核", label: "核對證據", detail: "比較來源、時間戳與關鍵欄位後再採取行動。" },
  reconstruct: { mark: "組", label: "重建文件", detail: "把缺漏、矛盾或被改寫的文件恢復成可執行版本。" },
  compose: { mark: "寫", label: "英文輸出", detail: "親自寫出任務需要的短句、回覆或行動指示。" },
};

export const SCENARIO_ERROR_PATTERN_COPY: Record<ScenarioErrorPattern, { label: string; detail: string }> = {
  "keyword-echo": { label: "關鍵字回音", detail: "選項重複題目字面，卻沒有真正回應問題或任務。" },
  "timeline-shift": { label: "時間線扭曲", detail: "把過去、平常、現在或未來的資訊混成同一件事。" },
  "missing-actor": { label: "動作者消失", detail: "句子只留下結果，卻藏掉誰做、誰負責或誰該採取下一步。" },
  "source-forgery": { label: "來源偽裝", detail: "內容看似流暢或正式，卻缺少可核對的寄件人、時間戳或編號。" },
  "reference-trap": { label: "指涉錯置", detail: "代名詞、欄位或相鄰資訊被錯接到另一個人或另一筆紀錄。" },
};

const NODE_META: Partial<Record<ScenarioNodeId, ScenarioNodeMeta>> = {
  board: { id: "board", mark: "01", label: "電子看板", short: "確認班次與月台", time: "07:08", zone: "board" },
  "route-rinka": { id: "route-rinka", mark: "02", label: "快速路線", short: "凜夏帶你穿過閘口", time: "07:11", zone: "platform" },
  "route-sena": { id: "route-sena", mark: "02", label: "調查路線", short: "澄音先核對現場資訊", time: "07:11", zone: "desk" },
  "route-yori": { id: "route-yori", mark: "02", label: "星環捷徑", short: "夜璃帶你走天橋", time: "07:11", zone: "stairs" },
  announcement: { id: "announcement", mark: "03", label: "臨時廣播", short: "首聽一次後採取行動", time: "07:14", zone: "platform" },
  staff: { id: "staff", mark: "04", label: "站務對話", short: "用自然問句取得情報", time: "07:16", zone: "desk" },
  contact: { id: "contact", mark: "05", label: "辨認聯絡人", short: "分清平常與眼前狀況", time: "07:18", zone: "platform" },
  final: { id: "final", mark: "06", label: "最後異動", short: "整合線索完成交付", time: "07:20", zone: "platform" },
};

export const SCENARIO_ROUTE_COPY: Record<CompanionId, {
  name: string;
  mark: string;
  detail: string;
  promise: string;
}> = {
  rinka: {
    name: "凜夏 · 快速路線",
    mark: "快",
    detail: "直接穿過閘口，事件較短促；她會提醒你先判斷再加速。",
    promise: "速度只改變路線氣氛，不會縮短作答時間或改掉正確答案。",
  },
  sena: {
    name: "澄音 · 調查路線",
    mark: "查",
    detail: "先核對看板與站務資訊，取得較完整的現場說明。",
    promise: "額外提示必須由你主動開啟，開啟後會誠實標記為 assisted。",
  },
  yori: {
    name: "夜璃 · 星環捷徑",
    mark: "捷",
    detail: "從天橋切進月台，會遇到較不尋常但仍屬 U02 的情境。",
    promise: "捷徑不會塞入未教文法，也不會用答錯扣好感。",
  },
};

function primaryScenarioNodeSequence(companionId: CompanionId): ScenarioNodeId[] {
  const routeNode: Record<CompanionId, ScenarioNodeId> = {
    rinka: "route-rinka",
    sena: "route-sena",
    yori: "route-yori",
  };
  return ["board", routeNode[companionId], "announcement", "staff", "contact", "final"];
}

export function scenarioNodeSequence(companionId: CompanionId, missionId = SCENARIO_MISSION_ID): ScenarioNodeId[] {
  if (missionId === SCENARIO_MISSION_ID) return primaryScenarioNodeSequence(companionId);
  return getScenarioMission(missionId)?.sequence(companionId) ?? primaryScenarioNodeSequence(companionId);
}

export function getScenarioNodeMeta(id?: string | null, missionId = SCENARIO_MISSION_ID) {
  if (!id) return undefined;
  if (missionId === SCENARIO_MISSION_ID) return NODE_META[id as ScenarioNodeId];
  return getScenarioMission(missionId)?.nodes[id];
}

function inferScenarioWeakness(input: Pick<MissionChoiceInput, "objectives" | "skill" | "prompt">): ScenarioWeaknessKey {
  const text = `${input.objectives} ${input.skill} ${input.prompt}`;
  if (/Does|do\/does|基本問句|G18/i.test(text)) return "does-base";
  if (/G05|現在進行|Right now|At the moment|Today|usually.*now/i.test(text)) return "habit-now";
  if (/文件|班表|月台|platform|departure|時間介系詞|weekday/i.test(text)) return "schedule-reading";
  return "third-person";
}

type MissionChoiceInput = {
  id: string;
  nodeId: ScenarioNodeId;
  skill: string;
  objectives: string;
  prompt: string;
  options: readonly [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  evidence: string;
  time?: string;
  location: string;
  objective: string;
  narration: string;
  hint: string;
  clue: string;
  correctConsequence: string;
  wrongConsequence: string;
  document?: ScenarioDocument;
  listeningText?: string;
  passage?: string;
};

function missionChoice(input: MissionChoiceInput): ScenarioMissionQuestion {
  const ids = ["a", "b", "c"] as const;
  const meta = NODE_META[input.nodeId]!;
  return {
    id: `SM-U02-${input.nodeId.toLocaleUpperCase()}-${input.id}`,
    unit: "U02",
    kind: "choice",
    skill: `${input.skill} · 情境遷移`,
    prompt: input.prompt,
    passage: input.passage,
    listeningText: input.listeningText,
    hint: input.hint,
    options: input.options.map((label, index) => ({ id: ids[index], label })),
    answerId: ids[input.answerIndex],
    explanation: input.explanation,
    evidence: input.evidence,
    sourceLabel: `U02／${input.objectives}／情境任務未見變體`,
    variant: {
      fingerprint: `v1:scenario:u02:${input.nodeId}:${input.id}`,
      family: `scenario-u02-${input.nodeId}`,
      pattern: input.id,
      version: 1,
    },
    mission: {
      missionId: SCENARIO_MISSION_ID,
      nodeId: input.nodeId,
      time: input.time ?? meta.time,
      location: input.location,
      zone: meta.zone,
      objective: input.objective,
      narration: input.narration,
      hint: input.hint,
      clue: input.clue,
      correctConsequence: input.correctConsequence,
      wrongConsequence: input.wrongConsequence,
      weaknessKey: inferScenarioWeakness(input),
      document: input.document,
    },
  };
}

const BOARD_QUESTIONS: ScenarioMissionQuestion[] = [
  missionChoice({
    id: "platform",
    nodeId: "board",
    skill: "文件判讀",
    objectives: "G02／交通字彙",
    prompt: "Which platform does the 7:20 Harbor train leave from?",
    options: ["Platform 1.", "Platform 3.", "Platform 4."],
    answerIndex: 1,
    explanation: "先鎖定 7:20 與 Harbor，再橫向讀到 Platform 3。",
    evidence: "07:20 · Harbor · Platform 3 · On time",
    location: "東側大廳 · 電子看板",
    objective: "找出 07:20 班次的月台。",
    narration: "雨水沿著玻璃滑下。三班列車同時出現在看板上，你必須先鎖定交付列車。",
    hint: "先找 07:20，再往同一列找 platform；不要先看最醒目的狀態字。",
    clue: "班次卡：07:20 Harbor · Platform 3",
    correctConsequence: "你把三號月台記進任務卡，沒有被旁邊正在登車的班次帶走。",
    wrongConsequence: "你先朝錯的方向走了幾步；凜夏指著時間欄把你拉回來，任務仍能繼續。",
    document: {
      title: "DEPARTURE BOARD",
      columns: ["Time", "Service", "Platform", "Status"],
      rows: [["07:12", "Lake Local", "1", "Boarding"], ["07:20", "Harbor", "3", "On time"], ["07:35", "Airport", "4", "Delayed"]],
    },
  }),
  missionChoice({
    id: "delay",
    nodeId: "board",
    skill: "文件判讀",
    objectives: "G02／delay／on time",
    prompt: "What is true about the 7:20 Airport shuttle?",
    options: ["It is delayed ten minutes.", "It leaves from platform five.", "It is already boarding."],
    answerIndex: 0,
    explanation: "目標列的狀態是 Delayed 10 min；月台是 2，也還沒有顯示 Boarding。",
    evidence: "07:20 · Airport Shuttle · Platform 2 · Delayed 10 min",
    location: "東側大廳 · 電子看板",
    objective: "判斷 07:20 班次目前是否準時。",
    narration: "看板沒有換月台，但狀態欄突然變成琥珀色。交付時間可能受到影響。",
    hint: "題目問 what is true，不只看月台；確認 status 欄。",
    clue: "狀態卡：07:20 Airport Shuttle · 延誤 10 分鐘",
    correctConsequence: "你立刻把延誤寫進任務紀錄，後續不會把 07:20 當成實際離站時間。",
    wrongConsequence: "你誤讀了相鄰列；澄音把同一列的四個欄位框在一起，避免你完全失去方向。",
    document: {
      title: "DEPARTURE BOARD",
      columns: ["Time", "Service", "Platform", "Status"],
      rows: [["07:15", "River Line", "5", "On time"], ["07:20", "Airport Shuttle", "2", "Delayed 10 min"], ["07:24", "Harbor Local", "6", "Boarding"]],
    },
  }),
  missionChoice({
    id: "departure-time",
    nodeId: "board",
    skill: "文件判讀",
    objectives: "G02／departure／時間介系詞",
    prompt: "Which sentence correctly describes the North Line train?",
    options: ["It leaves on platform two.", "It leaves in 7:20.", "It leaves at 7:20 from platform two."],
    answerIndex: 2,
    explanation: "精確時刻用 at；月台資訊用 from platform two。",
    evidence: "The North Line train leaves at 7:20 from platform two.",
    location: "東側大廳 · 電子看板",
    objective: "把班次資訊說成自然英文。",
    narration: "聯絡人傳來一句英文確認訊息。你需要用看板資訊判斷哪一句完整而自然。",
    hint: "精確時刻前用 at；班次從哪個月台開出可用 from。",
    clue: "班次卡：North Line · 07:20 · Platform 2",
    correctConsequence: "你回覆了正確班次，聯絡人知道你正在前往二號月台。",
    wrongConsequence: "訊息裡的時間介系詞讓對方停頓了一下；夜璃補了一句自然說法，交付沒有中斷。",
    document: {
      title: "MORNING SERVICES",
      columns: ["Service", "Departure", "From", "Status"],
      rows: [["North Line", "07:20", "Platform 2", "On time"], ["Coast Line", "07:28", "Platform 4", "On time"], ["City Loop", "07:31", "Platform 1", "Delayed"]],
    },
  }),
  missionChoice({
    id: "weekday",
    nodeId: "board",
    skill: "班表理解",
    objectives: "G02／every weekday",
    prompt: "The note says: “The 7:20 train leaves ___ weekday.” Which word completes it?",
    options: ["on every", "every", "in every"],
    answerIndex: 1,
    explanation: "every weekday 本身就是頻率時間片語，前面不加 on 或 in。",
    evidence: "The 7:20 train leaves every weekday.",
    location: "東側大廳 · 班表告示",
    objective: "確認這是不是固定平日班次。",
    narration: "電子看板旁還貼著固定班表。現在的異動只有在先知道平常安排時才看得出來。",
    hint: "every + 時間名詞可以直接放在句尾。",
    clue: "班表卡：07:20 為每個平日固定班次",
    correctConsequence: "你分清楚固定班表與今天的臨時狀況，後面的異動更容易判斷。",
    wrongConsequence: "你把 every weekday 前多加了介系詞；站務員仍看懂，但澄音在任務卡上留下修正。",
    document: {
      title: "WEEKDAY TIMETABLE",
      columns: ["Service", "Schedule", "Platform"],
      rows: [["Harbor Express", "Leaves at 07:20 every weekday", "3"], ["Weekend Special", "Saturday and Sunday", "5"]],
    },
  }),
  missionChoice({
    id: "status-contrast",
    nodeId: "board",
    skill: "閱讀理解",
    objectives: "G02／G05",
    prompt: "The Harbor train usually leaves from platform three. Today it is waiting at platform five. Where is it now?",
    options: ["At platform five.", "At platform three.", "Outside the station."],
    answerIndex: 0,
    explanation: "usually 是平常狀況；today 與 is waiting 指向現在在五號月台。",
    evidence: "Today it is waiting at platform five.",
    location: "東側大廳 · 狀態看板",
    objective: "分清平常月台與今天所在位置。",
    narration: "看板同時保留固定月台和現場位置。若只抓到 platform three，就會被舊資訊帶走。",
    hint: "題目問 now；優先找 today 與 is waiting 後面的地點。",
    clue: "異動卡：平常 3 號，現在 5 號",
    correctConsequence: "你直接標出五號月台，省下回頭確認的時間。",
    wrongConsequence: "你走向平常使用的三號月台；廣播響起前，夜璃把『today』指給你看，讓你折返。",
    document: {
      title: "SERVICE STATUS",
      columns: ["Usual platform", "Current location", "Departure"],
      rows: [["3", "5", "07:20"]],
      note: "The Harbor train usually leaves from platform three. Today it is waiting at platform five.",
    },
  }),
];

const RINKA_ROUTE_QUESTIONS: ScenarioMissionQuestion[] = [
  missionChoice({ id: "gate-closes", nodeId: "route-rinka", skill: "行動判斷", objectives: "G02／時間", prompt: "The express gate usually closes at 7:18. It is 7:14 now. What should you do?", options: ["Go to the express gate now.", "Wait until 7:20.", "Leave the station."], answerIndex: 0, explanation: "閘口通常 7:18 關閉，而現在是 7:14；直接前往最符合任務。", evidence: "The gate closes at 7:18; it is 7:14 now.", location: "快速閘口", objective: "在閘口關閉前選擇行動。", narration: "凜夏已經看見前方空出一條通道，但她沒有替你決定是否現在通過。", hint: "比較 closes at 7:18 與 now 7:14。", clue: "快速通道仍開放", correctConsequence: "你在閘口關閉前通過，凜夏笑著說：『這才叫看懂時間再加速。』", wrongConsequence: "你停了一下，閘口在眼前關閉；凜夏帶你改走普通通道，任務仍繼續。" }),
  missionChoice({ id: "doors-now", nodeId: "route-rinka", skill: "現在進行式", objectives: "G05", prompt: "Look—the platform doors ___.", options: ["close every day", "is closing", "are closing"], answerIndex: 2, explanation: "doors 是複數，Look 指眼前正在發生，所以用 are closing。", evidence: "The platform doors are closing.", location: "快速閘口", objective: "判斷眼前正在發生的動作。", narration: "警示音響起，兩扇月台門正在緩慢合上。", hint: "Look 指現在；doors 是複數。", clue: "月台門正在關閉", correctConsequence: "你立刻改走仍開著的側門，沒有撞上正在關閉的門。", wrongConsequence: "你把複數 doors 配成 is；凜夏直接指出另一扇側門，路線多繞了一小段。" }),
  missionChoice({ id: "does-open", nodeId: "route-rinka", skill: "基本問句", objectives: "G02／G18", prompt: "___ the side gate usually open at seven?", options: ["Is", "Does", "Do"], answerIndex: 1, explanation: "open 在這裡是一般動詞，side gate 是單數，所以問句用 Does。", evidence: "Does the side gate usually open at seven?", location: "快速閘口", objective: "向保全確認平常開門時間。", narration: "側門看起來可以通行，但凜夏要你先用一句完整問句確認。", hint: "主詞是單數 gate，後面已有原形 open。", clue: "側門平常七點開放", correctConsequence: "保全直接回答 Yes, it does，快速路線保持暢通。", wrongConsequence: "保全聽懂了，但先替你重說一次正確問句；你們因此晚了半步。" }),
  missionChoice({ id: "passengers-move", nodeId: "route-rinka", skill: "主詞動詞一致", objectives: "G03 基礎／G05", prompt: "Right now, several passengers ___ toward platform four.", options: ["are moving", "is moving", "moves"], answerIndex: 0, explanation: "several passengers 是複數，Right now 指正在發生，用 are moving。", evidence: "Several passengers are moving toward platform four.", location: "中央通道", objective: "觀察人流正在往哪裡移動。", narration: "人群突然改變方向。跟著人流可能是捷徑，也可能是另一班車。", hint: "several passengers 是複數；Right now 要用進行式。", clue: "人流正移向四號月台", correctConsequence: "你看懂人流是正在改道，而不是固定規則，沒有盲目跟錯班次。", wrongConsequence: "你差點把眼前動作當成固定班表；凜夏把你拉到標線內重新定位。" }),
  missionChoice({ id: "at-seven", nodeId: "route-rinka", skill: "時間介系詞", objectives: "時間介系詞基礎", prompt: "The shortcut opens ___ seven o'clock every weekday.", options: ["on", "in", "at"], answerIndex: 2, explanation: "精確時刻 seven o'clock 前用 at。", evidence: "The shortcut opens at seven o'clock every weekday.", location: "中央通道", objective: "確認捷徑的固定開放時間。", narration: "牆上的簡短告示沒有複雜內容，只有每天的開放時刻。", hint: "精確到幾點鐘時使用 at。", clue: "捷徑已在七點開放", correctConsequence: "你確認通道早已開放，和凜夏直接穿過。", wrongConsequence: "你把星期與時刻的介系詞混在一起；凜夏看了告示後帶你改走旁邊入口。" }),
];

const SENA_ROUTE_QUESTIONS: ScenarioMissionQuestion[] = [
  missionChoice({ id: "ask-platform", nodeId: "route-sena", skill: "基本問句", objectives: "G02／G18", prompt: "Which question naturally checks the platform?", options: ["Does the 7:20 train leaves from platform three?", "Does the 7:20 train leave from platform three?", "Is the 7:20 train leave from platform three?"], answerIndex: 1, explanation: "Does 後主要動詞回原形 leave。", evidence: "Does the 7:20 train leave from platform three?", location: "資訊櫃台", objective: "向站務員核對月台。", narration: "澄音把看板截圖收好，但仍要你親自問出關鍵資訊。", hint: "Does 已承擔第三人稱變化，後面的動詞不要再加 s。", clue: "站務員可直接確認月台", correctConsequence: "站務員立刻理解問題並確認目前月台。", wrongConsequence: "站務員先重述了一次自然問句才回答；澄音把這次修正標成 assisted。" }),
  missionChoice({ id: "worker-checks", nodeId: "route-sena", skill: "第三人稱單數", objectives: "G02", prompt: "The station worker usually ___ the departure board at seven.", options: ["checks", "check", "is check"], answerIndex: 0, explanation: "station worker 是第三人稱單數，一般現在式用 checks。", evidence: "The station worker usually checks the departure board at seven.", location: "資訊櫃台", objective: "理解站務員的固定查核流程。", narration: "澄音想先判斷目前資訊是否已經過例行更新。", hint: "worker 是單數；usually 指固定習慣。", clue: "看板已完成七點例行查核", correctConsequence: "你確認看板不是舊畫面，後續線索可信度提高。", wrongConsequence: "你沒有先處理第三人稱變化；澄音仍從時間戳找出查核紀錄，但多花了一點時間。" }),
  missionChoice({ id: "does-arrive", nodeId: "route-sena", skill: "基本問句", objectives: "G02／G18", prompt: "Does the Harbor train usually ___ on time?", options: ["arrives", "is arriving", "arrive"], answerIndex: 2, explanation: "Does 後接原形 arrive。", evidence: "Does the Harbor train usually arrive on time?", location: "資訊櫃台", objective: "詢問班次平常是否準時。", narration: "今天的延誤是否異常，取決於你能否問清楚平常狀況。", hint: "看到 Does，先把主要動詞還原。", clue: "Harbor 班次平常準時", correctConsequence: "站務員回答 Yes, it usually does；今天確實是例外。", wrongConsequence: "問句裡出現兩次第三人稱變化；站務員修正後仍給了你需要的資訊。" }),
  missionChoice({ id: "now-checking", nodeId: "route-sena", skill: "現在進行式", objectives: "G05", prompt: "At the moment, the worker ___ a new platform number.", options: ["checks every day", "is checking", "check"], answerIndex: 1, explanation: "At the moment 指眼前正在查核，用 is checking。", evidence: "The worker is checking a new platform number at the moment.", location: "資訊櫃台", objective: "判斷站務員現在正在做什麼。", narration: "站務員沒有立刻回答，而是低頭核對另一個畫面。", hint: "At the moment 是現在進行式訊號；worker 是單數。", clue: "新月台號碼正在查核", correctConsequence: "你沒有把暫時查核誤認成固定流程，耐心等到更新完成。", wrongConsequence: "你以為那只是例行動作而準備離開；澄音提醒你畫面還在更新，讓你留下來等答案。" }),
  missionChoice({ id: "in-morning", nodeId: "route-sena", skill: "時間介系詞", objectives: "時間介系詞基礎", prompt: "The information desk is busiest ___ the morning.", options: ["in", "at", "on"], answerIndex: 0, explanation: "morning 這類時段前用 in。", evidence: "The information desk is busiest in the morning.", location: "資訊櫃台", objective: "理解櫃台的固定忙碌時段。", narration: "排隊人潮變長，澄音要你判斷是否還值得留在這條調查路線。", hint: "morning 是一段時段，不是精確時刻或星期。", clue: "早晨櫃台較忙，但仍可取得情報", correctConsequence: "你正確理解告示，選了移動較快的側邊窗口。", wrongConsequence: "你卡在介系詞上；澄音直接把人流分布指給你看，仍帶你找到空窗口。" }),
];

const YORI_ROUTE_QUESTIONS: ScenarioMissionQuestion[] = [
  missionChoice({ id: "stairs-now", nodeId: "route-yori", skill: "現在進行式", objectives: "G05", prompt: "Look—two passengers ___ up the footbridge stairs.", options: ["walks", "is walking", "are walking"], answerIndex: 2, explanation: "two passengers 是複數，Look 指現在，用 are walking。", evidence: "Two passengers are walking up the footbridge stairs.", location: "東側天橋", objective: "確認天橋目前可以通行。", narration: "夜璃指向樓梯上的人影：『星象不重要，眼前有人正在走比較重要。』", hint: "two passengers 是複數；Look 指正在發生。", clue: "天橋目前可通行", correctConsequence: "你確認樓梯正在使用，和夜璃一起走上捷徑。", wrongConsequence: "你把複數主詞配錯；夜璃笑著重說一次，但仍帶你從天橋通過。" }),
  missionChoice({ id: "every-weekday", nodeId: "route-yori", skill: "時間搭配", objectives: "G02", prompt: "The footbridge opens early ___ weekday.", options: ["on every", "every", "at every"], answerIndex: 1, explanation: "every weekday 前不再加 on 或 at。", evidence: "The footbridge opens early every weekday.", location: "東側天橋", objective: "確認捷徑是否為平日固定開放。", narration: "樓梯口的告示只有一條平日規則。夜璃故意不替你翻譯。", hint: "every + 時間名詞可直接使用。", clue: "天橋每個平日提早開放", correctConsequence: "你知道這不是臨時陷阱，放心走上天橋。", wrongConsequence: "多出來的介系詞不影響夜璃理解；她替你改正後，捷徑依然開放。" }),
  missionChoice({ id: "train-leaves", nodeId: "route-yori", skill: "第三人稱單數", objectives: "G02", prompt: "The 7:20 train ___ from the far platform every morning.", options: ["leaves", "leave", "are leaving"], answerIndex: 0, explanation: "train 是第三人稱單數，every morning 指固定班表，用 leaves。", evidence: "The 7:20 train leaves from the far platform every morning.", location: "天橋中段", objective: "從高處確認固定班次方向。", narration: "從天橋能同時看見兩側月台，但只有一句固定班表描述可靠。", hint: "單數 train + 固定班表，要用一般現在式第三人稱。", clue: "目標列車固定從遠端月台發車", correctConsequence: "你沒有被近側列車吸引，直接往遠端月台走。", wrongConsequence: "你把固定班表當成眼前動作；夜璃用星環標出遠端軌道，讓你重新選路。" }),
  missionChoice({ id: "at-720", nodeId: "route-yori", skill: "時間介系詞", objectives: "時間介系詞基礎", prompt: "The train leaves ___ 7:20.", options: ["in", "on", "at"], answerIndex: 2, explanation: "精確時刻前使用 at。", evidence: "The train leaves at 7:20.", location: "天橋時鐘", objective: "確認離站時間。", narration: "夜璃把站內時鐘和任務卡並排：『這次真的只是介系詞，不是預言。』", hint: "精確時刻使用 at。", clue: "目標班次在 07:20 離站", correctConsequence: "時間線被你釘牢，最後交付不會把日期與時刻混在一起。", wrongConsequence: "你把日期介系詞搬到時刻前；夜璃補上一個 at，任務時間仍保住。" }),
  missionChoice({ id: "does-use", nodeId: "route-yori", skill: "基本問句", objectives: "G02／G18", prompt: "___ the Harbor train usually use the far platform?", options: ["Do", "Does", "Is"], answerIndex: 1, explanation: "Harbor train 是單數，一般動詞 use 的問句用 Does。", evidence: "Does the Harbor train usually use the far platform?", location: "天橋出口", objective: "向清潔人員確認固定月台。", narration: "天橋出口有人熟悉每日班次。夜璃讓你自己選擇正確的問句開頭。", hint: "單數 train + 一般動詞 use。", clue: "Harbor 班次通常使用遠端月台", correctConsequence: "對方直接回答 Yes, it does，捷徑方向得到確認。", wrongConsequence: "對方先把問句重說一次；夜璃沒有扣你任何好感，只記下這次錯因。" }),
];

const ANNOUNCEMENT_QUESTIONS: ScenarioMissionQuestion[] = [
  missionChoice({ id: "platform-change", nodeId: "announcement", skill: "聽力理解", objectives: "G18／首聽", listeningText: "Attention, passengers. The 7:20 Harbor train will now leave from platform five, not platform three. The departure time has not changed.", prompt: "What changed?", options: ["The departure time.", "The platform.", "The service name."], answerIndex: 1, explanation: "廣播說 now leave from platform five, not platform three；時間沒有改。", evidence: "Platform five, not platform three. The departure time has not changed.", location: "中央月台 · 廣播區", objective: "首聽一次，找出真正改變的資訊。", narration: "廣播鈴響起。畫面不會顯示逐字稿，你必須先聽完再決定。", hint: "先分成 old、new、unchanged 三格；不要因聽到 3 就選 3。", clue: "廣播：月台改到 5，時間不變", correctConsequence: "你立刻改往五號月台，沒有被舊月台號碼拖住。", wrongConsequence: "你把聽到的舊月台當成新資訊；旅伴請你看站務箭頭，帶你補救到五號月台。" }),
  missionChoice({ id: "time-change", nodeId: "announcement", skill: "聽力理解", objectives: "G18／首聽", listeningText: "The Airport shuttle still leaves from platform two, but it is delayed. The new departure time is 7:35.", prompt: "When does the shuttle leave now?", options: ["At 7:20.", "From platform two.", "At 7:35."], answerIndex: 2, explanation: "月台不變，但 new departure time 是 7:35。", evidence: "The new departure time is 7:35.", location: "中央月台 · 廣播區", objective: "首聽一次，找出新的離站時間。", narration: "這次改的是時間，不是月台。相似格式的異動需要重新判斷。", hint: "When 問時間；platform two 不能回答 when。", clue: "廣播：新離站時間 07:35", correctConsequence: "你更新任務倒數，知道交付窗口多了十五分鐘。", wrongConsequence: "你保留了原時間；澄音指向更新時鐘幫你修正，但這次算一次繞路。" }),
  missionChoice({ id: "entrance-change", nodeId: "announcement", skill: "聽力理解", objectives: "G02／G18／首聽", listeningText: "The 7:20 train is on time. The south entrance is closed today, so passengers should use the north entrance.", prompt: "What should passengers do?", options: ["Use the north entrance.", "Wait for a later train.", "Go to the south entrance."], answerIndex: 0, explanation: "列車準時；真正需要採取的行動是改走 north entrance。", evidence: "The south entrance is closed today, so passengers should use the north entrance.", location: "中央月台 · 廣播區", objective: "首聽一次，選出下一步行動。", narration: "廣播先說列車準時，接著才說入口異動。你不能只抓到 on time 就停。", hint: "問題問 do；找 should 後面的動作。", clue: "廣播：改走北側入口", correctConsequence: "你直接轉向北側入口，沒有在封閉門前浪費時間。", wrongConsequence: "你先走到南側才看見封鎖帶；凜夏帶你折返，任務仍然可完成。" }),
  missionChoice({ id: "replacement-bus", nodeId: "announcement", skill: "聽力理解", objectives: "G18／首聽", listeningText: "The 7:20 Coast train does not leave this morning. A replacement bus is waiting outside the station near Exit B.", prompt: "Where is the replacement bus?", options: ["On platform B.", "Outside near Exit B.", "At the information desk."], answerIndex: 1, explanation: "廣播明確說 waiting outside the station near Exit B。", evidence: "A replacement bus is waiting outside the station near Exit B.", location: "中央月台 · 廣播區", objective: "首聽一次，找到替代交通的位置。", narration: "列車沒有延後，而是換成替代巴士。這種異動不能只靠月台資訊處理。", hint: "Where 問位置；Exit B 不是 platform B。", clue: "廣播：替代巴士在 B 出口外", correctConsequence: "你記下正確出口，知道交付人可能跟著改到站外。", wrongConsequence: "你把 Exit B 聽成 Platform B；夜璃提醒兩個地點不是同一處，帶你改道。" }),
  missionChoice({ id: "boarding-now", nodeId: "announcement", skill: "聽力理解", objectives: "G05／G18／首聽", listeningText: "Passengers for the 7:20 North Line train, please go to platform four. The train is boarding now and leaves in six minutes.", prompt: "What is happening now?", options: ["The station closes in six minutes.", "The train arrives tomorrow.", "Passengers are boarding the train."], answerIndex: 2, explanation: "is boarding now 表示乘客現在正在登車。", evidence: "The train is boarding now.", location: "中央月台 · 廣播區", objective: "首聽一次，判斷眼前正在發生的事。", narration: "廣播同時提供月台和現在狀態。你要回答的是 now，而不是平常班表。", hint: "抓 now 與 is boarding。", clue: "廣播：四號月台正在登車", correctConsequence: "你知道交付窗口正在縮短，立刻前往四號月台。", wrongConsequence: "你沒有抓到進行狀態；旅伴看見登車燈號後帶你追上隊伍。" }),
];

const STAFF_QUESTIONS: ScenarioMissionQuestion[] = [
  missionChoice({ id: "direct-platform", nodeId: "staff", skill: "對話回應", objectives: "G18", prompt: "Station worker: “Which platform does the Harbor train use?”", options: ["Platform five.", "At 7:20.", "Yes, it does."], answerIndex: 0, explanation: "Which platform 要回答月台，不是時間或 yes/no。", evidence: "Which platform ...? → Platform five.", location: "資訊櫃台", objective: "直接回答站務員的月台問題。", narration: "站務員正在確認你是否找對班次。自然回應能讓對話直接往下走。", hint: "Which platform 問哪個月台。", clue: "對話確認：Platform five", correctConsequence: "站務員點頭並把新的路線貼紙交給你。", wrongConsequence: "站務員露出困惑表情，再把問題縮短成『Which platform?』；你仍取得路線。" }),
  missionChoice({ id: "yes-no", nodeId: "staff", skill: "對話回應", objectives: "G02／G18", prompt: "Station worker: “Does the train usually arrive on time?”", options: ["On platform two.", "Yes, it usually does.", "At seven o'clock."], answerIndex: 1, explanation: "Does 開頭的是非問句，直接回答可用 Yes, it usually does。", evidence: "Does ...? → Yes, it usually does.", location: "資訊櫃台", objective: "自然回答 Does 問句。", narration: "站務員想確認今天是不是例外狀況。", hint: "Does 開頭通常用 Yes/No + 主詞 + does 回答。", clue: "對話確認：這班車平常準時", correctConsequence: "站務員立即把今天標成臨時異常，交付情報更完整。", wrongConsequence: "你的回答沒有處理 yes/no；站務員換個方式問一次，任務沒有失敗。" }),
  missionChoice({ id: "when", nodeId: "staff", skill: "對話回應", objectives: "G18／時間介系詞", prompt: "Station worker: “When does the next train leave?”", options: ["From platform four.", "Every train.", "At 7:35."], answerIndex: 2, explanation: "When 問時間；At 7:35 是直接回答。", evidence: "When ...? → At 7:35.", location: "資訊櫃台", objective: "回答新的離站時間。", narration: "改道後，站務員要確認你知道下一個可用班次。", hint: "When 問何時，不是 where。", clue: "對話確認：下一班 07:35", correctConsequence: "你和站務員的時間資訊一致，交付路線保持有效。", wrongConsequence: "你回答了地點而不是時間；站務員指向時鐘，讓你補回 07:35。" }),
  missionChoice({ id: "how-commute", nodeId: "staff", skill: "對話回應", objectives: "G02／G18", prompt: "Station worker: “How do you usually get to work?”", options: ["I usually commute by train.", "At platform three.", "Yes, I am."], answerIndex: 0, explanation: "How do you get to work 問通勤方式；commute by train 直接回答方式。", evidence: "I usually commute by train.", location: "資訊櫃台", objective: "回答平常通勤方式。", narration: "站務員需要判斷你是否熟悉這條交通路線。", hint: "How 問方式；用 by + 交通工具回答。", clue: "對話確認：你熟悉火車通勤", correctConsequence: "站務員省略基礎說明，直接告訴你今天的異動。", wrongConsequence: "回答與通勤方式無關；站務員仍用地圖指路，但流程多了一步。" }),
  missionChoice({ id: "natural-question", nodeId: "staff", skill: "基本問句", objectives: "G02／G18", prompt: "Which question should you ask to confirm the departure time?", options: ["Does the train leaves at 7:20?", "Does the train leave at 7:20?", "Is the train leave at 7:20?"], answerIndex: 1, explanation: "Does 後用原形 leave。", evidence: "Does the train leave at 7:20?", location: "資訊櫃台", objective: "用自然問句確認離站時間。", narration: "最後一項站務確認必須由你開口。", hint: "Does 已經處理第三人稱；主要動詞用原形。", clue: "對話確認：離站時間已核對", correctConsequence: "站務員直接回答並蓋上確認章。", wrongConsequence: "站務員理解意思後替你重說正確句型；情報仍然有效，但留下修復紀錄。" }),
];

const CONTACT_QUESTIONS: ScenarioMissionQuestion[] = [
  missionChoice({ id: "clock-to-desk", nodeId: "contact", skill: "閱讀理解", objectives: "G02／G05", passage: "Mina usually waits by the station clock. Today she is standing beside the information desk because the platform changed.", prompt: "Where is Mina now?", options: ["By the station clock.", "On the train.", "Beside the information desk."], answerIndex: 2, explanation: "usually 是平常位置；Today she is standing 指現在在資訊櫃台旁。", evidence: "Today she is standing beside the information desk.", location: "中央月台", objective: "找到今天改變位置的聯絡人。", narration: "三個候選人分散在月台上。任務卡同時寫了平常位置和今天的位置。", hint: "題目問 now；找 Today + is standing。", clue: "聯絡人：Mina 現在在資訊櫃台旁", correctConsequence: "你在櫃台旁找到 Mina，她手上正拿著交付封套。", wrongConsequence: "你先走到時鐘下；沒看到人後依旅伴提示折返櫃台，仍找到 Mina。" }),
  missionChoice({ id: "folder-now", nodeId: "contact", skill: "閱讀理解", objectives: "G05", passage: "Leo is checking his phone near platform four. Mr. Ito is carrying a gray folder beside platform five. The contact is carrying a gray folder.", prompt: "Who is the contact?", options: ["Mr. Ito.", "Leo.", "The station worker."], answerIndex: 0, explanation: "聯絡人正在拿 gray folder；符合的是 Mr. Ito。", evidence: "Mr. Ito is carrying a gray folder.", location: "五號月台", objective: "依眼前動作辨認聯絡人。", narration: "姓名不是唯一線索；任務卡要求你找正在拿灰色資料夾的人。", hint: "找 is carrying a gray folder 的主詞。", clue: "聯絡人：Mr. Ito · 灰色資料夾", correctConsequence: "你走向 Mr. Ito，資料封套上的編號也吻合。", wrongConsequence: "你先叫住正在看手機的 Leo；他搖頭並指向灰色資料夾，交付仍可補救。" }),
  missionChoice({ id: "does-wait", nodeId: "contact", skill: "基本問句", objectives: "G02／G18", passage: "The contact usually waits near the ticket gate. Today the gate is closed, so she is waiting on platform two.", prompt: "Which question checks her usual location?", options: ["Is she wait near the gate?", "Does she usually wait near the gate?", "Does she usually waits near the gate?"], answerIndex: 1, explanation: "一般現在式問句用 Does + 主詞 + 原形 wait。", evidence: "Does she usually wait near the gate?", location: "二號月台", objective: "向站務員確認聯絡人的平常位置。", narration: "今天的入口關閉，先確認平常安排才能理解她為什麼換位置。", hint: "Does 後使用 wait，不是 waits。", clue: "聯絡人平常在閘口，今天在二號月台", correctConsequence: "站務員確認了她的移動原因，你沒有把兩個位置當成矛盾。", wrongConsequence: "問句結構讓站務員停頓；他仍指出二號月台，並替你修正動詞。" }),
  missionChoice({ id: "two-employees", nodeId: "contact", skill: "主詞動詞一致", objectives: "G03 基礎／G05", passage: "Two employees are waiting near the stairs. One employee is holding a blue envelope. The contact has a blue envelope.", prompt: "Which sentence is correct?", options: ["Two employees is waiting near the stairs.", "One employee are holding an envelope.", "Two employees are waiting near the stairs."], answerIndex: 2, explanation: "Two employees 是複數，現在進行式用 are waiting。", evidence: "Two employees are waiting near the stairs.", location: "天橋樓梯口", objective: "從多人場景中鎖定正確描述。", narration: "樓梯口有兩名員工，其中一人拿著任務指定的藍色信封。", hint: "two employees 是複數；進行式搭配 are。", clue: "樓梯口有兩名員工，其中一人持藍色信封", correctConsequence: "你先確認整體場景，再依信封找到正確的人。", wrongConsequence: "主詞與 be 動詞沒有配好；夜璃用眼前人數幫你修正，交付仍繼續。" }),
  missionChoice({ id: "routine-vs-now", nodeId: "contact", skill: "閱讀理解", objectives: "G02／G05", passage: "Nora normally works the early shift. Today she is meeting you at 7:18 because another employee changed shifts with her.", prompt: "What is Nora doing today?", options: ["She is meeting you at 7:18.", "She works every night.", "She is leaving the city."], answerIndex: 0, explanation: "Today she is meeting 指今天正在執行的安排；early shift 是平常狀況。", evidence: "Today she is meeting you at 7:18.", location: "中央月台", objective: "判斷聯絡人今天的實際行動。", narration: "排班臨時更換，平常班別不能直接代表今天的行動。", hint: "題目問 today；找 Today + is meeting。", clue: "聯絡人：Nora · 07:18 會合", correctConsequence: "你在約定時間找到 Nora，封套交接進入最後一步。", wrongConsequence: "你先去找早班窗口；同事告訴你 Nora 正在月台會合，讓你追回正確位置。" }),
];

const FINAL_QUESTIONS: ScenarioMissionQuestion[] = [
  missionChoice({ id: "old-new-platform", nodeId: "final", skill: "文件整合", objectives: "G02／G18", prompt: "The board shows platform three, but the latest announcement says platform five. Where should you go?", options: ["Platform three.", "Platform five.", "The ticket office."], answerIndex: 1, explanation: "latest announcement 是較新的資訊，所以應前往五號月台。", evidence: "Latest update: platform five, not platform three.", location: "五號月台 · 最終交付點", objective: "整合舊看板與最新廣播。", narration: "交付封套已在你手上，但最後一個月台箭頭剛剛翻面。", hint: "判斷哪個來源較新；latest announcement 優先。", clue: "最終座標：Platform 5",
    correctConsequence: "你依最新資訊抵達五號月台，在車門關閉前完成交付。", wrongConsequence: "你回到舊月台才發現列車不在；旅伴帶你追到五號月台，交付仍完成但情報較不完整。",
    document: { title: "FINAL ROUTE CHECK", columns: ["Source", "Platform", "Time"], rows: [["Departure board", "3", "07:08"], ["Latest announcement", "5", "07:14"]] },
  }),
  missionChoice({ id: "new-time", nodeId: "final", skill: "文件整合", objectives: "G02／時間", prompt: "The original departure is 7:20. The train is delayed fifteen minutes. What is the new departure time?", options: ["7:05.", "7:20.", "7:35."], answerIndex: 2, explanation: "7:20 延後十五分鐘是 7:35。", evidence: "Original 7:20 + 15-minute delay = 7:35.", location: "中央月台 · 最終交付點", objective: "算出新的離站時間。", narration: "資料交付必須寫上實際班次時間，不能沿用舊票面。", hint: "delay 表示往後，不是往前。", clue: "最終時間：07:35", correctConsequence: "你在封套上補上 07:35，聯絡人取得完整時間情報。", wrongConsequence: "你保留原時間；聯絡人仍收下資料，但必須再向站務員確認一次。",
    document: { title: "DELAY NOTICE", columns: ["Original", "Delay", "New time"], rows: [["07:20", "+15 min", "?"]] },
  }),
  missionChoice({ id: "entrance-action", nodeId: "final", skill: "下一步判斷", objectives: "G02／G18", prompt: "The train is on time, but the usual entrance is closed today. Which action fits the update?", options: ["Use the north entrance now.", "Wait until tomorrow.", "Keep using the closed entrance."], answerIndex: 0, explanation: "列車準時；今天的變化是 usual entrance closed，所以應立即改走北側入口。", evidence: "Today the usual entrance is closed; use the north entrance.", location: "北側入口 · 最終交付點", objective: "依今天的例外狀況採取行動。", narration: "倒數沒有延長。這次要改的是路線，不是時間。", hint: "but 後面是需要處理的例外；today 指現在。", clue: "最終路線：北側入口", correctConsequence: "你從北側入口直接切回月台，準時把資料交給聯絡人。", wrongConsequence: "你在封閉入口前停住；凜夏帶你繞行北側，仍趕上交付。" }),
  missionChoice({ id: "contact-now", nodeId: "final", skill: "時間線整合", objectives: "G02／G05", prompt: "The contact usually waits by the clock. Right now, she is standing beside the information desk. Where do you deliver the file?", options: ["By the clock.", "Beside the information desk.", "At home."], answerIndex: 1, explanation: "Right now + is standing 是目前位置；usually 只是平常狀況。", evidence: "Right now, she is standing beside the information desk.", location: "資訊櫃台 · 最終交付點", objective: "依現在位置完成交付。", narration: "最後一則訊息同時包含平常位置與現在位置。", hint: "題目問現在的交付地點；抓 Right now。", clue: "最終聯絡點：資訊櫃台旁", correctConsequence: "你直接找到聯絡人，資料與現場異動一起完整交付。", wrongConsequence: "你先在時鐘下等候；聯絡人主動從櫃台旁揮手，交付完成但多了一次折返。" }),
  missionChoice({ id: "does-leave", nodeId: "final", skill: "基本問句", objectives: "G02／G18", prompt: "Choose the final confirmation question.", options: ["Does the train leaves from platform four?", "Is the train leave from platform four?", "Does the train leave from platform four?"], answerIndex: 2, explanation: "Does 後主要動詞用原形 leave。", evidence: "Does the train leave from platform four?", location: "四號月台 · 最終交付點", objective: "在交付前完成最後口頭確認。", narration: "聯絡人只需要一句清楚的是非問句，就能確認你拿到的月台資料。", hint: "Does 已承擔第三人稱變化。", clue: "最終確認問句已完成", correctConsequence: "對方回答 Yes, it does；資料在列車離站前完成交接。", wrongConsequence: "對方聽懂後重述正確句子；交付仍完成，但本輪留下問句修復標記。" }),
];

const PRIMARY_SCENARIO_QUESTIONS: readonly ScenarioMissionQuestion[] = [
  ...BOARD_QUESTIONS,
  ...RINKA_ROUTE_QUESTIONS,
  ...SENA_ROUTE_QUESTIONS,
  ...YORI_ROUTE_QUESTIONS,
  ...ANNOUNCEMENT_QUESTIONS,
  ...STAFF_QUESTIONS,
  ...CONTACT_QUESTIONS,
  ...FINAL_QUESTIONS,
];

export const SCENARIO_QUESTIONS: readonly ScenarioMissionQuestion[] = [
  ...PRIMARY_SCENARIO_QUESTIONS,
  ...V24_SCENARIO_QUESTIONS,
  ...V32_CHAPTER_CASE_QUESTIONS,
];

const QUESTION_BY_ID = new Map(SCENARIO_QUESTIONS.map((question) => [question.id, question]));
const QUESTIONS_BY_MISSION_NODE = new Map<string, ScenarioMissionQuestion[]>();
for (const question of SCENARIO_QUESTIONS) {
  const key = `${question.mission.missionId}:${question.mission.nodeId}`;
  const list = QUESTIONS_BY_MISSION_NODE.get(key) ?? [];
  list.push(question);
  QUESTIONS_BY_MISSION_NODE.set(key, list);
}

export function getScenarioQuestion(id?: string | null) {
  return id ? QUESTION_BY_ID.get(id) : undefined;
}

export function scenarioQuestionsForNode(nodeId: ScenarioNodeId, missionId = SCENARIO_MISSION_ID) {
  return QUESTIONS_BY_MISSION_NODE.get(`${missionId}:${nodeId}`) ?? [];
}

export function scenarioProcessResult(setbacks: number, recoveredMaxSetbacks = 2): ScenarioProcessResult {
  if (setbacks <= 0) return "clean";
  if (setbacks <= recoveredMaxSetbacks) return "recovered";
  return "detour";
}

export function scenarioEnding(clues: number, fullIntelThreshold = 5): ScenarioEnding {
  return clues >= fullIntelThreshold ? "full-intel" : "standard-delivery";
}

export const SCENARIO_PROCESS_COPY: Record<ScenarioProcessResult, { label: string; detail: string }> = {
  clean: { label: "精準路線", detail: "你沒有走錯節點，所有異動都在第一次判斷時被正確處理。" },
  recovered: { label: "修復路線", detail: "途中出現誤判，但你依旅伴與現場回應完成修正，沒有清除任何學習紀錄。" },
  detour: { label: "繞行路線", detail: "你經過額外月台與對話才抵達終點；任務仍完成，錯因會成為後續修復材料。" },
};

export const SCENARIO_ENDING_COPY: Record<ScenarioEnding, { label: string; detail: string }> = {
  "full-intel": { label: "完整情報結局", detail: "資料、最新月台與時間異動一起交付，聯絡人能立刻採取下一步。" },
  "standard-delivery": { label: "一般完成結局", detail: "核心資料已安全交付；部分異動情報需要聯絡人再向站務員確認。" },
};

const PRIMARY_SCENARIO_MISSION: ScenarioMissionDefinition = {
  id: SCENARIO_MISSION_ID,
  unit: "U02",
  title: SCENARIO_MISSION_TITLE,
  shortTitle: "失序列車",
  kicker: "U02 · MAIN SITUATION ADVENTURE",
  description: "在列車離站前完成資料交付；查看看板、首聽廣播、詢問站務員並處理最後異動。",
  kind: "main",
  duration: "約 10–12 分鐘",
  focus: "6 節點 · 3 條旅伴路線 · 2 種結局",
  imageSrc: "/game/scenarios/station-platform-v23.webp",
  imageAlt: "雨後清晨的車站月台、電子看板、資訊櫃台與天橋",
  clockLabel: "MISSION CLOCK",
  nodes: NODE_META as Readonly<Record<string, ScenarioNodeMeta>>,
  sceneZones: [
    { id: "board", slot: "left", label: "電子看板", detail: "班次、時間、月台與狀態" },
    { id: "desk", slot: "center", label: "資訊櫃台", detail: "站務詢問與臨時查核" },
    { id: "stairs", slot: "right", label: "天橋捷徑", detail: "跨月台與封閉入口替代路線" },
    { id: "platform", slot: "lower", label: "月台區", detail: "廣播、聯絡人與最終交付" },
  ],
  sequence: primaryScenarioNodeSequence,
  questions: PRIMARY_SCENARIO_QUESTIONS,
  fullIntelThreshold: 5,
  recoveredMaxSetbacks: 2,
  reward: { standardGold: 45, fullGold: 70, cleanBonus: 10, standardAffinity: 1, fullAffinity: 2 },
  endings: SCENARIO_ENDING_COPY,
  companionLines: {
    rinka: "快速路線會縮短場景距離，但不縮短你的作答時間。",
    sena: "調查路線能看更多資訊；主動提示仍會誠實標記 assisted。",
    yori: "星環捷徑風險較高，但不會加入 U02 尚未教過的唯一線索。",
  },
  caseFile: {
    objective: "在 07:20 前比對看板、廣播與站務資訊，找到可信月台並完成交付。",
    threat: "同一班列車出現兩個合理版本，其中一份正在自動確認自己。",
    sourceCount: 4,
    completionEvidence: "07:20 雙重時刻截圖",
  },
  phraseTools: [
    { english: "check the departure time", chinese: "確認離站時間", use: "把時間與班次放在同一列核對。" },
    { english: "arrive on time", chinese: "準時抵達", use: "描述人或班次是否符合原定時間。" },
    { english: "confirm the platform", chinese: "確認月台", use: "用自然問句取得最後位置。" },
  ],
};

export const SCENARIO_MISSIONS: readonly ScenarioMissionDefinition[] = [
  ...V32_CHAPTER_CASE_MISSIONS.filter((mission) => mission.unit === "U01"),
  PRIMARY_SCENARIO_MISSION,
  ...V24_SCENARIO_MISSIONS,
  ...V32_CHAPTER_CASE_MISSIONS.filter((mission) => mission.unit !== "U01"),
];
const MISSION_BY_ID = new Map(SCENARIO_MISSIONS.map((mission) => [mission.id, mission]));

export function getScenarioMission(id?: string | null) {
  return id ? MISSION_BY_ID.get(id) : undefined;
}

export function getScenarioMissions(kind?: ScenarioMissionKind) {
  return kind ? SCENARIO_MISSIONS.filter((mission) => mission.kind === kind) : [...SCENARIO_MISSIONS];
}

export function scenarioMissionUnit(mission: ScenarioMissionDefinition) {
  return mission.unit ?? "U02";
}
