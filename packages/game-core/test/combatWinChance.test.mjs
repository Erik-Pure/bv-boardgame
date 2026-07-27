import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { monsterCombatWinChancePercent } from "../dist/combatWinChance.js";

describe("monsterCombatWinChancePercent", () => {
  it("solo: need 4, flat 0 → 3–6 vinner (ej 1 crit), 50%", () => {
    // 1 crit loss, 2: 2<4 loss, 3:3<4 loss, 4–6 win → 3/6 = 50%
    assert.equal(monsterCombatWinChancePercent({ need: 4, attacker: { flatBonus: 0 } }), 50);
  });

  it("solo: need 4, flat +2 → 2–6 vinner (ej 1), ~83%", () => {
    // 1 crit, 2:4>=4, 3:5, 4:6, 5:7, 6:8 → 5/6 ≈ 83
    assert.equal(monsterCombatWinChancePercent({ need: 4, attacker: { flatBonus: 2 } }), 83);
  });

  it("solo: Fyrklöver ignorerar etta — need 1 flat 0 → 100%", () => {
    assert.equal(
      monsterCombatWinChancePercent({
        need: 1,
        attacker: { flatBonus: 0, ignoreCritFailOnOne: true },
      }),
      100,
    );
  });

  it("solo: dubbel tärning need 8 flat 0 → 4–6 (8/10/12) vinner, 50%", () => {
    assert.equal(
      monsterCombatWinChancePercent({
        need: 8,
        attacker: { flatBonus: 0, attackDiceDoubled: true },
      }),
      50,
    );
  });

  it("lag: två flat 0 need 7 → 21/36 ≈ 58%", () => {
    // utan crit (bara 1+1): vinst när a+b >= 7
    const pct = monsterCombatWinChancePercent({
      need: 7,
      attacker: { flatBonus: 0 },
      assist: { flatBonus: 0 },
    });
    assert.equal(pct, 58);
  });

  it("villkorlig: attacker redan slog 5, assist flat 0 need 8 → assist behöver ≥3 (ej båda 1)", () => {
    // assist 1: total 6 < 8; 2:7; 3–6: win → 4/6 ≈ 67
    assert.equal(
      monsterCombatWinChancePercent({
        need: 8,
        attacker: { flatBonus: 0, fixedDie: 5 },
        assist: { flatBonus: 0 },
      }),
      67,
    );
  });
});
