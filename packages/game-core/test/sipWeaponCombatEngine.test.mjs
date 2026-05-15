import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  CONFIG_NUMERIC,
  DEFAULT_PLAYER_SESSION_STATS,
  MONSTERS,
} from "../dist/index.js";

const skumBanan = MONSTERS.find((x) => x.id === "skum_banan");

const weaponOlsejdel = {
  name: "Ölsejdel",
  power: 1,
  sipAttackBonus: 2,
  sipWeaponBonusKlunks: 1,
};

const weaponEnkelpipa = {
  name: "Enkelpipa",
  power: 1,
  sipAttackBonus: 1,
  sipWeaponBonusGoldCost: 2,
};

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

function combatReactionsBase() {
  return {
    type: "combat",
    phase: "reactions",
    attackerId: "p1",
    levelIndex: 0,
    tileIndex: 0,
    monsterId: skumBanan.id,
    enemyName: skumBanan.name,
    need: skumBanan.strength,
    needMod: 0,
    baseDamage: skumBanan.baseDamage,
    lossSipsOnLose: skumBanan.lossSipsOnLose,
    attackMods: {},
    reactors: [],
    reacted: {},
    rewardGold: skumBanan.rewardGold,
    rewardItems: skumBanan.rewardItems,
    rewardXp: skumBanan.rewardXp,
  };
}

function mkPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    color: p.color ?? "#111111",
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
    ...(p.nextForcedDieFace != null ? { nextForcedDieFace: p.nextForcedDieFace } : {}),
  };
}

function playingCombatReactions(opts) {
  const p1 = mkPlayer({
    id: "p1",
    name: "A",
    isHost: true,
    gold: opts.gold ?? 20,
    klunkar: opts.klunkar ?? 0,
    equipment: { weapon: { ...opts.weapon } },
  });
  const p2 = mkPlayer({
    id: "p2",
    name: "B",
    isHost: false,
    tileIndex: 1,
    equipment: {},
  });
  return {
    phase: "playing",
    seed: 42,
    config: gameConfig(),
    roomCode: "TEST",
    players: [p1, p2],
    turnOrder: ["p1", "p2"],
    currentTurnIndex: 0,
    levels: [
      {
        tiles: [
          { id: "c0", type: "combat", combatValue: skumBanan.strength },
          { id: "e1", type: "empty" },
        ],
      },
    ],
    pending: combatReactionsBase(),
    log: [],
    winnerId: null,
    winnerName: null,
    goldenBeerCarrierId: null,
    finalBossMonsterId: null,
    finalBossLivesRemaining: null,
    treasureTaken: {},
    lastDiceRoll: null,
    lastDiceRollerId: null,
    sipNotices: [],
  };
}

function withForcedDie(state, playerId, face) {
  return {
    ...state,
    players: state.players.map((pl) =>
      pl.id === playerId ? { ...pl, nextForcedDieFace: face } : pl,
    ),
  };
}

describe("combat sip weapon (two-step + deferred straffklunk)", () => {
  it("requires explicit bonus choice before combatRoll when weapon has sipAttackBonus", () => {
    let s = playingCombatReactions({ weapon: weaponOlsejdel });
    s = withForcedDie(s, "p1", 6);
    const r = applyAction(s, { type: "combatRoll", playerId: "p1" });
    assert.match(String(r.error ?? ""), /Välj om du vill använda vapnets extraattack/);
  });

  it("accepts combatRoll.useSipWeaponBonus when sipWeaponBonusChoice is unset (backward compat)", () => {
    let s = playingCombatReactions({ weapon: weaponOlsejdel });
    s = withForcedDie(s, "p1", 6);
    const r = applyAction(s, { type: "combatRoll", playerId: "p1", useSipWeaponBonus: true });
    assert.equal(r.error, undefined);
    assert.equal(r.state.pending?.type, "combat");
    const pend = r.state.pending;
    if (pend?.type === "combat") {
      assert.equal(pend.phase, "rollPreview");
      assert.equal(pend.previewDeferredSipWeaponPenalties?.length, 1);
    }
  });

  it("combatChooseSipWeaponBonus then combatRoll: klunk on roll, queue on win card, sip after confirmCard", () => {
    let s = playingCombatReactions({ weapon: weaponOlsejdel, klunkar: 0 });
    let r = applyAction(s, {
      type: "combatChooseSipWeaponBonus",
      playerId: "p1",
      useSipWeaponBonus: true,
    });
    assert.equal(r.error, undefined);
    s = r.state;
    assert.equal(s.pending?.type === "combat" && s.pending.sipWeaponBonusChoice?.p1, true);

    s = withForcedDie(s, "p1", 6);
    assert.equal(s.sipNotices.length, 0);

    r = applyAction(s, { type: "combatRoll", playerId: "p1" });
    assert.equal(r.error, undefined);
    s = r.state;
    assert.equal(s.players[0].klunkar, 1);
    assert.equal(s.sipNotices.length, 0);
    assert.equal(s.pending?.type, "combat");
    const pendRoll = s.pending;
    if (pendRoll?.type === "combat") {
      assert.equal(pendRoll.phase, "rollPreview");
      assert.equal(pendRoll.previewDeferredSipWeaponPenalties?.length, 1);
    }

    r = applyAction(s, { type: "combatRollAck", playerId: "p1" });
    assert.equal(r.error, undefined);
    s = r.state;
    assert.equal(s.pending?.type, "card");
    const card = s.pending;
    if (card?.type === "card") {
      assert.equal(card.cardId, "combat_win");
      assert.equal(card.queuedPenaltySipNotices?.length, 1);
    }

    r = applyAction(s, { type: "confirmCard", playerId: "p1" });
    assert.equal(r.error, undefined);
    s = r.state;
    assert.ok(s.sipNotices.length >= 1);
    const notice = s.sipNotices[0];
    assert.ok(notice?.body?.includes("ölsejdeln"));
    assert.ok(notice?.body?.includes("extraattack"));
  });

  it("pant sip weapon: gold unchanged on choose, deducted on combatRoll", () => {
    let s = playingCombatReactions({ weapon: weaponEnkelpipa, gold: 10 });
    let r = applyAction(s, {
      type: "combatChooseSipWeaponBonus",
      playerId: "p1",
      useSipWeaponBonus: true,
    });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].gold, 10);

    s = withForcedDie(r.state, "p1", 6);
    r = applyAction(s, { type: "combatRoll", playerId: "p1" });
    assert.equal(r.error, undefined);
    assert.equal(r.state.players[0].gold, 8);
  });
});
