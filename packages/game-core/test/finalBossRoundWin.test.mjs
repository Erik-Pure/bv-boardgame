import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAction, CONFIG_NUMERIC, DEFAULT_PLAYER_SESSION_STATS, MONSTERS } from "../dist/index.js";

const bossId = "store_narcissius";
const bossMonster = MONSTERS.find((m) => m.id === bossId);
if (!bossMonster) throw new Error("missing boss monster");

function gameConfig() {
  return {
    turnSeconds: CONFIG_NUMERIC.turnSeconds.default,
    reactionSeconds: CONFIG_NUMERIC.reactionSeconds.default,
    gameMode: "bossKill",
    difficulty: "folkol",
    hardcore: false,
    boardSize: "default",
    levelCount: 3,
    maxHp: CONFIG_NUMERIC.maxHp.default,
    startPant: CONFIG_NUMERIC.startPant.default,
    wakeLockBeforeStart: false,
    disabledCardIds: [],
    cardCover: "card1",
  };
}

function mkPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    color: p.color ?? "#111",
    isHost: p.isHost ?? false,
    ready: p.ready ?? true,
    levelIndex: p.levelIndex ?? 0,
    tileIndex: p.tileIndex ?? 0,
    gold: p.gold ?? 20,
    klunkar: p.klunkar ?? 0,
    hp: p.hp ?? 10,
    maxHp: p.maxHp ?? 10,
    xp: p.xp ?? 0,
    equipment: p.equipment ?? {},
    inventory: p.inventory ?? [],
    nextMoveBonus: p.nextMoveBonus ?? 0,
    nextCombatModifier: p.nextCombatModifier ?? 0,
    skippedTurns: p.skippedTurns ?? 0,
    stats: p.stats ?? { ...DEFAULT_PLAYER_SESSION_STATS },
  };
}

describe("final boss between rounds", () => {
  it("after boss_round_win confirmCard, next combat starts in reactions (no enemyIntro)", () => {
    const p1 = mkPlayer({ id: "p1", name: "A", isHost: true });
    const p2 = mkPlayer({ id: "p2", name: "B", isHost: false, tileIndex: 1 });
    const state = {
      phase: "playing",
      seed: 1,
      config: gameConfig(),
      roomCode: "T",
      players: [p1, p2],
      turnOrder: ["p1", "p2"],
      currentTurnIndex: 0,
      levels: [
        {
          tiles: [
            {
              id: "b0",
              type: "boss",
              combatValue: bossMonster.strength,
              bossName: bossMonster.name,
            },
            { id: "e1", type: "empty" },
          ],
        },
      ],
      pending: {
        type: "card",
        playerId: "p1",
        cardId: "boss_round_win",
        kind: "combat",
        title: "Runda vunnet!",
        text: "Slutbossen har 2 liv kvar. Bekräfta för att gå vidare till nästa runda.",
        artKey: bossMonster.artKey,
      },
      log: [],
      winnerId: null,
      winnerName: null,
      goldenBeerCarrierId: null,
      finalBossMonsterId: bossId,
      finalBossLivesRemaining: 2,
      treasureTaken: {},
      lastDiceRoll: null,
      lastDiceRollerId: null,
      sipNotices: [],
    };

    const r = applyAction(state, { type: "confirmCard", playerId: "p1" });
    assert.equal(r.error, undefined);
    const pend = r.state.pending;
    assert.equal(pend?.type, "combat");
    if (pend?.type === "combat") {
      assert.equal(pend.phase, "reactions");
      assert.equal(pend.monsterId, bossId);
    }
  });
});
