import {
  battleEventFor,
  battleIntentFor,
  battleTurnDamage,
  resolveBattleEventEffect,
  type BattleStanceId,
} from "./adventure";
import {
  companionBattleBonus,
  companionWrongDamageReduction,
  type CompanionId,
} from "./companions";

export const MAX_WILLPOWER = 5;

export type GameItemId = "erase-rune" | "hint-lantern" | "guard-charm" | "trail-ration" | "echo-stone";
export type EquipmentSlot = "weapon" | "charm" | "accessory";
export type GameEquipmentId =
  | "wayfarer-blade"
  | "clear-lantern"
  | "lone-ring"
  | "resonance-earring"
  | "tactician-compass"
  | "guardian-edge"
  | "scarlet-chain"
  | "surveyors-staff"
  | "starloop-core";
export type GameMemoryId = "rinka-rainy-night" | "sena-starlight-calibration" | "yori-starlit-promise";
export type GameOutfitId =
  | "rinka-vanguard"
  | "rinka-rain-vanguard"
  | "sena-surveyor"
  | "sena-night-cartographer"
  | "yori-observer"
  | "yori-quiet-stargazer";
export type BattleGrade = "S" | "A" | "B";
export type ExpeditionBoonId = "hunter-oath" | "aegis-oath" | "resonant-spark" | "bounty-seal";
export type GameQuestId = "finish-run" | "land-four" | "read-intent" | "win-run" | "clean-win" | "burst-once";

export type VerifiedBattleTurn = {
  questionId: string;
  correct: boolean;
  strictEvidenceEligible: boolean;
  bossCoreHit: boolean;
  stanceId: BattleStanceId;
  companionId: CompanionId;
  companionAffinity: number;
  burstRequested: boolean;
  itemIds: readonly GameItemId[];
};

export type VerifiedBattleResolution = {
  valid: boolean;
  reason?: string;
  outcome: "victory" | "defeat" | "active";
  correctCount: number;
  contentAssistCount: number;
  itemUseCount: number;
  counterCount: number;
  burstCount: number;
  remainingWillpower: number;
  onlyBlade: boolean;
  totalDamage: number;
  coreHits: number;
};

export const GAME_ITEMS: ReadonlyArray<{
  id: GameItemId;
  mark: string;
  name: string;
  detail: string;
  price: number;
  contentAssist: boolean;
}> = [
  { id: "erase-rune", mark: "消", name: "消去符", detail: "選擇題排除 1 個錯誤選項。", price: 25, contentAssist: true },
  { id: "hint-lantern", mark: "示", name: "提示燈", detail: "顯示這題的句型／判斷提示。", price: 25, contentAssist: true },
  { id: "guard-charm", mark: "護", name: "守心符", detail: "擋住下一次實際意志傷害。", price: 30, contentAssist: false },
  { id: "trail-ration", mark: "食", name: "旅糧", detail: "戰鬥中恢復 1 點意志。", price: 20, contentAssist: false },
  { id: "echo-stone", mark: "聽", name: "回聲石", detail: "聽力題額外完整播放 1 次。", price: 35, contentAssist: true },
] as const;

