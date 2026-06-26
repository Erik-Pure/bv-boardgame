import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  localizeMonsterCombatCardText,
  localizeMonsterCombatCardTitle,
  localizeMonsterCombatChoiceLabel,
} from "../dist/localizeMonsterCardChoices.js";

describe("localizeMonsterCardChoices", () => {
  it("localizes Belgian Monk choice buttons", () => {
    assert.equal(
      localizeMonsterCombatChoiceLabel(
        "monster:belgisk_munk",
        "sip_leave",
        "Ta en klunk och betala 5 pant (den försvinner)",
        "en",
      ),
      "Take a sip and pay 5 cans (it disappears)",
    );
    assert.equal(localizeMonsterCombatChoiceLabel("monster:belgisk_munk", "fight", "Slåss", "en"), "Fight");
  });

  it("localizes Demon Warrior choice buttons", () => {
    assert.equal(
      localizeMonsterCombatChoiceLabel(
        "monster:demonkrigare",
        "pay_skip",
        "Betala 10 pant och undvik striden",
        "en",
      ),
      "Pay 10 cans and avoid the fight",
    );
    assert.equal(localizeMonsterCombatChoiceLabel("monster:demonkrigare", "fight", "Slåss", "en"), "Fight");
  });

  it("localizes Belgian Monk card title and rules text", () => {
    assert.equal(localizeMonsterCombatCardTitle("monster:belgisk_munk", "Belgisk munk", "en"), "Belgian Monk");
    assert.equal(
      localizeMonsterCombatCardText(
        "monster:belgisk_munk",
        "Ta en klunk och betala 5 pant i dess ära så försvinner den.",
        "en",
      ),
      "Take a sip and pay 5 cans in its honor and it disappears.",
    );
  });

  it("localizes Demon Warrior card title and rules text", () => {
    assert.equal(localizeMonsterCombatCardTitle("monster:demonkrigare", "Demonkrigare", "en"), "Demon Warrior");
    assert.match(
      localizeMonsterCombatCardText(
        "monster:demonkrigare",
        "Betala 10 pant och undvik striden. Vid förlust: en annan spelare får +3 HP.",
        "en",
      ),
      /Pay 10 cans to avoid the fight/i,
    );
  });
});
