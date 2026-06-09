import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diffPlayerStatsToOutcomes,
  parseStatDeltaLinesToOutcomes,
  resolveEventCardTableToasts,
  snapshotPlayerStats,
} from "../dist/eventTableOutcomes.js";

function player(id, name, overrides = {}) {
  return {
    id,
    name,
    color: "#fff",
    hp: 10,
    maxHp: 10,
    gold: 5,
    klunkar: 0,
    ready: true,
    isHost: false,
    levelIndex: 0,
    tileIndex: 0,
    xp: 0,
    equipment: {},
    inventory: [],
    ...overrides,
  };
}

describe("eventTableOutcomes", () => {
  it("diffs pant and sip changes across players", () => {
    const before = snapshotPlayerStats([
      player("p1", "Anna", { gold: 3, klunkar: 1 }),
      player("p2", "Bertil", { gold: 8 }),
    ]);
    const after = [
      player("p1", "Anna", { gold: 8, klunkar: 1 }),
      player("p2", "Bertil", { gold: 10, klunkar: 2 }),
    ];
    const outcomes = diffPlayerStatsToOutcomes(before, after);
    assert.deepEqual(outcomes, [
      { kind: "pantDelta", playerId: "p1", delta: 5 },
      { kind: "pantDelta", playerId: "p2", delta: 2 },
      { kind: "sipGain", playerId: "p2", amount: 2 },
    ]);
  });

  it("parses stat delta lines from card text", () => {
    const playersById = new Map([
      ["p1", player("p1", "Anna")],
      ["p2", player("p2", "Bertil")],
    ]);
    const outcomes = parseStatDeltaLinesToOutcomes(
      "Pant: 3 → 8.\nBertil klunkar: 0 → 1.",
      "p1",
      playersById,
    );
    assert.deepEqual(outcomes, [
      { kind: "pantDelta", playerId: "p1", delta: 5 },
      { kind: "sipGain", playerId: "p2", amount: 1 },
    ]);
  });

  it("resolves structured apocalypse toast", () => {
    const pending = {
      type: "card",
      kind: "event",
      playerId: "p1",
      cardId: "event_apocalypse",
      title: "Apocalypse",
      text: "",
      tableOutcomes: [
        { kind: "custom", text: "Alla spelare får 1 straffklunk.", category: "sip", icons: ["klunk"] },
      ],
    };
    const toasts = resolveEventCardTableToasts(pending, [player("p1", "Anna")]);
    assert.equal(toasts.length, 1);
    assert.match(toasts[0].text, /straffklunk/);
    assert.equal(toasts[0].category, "sip");
  });

  it("resolves happy hour aggregate toast from structured outcomes", () => {
    const pending = {
      type: "card",
      kind: "event",
      playerId: "p1",
      cardId: "event_happyhour",
      title: "Happy hour",
      text: "Tärning: 1.",
      tableOutcomes: [
        { kind: "custom", text: "Happy hour: alla andra får +2 pant.", category: "pvp", icons: ["pant"] },
      ],
    };
    const toasts = resolveEventCardTableToasts(pending, [player("p1", "Anna")]);
    assert.equal(toasts[0].text, "Happy hour: alla andra får +2 pant.");
  });

  it("falls back to text parsing when tableOutcomes missing", () => {
    const pending = {
      type: "card",
      kind: "event",
      playerId: "p1",
      cardId: "event_gold",
      title: "Gold",
      text: "Pant: 3 → 8.",
    };
    const toasts = resolveEventCardTableToasts(pending, [player("p1", "Anna", { gold: 8 })]);
    assert.equal(toasts[0].text, "Anna får 5 pant.");
  });
});
