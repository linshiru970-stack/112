export type AdventureRegion = {
  id: string;
  numeral: string;
  name: string;
  subtitle: string;
  start: number;
  end: number;
  bossName: string;
};

export type AdventureEncounter = {
  id: string;
  regionId: string;
  name: string;
  title: string;
  hp: number;
  flavor: string;
  image: string;
  background: string;
  accent: string;
};

export type BattleStanceId = "blade" | "ward" | "lantern";

export type BattleStance = {
  id: BattleStanceId;
  mark: string;
  name: string;
  short: string;
  learningMode: "unassisted" | "hint" | "learning";
  evidenceLabel: string;
  correctDamage: number;
  scoutDamage: number;
};

export type BattleIntent = {
  id: string;
  mark: string;
  name: string;
  tell: string;
  counter: BattleStanceId;
  counterBonus: number;
  wrongDamage: number;
};

export type BattleEventEffect = "fog-lantern" | "echo-chain" | "signal-counter" | "gale-guard" | "archive-proof";

export type BattleEvent = {
  id: string;
  regionId: string;
  mark: string;
  name: string;
  tell: string;
  success: string;
  effect: BattleEventEffect;
  expeditionTurns: readonly number[];
  bossTurns: readonly number[];
};

export const ADVENTURE_REGIONS: readonly AdventureRegion[] = [
  { id: "trail", numeral: "I", name: "起程草原", subtitle: "把基本句子變成直覺", start: 1, end: 8, bossName: "霧冠守門者" },
  { id: "ridge", numeral: "II", name: "句型山脈", subtitle: "穿過長句與連接結構", start: 9, end: 16, bossName: "千回石王" },
  { id: "harbor", numeral: "III", name: "TOEIC 港都", subtitle: "七大題型開始交會", start: 17, end: 26, bossName: "訊號獵主" },
  { id: "plateau", numeral: "IV", name: "耐力高原", subtitle: "速度、長篇與資訊定位", start: 27, end: 34, bossName: "停刻巡狩" },
  { id: "citadel", numeral: "V", name: "終局之塔", subtitle: "完整模考與最後校準", start: 35, end: 40, bossName: "終卷審理者" },
];

export const REGION_ENCOUNTERS: Record<string, AdventureEncounter> = {
  trail: { id: "mist-sentinel", regionId: "trail", name: "霧原哨衛", title: "Mist Sentinel", hp: 190, flavor: "它守在草原古道上。六次作答，就是六次交鋒。", image: "/game/enemies/trail-sentinel.webp", background: "/game/regions/trail-bg.webp", accent: "#7cc6d8" },
  ridge: { id: "ridge-golem", regionId: "ridge", name: "回聲石像", title: "Echo Golem", hp: 198, flavor: "山徑上的石像會記住你的節奏，但不會替你決定要複習什麼。", image: "/game/enemies/ridge-golem.webp", background: "/game/regions/ridge-bg.webp", accent: "#a79be8" },
  harbor: { id: "signal-raider", regionId: "harbor", name: "訊號掠影", title: "Signal Raider", hp: 206, flavor: "港都迷霧裡的掠影，專門把資訊藏在噪音之間。", image: "/game/enemies/signal-raider.webp", background: "/game/regions/harbor-bg.webp", accent: "#51d4d0" },
  plateau: { id: "clock-hound", regionId: "plateau", name: "時刻獵犬", title: "Clock Hound", hp: 214, flavor: "高原上的追獵者。速度會改變戰鬥節奏，但不改變能力判定。", image: "/game/enemies/clock-hound.webp", background: "/game/regions/plateau-bg.webp", accent: "#e6b965" },
  citadel: { id: "archive-knight", regionId: "citadel", name: "典藏騎士", title: "Archive Knight", hp: 222, flavor: "終局之塔的巡守者，只承認真正留下的學習證據。", image: "/game/enemies/archive-knight.webp", background: "/game/regions/citadel-bg.webp", accent: "#d7a5ff" },
};

