import type { Effect, EffectApplyOut } from "./types.js";
import type { EquipmentSlot, GameState, Player } from "../types.js";
import { recordHpLost, recordPantSpent } from "../sessionStats.js";
import { createItemInstance } from "../itemInstance.js";
import { pick, rollDie } from "../rng.js";
import { applyDamage } from "../damage.js";
import { itemDeckItemIdsForRandomGrant } from "./db.js";
import { EQUIPMENT_CATALOG } from "../equipmentDefs.js";
import { grantKlunkWithXp } from "../klunkGrant.js";
import { playerMaxHpFromBase } from "../playerMaxHp.js";
import { syncPlastbackEmptyBottleSynergy } from "../plastbackSynergy.js";

function newInstanceId(rng: () => number): string {
  return `it_${Date.now()}_${Math.floor(rng() * 1_000_000_000)}`;
}

const RANDOM_REWARD_EQUIPMENT_SLOTS: EquipmentSlot[] = ["weapon", "armor", "helmet", "accessory"];

export type RandomEquipRoll =
  | { kind: "equipped"; name: string; slot: EquipmentSlot }
  | { kind: "offer"; name: string; slot: EquipmentSlot; catalogId: string };

/** Tom slot → utrusta direkt; upptagen slot → erbjud byte (hanteras efter kort i motorn). */
export function tryGrantRandomEquipmentOrOffer(
  player: Player,
  rng: () => number,
  baseMaxHp: number,
): RandomEquipRoll | null {
  const slot = pick(rng, RANDOM_REWARD_EQUIPMENT_SLOTS);
  const pool = EQUIPMENT_CATALOG.filter((e) => e.slot === slot);
  if (pool.length === 0) return null;
  const eq = pick(rng, pool);
  if (player.equipment[slot]) {
    return { kind: "offer", name: eq.name, slot, catalogId: eq.id };
  }
  if (slot === "weapon") {
    player.equipment.weapon = {
      name: eq.name,
      power: eq.power ?? 1,
      sipAttackBonus: eq.sipAttackBonus,
      sipWeaponBonusGoldCost: eq.sipWeaponBonusGoldCost,
      sipWeaponBonusKlunks: eq.sipWeaponBonusKlunks,
      pvpDieBonus: eq.pvpDieBonus,
      gainGoldOnWin: eq.gainGoldOnWin,
      powerAtGold10: eq.powerAtGold10,
      powerAtGold20: eq.powerAtGold20,
      powerAtGold30: eq.powerAtGold30,
      powerDynamicMax: eq.powerDynamicMax,
      randomOtherDamageOnWin: eq.randomOtherDamageOnWin,
      breakOnWin: eq.breakOnWin,
      monsterLossSipReduction: eq.monsterLossSipReduction,
    };
    syncPlastbackEmptyBottleSynergy(player);
  } else if (slot === "armor") {
    player.equipment.armor = {
      name: eq.name,
      bonusHp: eq.bonusHp ?? 0,
      combatBonus: eq.combatBonus ?? 0,
      damageNegate: eq.damageNegate,
      bossDamageNegateBonus: eq.bossDamageNegateBonus,
      negateAllOnce: eq.negateAllOnce,
      pvpCannotBeChallenged: eq.pvpCannotBeChallenged,
      pvpDieBonus: eq.pvpDieBonus,
      gainGoldOnDamageTaken: eq.gainGoldOnDamageTaken,
      healHpPerTurn: eq.healHpPerTurn,
    };
    player.maxHp = playerMaxHpFromBase(baseMaxHp, player);
    player.hp = Math.min(player.hp, player.maxHp);
    syncPlastbackEmptyBottleSynergy(player);
  } else if (slot === "helmet") {
    player.equipment.helmet = {
      name: eq.name,
      bonusHp: eq.bonusHp ?? 0,
      combatBonus: eq.combatBonus ?? 0,
      damageNegate: eq.damageNegate,
      bossDamageNegateBonus: eq.bossDamageNegateBonus,
      negateAllOnce: eq.negateAllOnce,
      penaltySipExtra: eq.penaltySipExtra,
      klunkAttackBonus10: eq.klunkAttackBonus10,
      klunkAttackBonus20: eq.klunkAttackBonus20,
      klunkAttackBonusMax: eq.klunkAttackBonusMax,
      pvpDieBonus: eq.pvpDieBonus,
    };
    player.maxHp = playerMaxHpFromBase(baseMaxHp, player);
    const helmHp = eq.bonusHp ?? 0;
    if (helmHp > 0) player.hp = Math.min(player.hp + helmHp, player.maxHp);
    else player.hp = Math.min(player.hp, player.maxHp);
    syncPlastbackEmptyBottleSynergy(player);
  } else {
    player.equipment.accessory = {
      name: eq.name,
      damageNegate: eq.damageNegate,
      combatBonus: eq.combatBonus,
      penaltySipExtra: eq.penaltySipExtra,
      moveBonus: eq.moveBonus,
      gainGoldPerCombat: eq.gainGoldPerCombat,
      gainKlunkPerCombat: eq.gainKlunkPerCombat,
      gainGoldPerPenaltyKlunk: eq.gainGoldPerPenaltyKlunk,
      preventTheft: eq.preventTheft,
      levelUpDiscountGold: eq.levelUpDiscountGold,
      canSkipMonsterEncounter: eq.canSkipMonsterEncounter,
      pvpDieBonus: eq.pvpDieBonus,
      ignoreCombatCritFailOnOne: eq.ignoreCombatCritFailOnOne,
      deathContinueCost: eq.deathContinueCost,
      merchantDiscountGold: eq.merchantDiscountGold,
    };
    syncPlastbackEmptyBottleSynergy(player);
  }
  return { kind: "equipped", name: eq.name, slot };
}

