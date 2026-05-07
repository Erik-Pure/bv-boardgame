import { brewerLevel, type Player } from "@bv/game-core";
import { StatIcon } from "./StatIcon";
import { sv } from "../lib/uiStrings";

/** Röd ton för stupad bryggare (dödskalle). */
const SKULL_ELIMINATED_FILTER =
  "brightness(0) saturate(100%) invert(18%) sepia(96%) saturate(7454%) hue-rotate(357deg) brightness(95%) contrast(104%)";

export function EndedScoreboardPlayerLine(props: { player: Player; isWinner: boolean }) {
  const p = props.player;
  const eliminated = p.eliminated === true;
  const brewLv = Math.max(1, brewerLevel(p));
  return (
    <>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
        {eliminated ? (
          <img
            src="/icons/skull-icon.svg"
            alt=""
            aria-hidden
            width={18}
            height={18}
            style={{ flexShrink: 0, display: "block", filter: SKULL_ELIMINATED_FILTER }}
          />
        ) : null}
        <span style={{ fontWeight: props.isWinner ? 800 : 600 }}>{p.name}</span>
        {props.isWinner ? <span aria-hidden>{" 🏆"}</span> : null}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          marginLeft: "auto",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          aria-label={sv.play.scoreboardBrewerLevelAria(brewLv)}
        >
          <img
            src="/icons/lvlup.svg"
            alt=""
            aria-hidden
            width={18}
            height={18}
            draggable={false}
            style={{ display: "block", flexShrink: 0, filter: "brightness(0) invert(1)", opacity: 0.92 }}
          />
          <span style={{ fontWeight: 700 }}>{brewLv}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <StatIcon kind="klunk" size={20} />
          {p.klunkar}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <StatIcon kind="pant" size={20} />
          {p.gold}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <StatIcon kind="hp" size={20} />
          {p.hp}/{p.maxHp}
        </span>
      </span>
    </>
  );
}
