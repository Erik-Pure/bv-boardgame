export type { EquipmentShopItem } from "./equipmentDefs.js";
export { EQUIPMENT_CATALOG } from "./equipmentDefs.js";
export type {
  ApplyResult,
  ClientAction,
  CombatLoseSummary,
  CombatWinSummary,
  Equipment,
  EquipmentSlot,
  GameConfig,
  GameMode,
  GameState,
  CombatReactionItemPlay,
  TableItemPlayReveal,
  TableItemPlaySidePayload,
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
  generateLevels,
  ringGridSizeFromTileCount,
  ringTileCount,
} from "./board.js";
export { createRng, rollDie, pick } from "./rng.js";
export { CONFIG_NUMERIC, clampConfigNumber, type ConfigNumericKey } from "./configConstraints.js";
export { previewHpAfterFlatDamage } from "./damage.js";
export {
  effectiveWeaponPiecePower,
  monsterCombatEquipmentAttackBonus,
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
  penaltySipTotalForPlayer,
  startGame,
} from "./engine.js";
export {
  FINAL_BOSS_IDS,
  FINAL_BOSS_LIFE_TOTAL,
  finalBossCardTagline,
  globalMonsterNeedBonus,
  isFinalBossMonsterId,
  maxPlayerBoardLevel,
  maxPlayerBoardLevelIfPlayerReaches,
  monsterNeedBonusForBoardLevel,
  MONSTERS,
  MONSTER_LOSS_SIP_FLAT,
  monsterLossKlunkTotal,
  type MonsterDef,
  type MonsterId,
} from "./monsters.js";
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
export { combatReactorsFor, playerCanCombatIntervene } from "./combatReactors.js";
export {
  appendTextForGrantedItem,
  artKeyForGrantedItem,
  artKeyFromDuFickAppend,
} from "./cards/grantedItemText.js";
export { allCards, getCard, itemDisplayTitle } from "./cards/db.js";
export type { CardDef, CardChoice, CardKind, Effect } from "./cards/types.js";
export { monsterEncounterCardPreviewFromState } from "./cards/runtime.js";