const BOSS_TITLES: Readonly<Record<string, string>> = {
  trail: "Mist Crown Guardian",
  ridge: "Echo Sovereign",
  harbor: "Signal Huntmaster",
  plateau: "Time Warden",
  citadel: "Final Examiner",
};

export const BOSS_ENCOUNTERS: Record<string, AdventureEncounter> = Object.fromEntries(
  ADVENTURE_REGIONS.map((region, index) => {
    const routeEncounter = REGION_ENCOUNTERS[region.id];
    return [region.id, {
      id: `${region.id}-guardian`,
      regionId: region.id,
      name: region.bossName,
      title: BOSS_TITLES[region.id] ?? `Region ${region.numeral} Guardian`,
      hp: 280 + index * 24,
      flavor: "十個未見題構成守門戰；遊戲勝負不會改寫正式課程進度。",
      image: `/game/enemies/${region.id}-guardian.webp`,
      background: routeEncounter.background,
      accent: routeEncounter.accent,
    }];
  }),
);

export const BOSS_TURN_LIMIT = 10;
export const BOSS_CORE_TARGET = 7;

export const REGION_BATTLE_INTENTS: Readonly<Record<string, readonly BattleIntent[]>> = {
  trail: [
    { id: "mist-armor", mark: "破", name: "霧甲展開", tell: "護甲正在凝聚；旅刃式最容易撕開缺口。", counter: "blade", counterBonus: 9, wrongDamage: 1 },
    { id: "mist-pulse", mark: "守", name: "霧潮重擊", tell: "霧潮正壓向隊伍；答錯會失去 2 意志，守勢可減傷。", counter: "ward", counterBonus: 8, wrongDamage: 2 },
    { id: "mist-lock", mark: "照", name: "迷途鎖定", tell: "路標被霧藏起；燈火式能照出真正的缺口。", counter: "lantern", counterBonus: 9, wrongDamage: 1 },
  ],
  ridge: [
    { id: "ridge-plate", mark: "破", name: "層岩封路", tell: "石層正在閉合；旅刃式可在縫隙消失前擊穿。", counter: "blade", counterBonus: 10, wrongDamage: 1 },
    { id: "ridge-fall", mark: "守", name: "落石震波", tell: "山壁即將崩落；答錯會失去 2 意志，守勢可卸力。", counter: "ward", counterBonus: 8, wrongDamage: 2 },
    { id: "ridge-rune", mark: "照", name: "回聲假句", tell: "回音正在複製錯誤訊號；燈火式可鎖定原句。", counter: "lantern", counterBonus: 10, wrongDamage: 1 },
  ],
  harbor: [
    { id: "harbor-cargo", mark: "破", name: "貨櫃裝甲", tell: "裝甲板正交錯鎖死；旅刃式能切開接縫。", counter: "blade", counterBonus: 10, wrongDamage: 1 },
    { id: "harbor-siren", mark: "守", name: "警報浪湧", tell: "港區警報即將衝擊；答錯會失去 2 意志，守勢可穩住。", counter: "ward", counterBonus: 9, wrongDamage: 2 },
    { id: "harbor-decoy", mark: "照", name: "假訊號投射", tell: "相似單字正在製造假線索；燈火式可辨認有效訊號。", counter: "lantern", counterBonus: 10, wrongDamage: 1 },
  ],
  plateau: [
    { id: "plateau-charge", mark: "破", name: "獵風突進", tell: "獵犬正借風加速；旅刃式可在衝刺前截斷路線。", counter: "blade", counterBonus: 10, wrongDamage: 1 },
    { id: "plateau-gale", mark: "守", name: "高原風壓", tell: "側風正掃過戰場；答錯會失去 2 意志，守勢可站穩。", counter: "ward", counterBonus: 9, wrongDamage: 2 },
    { id: "plateau-mirage", mark: "照", name: "熱霧殘影", tell: "速度感正在製造錯誤定位；燈火式能找回真正目標。", counter: "lantern", counterBonus: 10, wrongDamage: 1 },
  ],
  citadel: [
    { id: "citadel-redact", mark: "破", name: "封頁護甲", tell: "舊答案正封住入口；旅刃式可切斷重複記憶。", counter: "blade", counterBonus: 11, wrongDamage: 1 },
    { id: "citadel-verdict", mark: "守", name: "審理重擊", tell: "審理槌即將落下；答錯會失去 2 意志，守勢可承受。", counter: "ward", counterBonus: 9, wrongDamage: 2 },
    { id: "citadel-proof", mark: "照", name: "證據覆寫", tell: "典藏頁正混入舊題殘影；燈火式可標出真正的新證據。", counter: "lantern", counterBonus: 11, wrongDamage: 1 },
  ],
};

