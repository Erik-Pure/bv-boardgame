import { playerPant, type GameState } from "@bv/game-core";
import { StatIcon } from "../StatIcon";
import { PlayModal } from "./PlayModal";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { sv } from "../../lib/uiStrings";

export function PlayPlayersModal(props: {
  open: boolean;
  state: GameState;
  cardCoverId: string | undefined;
  onClose: () => void;
}) {
  const { open, state, cardCoverId, onClose } = props;
  if (!open) return null;

  return (
    <PlayModal cardCoverId={cardCoverId} title={sv.play.modalPlayers} onClose={onClose} instantFront>
      <div className={u.stack10}>
        {state.players.map((p) => (
          <div key={p.id} className={styles.playersCard}>
            <div className={styles.playersHeaderRow}>
              <span className={styles.playersColorDot} style={{ background: p.color }} />
              <div className={styles.playersName}>
                {p.name} {p.isHost ? sv.play.hostTag : ""} {p.ready ? "✅" : ""}
              </div>
              <div className={styles.playersStats}>
                <span className={styles.playersStatItem}>
                  <StatIcon kind="hp" size={15} />
                  <span>
                    {p.hp}/{p.maxHp}
                  </span>
                </span>
                <span className={styles.playersStatItem}>
                  <StatIcon kind="pant" size={15} />
                  <span>{playerPant(p)}</span>
                </span>
                <span className={styles.playersStatItem}>
                  <StatIcon kind="klunk" size={15} />
                  <span>{p.klunkar}</span>
                </span>
              </div>
            </div>
            <div className={u.grid2Eq8Fs12}>
              <div>
                <b>{sv.play.equipWeapon}:</b> {p.equipment.weapon?.name ?? "—"}
              </div>
              <div>
                <b>{sv.play.equipArmor}:</b> {p.equipment.armor?.name ?? "—"}
              </div>
              <div>
                <b>{sv.play.equipHelmet}:</b> {p.equipment.helmet?.name ?? "—"}
              </div>
              <div>
                <b>{sv.play.equipAccessory}:</b> {p.equipment.accessory?.name ?? "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PlayModal>
  );
}
