import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  localizeRewardDisplayTitle,
  localizeRewardDisplayTitles,
} from "../dist/localizeRewardDisplayTitle.js";

describe("localizeRewardDisplayTitle", () => {
  it("localizes equipment loot titles", () => {
    assert.equal(localizeRewardDisplayTitle("Robothjälm", "en"), "Robot Helmet");
    assert.equal(localizeRewardDisplayTitle("Ölsejdel", "en"), "Beer Stein");
  });

  it("localizes item card loot titles", () => {
    assert.equal(localizeRewardDisplayTitle("Helande brygd", "en"), "Healing Brew");
  });

  it("localizes arrays for combat win toasts", () => {
    const en = localizeRewardDisplayTitles(["Robothjälm", "Helande brygd"], "en");
    assert.deepEqual(en, ["Robot Helmet", "Healing Brew"]);
  });

  it("leaves Swedish unchanged when locale is sv", () => {
    assert.equal(localizeRewardDisplayTitle("Robothjälm", "sv"), "Robothjälm");
  });
});
