import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flushPenaltySipQueue } from "../dist/sipNotice.js";

describe("flushPenaltySipQueue table toast suppression", () => {
  it("marks plain queued sips with suppressTableToast (already toasted via tableOutcomes)", () => {
    const state = { sipNotices: [] };
    flushPenaltySipQueue(state, [
      { recipientId: "p1", klunkCount: 1, fromPlayerName: "Barkäbbel" },
      { recipientId: "p1", klunkCount: 2, fromPlayerName: "Astronomisk fylla" },
    ]);
    assert.equal(state.sipNotices.length, 2);
    for (const n of state.sipNotices) {
      assert.equal(n.suppressTableToast, true);
      assert.equal(n.title, undefined);
      assert.equal(n.body, undefined);
    }
    assert.equal(state.sipNotices[0].klunkCount, 1);
    assert.equal(state.sipNotices[1].klunkCount, 2);
  });

  it("keeps custom-copy entries as player notices without the flag", () => {
    const state = { sipNotices: [] };
    flushPenaltySipQueue(state, [
      {
        recipientId: "p1",
        klunkCount: 1,
        fromPlayerName: "Striden",
        noticeBody: "En straffklunk från Ölsejdel. +10 XP.",
      },
    ]);
    assert.equal(state.sipNotices.length, 1);
    assert.equal(state.sipNotices[0].suppressTableToast, undefined);
    assert.equal(state.sipNotices[0].title, "Straffklunk");
  });
});
