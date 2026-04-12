import type { Effect, EffectApplyOut } from "./types.js";
import type { GameState, Player } from "../types.js";
import { createItemInstance } from "../itemInstance.js";
import { pick, rollDie } from "../rng.js";
import { applyDamage } from "../damage.js";
import { itemDeckItemIds } from "./db.js";

function newInstanceId(rng: () => number): string {
  return `it_${Date.now()}_${Math.floor(rng() * 1_000_000_000)}`;
}

export function applyEffects(params: {
  state: GameState;
  player: Player;
  effects: Effect[];
  rng: () => number;
  out?: EffectApplyOut;
}): EffectApplyOut {
  const out: EffectApplyOut = params.out ?? {};
  for (const e of params.effects) {
    if (e.type === "gold") {
      const before = params.player.gold;
      params.player.gold = Math.max(0, params.player.gold + e.amount);
      out.gold = (out.gold ?? 0) + (params.player.gold - before);
    } else if (e.type === "goldRoll") {
      const g = e.base + rollDie(params.rng, e.die);
      params.player.gold += g;
      out.gold = (out.gold ?? 0) + g;
    } else if (e.type === "klunkar") {
      params.player.klunkar += e.amount;
      out.klunkar = (out.klunkar ?? 0) + e.amount;
    } else if (e.type === "item") {
      params.player.inventory ??= [];
      params.player.inventory.push(createItemInstance(e.itemId as any, newInstanceId(params.rng)));
      out.item = (out.item ?? 0) + 1;
    } else if (e.type === "randomItem") {
      const pool = itemDeckItemIds();
      const itemId = pick(params.rng, pool);
      params.player.inventory ??= [];
      params.player.inventory.push(createItemInstance(itemId, newInstanceId(params.rng)));
      out.item = (out.item ?? 0) + 1;
      out.grantedItemId = itemId;
    } else if (e.type === "nextCombatMod") {
      params.player.nextCombatModifier = (params.player.nextCombatModifier ?? 0) + e.amount;
      out.nextCombatMod = (out.nextCombatMod ?? 0) + e.amount;
    } else if (e.type === "heal") {
      const before = params.player.hp;
      params.player.hp = Math.min(params.player.maxHp, params.player.hp + e.amount);
      out.heal = (out.heal ?? 0) + (params.player.hp - before);
    } else if (e.type === "damage") {
      const before = params.player.hp;
      const res = applyDamage({
        state: params.state,
        player: params.player,
        amount: e.amount,
      });
      out.damage = (out.damage ?? 0) + (before - params.player.hp);
      out.prevented = (out.prevented ?? 0) + res.prevented;
    }
  }
  return out;
}

