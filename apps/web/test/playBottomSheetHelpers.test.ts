import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeBottomSheetPrimaryKind } from "../src/components/play/playBottomSheetHelpers.ts";

describe("computeBottomSheetPrimaryKind", () => {
  it("falls through to interaction when card/sip layer is inactive (e.g. lobby)", () => {
    assert.equal(
      computeBottomSheetPrimaryKind({
        hasItemDetail: false,
        hasEquipDetail: false,
        hasCardOrSip: false,
        brewerPerkPrioritized: false,
        personalPromptPrioritized: false,
        hasSipAck: false,
        hasInteraction: true,
      }),
      "interaction",
    );
  });
});
