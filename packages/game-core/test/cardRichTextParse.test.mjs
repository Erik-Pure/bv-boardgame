import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseCardRichTextLine,
  shouldShowCardRollOutcomeTable,
} from "../dist/cardRichTextParse.js";
import { getCardDefById } from "../dist/cards/db.js";

function iconKinds(line) {
  return line.filter((s) => s.type === "icon").map((s) => s.kind);
}

describe("cardRichTextParse", () => {
  it("inserts pant and klunk icons after the word", () => {
    const line = parseCardRichTextLine("Du får +3 pant och 1 straffklunk.");
    assert.deepEqual(iconKinds(line), ["pant", "klunk"]);
    const pantText = line.find((s) => s.type === "text" && /pant/i.test(s.value));
    const klunkText = line.find((s) => s.type === "text" && /straffklunk/i.test(s.value));
    assert.equal(pantText?.bold, true);
    assert.equal(klunkText?.bold, true);
    const text = line
      .filter((s) => s.type === "text")
      .map((s) => s.value)
      .join("");
    assert.match(text, /\+3 pant/);
    assert.match(text, /straffklunk/);
    for (const kind of ["pant", "klunk"]) {
      const idx = line.findIndex((s) => s.type === "icon" && s.kind === kind);
      const before = line[idx - 1];
      assert.equal(before?.type, "text");
      assert.match(before.value, new RegExp(kind === "pant" ? "pant" : "straffklunk", "i"));
    }
  });

  it("inserts HP icon after skada and HP", () => {
    const line = parseCardRichTextLine("Ta 2 skada och återfå 2 HP.");
    assert.deepEqual(iconKinds(line), ["hp", "hp"]);
    assert.ok(line.filter((s) => s.type === "text" && s.bold).length >= 2);
    const hpIdx = line
      .map((s, i) => (s.type === "icon" && s.kind === "hp" ? i : -1))
      .filter((i) => i >= 0);
    assert.equal(hpIdx.length, 2);
    assert.match(line[hpIdx[0] - 1].value, /skada/i);
    assert.match(line[hpIdx[1] - 1].value, /HP/);
  });

  it("inserts red combat icon after negative attack", () => {
    const line = parseCardRichTextLine("Stridsreaktion: −2 attack.");
    assert.deepEqual(iconKinds(line), ["combatNeg"]);
    const idx = line.findIndex((s) => s.type === "icon" && s.kind === "combatNeg");
    assert.equal(line[idx - 1]?.type, "text");
    assert.match(line[idx - 1].value, /attack/i);
  });

  it("inserts green combat icon after positive attack", () => {
    const line = parseCardRichTextLine("Stridsreaktion: +2 attack.");
    assert.deepEqual(iconKinds(line), ["combatPos"]);
  });

  it("stridsreaktion is bold without icon; attack keeps signed combat icon", () => {
    const line = parseCardRichTextLine("Stridsreaktion: +3 attack.");
    assert.deepEqual(iconKinds(line), ["combatPos"]);
    const strText = line.find((s) => s.type === "text" && /stridsreaktion/i.test(s.value));
    assert.equal(strText?.bold, true);
  });

  it("matches plain klunk (not only klunkar)", () => {
    const line = parseCardRichTextLine("Ta 1 klunk.");
    assert.ok(iconKinds(line).includes("klunk"));
    assert.match(
      line
        .filter((s) => s.type === "text")
        .map((s) => s.value)
        .join(""),
      /klunk/,
    );
  });

  it("leading dice icon for Slå tärning and Tärning result", () => {
    const roll = parseCardRichTextLine("Slå tärningen.");
    assert.ok(iconKinds(roll).includes("dice"));
    assert.ok(roll.some((s) => s.type === "text" && s.bold));
    const result = parseCardRichTextLine("Tärning: 4.");
    assert.ok(iconKinds(result).includes("dice"));
    assert.ok(result.some((s) => s.type === "text" && s.bold));
  });

  it("shouldShowCardRollOutcomeTable hides after roll", () => {
    const def = getCardDefById("event_snurraflaskan");
    assert.ok(def?.rollOutcomes?.length);
    assert.equal(shouldShowCardRollOutcomeTable(def.rollOutcomes, def.text), true);
    assert.equal(
      shouldShowCardRollOutcomeTable(def.rollOutcomes, `${def.text}\nTärning: 3.`),
      false,
    );
  });
});
