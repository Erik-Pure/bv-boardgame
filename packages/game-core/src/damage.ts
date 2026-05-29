import type { GameState, Player } from "./types.js";
import {
  accessoryDamageNegateExcludingBeerCanSet,
  armorDamageNegateExcludingBeerCanSet,
  BEER_CAN_RUSTNING_NAME,
  beerCanTrioDamageNegate,
  helmetDamageNegateExcludingBeerCanSet,
} from "./beerCanEquipment.js";
import { playerMaxHpFromBase } from "./playerMaxHp.js";
import { recordHpLost } from "./sessionStats.js";

/** Summa sköld/skadersläckning från utrustning (kan vara negativ — ökar då tagen skada). */
export function equipmentDamageNegate(p: Player): number {
  const armorBossExtra = p.equipment.armor?.bossDamageNegateBonus ?? 0;
  const helmetBossExtra = p.equipment.helmet?.bossDamageNegateBonus ?? 0;
  return (
    armorDamageNegateExcludingBeerCanSet(p) +
    helmetDamageNegateExcludingBeerCanSet(p) +
    accessoryDamageNegateExcludingBeerCanSet(p) +
    beerCanTrioDamageNegate(p) +
    armorBossExtra +
    helmetBossExtra +
    (p.brewerShieldBonus ?? 0)
  );
}

function equipmentDamageNegateForHit(p: Player, isBossHit: boolean): number {
  const armorBossExtra = p.equipment.armor?.bossDamageNegateBonus ?? 0;
  const helmetBossExtra = p.equipment.helmet?.bossDamageNegateBonus ?? 0;
  return isBossHit
    ? equipmentDamageNegate(p)
    : equipmentDamageNegate(p) - armorBossExtra - helmetBossExtra;
}

export function hasNegateAllOnce(p: Player): boolean {
  return !!p.equipment.armor?.negateAllOnce || !!p.equipment.helmet?.negateAllOnce;
}

export function consumeNegateAllOnce(state: GameState, p: Player, log?: (s: GameState, msg: string) => void): void {
  if (p.equipment.armor?.negateAllOnce) {
    const name = p.equipment.armor.name;
    p.equipment.armor = undefined;
    p.maxHp = playerMaxHpFromBase(state.config.maxHp, p);
    if (p.hp > p.maxHp) p.hp = p.maxHp;
    log?.(state, `${p.name}'s ${name} shatters!`);
    return;
  }
  if (p.equipment.helmet?.negateAllOnce) {
    const name = p.equipment.helmet.name;
    p.equipment.helmet = undefined;
    log?.(state, `${p.name}'s ${name} shatters!`);
  }
}

/** HP efter skada utan att mutera spelare (samma logik som {@link applyDamage}, utan guld-/rustningssidoeffekter). */
export function previewHpAfterFlatDamage(params: {
  player: Player;
  amount: number;
  isBossHit?: boolean;
}): { hpAfter: number; blockedByNegateAllOnce: boolean } {
  const { player: p, amount, isBossHit } = params;
  const dmg = Math.max(0, Math.floor(amount));
  if (dmg <= 0) return { hpAfter: p.hp, blockedByNegateAllOnce: false };

  if (hasNegateAllOnce(p)) {
    return { hpAfter: p.hp, blockedByNegateAllOnce: true };
  }

  const prevent = equipmentDamageNegateForHit(p, isBossHit === true);
  const final = Math.max(0, dmg - prevent);
  return { hpAfter: Math.max(0, p.hp - final), blockedByNegateAllOnce: false };
}

export function applyDamage(params: {
  state: GameState;
  player: Player;
  amount: number;
  isBossHit?: boolean;
  source?: string;
  log?: (s: GameState, msg: string) => void;
}): { applied: number; prevented: number } {
  const { state, player: p, amount } = params;
  const dmg = Math.max(0, Math.floor(amount));
  if (dmg <= 0) return { applied: 0, prevented: 0 };

  if (hasNegateAllOnce(p)) {
    consumeNegateAllOnce(state, p, params.log);
    return { applied: 0, prevented: dmg };
  }

  const prevent = equipmentDamageNegateForHit(p, params.isBossHit === true);
  const final = Math.max(0, dmg - prevent);

  const before = p.hp;
  p.hp = Math.max(0, p.hp - final);
  const applied = before - p.hp;
  if (applied > 0) {
    recordHpLost(state, p.id, applied);
    p.gold += p.equipment.armor?.gainGoldOnDamageTaken ?? 0;
    if (p.equipment.armor?.name === BEER_CAN_RUSTNING_NAME && p.gold > 0) {
      p.gold = Math.max(0, p.gold - 1);
      p.maxHp = playerMaxHpFromBase(state.config.maxHp, p);
      if (p.hp > p.maxHp) p.hp = p.maxHp;
    }
  }
  return { applied, prevented: dmg - final };
}

export function moveBonusSteps(p: Player): number {
  return Math.max(0, p.equipment.accessory?.moveBonus ?? 0);
}

