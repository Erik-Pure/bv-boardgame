import type { GameState, Pending, Player } from "@bv/game-core";

export function findMe(state: GameState | null, myId: string | null): Player | null {
  if (!state || !myId) return null;
  return state.players.find((p) => p.id === myId) ?? null;
}

export function myPersonalTurnPrompt(state: GameState | null, me: Player | null) {
  if (!state || !me) return null;
  const mine: Array<Extract<Pending, { type: "brewerPerkChoice" | "levelUpOffer" }>> = [];
  const off = state.offTurnPersonalPending;
  if (
    off &&
    off.playerId === me.id &&
    (off.type === "brewerPerkChoice" || off.type === "levelUpOffer")
  ) {
    mine.push(off);
  }
  const p = state.pending;
  if (
    p &&
    (p.type === "levelUpOffer" || p.type === "brewerPerkChoice") &&
    p.playerId === me.id
  ) {
    mine.push(p);
  }
  return (
    mine.find((x) => x.type === "brewerPerkChoice") ??
    mine.find((x) => x.type === "levelUpOffer") ??
    null
  );
}
