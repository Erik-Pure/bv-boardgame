export type { EquipmentShopItem } from "./equipmentDefs.js";
export { EQUIPMENT_CATALOG } from "./equipmentDefs.js";
export { getEquipmentDisplay, getEquipmentDisplayByEquippedName, type EquipmentDisplayText } from "./equipmentLocale.js";
export {
  DEFAULT_LOCALE,
  GAME_LOCALES,
  isGameLocale,
  type GameLocale,
} from "./locale.js";
export { canWord, formatCanAmount } from "./canFormat.js";
export {
  AVATAR_PART_COUNT,
  isValidPlayerAvatar,
  normalizePlayerAvatar,
  randomPlayerAvatar,
} from "./avatar.js";
export type { AvatarPartKind, PlayerAvatar } from "./avatar.js";
export type {
  ApplyResult,
  ClientAction,
  CombatLoseSummary,
  CombatWinSummary,
  DifficultyPreset,
  Equipment,
  EquipmentSlot,
  GameConfig,
  GameMode,
  GameState,
  CombatReactionItemPlay,
  TableItemPlayReveal,
  TableItemPlaySidePayload,
  ItemId,
  ItemInstance,
  LevelBoard,
  LogEntry,
  Pending,
  Player,
  PlayerSessionStats,
  ShopItem,
  SipNoticeEntry,
  SipNoticeKind,
  Tile,
  TileType,
  Weapon,
} from "./types.js";
export type { EndedSpotlight, EndedSpotlightKind, StatBadge, StatBadgeKind } from "./sessionStats.js";
export {
  computeEndedSpotlights,
  computeStatBadges,
  DEFAULT_PLAYER_SESSION_STATS,
  ensurePlayerStats,
  isSabotageItemId,
  recordPantSpent,
} from "./sessionStats.js";
export { CANMAN_DRAWS_INITIAL, createItemInstance } from "./itemInstance.js";
export {
  BOARD_RING_GRID_SIZE,
  findBossTileIndexInLevel,
  generateLevels,
  ringGridSizeFromTileCount,
  ringTileCount,
} from "./board.js";
export { createRng, rollDie, pick } from "./rng.js";
export { CONFIG_NUMERIC, clampConfigNumber, type ConfigNumericKey } from "./configConstraints.js";
export { effectiveMerchantBuyPrice } from "./merchantBuyPrice.js";
export { equipmentDamageNegate, previewHpAfterFlatDamage } from "./damage.js";
export {
  effectiveWeaponPiecePower,
  monsterCombatEquipmentAttackBonus,
  pvpEquipmentDieBonusTotal,
  sipWeaponExtraAttackCosts,
} from "./weaponPower.js";
export { clockwiseTileIndex, counterClockwiseTileIndex } from "./ringMovement.js";
export {
  applyAction,
  brewerLevel,
  brewerKlunkProgressRatio,
  canAscendByKlunkRequirement,
  computeMonsterDamage,
  createEmptyLobby,
  levelUpCostsForTargetLevel,
  lobbyAddPlayer,
  playingAddPlayer,
  normalizeLoadedGameState,
  penaltySipTotalForPlayer,
  PVP_BEST_OF,
  PVP_LOOT_MAX_PANT,
  pvpLootPantStealAmount,
  MERCHANT_REROLL_GOLD_COST,
  rollMerchantItems,
  startGame,
} from "./engine.js";
export {
  MERCHANT_SELLABLE_COMBAT_ITEM_IDS,
  MERCHANT_INVENTORY_ITEM_PRICE,
  MERCHANT_TAPROOM_KEY_PRICE,
  combatItemToMerchantShopItem,
  filterMerchantSellableCombatItems,
  isLastBoardLevel,
  taproomKeyAllowedInMerchant,
  taproomKeyMerchantShopItem,
} from "./merchantCombatItems.js";
export {
  FINAL_BOSS_IDS,
  FINAL_BOSS_LIFE_TOTAL,
  finalBossCardTagline,
  globalMonsterNeedBonus,
  isFinalBossMonsterId,
  maxPlayerBoardLevel,
  maxPlayerBoardLevelIfPlayerReaches,
  monsterNeedBonusForBoardLevel,
  monsterAvailableAtBoardLevel,
  monstersEligibleForRandomEncounter,
  LATE_RANDOM_MONSTER_IDS,
  MONSTERS,
  MONSTER_LOSS_SIP_FLAT,
  monsterLossKlunkTotal,
  type MonsterDef,
  type MonsterId,
} from "./monsters.js";
export {
  getFinalBossTagline,
  getMonsterDisplay,
  getMonsterDisplayBySvName,
  localizeFinalBossDisplayName,
  localizeFinalBossRoundLabel,
  type MonsterDisplayText,
} from "./monsterLocale.js";
export {
  localizeSipNoticeBody,
  localizeSipNoticeFromPlayerName,
  localizeSipNoticeTitle,
} from "./localizeSipNotice.js";
export {
  classifyTableToastMessage,
  isMonsterEncounterSkipToast,
  tableToastIconKinds,
} from "./tableToastClassify.js";
export { localizeTableToastLog } from "./localizeTableToastLog.js";
export {
  localizeRewardDisplayTitle,
  localizeRewardDisplayTitles,
} from "./localizeRewardDisplayTitle.js";
export {
  PLASTBACK_ACCESSORY_NAME,
  PLASTBACK_CATALOG_ID,
  PLASTBACK_FULL_FLASK_COUNT,
  equipTomFlaskaFromPlastback,
  initPlastbackPack,
  plastbackAccessorySellPant,
  plastbackFlasksRemainingCount,
  plastbackPackRemainingCount,
  syncPlastbackEmptyBottleSynergy,
  ensureTomFlaskaWeaponFlags,
  onPlayerEquipmentSlotCleared,
  takePlastbackPackBottle,
  TOM_FLASKA_CATALOG_ID,
  TOM_FLASKA_WEAPON_NAME,
} from "./plastbackSynergy.js";
export {
  BEER_CAN_HELM1_NAME,
  BEER_CAN_RUSTNING_NAME,
  BEER_HELM2_MIN_LEVEL,
  beerCanSetPiecesEquippedCount,
  burkhjälmIIEffectiveDamageNegateFrom,
  helmetAttackBonus,
  isBeerCanShieldName,
  isLegendariskBurkhjälmName,
} from "./beerCanEquipment.js";
export { combatReactionsAllAnswered } from "./combatReactionPhase.js";
export {
  effectiveItemPlayGoldCost,
  itemPlayGoldCost,
  playerHasCombatReactionPlayableItem,
  playerHasFreeInventoryItemPlay,
} from "./combatReactionAutopass.js";
export { combatReactorsFor, playerCanCombatIntervene } from "./combatReactors.js";
export {
  isPositiveHelpItemId,
  playerHasPvpPreRoundItem,
  POSITIVE_HELP_ITEM_IDS,
  PVP_PRE_ROUND_ITEM_IDS,
  PVP_ROLL_PHASE_ITEM_IDS,
} from "./itemRules.js";
export {
  canUseItem,
  pendingAllowsShortcutTaproom,
  playerHasPlayablePositiveHelpItem,
  type ItemUseTarget,
} from "./canUseItem.js";
export {
  BREWER_LEVEL_XP_THRESHOLDS,
  brewerDisplayLevel,
  brewerDisplayLevelFromInternal,
  brewerLevelFromXp,
  xpThresholdForBrewerLevel,
} from "./brewerXp.js";
export {
  ATTACKER_SELF_NEGATIVE_COMBAT_ITEM_IDS,
  attackerCannotSelfNegativeCombatItem,
  lengraddadBlockedForCombatParticipant,
} from "./combatItemRestrictions.js";
export {
  adjustFlatItemValue,
  COMBAT_ITEM_BASE_ATTACK_MODS,
  combatItemAttackModForBoardLevel,
  combatItemAttackModForPlayer,
  equipmentItemCardBonus,
  flatCombatItemAttackDisplayBase,
  flatItemUseAmount,
  FLAT_ITEM_USE_BASE_AMOUNTS,
  normalizeItemCardBonus,
  playerTotalItemCardBonus,
} from "./itemCardBonus.js";
export {
  availableBrewerPerkChoices,
  BREWER_PERK_CHOICES,
  BREWER_PERK_MAX_PER_CATEGORY,
  brewerPerkPickCount,
  isBrewerPerkChoiceAvailable,
} from "./brewerPerk.js";
export type { BrewerPerkChoice } from "./brewerPerk.js";
export { scaledCombatMod } from "./scaledCombatMod.js";
export { XP_PER_KLUNK, PENALTY_XP_PER_KLUNK, grantKlunkWithXp } from "./klunkGrant.js";
export { playerPant, canAffordPant } from "./playerPant.js";
export {
  isGameState,
  mergeGameStateDelta,
  type GameStateDeltaPatch,
} from "./stateDelta.js";
export {
  errorIfInactiveOtherPlayerTarget,
  isPlayerActiveInMatch,
  isPlayerOnBoard,
} from "./playerParticipation.js";
export {
  EMOTE_COOLDOWN_MS,
  EMOTE_DISPLAY_MS,
  EMOTE_ICON_SRC,
  EMOTE_IDS,
  emoteBurstRotationDeg,
  isEmoteId,
  latestEmoteBurstForPlayer,
  prunePlayerEmoteBursts,
} from "./emotes.js";
export { resolveIdleEmoteKind, type IdleEmoteKind } from "./idleEmoteKind.js";
export type { EmoteId, PlayerEmoteBurst, PlayerKlunkBurst } from "./types.js";
export {
  KLUNK_BURST_DISPLAY_MS,
  KLUNK_BURST_ICON_SRC,
  klunkBurstRotationDeg,
  latestKlunkBurstForPlayer,
  prunePlayerKlunkBursts,
  recordPlayerKlunkBurst,
} from "./klunkBursts.js";
export { klunkBurstCountForSipNotice } from "./sipNotice.js";
export {
  appendTextForGrantedItem,
  artKeyForGrantedItem,
  artKeyFromDuFickAppend,
} from "./cards/grantedItemText.js";
export { allCards, getCard, getCardDefById, getCardTitleBySvTitle, itemDisplayTitle } from "./cards/db.js";
export type { CardDef, CardChoice, CardKind, CardRollOutcomeRow, Effect } from "./cards/types.js";
export {
  parseCardRichText,
  parseCardRichTextLine,
  shouldShowCardRollOutcomeTable,
  type CardRichIconKind,
  type CardRichLine,
  type CardRichSegment,
} from "./cardRichTextParse.js";
export { monsterEncounterCardPreviewFromState } from "./cards/runtime.js";
export { SHORTCUT_TELEPORT_GOLD_COST, shortcutDisplayPantGold } from "./shortcutDisplayCost.js";
export type {
  EventTableOutcome,
  EventTableToastSpec,
  TableToastCategory,
  TableToastIcon,
} from "./eventTableOutcomes.js";
export {
  diffPlayerStatsToOutcomes,
  formatEventTableOutcomeToToast,
  parseStatDeltaLinesToOutcomes,
  resolveEventCardTableToasts,
  snapshotPlayerStats,
} from "./eventTableOutcomes.js";
export {
  formatLogEntry,
  finalBossRoundsWordEn,
  finalBossRoundsWordSv,
  LOG_MESSAGE_KEYS,
  pushLogEntry,
  type LogMessageKey,
} from "./logMessages.js";
export { formatSelfStatDeltas, formatTargetStatDeltas } from "./statDeltaText.js";
export {
  localizeEventCardPendingText,
  localizeEventCardTitle,
  parseRolledDieFromCardText,
  type LocalizeEventCardTextOptions,
} from "./localizeEventCardText.js";
export {
  localizeMonsterCombatCardText,
  localizeMonsterCombatCardTitle,
  localizeMonsterCombatChoiceLabel,
  monsterIdFromCardId,
} from "./localizeMonsterCardChoices.js";
