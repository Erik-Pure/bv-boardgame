import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Player } from "@bv/game-core";
import { eventCardOutcomeToasts } from "../src/lib/eventCardOutcomeToasts.ts";

function playersById(entries: Array<[string, string]>): Map<string, Player> {
  return new Map(
    entries.map(([id, name]) => [
      id,
      {
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
      } as Player,
    ]),
  );
}

function eventPending(
  cardId: string,
  playerId: string,
  text: string,
  tableOutcomes?: Array<{
    kind: string;
    text?: string;
    category?: string;
    icons?: string[];
    playerId?: string;
    delta?: number;
    amount?: number;
  }>,
) {
  return {
    type: "card" as const,
    kind: "event" as const,
    playerId,
    cardId,
    title: cardId,
    text,
    tableOutcomes,
  };
}

describe("eventCardOutcomeToasts", () => {
  it("returns apocalypse sip toast", () => {
    const out = eventCardOutcomeToasts(
      eventPending("event_apocalypse", "p1", "", [
        { kind: "custom", text: "Alla spelare får 1 straffklunk.", category: "sip", icons: ["klunk"] },
      ]),
      playersById([["p1", "Anna"]]),
    );
    assert.equal(out.length, 1);
    assert.match(out[0]!.text, /straffklunk/);
    assert.equal(out[0]!.category, "sip");
  });

  it("formats happy hour branch from die", () => {
    const out = eventCardOutcomeToasts(
      eventPending("event_happyhour", "p1", "Tärning: 1", [
        { kind: "custom", text: "Happy hour: alla andra får +2 pant.", category: "pvp", icons: ["pant"] },
      ]),
      playersById([["p1", "Anna"]]),
    );
    assert.equal(out[0]!.text, "Happy hour: alla andra får +2 pant.");
  });

  it("parses generic pant delta lines from card text", () => {
    const out = eventCardOutcomeToasts(
      eventPending("event_gold", "p1", "Pant: 3 → 8."),
      playersById([["p1", "Anna"]]),
    );
    assert.equal(out[0]!.text, "Anna får 5 pant.");
    assert.deepEqual(out[0]!.iconKinds, ["pant"]);
  });

  it("formats baksmallebonus heal from structured hp delta", () => {
    const out = eventCardOutcomeToasts(
      eventPending("event_baksmallebonus", "p1", "HP: 4 → 9.", [
        { kind: "hpDelta", playerId: "p1", delta: 5 },
      ]),
      playersById([["p1", "Bertil"]]),
    );
    assert.equal(out[0]!.text, "Bertil läker 5 HP.");
  });
});
