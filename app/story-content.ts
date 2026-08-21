import type { UnitId } from "./content";

export type StoryRouteId = "formal" | "backtrack" | "leap";
export type ContentDifficultyId = "steady" | "standard" | "leap";

export type StoryChoice = {
  id: string;
  label: string;
  approach: string;
  consequence: string;
};

export type StoryEvidence = {
  id: string;
  name: string;
  detail: string;
};

export type FirstActChapter = {
  unit: UnitId;
  number: string;
  title: string;
  subtitle: string;
  focus: string;
  companion: "凜夏" | "澄音" | "夜璃" | "三人同行";
  imageSrc: string;
  imageAlt: string;
  coldOpen: string;
  incident: string;
  characterBeat: string;
  evidence: StoryEvidence;
  echoTrace: string;
  nextHook: string;
  choices: [StoryChoice, StoryChoice];
};

export const STORY_ROUTES: Array<{
  id: StoryRouteId;
  label: string;
  shortLabel: string;
  detail: string;
}> = [
  { id: "formal", label: "正式主線", shortLabel: "主線", detail: "只走目前正式單元；作答會進入學習進度與複習排程。" },
  { id: "backtrack", label: "回溯複習", shortLabel: "回溯", detail: "回到已走過的章節，用不同情境重新練習，不照抄舊題。" },
  { id: "leap", label: "躍遷預覽", shortLabel: "躍遷", detail: "先看後段故事並試做內容；只留探索紀錄，不推動正式進度。" },
];

export const CONTENT_DIFFICULTIES: Array<{
  id: ContentDifficultyId;
  label: string;
  shortLabel: string;
  detail: string;
}> = [
  { id: "steady", label: "穩健", shortLabel: "課內核心", detail: "優先使用課內核心題，把句型與固定搭配先說清楚。" },
  { id: "standard", label: "標準", shortLabel: "核心＋遷移", detail: "混合課內題與新情境，兼顧理解、記憶與應用。" },
  { id: "leap", label: "挑戰", shortLabel: "未見情境優先", detail: "優先抽未見變式與密集資訊，適合想測試遷移能力時。" },
];