export function applyEffects(params: {
  state: GameState;
  player: Player;
  effects: Effect[];
  rng: () => number;
  out?: EffectApplyOut;
  /** True: damage-effekter från kort ignorerar rustningsreducering och går direkt på HP. */
  ignoreArmorOnDamage?: boolean;
}): EffectApplyOut {
  const out: EffectApplyOut = params.out ?? {};
  for (const e of params.effects) {
    if (e.type === "gold") {
      const before = params.player.gold;
      params.player.gold = Math.max(0, params.player.gold + e.amount);
      const spent = before - params.player.gold;
      if (spent > 0) recordPantSpent(params.state, params.player.id, spent);
      out.gold = (out.gold ?? 0) + (params.player.gold - before);
    } else if (e.type === "goldRoll") {
      const g = e.base + rollDie(params.rng, e.die);
      params.player.gold += g;
      out.gold = (out.gold ?? 0) + g;
    } else if (e.type === "klunkar") {
      const add = grantKlunkWithXp(params.state, params.player, e.amount, { penaltyStraff: true });
      out.klunkar = (out.klunkar ?? 0) + add;
    } else if (e.type === "item") {
      params.player.inventory ??= [];
      params.player.inventory.push(createItemInstance(e.itemId as any, newInstanceId(params.rng)));
      out.item = (out.item ?? 0) + 1;
    } else if (e.type === "randomItem") {
      const tryEquip = params.rng() < 0.35;
      const equipRoll = tryEquip
        ? tryGrantRandomEquipmentOrOffer(params.player, params.rng, params.state.config.maxHp)
        : null;
      if (equipRoll?.kind === "equipped") {
        out.grantedEquipmentName = equipRoll.name;
        out.grantedEquipmentSlot = equipRoll.slot;
      } else if (equipRoll?.kind === "offer") {
        out.equipmentReplaceOffer = {
          slot: equipRoll.slot,
          catalogId: equipRoll.catalogId,
          newName: equipRoll.name,
        };
      }
      if (!out.grantedItemId && !out.grantedEquipmentName && !out.equipmentReplaceOffer) {
        const disabledCardIds = new Set(params.state.config.disabledCardIds ?? []);
        const pool = itemDeckItemIdsForRandomGrant(
          disabledCardIds,
          params.state.levels.length,
          params.player.levelIndex,
        );
        const itemId = pick(params.rng, pool);
        params.player.inventory ??= [];
        params.player.inventory.push(createItemInstance(itemId, newInstanceId(params.rng)));
        out.grantedItemId = itemId;
      }
      if (out.grantedItemId || out.grantedEquipmentName || out.equipmentReplaceOffer) {
        out.item = (out.item ?? 0) + 1;
      }
    } else if (e.type === "nextCombatMod") {
      params.player.nextCombatModifier = (params.player.nextCombatModifier ?? 0) + e.amount;
      out.nextCombatMod = (out.nextCombatMod ?? 0) + e.amount;
    } else if (e.type === "heal") {
      const before = params.player.hp;
      params.player.hp = Math.min(params.player.maxHp, params.player.hp + e.amount);
      out.heal = (out.heal ?? 0) + (params.player.hp - before);
    } else if (e.type === "damage") {
      const before = params.player.hp;
      let prevented = 0;
      if (params.ignoreArmorOnDamage) {
        const dmg = Math.max(0, Math.floor(e.amount));
        params.player.hp = Math.max(0, params.player.hp - dmg);
        recordHpLost(params.state, params.player.id, before - params.player.hp);
      } else {
        const res = applyDamage({
          state: params.state,
          player: params.player,
          amount: e.amount,
        });
        prevented = res.prevented;
      }
      out.damage = (out.damage ?? 0) + (before - params.player.hp);
      out.prevented = (out.prevented ?? 0) + prevented;
    }
  }
  return out;
}

