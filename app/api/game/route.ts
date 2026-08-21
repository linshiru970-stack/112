import { getChatGPTUser } from "../../chatgpt-auth";
import { getGameDatabase, seedGameProfile } from "../../game-store";
import {
  BOSS_CORE_TARGET,
  BOSS_ENCOUNTERS,
  BOSS_TURN_LIMIT,
  REGION_ENCOUNTERS,
  type BattleStanceId,
} from "../../adventure";
import { COMPANIONS, type CompanionId } from "../../companions";
import {
  battleGrade,
  dailyGameQuestIds,
  expeditionBoonOptions,
  expeditionGoldMultiplier,
  gameQuestProgressDelta,
  getExpeditionBoon,
  getGameEquipment,
  getGameItem,
  getGameOutfit,
  getGameQuest,
  resolveVerifiedBattle,
  type BattleGrade,
  type GameEquipmentId,
  type GameItemId,
  type GameOutfitId,
  type GameQuestId,
  type VerifiedBattleTurn,
} from "../../game-system";

type D1Row = Record<string, unknown>;

async function currentUserKey() {
  const user = await getChatGPTUser();
  return user?.email || "demo-local";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "冒險背包同步失敗。";
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function safeInt(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function isOpaqueId(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 8
    && value.length <= 120
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

function parseJsonRecord(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function parseBattleHits(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => entry && typeof entry === "object" ? entry as Record<string, unknown> : {});
}

function todayInTaipei() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

async function snapshot(database: D1Database, userKey: string, localDate = todayInTaipei()) {
  const [profile, inventory, equipment, outfits, unlocks, recent, dailyQuestRows, commissionClaims] = await Promise.all([
    database.prepare("SELECT * FROM game_profiles WHERE user_key = ?1").bind(userKey).first<D1Row>(),
    database.prepare("SELECT item_id, quantity FROM game_inventory WHERE user_key = ?1 ORDER BY item_id").bind(userKey).all<D1Row>(),
    database.prepare("SELECT slot, item_id FROM game_equipment WHERE user_key = ?1 ORDER BY slot").bind(userKey).all<D1Row>(),
    database.prepare("SELECT companion_id, outfit_id FROM game_outfits WHERE user_key = ?1 ORDER BY companion_id").bind(userKey).all<D1Row>(),
    database.prepare("SELECT unlock_id, source, unlocked_at FROM game_unlocks WHERE user_key = ?1 ORDER BY unlocked_at").bind(userKey).all<D1Row>(),
    database.prepare("SELECT battle_id, mode, encounter_id, outcome, grade, gold, reward_json, created_at FROM game_battle_results WHERE user_key = ?1 ORDER BY created_at DESC LIMIT 6").bind(userKey).all<D1Row>(),
    database.prepare("SELECT quest_id, progress, claimed FROM game_daily_quests WHERE user_key = ?1 AND local_date = ?2").bind(userKey, localDate).all<D1Row>(),
    database.prepare("SELECT COUNT(*) AS count FROM game_daily_quests WHERE user_key = ?1 AND claimed = 1").bind(userKey).first<{ count: number }>(),
  ]);
  const dailyQuestState = new Map((dailyQuestRows.results ?? []).map((row) => [String(row.quest_id ?? ""), row]));
  return {
    profile: {
      coins: Number(profile?.coins ?? 0),
      masteryMarks: Number(profile?.mastery_marks ?? 0),
      wins: Number(profile?.wins ?? 0),
      losses: Number(profile?.losses ?? 0),
      commissionClaims: Number(commissionClaims?.count ?? 0),
    },
    inventory: (inventory.results ?? []).map((row) => ({ itemId: String(row.item_id ?? ""), quantity: Number(row.quantity ?? 0) })),
    equipment: (equipment.results ?? []).map((row) => ({ slot: String(row.slot ?? ""), itemId: String(row.item_id ?? "") })),
    outfits: (outfits.results ?? []).map((row) => ({ companionId: String(row.companion_id ?? ""), outfitId: String(row.outfit_id ?? "") })),
    unlocks: (unlocks.results ?? []).map((row) => ({ unlockId: String(row.unlock_id ?? ""), source: String(row.source ?? ""), unlockedAt: String(row.unlocked_at ?? "") })),
    recentBattles: (recent.results ?? []).map((row) => ({ ...row, gold: Number(row.gold ?? 0) })),
    dailyQuests: dailyGameQuestIds(localDate).map((questId) => {
      const quest = getGameQuest(questId)!;
      const row = dailyQuestState.get(questId);
      return {
        ...quest,
        progress: Math.min(quest.target, Number(row?.progress ?? 0)),
        claimed: Number(row?.claimed ?? 0) === 1,
      };
    }),
    questDate: localDate,
  };
}

async function consumeItem(database: D1Database, userKey: string, itemId: GameItemId, payload: Record<string, unknown>) {
  const battleId = payload.battleId;
  const useId = payload.useId;
  const turnIndex = safeInt(payload.turnIndex, 0, BOSS_TURN_LIMIT - 1);
  if (!isOpaqueId(battleId) || !isOpaqueId(useId)) throw new Error("這次道具使用沒有連到有效戰鬥。");
  const existingUse = await database.prepare("SELECT item_id FROM game_battle_item_uses WHERE user_key = ?1 AND use_id = ?2")
    .bind(userKey, useId).first<{ item_id: string }>();
  if (existingUse) {
    if (existingUse.item_id !== itemId) throw new Error("這次道具請求已被其他物品使用。");
    return;
  }
  const now = new Date().toISOString();
  const results = await database.batch([
    database.prepare(`INSERT INTO game_battle_item_uses (user_key, battle_id, use_id, item_id, turn_index, created_at)
      SELECT ?1, ?2, ?3, ?4, ?5, ?6
      WHERE EXISTS (SELECT 1 FROM game_inventory WHERE user_key = ?1 AND item_id = ?4 AND quantity > 0)
        AND NOT EXISTS (SELECT 1 FROM game_battle_results WHERE user_key = ?1 AND battle_id = ?2)`)
      .bind(userKey, battleId, useId, itemId, turnIndex, now),
    database.prepare(`UPDATE game_inventory SET quantity = quantity - 1, updated_at = ?1
      WHERE user_key = ?2 AND item_id = ?3 AND quantity > 0
        AND EXISTS (SELECT 1 FROM game_battle_item_uses WHERE user_key = ?2 AND use_id = ?4)`)
      .bind(now, userKey, itemId, useId),
  ]);
  if (Number(results[0]?.meta?.changes ?? 0) !== 1 || Number(results[1]?.meta?.changes ?? 0) !== 1) {
    throw new Error("這個道具已經用完，或這場戰鬥已經結算。");
  }
}

async function buyItem(database: D1Database, userKey: string, itemId: GameItemId) {
  const item = getGameItem(itemId);
  if (!item) throw new Error("找不到這個補給品。");
  const profile = await database.prepare("SELECT coins FROM game_profiles WHERE user_key = ?1").bind(userKey).first<{ coins: number }>();
  if (Number(profile?.coins ?? 0) < item.price) throw new Error("金幣不夠買這個補給品。");
  const now = new Date().toISOString();
  await database.batch([
    database.prepare("UPDATE game_profiles SET coins = coins - ?1, updated_at = ?2 WHERE user_key = ?3").bind(item.price, now, userKey),
    database.prepare(`INSERT INTO game_inventory (user_key, item_id, quantity, updated_at) VALUES (?1, ?2, 1, ?3)
      ON CONFLICT(user_key, item_id) DO UPDATE SET quantity = quantity + 1, updated_at = excluded.updated_at`).bind(userKey, item.id, now),
  ]);
}

async function equipItem(database: D1Database, userKey: string, equipmentId: GameEquipmentId) {
  const equipment = getGameEquipment(equipmentId);
  if (!equipment) throw new Error("找不到這件裝備。");
  const owned = await database.prepare("SELECT unlock_id FROM game_unlocks WHERE user_key = ?1 AND unlock_id = ?2")
    .bind(userKey, `equipment:${equipment.id}`).first<{ unlock_id: string }>();
  if (!owned) throw new Error("這件裝備還沒有解鎖。");
  await database.prepare(`INSERT INTO game_equipment (user_key, slot, item_id, updated_at) VALUES (?1, ?2, ?3, ?4)
    ON CONFLICT(user_key, slot) DO UPDATE SET item_id = excluded.item_id, updated_at = excluded.updated_at`)
    .bind(userKey, equipment.slot, equipment.id, new Date().toISOString()).run();
}

async function equipOutfit(database: D1Database, userKey: string, outfitId: GameOutfitId) {
  const outfit = getGameOutfit(outfitId);
  if (!outfit) throw new Error("找不到這套衣裝。");
  const owned = await database.prepare("SELECT unlock_id FROM game_unlocks WHERE user_key = ?1 AND unlock_id = ?2")
    .bind(userKey, `outfit:${outfit.id}`).first<{ unlock_id: string }>();
  if (!owned) throw new Error("這套衣裝還沒有解鎖。");
  await database.prepare(`INSERT INTO game_outfits (user_key, companion_id, outfit_id, updated_at) VALUES (?1, ?2, ?3, ?4)
    ON CONFLICT(user_key, companion_id) DO UPDATE SET outfit_id = excluded.outfit_id, updated_at = excluded.updated_at`)
    .bind(userKey, outfit.companionId, outfit.id, new Date().toISOString()).run();
}

async function claimDailyQuest(database: D1Database, userKey: string, localDate: string, questId: GameQuestId) {
  if (!isDate(localDate) || !dailyGameQuestIds(localDate).includes(questId)) throw new Error("這份旅途委託目前不在委託板上。");
  const quest = getGameQuest(questId);
  if (!quest) throw new Error("找不到這份旅途委託。");
  const row = await database.prepare("SELECT progress, claimed FROM game_daily_quests WHERE user_key = ?1 AND local_date = ?2 AND quest_id = ?3")
    .bind(userKey, localDate, questId).first<{ progress: number; claimed: number }>();
  const existingReceipt = await database.prepare("SELECT quest_id FROM game_quest_claim_receipts WHERE user_key = ?1 AND local_date = ?2 AND quest_id = ?3")
    .bind(userKey, localDate, questId).first<{ quest_id: string }>();
  if (existingReceipt) throw new Error("這份委託獎勵已經領過了。");
  if (Number(row?.claimed ?? 0) === 1) throw new Error("這份委託獎勵已經領過了。");
  if (Number(row?.progress ?? 0) < quest.target) throw new Error("這份委託還沒有完成。");

  const previousClaims = await database.prepare("SELECT COUNT(*) AS count FROM game_daily_quests WHERE user_key = ?1 AND claimed = 1")
    .bind(userKey).first<{ count: number }>();
  const claimCountBefore = Number(previousClaims?.count ?? 0);
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    database.prepare("INSERT INTO game_quest_claim_receipts (user_key, local_date, quest_id, claimed_at) VALUES (?1, ?2, ?3, ?4)")
      .bind(userKey, localDate, questId, now),
    database.prepare("UPDATE game_daily_quests SET claimed = 1, updated_at = ?1 WHERE user_key = ?2 AND local_date = ?3 AND quest_id = ?4 AND claimed = 0")
      .bind(now, userKey, localDate, questId),
  ];
  if (quest.reward.kind === "gold") {
    statements.push(database.prepare("UPDATE game_profiles SET coins = coins + ?1, updated_at = ?2 WHERE user_key = ?3")
      .bind(quest.reward.amount, now, userKey));
  } else {
    statements.push(database.prepare(`INSERT INTO game_inventory (user_key, item_id, quantity, updated_at) VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(user_key, item_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = excluded.updated_at`)
      .bind(userKey, quest.reward.itemId, quest.reward.amount, now));
  }

  const newUnlocks: string[] = [];
  if (claimCountBefore === 0) {
    newUnlocks.push("equipment:resonance-earring");
    statements.push(database.prepare("INSERT OR IGNORE INTO game_unlocks (user_key, unlock_id, source, unlocked_at) VALUES (?1, 'equipment:resonance-earring', '第一份旅途委託', ?2)").bind(userKey, now));
  }
  if (claimCountBefore === 2) {
    newUnlocks.push("equipment:tactician-compass");
    statements.push(database.prepare("INSERT OR IGNORE INTO game_unlocks (user_key, unlock_id, source, unlocked_at) VALUES (?1, 'equipment:tactician-compass', '第三份旅途委託', ?2)").bind(userKey, now));
  }
  await database.batch(statements);
  return {
    claimedReward: { questId, reward: quest.reward, newUnlocks },
    ...(await snapshot(database, userKey, localDate)),
  };
}

async function settleBattle(database: D1Database, userKey: string, payload: Record<string, unknown>) {
  const battleId = payload.battleId;
  const encounterId = typeof payload.encounterId === "string" ? payload.encounterId : "";
  const mode = payload.mode === "boss" ? "boss" : "expedition";
  const requestedOutcome = payload.outcome === "victory" ? "victory" : payload.outcome === "defeat" ? "defeat" : "";
  if (!isOpaqueId(battleId) || !encounterId || !requestedOutcome || !isDate(payload.localDate)) throw new Error("這場戰鬥的結算資料不完整。");

  const existing = await database.prepare("SELECT reward_json, grade, gold FROM game_battle_results WHERE user_key = ?1 AND battle_id = ?2")
    .bind(userKey, battleId).first<D1Row>();
  if (existing) {
    return {
      duplicate: true,
      grade: String(existing.grade ?? "B") as BattleGrade,
      reward: JSON.parse(String(existing.reward_json ?? "{}")) as Record<string, unknown>,
      ...(await snapshot(database, userKey, payload.localDate as string)),
    };
  }

  const encounter = mode === "boss"
    ? Object.values(BOSS_ENCOUNTERS).find((entry) => entry.id === encounterId)
    : Object.values(REGION_ENCOUNTERS).find((entry) => entry.id === encounterId);
  if (!encounter) throw new Error("這個遭遇不屬於目前的遠征地圖。");
  const boon = typeof payload.boonId === "string" ? getExpeditionBoon(payload.boonId) : undefined;
  if (!boon) throw new Error("這場戰鬥沒有有效的遠征祝福。");
  const allowBounty = mode !== "boss";
  const allowedBoons = expeditionBoonOptions(`${encounterId}:${payload.localDate}:${battleId}`, allowBounty ? 3 : 4)
    .filter((boonId) => allowBounty || boonId !== "bounty-seal")
    .slice(0, 3);
  if (!allowedBoons.includes(boon.id)) throw new Error("這份遠征祝福不在本場核發選項中。");

  const hitPayloads = parseBattleHits(payload.hits);
  const turnLimit = mode === "boss" ? BOSS_TURN_LIMIT : 6;
  if (hitPayloads.length < 1 || hitPayloads.length > turnLimit) throw new Error("戰鬥回合資料不完整。");
  const receiptIds = hitPayloads.map((hit) => hit.answerReceiptId).filter(isOpaqueId);
  if (receiptIds.length !== hitPayloads.length || new Set(receiptIds).size !== receiptIds.length) throw new Error("作答收據缺漏或重複。");
  const placeholders = receiptIds.map((_, index) => `?${index + 2}`).join(", ");
  const [receiptRows, claimedRows, itemUseRows, equippedRows, companionRows] = await Promise.all([
    database.prepare(`SELECT request_id, question_id, response_json FROM answer_receipts WHERE user_key = ?1 AND request_id IN (${placeholders})`)
      .bind(userKey, ...receiptIds).all<{ request_id: string; question_id: string; response_json: string }>(),
    database.prepare(`SELECT request_id FROM game_battle_receipts WHERE user_key = ?1 AND request_id IN (${placeholders})`)
      .bind(userKey, ...receiptIds).all<{ request_id: string }>(),
    database.prepare("SELECT item_id, turn_index FROM game_battle_item_uses WHERE user_key = ?1 AND battle_id = ?2 ORDER BY turn_index ASC, id ASC")
      .bind(userKey, battleId).all<{ item_id: string; turn_index: number }>(),
    database.prepare("SELECT item_id FROM game_equipment WHERE user_key = ?1").bind(userKey).all<{ item_id: string }>(),
    database.prepare("SELECT companion_id, affinity FROM companion_states WHERE user_key = ?1").bind(userKey).all<{ companion_id: string; affinity: number }>(),
  ]);
  if ((claimedRows.results ?? []).length > 0) throw new Error("這批作答已經用於另一場戰鬥結算。");
  const receiptById = new Map((receiptRows.results ?? []).map((row) => [row.request_id, row]));
  if (receiptById.size !== receiptIds.length) throw new Error("伺服器找不到完整的真實作答收據。");
  const itemIdsByTurn = new Map<number, GameItemId[]>();
  for (const row of itemUseRows.results ?? []) {
    const item = getGameItem(row.item_id);
    const turnIndex = safeInt(row.turn_index, 0, turnLimit - 1);
    if (!item || turnIndex >= hitPayloads.length) throw new Error("道具使用回合與作答紀錄不一致。");
    itemIdsByTurn.set(turnIndex, [...(itemIdsByTurn.get(turnIndex) ?? []), item.id]);
  }
  const companionAffinity = new Map((companionRows.results ?? []).map((row) => [row.companion_id, safeInt(row.affinity, 0, 100)]));
  const verifiedTurns: VerifiedBattleTurn[] = hitPayloads.map((hit, index) => {
    const receiptId = receiptIds[index];
    const receipt = receiptById.get(receiptId)!;
    const evidence = parseJsonRecord(receipt.response_json);
    const questionId = typeof evidence.questionId === "string" ? evidence.questionId : receipt.question_id;
    const stanceId = ["blade", "ward", "lantern"].includes(String(hit.stanceId)) ? hit.stanceId as BattleStanceId : null;
    const companionId = COMPANIONS.some((companion) => companion.id === hit.companionId) ? hit.companionId as CompanionId : null;
    if (!stanceId || !companionId || hit.questionId !== questionId || questionId !== receipt.question_id || evidence.battleId !== battleId || typeof evidence.correct !== "boolean") {
      throw new Error("戰鬥行動與伺服器作答收據不一致。");
    }
    const itemIds = itemIdsByTurn.get(index) ?? [];
    const contentItemUsed = itemIds.some((itemId) => getGameItem(itemId)?.contentAssist);
    return {
      questionId,
      correct: evidence.correct,
      strictEvidenceEligible: evidence.strictEvidenceEligible === true && evidence.supportMode === "blade" && !contentItemUsed,
      bossCoreHit: evidence.bossCoreHit === true,
      stanceId,
      companionId,
      companionAffinity: companionAffinity.get(companionId) ?? 0,
      burstRequested: hit.burst === true,
      itemIds,
    };
  });
  const equippedItems = (equippedRows.results ?? []).map((row) => row.item_id);
  const verified = resolveVerifiedBattle({
    mode,
    encounterId,
    enemyBaseHp: encounter.hp,
    boonId: boon.id,
    equipped: equippedItems,
    turns: verifiedTurns,
    bossTurnLimit: BOSS_TURN_LIMIT,
    bossCoreTarget: BOSS_CORE_TARGET,
  });
  if (!verified.valid || verified.outcome !== requestedOutcome) throw new Error(verified.reason || "瀏覽器戰果與伺服器驗證結果不一致。");
  const outcome = verified.outcome as "victory" | "defeat";
  const turnCount = verifiedTurns.length;
  const correctCount = verified.correctCount;
  const contentAssistCount = verified.contentAssistCount;
  const itemUseCount = verified.itemUseCount;
  const remainingWillpower = verified.remainingWillpower;
  const counterCount = verified.counterCount;
  const burstCount = verified.burstCount;
  const onlyBlade = verified.onlyBlade;
  const grade = battleGrade({ outcome, correctCount, turnCount, requiredTurnCount: turnLimit, contentAssistCount, remainingWillpower, onlyBlade, itemUseCount });
  const equipped = new Set(equippedItems);
  const unlockRows = await database.prepare("SELECT unlock_id FROM game_unlocks WHERE user_key = ?1").bind(userKey).all<{ unlock_id: string }>();
  const alreadyUnlocked = new Set((unlockRows.results ?? []).map((row) => row.unlock_id));
  const newUnlocks: string[] = [];
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = receiptIds.map((requestId) => database
    .prepare("INSERT INTO game_battle_receipts (user_key, request_id, battle_id, claimed_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(userKey, requestId, battleId, now));
  const addUnlock = (unlockId: string, source: string) => {
    if (alreadyUnlocked.has(unlockId)) return;
    alreadyUnlocked.add(unlockId);
    newUnlocks.push(unlockId);
    statements.push(database.prepare("INSERT OR IGNORE INTO game_unlocks (user_key, unlock_id, source, unlocked_at) VALUES (?1, ?2, ?3, ?4)")
      .bind(userKey, unlockId, source, now));
  };

  let gold = 0;
  let itemId: GameItemId | null = null;
  if (outcome === "victory") {
    gold = mode === "boss" ? 120 : 32;
    if (grade === "S") gold += mode === "boss" ? 50 : 18;
    if (grade === "A") gold += mode === "boss" ? 25 : 8;
    if (equipped.has("lone-ring") && contentAssistCount === 0) gold = Math.ceil(gold * 1.25);
    gold = Math.ceil(gold * expeditionGoldMultiplier(boon?.id));
    itemId = grade === "S" ? "echo-stone" : grade === "A" ? "erase-rune" : "trail-ration";
    statements.push(database.prepare(`INSERT INTO game_inventory (user_key, item_id, quantity, updated_at) VALUES (?1, ?2, 1, ?3)
      ON CONFLICT(user_key, item_id) DO UPDATE SET quantity = quantity + 1, updated_at = excluded.updated_at`).bind(userKey, itemId, now));
    addUnlock("equipment:lone-ring", "首次遠征勝利");
    addUnlock("memory:rinka-rainy-night", "首次遠征勝利");
    if (mode === "boss") addUnlock("equipment:guardian-edge", "首次區域 Boss 勝利");

    const singleCompanion = verifiedTurns.every((turn) => turn.companionId === verifiedTurns[0]?.companionId)
      ? verifiedTurns[0]?.companionId
      : null;
    if (singleCompanion === "rinka") {
      addUnlock("outfit:rinka-rain-vanguard", "凜夏事件《雨夜同行》");
      addUnlock("equipment:scarlet-chain", "凜夏事件《雨夜同行》");
    }
    if (singleCompanion === "sena" && Number(companionAffinity.get("sena") ?? 0) >= 25 && counterCount >= 3) {
      addUnlock("memory:sena-starlight-calibration", "澄音好感事件《星圖校準》");
      addUnlock("outfit:sena-night-cartographer", "澄音好感事件《星圖校準》");
      addUnlock("equipment:surveyors-staff", "澄音好感事件《星圖校準》");
    }
    if (singleCompanion === "yori" && Number(companionAffinity.get("yori") ?? 0) >= 25 && burstCount >= 1) {
      addUnlock("memory:yori-starlit-promise", "夜璃好感事件《星夜約定》");
      addUnlock("outfit:yori-quiet-stargazer", "夜璃好感事件《星夜約定》");
      addUnlock("equipment:starloop-core", "夜璃好感事件《星夜約定》");
    }
  }

  const reward = { gold, itemId, newUnlocks, boonId: boon?.id ?? null };
  for (const questId of dailyGameQuestIds(payload.localDate as string)) {
    const quest = getGameQuest(questId)!;
    const delta = gameQuestProgressDelta(questId, { outcome, correctCount, counterCount, contentAssistCount, burstCount });
    if (delta <= 0) continue;
    statements.push(database.prepare(`INSERT INTO game_daily_quests (user_key, local_date, quest_id, progress, claimed, updated_at)
      VALUES (?1, ?2, ?3, ?4, 0, ?5)
      ON CONFLICT(user_key, local_date, quest_id) DO UPDATE SET progress = MIN(?6, game_daily_quests.progress + excluded.progress), updated_at = excluded.updated_at`)
      .bind(userKey, payload.localDate, questId, Math.min(quest.target, delta), now, quest.target));
  }
  statements.push(
    database.prepare(`UPDATE game_profiles SET coins = coins + ?1, mastery_marks = mastery_marks + ?2,
      wins = wins + ?3, losses = losses + ?4, updated_at = ?5 WHERE user_key = ?6`)
      .bind(gold, outcome === "victory" && grade === "S" ? 1 : 0, outcome === "victory" ? 1 : 0, outcome === "defeat" ? 1 : 0, now, userKey),
    database.prepare(`INSERT INTO game_battle_results (user_key, battle_id, mode, encounter_id, outcome, grade, gold, reward_json, local_date, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`)
      .bind(userKey, battleId, mode, encounterId, outcome, grade, gold, JSON.stringify(reward), payload.localDate, now),
  );
  await database.batch(statements);
  return { duplicate: false, grade, reward, ...(await snapshot(database, userKey, payload.localDate as string)) };
}

export async function GET() {
  try {
    const database = await getGameDatabase();
    const userKey = await currentUserKey();
    await seedGameProfile(database, userKey);
    return Response.json({ ...(await snapshot(database, userKey)), synced: userKey !== "demo-local" });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const database = await getGameDatabase();
    const userKey = await currentUserKey();
    await seedGameProfile(database, userKey);
    if (payload.action === "consume") {
      const item = getGameItem(String(payload.itemId ?? ""));
      if (!item) return Response.json({ error: "找不到這個道具。" }, { status: 400 });
      await consumeItem(database, userKey, item.id, payload);
      return Response.json({ used: item.id, ...(await snapshot(database, userKey)) });
    }
    if (payload.action === "buy") {
      const item = getGameItem(String(payload.itemId ?? ""));
      if (!item) return Response.json({ error: "找不到這個補給品。" }, { status: 400 });
      await buyItem(database, userKey, item.id);
      return Response.json({ bought: item.id, ...(await snapshot(database, userKey)) });
    }
    if (payload.action === "equip") {
      const equipment = getGameEquipment(String(payload.equipmentId ?? ""));
      if (!equipment) return Response.json({ error: "找不到這件裝備。" }, { status: 400 });
      await equipItem(database, userKey, equipment.id);
      return Response.json({ equipped: equipment.id, ...(await snapshot(database, userKey)) });
    }
    if (payload.action === "equipOutfit") {
      const outfit = getGameOutfit(String(payload.outfitId ?? ""));
      if (!outfit) return Response.json({ error: "找不到這套衣裝。" }, { status: 400 });
      await equipOutfit(database, userKey, outfit.id);
      return Response.json({ equippedOutfit: outfit.id, ...(await snapshot(database, userKey)) });
    }
    if (payload.action === "claimQuest") {
      const quest = getGameQuest(String(payload.questId ?? ""));
      if (!quest) return Response.json({ error: "找不到這份旅途委託。" }, { status: 400 });
      return Response.json(await claimDailyQuest(database, userKey, String(payload.localDate ?? ""), quest.id));
    }
    if (payload.action === "settleBattle") {
      return Response.json(await settleBattle(database, userKey, payload));
    }
    return Response.json({ error: "未知的冒險背包操作。" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 409 });
  }
}
