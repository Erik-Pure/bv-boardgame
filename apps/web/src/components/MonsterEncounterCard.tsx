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
const THUMB_BADGE_SIZE = 20;
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

function StatChip({ kind, value, emDash }: { kind: keyof typeof STAT_ICON_TINT; value: number; emDash?: boolean }) {
  const src = ICON[kind];
  const label = emDash ? "—" : value === 0 ? "-" : String(value);
  const compact = !emDash && label.length >= 3;
  // Container-query units: kortet ligger i `CardFlipModalShell` där `.faceInner` är en container.
  // Gör att iPhone SE får mindre stats-siffror utan att påverka stora skärmar.
  const iconSize = compact ? "clamp(14px, 4.0cqw, 17px)" : "clamp(15px, 4.5cqw, 19px)";
  const fontSize = compact ? "clamp(12px, 3.6cqw, 15px)" : "clamp(13px, 4.1cqw, 17px)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 3 : 5 }}>
      <MaskedStatIcon src={src} color={STAT_ICON_TINT[kind]} size={iconSize} />
      <span
        style={{
          fontWeight: 900,
          fontSize,
          lineHeight: 1,
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
          minWidth: compact ? "0.85em" : "1em",
          display: "inline-block",
          textAlign: "center",
        }}
      >
        {label}
      </span>
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
  const hasWin = props.bossWinLootAsDash || props.winGold > 0 || props.winItems > 0 || props.winXp > 0;
  const hasLoss = props.lossDamage > 0 || props.lossKlunks > 0;
  const rulesForDisplay = monsterSpecialRulesForDisplay(props.specialRules);

  const badge = (src: string, solidBg: string, iconNudgeY: number) => (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        transform: "translate(-50%, -50%)",
        width: THUMB_BADGE_SIZE,
        height: THUMB_BADGE_SIZE,
        borderRadius: "50%",
        border: `1px solid ${solidBg}`,
        background: solidBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
      }}
    >
      <img
        src={src}
        alt=""
        width={THUMB_ICON_SIZE}
        height={THUMB_ICON_SIZE}
        draggable={false}
        style={{
          display: "block",
          filter: ICON_LIGHT,
          transform: `translateY(${iconNudgeY}px)`,
        }}
      />
    </div>
  );

  const outcomeColumnStyle = {
    flex: "1 1 0%",
    minWidth: 0,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  const outcomeBox = (
    border: string,
    bg: string,
    thumbSrc: string,
    thumbBadgeBg: string,
    thumbNudgeY: number,
    cells: ReactNode[],
  ) => (
    <div
      style={{
        position: "relative",
        minWidth: 0,
        marginTop: 12,
        padding: "11px 10px 9px",
        borderRadius: 14,
        border: `2px solid ${border}`,
        background: bg,
        boxSizing: "border-box",
      }}
    >
      {badge(thumbSrc, thumbBadgeBg, thumbNudgeY)}
      <div style={{ display: "flex", flexDirection: "row", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
        {cells.map((cell, idx) => (
          <div key={idx} style={outcomeColumnStyle}>
            {cell}
          </div>
        ))}
      </div>
    </div>
  );

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
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid rgba(167, 139, 250, 0.65)",
            background: "rgba(67, 56, 202, 0.22)",
          }}
        >
          <img
            src={ICON.combat}
            alt=""
            width={22}
            height={22}
            draggable={false}
            style={{ filter: ICON_LIGHT }}
          />
          <span style={{ fontWeight: 900, fontSize: "clamp(16px, 5.4cqw, 20px)", lineHeight: 1, color: "#e9d5ff" }}>
            {props.combatStrength}
          </span>
        </div>
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

      {hasWin || hasLoss ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: hasWin && hasLoss ? "minmax(0, 3fr) minmax(0, 2fr)" : "minmax(0,1fr)",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          {hasWin
            ? outcomeBox(
                "rgba(34, 197, 94, 0.75)",
                "rgba(6, 78, 59, 0.42)",
                ICON.thumbUp,
                THUMB_BADGE_WIN_BG,
                -1.5,
                [
                  <StatChip key="pant" kind="pant" value={props.winGold} emDash={props.bossWinLootAsDash} />,
                  <StatChip key="reward" kind="reward" value={props.winItems} emDash={props.bossWinLootAsDash} />,
                  <StatChip key="xp" kind="xp" value={props.winXp} emDash={props.bossWinLootAsDash} />,
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
                [<StatChip key="heart" kind="heart" value={props.lossDamage} />, <StatChip key="klunk" kind="klunk" value={props.lossKlunks} />],
              )
            : null}
        </div>
      ) : null}

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