export const GAME_EQUIPMENT: ReadonlyArray<{
  id: GameEquipmentId;
  slot: EquipmentSlot;
  rarity: "R" | "SR" | "SSR";
  name: string;
  detail: string;
  source: string;
}> = [
  { id: "wayfarer-blade", slot: "weapon", rarity: "R", name: "旅人長劍", detail: "旅刃式無提示答對時，額外造成 6 點傷害。", source: "初始裝備" },
  { id: "clear-lantern", slot: "charm", rarity: "R", name: "澄明燈", detail: "每場第一次真正受到答錯傷害時，減少 1 點。", source: "初始裝備" },
  { id: "lone-ring", slot: "accessory", rarity: "SR", name: "孤行者戒指", detail: "整場未使用內容提示並勝利時，金幣 +25%。", source: "首次遠征勝利" },
  { id: "resonance-earring", slot: "accessory", rarity: "SR", name: "共鳴耳墜", detail: "每場選定遠征祝福後，額外帶著 1 點共鳴能量開戰。", source: "領取第一份旅途委託" },
  { id: "tactician-compass", slot: "accessory", rarity: "SSR", name: "戰術羅盤", detail: "用正確架勢克制敵方意圖時，額外造成 5 點傷害。", source: "累計領取三份旅途委託" },
  { id: "guardian-edge", slot: "weapon", rarity: "SSR", name: "守門者之刃", detail: "旅刃式無提示答對時，額外造成 10 點傷害。", source: "首次區域 Boss 勝利" },
  { id: "scarlet-chain", slot: "charm", rarity: "SR", name: "赤曜連鎖扣", detail: "凜夏出戰、旅刃式二連擊以上時，額外造成 8 點傷害。", source: "凜夏事件《雨夜同行》" },
  { id: "surveyors-staff", slot: "weapon", rarity: "SR", name: "蒼穹測繪杖", detail: "澄音出戰，以守勢或燈火式答對時額外造成 8 點傷害；仍不算無提示證據。", source: "澄音事件《星圖校準》" },
  { id: "starloop-core", slot: "accessory", rarity: "SR", name: "靜夜星環核", detail: "夜璃出戰時，旅伴爆發所需能量 -1，最低為 2。", source: "夜璃事件《星夜約定》" },
] as const;

export const GAME_OUTFITS: ReadonlyArray<{
  id: GameOutfitId;
  companionId: CompanionId;
  name: string;
  detail: string;
  image: string;
  source: string;
  accent: string;
}> = [
  { id: "rinka-vanguard", companionId: "rinka", name: "赤曜前鋒", detail: "凜夏原本的紅黑戰鬥服。", image: "/game/companions/rinka.webp", source: "初始衣裝", accent: "#e86a67" },
  { id: "rinka-rain-vanguard", companionId: "rinka", name: "雨線先鋒服", detail: "適合雨天遠征的短斗篷旅裝。", image: "/game/outfits/rinka-rain-vanguard.webp", source: "凜夏事件《雨夜同行》", accent: "#cf5b55" },
  { id: "sena-surveyor", companionId: "sena", name: "蒼穹測繪師", detail: "澄音原本的白藍測繪服。", image: "/game/companions/sena.webp", source: "初始衣裝", accent: "#5ea9df" },
  { id: "sena-night-cartographer", companionId: "sena", name: "夜航測繪服", detail: "在營地校準夜間航線的輕便衣裝。", image: "/game/outfits/sena-night-cartographer.webp", source: "澄音事件《星圖校準》", accent: "#4f8fcf" },
  { id: "yori-observer", companionId: "yori", name: "星環觀測者", detail: "夜璃原本的黑紫術式服。", image: "/game/companions/yori.webp", source: "初始衣裝", accent: "#9a79df" },
  { id: "yori-quiet-stargazer", companionId: "yori", name: "靜夜觀星服", detail: "收起儀式感後，在營火旁觀星的便裝。", image: "/game/outfits/yori-quiet-stargazer.webp", source: "夜璃事件《星夜約定》", accent: "#8165c5" },
] as const;

export const GAME_LOADOUT_STYLES = [
  { id: "vanguard", mark: "刃", name: "赤曜連擊", detail: "旅刃式與連擊追擊；適合凜夏、守門者之刃與赤曜連鎖扣。", keyItems: ["guardian-edge", "scarlet-chain"] as const },
  { id: "survey", mark: "測", name: "測繪支援", detail: "守勢／燈火式也保有戰鬥輸出；適合澄音與蒼穹測繪杖。", keyItems: ["surveyors-staff", "clear-lantern"] as const },
  { id: "resonance", mark: "星", name: "星環爆發", detail: "更快累積並施放旅伴爆發；適合夜璃、靜夜星環核與共鳴火種。", keyItems: ["starloop-core", "resonance-earring"] as const },
] as const;

