import type { CompanionId } from "./companions";
import type { UnitId } from "./content";
import type {
  ScenarioActionType,
  ScenarioDocument,
  ScenarioErrorPattern,
  ScenarioMissionDefinition,
  ScenarioMissionQuestion,
  ScenarioNodeMeta,
  ScenarioPhraseTool,
  ScenarioSceneZoneMeta,
} from "./scenario-mission";

type CaseNode = ScenarioNodeMeta & {
  actionType: ScenarioActionType;
  actionLabel: string;
  instruction: string;
  location: string;
  objective: string;
  narration: string;
  errorPattern: ScenarioErrorPattern;
  correctConsequence: string;
  wrongConsequence: string;
};

type ChoiceSeed = {
  id: string;
  skill: string;
  objectives: string;
  prompt: string;
  options: readonly [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  evidence: string;
  hint: string;
  clue: string;
  passage?: string;
  listeningText?: string;
  document?: ScenarioDocument;
  documents?: readonly ScenarioDocument[];
  sourceIds?: readonly string[];
  errorPattern?: ScenarioErrorPattern;
};

type OutputSeed = {
  id: string;
  skill: string;
  objectives: string;
  prompt: string;
  outputPrompt: string;
  referenceAnswer: string;
  acceptedAnswers: readonly string[];
  explanation: string;
  evidence: string;
  hint: string;
  clue: string;
  passage?: string;
  document?: ScenarioDocument;
  documents?: readonly ScenarioDocument[];
  sourceIds?: readonly string[];
  errorPattern?: ScenarioErrorPattern;
};

type ChapterSeed = {
  id: string;
  unit: UnitId;
  title: string;
  shortTitle: string;
  kicker: string;
  description: string;
  duration: string;
  focus: string;
  imageSrc: string;
  imageAlt: string;
  clockLabel: string;
  nodes: readonly CaseNode[];
  zones: readonly ScenarioSceneZoneMeta[];
  questions: Readonly<Record<string, readonly (ChoiceSeed | OutputSeed)[]>>;
  phraseTools: readonly ScenarioPhraseTool[];
  caseFile: ScenarioMissionDefinition["caseFile"];
  endings: ScenarioMissionDefinition["endings"];
};

const ids = ["a", "b", "c"] as const;

function isOutput(seed: ChoiceSeed | OutputSeed): seed is OutputSeed {
  return "acceptedAnswers" in seed;
}

function makeQuestion(chapter: ChapterSeed, node: CaseNode, seed: ChoiceSeed | OutputSeed): ScenarioMissionQuestion {
  const common = {
    id: `CASE-V32-${chapter.unit}-${node.id.toUpperCase()}-${seed.id}`,
    unit: chapter.unit,
    skill: `${seed.skill} · 情境遷移`,
    prompt: seed.prompt,
    passage: seed.passage,
    hint: seed.hint,
    explanation: seed.explanation,
    evidence: seed.evidence,
    sourceLabel: `${chapter.unit}／${seed.objectives}／v32 案件行動未見變體`,
    variant: {
      fingerprint: `v1:case:v32:${chapter.unit.toLowerCase()}:${node.id}:${seed.id}`,
      family: `case-v32-${chapter.unit.toLowerCase()}-${node.id}`,
      pattern: seed.id,
      version: 1,
    },
    mission: {
      missionId: chapter.id,
      nodeId: node.id,
      time: node.time,
      location: node.location,
      zone: node.zone,
      objective: node.objective,
      narration: node.narration,
      hint: seed.hint,
      clue: seed.clue,
      correctConsequence: node.correctConsequence,
      wrongConsequence: node.wrongConsequence,
      actionType: node.actionType,
      actionLabel: node.actionLabel,
      actionInstruction: node.instruction,
      sourceIds: seed.sourceIds,
      errorPattern: seed.errorPattern ?? node.errorPattern,
      document: seed.document,
      documents: seed.documents,
    },
  } as const;

  if (isOutput(seed)) {
    return {
      ...common,
      kind: "output",
      outputPrompt: seed.outputPrompt,
      referenceAnswer: seed.referenceAnswer,
      acceptedAnswers: seed.acceptedAnswers,
    };
  }
  return {
    ...common,
    kind: "choice",
    listeningText: seed.listeningText,
    options: seed.options.map((label, index) => ({ id: ids[index], label })),
    answerId: ids[seed.answerIndex],
  };
}

const sharedCompanionLines: Record<CompanionId, string> = {
  rinka: "我負責把英文判斷變成下一步行動；你要親自決定，不會替你按答案。",
  sena: "我負責把文件與時間戳排好；只有你主動開提示時，這次才標成 assisted。",
  yori: "我負責聽力與換句話說；重播、逐字稿與首答會分開保存。",
};

const U01_ROSTER: ScenarioDocument = {
  title: "STAFF ROSTER",
  columns: ["Name", "Role", "Department", "Desk"],
  rows: [["Ben Wu", "New employee", "Support", "C"], ["Ms. Chen", "Manager", "Sales", "A"], ["Leo Park", "Employee", "Sales", "B"]],
};

const U01: ChapterSeed = {
  id: "u01-overwritten-roster",
  unit: "U01",
  title: "名冊上的陌生人",
  shortTitle: "覆寫名冊",
  kicker: "U01 · CHAPTER CASE 01",
  description: "比對名冊、名牌與自我介紹，先用英文確認誰是誰，再決定哪一筆身分可信。",
  duration: "約 6–8 分鐘",
  focus: "人物辨認 · S＋be · 代名詞 · 自我介紹",
  imageSrc: "/game/regions/trail-bg.webp",
  imageAlt: "晨霧中的航圖起點、報到桌與被改寫的名牌",
  clockLabel: "CHECK-IN",
  nodes: [
    { id: "u01-roster", mark: "01", label: "比對名冊", short: "先找可核對欄位", time: "08:42", zone: "records", actionType: "verify", actionLabel: "核對姓名與座位", instruction: "沿同一列讀姓名、職務、部門與座位，不用制服猜身分。", location: "報到桌 · 人員名冊", objective: "找出名牌與名冊真正對應的人。", narration: "一張名牌掛錯座位，制服又刻意讓三個人看起來相似。", errorPattern: "reference-trap", correctConsequence: "你把姓名、職務與座位接回同一筆紀錄，錯置身分被圈出來。", wrongConsequence: "你先把相鄰列接錯；凜夏請你沿欄位重讀，案件仍繼續但留下折返記錄。" },
    { id: "u01-introduction", mark: "02", label: "重新介紹", short: "用自然句問清楚", time: "08:46", zone: "lobby", actionType: "ask", actionLabel: "問話確認身分", instruction: "問題要問到姓名、職務或部門；回應必須真正回答對方。", location: "大廳 · 報到隊伍", objective: "用英文自我介紹或詢問部門。", narration: "口頭介紹能補資料，但仍需要與名冊互相核對。", errorPattern: "keyword-echo", correctConsequence: "對方給出可核對的完整介紹，你取得第二個來源。", wrongConsequence: "回答只重複了關鍵字，沒有提供身分；對方換句話再問一次。" },
    { id: "u01-identity", mark: "03", label: "重建身分卡", short: "寫下誰是誰", time: "08:50", zone: "office", actionType: "compose", actionLabel: "重建英文身分卡", instruction: "用主詞＋be／work 把姓名、職務與部門寫成可執行紀錄。", location: "辦公區 · 校準桌", objective: "完成一張不含錯置代名詞的身分卡。", narration: "最後一格需要由你親自寫下，ECHO 才不能再用空白補完身分。", errorPattern: "missing-actor", correctConsequence: "身分卡保留清楚主詞與職務，覆寫名牌被封存為第一件證物。", wrongConsequence: "句子裡的人與職務仍未對齊；凜夏留下原答案，再帶你補回主詞。" },
  ],
  zones: [
    { id: "records", slot: "left", label: "人員名冊", detail: "姓名、職務、部門與座位" },
    { id: "lobby", slot: "center", label: "報到大廳", detail: "口頭介紹與身分確認" },
    { id: "office", slot: "right", label: "辦公區", detail: "名牌、座位與最終身分卡" },
  ],
  questions: {
    "u01-roster": [
      { id: "desk-c", skill: "文件判讀", objectives: "G01／G08", prompt: "Who is the new employee at Desk C?", options: ["Ben Wu.", "Ms. Chen.", "Leo Park."], answerIndex: 0, explanation: "同一列顯示 Ben Wu、New employee 與 Desk C。", evidence: "Ben Wu · New employee · Desk C", hint: "先找 Desk C，再沿同一列往左讀。", clue: "座位 C 對應 Ben Wu", document: U01_ROSTER, sourceIds: ["名冊"] },
      { id: "sales-manager", skill: "文件判讀", objectives: "G01／G08", prompt: "Which sentence matches the roster?", options: ["Ms. Chen is a sales manager.", "Ben Wu is the manager.", "Leo Park works in support."], answerIndex: 0, explanation: "Ms. Chen 的 Role 是 Manager，Department 是 Sales。", evidence: "Ms. Chen · Manager · Sales", hint: "同時比對 Role 與 Department，不只看一個字。", clue: "業務主管是 Ms. Chen", document: U01_ROSTER, sourceIds: ["名冊"] },
      { id: "two-sales", skill: "場景描述", objectives: "G01", prompt: "Which observation is accurate?", options: ["Two people work in sales.", "One people is in sales.", "Three managers are at Desk A."], answerIndex: 0, explanation: "Ms. Chen 與 Leo Park 都在 Sales，共兩人。", evidence: "Ms. Chen + Leo Park → two people in Sales", hint: "數一數 Department 欄中的 Sales。", clue: "Sales 有兩名人員", document: U01_ROSTER, sourceIds: ["名冊"] },
    ],
    "u01-introduction": [
      { id: "who-are-you", skill: "對話回應", objectives: "G01", prompt: "Staff: “Who are you?”", options: ["I am Leo Park, a new employee.", "At the front desk.", "Yes, I am."], answerIndex: 0, explanation: "Who are you 問身分，應直接說姓名與職務。", evidence: "I am Leo Park, a new employee.", hint: "Who 問人，不是地點或 yes/no。", clue: "取得 Leo 的自我介紹", sourceIds: ["口頭介紹"] },
      { id: "department", skill: "對話回應", objectives: "G01", prompt: "Manager: “Which department do you work in?”", options: ["I work in support.", "I am at eight.", "She is a manager."], answerIndex: 0, explanation: "Which department 問部門，I work in support 直接回答。", evidence: "work in the support department", hint: "回答工作部門，不是時間或別人的職務。", clue: "取得 Support 部門資訊", sourceIds: ["口頭介紹"] },
      { id: "give-form", skill: "代名詞", objectives: "G08", prompt: "The manager says, “Please give Mr. Lee the form.” What should you do?", options: ["Give him the form.", "Give he the form.", "Give his the form."], answerIndex: 0, explanation: "give 後接受動作的人用受格 him。", evidence: "give + him + the form", hint: "Mr. Lee 是動詞 give 後的接受者。", clue: "表格交給 Mr. Lee", sourceIds: ["主管指示"] },
    ],
    "u01-identity": [
      { id: "write-card", skill: "英文短輸出", objectives: "G01／G08", prompt: "Write the two-sentence identity card.", outputPrompt: "我是 Nina。我在業務部門工作。", referenceAnswer: "I am Nina. I work in sales.", acceptedAnswers: ["I am Nina. I work in sales.", "I'm Nina. I work in sales."], explanation: "第一句用 I am 表身分，第二句用 I work in sales 表部門。", evidence: "I am Nina. I work in sales.", hint: "先寫 I am + 名字，再寫 I work in + 部門。", clue: "Nina 的英文身分卡完成", sourceIds: ["名冊", "口頭介紹"] },
      { id: "pronoun-card", skill: "代名詞", objectives: "G08", prompt: "Ms. Chen is the manager. Which line belongs on her card?", options: ["She works in sales.", "Her works in sales.", "Him works in sales."], answerIndex: 0, explanation: "空格位置是 works 的主詞，因此用主格 She。", evidence: "She works in sales.", hint: "找能直接放在 works 前當主詞的形式。", clue: "Ms. Chen 的代名詞已校正", sourceIds: ["名冊", "身分卡"] },
      { id: "final-record", skill: "證據整合", objectives: "G01／G08", prompt: "The nameplate says “Maya,” but the roster and introduction both say “Nina.” Which record should you keep?", options: ["Nina, with the conflict noted.", "Maya, because the plate is visible.", "Both names as confirmed."], answerIndex: 0, explanation: "兩個可核對來源都指向 Nina；名牌衝突要保留，而不是當成已確認。", evidence: "Roster + introduction → Nina; nameplate remains disputed", hint: "數一數彼此獨立且可核對的來源。", clue: "覆寫名牌被標成衝突證物", sourceIds: ["名冊", "口頭介紹", "名牌"], errorPattern: "source-forgery" },
    ],
  },
  phraseTools: [
    { english: "a new employee", chinese: "一位新員工", use: "介紹職務身分。" },
    { english: "work in sales", chinese: "在業務部門工作", use: "說明所屬部門。" },
    { english: "at the front desk", chinese: "在服務櫃台", use: "說明人物位置。" },
  ],
  caseFile: { objective: "用兩個以上來源確認新員工的姓名、職務與座位。", threat: "ECHO 用制服與錯置名牌製造一個看似合理的身分。", sourceCount: 3, completionEvidence: "被覆寫的名牌" },
  endings: {
    "full-intel": { label: "身分校準完成", detail: "名冊、介紹與身分卡互相對齊，覆寫名牌被完整保留為證物。" },
    "standard-delivery": { label: "身分暫時確認", detail: "你恢復了正確身分；一項欄位是在旅伴協助後才完成核對。" },
  },
};

const U03_CALL_LOG: ScenarioDocument = {
  title: "CALL LOG",
  columns: ["Time", "Event", "Source"],
  rows: [["Yesterday 18:10", "Received travel details", "Verified itinerary"], ["Today 07:35", "Caller requested submission", "Unknown number"], ["Tomorrow 12:00", "Claimed deadline", "No task ID"]],
};

const U03: ChapterSeed = {
  id: "u03-uninvited-call-case",
  unit: "U03",
  title: "沒有被邀請的電話",
  shortTitle: "陌生來電",
  kicker: "U03 · CHAPTER CASE 03",
  description: "重建過去與未來的通話時間線，追問來源，再親自寫出安全且自然的英文回覆。",
  duration: "約 7–9 分鐘",
  focus: "過去／未來 · ask someone to do · confirm／submit",
  imageSrc: "/game/story/u03-uninvited-call.webp",
  imageAlt: "木質魔導通訊桌、無署名稿件與不明來源訊號",
  clockLabel: "CALL TRACE",
  nodes: [
    { id: "u03-timeline", mark: "01", label: "重建通話時間線", short: "分清昨天、今天與明天", time: "07:35", zone: "console", actionType: "order", actionLabel: "排列訊息先後", instruction: "依 yesterday、today、tomorrow 判斷已發生與尚未確認的事。", location: "通訊桌 · 通話紀錄", objective: "分開真實舊資訊與來電者新加的要求。", narration: "陌生人把昨天的真行程和明天的假期限說成同一份既定任務。", errorPattern: "timeline-shift", correctConsequence: "你把已發生與未確認的要求拆開，催促不再像既定安排。", wrongConsequence: "你一度把未來期限當成已確認；夜璃保留首答，再帶你重排時間詞。" },
    { id: "u03-source", mark: "02", label: "追問任務來源", short: "要求可核對資訊", time: "07:39", zone: "signal", actionType: "ask", actionLabel: "用英文追問來源", instruction: "問題要取得寄件人、任務編號或截止依據，不能只重複 deadline。", location: "訊號台 · 陌生來電", objective: "問出可以核對的任務來源。", narration: "來電者說話流利，卻始終沒有提供姓名、單位或任務編號。", errorPattern: "source-forgery", correctConsequence: "追問逼出矛盾說法，來源偽裝成為可用線索。", wrongConsequence: "問題只回應了催促，沒有取得來源；夜璃改用更直接的問法讓案件繼續。" },
    { id: "u03-reply", mark: "03", label: "送出安全回覆", short: "拒絕未確認請求", time: "07:43", zone: "outbox", actionType: "compose", actionLabel: "撰寫英文回覆", instruction: "清楚說明尚未確認，並承諾先核對再寄送；不必使用未教複雜句型。", location: "寄件匣 · 待送訊息", objective: "寫出一則不洩漏資料的英文回覆。", narration: "最後一步不是攻擊來電者，而是決定你會不會照英文要求送出文件。", errorPattern: "missing-actor", correctConsequence: "未確認稿件沒有被寄出，通話時間與矛盾用詞完整留存。", wrongConsequence: "回覆仍可能讓對方誤以為你會立即送件；夜璃替你標出風險，但不刪原句。" },
  ],
  zones: [
    { id: "console", slot: "left", label: "通話紀錄", detail: "昨天、今天與明天的事件" },
    { id: "signal", slot: "center", label: "來源訊號", detail: "號碼、寄件人與任務編號" },
    { id: "outbox", slot: "right", label: "寄件匣", detail: "回覆、確認與是否送出" },
  ],
  questions: {
    "u03-timeline": [
      { id: "called-yesterday", skill: "時間線判讀", objectives: "G04", prompt: "What happened yesterday?", options: ["The caller requested submission.", "The travel details were received.", "The deadline will arrive."], answerIndex: 1, explanation: "Yesterday 18:10 的事件是 received travel details。", evidence: "Yesterday → received travel details", hint: "先鎖定 Yesterday 那一列。", clue: "昨天只收到行程資料", document: U03_CALL_LOG, sourceIds: ["通話紀錄", "已驗證行程"] },
      { id: "tomorrow-claim", skill: "時間線判讀", objectives: "G04", prompt: "Which statement is only a claim about the future?", options: ["The deadline will be tomorrow at noon.", "The call came today at 7:35.", "The itinerary was verified yesterday."], answerIndex: 0, explanation: "Tomorrow 12:00 沒有 task ID，只是來電者宣稱的期限。", evidence: "Tomorrow 12:00 · Claimed deadline · No task ID", hint: "找未來時間，而且來源欄無法驗證的那一列。", clue: "明天中午的期限尚未確認", document: U03_CALL_LOG, sourceIds: ["通話紀錄"] },
      { id: "sequence", skill: "事件排序", objectives: "G04", prompt: "Which order is correct?", options: ["Verified itinerary → unknown call → claimed deadline.", "Claimed deadline → verified itinerary → unknown call.", "Unknown call → claimed deadline → yesterday."], answerIndex: 0, explanation: "時間順序是 yesterday、today、tomorrow。", evidence: "Yesterday → Today → Tomorrow", hint: "把三個時間詞直接排成先後。", clue: "真資訊與新要求已拆開", document: U03_CALL_LOG, sourceIds: ["通話紀錄"] },
    ],
    "u03-source": [
      { id: "task-id", skill: "基本問句", objectives: "G18", prompt: "Which question best verifies the request?", options: ["What is the task ID?", "Is the deadline deadline?", "Where is tomorrow?"], answerIndex: 0, explanation: "task ID 是可核對欄位，能直接驗證這項要求。", evidence: "What is the task ID?", hint: "問一個能拿去查紀錄的具體欄位。", clue: "追問任務編號", sourceIds: ["陌生來電"] },
      { id: "who-asked", skill: "請求結構", objectives: "G11／G18", prompt: "Which question asks who authorized the action?", options: ["Who asked you to send this file?", "Who sent yesterday?", "Does the file asks?"], answerIndex: 0, explanation: "ask + 人 + to V 能清楚問誰要求對方寄檔案。", evidence: "Who asked you to send this file?", hint: "需要同時問到授權者與 send 這個動作。", clue: "追問授權者", sourceIds: ["陌生來電", "任務稿"] },
      { id: "deadline-source", skill: "對話回應", objectives: "G04／G18", prompt: "Caller: “Submit it by noon.” What should you ask next?", options: ["Can you confirm the source and deadline?", "Noon is at twelve.", "I submitted it yesterday."], answerIndex: 0, explanation: "自然的下一步是要求確認來源與期限，而不是重複時間或假稱已完成。", evidence: "confirm the source and deadline", hint: "選能取得新證據的回應。", clue: "來源與期限一起列入查核", sourceIds: ["陌生來電"] },
    ],
    "u03-reply": [
      { id: "write-safe", skill: "英文短輸出", objectives: "G04／G11", prompt: "Write the safe reply.", outputPrompt: "我還沒確認這項任務。我會先聯絡主管。", referenceAnswer: "I have not confirmed this task. I will contact my manager first.", acceptedAnswers: ["I have not confirmed this task. I will contact my manager first.", "I haven't confirmed this task. I will contact my manager first.", "I did not confirm this task. I will contact my manager first."], explanation: "先說尚未確認，再用 will 說明下一步；不承諾立即送件。", evidence: "not confirmed + will contact my manager first", hint: "兩句即可：尚未確認＋下一步。", clue: "安全回覆已寫入寄件匣", sourceIds: ["通話紀錄", "任務稿"] },
      { id: "polite-refusal", skill: "職場回覆", objectives: "G04", prompt: "Which reply is safest and clearest?", options: ["I will verify the request before I send anything.", "Sure, I will submit it now.", "The deadline sent me."], answerIndex: 0, explanation: "verify before send 表示先核對再行動，不會把未知要求當成已確認。", evidence: "verify the request before I send anything", hint: "找先核對、後寄送的順序。", clue: "未確認文件暫停寄送", sourceIds: ["任務稿"] },
      { id: "manager-action", skill: "請求結構", objectives: "G11", prompt: "The manager wants Nina to keep the call log. Which sentence is correct?", options: ["The manager asked Nina to keep the call log.", "The manager asked Nina keep the call log.", "The manager asked to Nina keeping it."], answerIndex: 0, explanation: "ask + 人 + to V：asked Nina to keep。", evidence: "asked Nina to keep the call log", hint: "asked 後先放人，再接 to + 動詞原形。", clue: "通話紀錄被正式保留", sourceIds: ["主管回覆"] },
    ],
  },
  phraseTools: [
    { english: "receive a message", chinese: "收到訊息", use: "描述已發生的聯絡事件。" },
    { english: "confirm the source", chinese: "確認來源", use: "要求可核對的寄件人或任務依據。" },
    { english: "submit a report", chinese: "提交報告", use: "完整記住 submit 的受詞搭配。" },
  ],
  caseFile: { objective: "分開真實舊資訊與未確認新要求，留下安全回覆。", threat: "陌生來電把真行程拼進假期限，利用流利英文催促送件。", sourceCount: 3, completionEvidence: "未署名通話稿" },
  endings: {
    "full-intel": { label: "來源偽裝被拆穿", detail: "時間線、授權者與安全回覆都已保存，未確認文件沒有離開寄件匣。" },
    "standard-delivery": { label: "來電已安全結束", detail: "你阻止了立即送件；一項來源矛盾是在旅伴協助後才被標出。" },
  },
};

const U04_SIGN_LOG: ScenarioDocument = {
  title: "ROUTE CHANGE LOG",
  columns: ["Date", "Action", "Reason", "Status"],
  rows: [["Mon", "Bridge closed", "Damaged cable", "Current"], ["Tue", "Detour opened", "Safety check", "Current"], ["Last month", "Old road open", "Dry weather", "Expired"]],
};

const U04: ChapterSeed = {
  id: "u04-reactivated-sign-case", unit: "U04", title: "代價昂貴的一課", shortTitle: "舊路標復活", kicker: "U04 · CHAPTER CASE 04", description: "用原因、結果與轉折重建路線變更，再判斷借入、借出與歸還方向，關閉失效指示。", duration: "約 7–9 分鐘", focus: "because of／however · borrow／lend／return", imageSrc: "/game/story/u04-expensive-lesson.webp", imageAlt: "雨後草原、重新亮起的舊路標與封閉木橋", clockLabel: "ROUTE LOG",
  nodes: [
    { id: "u04-cause", mark: "01", label: "重建封路原因", short: "把原因與結果接回來", time: "10:05", zone: "bridge", actionType: "order", actionLabel: "重建事件鏈", instruction: "分清 because／because of 與 however，先找原因再看轉折。", location: "封閉木橋 · 變更紀錄", objective: "找出舊路標為何失效。", narration: "ECHO 恢復了『道路開放』，卻刪掉後來的損壞與繞道紀錄。", errorPattern: "timeline-shift", correctConsequence: "封路原因與最新繞道重新接上，舊結論不再控制路線。", wrongConsequence: "你先採用了過期結果；凜夏攔住隊伍，讓你回到日期與原因欄。" },
    { id: "u04-borrow", mark: "02", label: "調度替代裝備", short: "分清借入與借出", time: "10:12", zone: "supply", actionType: "ask", actionLabel: "借用並留下歸還方向", instruction: "borrow 是自己借入，lend 是借給別人，return 是歸還。", location: "運補車 · 裝備清單", objective: "借到檢修工具並說清楚歸還人。", narration: "繞道路標需要檢修器，但兩隊都說自己要『借』，方向卻相反。", errorPattern: "reference-trap", correctConsequence: "裝備流向與歸還責任被寫清楚，檢修不再互相等待。", wrongConsequence: "借出與借入方向對不上；凜夏保留原句，再用人物箭頭幫你校正。" },
    { id: "u04-disable", mark: "03", label: "停用舊路標", short: "發布清楚更正", time: "10:18", zone: "sign", actionType: "reconstruct", actionLabel: "重建有效路線公告", instruction: "公告要包含目前狀態、原因與下一步，不能只寫『已處理』。", location: "岔路 · 舊路標", objective: "關閉過期指示並留下可追溯更正。", narration: "最後要決定旅隊看到的是流暢舊結論，還是帶原因與日期的新公告。", errorPattern: "source-forgery", correctConsequence: "舊路標正式停用，新公告保留原因、日期與繞道方向。", wrongConsequence: "更正缺少下一步，後方隊伍仍會猜路；凜夏要求補上 detour。" },
  ],
  zones: [{ id: "bridge", slot: "left", label: "封閉木橋", detail: "損壞原因與最新狀態" }, { id: "supply", slot: "center", label: "運補車", detail: "借用、借出與歸還紀錄" }, { id: "sign", slot: "right", label: "舊路標", detail: "過期結論與更正公告" }],
  questions: {
    "u04-cause": [
      { id: "because-of", skill: "原因判讀", objectives: "G15", prompt: "Why is the bridge closed?", options: ["Because of a damaged cable.", "However a damaged cable.", "Because of it is Tuesday."], answerIndex: 0, explanation: "because of 後接名詞片語 a damaged cable。", evidence: "Bridge closed because of a damaged cable", hint: "問題問原因；找 Reason 欄的名詞片語。", clue: "封路原因是損壞纜線", document: U04_SIGN_LOG, sourceIds: ["變更紀錄"] },
      { id: "however", skill: "轉折判讀", objectives: "G15", prompt: "The old road was open last month. ___, it is closed now.", options: ["However", "Because of", "Result"], answerIndex: 0, explanation: "前後狀態相反，用 However 表轉折。", evidence: "was open; however, it is closed now", hint: "前句是過去開放，後句是現在關閉。", clue: "舊狀態不能代表現在", document: U04_SIGN_LOG, sourceIds: ["變更紀錄"] },
      { id: "current-route", skill: "文件判讀", objectives: "G15", prompt: "Which route is current?", options: ["The detour opened on Tuesday.", "The old road from last month.", "The closed bridge."], answerIndex: 0, explanation: "Tuesday 的 detour 記錄標為 Current；舊路標是 Expired。", evidence: "Tue · Detour opened · Current", hint: "比較 Status 欄，不只看 open。", clue: "目前有效的是繞道", document: U04_SIGN_LOG, sourceIds: ["變更紀錄", "路標"] },
    ],
    "u04-borrow": [
      { id: "borrow-tool", skill: "固定搭配", objectives: "G15／borrow", prompt: "You need Maya's scanner. What should you ask?", options: ["Could I borrow your scanner?", "Could I lend your scanner?", "Could you return me?"], answerIndex: 0, explanation: "自己向 Maya 借入，用 borrow your scanner。", evidence: "borrow a scanner from Maya", hint: "工具會從 Maya 移到你手上。", clue: "你向 Maya 借入掃描器", sourceIds: ["裝備清單"] },
      { id: "lend-tool", skill: "固定搭配", objectives: "G15／lend", prompt: "You have a charger. Leo needs it. Which sentence fits?", options: ["I can lend the charger to Leo.", "I can borrow Leo to the charger.", "Leo can return from me."], answerIndex: 0, explanation: "物品從你移到 Leo，用 lend the charger to Leo。", evidence: "lend + thing + to + person", hint: "誰把物品交出去？", clue: "你把充電器借給 Leo", sourceIds: ["裝備清單"] },
      { id: "return-friday", skill: "文件指示", objectives: "G15／return", prompt: "Notice: “Please ___ all borrowed equipment by Friday.”", options: ["return", "result", "borrow from"], answerIndex: 0, explanation: "return equipment 表歸還設備。", evidence: "return all borrowed equipment by Friday", hint: "Friday 前要把已借物品送回去。", clue: "歸還期限已寫清楚", sourceIds: ["裝備公告"] },
    ],
    "u04-disable": [
      { id: "new-notice", skill: "文件重建", objectives: "G15", prompt: "Which notice is complete?", options: ["The bridge is closed because of damage. Please use the detour.", "The bridge. However.", "The old road is open last month."], answerIndex: 0, explanation: "完整公告包含目前狀態、原因與下一步。", evidence: "closed + because of damage + use the detour", hint: "檢查是否同時回答現況、原因與行動。", clue: "更正公告可直接執行", sourceIds: ["變更紀錄", "更正公告"] },
      { id: "write-detour", skill: "英文短輸出", objectives: "G15", prompt: "Write the two-part route update.", outputPrompt: "橋因損壞而關閉。請使用繞道。", referenceAnswer: "The bridge is closed because of damage. Please use the detour.", acceptedAnswers: ["The bridge is closed because of damage. Please use the detour.", "The bridge is closed because of the damage. Please use the detour."], explanation: "第一句用 because of + 名詞說明原因，第二句給出清楚下一步。", evidence: "because of damage + use the detour", hint: "先寫目前狀態與原因，再寫祈使句。", clue: "英文繞道公告完成", sourceIds: ["更正公告"] },
      { id: "remove-old", skill: "下一步判斷", objectives: "G15", prompt: "The new notice is posted, but the old sign is still lit. What should you do next?", options: ["Turn off the old sign.", "Keep both signs active.", "Return the detour."], answerIndex: 0, explanation: "若舊指示仍亮著，兩個版本會繼續衝突；必須停用舊路標。", evidence: "New notice active → old sign off", hint: "哪個動作能避免兩個版本同時生效？", clue: "過期路標已停用", sourceIds: ["舊路標", "更正公告"] },
    ],
  },
  phraseTools: [{ english: "because of damage", chinese: "因為損壞", use: "原因後接名詞片語。" }, { english: "borrow a charger", chinese: "借入充電器", use: "物品移向自己。" }, { english: "lend it to a coworker", chinese: "把它借給同事", use: "物品移向別人。" }],
  caseFile: { objective: "恢復最新路線、調度檢修裝備並正式停用舊路標。", threat: "ECHO 恢復過期結論，卻刪除使它失效的新原因。", sourceCount: 3, completionEvidence: "重新生效的舊路標" },
  endings: { "full-intel": { label: "錯誤路線鏈被切斷", detail: "原因、裝備流向與新公告都可追溯，後續隊伍不會再被舊路標帶走。" }, "standard-delivery": { label: "繞道恢復通行", detail: "舊路標已停用；一項裝備或公告資訊是在協助後才補齊。" } },
};

const U05: ChapterSeed = {
  id: "u05-ambiguous-instructions-case", unit: "U05", title: "說清楚才走得下去", shortTitle: "三版本指令", kicker: "U05 · CHAPTER CASE 05", description: "比較三份流暢卻互相矛盾的指令，選對詞性，重寫成所有人都能執行的步驟。", duration: "約 7–9 分鐘", focus: "clear／clearly · instruction · accessible · 動作步驟", imageSrc: "/game/story/u05-clear-instructions.webp", imageAlt: "霧中岔路與三份互相矛盾的救援指令", clockLabel: "INSTRUCTION",
  nodes: [
    { id: "u05-compare", mark: "01", label: "比較三份指令", short: "找出含糊與衝突", time: "11:20", zone: "board", actionType: "verify", actionLabel: "核對指令欄位", instruction: "先找動作者、動作、順序與完成條件，不能用流暢程度判斷。", location: "救援板 · 三份指令", objective: "指出哪份指令真的能執行。", narration: "三份文字都很順，但每隊照著做會走向不同岔路。", errorPattern: "missing-actor", correctConsequence: "你把缺少的人、動作與順序逐欄標出，流暢不再等於清楚。", wrongConsequence: "你先選了聽起來最正式的一份；夜璃請各隊覆述，矛盾立刻出現。" },
    { id: "u05-rewrite", mark: "02", label: "重寫救援步驟", short: "誰在何時做哪一步", time: "11:28", zone: "editor", actionType: "compose", actionLabel: "寫出可執行英文", instruction: "用祈使句與正確詞性，寫清楚 click、select、enter 等動作。", location: "指令編輯台", objective: "把含糊形容改成明確步驟。", narration: "ECHO 只能在空白處補完；你要把空白變成動作者與動作。", errorPattern: "keyword-echo", correctConsequence: "所有隊伍依同一順序操作，第一次得到一致結果。", wrongConsequence: "句子仍只說『清楚地處理』，沒有指定動作；夜璃保留原稿並標出缺口。" },
    { id: "u05-confirm", mark: "03", label: "確認共同理解", short: "請各隊覆述下一步", time: "11:34", zone: "teams", actionType: "ask", actionLabel: "用回應驗證指令", instruction: "選能證明對方知道下一個實際動作的回覆，不接受關鍵字回音。", location: "救援隊 · 確認回覆", objective: "確認三隊會做出同一個動作。", narration: "指令寫完後，真正的驗證是每一隊能不能說出相同下一步。", errorPattern: "keyword-echo", correctConsequence: "三隊覆述一致，歧義被封存在舊版本中。", wrongConsequence: "回覆只說『了解』，沒有證明理解；夜璃再問一次下一步。" },
  ],
  zones: [{ id: "board", slot: "left", label: "版本板", detail: "三份指令與衝突欄位" }, { id: "editor", slot: "center", label: "編輯台", detail: "詞性、步驟與可及性" }, { id: "teams", slot: "right", label: "救援隊", detail: "覆述、確認與實際動作" }],
  questions: {
    "u05-compare": [
      { id: "clear-instruction", skill: "詞性判斷", objectives: "G06／G12", prompt: "Which sentence describes the instructions?", options: ["The instructions are clear.", "The instructions are clearly.", "The instructions clear follow."], answerIndex: 0, explanation: "be 動詞 are 後用形容詞 clear 作補語。", evidence: "instructions are clear", hint: "空格描述 instructions 本身。", clue: "clear 用來描述指令", passage: "Version A: The instructions are clear. Version B: Follow the instructions clearly.", sourceIds: ["版本 A", "版本 B"] },
      { id: "follow-carefully", skill: "詞性判斷", objectives: "G06", prompt: "Which sentence tells people how to follow the steps?", options: ["Follow the steps carefully.", "Follow the steps careful.", "The carefully steps follow."], answerIndex: 0, explanation: "修飾動詞 follow 用副詞 carefully。", evidence: "follow carefully", hint: "要修飾的是 follow 這個動作。", clue: "副詞用來說明執行方式", sourceIds: ["版本 B"] },
      { id: "accessible-entry", skill: "詞性判斷", objectives: "G06／G12", prompt: "Which line names a usable entrance?", options: ["Use the accessible entrance.", "Use the accessibility entrance.", "Use the accessibly entrance."], answerIndex: 0, explanation: "entrance 前需要形容詞 accessible。", evidence: "an accessible entrance", hint: "名詞 entrance 前要放能描述它的形容詞。", clue: "可及入口被指定", sourceIds: ["版本 C"] },
    ],
    "u05-rewrite": [
      { id: "click-select", skill: "英文短輸出", objectives: "G06", prompt: "Rewrite the action as two clear steps.", outputPrompt: "按更新按鈕，然後選擇可及性選項。", referenceAnswer: "Click the update button. Then select the accessibility option.", acceptedAnswers: ["Click the update button. Then select the accessibility option.", "Click the update button, then select the accessibility option."], explanation: "祈使句以原形 Click、select 開頭，Then 清楚標示順序。", evidence: "Click ... Then select ...", hint: "用兩個動詞原形，並用 Then 排順序。", clue: "兩步驟指令完成", sourceIds: ["編輯稿"] },
      { id: "enter-code", skill: "指令判讀", objectives: "G06", prompt: "Which instruction is directly executable?", options: ["Enter the code and click Submit.", "The code is clear quickly.", "Accessible the submit."], answerIndex: 0, explanation: "Enter 與 click 都是清楚的動作原形。", evidence: "Enter the code + click Submit", hint: "找兩個使用者實際可以做的動作。", clue: "輸入與送出步驟被固定", sourceIds: ["編輯稿"] },
      { id: "updated-email", skill: "分詞修飾", objectives: "G12", prompt: "Which sentence points to the current instructions?", options: ["Follow the instructions updated this morning.", "Follow the instructions updating by morning.", "Follow the update instructions are."], answerIndex: 0, explanation: "instructions 是被更新，用 updated 修飾。", evidence: "the instructions updated this morning", hint: "指令接受更新，不是自己更新別人。", clue: "目前版本以 updated 標記", sourceIds: ["更新郵件"] },
    ],
    "u05-confirm": [
      { id: "next-step", skill: "對話回應", objectives: "G18", prompt: "Leader: “What will you do after you enter the code?”", options: ["I will click Submit.", "The code is accessible.", "Yes, the code."], answerIndex: 0, explanation: "問題問 after 的下一個動作，應直接回答 will click Submit。", evidence: "after entering the code → click Submit", hint: "回答下一個動作，不是描述 code。", clue: "下一步回覆一致", sourceIds: ["指令稿", "隊伍覆述"] },
      { id: "entrance-response", skill: "對話回應", objectives: "G18", prompt: "Leader: “Which entrance will your team use?”", options: ["We will use the accessible entrance.", "At ten o'clock.", "Yes, we can."], answerIndex: 0, explanation: "Which entrance 問具體入口。", evidence: "use the accessible entrance", hint: "Which 後面的名詞就是要回答的資訊種類。", clue: "入口選擇已確認", sourceIds: ["指令稿", "隊伍覆述"] },
      { id: "not-enough", skill: "回應判斷", objectives: "G18", prompt: "Which reply does NOT prove the team understands the next step?", options: ["Understood.", "We will select the option after we click Update.", "First, we will enter the code."], answerIndex: 0, explanation: "Understood 沒有覆述任何動作或順序，無法驗證理解。", evidence: "keyword-only acknowledgement ≠ demonstrated understanding", hint: "找沒有說出任何具體動作的回覆。", clue: "關鍵字回音被排除", sourceIds: ["隊伍覆述"] },
    ],
  },
  phraseTools: [{ english: "follow the instructions", chinese: "遵循指示", use: "完整搭配記憶 follow 的受詞。" }, { english: "click the button", chinese: "按下按鈕", use: "清楚的介面動作。" }, { english: "select an option", chinese: "選擇一個選項", use: "指定可執行的下一步。" }],
  caseFile: { objective: "把三份含糊版本重建成一份能被不同人一致執行的指令。", threat: "ECHO 利用形容詞、副詞與省略動作者的空白，生成不同合理版本。", sourceCount: 4, completionEvidence: "三版本救援指令" },
  endings: { "full-intel": { label: "指令得到一致執行", detail: "動作者、順序、完成條件與可及性都已寫清楚，三隊覆述一致。" }, "standard-delivery": { label: "救援步驟已恢復", detail: "隊伍可以行動；一處詞性或下一步是在旅伴協助後才校正。" } },
};

const U06_REPAIR_LOG: ScenarioDocument = {
  title: "EQUIPMENT RECORD",
  columns: ["Time", "Entry", "Actor", "Status"],
  rows: [["09:10", "Package was received", "Maya", "Complete"], ["09:25", "Equipment was inspected", "—", "Incomplete"], ["09:40", "Crystal was repaired", "Leo", "Ready for use"]],
};

const U06: ChapterSeed = {
  id: "u06-skipped-diagnosis-case", unit: "U06", title: "修還是丟", shortTitle: "跳過診斷", kicker: "U06 · CHAPTER CASE 06", description: "讀懂被動句中的設備狀態，找回被省略的檢查者，再依診斷證據決定修理或替換。", duration: "約 7–9 分鐘", focus: "be＋p.p. · under repair · ready for use · inspect", imageSrc: "/game/story/u06-repair-or-replace.webp", imageAlt: "工坊裡開蓋診斷的舊機與仍封裝的新設備", clockLabel: "REPAIR LOG",
  nodes: [
    { id: "u06-status", mark: "01", label: "讀設備狀態", short: "分清被做與已完成", time: "09:45", zone: "bench", actionType: "observe", actionLabel: "判讀維修紀錄", instruction: "從 be + p.p. 與狀態詞判斷設備被檢查、正在修或已可使用。", location: "工坊 · 設備紀錄", objective: "確認設備目前真正狀態。", narration: "採購單寫著『無法修復』，工坊紀錄卻出現另一個完成狀態。", errorPattern: "timeline-shift", correctConsequence: "你把檢查、維修與完成狀態分開，採購結論暫停生效。", wrongConsequence: "你把 under repair 看成 ready for use；澄音用時間欄讓你重新定位。" },
    { id: "u06-actor", mark: "02", label: "找回檢查責任", short: "誰做了哪一步", time: "09:49", zone: "archive", actionType: "verify", actionLabel: "追查被省略的動作者", instruction: "被動句可以不寫施事者，但案件紀錄不能因此失去責任與證據。", location: "工坊 · 維修檔案", objective: "找出哪一個診斷步驟沒有負責人。", narration: "結論看似完整，真正決定報廢的檢查欄卻只有一條橫線。", errorPattern: "missing-actor", correctConsequence: "缺少檢查者的紀錄被標成未完成，責任不再藏在被動句後面。", wrongConsequence: "你先追查已署名的維修者；澄音把空白 Actor 欄框出來。" },
    { id: "u06-decision", mark: "03", label: "作成設備決定", short: "用證據決定修或換", time: "09:55", zone: "decision", actionType: "reconstruct", actionLabel: "重建處置紀錄", instruction: "決定必須同時引用狀態、檢查結果與下一步，不讓『已損壞』直接等於『必須丟棄』。", location: "工坊 · 決策桌", objective: "選出有診斷依據的設備處置。", narration: "最後不是考哪個被動句，而是英文紀錄會不會讓你多買一台不需要的新設備。", errorPattern: "source-forgery", correctConsequence: "處置決定引用完整診斷，新設備訂單依證據暫停或確認。", wrongConsequence: "你讓一句無來源結論直接觸發採購；澄音保留成本影響並要求補診斷。" },
  ],
  zones: [{ id: "bench", slot: "left", label: "維修工作台", detail: "設備、損壞與目前狀態" }, { id: "archive", slot: "center", label: "紀錄櫃", detail: "檢查者、時間與測試步驟" }, { id: "decision", slot: "right", label: "決策桌", detail: "修理、替換與採購依據" }],
  questions: {
    "u06-status": [
      { id: "inspected", skill: "被動判讀", objectives: "G09", prompt: "What happened at 9:25?", options: ["The equipment was inspected.", "The equipment inspected someone.", "The equipment is inspect."], answerIndex: 0, explanation: "設備接受檢查，用 was inspected。", evidence: "09:25 · Equipment was inspected", hint: "equipment 是被檢查的對象。", clue: "09:25 有檢查紀錄", document: U06_REPAIR_LOG, sourceIds: ["設備紀錄"] },
      { id: "ready", skill: "狀態判讀", objectives: "G09／G12", prompt: "What is true after 9:40?", options: ["The crystal is ready for use.", "The crystal is still under repair.", "The crystal repairs Leo."], answerIndex: 0, explanation: "9:40 顯示 repaired 且 Status 為 Ready for use。", evidence: "Crystal was repaired · Ready for use", hint: "同時看 Entry 與 Status。", clue: "晶體已可使用", document: U06_REPAIR_LOG, sourceIds: ["設備紀錄"] },
      { id: "being-repaired", skill: "被動判讀", objectives: "G09", prompt: "Which sentence means the elevator is currently under repair?", options: ["The elevator is being repaired.", "The elevator is repairing.", "The elevator repaired the worker."], answerIndex: 0, explanation: "is being + p.p. 表正在被修理。", evidence: "is being repaired = currently under repair", hint: "電梯接受修理，而且動作正在進行。", clue: "現在維修狀態已標記", sourceIds: ["現場標示"] },
    ],
    "u06-actor": [
      { id: "missing-actor", skill: "文件判讀", objectives: "G09", prompt: "Which entry is missing the responsible person?", options: ["The 9:25 inspection.", "The 9:10 receipt.", "The 9:40 repair."], answerIndex: 0, explanation: "9:25 的 Actor 欄是橫線，其他兩筆有 Maya 或 Leo。", evidence: "09:25 · Actor —", hint: "直接比較 Actor 欄。", clue: "檢查者欄位缺失", document: U06_REPAIR_LOG, sourceIds: ["設備紀錄"] },
      { id: "ask-inspector", skill: "基本問句", objectives: "G18", prompt: "Which question should you ask?", options: ["Who inspected the equipment?", "What was equipment inspect?", "Who was the equipment?"], answerIndex: 0, explanation: "Who inspected the equipment 直接追問檢查者。", evidence: "Who inspected the equipment?", hint: "要問的是人，而不是設備身分。", clue: "追查檢查責任", sourceIds: ["設備紀錄", "維修檔案"] },
      { id: "leo-repaired", skill: "主動被動對照", objectives: "G09", prompt: "The log says, “The crystal was repaired by Leo.” Which active sentence matches?", options: ["Leo repaired the crystal.", "The crystal repaired Leo.", "Leo was the crystal."], answerIndex: 0, explanation: "by Leo 是動作者，主動句把 Leo 放主詞位置。", evidence: "The crystal was repaired by Leo ↔ Leo repaired the crystal", hint: "by 後的人在主動句中成為主詞。", clue: "維修者 Leo 已確認", sourceIds: ["維修檔案"] },
    ],
    "u06-decision": [
      { id: "diagnose-first", skill: "下一步判斷", objectives: "G09", prompt: "The inspection has no actor or test result. What should happen before replacement?", options: ["The equipment should be inspected again.", "A new machine should be ordered immediately.", "The empty record should be accepted."], answerIndex: 0, explanation: "缺少檢查者與結果時，先重新檢查才有決策依據。", evidence: "Incomplete inspection → inspect again before replacement", hint: "哪一步能補回缺失證據？", clue: "重新診斷先於採購", sourceIds: ["設備紀錄", "採購單"] },
      { id: "write-decision", skill: "英文短輸出", objectives: "G09／G10", prompt: "Write the safe equipment decision.", outputPrompt: "設備必須先被檢查。之後才能決定是否更換。", referenceAnswer: "The equipment must be inspected first. Then we can decide whether to replace it.", acceptedAnswers: ["The equipment must be inspected first. Then we can decide whether to replace it.", "The equipment should be inspected first. Then we can decide whether to replace it."], explanation: "must/should be inspected 是情態被動；第二句補上決策者 we。", evidence: "must be inspected first + we can decide", hint: "第一句用 must be + p.p.，第二句寫清楚誰決定。", clue: "處置決策保留診斷順序", sourceIds: ["決策紀錄"] },
      { id: "repaired-box", skill: "處置判讀", objectives: "G09", prompt: "A damaged box was replaced, and the equipment inside is ready for use. What should the record say?", options: ["The box was replaced; the equipment is ready for use.", "The equipment is under repair forever.", "The box replaced the equipment."], answerIndex: 0, explanation: "兩個狀態分別是 box 被替換、equipment 可使用。", evidence: "box was replaced + equipment ready for use", hint: "不要把包裝狀態錯接到設備。", clue: "包裝與設備狀態分開記錄", sourceIds: ["包裹紀錄", "設備紀錄"], errorPattern: "reference-trap" },
    ],
  },
  phraseTools: [{ english: "inspect the equipment", chinese: "檢查設備", use: "動作者執行檢查。" }, { english: "under repair", chinese: "維修中", use: "描述尚未完成的設備狀態。" }, { english: "ready for use", chinese: "可供使用", use: "描述維修完成後狀態。" }],
  caseFile: { objective: "補回檢查者與測試結果，用診斷證據決定修理或替換。", threat: "ECHO 利用沒有施事者的被動結論，把『損壞』直接改寫成『無法修復』。", sourceCount: 4, completionEvidence: "被跳過的診斷紀錄" },
  endings: { "full-intel": { label: "診斷先於採購", detail: "設備狀態、檢查責任與處置依據完整保留，決定可以被日後查核。" }, "standard-delivery": { label: "設備處置已完成", detail: "修理或替換已有基本依據；一項責任欄位是在協助後才補回。" } },
};

const U07_SCHEDULE: ScenarioDocument = {
  title: "WEEKEND OPTIONS",
  columns: ["Person", "Available", "Commitment", "Backup"],
  rows: [["Rinka", "Sat after 3:00", "Training until 2:30", "Sun morning"], ["Sena", "Sun", "Report due by Sat noon", "Sat after 4:00"], ["Yori", "Sat morning", "Appointment at 1:00", "Sun after 2:00"]],
};

const U07: ChapterSeed = {
  id: "u07-weekend-schedule-case", unit: "U07", title: "週末不是空白欄位", shortTitle: "自動排滿", kicker: "U07 · CHAPTER CASE 07", description: "比較 availability、by 與 until，使用 if／when 協調條件，讓英文排程決定真正可行的行動。", duration: "約 7–9 分鐘", focus: "available · by／until · if／when · reserve／reschedule", imageSrc: "/game/story/u07-weekend-not-blank.webp", imageAlt: "發光排程航圖自動填入空白時段，桌上放著三人週末計畫", clockLabel: "SCHEDULE",
  nodes: [
    { id: "u07-availability", mark: "01", label: "比對可用時間", short: "by 不是 until", time: "Fri 16:20", zone: "calendar", actionType: "verify", actionLabel: "核對三人排程", instruction: "by 是不晚於截止點，until 是狀態持續到某時；先看 commitment 再看 available。", location: "航圖桌 · 週末排程", objective: "找出真正可用而非只有空白的時段。", narration: "系統把 no record 當成 no plan，所有空白格都被自動塞入任務。", errorPattern: "timeline-shift", correctConsequence: "你把截止點、持續時間與可用時段分開，自動填滿的假空白被撤回。", wrongConsequence: "你把 until 2:30 看成 2:30 前可用；澄音把持續狀態畫成時間線。" },
    { id: "u07-negotiate", mark: "02", label: "協調條件與備案", short: "用 if／when 說清楚", time: "Fri 16:28", zone: "meeting", actionType: "ask", actionLabel: "提出條件式方案", instruction: "if 表條件，when 表預期時間；情態動詞後接原形。", location: "協調桌 · 三人會議", objective: "提出不覆蓋既有承諾的巡查方案。", narration: "三人不是拒絕任務，而是需要一個真的能成立的條件。", errorPattern: "keyword-echo", correctConsequence: "條件、負責人與備案被共同確認，系統不再替人猜空檔。", wrongConsequence: "提議忽略其中一人的既有承諾；澄音保留衝突並打開備案欄。" },
    { id: "u07-confirm", mark: "03", label: "發布確認排程", short: "責任、時間、條件都有", time: "Fri 16:35", zone: "dispatch", actionType: "compose", actionLabel: "寫下最終英文安排", instruction: "寫清楚誰在何時行動，以及條件不成立時如何改期。", location: "派工台 · 最終班表", objective: "完成一份不把空白當同意的排程。", narration: "最後一份班表必須讓三人都能說出自己的行動，而不是只看到『已排定』。", errorPattern: "missing-actor", correctConsequence: "最終班表含責任人、時間與備案，週末承諾被完整保留。", wrongConsequence: "班表仍缺少負責人或條件；澄音標成 pending，而不是自動補完。" },
  ],
  zones: [{ id: "calendar", slot: "left", label: "週末行事曆", detail: "available、commitment 與 backup" }, { id: "meeting", slot: "center", label: "協調桌", detail: "if／when、預約與改期" }, { id: "dispatch", slot: "right", label: "派工台", detail: "責任人、時間與最終確認" }],
  questions: {
    "u07-availability": [
      { id: "rinka-after", skill: "文件判讀", objectives: "G14／G15", prompt: "When is Rinka available on Saturday?", options: ["After 3:00.", "Until 2:30.", "By noon."], answerIndex: 0, explanation: "Rinka 的 Available 欄是 Sat after 3:00；until 2:30 是訓練持續時間。", evidence: "Rinka · Available Sat after 3:00", hint: "不要把 Commitment 欄當成 Available。", clue: "凜夏週六三點後可用", document: U07_SCHEDULE, sourceIds: ["週末排程"] },
      { id: "sena-deadline", skill: "時間介系詞", objectives: "G14", prompt: "What must Sena finish no later than Saturday noon?", options: ["The report.", "Training.", "An appointment."], answerIndex: 0, explanation: "due by Sat noon 表報告最晚週六中午完成。", evidence: "Report due by Sat noon", hint: "by 表不晚於截止點。", clue: "澄音的報告截止點已確認", document: U07_SCHEDULE, sourceIds: ["週末排程"] },
      { id: "yori-morning", skill: "文件判讀", objectives: "G14", prompt: "Which time is free before Yori's 1:00 appointment?", options: ["Saturday morning.", "Saturday after 3:00.", "Sunday morning only."], answerIndex: 0, explanation: "Yori 週六上午可用，下午一點已有 appointment。", evidence: "Yori · Sat morning · Appointment at 1:00", hint: "沿 Yori 同一列比較 Available 與 Commitment。", clue: "夜璃週六上午可用", document: U07_SCHEDULE, sourceIds: ["週末排程"] },
    ],
    "u07-negotiate": [
      { id: "if-room", skill: "條件句", objectives: "G10／G15", prompt: "Which proposal is correct?", options: ["If the room is available, we will reserve it.", "If the room will be available, we reserve it yesterday.", "If available the room, will reserved."], answerIndex: 0, explanation: "if 子句用現在式 is，主句可用 will reserve。", evidence: "If the room is available, we will reserve it.", hint: "條件放 if 子句；未來行動放主句。", clue: "會議室條件方案成立", sourceIds: ["協調會議"] },
      { id: "should-cancel", skill: "情態動詞", objectives: "G10", prompt: "You cannot attend the appointment. What should you do?", options: ["You should cancel or reschedule it.", "You should to cancel it.", "You should canceled it."], answerIndex: 0, explanation: "should 後接動詞原形 cancel。", evidence: "should cancel or reschedule", hint: "情態動詞後直接接原形。", clue: "無法出席時的行動已確認", sourceIds: ["協調會議"] },
      { id: "until-six", skill: "時間判讀", objectives: "G14", prompt: "The office is open until six. What does that mean?", options: ["It stays open up to six.", "It must open before six.", "It closes by every six."], answerIndex: 0, explanation: "until 表狀態持續到六點。", evidence: "open until six = stays open up to six", hint: "until 描述狀態持續，不是截止前完成。", clue: "辦公室開放時間已正確理解", sourceIds: ["服務公告"] },
    ],
    "u07-confirm": [
      { id: "write-plan", skill: "英文短輸出", objectives: "G10／G14／G15", prompt: "Write the confirmed plan.", outputPrompt: "如果週六下雨，我們會改期到週日上午。", referenceAnswer: "If it rains on Saturday, we will reschedule for Sunday morning.", acceptedAnswers: ["If it rains on Saturday, we will reschedule for Sunday morning.", "If it rains Saturday, we will reschedule for Sunday morning."], explanation: "if 子句用 rains，主句用 will reschedule；Sunday morning 是新時間。", evidence: "If it rains ... will reschedule for Sunday morning", hint: "條件用現在式，結果用 will + 原形。", clue: "雨天備案已寫入班表", sourceIds: ["協調會議", "最終班表"] },
      { id: "reserve-by", skill: "排程指示", objectives: "G10／G14", prompt: "Which final action is clear?", options: ["Sena must reserve the room by Friday.", "The room must to reserve until Friday.", "By Friday is Sena."], answerIndex: 0, explanation: "must + 原形 reserve；by Friday 是最晚截止點。", evidence: "Sena must reserve the room by Friday", hint: "找出負責人、動作與截止點都齊全的句子。", clue: "訂房責任與期限已確認", sourceIds: ["最終班表"] },
      { id: "available-slot", skill: "文件整合", objectives: "G14／G15", prompt: "The 2:00 slot is occupied, but 3:30 is available. Which action fits?", options: ["Reserve 3:30.", "Reserve 2:00 again.", "Cancel every appointment."], answerIndex: 0, explanation: "3:30 明確標為 available，2:00 已 occupied。", evidence: "2:00 occupied; 3:30 available", hint: "but 後面提供替代時段。", clue: "最終時段改為 3:30", sourceIds: ["最終班表"] },
    ],
  },
  phraseTools: [{ english: "be available", chinese: "有空／可用", use: "描述人或時段能否安排。" }, { english: "reserve in advance", chinese: "提前預約", use: "完整記憶 reserve 的職場搭配。" }, { english: "reschedule an appointment", chinese: "改期預約", use: "條件不成立時的替代行動。" }],
  caseFile: { objective: "在不覆蓋既有承諾的前提下，確認巡查時段、負責人與備案。", threat: "ECHO 把沒有同步的紀錄當成沒有計畫，擅自填滿所有空白。", sourceCount: 4, completionEvidence: "自動生成週末班表" },
  endings: { "full-intel": { label: "週末承諾完整保留", detail: "可用時間、截止點、條件與備案都被共同確認，系統不再替人猜空檔。" }, "standard-delivery": { label: "巡查班表已修正", detail: "主要時段可以執行；一項條件或責任人在協助後才補齊。" } },
};

const U08_EMAIL: ScenarioDocument = { title: "TRAINING E-MAIL", columns: ["Item", "Detail"], rows: [["Room", "Moved to 204"], ["Arrival", "By 8:50"], ["Bring", "ID card"], ["Accessible entrance", "Contact Ms. Lin"]] };
const U08_MINUTES: ScenarioDocument = { title: "MEETING MINUTES", columns: ["Item", "Recorded status", "Owner"], rows: [["Room change", "Confirmed", "Ms. Lin"], ["Friday meeting", "Canceled", "Manager"], ["Materials", "Pending", "—"], ["West entrance", "Closed today", "Staff"]] };
const U08_SCHEDULE: ScenarioDocument = { title: "DAY SCHEDULE", columns: ["Time", "Event", "Place", "Status"], rows: [["08:50", "Staff arrival", "Room 204", "Required"], ["09:00", "Training", "Room 204", "Confirmed"], ["14:00", "Friday meeting", "Main room", "Canceled"]] };

const U08: ChapterSeed = {
  id: "u08-missing-decision-boss", unit: "U08", title: "沒有寫進紀錄的決定", shortTitle: "缺頁決策", kicker: "U08 · MULTI-DOCUMENT CASE BOSS", description: "同時比對郵件、會議紀錄、行程與廣播，找出被刪掉的 pending、責任人與下一步，完成第一幕案件頭目。", duration: "約 10–12 分鐘", focus: "U01–U08 整合 · 多文件交叉查核 · Part 2／7", imageSrc: "/game/story/u08-unwritten-decision.webp", imageAlt: "晨霧議事桌、缺頁會議紀錄與逐漸形成的霧冠", clockLabel: "CASE BOSS",
  nodes: [
    { id: "u08-email", mark: "01", label: "讀取訓練郵件", short: "鎖定時間、地點與動作", time: "08:30", zone: "mail", actionType: "verify", actionLabel: "擷取明示資訊", instruction: "先從單一郵件找 room、arrival、bring 與 contact，不自行補完。", location: "議事桌 · 訓練郵件", objective: "建立第一份可靠行動清單。", narration: "郵件看似完整，但只代表寄出時的版本。", errorPattern: "reference-trap", correctConsequence: "郵件中的地點、截止與攜帶物被逐項記錄，沒有混入相鄰欄位。", wrongConsequence: "你先接錯一個欄位；三位旅伴把 Item 與 Detail 對齊後繼續。" },
    { id: "u08-minutes", mark: "02", label: "比對會議紀錄", short: "找出 pending 與缺少責任人", time: "08:34", zone: "minutes", actionType: "verify", actionLabel: "辨認被刪除的狀態", instruction: "Confirmed、Canceled 與 Pending 是不同狀態；空白 owner 不能被當成已分配。", location: "議事桌 · 會議紀錄", objective: "找出摘要中被抹掉的未決事項。", narration: "ECHO 把所有狀態壓成『全員同意，已完成』。", errorPattern: "missing-actor", correctConsequence: "pending 與空白責任人重新出現，摘要不再假裝所有事已完成。", wrongConsequence: "你一度把 canceled 當成 pending；澄音保留錯接並重排狀態欄。" },
    { id: "u08-listen", mark: "03", label: "接收最新廣播", short: "首聽更新入口與房間", time: "08:38", zone: "broadcast", actionType: "observe", actionLabel: "首聽後更新行動", instruction: "先聽一次並鎖定真正改變的項目；二聽不覆寫首答。", location: "議事廳 · 最新廣播", objective: "判斷最新資訊改了哪個行動。", narration: "時間、房間與入口同時出現，只有一項是新的變更。", errorPattern: "keyword-echo", correctConsequence: "你依最新廣播更新入口或房間，舊資訊仍保留時間戳。", wrongConsequence: "關鍵字回音把你帶到另一項資訊；夜璃在二聽後標記差異，但不改首答。" },
    { id: "u08-rebuild", mark: "B", label: "重建決策紀錄", short: "三份文件交叉查核", time: "08:42", zone: "seal", actionType: "reconstruct", actionLabel: "完成多文件案件頭目", instruction: "同時引用郵件、會議紀錄與行程，恢復責任人、期限、pending 與下一步。", location: "霧冠封印 · 決策頁", objective: "發布一份可被每位參與者確認的更正紀錄。", narration: "霧冠只留下最順暢的結論。你必須用英文資料決定哪個版本能被保留。", errorPattern: "source-forgery", correctConsequence: "缺頁紀錄恢復責任、期限與未決事項，霧冠第一次失去改寫方向。", wrongConsequence: "更正仍把 pending 寫成 complete；三人攤開來源，讓你看見真正缺頁。" },
  ],
  zones: [{ id: "mail", slot: "left", label: "訓練郵件", detail: "房間、抵達時間與攜帶物" }, { id: "minutes", slot: "center", label: "會議紀錄", detail: "Confirmed、Canceled、Pending 與 Owner" }, { id: "broadcast", slot: "right", label: "最新廣播", detail: "首聽、時間戳與現場更新" }, { id: "seal", slot: "lower", label: "霧冠封印", detail: "多文件重建與最終更正" }],
  questions: {
    "u08-email": [
      { id: "room", skill: "文件判讀", objectives: "G01～G10 已教範圍", prompt: "Where will the training take place?", options: ["Room 204.", "The main room.", "The west entrance."], answerIndex: 0, explanation: "郵件 Room 欄寫 Moved to 204。", evidence: "Training room → Room 204", hint: "先找 Room 這個 Item。", clue: "訓練地點是 204", document: U08_EMAIL, sourceIds: ["訓練郵件"] },
      { id: "arrival", skill: "文件判讀", objectives: "G10／G14", prompt: "What must staff do by 8:50?", options: ["Arrive.", "Cancel the meeting.", "Contact the manager."], answerIndex: 0, explanation: "Arrival 欄明確寫 By 8:50。", evidence: "Staff must arrive by 8:50", hint: "題目問 by 8:50 對應的動作。", clue: "抵達截止時間是 8:50", document: U08_EMAIL, sourceIds: ["訓練郵件"] },
      { id: "accessible", skill: "下一步判斷", objectives: "G06／G15", prompt: "You need an accessible entrance. What should you do?", options: ["Contact Ms. Lin.", "Bring two ID cards.", "Go to the closed west entrance."], answerIndex: 0, explanation: "Accessible entrance 欄指示 Contact Ms. Lin。", evidence: "Accessible entrance → Contact Ms. Lin", hint: "沿同一列讀 Item 與 Detail。", clue: "可及入口聯絡人是 Ms. Lin", document: U08_EMAIL, sourceIds: ["訓練郵件"] },
    ],
    "u08-minutes": [
      { id: "pending", skill: "文件判讀", objectives: "G01～G10 已教範圍", prompt: "Which item is still pending?", options: ["Materials.", "Room change.", "Friday meeting."], answerIndex: 0, explanation: "Materials 的 Recorded status 是 Pending。", evidence: "Materials · Pending · Owner —", hint: "直接找 Pending 那一列。", clue: "教材仍待處理", document: U08_MINUTES, sourceIds: ["會議紀錄"] },
      { id: "missing-owner", skill: "文件判讀", objectives: "G08／G09", prompt: "Which item has no owner?", options: ["Materials.", "Room change.", "Friday meeting."], answerIndex: 0, explanation: "Materials 的 Owner 是橫線，尚未分配。", evidence: "Materials · Owner —", hint: "比較 Owner 欄。", clue: "教材責任人缺失", document: U08_MINUTES, sourceIds: ["會議紀錄"] },
      { id: "canceled", skill: "狀態判讀", objectives: "G04／G09", prompt: "What happened to the Friday meeting?", options: ["It was canceled.", "It is still pending.", "It was moved to Room 204."], answerIndex: 0, explanation: "Friday meeting 那列狀態是 Canceled。", evidence: "Friday meeting · Canceled", hint: "不要把另一列的 Room change 接過來。", clue: "週五會議已取消", document: U08_MINUTES, sourceIds: ["會議紀錄"] },
    ],
    "u08-listen": [
      { id: "east-entrance", skill: "聽力理解", objectives: "G10／G15／首聽", prompt: "What should staff do now?", options: ["Use the east entrance.", "Wait at the west entrance.", "Cancel the training."], answerIndex: 0, explanation: "廣播說 west entrance closed，請使用 east entrance。", evidence: "West entrance closed → use the east entrance", hint: "抓 closed 與 use 的下一步。", clue: "最新入口改為東側", listeningText: "Attention, staff. The west entrance is closed today. Please use the east entrance and arrive by eight fifty.", sourceIds: ["最新廣播"] },
      { id: "room-change", skill: "聽力理解", objectives: "G09／首聽", prompt: "What changed?", options: ["The room.", "The instructor.", "The date."], answerIndex: 0, explanation: "has been moved to Room 204 表示地點改變。", evidence: "Workshop moved to Room 204 → room changed", hint: "抓 moved to 後面的地點。", clue: "活動房間改為 204", listeningText: "The workshop has been moved to Room 204. The starting time remains nine o'clock.", sourceIds: ["最新廣播"] },
      { id: "natural-response", skill: "聽力理解", objectives: "G18／Part 2", prompt: "Which response fits the announcement?", options: ["Then we should use the east entrance.", "At nine today.", "No, I did not enter."], answerIndex: 0, explanation: "敘述西側入口關閉後，自然回應是改走東側。", evidence: "closed west entrance → use east entrance", hint: "找能處理公告後果的回應，不要選關鍵字回音。", clue: "Part 2 自然回應成立", listeningText: "The west entrance is closed today.", sourceIds: ["最新廣播"] },
    ],
    "u08-rebuild": [
      { id: "cross-check", skill: "多文件整合", objectives: "G01～G10／Part 7", prompt: "Which corrected record is supported by all three documents?", options: ["Training is in Room 204 at 9:00; staff must arrive by 8:50.", "The Friday meeting is in Room 204 at 9:00.", "Materials are complete and owned by Ms. Lin."], answerIndex: 0, explanation: "郵件與行程共同支持 Room 204、9:00、arrive by 8:50；另外兩句把不同事件或 pending 狀態接錯。", evidence: "E-mail + schedule → Room 204, 9:00, arrive by 8:50", hint: "每個細節都要能在至少一份來源找到，而且不能把不同事件合併。", clue: "訓練行動項目已重建", documents: [U08_EMAIL, U08_MINUTES, U08_SCHEDULE], sourceIds: ["訓練郵件", "會議紀錄", "行程表"], errorPattern: "reference-trap" },
      { id: "write-correction", skill: "英文短輸出", objectives: "G01～G10／文件重建", prompt: "Write the missing action item.", outputPrompt: "教材仍待處理。工作人員必須在訓練前指定負責人。", referenceAnswer: "The materials are still pending. Staff must assign an owner before the training.", acceptedAnswers: ["The materials are still pending. Staff must assign an owner before the training.", "The materials are pending. Staff must assign an owner before the training."], explanation: "第一句保留 pending，第二句補上動作者 Staff、動作 assign 與時間 before the training。", evidence: "materials pending + staff must assign an owner", hint: "不要把 pending 改成 complete；第二句補回誰做什麼。", clue: "缺頁行動項目已恢復", documents: [U08_MINUTES, U08_SCHEDULE], sourceIds: ["會議紀錄", "行程表"] },
      { id: "final-next-step", skill: "多文件整合", objectives: "G01～G10／Part 7", prompt: "What is the best next step before 8:50?", options: ["Assign the materials owner and use the east entrance.", "Attend the canceled 2:00 meeting.", "Mark every item complete."], answerIndex: 0, explanation: "Materials 仍 pending 且無 owner；最新廣播要求 east entrance。取消會議不應出席，也不能把未決事項標成完成。", evidence: "Pending materials + no owner + latest east-entrance update", hint: "同時找一個未決事項與一個最新現場行動。", clue: "第一幕最終行動已確認", documents: [U08_EMAIL, U08_MINUTES, U08_SCHEDULE], sourceIds: ["訓練郵件", "會議紀錄", "行程表", "最新廣播"] },
    ],
  },
  phraseTools: [{ english: "according to the notice", chinese: "根據公告", use: "指出行動所依據的來源。" }, { english: "collect the materials", chinese: "領取教材", use: "完整記住 collect 的受詞搭配。" }, { english: "confirm the next step", chinese: "確認下一步", use: "把摘要轉成可執行行動。" }],
  caseFile: { objective: "從多份文件恢復責任人、期限、pending 與下一步，發布可確認的更正。", threat: "霧冠刪除反對與未決事項，只留下最流暢的完成結論。", sourceCount: 4, completionEvidence: "缺頁的決策紀錄" },
  endings: { "full-intel": { label: "第一幕封印完成", detail: "郵件、會議紀錄、行程與廣播互相校正，缺頁決策恢復成可執行紀錄。" }, "standard-delivery": { label: "更正紀錄已發布", detail: "核心行動已恢復；一個跨文件衝突是在三位旅伴協助後才排除。" } },
};

const CHAPTER_SEEDS: readonly ChapterSeed[] = [U01, U03, U04, U05, U06, U07, U08];

export const V32_CHAPTER_CASE_QUESTIONS: readonly ScenarioMissionQuestion[] = CHAPTER_SEEDS.flatMap((chapter) => (
  chapter.nodes.flatMap((node) => (chapter.questions[node.id] ?? []).map((seed) => makeQuestion(chapter, node, seed)))
));

export const V32_CHAPTER_CASE_MISSIONS: readonly ScenarioMissionDefinition[] = CHAPTER_SEEDS.map((chapter) => {
  const nodeMap = Object.fromEntries(chapter.nodes.map((node) => [node.id, node])) as Readonly<Record<string, ScenarioNodeMeta>>;
  const questions = V32_CHAPTER_CASE_QUESTIONS.filter((question) => question.mission.missionId === chapter.id);
  return {
    id: chapter.id,
    unit: chapter.unit,
    title: chapter.title,
    shortTitle: chapter.shortTitle,
    kicker: chapter.kicker,
    description: chapter.description,
    kind: "chapter",
    duration: chapter.duration,
    focus: chapter.focus,
    imageSrc: chapter.imageSrc,
    imageAlt: chapter.imageAlt,
    clockLabel: chapter.clockLabel,
    nodes: nodeMap,
    sceneZones: chapter.zones,
    sequence: () => chapter.nodes.map((node) => node.id),
    questions,
    fullIntelThreshold: chapter.nodes.length,
    recoveredMaxSetbacks: 1,
    reward: { standardGold: 42, fullGold: 62, cleanBonus: 8, standardAffinity: 1, fullAffinity: 2 },
    endings: chapter.endings,
    companionLines: sharedCompanionLines,
    caseFile: chapter.caseFile,
    phraseTools: chapter.phraseTools,
  };
});