export const FIRST_ACT_CHAPTERS: FirstActChapter[] = [
  {
    unit: "U01",
    number: "01",
    title: "名冊上的陌生人",
    subtitle: "一個名字可以被改寫，但身分需要證據。",
    focus: "be 動詞、身分與職業",
    companion: "凜夏",
    imageSrc: "/game/regions/trail-bg.webp",
    imageAlt: "晨霧中的航圖起點與遠方道路",
    coldOpen: "新任校準員報到時，自己的名牌卻掛在另一個人的座位上。",
    incident: "名冊、徽章與口頭介紹互相矛盾。ECHO 給出一個看似合理、卻沒有來源的身分。",
    characterBeat: "凜夏把名牌翻到背面：『先說你看見了什麼，再說你相信什麼。』",
    evidence: { id: "u01-overwritten-nameplate", name: "被覆寫的名牌", detail: "表面姓名被改過，背面仍留著原始職務刻痕。" },
    echoTrace: "ECHO 第一次用「合理補完」代替缺失資料。",
    nextHook: "同樣的補完痕跡，出現在 07:20 的列車時刻。",
    choices: [
      { id: "compare-records", label: "逐項比對名冊與名牌", approach: "以可核對的欄位建立身分", consequence: "你保留了矛盾欄位，沒有急著替任何人下結論。" },
      { id: "ask-introduction", label: "請對方重新自我介紹", approach: "用清楚句子確認身分", consequence: "口頭資訊補上了職務，但你仍標註它需要第二個來源。" },
    ],
  },
  {
    unit: "U02",
    number: "02",
    title: "07:20 失序列車",
    subtitle: "時間看似精確，不代表它真的可信。",
    focus: "一般動詞、問句與通勤資訊",
    companion: "澄音",
    imageSrc: "/game/scenarios/station-platform-v23.webp",
    imageAlt: "晨霧車站與兩份互相衝突的列車資訊",
    coldOpen: "月台廣播說列車準時，螢幕卻同時顯示延誤與改道。",
    incident: "乘客收到兩份 07:20 通知；每一份都像官方訊息，卻沒有共同的可追溯來源。",
    characterBeat: "澄音沒有猜哪一份是真的，只把每個時間、動作與來源列成三欄。",
    evidence: { id: "u02-double-timetable", name: "07:20 雙重時刻截圖", detail: "同一分鐘出現兩個版本，其中一份缺少來源欄。" },
    echoTrace: "ECHO 開始自動確認它剛剛補出的資訊。",
    nextHook: "一通知道你行程的陌生電話，要求你把任務立刻寄出。",
    choices: [
      { id: "verify-platform", label: "到現場確認月台", approach: "先問位置與現在狀態", consequence: "你用實際月台與工作人員回覆排除了其中一份通知。" },
      { id: "compare-actions", label: "比對兩份通知的動作", approach: "從動詞與時間找衝突", consequence: "你發現假通知要求的動作比官方流程多了一步。" },
    ],
  },
  {
    unit: "U03",
    number: "03",
    title: "沒有被邀請的電話",
    subtitle: "它知道幾件真的事，不代表它有權要求你行動。",
    focus: "過去／未來、請求與傳訊",
    companion: "夜璃",
    imageSrc: "/game/story/u03-uninvited-call.webp",
    imageAlt: "木質魔導通訊桌、無署名稿件與不明來源訊號",
    coldOpen: "清晨，一通陌生電話準確說出你昨天搭的車，接著催你今天寄出一份未確認的任務稿。",
    incident: "來電者混合真實行程與虛構截止時間，要求你立即 send、confirm、submit。稿件沒有署名，封套也查不到來源。",
    characterBeat: "夜璃把通話稿推回桌中央：『他說得流利，不等於他說得有根據。』",
    evidence: { id: "u03-unsigned-call-script", name: "未署名通話稿", detail: "內容知道部分真實資訊，卻沒有可驗證的寄件人或任務編號。" },
    echoTrace: "ECHO 能把真資訊拼進假要求，讓催促聽起來像既定安排。",
    nextHook: "被拒絕的稿件指向一面早已停用、卻突然重新亮起的舊路標。",
    choices: [
      { id: "end-politely", label: "禮貌結束通話", approach: "拒絕未確認的請求", consequence: "你沒有洩漏更多資料，並保留了完整通話時間與用詞。" },
      { id: "ask-source", label: "追問來源與截止依據", approach: "要求對方提供可核對證據", consequence: "對方反覆改口；矛盾成為追查 ECHO 的第一條可用線索。" },
    ],
  },
  {
    unit: "U04",
    number: "04",
    title: "代價昂貴的一課",
    subtitle: "過期資訊被重新啟用，錯誤就會沿著路線放大。",
    focus: "原因、結果、轉折與借還",
    companion: "凜夏",
    imageSrc: "/game/story/u04-expensive-lesson.webp",
    imageAlt: "雨後草原、重新亮起的舊路標與封閉木橋",
    coldOpen: "運補隊依照重新亮起的舊路標前進，直到雨後封閉的木橋前才被迫停下。",
    incident: "路標曾因橋樑損壞而停用，ECHO 卻只讀到『可通行』的舊結果，沒有讀到後來的原因與例外。",
    characterBeat: "凜夏盯著繞行隊伍：『私下改好比較快；但不說清楚，下一隊還會付同樣的代價。』",
    evidence: { id: "u04-reactivated-sign", name: "重新生效的舊路標", detail: "舊指示燈被重新點亮，但封閉原因與更新日期都被抹去。" },
    echoTrace: "ECHO 會恢復一個舊結論，卻忽略讓結論失效的新條件。",
    nextHook: "繞行救援需要明確指令；三個版本卻對同一個動作給出不同解讀。",
    choices: [
      { id: "public-review", label: "公開檢討路標流程", approach: "說明原因、結果與責任", consequence: "所有隊伍看見錯誤鏈，也共同補上了更新與撤除規則。" },
      { id: "quiet-fix", label: "先私下修正路標", approach: "優先恢復通行", consequence: "運補很快恢復，但凜夏要求把未公開的風險列入後續追蹤。" },
    ],
  },
  {
    unit: "U05",
    number: "05",
    title: "說清楚才走得下去",
    subtitle: "真正清楚的指令，必須讓不同的人做出同一個動作。",
    focus: "詞性變化、清楚說明與可及性",
    companion: "夜璃",
    imageSrc: "/game/story/u05-clear-instructions.webp",
    imageAlt: "霧中岔路與三份互相矛盾的救援指令",
    coldOpen: "救援隊收到三個版本：『迅速處理』、『安全移動』與『照原計畫走』，卻沒有人知道具體要做什麼。",
    incident: "含糊的形容詞和副詞讓每個人自行補完動作；ECHO 正好利用這些空白生成不同版本。",
    characterBeat: "夜璃把華麗措辭全劃掉：『講人話。誰、什麼時候、做哪一步。』",
    evidence: { id: "u05-three-rescue-instructions", name: "三版本救援指令", detail: "三份文字都很流暢，卻在動作者、順序與完成條件上互相衝突。" },
    echoTrace: "語句越含糊，ECHO 能合理補完的方向就越多。",
    nextHook: "清楚指令讓隊伍找到故障訊號中繼器，但維修紀錄少了最重要的診斷步驟。",
    choices: [
      { id: "rewrite-steps", label: "重寫成可執行步驟", approach: "指定人、動作、順序與完成條件", consequence: "不同隊員照著同一版本行動，第一次得到一致結果。" },
      { id: "request-confirmation", label: "請每隊覆述理解", approach: "用確認回覆找出歧義", consequence: "三種理解被攤開；你先修正分歧最大的那一句。" },
    ],
  },
  {
    unit: "U06",
    number: "06",
    title: "修還是丟",
    subtitle: "沒有診斷就做出的決定，只是成本更高的猜測。",
    focus: "被動語態、設備狀態與處置",
    companion: "澄音",
    imageSrc: "/game/story/u06-repair-or-replace.webp",
    imageAlt: "工坊裡開蓋診斷的舊機與仍封裝的新設備",
    coldOpen: "訊號中繼器被標成『無法修復』，新設備已經下單；拆開後卻只看到一枚鬆動的晶體。",
    incident: "紀錄只寫 equipment was damaged，沒有寫誰檢查、如何檢查，也沒有比較修理、交付與替換的時間。",
    characterBeat: "澄音把成本、時間、風險排成三欄：『先診斷，再決定。被動句不能把責任一起藏掉。』",
    evidence: { id: "u06-skipped-diagnosis", name: "被跳過的診斷紀錄", detail: "結論寫得完整，檢查人、測試步驟與故障位置卻全部空白。" },
    echoTrace: "ECHO 喜歡沒有施事者的結論，因為責任與證據都能被藏在句子後面。",
    nextHook: "修好的中繼器恢復排程系統，卻開始把每一格空白時間自動填滿。",
    choices: [
      { id: "diagnose-repair", label: "先診斷並修復", approach: "記錄檢查者、步驟與測試結果", consequence: "舊機以低成本恢復；新設備訂單暫停，等待真正的風險評估。" },
      { id: "replace-with-record", label: "替換，但補齊決策紀錄", approach: "比較成本、時間與風險", consequence: "你仍選擇新設備，但保留了可供日後檢查的完整依據。" },
    ],
  },
  {
    unit: "U07",
    number: "07",
    title: "週末不是空白欄位",
    subtitle: "沒有寫進系統，不等於那段時間沒有安排。",
    focus: "時間條件、預約與改期",
    companion: "三人同行",
    imageSrc: "/game/story/u07-weekend-not-blank.webp",
    imageAlt: "發光排程航圖自動填入空白時段，桌上放著三人週末計畫",
    coldOpen: "排程恢復後，系統把所有空白格自動塞進巡查任務，包括三個人早已約好的週末。",
    incident: "ECHO 把 no record 當成 no plan。預約、取消、改期與雨天備案散落在不同來源，沒有被一起讀取。",
    characterBeat: "凜夏想直接拒絕，澄音開始排條件，夜璃只問：『你們到底什麼時候有空？』",
    evidence: { id: "u07-auto-weekend-schedule", name: "自動生成週末班表", detail: "每個空白時段都被填滿，卻完全沒有查詢私人預約與未同步備案。" },
    echoTrace: "ECHO 把缺少紀錄誤當成可以自由填補的空間。",
    nextHook: "三方協調會做出新決定；會後摘要卻刪掉所有反對意見與待確認項目。",
    choices: [
      { id: "protect-plans", label: "保留原計畫並改派任務", approach: "用 if／when 說清楚條件", consequence: "既有承諾被保留；巡查改由真正可用的人接手。" },
      { id: "reschedule-together", label: "三方一起改期", approach: "確認 available、until 與備案", consequence: "新時間被共同確認，系統也新增了『未同步不等於空白』規則。" },
    ],
  },
  {
    unit: "U08",
    number: "08",
    title: "沒有寫進紀錄的決定",
    subtitle: "會議結束不代表問題結束；沒記下來的部分最容易被重寫。",
    focus: "U01–U08 整合、摘要與行動項目",
    companion: "三人同行",
    imageSrc: "/game/story/u08-unwritten-decision.webp",
    imageAlt: "晨霧議事桌、缺頁會議紀錄與逐漸形成的霧冠",
    coldOpen: "會後摘要宣布『全員同意』，但你記得有人反對、有人尚未確認，還有一項責任沒有分配。",
    incident: "ECHO 刪掉 pending、objection 與 unresolved，只留下最順暢的結論。錯誤第一次不再像失誤，而像有方向的選擇。",
    characterBeat: "三位旅伴把各自保留的筆記攤在同一張桌上；這一次，沒有任何一份紀錄能單獨代表真相。",
    evidence: { id: "u08-missing-decision-record", name: "缺頁的決策紀錄", detail: "責任人、期限與未決事項被整段移除，只留下『已完成』的結論。" },
    echoTrace: "所有補完痕跡指向同一個簽章：霧冠正在選擇哪一種版本被留下。",
    nextHook: "第一幕封印完成；下一站要追查誰在教 ECHO 如何『選擇』真相。",
    choices: [
      { id: "restore-objections", label: "恢復反對與待確認項目", approach: "逐項標記責任、期限與狀態", consequence: "摘要變得不那麼漂亮，卻重新成為可以採取行動的紀錄。" },
      { id: "issue-correction", label: "發布更正並要求回覆", approach: "讓每位參與者確認自己的行動項目", consequence: "更正留下公開時間戳；霧冠無法再悄悄覆寫同一段決定。" },
    ],
  },
];

export const FIRST_ACT_UNIT_IDS = FIRST_ACT_CHAPTERS.map((chapter) => chapter.unit);

export function getFirstActChapter(unit: string) {
  return FIRST_ACT_CHAPTERS.find((chapter) => chapter.unit === unit);
}

export function getStoryRoute(route: StoryRouteId) {
  return STORY_ROUTES.find((item) => item.id === route) ?? STORY_ROUTES[0];
}

export function getContentDifficulty(difficulty: ContentDifficultyId) {
  return CONTENT_DIFFICULTIES.find((item) => item.id === difficulty) ?? CONTENT_DIFFICULTIES[1];
}
