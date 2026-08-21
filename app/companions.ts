export type CompanionId = "rinka" | "sena" | "yori";

export type CompanionDialogueChoice = {
  id: string;
  label: string;
  response: string;
};

export type CompanionDialogueTopic = {
  id: string;
  label: string;
  short: string;
  minAffinity: number;
  choices: readonly CompanionDialogueChoice[];
};

export type Companion = {
  id: CompanionId;
  name: string;
  englishName: string;
  epithet: string;
  role: string;
  image: string;
  accent: string;
  softAccent: string;
  quote: string;
  bio: string;
  combatPassive: string;
  burstName: string;
  burstLine: string;
  greetings: readonly [string, string, string, string, string];
  topics: readonly CompanionDialogueTopic[];
};

export const DEFAULT_COMPANION_ID: CompanionId = "rinka";

export const COMPANIONS: readonly Companion[] = [
  {
    id: "rinka",
    name: "凜夏",
    englishName: "Rinka",
    epithet: "赤曜前鋒",
    role: "近戰／正解追擊",
    image: "/game/companions/rinka.webp",
    accent: "#e86a67",
    softAccent: "#fff0ee",
    quote: "別把答錯當成退路。看清楚它，下一次就能比它快。",
    bio: "總是先一步衝進未知區域的行動派。說話直，但會默默記住你卡住的地方。",
    combatPassive: "正解命中額外 +3 戰鬥傷害。",
    burstName: "赤曜追擊",
    burstLine: "看清楚了？那就一起把這個破口打穿。",
    greetings: [
      "喔，你來了。今天先走哪一段？我已經把路看過一遍。",
      "比上次熟練多了。別急著追連擊，先把每一題看清楚。",
      "現在不用我提醒，你也會自己停下來找證據了。這很好。",
      "一起走這麼久，我大概知道你會在哪種題目前皺眉了。放心，我在。",
      "都走到這裡了，就不用說什麼加油吧。下一段路，我還是跟你一起。",
    ],
    topics: [
      {
        id: "expedition",
        label: "今天的遠征",
        short: "聊聊今天要怎麼走",
        minAffinity: 0,
        choices: [
          { id: "steady", label: "我今天想慢慢做，不想趕。", response: "那就慢慢來。戰鬥畫面可以熱鬧，判斷可不能被它催著跑。" },
          { id: "push", label: "我想試著做快一點。", response: "可以。先求看懂，再壓時間。真的卡住就停，亂猜不算速度。" },
          { id: "tired", label: "今天有點累。", response: "那就把今天選的路拆成幾小步。走完就停，別把『每天都要很強』也變成一道考題。" },
        ],
      },
      {
        id: "mistake",
        label: "聊答錯的題",
        short: "把失誤變成情報",
        minAffinity: 0,
        choices: [
          { id: "annoyed", label: "明明會，還是會選錯。", response: "那通常不是『不會』，而是線索還沒自動化。把你錯的那一步抓出來，比再背一次答案有用。" },
          { id: "guess", label: "有時候我其實是在猜。", response: "那就把信心按低。誠實的低信心比漂亮的假分數有價值，系統才知道該讓誰再出場。" },
          { id: "repeat", label: "同一個地方一直錯很煩。", response: "很好，至少敵人已經現形了。換一個新情境再贏它一次，才叫真的報仇。" },
        ],
      },
      {
        id: "story",
        label: "問她以前的事",
        short: "解鎖一點旅伴故事",
        minAffinity: 12,
        choices: [
          { id: "sword", label: "妳為什麼總帶著那把刀？", response: "以前我以為刀是拿來搶在所有人前面。後來才知道，能留在別人身邊走完全程，比衝第一難多了。" },
          { id: "route", label: "妳以前也常旅行嗎？", response: "嗯，而且很會迷路。別笑。方向感跟自信沒有必然關係——這算我親自驗證過的。" },
          { id: "stay", label: "妳為什麼願意陪我？", response: "因為你是真的在學，不是在演給誰看。這種旅程，我願意把時間放進去。" },
        ],
      },
      {
        id: "quiet",
        label: "休息一下",
        short: "只有熟悉的人才有的安靜",
        minAffinity: 28,
        choices: [
          { id: "silence", label: "先什麼都不要說。", response: "好。那就坐一下。下一題不會跑掉，風也不會。" },
          { id: "snack", label: "遠征結束想吃東西。", response: "成交。你負責把選好的路走完，我負責提醒你別又做完才發現自己餓了。" },
          { id: "tomorrow", label: "明天再繼續也可以吧？", response: "當然。真正的進度不是把自己逼到討厭它。明天見就好。" },
        ],
      },
    ],
  },
  {
    id: "sena",
    name: "澄音",
    englishName: "Sena",
    epithet: "蒼穹測繪師",
    role: "遠程／弱點解析",
    image: "/game/companions/sena.webp",
    accent: "#5ea9df",
    softAccent: "#edf8ff",
    quote: "不知道答案並不可怕。真正危險的是把猜測當成已經理解。",
    bio: "習慣把路線、聲音與細節全部記下來的測繪師。表面冷靜，偶爾會一本正經地說奇怪的笑話。",
    combatPassive: "答錯受到反擊時，意志傷害 -1；不會改寫英文能力判定。",
    burstName: "蒼穹校準",
    burstLine: "座標確認。這次不是猜測——弱點就在那裡。",
    greetings: [
      "同步完成。今天的路線不長，我們可以把每一步走得很準。",
      "你的作答紀錄開始有規律了。別擔心，我說的是好事。",
      "我已經不需要一直提醒你標記低信心了。這代表你的判斷正在變可靠。",
      "如果你想挑戰速度，我可以陪你計時；如果不想，我們就照原本的節奏。",
      "數據能記住很多事，但有些默契不需要做成圖表。我現在才慢慢理解。",
    ],
    topics: [
      {
        id: "expedition",
        label: "今天的路線",
        short: "請她分析今天狀態",
        minAffinity: 0,
        choices: [
          { id: "focus", label: "我今天很有精神。", response: "收到。那就把注意力放在『為什麼選它』，不要只追求一排綠色勾。" },
          { id: "foggy", label: "腦袋有點霧霧的。", response: "降低速度，不降低標準。看不懂就留下低信心，這仍然是一筆很好的資料。" },
          { id: "listen", label: "今天比較想練聽力。", response: "可以。但首聽還是只聽一次再答。第二次是用來分析，不是把第一次答案洗掉。" },
        ],
      },
      {
        id: "method",
        label: "問學習方法",
        short: "把直覺拆成步驟",
        minAffinity: 0,
        choices: [
          { id: "slow", label: "我看得懂，但真的很慢。", response: "那是『尚未自動化』，不是零分。先保持正確，再看有效作答時間慢慢縮短。" },
          { id: "words", label: "單字常常記了又忘。", response: "忘記本來就是間隔複習需要的訊號。真正要避免的是因為忘過一次，就把自己判定成不會。" },
          { id: "long", label: "長句一來我就亂掉。", response: "先找主詞和主要動詞，再看修飾資訊。像測繪一樣，先畫主幹，細節才有地方掛上去。" },
        ],
      },
      {
        id: "story",
        label: "問她的測繪簿",
        short: "她很少主動談自己的筆記",
        minAffinity: 12,
        choices: [
          { id: "book", label: "妳的本子都記什麼？", response: "路線、天氣、聽錯的聲音，還有同行者的小習慣。最後一項……目前不開放查閱。" },
          { id: "joke", label: "妳是不是其實很愛冷笑話？", response: "錯誤。我的笑話都有經過精確校準。別人不笑，是量測設備的問題。" },
          { id: "alone", label: "妳以前都是一個人嗎？", response: "大多時候。獨自走很有效率，但有人能一起討論『剛剛到底哪裡看錯』，意外地不壞。" },
        ],
      },
      {
        id: "quiet",
        label: "一起看夜空",
        short: "不需要一直有答案",
        minAffinity: 28,
        choices: [
          { id: "stars", label: "今天不分析星星。", response: "……同意。難得的無分析模式，從現在開始。" },
          { id: "company", label: "有人一起坐著感覺不錯。", response: "我正在努力不把這句話做成統計表。目前進度……尚可。" },
          { id: "next", label: "下一區也一起去吧。", response: "路線已經預留你的座標。這次不是系統自動填的，是我自己放上去的。" },
        ],
      },
    ],
  },
  {
    id: "yori",
    name: "夜璃",
    englishName: "Yori",
    epithet: "星環觀測者",
    role: "術式／連擊共鳴",
    image: "/game/companions/yori.webp",
    accent: "#9a79df",
    softAccent: "#f5f0ff",
    quote: "規則不是用來嚇人的。看懂它，很多看似神祕的事就只是結構而已。",
    bio: "帶著星環裝置四處觀測語言與記憶的術式師。喜歡把簡單的事情講得神祕，再笑著看你拆穿她。",
    combatPassive: "連續答對 2 題以上時額外 +5 戰鬥傷害。",
    burstName: "星環共鳴",
    burstLine: "規則已經被你看懂了。剩下的，就交給星光吧。",
    greetings: [
      "歡迎回來。放心，今天的命運沒有寫在星盤上——它寫在你接下來的每個選擇裡。",
      "嗯，氣息不一樣了。翻譯成人話？你比第一次來的時候穩多了。",
      "要不要猜猜今天哪一題會最難？算了，提前知道考點就不好玩了。",
      "我本來只是想觀察你的學習軌跡。現在嘛……同行本身也挺有趣。",
      "星環說今天適合遠行。其實它什麼都沒說，是我想跟你去。",
    ],
    topics: [
      {
        id: "expedition",
        label: "問今日運勢",
        short: "她會故意把學習說成占卜",
        minAffinity: 0,
        choices: [
          { id: "luck", label: "今天答題運氣好嗎？", response: "大吉——前提是你不用運氣選答案。證據優先，星象第二。" },
          { id: "boss", label: "Boss 今天會不會很難？", response: "如果它難，就把它當成診斷；如果它簡單，就當成驗證。這樣我們怎麼都不虧。" },
          { id: "skip", label: "可以占卜出正確答案嗎？", response: "可以啊。占卜結果是：『請先作答。』你看，準得可怕。" },
        ],
      },
      {
        id: "language",
        label: "聊語言",
        short: "她對句子結構很著迷",
        minAffinity: 0,
        choices: [
          { id: "grammar", label: "文法規則好多。", response: "別一次抱整本規則跑。你目前只需要眼前已經教過的那幾個，其他讓未來的你處理。" },
          { id: "native", label: "母語者真的會想文法嗎？", response: "多數時候不會逐條背規則，就像你說中文不會先畫句法樹。練習是在幫你把規則慢慢變成直覺。" },
          { id: "meaning", label: "我常常每個字都懂，整句不懂。", response: "那就別把句子當成一袋單字。先找誰做什麼，再把時間、地點、原因一層層掛回去。" },
        ],
      },
      {
        id: "story",
        label: "問星環的來歷",
        short: "她終於願意少說一點謎語",
        minAffinity: 12,
        choices: [
          { id: "ring", label: "那個星環到底是什麼？", response: "記憶觀測器。它很擅長記錄重複、間隔與遺忘——所以我看到你用 FSRS 時，第一眼就覺得很親切。" },
          { id: "mystery", label: "妳以前也這麼愛裝神祕嗎？", response: "以前更嚴重。現在至少你一皺眉，我就會記得補一句人話。這叫進步。" },
          { id: "travel", label: "妳想觀測到什麼時候？", response: "原本有終點。現在我把終點欄位留白了。偶爾讓旅程自己決定，也不錯。" },
        ],
      },
      {
        id: "quiet",
        label: "深夜閒聊",
        short: "沒有考點，也沒有占卜",
        minAffinity: 28,
        choices: [
          { id: "normal", label: "今天講點普通的。", response: "好。普通的問題：晚餐吃了嗎？普通的提醒：別學到忘記時間。怎樣，我也是會的。" },
          { id: "silence", label: "其實不用一直聊天。", response: "我知道。能自在地安靜，通常比硬找話題更難得。" },
          { id: "together", label: "以後也繼續同行吧。", response: "這次不用星環確認。我的答案是，好。" },
        ],
      },
    ],
  },
] as const;

