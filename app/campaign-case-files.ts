import { QUESTIONS, UNITS, type UnitId } from "./content";

export type CampaignAct = {
  id: "II" | "III" | "IV" | "V";
  range: string;
  title: string;
  threat: string;
  objective: string;
};

export type CampaignCaseFile = {
  id: string;
  unit: UnitId;
  act: CampaignAct;
  caseNumber: string;
  title: string;
  incident: string;
  evidence: string;
  englishAction: string;
  decision: string;
  consequence: string;
  questionIds: string[];
  boss: boolean;
};

export const CAMPAIGN_ACTS: readonly CampaignAct[] = [
  { id: "II", range: "U09–U16", title: "被選擇的真相", threat: "ECHO 不再只補空白，而是開始選擇哪一種版本被留下。", objective: "追蹤完成式、資訊來源與間接問句留下的時間痕跡。" },
  { id: "III", range: "U17–U26", title: "回聲媒體網", threat: "公告、語音、表格與郵件同時散布互相支持的錯誤版本。", objective: "跨文件定位人物、時間、目的、條件與指涉，不被關鍵字回聲誘導。" },
  { id: "IV", range: "U27–U34", title: "城市協議", threat: "被改寫的流程進入交通、活動、客服與採購系統，錯誤會真正改變人們的行動。", objective: "用可執行英文重建責任、順序、例外與確認流程。" },
  { id: "V", range: "U35–U40", title: "終局校準", threat: "霧冠把所有舊證據混入模考與最終決策，逼你在時間壓力下選擇可信版本。", objective: "整合聽讀、文法、搭配與多文件證據，在不中斷條件下完成最終校準。" },
];

const INCIDENT_PATTERNS = [
  "兩份看似正式的通知使用相同關鍵字，卻在責任人與完成時間上互相衝突。",
  "一段流利語音把真實背景接到沒有來源的行動要求上，所有人都以為別人已經確認。",
  "表格中的一個欄位被改成過時版本；如果只讀摘要，就會把例外當成一般規則。",
  "系統自動補完缺少的句子，造成目的、條件與下一步被悄悄改寫。",
];

const EVIDENCE_PATTERNS = [
  "來源時間戳、修訂紀錄與一段未被摘要收錄的英文原句",
  "兩封郵件、一份排程與語音中唯一能核對的具體動作",
  "流程表的責任欄、條件欄與最後確認人的英文回覆",
  "公告、表格與對話中重複出現但指向不同先行詞的詞語",
];

function actForUnit(unitNumber: number) {
  if (unitNumber <= 16) return CAMPAIGN_ACTS[0];
  if (unitNumber <= 26) return CAMPAIGN_ACTS[1];
  if (unitNumber <= 34) return CAMPAIGN_ACTS[2];
  return CAMPAIGN_ACTS[3];
}

const BOSS_UNITS = new Set(["U16", "U26", "U34", "U35", "U37", "U39", "U40"]);

export const CAMPAIGN_CASE_FILES: readonly CampaignCaseFile[] = UNITS.filter((unit) => Number(unit.id.slice(1)) >= 9).map((unit, index) => {
  const unitNumber = Number(unit.id.slice(1));
  const act = actForUnit(unitNumber);
  const boss = BOSS_UNITS.has(unit.id);
  const questionIds = QUESTIONS.filter((question) => question.unit === unit.id).map((question) => question.id);
  return {
    id: `case-${unit.id.toLocaleLowerCase()}`,
    unit: unit.id,
    act,
    caseNumber: String(unitNumber).padStart(2, "0"),
    title: boss ? `${unit.title} · 校準關卡` : `${unit.title} · 現場案件`,
    incident: `${INCIDENT_PATTERNS[index % INCIDENT_PATTERNS.length]} 這次必須依「${unit.goal}」完成判斷。`,
    evidence: EVIDENCE_PATTERNS[index % EVIDENCE_PATTERNS.length],
    englishAction: `用 ${unit.grammar} 讀懂證據，完成 ${unit.toeicPart} 型任務，並以題目要求的英文選擇、確認或短輸出採取行動。`,
    decision: boss ? "在多份證據與時間限制下提交最終版本。" : "選擇先核對來源、重建流程，或直接執行目前版本。",
    consequence: "答錯會改變當輪戰況與修復路線，但不扣旅伴好感，也不刪除已建立的能力證據。",
    questionIds,
    boss,
  };
});

export function getCampaignCaseFile(unit: string) {
  return CAMPAIGN_CASE_FILES.find((caseFile) => caseFile.unit === unit);
}
