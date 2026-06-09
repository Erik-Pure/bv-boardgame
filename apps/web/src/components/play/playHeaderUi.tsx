import { LevelRingCell } from "../LevelRingCell";
import { StatIcon, type StatIconKind } from "../StatIcon";
import { UserMenuIcon } from "../UserMenuIcon";
import { playerPant, type Player } from "@bv/game-core";
import type { StatFlash } from "./playInventoryUi";
import styles from "../../routes/PlayView.module.css";
import { sv } from "../../lib/uiStrings";

function statsRadialToneClass(icon: StatIconKind, flash: "up" | "down"): string | null {
  const map: Partial<Record<StatIconKind, Record<"up" | "down", string>>> = {
    hp: { up: styles.statsRadialHpUp, down: styles.statsRadialHpDown },
    pant: { up: styles.statsRadialPantUp, down: styles.statsRadialPantDown },
    klunk: { up: styles.statsRadialKlunkUp, down: styles.statsRadialKlunkDown },
  };
  return map[icon]?.[flash] ?? null;
}

function PlayerStatCell(props: {
  ariaLabel: string;
  value: string;
  valueMutedSuffix?: string;
  lowHpDanger?: boolean;
  icon: StatIconKind;
  iconSize?: number;
  flash?: StatFlash;
  flashKey?: number;
}) {
  const sz = props.iconSize ?? 40;
  const flash = props.flash ?? null;
  const radialTone = flash ? statsRadialToneClass(props.icon, flash) : null;
  const danger = !!props.lowHpDanger;
  const valueEl =
    props.valueMutedSuffix != null ? (
      <span className={styles.statsCellValueRow}>
        {danger ? (
          <span className={styles.statsHpCurrentWrap}>
            <span className={styles.statsHpDangerGlow} aria-hidden />
            <span className={`${styles.statsCellValue} ${styles.statsCellValueDanger}`}>{props.value}</span>
          </span>
        ) : (
          <span className={styles.statsCellValue}>{props.value}</span>
        )}
        <span className={styles.statsCellValueMuted}>{props.valueMutedSuffix}</span>
      </span>
    ) : (
      <span className={styles.statsCellValue}>{props.value}</span>
    );
  return (
    <div className={styles.statsCell} role="group" aria-label={props.ariaLabel}>
      <div className={styles.statsCellIconSlot}>
        {flash && radialTone ? (
          <div
            key={props.flashKey ?? 0}
            className={`${styles.statsCellRadial} ${radialTone} ${styles.statsCellRadialRun}`}
            aria-hidden
          />
        ) : null}
        <div className={flash ? styles.statIconWobble : styles.statsCellIconBare}>
          <StatIcon kind={props.icon} size={sz} />
        </div>
      </div>
      {valueEl}
    </div>
  );
}

export function SettingsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.8l2.2 1 .5 2.4 2.2.9 2-1.3 1.8 1.8-1.2 2 .9 2.2 2.3.5v2.6l-2.3.5-.9 2.2 1.2 2-1.8 1.8-2-1.3-2.2.9-.5 2.4-2.2 1-2.2-1-.5-2.4-2.2-.9-2 1.3-1.8-1.8 1.2-2-.9-2.2-2.3-.5v-2.6l2.3-.5.9-2.2-1.2-2L5.1 4.8l2 1.3 2.2-.9.5-2.4z" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  );
}

export function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2.1">
      {collapsed ? <path d="M6 14l6-6 6 6" /> : <path d="M6 10l6 6 6-6" />}
    </svg>
  );
}

export function PlayHeader(props: {
  me: Player | null;
  displayName: string;
  headerStatusTag: string;
  showHeaderStatsBar: boolean;
  hasState: boolean;
  onOpenSettings: () => void;
  onOpenPlayers: () => void;
  hpFlash: StatFlash;
  hpFlashKey: number;
  pantFlash: StatFlash;
  pantFlashKey: number;
  klunkFlash: StatFlash;
  klunkFlashKey: number;
  brewerLevel: number;
  brewerRatio: number;
  xpGainPromptText: string | null;
  xpGainPromptKey: number;
}) {
  const {
    me,
    displayName,
    headerStatusTag,
    showHeaderStatsBar,
    hasState,
    onOpenSettings,
    onOpenPlayers,
    hpFlash,
    hpFlashKey,
    pantFlash,
    pantFlashKey,
    klunkFlash,
    klunkFlashKey,
    brewerLevel,
    brewerRatio,
    xpGainPromptText,
    xpGainPromptKey,
  } = props;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.22)",
      }}
    >
      <div
        style={{
          background: me?.color ?? "rgba(30, 41, 59, 0.96)",
          borderBottom: showHeaderStatsBar ? undefined : "1px solid rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            maxWidth: 740,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <button
            type="button"
            aria-label={sv.play.settings}
            title={sv.play.settings}
            onClick={onOpenSettings}
            className={styles.headerPlayersBtn}
          >
            <SettingsIcon size={22} />
          </button>
          <div
            style={{
              fontFamily: "var(--heading)",
              fontWeight: 500,
              fontSize: 22,
              lineHeight: 1.05,
              letterSpacing: 0.04,
              color: "#ffffff",
              textShadow: "0 1px 2px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.2)",
              flex: "1 1 auto",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {me?.name ?? displayName}
            {headerStatusTag ? ` ${headerStatusTag}` : ""}
          </div>
          <button
            type="button"
            aria-label={sv.play.players}
            title={sv.play.players}
            disabled={!hasState}
            onClick={onOpenPlayers}
            className={styles.headerPlayersBtn}
          >
            <UserMenuIcon size={26} />
          </button>
        </div>
      </div>
      {showHeaderStatsBar && me ? (
        <div className={styles.headerStatsBar}>
          <div className={styles.headerStatsInner}>
            <div className={styles.statsStrip}>
              <PlayerStatCell
                ariaLabel={`HP ${me.hp}/${me.maxHp}`}
                value={String(me.hp)}
                valueMutedSuffix={`/${me.maxHp}`}
                icon="hp"
                flash={hpFlash}
                flashKey={hpFlashKey}
                iconSize={32}
                lowHpDanger={me.hp <= 3}
              />
              <PlayerStatCell
                ariaLabel={`${sv.play.pant} ${playerPant(me)}`}
                value={String(playerPant(me))}
                icon="pant"
                flash={pantFlash}
                flashKey={pantFlashKey}
                iconSize={32}
              />
              <PlayerStatCell
                ariaLabel={`${sv.play.klunkar} ${me.klunkar}`}
                value={String(me.klunkar)}
                icon="klunk"
                flash={klunkFlash}
                flashKey={klunkFlashKey}
                iconSize={32}
              />
              <div className={styles.levelRingCellWrap}>
                <LevelRingCell
                  ariaLabel={sv.play.levelUpProgressAria(brewerLevel)}
                  level={brewerLevel}
                  ratio={brewerRatio}
                />
                {xpGainPromptText ? (
                  <div key={xpGainPromptKey} className={styles.levelXpGainPrompt} aria-live="polite">
                    {xpGainPromptText}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