// Kept as the Region I baseline for older tests and any callers that only need the three core intent shapes.
export const BATTLE_INTENTS: readonly BattleIntent[] = REGION_BATTLE_INTENTS.trail;

export const REGION_BATTLE_EVENTS: Readonly<Record<string, BattleEvent>> = {
  trail: { id: "fog-lantern", regionId: "trail", mark: "霧", name: "霧幕裂縫", tell: "霧幕短暫變薄；燈火式答對可追加 8 傷害。", success: "燈火照穿霧幕", effect: "fog-lantern", expeditionTurns: [1, 4], bossTurns: [1, 4, 7] },
  ridge: { id: "echo-chain", regionId: "ridge", mark: "響", name: "回聲震幅", tell: "連續正解會被山壁放大；二連擊以上追加 10 傷害，失誤反震 +1。", success: "回聲放大連擊", effect: "echo-chain", expeditionTurns: [1, 4], bossTurns: [1, 4, 7] },
  harbor: { id: "signal-counter", regionId: "harbor", mark: "訊", name: "訊號窗口", tell: "有效訊號只維持一回合；看懂意圖並克制可追加 12 傷害，失誤反噪 +1。", success: "鎖定有效訊號", effect: "signal-counter", expeditionTurns: [1, 4], bossTurns: [1, 4, 7] },
  plateau: { id: "gale-guard", regionId: "plateau", mark: "風", name: "逆風前線", tell: "強風掃過戰場；守勢答對追加 8 傷害，其他架勢答錯會多失去 1 意志。", success: "守勢穿過逆風", effect: "gale-guard", expeditionTurns: [1, 4], bossTurns: [1, 4, 7] },
  citadel: { id: "archive-proof", regionId: "citadel", mark: "證", name: "封印校準", tell: "封印只承認無內容提示的正解；符合時追加 12 傷害，失誤反噬 +1。", success: "新證據通過校準", effect: "archive-proof", expeditionTurns: [1, 4], bossTurns: [1, 4, 7] },
};

export function regionIdForEncounter(encounterId: string) {
  const encounter = [...Object.values(REGION_ENCOUNTERS), ...Object.values(BOSS_ENCOUNTERS)]
    .find((entry) => entry.id === encounterId);
  return encounter?.regionId ?? "trail";
}

export function battleIntentFor(encounterId: string, turnIndex: number) {
  const intents = REGION_BATTLE_INTENTS[regionIdForEncounter(encounterId)] ?? BATTLE_INTENTS;
  const offset = hashSeed(encounterId) % intents.length;
  return intents[(offset + Math.max(0, turnIndex)) % intents.length];
}

export function battleEventFor(encounterId: string, turnIndex: number, mode: "expedition" | "boss") {
  const event = REGION_BATTLE_EVENTS[regionIdForEncounter(encounterId)] ?? REGION_BATTLE_EVENTS.trail;
  const turns = mode === "boss" ? event.bossTurns : event.expeditionTurns;
  return turns.includes(Math.max(0, turnIndex)) ? event : null;
}

