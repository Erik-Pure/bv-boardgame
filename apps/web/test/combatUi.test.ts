import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  combatAllyOutcomeKey,
  combatAllyOutcomeRole,
  parseLegacyCombatLoseText,
  parseLegacyCombatWinText,
  resolveCombatWinViewer,
} from "../src/lib/combatUi.ts";

describe("parseLegacyCombatWinText", () => {
  it("parses roll, pant and item rewards", () => {
    const parsed = parseLegacyCombatWinText(
      "Slag: 9 (krävdes 7). +3 pant. Du hittar 2 föremål.",
      "Kalle",
    );
    assert.deepEqual(parsed, {
      winnerName: "Kalle",
      enemyName: "",
      rollTotal: 9,
      need: 7,
      rewardGold: 3,
      rewardItems: 2,
      rewardXp: 0,
    });
  });

  it("returns null for unrelated text", () => {
    assert.equal(parseLegacyCombatWinText("Bara fluff."), null);
  });
});

describe("parseLegacyCombatLoseText", () => {
  it("parses roll line and assist notes", () => {
    const parsed = parseLegacyCombatLoseText(
      "Slag: 4 (krävdes 8).\nÖlkompis-slag: 2 (totalt 6).",
      "Lisa",
    );
    assert.equal(parsed?.playerName, "Lisa");
    assert.equal(parsed?.rollTotal, 4);
    assert.equal(parsed?.need, 8);
    assert.match(parsed?.assistRollNote ?? "", /Ölkompis-slag/);
  });
});

describe("resolveCombatWinViewer", () => {
  it("replaces legacy Du with viewer name", () => {
    const out = resolveCombatWinViewer(
      {
        winnerName: "Du",
        enemyName: "Troll",
        rollTotal: 8,
        need: 6,
        rewardGold: 1,
        rewardItems: 0,
        rewardXp: 0,
      },
      "Erik",
    );
    assert.equal(out?.winnerName, "Erik");
  });
});

describe("combatAllyOutcomeRole", () => {
  it("detects help mate on ally combat win", () => {
    const role = combatAllyOutcomeRole(
      {
        type: "card",
        kind: "combat",
        playerId: "attacker",
        cardId: "combat_win",
        title: "Vinst",
        text: "",
        combatWin: {
          winnerName: "A",
          enemyName: "B",
          rollTotal: 9,
          need: 7,
          rewardGold: 2,
          rewardItems: 0,
          rewardXp: 1,
          helpMatePlayerId: "helper",
        },
      },
      "helper",
    );
    assert.equal(role, "helpMate");
  });

  it("detects beer bro on ally combat lose", () => {
    const role = combatAllyOutcomeRole(
      {
        type: "card",
        kind: "combat",
        playerId: "attacker",
        cardId: "combat_lose",
        title: "Förlust",
        text: "",
        combatLoss: {
          playerName: "A",
          enemyName: "B",
          rollTotal: 3,
          need: 7,
          damage: 2,
          klunkGained: 1,
          assistPartnerImpact: { playerId: "bro", hpLost: 1, klunksGained: 0 },
        },
      },
      "bro",
    );
    assert.equal(role, "beerBro");
  });
});

describe("combatAllyOutcomeKey", () => {
  it("is stable for the same combat win payload", () => {
    const pending = {
      type: "card" as const,
      kind: "combat" as const,
      playerId: "a1",
      cardId: "combat_win",
      title: "Vinst",
      text: "",
      combatWin: {
        winnerName: "A",
        enemyName: "B",
        rollTotal: 10,
        need: 8,
        rewardGold: 0,
        rewardItems: 0,
        rewardXp: 0,
        helpMatePlayerId: "h1",
      },
    };
    const k1 = combatAllyOutcomeKey(pending);
    const k2 = combatAllyOutcomeKey({ ...pending });
    assert.equal(k1, k2);
    assert.match(k1, /^win:a1:/);
  });
});
