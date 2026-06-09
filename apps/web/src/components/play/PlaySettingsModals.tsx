import { ArcadeButton } from "../ArcadeButton";
import { PlayModal } from "./PlayModal";
import { readBoardPerformancePrefs, writeMobileSfxEnabled } from "../../lib/boardPerformancePrefs";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { sv, wsStatusLabel } from "../../lib/uiStrings";

export function PlaySettingsModals(props: {
  cardCoverId: string | undefined;
  room: string;
  status: string;
  footerTurnCaption: string | null;
  showSettings: boolean;
  onCloseSettings: () => void;
  showLeaveConfirm: boolean;
  onCloseLeaveConfirm: () => void;
  onConfirmLeave: () => void;
  rainbowEffectsEnabled: boolean;
  onRainbowEffectsChange: (enabled: boolean) => void;
  mobileSfxEnabled: boolean;
  onMobileSfxChange: (enabled: boolean) => void;
  onOpenTutorial: () => void;
  onRequestLeave: () => void;
}) {
  const {
    cardCoverId,
    room,
    status,
    footerTurnCaption,
    showSettings,
    onCloseSettings,
    showLeaveConfirm,
    onCloseLeaveConfirm,
    onConfirmLeave,
    rainbowEffectsEnabled,
    onRainbowEffectsChange,
    mobileSfxEnabled,
    onMobileSfxChange,
    onOpenTutorial,
    onRequestLeave,
  } = props;

  return (
    <>
      {showSettings ? (
        <PlayModal cardCoverId={cardCoverId} title={sv.play.settingsTitle} onClose={onCloseSettings} instantFront>
          <div className={u.stack12}>
            <label className={styles.settingsToggleRow}>
              <span className={styles.settingsStrongLine}>{sv.play.settingsRainbowEffects}</span>
              <input
                type="checkbox"
                checked={rainbowEffectsEnabled}
                onChange={(e) => onRainbowEffectsChange(e.currentTarget.checked)}
              />
            </label>
            <label className={styles.settingsToggleRow}>
              <span className={styles.settingsStrongLine}>{sv.play.settingsMobileSfx}</span>
              <input
                type="checkbox"
                checked={mobileSfxEnabled}
                onChange={(e) => {
                  writeMobileSfxEnabled(e.currentTarget.checked);
                  onMobileSfxChange(readBoardPerformancePrefs().mobileSfxEnabled);
                }}
              />
            </label>

            <div className={styles.settingsStatusCard}>
              <div className={styles.settingsMutedLabel}>{sv.play.settingsLobbyStatus}</div>
              <div className={styles.settingsStrongLine}>{sv.play.lobbyHeader(room, wsStatusLabel(status))}</div>
              {footerTurnCaption ? (
                <>
                  <div className={styles.settingsMutedLabelSpaced}>{sv.play.settingsTurnStatus}</div>
                  <div className={styles.settingsStrongLine}>{footerTurnCaption}</div>
                </>
              ) : null}
            </div>

            <ArcadeButton variant="gray" fullWidth onClick={onOpenTutorial}>
              {sv.play.settingsOpenTutorial}
            </ArcadeButton>

            <ArcadeButton variant="gray" fullWidth onClick={onRequestLeave}>
              {sv.play.settingsLeaveGame}
            </ArcadeButton>
          </div>
        </PlayModal>
      ) : null}

      {showLeaveConfirm ? (
        <PlayModal cardCoverId={cardCoverId} title={sv.play.settingsLeaveGame} onClose={onCloseLeaveConfirm} instantFront>
          <div className={u.stack12}>
            <div className={`${u.o9} ${u.fs14}`}>Är du säker på att du vill lämna spelet?</div>
            <ArcadeButton variant="pink" fullWidth onClick={onConfirmLeave}>
              {sv.play.settingsLeaveGame}
            </ArcadeButton>
            <ArcadeButton variant="gray" fullWidth onClick={onCloseLeaveConfirm}>
              Avbryt
            </ArcadeButton>
          </div>
        </PlayModal>
      ) : null}
    </>
  );
}