export function resolveBattleEventEffect(event: BattleEvent | null, input: {
  correct: boolean;
  stanceId: BattleStanceId;
  correctChain: number;
  countered: boolean;
  strictEvidenceEligible: boolean;
}) {
  if (!event) return { damageBonus: 0, wrongDamageBonus: 0, succeeded: false };
  let succeeded = false;
  if (event.effect === "fog-lantern") succeeded = input.correct && input.stanceId === "lantern";
  if (event.effect === "echo-chain") succeeded = input.correct && input.correctChain >= 2;
  if (event.effect === "signal-counter") succeeded = input.correct && input.countered;
  if (event.effect === "gale-guard") succeeded = input.correct && input.stanceId === "ward";
  if (event.effect === "archive-proof") succeeded = input.correct && input.strictEvidenceEligible;
  const damageBonus = !succeeded ? 0
    : event.effect === "fog-lantern" || event.effect === "gale-guard" ? 8
      : event.effect === "echo-chain" ? 10
        : 12;
  const wrongDamageBonus = input.correct ? 0
    : event.effect === "fog-lantern" ? 0
      : event.effect === "gale-guard" && input.stanceId === "ward" ? 0
        : 1;
  return { damageBonus, wrongDamageBonus, succeeded };
}

export const BATTLE_STANCES: readonly BattleStance[] = [
  { id: "blade", mark: "刃", name: "旅刃式", short: "無提示作答；傷害最高，也可成為嚴格能力證據。", learningMode: "unassisted", evidenceLabel: "無提示驗證", correctDamage: 30, scoutDamage: 0 },
  { id: "ward", mark: "盾", name: "守勢", short: "取得一個提示；保留練習紀錄，但不當作無提示未見證據。", learningMode: "hint", evidenceLabel: "有提示練習", correctDamage: 24, scoutDamage: 0 },
  { id: "lantern", mark: "燈", name: "燈火式", short: "顯示學習提示；適合第一次理解，不作嚴格能力驗證。", learningMode: "learning", evidenceLabel: "學習模式", correctDamage: 26, scoutDamage: 0 },
];

export function getBattleStance(id: BattleStanceId) {
  return BATTLE_STANCES.find((stance) => stance.id === id) ?? BATTLE_STANCES[0];
}

export function battleTurnDamage(id: BattleStanceId, correct: boolean, correctChain: number) {
  const stance = getBattleStance(id);
  if (!correct) return stance.scoutDamage;
  const chainBonus = correctChain >= 2 ? (id === "lantern" ? 6 : 4) : 0;
  return stance.correctDamage + chainBonus;
}

export const XP_PER_LEVEL = 240;

export function adventureLevel(xp: number) {
  return Math.max(1, Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1);
}

export function adventureRank(level: number) {
  if (level >= 30) return "Master Wayfinder";
  if (level >= 20) return "Veteran Explorer";
  if (level >= 12) return "Pathfinder";
  if (level >= 6) return "Trail Seeker";
  return "New Adventurer";
}

type Loot = { name: string; detail: string; rarity: "Common" | "Rare" | "Epic" | "Legendary" };

const LOOT_POOL: readonly Loot[] = [
  { name: "琥珀羅盤", detail: "遠征收藏 · 指向下一個學習節點", rarity: "Common" },
  { name: "旅人筆記", detail: "遠征收藏 · 留下走過的句子", rarity: "Common" },
  { name: "薄霧書籤", detail: "遠征收藏 · 來自閱讀路線", rarity: "Rare" },
  { name: "靛藍耳羽", detail: "遠征收藏 · 來自聽力路線", rarity: "Rare" },
  { name: "銀色句型石", detail: "遠征收藏 · 代表一次能力驗證", rarity: "Epic" },
  { name: "星火字典頁", detail: "遠征收藏 · 來自單字圖鑑", rarity: "Epic" },
  { name: "守門者徽記", detail: "遠征收藏 · 不提供答題加成", rarity: "Legendary" },
  { name: "遠行者燈火", detail: "遠征收藏 · 只記錄旅程，不改變難度", rarity: "Legendary" },
];

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function collectibleFor(seed: string, chestIndex: number): Loot {
  const offset = hashSeed(seed) % LOOT_POOL.length;
  const index = (offset + chestIndex * 3) % LOOT_POOL.length;
  return LOOT_POOL[index];
}
