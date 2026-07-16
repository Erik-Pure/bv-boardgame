import type { ReactNode } from "react";
import { CardArtAttribution } from "./CardArtAttribution";
import { artAttributionLabel, artImageSources } from "../lib/cardArt";
import { FINAL_BOSS_LIFE_TOTAL } from "@bv/game-core";
import { monsterSpecialRulesForDisplay } from "../lib/monsterCardCopy";
import { CARD_BODY_TEXT_STYLE } from "../lib/cardTypography";
import { CardRichText } from "./CardRichText";
import { PictureImg } from "./PictureImg";
import styles from "./MonsterEncounterCard.module.css";

const ICON = {
  combat: "/icons/combat-icon.svg",
  monster: "/icons/monster-icon.svg",
  thumbUp: "/icons/thumbup-icon.svg",
  thumbDown: "/icons/thumbdown-icon.svg",
  pant: "/icons/pant-icon.svg",
  reward: "/icons/reward-icon.svg",
  xp: "/icons/lvlup.svg",
  klunk: "/icons/klunk-icon.svg",
  heart: "/icons/heart-icon.svg",
};

/** Svarta SVG:er → ljusa ikoner på mörka eller mättade bakgrunder. */
const ICON_LIGHT = "brightness(0) invert(1)";

const THUMB_BADGE_WIN_BG = "#16a34a";
const THUMB_BADGE_LOSS_BG = "#dc2626";
const MONSTER_ICON_TINT = "#ef4444";

const MONSTER_HEADER_ICON_SIZE = 24;

/** ~55% av tidigare badge — lite större än exakt hälften. */
const THUMB_ICON_SIZE = 10;

const STAT_ICON_TINT: Record<"pant" | "reward" | "xp" | "klunk" | "heart", string> = {
  pant: "#d1d5db",
  reward: "#fbb040",
  xp: "#60a5fa",
  klunk: "#fbb040",
  heart: "#ee5aa6",
};

