export type GrammarGuide = {
  id: `G${string}`;
  title: string;
  firstUnit: `U${string}`;
  pattern: string;
  use: string;
  example: string;
  commonError: string;
  tags: string[];
};

export const GRAMMAR_LIBRARY: readonly GrammarGuide[] = [
  { id: "G01", title: "句子主幹與基本肯否定", firstUnit: "U01", pattern: "主詞 + be／一般動詞 + 其餘資訊", use: "先找誰或什麼，再找主要動作或狀態；否定時把 not 放在正確的助動詞後。", example: "The new employee is at the front desk.", commonError: "同一句同時放 be 動詞和一般動詞原形，例如 is work。", tags: ["主詞", "動詞", "否定"] },
  { id: "G02", title: "現在簡單式與 do／does", firstUnit: "U02", pattern: "I/you/we/they + V；he/she/it + V-s；Do/Does + 主詞 + V?", use: "描述習慣、固定安排與一般事實。", example: "Does she commute by train?", commonError: "用了 does 之後，主要動詞仍保留 -s。", tags: ["現在簡單式", "問句", "第三人稱"] },
  { id: "G03", title: "主詞動詞一致", firstUnit: "U02", pattern: "單數主詞配單數動詞；複數主詞配原形動詞", use: "依真正的主詞決定動詞，不被主詞後面的名詞干擾。", example: "The list of items is on the desk.", commonError: "看到離動詞最近的複數名詞，就誤用複數動詞。", tags: ["單複數", "主詞"] },
  { id: "G04", title: "過去式、未來式與時間線", firstUnit: "U03", pattern: "過去：V-ed／不規則式；未來：will + V／be going to + V", use: "用時間詞先定位事件發生的先後，再選時態。", example: "I received the message yesterday and will reply tomorrow.", commonError: "同一事件的時間詞和動詞時態互相衝突。", tags: ["過去式", "未來式", "時間線"] },
  { id: "G05", title: "現在與過去進行式", firstUnit: "U02", pattern: "am/is/are + V-ing；was/were + V-ing", use: "表達正在進行、暫時狀態，或某個過去時間點正在發生的事。", example: "She is waiting on platform three now.", commonError: "把習慣動作一律寫成進行式。", tags: ["進行式", "現在", "過去"] },
  { id: "G06", title: "詞性與字族位置", firstUnit: "U05", pattern: "限定詞 + 形容詞 + 名詞；動詞 + 副詞", use: "依空格在句中的位置判斷需要名詞、動詞、形容詞或副詞。", example: "Please read the instructions carefully.", commonError: "只看字義相近，沒有檢查詞性位置。", tags: ["詞性", "字族", "副詞"] },
  { id: "G07", title: "冠詞、可數性與數量詞", firstUnit: "U11", pattern: "a/an + 單數可數；many/few + 複數；much/little + 不可數", use: "先判斷名詞是否可數、單複數與是否特指。", example: "We need a revised schedule and some additional information.", commonError: "在不可數名詞前直接使用 a/an。", tags: ["冠詞", "可數名詞", "數量詞"] },
  { id: "G08", title: "代名詞與先行詞", firstUnit: "U01", pattern: "主格作主詞；受格作受詞；所有格放名詞前", use: "確認代名詞指向誰，並依句中位置選形式。", example: "Ms. Chen is a manager. She works in sales.", commonError: "用 her 單獨當句子的主詞。", tags: ["代名詞", "指涉"] },
  { id: "G09", title: "被動語態", firstUnit: "U06", pattern: "be + 過去分詞（+ by + 執行者）", use: "焦點在動作承受者、程序或結果時使用；需要追責時補回執行者。", example: "The equipment was inspected by a technician.", commonError: "只有 be 動詞，卻沒有過去分詞。", tags: ["被動", "過去分詞"] },
  { id: "G10", title: "情態動詞", firstUnit: "U07", pattern: "can/could/may/might/must/should + 原形動詞", use: "表達能力、可能、許可、義務或建議。", example: "You should confirm the source first.", commonError: "情態動詞後使用 to V 或第三人稱 -s。", tags: ["情態動詞", "建議", "義務"] },
  { id: "G11", title: "to V 與 V-ing 搭配", firstUnit: "U03", pattern: "decide/plan/want + to V；enjoy/avoid/finish + V-ing", use: "依前一個動詞的固定搭配選不定詞或動名詞。", example: "We decided to postpone the meeting.", commonError: "只依中文意思任意互換 to V 與 V-ing。", tags: ["不定詞", "動名詞", "搭配"] },
  { id: "G12", title: "V-ing／V-ed 分詞修飾", firstUnit: "U05", pattern: "V-ing：帶來感受；V-ed：感受到", use: "分辨事物造成的效果與人的感受。", example: "The confusing notice left several passengers confused.", commonError: "把感到無聊的人寫成 boring。", tags: ["分詞", "形容詞"] },
  { id: "G13", title: "比較級、最高級與比較結構", firstUnit: "U11", pattern: "比較級 + than；the + 最高級；as + 原級 + as", use: "比較兩者或同一群體中的程度。", example: "The revised route is safer than the original one.", commonError: "同時使用 more 和 -er。", tags: ["比較級", "最高級"] },
  { id: "G14", title: "時間、地點與方向介系詞", firstUnit: "U07", pattern: "at + 時刻／點；on + 日期／表面；in + 月年／範圍", use: "依時間或空間尺度選介系詞，並記固定搭配。", example: "The train leaves at 7:20 on Monday.", commonError: "精確時刻用 in，或星期用 at。", tags: ["介系詞", "時間", "地點"] },
  { id: "G15", title: "原因、轉折、時間與條件連接", firstUnit: "U04", pattern: "because/although/when/if + 子句", use: "先判斷兩段資訊的邏輯關係，再選連接詞。", example: "If the source cannot be verified, do not submit the file.", commonError: "if 條件子句中不必要地使用 will。", tags: ["連接詞", "條件句", "因果"] },
  { id: "G16", title: "關係子句與指涉", firstUnit: "U12", pattern: "人 + who；物 + which/that；地點 + where", use: "把補充資訊接到正確的先行詞後。", example: "The clerk who answered the call recorded the time.", commonError: "關係詞指向錯誤的名詞。", tags: ["關係子句", "指涉"] },
  { id: "G17", title: "現在完成式與過去式", firstUnit: "U09", pattern: "have/has + 過去分詞；明確過去時間用過去式", use: "現在完成式連結過去與現在；有 yesterday、last year 等明確過去時間時用過去式。", example: "We have received three reports so far.", commonError: "現在完成式和明確結束的過去時間並用。", tags: ["現在完成式", "過去式"] },
  { id: "G18", title: "問句結構與自然回應", firstUnit: "U02", pattern: "助動詞/be + 主詞…?；疑問詞 + 問句", use: "先辨認問句在問人物、時間、原因、選擇或是非，再找直接回應。", example: "When will the package arrive? — By Friday.", commonError: "只因選項重複題目單字就選，沒有回答問題焦點。", tags: ["問句", "回應", "TOEIC Part 2"] },
  { id: "G19", title: "名詞子句與間接問句", firstUnit: "U15", pattern: "Could you tell me + 疑問詞 + 主詞 + 動詞", use: "把完整意思當名詞使用；間接問句改回直述語序。", example: "Could you tell me where the meeting is?", commonError: "間接問句仍使用 where is the meeting 的倒裝。", tags: ["名詞子句", "間接問句"] },
  { id: "G20", title: "使役與受詞補語", firstUnit: "U15", pattern: "make/have/let + 人 + 原形；get + 人 + to V", use: "表達讓、請或使某人完成動作。", example: "The manager had the team revise the proposal.", commonError: "把 make someone to do 當成標準結構。", tags: ["使役", "受詞補語"] },
  { id: "G21", title: "關係子句簡化與分詞片語", firstUnit: "U12", pattern: "主動關係 → V-ing；被動關係 → 過去分詞", use: "在指涉清楚時壓縮關係子句，不改變主被動關係。", example: "Passengers waiting on platform three received an update.", commonError: "簡化後分詞的邏輯主詞和主要子句不一致。", tags: ["簡化子句", "分詞片語"] },
  { id: "G22", title: "平行結構與成對連接詞", firstUnit: "U14", pattern: "both A and B；either A or B；not only A but also B", use: "連接相同詞性或相同句法層級的內容。", example: "The update is both clear and accurate.", commonError: "A 與 B 一邊是名詞、一邊是完整子句。", tags: ["平行結構", "連接詞"] },
  { id: "G23", title: "建議／要求 that + 原形", firstUnit: "U10", pattern: "recommend/request/require that + 主詞 + 原形動詞", use: "正式表達建議、要求或必要性。", example: "The supervisor requested that every source be verified.", commonError: "that 子句依第三人稱加 -s。", tags: ["假設語氣", "正式英文"] },
  { id: "G24", title: "固定句型與介系詞搭配", firstUnit: "U15", pattern: "形容詞／動詞 + 固定介系詞", use: "把 responsible for、interested in、comply with 等當完整語塊記憶。", example: "The coordinator is responsible for the final schedule.", commonError: "依中文逐字選介系詞。", tags: ["固定搭配", "介系詞"] },
  { id: "G25", title: "依句意、結構與搭配排除", firstUnit: "U16", pattern: "先判詞性 → 再判文法 → 最後核對語意與搭配", use: "在多益選項中逐層排除，不靠單一關鍵字猜答案。", example: "Check the sentence frame before comparing similar meanings.", commonError: "看到熟悉單字就選，沒有檢查整句證據。", tags: ["解題策略", "排除法", "語境"] },
];

export function getGrammarGuide(id: string) {
  return GRAMMAR_LIBRARY.find((guide) => guide.id === id);
}
