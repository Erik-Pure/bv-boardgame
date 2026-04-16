import type { GameState, Player } from "@bv/game-core";
import { capitalizeWord, sv } from "../../lib/uiStrings";

type CombatEnemyIntroPending = {
  type: "combat";
  phase: "chooseTeammate" | "enemyIntro" | "reactions" | "rollPreview" | "chooseHitMitigation";
  attackerId: string;
};

export function CombatEnemyIntroWaiting(props: {
  state: GameState;
  me: Player;
  pending: CombatEnemyIntroPending;
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

