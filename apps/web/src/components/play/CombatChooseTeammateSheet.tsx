import type { ClientAction, GameState, Player } from "@bv/game-core";
import { ArcadeButton } from "../ArcadeButton";
import { capitalizeWord, sv } from "../../lib/uiStrings";

type CombatChooseTeammatePending = {
  type: "combat";
  phase: "chooseTeammate" | "enemyIntro" | "reactions" | "rollPreview" | "chooseHitMitigation";
  attackerId: string;
};

export function CombatChooseTeammateSheet(props: {
  state: GameState;
  me: Player;
  pending: CombatChooseTeammatePending;
  send: (action: ClientAction) => void;
}) {
  const { state, me, pending, send } = props;
  const isAttacker = pending.attackerId === me.id;
  const attacker = state.players.find((p) => p.id === pending.attackerId);
  const options = state.players.filter((p) => p.id !== pending.attackerId);
  if (isAttacker) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ textAlign: "center", opacity: 0.95 }}>{sv.play.chooseTeammate}</div>
        <div style={{ textAlign: "center", opacity: 0.78, fontSize: 13 }}>{sv.play.teammateMustFight}</div>
        <div style={{ display: "grid", gap: 8 }}>
          {options.map((p) => (
            <ArcadeButton
              key={p.id}
              variant="blue"
              fullWidth
              onClick={() => send({ type: "chooseCombatTeammate", playerId: me.id, teammateId: p.id })}
            >
              {p.name}
            </ArcadeButton>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", opacity: 0.85 }}>
      {sv.play.waitAttackerChooseTeammate(attacker?.name ?? capitalizeWord(sv.play.theAttacker))}
    </div>
  );
}

