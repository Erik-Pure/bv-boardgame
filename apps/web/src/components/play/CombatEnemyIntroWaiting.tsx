import type { GameState, Player } from "@bv/game-core";
import { capitalizeWord, sv } from "../../lib/uiStrings";

export function CombatEnemyIntroWaiting(props: {
  state: GameState;
  me: Player;
  pending: Extract<NonNullable<GameState["pending"]>, { type: "combat"; phase: "enemyIntro" }>;
}) {
  const { state, me, pending } = props;
  const isAttacker = pending.attackerId === me.id;
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  if (isAttacker) return null;
  return (
    <div style={{ textAlign: "center", opacity: 0.85 }}>
      {sv.play.attackerViewingEncounter(attacker?.name ?? capitalizeWord(sv.play.theAttacker))}
    </div>
  );
}