function MaskedStatIcon({
  src,
  color,
  size = 22,
}: {
  src: string;
  color: string;
  size?: number | string;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: color,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

function StatChip({
  kind,
  value,
  emDash,
  dense,
}: {
  kind: keyof typeof STAT_ICON_TINT;
  value: number;
  emDash?: boolean;
  /** Matchar styrke-pill `size="sm"` (mobil under namn). */
  dense?: boolean;
}) {
  const src = ICON[kind];
  const label = emDash ? "—" : value === 0 ? "-" : String(value);
  const compactNums = !emDash && label.length >= 3;
  const iconSize = dense ? (compactNums ? 15 : 17) : compactNums ? "clamp(14px, 4.0cqw, 17px)" : "clamp(15px, 4.5cqw, 19px)";
  const fontSize = dense ? (compactNums ? 13 : 15) : compactNums ? "clamp(12px, 3.6cqw, 15px)" : "clamp(13px, 4.1cqw, 17px)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: dense ? 3 : compactNums ? 3 : 5 }}>
      <MaskedStatIcon src={src} color={STAT_ICON_TINT[kind]} size={iconSize} />
      <span
        style={{
          fontWeight: 900,
          fontSize,
          lineHeight: 1,
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
          minWidth: compactNums ? "0.85em" : "1em",
          display: "inline-block",
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/** Svärd + styrkesiffra med samma pill-ram som på monsterkortet. */
export function CombatStrengthPill(props: { value: number; className?: string; size?: "sm" }) {
  const sm = props.size === "sm";
  return (
    <span
      className={[styles.combatStrengthPill, sm ? styles.combatStrengthPillSm : "", props.className]
        .filter(Boolean)
        .join(" ")}
    >
      <img
        src={ICON.combat}
        alt=""
        width={sm ? 18 : 22}
        height={sm ? 18 : 22}
        draggable={false}
        className={[styles.combatStrengthIcon, sm ? styles.combatStrengthIconSm : ""].filter(Boolean).join(" ")}
      />
      <span
        className={[styles.combatStrengthValue, sm ? styles.combatStrengthValueSm : ""].filter(Boolean).join(" ")}
      >
        {props.value}
      </span>
    </span>
  );
}

export type MonsterCombatOutcomeRowProps = {
  winGold: number;
  winItems: number;
  winXp: number;
  lossDamage: number;
  lossKlunks: number;
  /** Slutboss: visa — i vinstrutan (pant + skatter). */
  bossWinLootAsDash?: boolean;
  /** Tätare, innehållsbredd (t.ex. under monsternamn i mobil). */
  compact?: boolean;
};

/** Vinst- och förlust-rutor med ikoner/siffror — samma som på monsterkortet. */
export function MonsterCombatOutcomeRow(props: MonsterCombatOutcomeRowProps) {
  const hasWin = props.bossWinLootAsDash || props.winGold > 0 || props.winItems > 0 || props.winXp > 0;
  const hasLoss = props.lossDamage > 0 || props.lossKlunks > 0;
  if (!hasWin && !hasLoss) return null;

  const compact = !!props.compact;

  const badge = (src: string, solidBg: string, iconNudgeY: number) => (
    <div
      className={[styles.outcomeThumbBadge, compact ? styles.outcomeThumbBadgeCompact : ""].filter(Boolean).join(" ")}
      style={{ borderColor: solidBg, background: solidBg }}
    >
      <img
        src={src}
        alt=""
        width={compact ? 9 : THUMB_ICON_SIZE}
        height={compact ? 9 : THUMB_ICON_SIZE}
        draggable={false}
        style={{
          display: "block",
          filter: ICON_LIGHT,
          transform: `translateY(${iconNudgeY * (compact ? 0.75 : 1)}px)`,
        }}
      />
    </div>
  );

  const outcomeBox = (
    border: string,
    bg: string,
    thumbSrc: string,
    thumbBadgeBg: string,
    thumbNudgeY: number,
    cells: ReactNode[],
  ) => (
    <div
      className={[
        styles.outcomeBox,
        compact ? styles.outcomeBoxCompactWidth : "",
        compact ? styles.outcomeBoxCompactScale : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        marginTop: compact ? 6 : 12,
        border: `${compact ? 1.5 : 2}px solid ${border}`,
        background: bg,
      }}
    >
      {badge(thumbSrc, thumbBadgeBg, thumbNudgeY)}
      <div className={[styles.outcomeBoxRow, compact ? styles.outcomeBoxRowCompact : ""].filter(Boolean).join(" ")}>
        {cells.map((cell, idx) => (
          <div key={idx} className={[styles.outcomeBoxCell, compact ? styles.outcomeBoxCellCompact : ""].filter(Boolean).join(" ")}>
            {cell}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className={[styles.outcomeRow, compact ? styles.outcomeRowCompact : ""].filter(Boolean).join(" ")}
      style={
        compact
          ? undefined
          : {
              gridTemplateColumns: hasWin && hasLoss ? "minmax(0, 3fr) minmax(0, 2fr)" : "minmax(0,1fr)",
            }
      }
    >
      {hasWin
        ? outcomeBox(
            "rgba(34, 197, 94, 0.75)",
            "rgba(6, 78, 59, 0.42)",
            ICON.thumbUp,
            THUMB_BADGE_WIN_BG,
            -1.5,
            [
              <StatChip key="pant" kind="pant" value={props.winGold} emDash={props.bossWinLootAsDash} dense={compact} />,
              <StatChip key="reward" kind="reward" value={props.winItems} emDash={props.bossWinLootAsDash} dense={compact} />,
              <StatChip key="xp" kind="xp" value={props.winXp} emDash={props.bossWinLootAsDash} dense={compact} />,
            ],
          )
        : null}
      {hasLoss
        ? outcomeBox(
            "rgba(248, 113, 113, 0.7)",
            "rgba(127, 29, 29, 0.45)",
            ICON.thumbDown,
            THUMB_BADGE_LOSS_BG,
            1.5,
            [
              <StatChip key="heart" kind="heart" value={props.lossDamage} dense={compact} />,
              <StatChip key="klunk" kind="klunk" value={props.lossKlunks} dense={compact} />,
            ],
          )
        : null}
    </div>
  );
}

export type MonsterEncounterCardProps = {
  title: string;
  artKey?: string;
  combatStrength: number;
  winGold: number;
  winItems: number;
  winXp: number;
  lossDamage: number;
  lossKlunks: number;
  /** Specialregler; standard vinst/förlust visas med ikoner ovan. */
  specialRules?: string;
  /** Slutboss: fyllda hjärtan = återstående liv (1–3). */
  bossLivesRemaining?: number;
  /** Slutboss: visa — i vinstrutan (pant + skatter) — vinst = spelet. */
  bossWinLootAsDash?: boolean;
  /** Visa egen ytterram/padding (default true). Sätt false när kortet redan ligger i en ramad modal. */
  framed?: boolean;
  /** När true: sträck till tillgänglig höjd (t.ex. CardFlipModalShell) och håll ölreferens längst ner. */
  fillAvailableHeight?: boolean;
  /** Bräd-tv: 1-baserad våning efter namnet, t.ex. Kapten Interrobang (3). */
  boardLevel?: number;
};

export function MonsterEncounterCard(props: MonsterEncounterCardProps) {
  const framed = props.framed !== false;
  const fill = !!props.fillAvailableHeight;
  const bossLives = props.bossLivesRemaining;
  const showBossHearts =
    typeof bossLives === "number" && bossLives >= 0 && Number.isFinite(bossLives);
  const heartsTotal = FINAL_BOSS_LIFE_TOTAL;
  const heartsFilled = Math.max(0, Math.min(heartsTotal, Math.floor(bossLives!)));
  const rulesForDisplay = monsterSpecialRulesForDisplay(props.specialRules);

  const showAttribution = !!artAttributionLabel(props.artKey);
  const artSources = artImageSources(props.artKey);

  return (
    <div className={[styles.wrap, fill && styles.wrapFill].filter(Boolean).join(" ")}>
      <div className={styles.spin} aria-hidden />
      <div
        className={styles.inner}
        style={{
          background: "var(--modal-panel-bg)",
          padding: framed ? 12 : 10,
          color: "#fff",
          overflow: "visible",
        }}
      >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              display: "block",
              width: MONSTER_HEADER_ICON_SIZE,
              height: MONSTER_HEADER_ICON_SIZE,
              flexShrink: 0,
              backgroundColor: MONSTER_ICON_TINT,
              maskImage: `url(${ICON.monster})`,
              WebkitMaskImage: `url(${ICON.monster})`,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              minWidth: 0,
            }}
          >
            <span className={styles.monsterTitleRow}>
              <span className={styles.monsterTitleName}>{props.title}</span>
              {props.boardLevel != null && Number.isFinite(props.boardLevel) ? (
                <span className={styles.boardLevelSuffix} aria-label={` våning ${props.boardLevel}`}>
                  ({props.boardLevel})
                </span>
              ) : null}
            </span>
            {showBossHearts ? (
              <span
                aria-label={`Bossliv: ${heartsFilled} av ${heartsTotal}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
              >
                {Array.from({ length: heartsTotal }, (_, i) => (
                  <MaskedStatIcon
                    key={i}
                    src={ICON.heart}
                    color={i < heartsFilled ? STAT_ICON_TINT.heart : "rgba(148, 163, 184, 0.35)"}
                    size={22}
                  />
                ))}
              </span>
            ) : null}
          </div>
        </div>
        <CombatStrengthPill value={props.combatStrength} />
      </div>

      <div
        style={{
          width: "100%",
          margin: "0 0 14px",
          aspectRatio: "4/3",
          borderRadius: 14,
          overflow: "hidden",
          border: "none",
          background: "rgba(255,255,255,0.92)",
          boxSizing: "border-box",
        }}
      >
        <PictureImg
          sources={artSources}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
          }}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
      </div>

      <MonsterCombatOutcomeRow
        winGold={props.winGold}
        winItems={props.winItems}
        winXp={props.winXp}
        lossDamage={props.lossDamage}
        lossKlunks={props.lossKlunks}
        bossWinLootAsDash={props.bossWinLootAsDash}
      />

      {rulesForDisplay ? (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            textAlign: "left",
          }}
        >
          <CardRichText
            text={rulesForDisplay}
            style={{
              ...CARD_BODY_TEXT_STYLE,
              color: "#fff",
              opacity: 0.95,
              fontSize: "clamp(12px, 4.1cqw, 15px)",
            }}
          />
        </div>
      ) : null}
      {fill ? <div style={{ flex: "1 1 0", minHeight: 0 }} aria-hidden /> : null}
      {showAttribution ? (
        <div
          style={{
            marginTop: fill ? 0 : 14,
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
          }}
        >
          <CardArtAttribution artKey={props.artKey} dense />
        </div>
      ) : null}
      </div>
    </div>
  );
}
