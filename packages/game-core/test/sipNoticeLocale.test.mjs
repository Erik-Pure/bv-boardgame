import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMonsterDisplayBySvName } from "../dist/monsterLocale.js";
import {
  localizeSipNoticeBody,
  localizeSipNoticeFromPlayerName,
  localizeSipNoticeTitle,
} from "../dist/localizeSipNotice.js";

describe("monsterLocale by Swedish name", () => {
  it("getMonsterDisplayBySvName resolves Rabarbar to Rhubarbarian", () => {
    const en = getMonsterDisplayBySvName("Rabarbar", "en");
    assert.equal(en?.name, "Rhubarbarian");
  });
});

describe("localizeSipNotice", () => {
  it("localizes monster fromPlayerName", () => {
    assert.equal(localizeSipNoticeFromPlayerName("Rabarbar", "en"), "Rhubarbarian");
  });

  it("localizes event card title fromPlayerName", () => {
    assert.equal(localizeSipNoticeFromPlayerName("Sötsug", "en"), "Sweet Tooth");
  });

  it("localizes player plus card title fromPlayerName", () => {
    assert.equal(
      localizeSipNoticeFromPlayerName("Anna (Bryggpokalypse)", "en"),
      "Anna (Brewapocalypse)",
    );
  });

  it("localizes Straffklunk title", () => {
    assert.equal(localizeSipNoticeTitle("Straffklunk", "en"), "Penalty sip");
  });

  it("localizes weapon boost penalty sip body", () => {
    const en = localizeSipNoticeBody("En straffklunk från Ölsejdel. +10 XP.", "en");
    assert.match(en, /penalty sip from/i);
    assert.match(en, /\+10 XP/);
  });

  it("localizes Spilla med flit notice title and body", () => {
    assert.equal(localizeSipNoticeTitle("Spilla med flit", "en"), "Spill on Purpose");
    assert.equal(
      localizeSipNoticeBody("Vera förstörde Ölprovning hos dig.", "en"),
      "Vera destroyed Beer Tasting on you.",
    );
  });

  it("localizes duel loss notice title and body variants", () => {
    assert.equal(localizeSipNoticeTitle("Du förlorade duellen", "en"), "You lost the duel");
    assert.equal(
      localizeSipNoticeBody("Erik tog 10 pant från dig efter duellen.", "en"),
      "Erik took 10 cans from you after the duel.",
    );
    assert.equal(
      localizeSipNoticeBody("Erik gav dig 2 skada efter duellen (HP 5 → 3).", "en"),
      "Erik dealt 2 damage to you after the duel (HP 5 → 3).",
    );
    assert.equal(
      localizeSipNoticeBody("Erik tog din Ölsejdel efter duellen.", "en"),
      "Erik took your Beer Stein after the duel.",
    );
    assert.equal(
      localizeSipNoticeBody("Erik valde en tom plats och tog 3 pant från dig i stället.", "en"),
      "Erik chose an empty slot and took 3 cans from you instead.",
    );
  });

  it("localizes Rigged game steal notice title and body", () => {
    assert.equal(localizeSipNoticeTitle("Riggat spel", "en"), "Rigged Game");
    assert.equal(
      localizeSipNoticeBody("Vra tog Skumvisir från dig med Riggat spel.", "en"),
      "Vra took Foam Visor from you with Rigged Game.",
    );
  });
});
