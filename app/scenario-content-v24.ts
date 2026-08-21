import type { CompanionId } from "./companions";
import type {
  ScenarioDocument,
  ScenarioMissionDefinition,
  ScenarioMissionQuestion,
  ScenarioNodeId,
  ScenarioNodeMeta,
  ScenarioWeaknessKey,
} from "./scenario-mission";

const COMMUTE_ID = "u02-0655-commute-detour";
const SHIFT_ID = "u02-0800-shift-handover";
const CHANGE_ID = "u02-platform-change-watch";

const COMMUTE_NODES: Readonly<Record<string, ScenarioNodeMeta>> = {
  "commute-plan": { id: "commute-plan", mark: "01", label: "選擇通勤路線", short: "比較平常班次與現在狀況", time: "06:55", zone: "road" },
  "commute-question": { id: "commute-question", mark: "02", label: "詢問交通資訊", short: "用基本問句取得答案", time: "07:00", zone: "stop" },
  "commute-now": { id: "commute-now", mark: "03", label: "處理臨時改道", short: "分清習慣與眼前行動", time: "07:06", zone: "station" },
};

const SHIFT_NODES: Readonly<Record<string, ScenarioNodeMeta>> = {
  "shift-board": { id: "shift-board", mark: "01", label: "查看早班表", short: "確認人員、日期與班別", time: "07:48", zone: "schedule" },
  "shift-handover": { id: "shift-handover", mark: "02", label: "完成交接詢問", short: "問清楚固定工作安排", time: "07:54", zone: "handover" },
  "shift-now": { id: "shift-now", mark: "03", label: "處理現場異動", short: "依現在狀況分配行動", time: "08:00", zone: "work-area" },
};

const CHANGE_NODES: Readonly<Record<string, ScenarioNodeMeta>> = {
  "change-board": { id: "change-board", mark: "01", label: "比對新舊看板", short: "鎖定最新班次資訊", time: "07:32", zone: "board" },
  "change-listen": { id: "change-listen", mark: "02", label: "首聽異動廣播", short: "一次聽出時間或月台", time: "07:36", zone: "platform" },
  "change-final": { id: "change-final", mark: "03", label: "執行最新指示", short: "整合資訊前往正確位置", time: "07:40", zone: "stairs" },
};

const REPAIR_NODES: Readonly<Record<string, ScenarioNodeMeta>> = {
  "repair-first": { id: "repair-first", mark: "R1", label: "新情境修復", short: "不用原題重新判斷", time: "REPAIR 1", zone: "desk" },
  "repair-second": { id: "repair-second", mark: "R2", label: "延伸情境驗證", short: "再用另一情境完成轉移", time: "REPAIR 2", zone: "platform" },
};

