import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDamage, equipmentDamageNegate, previewHpAfterFlatDamage } from "../dist/damage.js";

function mkPlayer(equipment = {}) {
  return {
    id: "p1",
    name: "Test",
    hp: 10,
    maxHp: 10,
    gold: 0,
    klunkar: 0,
    xp: 0,
    equipment,
    inventory: [],
  };
}

describe("equipment damage negate", () => {
  it("sums negative shield from gear for display and combat", () => {
    const p = mkPlayer({
      armor: { name: "T-shirt", damageNegate: -1 },
      accessory: { name: "Ring", damageNegate: -2 },
    });
    assert.equal(equipmentDamageNegate(p), -3);
  });

  it("negative negate increases damage taken", () => {
    const p = mkPlayer({
      armor: { name: "T-shirt", damageNegate: -2 },
    });
    const state = { config: { maxHp: 10 }, log: [], players: [p] };
    const res = applyDamage({ state, player: p, amount: 3 });
    assert.equal(res.applied, 5);
    assert.equal(p.hp, 5);
  });

  it("previewHpAfterFlatDamage respects negative negate", () => {
    const p = mkPlayer({ helmet: { name: "Cap", damageNegate: -1 } });
    const { hpAfter } = previewHpAfterFlatDamage({ player: p, amount: 2 });
    assert.equal(hpAfter, 7);
  });

  it("bypassShield ignores equipment negate and negate-all-once (BvB loot damage)", () => {
    const p = mkPlayer({
      armor: { name: "Sköld", damageNegate: 5, negateAllOnce: true },
    });
    const state = { config: { maxHp: 10 }, log: [], players: [p] };
    const res = applyDamage({ state, player: p, amount: 2, bypassShield: true });
    assert.equal(res.applied, 2);
    assert.equal(res.prevented, 0);
    assert.equal(p.hp, 8);
    assert.equal(p.equipment.armor?.name, "Sköld");

    const preview = previewHpAfterFlatDamage({ player: p, amount: 2, bypassShield: true });
    assert.equal(preview.hpAfter, 6);
    assert.equal(preview.blockedByNegateAllOnce, false);
  });
});
