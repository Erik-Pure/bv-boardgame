import type { GameState, Player } from "@bv/game-core";
import { useUiStrings } from "../../lib/locale/LocaleContext";
import { capitalizeWord } from "../../lib/uiStrings";

type CombatEnemyIntroPending = Extract<NonNullable<GameState["pending"]>, { type: "combat" }>;

export function CombatEnemyIntroWaiting(props: {
  state: GameState;
  me: Player;
  pending: CombatEnemyIntroPending;
}) {
  const ui = useUiStrings();
  const { state, me, pending } = props;
  const isAttacker = pending.attackerId === me.id;
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  if (isAttacker) return null;
  return (
    <div style={{ textAlign: "center", opacity: 0.85 }}>
      {ui.play.attackerViewingEncounter(attacker?.name ?? capitalizeWord(ui.play.theAttacker))}
    </div>
  );
}