type ChoiceSeed = {
  missionId: string;
  nodes: Readonly<Record<string, ScenarioNodeMeta>>;
  id: string;
  nodeId: ScenarioNodeId;
  skill: string;
  objectives: string;
  weaknessKey: ScenarioWeaknessKey;
  prompt: string;
  options: readonly [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  evidence: string;
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

function choice(seed: ChoiceSeed): ScenarioMissionQuestion {
  const ids = ["a", "b", "c"] as const;
  const node = seed.nodes[seed.nodeId]!;
  return {
    id: `SM-V24-${seed.missionId.toUpperCase()}-${seed.nodeId.toUpperCase()}-${seed.id}`,
    unit: "U02",
    kind: "choice",
    skill: `${seed.skill} · 情境遷移`,
    prompt: seed.prompt,
    passage: seed.passage,
    listeningText: seed.listeningText,
    hint: seed.hint,
    options: seed.options.map((label, index) => ({ id: ids[index], label })),
    answerId: ids[seed.answerIndex],
    explanation: seed.explanation,
    evidence: seed.evidence,
    sourceLabel: `U02／${seed.objectives}／v24 情境未見變體`,
    variant: {
      fingerprint: `v1:scenario:v24:${seed.missionId}:${seed.nodeId}:${seed.id}`,
      family: `scenario-v24-${seed.missionId}-${seed.nodeId}`,
      pattern: seed.id,
      version: 1,
    },
    mission: {
      missionId: seed.missionId,
      nodeId: seed.nodeId,
      time: node.time,
      location: seed.location,
      zone: node.zone,
      objective: seed.objective,
      narration: seed.narration,
      hint: seed.hint,
      clue: seed.clue,
      correctConsequence: seed.correctConsequence,
      wrongConsequence: seed.wrongConsequence,
      weaknessKey: seed.weaknessKey,
      document: seed.document,
    },
  };
}

const commute = (seed: Omit<ChoiceSeed, "missionId" | "nodes">) => choice({ ...seed, missionId: COMMUTE_ID, nodes: COMMUTE_NODES });
const shift = (seed: Omit<ChoiceSeed, "missionId" | "nodes">) => choice({ ...seed, missionId: SHIFT_ID, nodes: SHIFT_NODES });
const change = (seed: Omit<ChoiceSeed, "missionId" | "nodes">) => choice({ ...seed, missionId: CHANGE_ID, nodes: CHANGE_NODES });

const COMMUTE_QUESTIONS: readonly ScenarioMissionQuestion[] = [
  commute({ id: "route-arrival", nodeId: "commute-plan", skill: "文件判讀", objectives: "G02／arrive／shift", weaknessKey: "schedule-reading", prompt: "Your shift starts at 8:00. Which route arrives before your shift?", options: ["Bus 12, arriving at 8:10.", "Train A, arriving at 7:42.", "Bus 8, arriving at 8:05."], answerIndex: 1, explanation: "班別八點開始，只有 Train A 在八點前抵達。", evidence: "Train A arrives at 7:42; the shift starts at 8:00.", location: "雨後路口 · 路線看板", objective: "選出能在早班前抵達的路線。", narration: "道路剛解除封鎖，三條路線的抵達時間不同。", hint: "先找 shift starts，再比較每條路線的 arrival。", clue: "Train A · 07:42", correctConsequence: "你選到能準時抵達的列車路線。", wrongConsequence: "你先走向較晚的班次；旅伴幫你重新對齊抵達時間，仍能改道。", document: { title: "COMMUTE OPTIONS", columns: ["Route", "Arrival", "Status"], rows: [["Bus 12", "08:10", "On time"], ["Train A", "07:42", "On time"], ["Bus 8", "08:05", "Delayed"]] } }),
  commute({ id: "route-delay", nodeId: "commute-plan", skill: "文件判讀", objectives: "G02／delay／on time", weaknessKey: "schedule-reading", prompt: "Which service has a fifteen-minute delay?", options: ["Green Bus.", "City Train.", "River Shuttle."], answerIndex: 0, explanation: "Green Bus 的狀態欄寫 Delayed 15 min。", evidence: "Green Bus · Delayed 15 min", location: "公車站 · 即時資訊", objective: "找出正在延誤的通勤工具。", narration: "雨勢變小，但其中一條路線仍受塞車影響。", hint: "沿同一列讀 service 與 status。", clue: "Green Bus · 延誤 15 分鐘", correctConsequence: "你避開延誤班次，保留足夠通勤時間。", wrongConsequence: "你把另一班的狀態讀進來；旅伴指出同列資訊後帶你換線。", document: { title: "LIVE TRANSIT", columns: ["Service", "Departure", "Status"], rows: [["Green Bus", "06:58", "Delayed 15 min"], ["City Train", "07:02", "On time"], ["River Shuttle", "07:08", "On time"]] } }),
  commute({ id: "weekday-frequency", nodeId: "commute-plan", skill: "班表理解", objectives: "G02／weekday", weaknessKey: "schedule-reading", prompt: "The express bus leaves at 6:50 ___ weekday.", options: ["on every", "every", "in every"], answerIndex: 1, explanation: "every weekday 可直接表示每個平日，不需再加介系詞。", evidence: "The express bus leaves at 6:50 every weekday.", location: "候車棚 · 固定班表", objective: "確認平日固定班次。", narration: "即時資訊旁邊還貼著平日班表。", hint: "every + 時間名詞可直接放在句尾。", clue: "Express bus · every weekday", correctConsequence: "你確認這是固定平日班次。", wrongConsequence: "站務人員仍聽懂，但旅伴在任務卡上劃掉多餘介系詞。" }),
  commute({ id: "departure-platform", nodeId: "commute-plan", skill: "文件判讀", objectives: "G02／departure／platform", weaknessKey: "schedule-reading", prompt: "Where does the 7:05 train leave from?", options: ["Platform 1.", "Platform 2.", "Platform 4."], answerIndex: 2, explanation: "07:05 這一列的 Departure point 是 Platform 4。", evidence: "07:05 · North Train · Platform 4", location: "車站入口 · 班次表", objective: "找出下一班車的出發月台。", narration: "你已抵達車站入口，還要找對月台。", hint: "先鎖定 7:05，再往右讀 departure point。", clue: "North Train · Platform 4", correctConsequence: "你直接走向四號月台。", wrongConsequence: "你走向相鄰月台；旅伴用時間欄重新定位，任務繼續。", document: { title: "DEPARTURES", columns: ["Time", "Service", "From"], rows: [["06:58", "City Local", "Platform 1"], ["07:05", "North Train", "Platform 4"], ["07:12", "Airport Line", "Platform 2"]] } }),
  commute({ id: "leave-home", nodeId: "commute-plan", skill: "第三人稱單數", objectives: "G02", weaknessKey: "third-person", prompt: "Mina usually ___ home at 6:40.", options: ["leave", "leaves", "is leave"], answerIndex: 1, explanation: "Mina 是第三人稱單數，固定習慣用 leaves。", evidence: "Mina usually leaves home at 6:40.", location: "通勤紀錄 · 出發時間", objective: "讀懂通勤者的固定出門時間。", narration: "你先查看 Mina 平常的通勤紀錄，才能判斷今天是否來得及。", hint: "Mina = she；usually 指固定習慣。", clue: "Mina 平常 06:40 離家", correctConsequence: "你正確估算她的平常通勤節奏。", wrongConsequence: "你漏掉第三人稱變化；旅伴重述句子後仍完成估算。" }),

  commute({ id: "how-commute", nodeId: "commute-question", skill: "基本問句", objectives: "G18／commute", weaknessKey: "does-base", prompt: "Which question asks about a person's usual commute?", options: ["How do you usually get to work?", "Where you are work?", "How you usually gets to work?"], answerIndex: 0, explanation: "How do you usually get to work? 是自然的通勤問法。", evidence: "How do you usually get to work?", location: "候車棚 · 乘客對話", objective: "詢問對方平常怎麼通勤。", narration: "另一位乘客熟悉這一帶，你需要問出她平常的路線。", hint: "you 的一般動詞問句使用 do + 原形。", clue: "平常通勤方式已確認", correctConsequence: "對方直接告訴你她平常搭火車。", wrongConsequence: "對方停頓後仍猜到意思；旅伴替你重組問句。" }),
  commute({ id: "does-arrive", nodeId: "commute-question", skill: "基本問句", objectives: "G02／G18", weaknessKey: "does-base", prompt: "Does the bus usually ___ on time?", options: ["arrives", "arrive", "arriving"], answerIndex: 1, explanation: "Does 已承擔第三人稱變化，後面用原形 arrive。", evidence: "Does the bus usually arrive on time?", location: "公車站 · 站務詢問", objective: "確認公車平常是否準時。", narration: "即時看板暫時沒有更新，你改向站務員確認。", hint: "看到 Does，主要動詞回原形。", clue: "公車平常準時", correctConsequence: "站務員回答 Yes, it does，今天確實是例外。", wrongConsequence: "站務員先重述正確問句才回答；旅伴記住這個錯因。" }),
  commute({ id: "when-shift", nodeId: "commute-question", skill: "基本問句", objectives: "G02／G18／shift", weaknessKey: "does-base", prompt: "Which question asks for the start time of Leo's shift?", options: ["When does Leo's shift start?", "When Leo's shift starts?", "When is Leo's shift start?"], answerIndex: 0, explanation: "一般動詞 start 的 WH 問句使用 When does + 主詞 + 原形。", evidence: "When does Leo's shift start?", location: "車站入口 · 工作訊息", objective: "問出 Leo 的上班時間。", narration: "同事只說 Leo 是早班，沒有寫明幾點開始。", hint: "does 後用原形 start。", clue: "Leo 的班別開始時間已取得", correctConsequence: "同事回覆 At eight，通勤截止時間確定。", wrongConsequence: "同事仍理解問題，但旅伴留下 does + 原形修復標記。" }),
  commute({ id: "does-leave", nodeId: "commute-question", skill: "基本問句", objectives: "G02／G18／departure", weaknessKey: "does-base", prompt: "___ the train leave from this station every weekday?", options: ["Is", "Does", "Do"], answerIndex: 1, explanation: "train 是單數，leave 是一般動詞，所以用 Does。", evidence: "Does the train leave from this station every weekday?", location: "車站入口 · 服務櫃台", objective: "確認列車是否為固定平日班次。", narration: "路線圖只標車站名稱，你需要確認班次是否每天都從這裡出發。", hint: "主詞 train 是單數；後面已有原形 leave。", clue: "固定平日班次已確認", correctConsequence: "服務人員回答 Yes, it does。", wrongConsequence: "服務人員仍回答，但旅伴指出 be 動詞不能直接帶原形 leave。" }),
  commute({ id: "response-route", nodeId: "commute-question", skill: "問句回應", objectives: "G18／commute", weaknessKey: "does-base", prompt: "“How does Nina get to work?” Which answer fits?", options: ["At seven o'clock.", "By train.", "On platform two."], answerIndex: 1, explanation: "How does ... get to work? 問方式，By train 回答通勤工具。", evidence: "How does Nina get to work? — By train.", location: "候車棚 · 同行確認", objective: "依問句功能選擇自然回答。", narration: "旅伴要確認 Nina 的通勤方式，不是時間或月台。", hint: "How 在這裡問方式。", clue: "Nina 搭火車通勤", correctConsequence: "你鎖定火車路線。", wrongConsequence: "你回答了時間或地點；旅伴改問一次後帶你回到交通方式。" }),

  commute({ id: "today-walking", nodeId: "commute-now", skill: "現在進行式", objectives: "G02／G05", weaknessKey: "habit-now", prompt: "Ben usually takes the bus, but today he ___ to the station.", options: ["walks every day", "is walking", "walk"], answerIndex: 1, explanation: "today 表示今天的臨時狀況，用 is walking。", evidence: "Today he is walking to the station.", location: "雨後步道 · 臨時改道", objective: "判斷 Ben 今天正在採取的方式。", narration: "公車被塞在路口，Ben 已經離開候車棚。", hint: "usually 是平常；but today 指今天不同。", clue: "Ben 今天步行去車站", correctConsequence: "你跟上步行改道路線。", wrongConsequence: "你把今天的行動當成固定習慣；旅伴指出 today 後仍帶你追上。" }),
  commute({ id: "traffic-action", nodeId: "commute-now", skill: "行動判斷", objectives: "G02／traffic jam", weaknessKey: "schedule-reading", prompt: "The bus is stuck in a traffic jam. The train leaves in twelve minutes. What should you do?", options: ["Walk to the station now.", "Stay on the delayed bus.", "Go home and wait."], answerIndex: 0, explanation: "公車塞住，而火車十二分鐘後離站；立即步行到車站最符合目標。", evidence: "The bus is stuck; the train leaves in twelve minutes.", location: "塞車路口 · 分岔點", objective: "依現場狀況選擇可行路線。", narration: "紅色車燈排成長線，公車完全沒有前進。", hint: "找出哪個選項真的處理 traffic jam 與 departure time。", clue: "改走車站步道", correctConsequence: "你離開塞車路段，往車站入口前進。", wrongConsequence: "你多等了一輪號誌；旅伴提醒列車時間後帶你下車改道。" }),
  commute({ id: "passengers-waiting", nodeId: "commute-now", skill: "主詞動詞一致", objectives: "G03 基礎／G05", weaknessKey: "habit-now", prompt: "Look—several passengers ___ for another bus.", options: ["is waiting", "are waiting", "waits"], answerIndex: 1, explanation: "several passengers 是複數，Look 指眼前動作，所以用 are waiting。", evidence: "Several passengers are waiting for another bus.", location: "公車站 · 候車區", objective: "觀察乘客正在做什麼。", narration: "原班公車取消後，人群沒有離開站牌。", hint: "passengers 是複數；Look 指現在。", clue: "乘客正在等另一班車", correctConsequence: "你看懂現場仍有替代班次。", wrongConsequence: "你把複數配成單數；旅伴指向整群乘客完成修正。" }),
  commute({ id: "manager-message", nodeId: "commute-now", skill: "第三人稱單數", objectives: "G02／arrive", weaknessKey: "third-person", prompt: "Evan ___ his manager when he may arrive late.", options: ["message", "messages", "is message"], answerIndex: 1, explanation: "Evan 是第三人稱單數；描述固定處理方式時用 messages。", evidence: "Evan messages his manager when he may arrive late.", location: "車站入口 · 通勤聯絡", objective: "選擇延誤時的正確聯絡行動。", narration: "新的抵達時間可能影響早班，主管還不知道。", hint: "Evan = he；一般現在式要處理第三人稱。", clue: "主管已收到延誤訊息", correctConsequence: "你及時通知主管，延誤不會變成失聯。", wrongConsequence: "訊息仍送出，但旅伴在句子旁補上 -s。" }),
  commute({ id: "station-now", nodeId: "commute-now", skill: "平常與現在", objectives: "G02／G05", weaknessKey: "habit-now", prompt: "Nora usually cycles to work. Right now, she is waiting at the station. Where is she now?", options: ["At the station.", "On her bicycle.", "At the office."], answerIndex: 0, explanation: "Right now 指現在，is waiting at the station 給出目前位置。", evidence: "Right now, she is waiting at the station.", location: "車站大廳 · 集合點", objective: "依現在位置找到 Nora。", narration: "她平常騎車，但今天已傳來新的定位。", hint: "題目問 now，不要只抓 usually。", clue: "Nora 現在在車站", correctConsequence: "你直接在車站找到 Nora。", wrongConsequence: "你先找她的腳踏車；旅伴用 Right now 把你帶回現場位置。" }),
];

const SHIFT_QUESTIONS: readonly ScenarioMissionQuestion[] = [
  shift({ id: "early-worker", nodeId: "shift-board", skill: "文件判讀", objectives: "G02／shift", weaknessKey: "schedule-reading", prompt: "Who works the early shift on Monday?", options: ["Maya.", "Leo.", "Nina."], answerIndex: 1, explanation: "Monday 與 Early 這一格寫 Leo。", evidence: "Monday · Early · Leo", location: "營運室 · 班表牆", objective: "找出週一早班人員。", narration: "早班交接即將開始，班表上有三個人的不同班別。", hint: "先找 Monday，再找 Early 那一格。", clue: "週一早班：Leo", correctConsequence: "你把交接資料交給正確的人。", wrongConsequence: "你走向另一位同事；旅伴用日期與班別重新定位。", document: { title: "WEEKLY SHIFT BOARD", columns: ["Day", "Early", "Late"], rows: [["Monday", "Leo", "Maya"], ["Tuesday", "Nina", "Leo"], ["Wednesday", "Maya", "Nina"]] } }),
  shift({ id: "start-time", nodeId: "shift-board", skill: "文件判讀", objectives: "G02／at + 時刻", weaknessKey: "schedule-reading", prompt: "What time does the support shift start?", options: ["At 7:30.", "At 8:00.", "At 8:30."], answerIndex: 1, explanation: "Support 這一列的 Start 是 08:00。", evidence: "Support · Start 08:00", location: "營運室 · 班表牆", objective: "確認客服班別開始時間。", narration: "交接順序取決於不同部門的開始時間。", hint: "沿 Support 同一列讀 Start。", clue: "Support shift · 08:00", correctConsequence: "你在八點前完成準備。", wrongConsequence: "你把另一部門時間看進來；旅伴協助重新讀列。", document: { title: "MORNING SHIFTS", columns: ["Team", "Start", "Desk"], rows: [["Security", "07:30", "A"], ["Support", "08:00", "B"], ["Delivery", "08:30", "C"]] } }),
  shift({ id: "weekday-desk", nodeId: "shift-board", skill: "班表理解", objectives: "G02／weekday", weaknessKey: "schedule-reading", prompt: "The front desk opens at eight ___ weekday.", options: ["every", "on every", "at every"], answerIndex: 0, explanation: "every weekday 前不需要介系詞。", evidence: "The front desk opens at eight every weekday.", location: "營運室 · 固定告示", objective: "讀懂櫃台的平日固定時間。", narration: "班表旁貼著平日服務時間。", hint: "every + weekday 可直接當頻率片語。", clue: "櫃台每個平日八點開", correctConsequence: "你確認今天照常八點開櫃。", wrongConsequence: "旅伴劃掉多餘介系詞後，開櫃資訊仍保留。" }),
  shift({ id: "worker-arrives", nodeId: "shift-board", skill: "第三人稱單數", objectives: "G02／arrive", weaknessKey: "third-person", prompt: "The early-shift worker usually ___ at 7:45.", options: ["arrive", "arrives", "is arrive"], answerIndex: 1, explanation: "worker 是第三人稱單數，固定習慣用 arrives。", evidence: "The early-shift worker usually arrives at 7:45.", location: "營運室 · 打卡紀錄", objective: "確認早班人員平常抵達時間。", narration: "交接櫃台仍是空的，你先查看固定到班時間。", hint: "worker = he／she；usually 指習慣。", clue: "早班人員平常 07:45 抵達", correctConsequence: "你知道目前仍在正常交接時間內。", wrongConsequence: "你漏掉 -s；旅伴修正後仍完成時間判斷。" }),
  shift({ id: "nina-shift", nodeId: "shift-board", skill: "第三人稱單數", objectives: "G02／shift", weaknessKey: "third-person", prompt: "Nina ___ the late shift on Fridays.", options: ["work", "works", "working"], answerIndex: 1, explanation: "Nina 是第三人稱單數；on Fridays 表固定安排，用 works。", evidence: "Nina works the late shift on Fridays.", location: "營運室 · 週班表", objective: "找出 Nina 的固定週五班別。", narration: "你要把週五的備忘錄留給正確班別。", hint: "Nina = she；on Fridays 表重複安排。", clue: "Nina 週五上晚班", correctConsequence: "備忘錄被放進正確交接夾。", wrongConsequence: "旅伴替 works 補上 -s，資料仍送到正確班別。" }),

  shift({ id: "does-check", nodeId: "shift-handover", skill: "基本問句", objectives: "G02／G18", weaknessKey: "does-base", prompt: "Does Maya ___ the visitor list every morning?", options: ["checks", "check", "checking"], answerIndex: 1, explanation: "Does 後主要動詞用原形 check。", evidence: "Does Maya check the visitor list every morning?", location: "交接櫃台 · 訪客名單", objective: "確認 Maya 的固定工作。", narration: "名單放在桌上，但你不知道誰負責查核。", hint: "Does 已承擔第三人稱變化。", clue: "Maya 每天早上查訪客名單", correctConsequence: "同事直接回答 Yes, she does。", wrongConsequence: "同事重述正確問句後回答；旅伴記下 does + 原形錯因。" }),
  shift({ id: "when-open", nodeId: "shift-handover", skill: "基本問句", objectives: "G02／G18", weaknessKey: "does-base", prompt: "Which question asks for the desk's opening time?", options: ["When does the desk open?", "When the desk opens?", "When is the desk open every?"], answerIndex: 0, explanation: "一般動詞 open 的 WH 問句使用 When does + 主詞 + 原形。", evidence: "When does the desk open?", location: "交接櫃台 · 開櫃確認", objective: "問出服務櫃台開放時間。", narration: "門還關著，你需要先確認正常開櫃時間。", hint: "does 後用原形 open。", clue: "服務櫃台八點開", correctConsequence: "你得到 At eight 的直接回答。", wrongConsequence: "同事理解後重說一次；旅伴保留問句修復記錄。" }),
  shift({ id: "does-work", nodeId: "shift-handover", skill: "基本問句", objectives: "G02／G18／shift", weaknessKey: "does-base", prompt: "___ Leo work the early shift today?", options: ["Is", "Does", "Do"], answerIndex: 1, explanation: "Leo 是單數，work 是一般動詞，問句使用 Does。", evidence: "Does Leo work the early shift today?", location: "交接櫃台 · 人員確認", objective: "確認 Leo 今天是否上早班。", narration: "班表有固定安排，但今天可能換班。", hint: "主詞 Leo 是單數，後面已有原形 work。", clue: "Leo 今天上早班", correctConsequence: "主管確認 Yes, he does。", wrongConsequence: "主管仍聽懂；旅伴指出不能用 Is + work。" }),
  shift({ id: "who-answers", nodeId: "shift-handover", skill: "問句回應", objectives: "G18／shift", weaknessKey: "does-base", prompt: "“Who works the early shift?” Which answer fits?", options: ["At eight.", "Leo does.", "At Desk B."], answerIndex: 1, explanation: "Who 問人，Leo does 是相符的簡短回答。", evidence: "Who works the early shift? — Leo does.", location: "交接櫃台 · 口頭確認", objective: "依問句功能選出正確回答。", narration: "交接者只需要人名，不是時間或地點。", hint: "Who 在問哪一個人。", clue: "早班交接者：Leo", correctConsequence: "你立刻找到 Leo。", wrongConsequence: "你回答了時間或座位；旅伴把問題中的 Who 指給你看。" }),
  shift({ id: "how-commute", nodeId: "shift-handover", skill: "問句回應", objectives: "G18／commute", weaknessKey: "does-base", prompt: "“How does Nina commute on weekdays?” Which reply is natural?", options: ["By train.", "At platform two.", "At 7:40."], answerIndex: 0, explanation: "How does ... commute? 問方式，By train 回答交通工具。", evidence: "How does Nina commute? — By train.", location: "交接櫃台 · 到班聯絡", objective: "確認 Nina 的通勤方式。", narration: "Nina 可能因道路延誤晚到，你先問清她平常怎麼通勤。", hint: "How 在這裡問方法。", clue: "Nina 平日搭火車", correctConsequence: "你改查列車狀態而不是公車。", wrongConsequence: "你選了時間或地點；旅伴改用 By train 示範自然回答。" }),

  shift({ id: "manager-talking", nodeId: "shift-now", skill: "現在進行式", objectives: "G05", weaknessKey: "habit-now", prompt: "Look—the manager ___ with a customer right now.", options: ["talks every day", "is talking", "are talking"], answerIndex: 1, explanation: "manager 是單數，Look／right now 指眼前動作，用 is talking。", evidence: "The manager is talking with a customer right now.", location: "營運室 · 工作區", objective: "判斷主管現在是否能接手交接。", narration: "主管站在工作區內，正處理另一件事。", hint: "manager 單數；right now 指現在。", clue: "主管目前正在接待客戶", correctConsequence: "你先把交接資料放在櫃台，不打斷客戶對話。", wrongConsequence: "你把眼前動作當成固定習慣；旅伴提醒後改由同事接收。" }),
  shift({ id: "usual-now", nodeId: "shift-now", skill: "平常與現在", objectives: "G02／G05", weaknessKey: "habit-now", prompt: "Maya usually checks email first. Today she is helping at the front desk. What is she doing now?", options: ["Checking email.", "Helping at the front desk.", "Leaving the office."], answerIndex: 1, explanation: "Today she is helping 描述現在；usually 只是平常順序。", evidence: "Today she is helping at the front desk.", location: "營運室 · 前台", objective: "依現在工作分配找到 Maya。", narration: "固定流程與今天的臨時支援同時出現在交接訊息裡。", hint: "題目問 now，優先找 Today she is...。", clue: "Maya 現在支援前台", correctConsequence: "你直接把前台資料交給 Maya。", wrongConsequence: "你先走向她平常查信的位置；旅伴依 Today 帶你折返。" }),
  shift({ id: "workers-carrying", nodeId: "shift-now", skill: "主詞動詞一致", objectives: "G03 基礎／G05", weaknessKey: "habit-now", prompt: "Right now, two workers ___ boxes into the office.", options: ["is carrying", "are carrying", "carries"], answerIndex: 1, explanation: "two workers 是複數，Right now 指現在進行，用 are carrying。", evidence: "Two workers are carrying boxes into the office.", location: "營運室 · 工作區入口", objective: "辨認入口目前正在發生的動作。", narration: "工作區入口暫時被搬運作業占用。", hint: "two workers 是複數。", clue: "兩名員工正在搬箱子", correctConsequence: "你改走側門，不阻擋搬運。", wrongConsequence: "你誤判句型；旅伴指向兩名員工後帶你改走側門。" }),
  shift({ id: "leo-leaves", nodeId: "shift-now", skill: "第三人稱單數", objectives: "G02／leave", weaknessKey: "third-person", prompt: "Leo usually ___ the office at four.", options: ["leave", "leaves", "is leaving every day"], answerIndex: 1, explanation: "Leo 是第三人稱單數，usually 表固定習慣，用 leaves。", evidence: "Leo usually leaves the office at four.", location: "營運室 · 離班紀錄", objective: "確認 Leo 的固定離班時間。", narration: "晚班同事要知道早班通常何時離開。", hint: "Leo = he；usually 指固定習慣。", clue: "Leo 平常四點離開", correctConsequence: "你把正確離班時間寫進交接單。", wrongConsequence: "旅伴補上 -s 後，交接單仍完成。" }),
  shift({ id: "today-late", nodeId: "shift-now", skill: "行動判斷", objectives: "G02／G05／delay", weaknessKey: "habit-now", prompt: "Nina usually arrives at 7:45, but today she is waiting for a delayed train. What should the team expect?", options: ["She may arrive late today.", "She never works weekdays.", "She is already at the office."], answerIndex: 0, explanation: "今天她正在等延誤列車，因此今天可能晚到；不能推成她從不上班。", evidence: "Today she is waiting for a delayed train.", location: "營運室 · 班別調度", objective: "依今天的通勤狀況安排短暫支援。", narration: "固定到班時間已過，Nina 傳來即時訊息。", hint: "but today 後面是今天的例外。", clue: "Nina 今天可能晚到", correctConsequence: "團隊先安排短暫代班，沒有誤判她的固定班別。", wrongConsequence: "你把臨時延誤推成永久安排；旅伴修正後啟動短暫代班。" }),
];

const CHANGE_QUESTIONS: readonly ScenarioMissionQuestion[] = [
  change({ id: "latest-platform", nodeId: "change-board", skill: "文件判讀", objectives: "G02／platform／departure", weaknessKey: "schedule-reading", prompt: "The first notice says platform two. The latest update says platform five. Which platform should you use?", options: ["Platform two.", "Platform five.", "Platform seven."], answerIndex: 1, explanation: "latest update 是較新的資訊，所以使用五號月台。", evidence: "Latest update · Platform 5", location: "中央大廳 · 異動看板", objective: "用最新資訊取代舊月台。", narration: "兩則通知同時保留在畫面上，時間戳不同。", hint: "比較哪一則標成 latest。", clue: "最新月台：5", correctConsequence: "你直接改往五號月台。", wrongConsequence: "你先走向舊月台；旅伴用時間戳把你拉回最新資訊。", document: { title: "PLATFORM UPDATE", columns: ["Notice", "Time", "Platform"], rows: [["First notice", "07:28", "2"], ["Latest update", "07:34", "5"]] } }),
  change({ id: "delay-status", nodeId: "change-board", skill: "文件判讀", objectives: "G02／delay／on time", weaknessKey: "schedule-reading", prompt: "Which train is delayed?", options: ["Harbor 7:35.", "City 7:40.", "Airport 7:45."], answerIndex: 2, explanation: "Airport 7:45 的狀態是 Delayed 10 min。", evidence: "07:45 · Airport · Delayed 10 min", location: "中央大廳 · 出發看板", objective: "找出受延誤影響的班次。", narration: "三班列車只有一班顯示琥珀色異動。", hint: "沿同一列讀 service 與 status。", clue: "Airport 07:45 · 延誤", correctConsequence: "你沒有把準時班次誤認成延誤。", wrongConsequence: "你讀到相鄰列；旅伴框住 Airport 那一列重新確認。", document: { title: "DEPARTURE STATUS", columns: ["Time", "Service", "Status"], rows: [["07:35", "Harbor", "On time"], ["07:40", "City", "Boarding"], ["07:45", "Airport", "Delayed 10 min"]] } }),
  change({ id: "new-time", nodeId: "change-board", skill: "文件判讀", objectives: "G02／departure／delay", weaknessKey: "schedule-reading", prompt: "The 7:30 train has a twenty-minute delay. What is the new departure time?", options: ["7:10.", "7:30.", "7:50."], answerIndex: 2, explanation: "延後二十分鐘是 7:50。", evidence: "07:30 + 20 minutes = 07:50", location: "中央大廳 · 延誤通知", objective: "算出實際離站時間。", narration: "原票面時間沒有更新，你必須自己處理延誤資訊。", hint: "delay 表示時間往後。", clue: "新離站時間：07:50", correctConsequence: "你在任務卡上寫下正確新時間。", wrongConsequence: "你保留舊時間；旅伴重新把延誤分鐘加上去。", document: { title: "DELAY NOTICE", columns: ["Original", "Delay", "New"], rows: [["07:30", "+20 min", "?"]] } }),
  change({ id: "weekday-platform", nodeId: "change-board", skill: "班表理解", objectives: "G02／weekday／platform", weaknessKey: "schedule-reading", prompt: "The Coast train usually leaves from platform one every weekday. Today it leaves from platform three. Where does it leave today?", options: ["Platform one.", "Platform three.", "The ticket desk."], answerIndex: 1, explanation: "today 的臨時資訊優先於 usually 的固定月台。", evidence: "Today it leaves from platform three.", location: "中央大廳 · 班次異動", objective: "分清固定月台與今天月台。", narration: "同一張通知同時寫著平常與今天。", hint: "題目問 today。", clue: "Coast train 今天從 3 號月台出發", correctConsequence: "你依今天的資訊前往三號月台。", wrongConsequence: "你走向平常的一號月台；旅伴指向 Today 讓你改道。" }),
  change({ id: "does-leave", nodeId: "change-board", skill: "基本問句", objectives: "G02／G18", weaknessKey: "does-base", prompt: "Which sentence correctly asks about the updated platform?", options: ["Does the train leaves from platform six?", "Does the train leave from platform six?", "Is the train leave from platform six?"], answerIndex: 1, explanation: "Does 後用原形 leave。", evidence: "Does the train leave from platform six?", location: "中央大廳 · 站務查核", objective: "用自然問句確認新月台。", narration: "看板剛閃了一次，你決定向站務員口頭確認。", hint: "Does 已承擔第三人稱變化。", clue: "更新月台已口頭確認", correctConsequence: "站務員直接回答 Yes, it does。", wrongConsequence: "站務員先重說自然句子才回答；旅伴記住這個錯因。" }),

  change({ id: "listen-four", nodeId: "change-listen", skill: "聽力理解", objectives: "G18／platform", weaknessKey: "schedule-reading", prompt: "Which platform should Harbor passengers use?", options: ["Platform two.", "Platform four.", "Platform six."], answerIndex: 1, explanation: "廣播明確說 Harbor service now leaves from platform four。", evidence: "The Harbor service now leaves from platform four.", location: "月台區 · 廣播喇叭", objective: "首聽一次抓出新月台。", narration: "提示音響起，廣播只會完整播放一次。", hint: "先抓 Harbor，再等 leaves from 後面的號碼。", clue: "Harbor · Platform 4", correctConsequence: "你依首聽直接轉往四號月台。", wrongConsequence: "你抓到舊號碼；旅伴在首答鎖定後帶你二聽修復。", listeningText: "Attention, please. The Harbor service no longer leaves from platform two. It now leaves from platform four." }),
  change({ id: "listen-delay", nodeId: "change-listen", skill: "聽力理解", objectives: "G18／delay", weaknessKey: "schedule-reading", prompt: "How long is the delay?", options: ["Five minutes.", "Ten minutes.", "Fifteen minutes."], answerIndex: 2, explanation: "廣播說 delayed by fifteen minutes。", evidence: "The train is delayed by fifteen minutes.", location: "月台區 · 廣播喇叭", objective: "首聽抓出延誤時間。", narration: "人群移動聲很大，你需要鎖定數字與 delay。", hint: "等到 delayed by 後面的分鐘數。", clue: "延誤 15 分鐘", correctConsequence: "你正確更新離站時間。", wrongConsequence: "你記錯分鐘數；旅伴保留首答後協助二聽。", listeningText: "The 7:40 City train is delayed by fifteen minutes. Its platform remains number three." }),
  change({ id: "listen-on-time", nodeId: "change-listen", skill: "聽力理解", objectives: "G18／on time", weaknessKey: "schedule-reading", prompt: "What remains unchanged?", options: ["The departure time.", "The platform.", "The service name."], answerIndex: 0, explanation: "廣播說 train leaves on time；改變的是月台。", evidence: "The train leaves on time, but from platform five.", location: "月台區 · 廣播喇叭", objective: "分辨時間與月台哪個改變。", narration: "廣播同時包含不變與改變資訊。", hint: "on time 表示離站時間沒有延誤。", clue: "時間不變；月台改為 5", correctConsequence: "你只改月台，不多加不存在的延誤。", wrongConsequence: "你把月台異動誤當時間異動；旅伴在二聽時拆開兩項資訊。", listeningText: "The North train leaves on time at 7:45, but it now departs from platform five instead of platform one." }),
  change({ id: "listen-action", nodeId: "change-listen", skill: "聽力理解", objectives: "G18／下一步", weaknessKey: "schedule-reading", prompt: "What should passengers do next?", options: ["Use the footbridge.", "Wait at the ticket desk.", "Leave the station."], answerIndex: 0, explanation: "廣播要求乘客 use the footbridge to reach platform six。", evidence: "Please use the footbridge to reach platform six.", location: "月台區 · 廣播喇叭", objective: "首聽抓出下一步行動。", narration: "通往新月台的其中一條路暫時關閉。", hint: "注意 Please 後面的動作。", clue: "使用天橋前往 6 號月台", correctConsequence: "你立刻走向天橋入口。", wrongConsequence: "你停在原地；旅伴在二聽後帶你前往天橋。", listeningText: "Passengers for the Airport train should use platform six. Please use the footbridge because the lower passage is closed." }),
  change({ id: "listen-departure", nodeId: "change-listen", skill: "聽力理解", objectives: "G18／departure", weaknessKey: "schedule-reading", prompt: "When does the train leave?", options: ["At 7:35.", "At 7:50.", "At 8:05."], answerIndex: 1, explanation: "廣播說 new departure time is 7:50。", evidence: "The new departure time is 7:50.", location: "月台區 · 廣播喇叭", objective: "首聽取得新的離站時間。", narration: "看板仍顯示舊時間，廣播才是最新來源。", hint: "等到 new departure time 後面的時刻。", clue: "新離站時間：07:50", correctConsequence: "你把 07:50 寫進最新任務卡。", wrongConsequence: "你保留舊時間；首答留存後，旅伴用二聽協助修復。", listeningText: "The River service is delayed. Its new departure time is 7:50, and it still leaves from platform three." }),

  change({ id: "go-latest", nodeId: "change-final", skill: "文件整合", objectives: "G02／platform", weaknessKey: "schedule-reading", prompt: "The board shows platform one, but the announcement at 7:36 says platform four. Where should you go?", options: ["Platform one.", "Platform four.", "The station exit."], answerIndex: 1, explanation: "7:36 廣播較新，應去四號月台。", evidence: "Latest source at 07:36 · Platform 4", location: "天橋入口 · 最終行動", objective: "依最新來源前往正確月台。", narration: "舊看板尚未刷新，天橋前只剩一次轉向。", hint: "比較來源時間，使用較新的資訊。", clue: "最終月台：4", correctConsequence: "你穿過天橋抵達四號月台。", wrongConsequence: "你先下到舊月台；旅伴依時間戳帶你折返。", document: { title: "FINAL CHECK", columns: ["Source", "Time", "Platform"], rows: [["Board", "07:30", "1"], ["Announcement", "07:36", "4"]] } }),
  change({ id: "door-closing", nodeId: "change-final", skill: "現在進行式", objectives: "G05", weaknessKey: "habit-now", prompt: "Look—the doors ___. Which action fits?", options: ["are closing; use the next open entrance", "closes every day; wait here", "is closing; leave the station"], answerIndex: 0, explanation: "doors 是複數，Look 指眼前動作，用 are closing；應改走仍開的入口。", evidence: "The doors are closing.", location: "月台入口 · 最終行動", objective: "依眼前動作改走可用入口。", narration: "警示音響起，其中一組門正在合上。", hint: "doors 是複數；Look 指現在。", clue: "改走下一個開放入口", correctConsequence: "你沒有撞上關閉中的門，順利登上月台。", wrongConsequence: "你停在關閉門前；旅伴指出複數與另一入口後完成繞行。" }),
  change({ id: "confirm-question", nodeId: "change-final", skill: "基本問句", objectives: "G02／G18", weaknessKey: "does-base", prompt: "Choose the final confirmation question.", options: ["Does this train stops at Central Station?", "Does this train stop at Central Station?", "Is this train stop at Central Station?"], answerIndex: 1, explanation: "Does 後用原形 stop。", evidence: "Does this train stop at Central Station?", location: "月台區 · 最終確認", objective: "在登車前確認停靠站。", narration: "月台正確，但你還要確認列車是否停靠交付地點。", hint: "Does 已處理第三人稱。", clue: "停靠站已確認", correctConsequence: "站務員回答 Yes, it does，你安心登車。", wrongConsequence: "站務員重述正確句子後仍回答；旅伴留下問句修復記憶。" }),
  change({ id: "contact-now", nodeId: "change-final", skill: "平常與現在", objectives: "G02／G05", weaknessKey: "habit-now", prompt: "The contact usually waits by the clock. Right now, he is standing beside the stairs. Where is he now?", options: ["By the clock.", "Beside the stairs.", "At the ticket desk."], answerIndex: 1, explanation: "Right now 給出現在位置；usually 只說平常。", evidence: "Right now, he is standing beside the stairs.", location: "天橋出口 · 聯絡點", objective: "依現在位置找到聯絡人。", narration: "月台異動也改變了聯絡人的集合點。", hint: "題目問 now。", clue: "聯絡人在樓梯旁", correctConsequence: "你在樓梯旁完成交接。", wrongConsequence: "你先走向時鐘；旅伴依 Right now 帶你找到新位置。" }),
  change({ id: "new-departure", nodeId: "change-final", skill: "行動判斷", objectives: "G02／departure／delay", weaknessKey: "schedule-reading", prompt: "Your train now leaves at 8:05 from platform six. Which action uses both updates?", options: ["Go to platform six and expect an 8:05 departure.", "Stay at platform two for 7:45.", "Leave the station immediately."], answerIndex: 0, explanation: "正確行動同時使用新時間 8:05 與新月台 6。", evidence: "New departure 08:05 · Platform 6", location: "六號月台 · 最終行動", objective: "同時更新時間與月台。", narration: "最後通知一次改了兩項資訊，不能只記住其中一個。", hint: "找同時包含 8:05 與 platform six 的選項。", clue: "08:05 · Platform 6", correctConsequence: "你帶著完整資訊抵達六號月台。", wrongConsequence: "你只保留一半資訊；旅伴把時間與月台並排後完成修正。" }),
];

type RepairSeed = {
  id: string;
  prompt: string;
  options: readonly [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  evidence: string;
};

function repairQuestions(weaknessKey: ScenarioWeaknessKey, missionId: string, first: readonly RepairSeed[], second: readonly RepairSeed[]) {
  const build = (nodeId: "repair-first" | "repair-second", seed: RepairSeed) => choice({
    missionId,
    nodes: REPAIR_NODES,
    id: seed.id,
    nodeId,
    skill: nodeId === "repair-first" ? "修復辨認" : "延伸驗證",
    objectives: weaknessKey === "does-base" ? "G02／G18" : weaknessKey === "third-person" ? "G02／G03 基礎" : weaknessKey === "habit-now" ? "G02／G05" : "G02／時間與班表",
    weaknessKey,
    prompt: seed.prompt,
    options: seed.options,
    answerIndex: seed.answerIndex,
    explanation: seed.explanation,
    evidence: seed.evidence,
    location: nodeId === "repair-first" ? "旅伴記憶 · 第一個新情境" : "旅伴記憶 · 第二個新情境",
    objective: nodeId === "repair-first" ? "不用原題重新做一次判斷。" : "換到另一個情境完成延伸驗證。",
    narration: nodeId === "repair-first" ? "旅伴沒有重播剛才的題目，而是拿出一張全新的任務卡。" : "第一題的提示已收起，第二張卡換了人物、地點與資訊形式。",
    hint: weaknessKey === "does-base" ? "看到 Does，主要動詞回原形。" : weaknessKey === "third-person" ? "先把主詞換成 he／she／it，再決定動詞。" : weaknessKey === "habit-now" ? "先找 usually／every 或 now／today。" : "先鎖定目標列，再讀時間、月台與狀態。",
    clue: `修復證據：${seed.evidence}`,
    correctConsequence: "你在新情境中完成修復，旅伴把這一筆標成可延後重測。",
    wrongConsequence: "這次修復還沒穩定；旅伴保留錯誤，但不增加新的懲罰或扣好感。",
  });
  return [...first.map((seed) => build("repair-first", seed)), ...second.map((seed) => build("repair-second", seed))];
}

const DOES_REPAIR = repairQuestions("does-base", "u02-repair-does-base", [
  { id: "leave-home", prompt: "Does Mia ___ home at 6:30?", options: ["leaves", "leave", "leaving"], answerIndex: 1, explanation: "Does 後用原形 leave。", evidence: "Does Mia leave home at 6:30?" },
  { id: "arrive-time", prompt: "Does the shuttle ___ on time?", options: ["arrive", "arrives", "is arrive"], answerIndex: 0, explanation: "Does 後用原形 arrive。", evidence: "Does the shuttle arrive on time?" },
  { id: "work-shift", prompt: "___ Noah work the early shift?", options: ["Is", "Does", "Do"], answerIndex: 1, explanation: "Noah 單數、work 為一般動詞，所以用 Does。", evidence: "Does Noah work the early shift?" },
  { id: "gate-open", prompt: "Does the side gate ___ at seven?", options: ["opens", "open", "opening"], answerIndex: 1, explanation: "Does 後用原形 open。", evidence: "Does the side gate open at seven?" },
  { id: "train-stop", prompt: "Does this train ___ at Harbor Station?", options: ["stops", "stop", "stopping"], answerIndex: 1, explanation: "Does 後用原形 stop。", evidence: "Does this train stop at Harbor Station?" },
], [
  { id: "bus-leave", prompt: "Does the bus usually ___ from Stop B?", options: ["leave", "leaves", "is leaving"], answerIndex: 0, explanation: "Does 後用原形 leave。", evidence: "Does the bus usually leave from Stop B?" },
  { id: "worker-check", prompt: "Does the station worker ___ the board every morning?", options: ["checks", "check", "checking"], answerIndex: 1, explanation: "Does 後用原形 check。", evidence: "Does the worker check the board?" },
  { id: "nina-commute", prompt: "How ___ Nina commute on weekdays?", options: ["is", "does", "do"], answerIndex: 1, explanation: "Nina 單數、commute 為一般動詞，使用 does。", evidence: "How does Nina commute on weekdays?" },
  { id: "desk-close", prompt: "When does the desk ___?", options: ["closes", "close", "closing"], answerIndex: 1, explanation: "does 後用原形 close。", evidence: "When does the desk close?" },
  { id: "leo-start", prompt: "What time does Leo ___ work?", options: ["starts", "start", "starting"], answerIndex: 1, explanation: "does 後用原形 start。", evidence: "What time does Leo start work?" },
]);

const THIRD_PERSON_REPAIR = repairQuestions("third-person", "u02-repair-third-person", [
  { id: "maya-arrive", prompt: "Maya usually ___ at 7:45.", options: ["arrive", "arrives", "is arrive"], answerIndex: 1, explanation: "Maya = she，一般現在式用 arrives。", evidence: "Maya usually arrives at 7:45." },
  { id: "train-leave", prompt: "The train ___ at eight every weekday.", options: ["leave", "leaves", "leaving"], answerIndex: 1, explanation: "train 單數，固定班表用 leaves。", evidence: "The train leaves at eight." },
  { id: "worker-check", prompt: "The worker ___ the platform number every morning.", options: ["check", "checks", "is check"], answerIndex: 1, explanation: "worker 單數，一般現在式用 checks。", evidence: "The worker checks the platform number." },
  { id: "bus-stop", prompt: "Bus 12 ___ near the office.", options: ["stop", "stops", "stopping"], answerIndex: 1, explanation: "Bus 12 是單數，用 stops。", evidence: "Bus 12 stops near the office." },
  { id: "leo-work", prompt: "Leo ___ the early shift on Mondays.", options: ["work", "works", "working"], answerIndex: 1, explanation: "Leo = he，固定安排用 works。", evidence: "Leo works the early shift." },
], [
  { id: "nina-message", prompt: "Nina ___ her manager when the train is delayed.", options: ["message", "messages", "is message"], answerIndex: 1, explanation: "Nina = she，一般現在式用 messages。", evidence: "Nina messages her manager." },
  { id: "gate-open", prompt: "The station gate ___ at six every morning.", options: ["open", "opens", "is openning"], answerIndex: 1, explanation: "gate 單數，固定時間用 opens。", evidence: "The gate opens at six." },
  { id: "shift-start", prompt: "The support shift ___ at 8:00.", options: ["start", "starts", "starting"], answerIndex: 1, explanation: "shift 單數，班表用 starts。", evidence: "The shift starts at 8:00." },
  { id: "maya-cycle", prompt: "Maya sometimes ___ to work.", options: ["cycle", "cycles", "is cycle"], answerIndex: 1, explanation: "Maya = she，用 cycles。", evidence: "Maya sometimes cycles to work." },
  { id: "service-arrive", prompt: "The Harbor service normally ___ on time.", options: ["arrive", "arrives", "are arriving"], answerIndex: 1, explanation: "service 單數，normally 表常態，用 arrives。", evidence: "The service normally arrives on time." },
]);

const HABIT_NOW_REPAIR = repairQuestions("habit-now", "u02-repair-habit-now", [
  { id: "usually-today", prompt: "Leo usually drives, but today he ___ the train.", options: ["takes every day", "is taking", "take"], answerIndex: 1, explanation: "today 表臨時狀況，用 is taking。", evidence: "Today he is taking the train." },
  { id: "look-doors", prompt: "Look—the doors ___.", options: ["are closing", "closes", "is closing"], answerIndex: 0, explanation: "doors 複數且 Look 指現在，用 are closing。", evidence: "The doors are closing." },
  { id: "every-weekday", prompt: "Nina ___ by bus every weekday.", options: ["is commuting now", "commutes", "commute"], answerIndex: 1, explanation: "every weekday 表固定習慣，用 commutes。", evidence: "Nina commutes by bus every weekday." },
  { id: "right-now", prompt: "Right now, the worker ___ the board.", options: ["checks every day", "is checking", "check"], answerIndex: 1, explanation: "Right now 指現在進行，用 is checking。", evidence: "The worker is checking the board." },
  { id: "usually-now-place", prompt: "Mia usually waits by the clock. Now she is at the desk. Where is she now?", options: ["By the clock.", "At the desk.", "At home."], answerIndex: 1, explanation: "Now 指目前位置，在 desk。", evidence: "Now she is at the desk." },
], [
  { id: "today-walk", prompt: "Ben takes the bus on weekdays. Today he ___ to work.", options: ["walks every weekday", "is walking", "walk"], answerIndex: 1, explanation: "Today 指今天不同，用 is walking。", evidence: "Today he is walking to work." },
  { id: "passengers-now", prompt: "At the moment, several passengers ___ for a taxi.", options: ["waits", "are waiting", "is waiting"], answerIndex: 1, explanation: "passengers 複數且 At the moment 指現在，用 are waiting。", evidence: "Several passengers are waiting." },
  { id: "train-schedule", prompt: "The 7:20 train ___ from platform three every weekday.", options: ["is leaving now", "leaves", "leave"], answerIndex: 1, explanation: "every weekday 與班表用一般現在式 leaves。", evidence: "The train leaves every weekday." },
  { id: "manager-now", prompt: "The manager usually checks reports first. Right now, she is talking to a guest. What is she doing now?", options: ["Checking reports.", "Talking to a guest.", "Leaving work."], answerIndex: 1, explanation: "Right now 後的 is talking 是目前動作。", evidence: "She is talking to a guest." },
  { id: "look-workers", prompt: "Look—two workers ___ the gate.", options: ["is opening", "are opening", "opens"], answerIndex: 1, explanation: "two workers 複數且 Look 指現在，用 are opening。", evidence: "Two workers are opening the gate." },
]);

const SCHEDULE_REPAIR = repairQuestions("schedule-reading", "u02-repair-schedule-reading", [
  { id: "platform-row", prompt: "The 8:10 Coast train leaves from which platform?", options: ["Platform one.", "Platform three.", "Platform five."], answerIndex: 1, explanation: "8:10 Coast 同一列顯示 Platform 3。", evidence: "08:10 · Coast · Platform 3" },
  { id: "delay-row", prompt: "Which service is delayed?", options: ["River.", "Airport.", "City."], answerIndex: 1, explanation: "目標資訊顯示 Airport · Delayed。", evidence: "Airport · Delayed" },
  { id: "at-time", prompt: "The shift starts ___ 8:00.", options: ["at", "on", "in"], answerIndex: 0, explanation: "精確時刻前用 at。", evidence: "The shift starts at 8:00." },
  { id: "on-monday", prompt: "Nina works the early shift ___ Monday.", options: ["at", "on", "in"], answerIndex: 1, explanation: "星期前用 on。", evidence: "Nina works on Monday." },
  { id: "every-weekday", prompt: "The bus leaves at seven ___ weekday.", options: ["on every", "every", "in every"], answerIndex: 1, explanation: "every weekday 前不加介系詞。", evidence: "The bus leaves every weekday." },
], [
  { id: "latest-source", prompt: "The old notice says platform two. The latest notice says platform six. Where should you go?", options: ["Platform two.", "Platform six.", "The ticket desk."], answerIndex: 1, explanation: "latest notice 是較新來源。", evidence: "Latest notice · Platform 6" },
  { id: "new-time", prompt: "A 7:40 train has a ten-minute delay. What is the new time?", options: ["7:30.", "7:40.", "7:50."], answerIndex: 2, explanation: "延後十分鐘是 7:50。", evidence: "07:40 + 10 min = 07:50" },
  { id: "status-true", prompt: "The board says: 8:00 · Harbor · Platform 4 · On time. Which statement is true?", options: ["It is delayed.", "It leaves from platform four.", "It leaves at nine."], answerIndex: 1, explanation: "同一列顯示 Platform 4 與 On time。", evidence: "Harbor · Platform 4 · On time" },
  { id: "today-platform", prompt: "The train usually uses platform one. Today it uses platform five. Which platform does it use today?", options: ["One.", "Five.", "Seven."], answerIndex: 1, explanation: "題目問 today，使用五號月台。", evidence: "Today · Platform 5" },
  { id: "departure-column", prompt: "A board has columns Time, Service, Platform, Status. Where do you find whether a train is late?", options: ["Time only.", "Platform.", "Status."], answerIndex: 2, explanation: "是否 delayed／on time 要看 Status 欄。", evidence: "Status · Delayed / On time" },
]);

const sharedCompanionLines: Record<CompanionId, string> = {
  rinka: "先看清楚再加速；答錯也只是多走一段，不會失去同行進度。",
  sena: "我會把新舊資訊排在一起；只有主動開提示時才標成 assisted。",
  yori: "我們走高風險捷徑，但不拿未教內容當唯一線索。",
};

function sideMission(definition: Omit<ScenarioMissionDefinition, "kind" | "reward" | "fullIntelThreshold" | "recoveredMaxSetbacks" | "companionLines">): ScenarioMissionDefinition {
  return {
    ...definition,
    kind: "side",
    fullIntelThreshold: 3,
    recoveredMaxSetbacks: 1,
    reward: { standardGold: 30, fullGold: 45, cleanBonus: 5, standardAffinity: 1, fullAffinity: 2 },
    companionLines: sharedCompanionLines,
  };
}

const COMMUTE_MISSION = sideMission({
  id: COMMUTE_ID,
  title: "06:55 的通勤改道",
  shortTitle: "通勤改道",
  kicker: "U02 · COMMUTE SIDE MISSION",
  description: "比較公車、列車與步行路線，用英文問出資訊，並處理塞車造成的臨時改道。",
  duration: "約 5–7 分鐘",
  focus: "commute · arrive · delay · 平常／現在",
  imageSrc: "/game/scenarios/commute-detour-v24.webp",
  imageAlt: "雨後清晨的城市公車站、塞車道路與車站入口",
  clockLabel: "COMMUTE CLOCK",
  nodes: COMMUTE_NODES,
  sceneZones: [
    { id: "road", slot: "left", label: "塞車道路", detail: "車流、延誤與替代路線" },
    { id: "stop", slot: "center", label: "公車站", detail: "班表、乘客與站務詢問" },
    { id: "station", slot: "right", label: "車站入口", detail: "月台、列車與最後改道" },
  ],
  sequence: () => ["commute-plan", "commute-question", "commute-now"],
  questions: COMMUTE_QUESTIONS,
  endings: {
    "full-intel": { label: "準時抵達結局", detail: "你同時掌握路線、抵達時間與臨時異動，在班別開始前抵達。" },
    "standard-delivery": { label: "通知後抵達結局", detail: "你完成通勤並事先通知主管；部分路線資訊是在旅伴協助後修正。" },
  },
});

const SHIFT_MISSION = sideMission({
  id: SHIFT_ID,
  title: "08:00 的早班交接",
  shortTitle: "早班交接",
  kicker: "U02 · WORK SHIFT SIDE MISSION",
  description: "讀懂平日班表、問清楚固定工作，再依現場正在發生的事完成早班交接。",
  duration: "約 5–7 分鐘",
  focus: "shift · weekday · 第三人稱 · do／does",
  imageSrc: "/game/scenarios/shift-handover-v24.webp",
  imageAlt: "雨晨中的現代公司早班交接櫃台與班表牆",
  clockLabel: "SHIFT CLOCK",
  nodes: SHIFT_NODES,
  sceneZones: [
    { id: "schedule", slot: "left", label: "班表牆", detail: "日期、人員與班別" },
    { id: "handover", slot: "center", label: "交接櫃台", detail: "名單、訊息與口頭確認" },
    { id: "work-area", slot: "right", label: "工作區", detail: "目前動作與臨時支援" },
  ],
  sequence: () => ["shift-board", "shift-handover", "shift-now"],
  questions: SHIFT_QUESTIONS,
  endings: {
    "full-intel": { label: "完整交接結局", detail: "班別、人員與現場異動都已確認，早班能直接接手。" },
    "standard-delivery": { label: "基本交接結局", detail: "主要工作已完成；一項資訊是在旅伴協助後補入交接單。" },
  },
});

const CHANGE_MISSION = sideMission({
  id: CHANGE_ID,
  title: "月台異動追蹤",
  shortTitle: "月台異動",
  kicker: "U02 · LISTEN-ONCE SIDE MISSION",
  description: "比對看板與最新通知，首聽一次月台廣播，再把時間、月台與下一步整合成行動。",
  duration: "約 6–8 分鐘",
  focus: "platform · departure · 首聽 · 最新資訊",
  imageSrc: "/game/scenarios/station-platform-v23.webp",
  imageAlt: "雨後清晨的車站月台、電子看板、資訊櫃台與天橋",
  clockLabel: "UPDATE CLOCK",
  nodes: CHANGE_NODES,
  sceneZones: [
    { id: "board", slot: "left", label: "異動看板", detail: "舊資訊、最新狀態與時間戳" },
    { id: "platform", slot: "center", label: "廣播區", detail: "一次首聽與現場人流" },
    { id: "stairs", slot: "right", label: "天橋入口", detail: "跨月台與最終行動" },
  ],
  sequence: () => ["change-board", "change-listen", "change-final"],
  questions: CHANGE_QUESTIONS,
  endings: {
    "full-intel": { label: "完整異動結局", detail: "你保留首答證據並正確整合最新時間、月台與行動。" },
    "standard-delivery": { label: "安全到站結局", detail: "你已抵達正確月台；其中一項異動是在旅伴協助後修正。" },
  },
});

function repairMission(weaknessKey: ScenarioWeaknessKey, title: string, description: string, questions: readonly ScenarioMissionQuestion[]): ScenarioMissionDefinition {
  const id = `u02-repair-${weaknessKey}`;
  return {
    id,
    title,
    shortTitle: "旅伴修復",
    kicker: "U02 · COMPANION MEMORY REPAIR",
    description,
    kind: "repair",
    duration: "2 題新情境",
    focus: "立即修復不冒充無提示精通",
    imageSrc: "/game/scenarios/station-platform-v23.webp",
    imageAlt: "雨後清晨的車站月台",
    clockLabel: "REPAIR",
    nodes: REPAIR_NODES,
    sceneZones: [
      { id: "desk", slot: "left", label: "第一張任務卡", detail: "不用原題重新辨認" },
      { id: "platform", slot: "right", label: "第二張任務卡", detail: "換情境完成延伸驗證" },
    ],
    sequence: () => ["repair-first", "repair-second"],
    questions,
    fullIntelThreshold: 2,
    recoveredMaxSetbacks: 0,
    reward: { standardGold: 10, fullGold: 25, cleanBonus: 0, standardAffinity: 0, fullAffinity: 1 },
    endings: {
      "full-intel": { label: "本次修復完成", detail: "兩個新情境都答對；這筆錯因已完成一次修復，之後仍會延遲重測。" },
      "standard-delivery": { label: "保留修復任務", detail: "至少一個新情境仍不穩；錯誤已保存，但不扣好感也不增加懲罰。" },
    },
    companionLines: {
      rinka: "這次不重做原題。我們換兩個場景，把判斷真的練回來。",
      sena: "我會把錯因記在任務卡上；提示後答對仍只算 assisted。",
      yori: "錯一次不算輸。能在陌生情境裡重新做對，才算把路找回來。",
    },
    weaknessKey,
  };
}

const REPAIR_MISSIONS = [
  repairMission("does-base", "修復：does 後動詞原形", "用兩個全新問句情境，修復 Does + 主詞 + 原形動詞。", DOES_REPAIR),
  repairMission("third-person", "修復：第三人稱單數", "用新的通勤與輪班句子，修復 he／she／it 的 -s／-es。", THIRD_PERSON_REPAIR),
  repairMission("habit-now", "修復：平常與現在", "用新的現場事件，重新分清 usually／every 與 now／today。", HABIT_NOW_REPAIR),
  repairMission("schedule-reading", "修復：班表與時間資訊", "用新的班次、月台與時間資料，修復橫向讀表與最新資訊判斷。", SCHEDULE_REPAIR),
] as const;

export const V24_SCENARIO_MISSIONS: readonly ScenarioMissionDefinition[] = [COMMUTE_MISSION, SHIFT_MISSION, CHANGE_MISSION, ...REPAIR_MISSIONS];
export const V24_SCENARIO_QUESTIONS: readonly ScenarioMissionQuestion[] = [
  ...COMMUTE_QUESTIONS,
  ...SHIFT_QUESTIONS,
  ...CHANGE_QUESTIONS,
  ...DOES_REPAIR,
  ...THIRD_PERSON_REPAIR,
  ...HABIT_NOW_REPAIR,
  ...SCHEDULE_REPAIR,
];