export const EXPEDITION_BOONS: ReadonlyArray<{
  id: ExpeditionBoonId;
  mark: string;
  name: string;
  style: string;
  detail: string;
  risk?: string;
}> = [
  { id: "hunter-oath", mark: "獵", name: "獵風誓約", style: "克制追擊", detail: "正確克制敵方意圖時，再追加 10 點傷害。" },
  { id: "aegis-oath", mark: "壁", name: "守門誓約", style: "一次護盾", detail: "每場第一次真正受到意志傷害時，再減少 1 點。" },
  { id: "resonant-spark", mark: "鳴", name: "共鳴火種", style: "旅伴爆發", detail: "帶著 2 點能量開戰，旅伴爆發只需要 3 點能量。" },
  { id: "bounty-seal", mark: "賞", name: "懸賞印記", style: "高風險高報酬", detail: "敵人最大 HP +24；勝利金幣 +35%。", risk: "敵人更耐打" },
] as const;

export type GameQuestReward =
  | { kind: "gold"; amount: number }
  | { kind: "item"; amount: number; itemId: GameItemId };

export const GAME_QUESTS: ReadonlyArray<{
  id: GameQuestId;
  mark: string;
  title: string;
  detail: string;
  target: number;
  reward: GameQuestReward;
}> = [
  { id: "finish-run", mark: "行", title: "完成一場遠征", detail: "勝敗都算；學習紀錄有留下就算完成。", target: 1, reward: { kind: "gold", amount: 24 } },
  { id: "land-four", mark: "擊", title: "累計正解 4 題", detail: "可以跨場累積，使用提示也不會讓委託失效。", target: 4, reward: { kind: "item", itemId: "trail-ration", amount: 1 } },
  { id: "read-intent", mark: "策", title: "克制意圖 3 次", detail: "看清敵方意圖，再用對應架勢答對。", target: 3, reward: { kind: "item", itemId: "guard-charm", amount: 1 } },
  { id: "win-run", mark: "勝", title: "取得一場勝利", detail: "普通遠征或區域 Boss 勝利都算。", target: 1, reward: { kind: "gold", amount: 40 } },
  { id: "clean-win", mark: "淨", title: "無內容提示勝利", detail: "可以用防禦或補血道具，但不能看答案提示。", target: 1, reward: { kind: "item", itemId: "echo-stone", amount: 1 } },
  { id: "burst-once", mark: "鳴", title: "發動一次旅伴爆發", detail: "先累積共鳴能量，再自行決定出手回合。", target: 1, reward: { kind: "item", itemId: "hint-lantern", amount: 1 } },
] as const;

export const GAME_MEMORIES: ReadonlyArray<{
  id: GameMemoryId;
  companionId: CompanionId;
  title: string;
  subtitle: string;
  image: string;
  source: string;
  eventLine: string;
}> = [
  {
    id: "rinka-rainy-night",
    companionId: "rinka",
    title: "雨夜同行",
    subtitle: "凜夏 · 旅途回憶 01",
    image: "/game/cg/rinka-rainy-night.webp",
    source: "第一次真正打贏遠征後解鎖",
    eventLine: "雨聲把營火壓得很低，凜夏卻沒有催你趕路。她只是把熱飲推過來，陪你把今天答錯的地方看完。",
  },
  {
    id: "sena-starlight-calibration",
    companionId: "sena",
    title: "星圖校準",
    subtitle: "澄音 · 羈絆事件 01",
    image: "/game/cg/sena-starlight-calibration.webp",
    source: "澄音好感 25，並由她完成一場至少 3 次意圖克制的勝利",
    eventLine: "她第一次沒有把同行寫成數據。星圖上的兩個座標被她用同一條藍線連起來，像早就預留好的路。",
  },
  {
    id: "yori-starlit-promise",
    companionId: "yori",
    title: "星夜約定",
    subtitle: "夜璃 · 羈絆事件 01",
    image: "/game/cg/yori-starlit-promise.webp",
    source: "夜璃好感 25，並由她在勝利場次中發動一次旅伴爆發",
    eventLine: "這次她沒有先問星環。她看著遠方的光，直接把下一段旅程說成『我們』。",
  },
] as const;

export const STARTER_ITEM_COUNTS: Readonly<Record<GameItemId, number>> = {
  "erase-rune": 2,
  "hint-lantern": 2,
  "guard-charm": 1,
  "trail-ration": 1,
  "echo-stone": 1,
};