export function getCompanion(id?: string | null) {
  return COMPANIONS.find((companion) => companion.id === id) ?? COMPANIONS[0];
}

export function companionAffinityTier(affinity: number) {
  const value = Math.max(0, Math.min(100, Math.trunc(affinity)));
  if (value >= 80) return { level: 5, label: "羈絆", next: 100 };
  if (value >= 50) return { level: 4, label: "信賴", next: 80 };
  if (value >= 25) return { level: 3, label: "默契", next: 50 };
  if (value >= 10) return { level: 2, label: "熟悉", next: 25 };
  return { level: 1, label: "初識", next: 10 };
}

export function companionGreeting(companion: Companion, affinity: number) {
  const tier = companionAffinityTier(affinity);
  return companion.greetings[tier.level - 1];
}

export function companionBattleBonus(id: CompanionId, correct: boolean, chain: number) {
  if (id === "rinka" && correct) return 3;
  if (id === "yori" && correct && chain >= 2) return 5;
  return 0;
}

export function companionWrongDamageReduction(id: CompanionId) {
  return id === "sena" ? 1 : 0;
}

export function companionBattleResultLine(id: CompanionId, outcome: "victory" | "defeat", weakness?: string | null) {
  if (outcome === "victory") {
    if (id === "rinka") return "這才像一場真的勝利。先把戰利品收好，下一次我們再換一種打法。";
    if (id === "sena") return "戰果已保存。更重要的是，這一輪哪些地方穩、哪些地方靠支援，都分得很清楚。";
    return "星環確認：這不是運氣。你剛才做出的每一個選擇，都真的改變了戰局。";
  }
  const target = weakness ? `「${weakness}」` : "剛才反覆失手的地方";
  if (id === "rinka") return `輸了就回營火，把 ${target} 拆開。敵人沒有消失，但你已經知道下一次要往哪裡砍。`;
  if (id === "sena") return `敗北資料已整理：優先處理 ${target}。不是把同一題背起來，而是換一個情境重新驗證。`;
  return `故事沒有因為敗北停住。${target} 已經從迷霧變成線索，下一輪會更接近答案。`;
}

export function getCompanionTopic(companionId: CompanionId, topicId: string) {
  return getCompanion(companionId).topics.find((topic) => topic.id === topicId);
}

export function getCompanionChoice(companionId: CompanionId, topicId: string, choiceId: string) {
  return getCompanionTopic(companionId, topicId)?.choices.find((choice) => choice.id === choiceId);
}
