import { ArcadeButton } from "../ArcadeButton";
import { PlayModal } from "./PlayModal";
import { readBoardPerformancePrefs, writeBoardAnimationsEnabled, writeMobileSfxEnabled } from "../../lib/boardPerformancePrefs";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { useUiStrings, useLocale, useSetLocale } from "../../lib/locale/LocaleContext";
import { wsStatusLabel } from "../../lib/uiStrings";

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
  boardAnimationsEnabled: boolean;
  mobileSfxEnabled: boolean;
  onMobileSfxChange: (enabled: boolean) => void;
  onOpenTutorial: () => void;
  onRequestLeave: () => void;
}) {
  const ui = useUiStrings();
  const locale = useLocale();
  const setLocale = useSetLocale();
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
    boardAnimationsEnabled,
    mobileSfxEnabled,
    onMobileSfxChange,
    onOpenTutorial,
    onRequestLeave,
  } = props;

  return (
    <>
      {showSettings ? (
        <PlayModal cardCoverId={cardCoverId} title={ui.play.settingsTitle} onClose={onCloseSettings} instantFront>
          <div className={u.stack12}>
            <div className={styles.settingsLanguageRow}>
              <span className={styles.settingsStrongLine}>{ui.play.settingsLanguage}</span>
              <div
                className={styles.settingsLanguageToggle}
                role="group"
                aria-label={ui.home.languageLabel}
              >
                <button
                  type="button"
                  className={locale === "sv" ? styles.settingsLanguageBtnActive : styles.settingsLanguageBtn}
                  onClick={() => setLocale("sv")}
                  aria-pressed={locale === "sv"}
                >
                  {ui.home.languageSv}
                </button>
                <span className={styles.settingsLanguageSep} aria-hidden>
                  |
                </span>
                <button
                  type="button"
                  className={locale === "en" ? styles.settingsLanguageBtnActive : styles.settingsLanguageBtn}
                  onClick={() => setLocale("en")}
                  aria-pressed={locale === "en"}
                >
                  {ui.home.languageEn}
                </button>
              </div>
            </div>

            <label className={styles.settingsToggleRow}>
              <span className={styles.settingsStrongLine}>{ui.play.settingsRainbowEffects}</span>
              <input
                type="checkbox"
                checked={rainbowEffectsEnabled}
                onChange={(e) => onRainbowEffectsChange(e.currentTarget.checked)}
              />
            </label>
            <label className={styles.settingsToggleRow}>
              <span className={styles.settingsStrongLine}>{ui.play.settingsDiceAnimations}</span>
              <input
                type="checkbox"
                checked={boardAnimationsEnabled}
                onChange={(e) => writeBoardAnimationsEnabled(e.currentTarget.checked)}
              />
            </label>
            <label className={styles.settingsToggleRow}>
              <span className={styles.settingsStrongLine}>{ui.play.settingsMobileSfx}</span>
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
              <div className={styles.settingsMutedLabel}>{ui.play.settingsLobbyStatus}</div>
              <div className={styles.settingsStrongLine}>{ui.play.lobbyHeader(room, wsStatusLabel(status, locale))}</div>
              {footerTurnCaption ? (
                <>
                  <div className={styles.settingsMutedLabelSpaced}>{ui.play.settingsTurnStatus}</div>
                  <div className={styles.settingsStrongLine}>{footerTurnCaption}</div>
                </>
              ) : null}
            </div>

            <ArcadeButton variant="gray" fullWidth onClick={onOpenTutorial}>
              {ui.play.settingsOpenTutorial}
            </ArcadeButton>

            <ArcadeButton variant="gray" fullWidth onClick={onRequestLeave}>
              {ui.play.settingsLeaveGame}
            </ArcadeButton>
          </div>
        </PlayModal>
      ) : null}

      {showLeaveConfirm ? (
        <PlayModal cardCoverId={cardCoverId} title={ui.play.settingsLeaveGame} onClose={onCloseLeaveConfirm} instantFront>
          <div className={u.stack12}>
            <div className={`${u.o9} ${u.fs14}`}>{ui.play.settingsLeaveGameConfirm}</div>
            <ArcadeButton variant="pink" fullWidth onClick={onConfirmLeave}>
              {ui.play.settingsLeaveGame}
            </ArcadeButton>
            <ArcadeButton variant="gray" fullWidth onClick={onCloseLeaveConfirm}>
              {ui.play.settingsLeaveGameCancel}
            </ArcadeButton>
          </div>
        </PlayModal>
      ) : null}
    </>
  );
}