export const STARTER_EQUIPMENT: readonly GameEquipmentId[] = ["wayfarer-blade", "clear-lantern"];
export const STARTER_OUTFITS: Readonly<Record<CompanionId, GameOutfitId>> = {
  rinka: "rinka-vanguard",
  sena: "sena-surveyor",
  yori: "yori-observer",
};

export function getGameItem(id: string) {
  return GAME_ITEMS.find((item) => item.id === id);
}

export function getGameEquipment(id: string) {
  return GAME_EQUIPMENT.find((item) => item.id === id);
}

export function getGameOutfit(id: string) {
  return GAME_OUTFITS.find((outfit) => outfit.id === id);
}

export function getExpeditionBoon(id: string) {
  return EXPEDITION_BOONS.find((boon) => boon.id === id);
}

export function getGameQuest(id: string) {
  return GAME_QUESTS.find((quest) => quest.id === id);
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function expeditionBoonOptions(seed: string, count = 3): ExpeditionBoonId[] {
  const start = hashSeed(seed) % EXPEDITION_BOONS.length;
  return Array.from({ length: Math.min(Math.max(1, count), EXPEDITION_BOONS.length) }, (_, index) => (
    EXPEDITION_BOONS[(start + index) % EXPEDITION_BOONS.length].id
  ));
}

export function dailyGameQuestIds(localDate: string, count = 3): GameQuestId[] {
  const pools: readonly (readonly GameQuestId[])[] = [
    ["finish-run", "land-four"],
    ["read-intent", "burst-once"],
    ["win-run", "clean-win"],
  ];
  const selected = pools.map((pool, index) => pool[hashSeed(`${localDate}:${index}`) % pool.length]);
  return selected.slice(0, Math.min(Math.max(1, count), selected.length));
}

export function gameQuestProgressDelta(questId: GameQuestId, input: {
  outcome: "victory" | "defeat";
  correctCount: number;
  counterCount: number;
  contentAssistCount: number;
  burstCount: number;
}) {
  if (questId === "finish-run") return 1;
  if (questId === "land-four") return input.correctCount;
  if (questId === "read-intent") return input.counterCount;
  if (questId === "win-run") return input.outcome === "victory" ? 1 : 0;
  if (questId === "clean-win") return input.outcome === "victory" && input.contentAssistCount === 0 ? 1 : 0;
  return input.burstCount;
}

export function gameQuestRewardLabel(reward: GameQuestReward) {
  if (reward.kind === "gold") return `${reward.amount} G`;
  return `${getGameItem(reward.itemId)?.name ?? "道具"} ×${reward.amount}`;
}

export function expeditionEnemyMaxHp(baseHp: number, boonId?: ExpeditionBoonId | null) {
  return baseHp + (boonId === "bounty-seal" ? 24 : 0);
}

export function expeditionStartingEnergy(boonId?: ExpeditionBoonId | null) {
  return boonId === "resonant-spark" ? 2 : 0;
}

export function expeditionBurstCost(boonId?: ExpeditionBoonId | null) {
  return boonId === "resonant-spark" ? 3 : 4;
}

export function battleBurstCost(boonId: ExpeditionBoonId | null | undefined, equipped: readonly string[], companionId: CompanionId) {
  const equipmentReduction = companionId === "yori" && equipped.includes("starloop-core") ? 1 : 0;
  return Math.max(2, expeditionBurstCost(boonId) - equipmentReduction);
}

export function expeditionBoonDamageBonus(boonId: ExpeditionBoonId | null | undefined, correct: boolean, countered: boolean) {
  return boonId === "hunter-oath" && correct && countered ? 10 : 0;
}

export function expeditionGoldMultiplier(boonId?: ExpeditionBoonId | null) {
  return boonId === "bounty-seal" ? 1.35 : 1;
}

export function battleStartingEnergy(equipped: readonly string[]) {
  return equipped.includes("resonance-earring") ? 1 : 0;
}

export function battleEquipmentDamageBonus(
  equipped: readonly string[],
  stanceId: BattleStanceId,
  correct: boolean,
  countered = false,
  chain = 0,
  companionId: CompanionId = "rinka",
) {
  if (!correct) return 0;
  const bladeWeaponBonus = stanceId === "blade"
    ? equipped.includes("guardian-edge") ? 10 : equipped.includes("wayfarer-blade") ? 6 : 0
    : 0;
  const surveyorBonus = companionId === "sena"
    && equipped.includes("surveyors-staff")
    && (stanceId === "ward" || stanceId === "lantern") ? 8 : 0;
  const scarletChainBonus = companionId === "rinka"
    && equipped.includes("scarlet-chain")
    && stanceId === "blade"
    && chain >= 2 ? 8 : 0;
  const compassBonus = countered && equipped.includes("tactician-compass") ? 5 : 0;
  return bladeWeaponBonus + surveyorBonus + scarletChainBonus + compassBonus;
}

export function battleGrade(input: {
  outcome: "victory" | "defeat";
  correctCount: number;
  turnCount: number;
  requiredTurnCount?: number;
  contentAssistCount: number;
  remainingWillpower: number;
  onlyBlade: boolean;
  itemUseCount?: number;
}): BattleGrade {
  if (input.outcome !== "victory") return "B";
  const safeTurns = Math.max(1, input.turnCount);
  const requiredTurns = Math.max(1, input.requiredTurnCount ?? safeTurns);
  if (
    safeTurns === requiredTurns
    && input.correctCount === safeTurns
    && input.contentAssistCount === 0
    && input.remainingWillpower === MAX_WILLPOWER
    && input.onlyBlade
    && (input.itemUseCount ?? 0) === 0
  ) return "S";
  if (input.correctCount / safeTurns >= 0.8 && input.remainingWillpower >= 2) return "A";
  return "B";
}

export function resolveVerifiedBattle(input: {
  mode: "expedition" | "boss";
  encounterId: string;
  enemyBaseHp: number;
  boonId: ExpeditionBoonId;
  equipped: readonly string[];
  turns: readonly VerifiedBattleTurn[];
  expeditionTurnLimit?: number;
  bossTurnLimit?: number;
  bossCoreTarget?: number;
}): VerifiedBattleResolution {
  const expeditionTurnLimit = input.expeditionTurnLimit ?? 6;
  const bossTurnLimit = input.bossTurnLimit ?? 10;
  const bossCoreTarget = input.bossCoreTarget ?? 7;
  const turnLimit = input.mode === "boss" ? bossTurnLimit : expeditionTurnLimit;
  const invalid = (reason: string): VerifiedBattleResolution => ({
    valid: false,
    reason,
    outcome: "active",
    correctCount: 0,
    contentAssistCount: 0,
    itemUseCount: input.turns.reduce((sum, turn) => sum + turn.itemIds.length, 0),
    counterCount: 0,
    burstCount: 0,
    remainingWillpower: MAX_WILLPOWER,
    onlyBlade: false,
    totalDamage: 0,
    coreHits: 0,
  });

  if (input.turns.length < 1 || input.turns.length > turnLimit) return invalid("戰鬥回合數不正確。");

  let willpower = MAX_WILLPOWER;
  let energy = Math.min(6, expeditionStartingEnergy(input.boonId) + battleStartingEnergy(input.equipped));
  let chain = 0;
  let totalDamage = 0;
  let counterCount = 0;
  let burstCount = 0;
  let itemUseCount = 0;
  let boonGuardSpent = false;
  let equipmentCharmSpent = false;
  let guardActive = false;

  for (let index = 0; index < input.turns.length; index += 1) {
    const turn = input.turns[index];
    if (!turn.questionId || !["blade", "ward", "lantern"].includes(turn.stanceId)) return invalid("戰鬥行動資料不完整。");
    for (const itemId of turn.itemIds) {
      itemUseCount += 1;
      if (itemId === "trail-ration") willpower = Math.min(MAX_WILLPOWER, willpower + 1);
      if (itemId === "guard-charm") guardActive = true;
    }

    chain = turn.correct ? chain + 1 : 0;
    const intent = battleIntentFor(input.encounterId, index);
    const countered = turn.stanceId === intent.counter;
    if (turn.correct && countered) counterCount += 1;
    const baseDamage = battleTurnDamage(turn.stanceId, turn.correct, chain);
    const supportBonus = turn.correct ? companionBattleBonus(turn.companionId, turn.correct, chain) : 0;
    const equipmentBonus = battleEquipmentDamageBonus(input.equipped, turn.stanceId, turn.correct, countered, chain, turn.companionId);
    const counterBonus = turn.correct && countered ? intent.counterBonus : 0;
    const boonDamage = expeditionBoonDamageBonus(input.boonId, turn.correct, countered);
    const event = battleEventFor(input.encounterId, index, input.mode);
    const eventEffect = resolveBattleEventEffect(event, {
      correct: turn.correct,
      stanceId: turn.stanceId,
      correctChain: chain,
      countered,
      strictEvidenceEligible: turn.strictEvidenceEligible,
    });
    let burstBonus = 0;
    if (turn.burstRequested) {
      const cost = battleBurstCost(input.boonId, input.equipped, turn.companionId);
      if (!turn.correct || energy < cost) return invalid("旅伴爆發能量與實際回合不一致。");
      energy -= cost;
      burstCount += 1;
      burstBonus = 18 + Math.floor(Math.max(0, Math.min(100, turn.companionAffinity)) / 25);
    }
    totalDamage += turn.correct ? baseDamage + supportBonus + equipmentBonus + counterBonus + boonDamage + burstBonus + eventEffect.damageBonus : 0;

    let willpowerDamage = turn.correct ? 0 : intent.wrongDamage + eventEffect.wrongDamageBonus;
    if (!turn.correct && turn.stanceId === "ward") willpowerDamage = Math.max(0, willpowerDamage - 1);
    if (!turn.correct) willpowerDamage = Math.max(0, willpowerDamage - companionWrongDamageReduction(turn.companionId));
    if (!turn.correct && willpowerDamage > 0 && input.boonId === "aegis-oath" && !boonGuardSpent) {
      willpowerDamage = Math.max(0, willpowerDamage - 1);
      boonGuardSpent = true;
    }
    if (!turn.correct && willpowerDamage > 0 && guardActive) {
      willpowerDamage = 0;
      guardActive = false;
    } else if (!turn.correct && willpowerDamage > 0 && input.equipped.includes("clear-lantern") && !equipmentCharmSpent) {
      willpowerDamage = Math.max(0, willpowerDamage - 1);
      equipmentCharmSpent = true;
    }
    willpower = Math.max(0, willpower - willpowerDamage);
    const energyGain = Math.min(3, (turn.correct ? 2 : 1) + (countered ? 1 : 0));
    energy = Math.max(0, Math.min(6, energy + energyGain));
    if (willpower <= 0 && index < input.turns.length - 1) return invalid("意志歸零後仍出現額外回合。");
  }

  const correctCount = input.turns.filter((turn) => turn.correct).length;
  const contentAssistCount = input.turns.filter((turn) => !turn.strictEvidenceEligible).length;
  const onlyBlade = input.turns.every((turn) => turn.stanceId === "blade");
  const coreHits = input.turns.filter((turn) => turn.bossCoreHit).length;
  const enemyHp = expeditionEnemyMaxHp(input.enemyBaseHp, input.boonId);
  const completedAllTurns = input.turns.length === turnLimit;
  const outcome = input.mode === "boss"
    ? completedAllTurns && coreHits >= bossCoreTarget && willpower > 0
      ? "victory"
      : willpower <= 0 || completedAllTurns
        ? "defeat"
        : "active"
    : completedAllTurns && totalDamage >= enemyHp && willpower > 0
      ? "victory"
      : willpower <= 0 || completedAllTurns
        ? "defeat"
        : "active";

  return {
    valid: outcome !== "active",
    ...(outcome === "active" ? { reason: "這場戰鬥尚未達到可結算條件。" } : {}),
    outcome,
    correctCount,
    contentAssistCount,
    itemUseCount,
    counterCount,
    burstCount,
    remainingWillpower: willpower,
    onlyBlade,
    totalDamage,
    coreHits,
  };
}
