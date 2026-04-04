import type { GameState, Player } from "./types.js";

export function equipmentDamageNegate(p: Player): number {
  const a = p.equipment.armor?.damageNegate ?? 0;
  const h = p.equipment.helmet?.damageNegate ?? 0;
  const x = p.equipment.accessory?.damageNegate ?? 0;
  const raw = a + h + x;
  return Math.max(0, Math.min(2, raw));
}

export function hasNegateAllOnce(p: Player): boolean {
  return !!p.equipment.armor?.negateAllOnce;
}

export function consumeNegateAllOnce(state: GameState, p: Player, log?: (s: GameState, msg: string) => void): void {
  if (!p.equipment.armor?.negateAllOnce) return;
  const name = p.equipment.armor.name;
  p.equipment.armor = undefined;
  // Recompute hp caps (base 10, armor bonus is now 0).
  p.maxHp = 10;
  if (p.hp > p.maxHp) p.hp = p.maxHp;
  log?.(state, `${p.name}'s ${name} shatters!`);
}

export function applyDamage(params: {
  state: GameState;
  player: Player;
  amount: number;
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

  const prevent = equipmentDamageNegate(p);
  const final = Math.max(0, dmg - prevent);

  const before = p.hp;
  p.hp = Math.max(1, p.hp - final);
  const applied = before - p.hp;
  return { applied, prevented: dmg - final };
}

export function moveBonusSteps(p: Player): number {
  return Math.max(0, p.equipment.accessory?.moveBonus ?? 0);
}

