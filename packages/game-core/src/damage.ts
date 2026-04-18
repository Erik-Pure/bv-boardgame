import type { GameState, Player } from "./types.js";
import {
  accessoryDamageNegateExcludingBeerCanSet,
  armorDamageNegateExcludingBeerCanSet,
  beerCanTrioDamageNegate,
  helmetDamageNegateExcludingBeerCanSet,
} from "./beerCanEquipment.js";

export function equipmentDamageNegate(p: Player): number {
  const armorBossExtra = p.equipment.armor?.bossDamageNegateBonus ?? 0;
  const helmetBossExtra = p.equipment.helmet?.bossDamageNegateBonus ?? 0;
  return Math.max(
    0,
    armorDamageNegateExcludingBeerCanSet(p) +
      helmetDamageNegateExcludingBeerCanSet(p) +
      accessoryDamageNegateExcludingBeerCanSet(p) +
      beerCanTrioDamageNegate(p) +
      armorBossExtra +
      helmetBossExtra,
  );
}

export function hasNegateAllOnce(p: Player): boolean {
  return !!p.equipment.armor?.negateAllOnce || !!p.equipment.helmet?.negateAllOnce;
}

export function consumeNegateAllOnce(state: GameState, p: Player, log?: (s: GameState, msg: string) => void): void {
  if (p.equipment.armor?.negateAllOnce) {
    const name = p.equipment.armor.name;
    p.equipment.armor = undefined;
    // Recompute hp caps (base 10, armor bonus is now 0).
    p.maxHp = 10;
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

  const prevent = params.isBossHit
    ? equipmentDamageNegate(p)
    : Math.max(
        0,
        equipmentDamageNegate(p) -
          (p.equipment.armor?.bossDamageNegateBonus ?? 0) -
          (p.equipment.helmet?.bossDamageNegateBonus ?? 0),
      );
  const final = Math.max(0, dmg - prevent);

  const before = p.hp;
  p.hp = Math.max(0, p.hp - final);
  const applied = before - p.hp;
  if (applied > 0) {
    p.gold += p.equipment.armor?.gainGoldOnDamageTaken ?? 0;
  }
  return { applied, prevented: dmg - final };
}

export function moveBonusSteps(p: Player): number {
  return Math.max(0, p.equipment.accessory?.moveBonus ?? 0);
}

