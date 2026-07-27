import {
  getEquipmentDisplayByEquippedName,
  isPlayerOnBoard,
  playerPant,
  type GameState,
} from "@bv/game-core";
import { StatIcon } from "../StatIcon";
import { PlayModal } from "./PlayModal";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { useLocale, useUiStrings } from "../../lib/locale/LocaleContext";

function equipDisplayName(name: string | undefined, locale: ReturnType<typeof useLocale>): string {
  if (!name) return "—";
  return getEquipmentDisplayByEquippedName(name, locale)?.name ?? name;
}

export function PlayPlayersModal(props: {
  open: boolean;
  state: GameState;
  cardCoverId: string | undefined;
  onClose: () => void;
}) {
  const locale = useLocale();
  const ui = useUiStrings();
  const { open, state, cardCoverId, onClose } = props;
  if (!open) return null;

  return (
    <PlayModal cardCoverId={cardCoverId} title={ui.play.modalPlayers} onClose={onClose} instantFront>
      <div className={u.stack10}>
        {state.players.map((p) => {
          const outOfGame = !isPlayerOnBoard(p);
          const leftVoluntary = p.leftVoluntarily === true;
          const outTag = leftVoluntary ? ui.festDashboard.left : ui.festDashboard.eliminated;
          return (
            <div
              key={p.id}
              className={[styles.playersCard, outOfGame ? styles.playersCardOutOfGame : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.playersHeaderRow}>
                <span className={styles.playersColorDot} style={{ background: p.color }} />
                {outOfGame ? (
                  leftVoluntary ? (
                    <img
                      src="/icons/door-exit.svg"
                      alt={ui.play.scoreboardLeftGameAria}
                      title={ui.play.scoreboardLeftGameAria}
                      width={16}
                      height={16}
                      className={styles.playersOutIcon}
                    />
                  ) : (
                    <img
                      src="/icons/skull-icon.svg"
                      alt=""
                      aria-hidden
                      width={16}
                      height={16}
                      className={styles.playersOutIcon}
                    />
                  )
                ) : null}
                <div className={styles.playersName}>
                  {p.name}
                  {outOfGame ? ` · ${outTag}` : ""}{" "}
                  {p.isHost ? ui.play.hostTag : ""} {p.ready && !outOfGame ? "✅" : ""}
                </div>
                {!outOfGame ? (
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
                ) : null}
              </div>
              {!outOfGame ? (
                <div className={u.grid2Eq8Fs12}>
                  <div>
                    <b>{ui.play.equipWeapon}:</b> {equipDisplayName(p.equipment.weapon?.name, locale)}
                  </div>
                  <div>
                    <b>{ui.play.equipArmor}:</b> {equipDisplayName(p.equipment.armor?.name, locale)}
                  </div>
                  <div>
                    <b>{ui.play.equipHelmet}:</b> {equipDisplayName(p.equipment.helmet?.name, locale)}
                  </div>
                  <div>
                    <b>{ui.play.equipAccessory}:</b> {equipDisplayName(p.equipment.accessory?.name, locale)}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </PlayModal>
  );
}
