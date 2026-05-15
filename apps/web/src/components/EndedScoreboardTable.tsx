import {
  brewerKlunkProgressRatio,
  brewerLevel,
  DEFAULT_PLAYER_SESSION_STATS,
  type Player,
} from "@bv/game-core";
import { sv } from "../lib/uiStrings";
import styles from "./EndedScoreboard.module.css";
import { LevelRingCell } from "./LevelRingCell";

function ScoreboardIconHeader(props: {
  ariaLabel: string;
  src: string;
  alignLeft?: boolean;
  /** true: SVG med egna färger (klunk/pant/hp). false: vit silhuett (övriga kolumner). */
  colored?: boolean;
}) {
  const imgClass = props.colored
    ? [styles.headerIconColored, props.alignLeft ? styles.headerIconColoredLeft : ""].filter(Boolean).join(" ")
    : [styles.headerIcon, props.alignLeft ? styles.headerIconLeft : ""].filter(Boolean).join(" ");
  return (
    <th scope="col" aria-label={props.ariaLabel} className={styles.iconHeaderCell}>
      <img src={props.src} alt="" aria-hidden width={18} height={18} draggable={false} className={imgClass} />
    </th>
  );
}

/** Samma visningsnivå som mobil-header (intern nivå + 1, minimum 1). */
function brewerLevelForUi(player: Player): number {
  return Math.max(1, Math.floor(brewerLevel(player) || 0) + 1);
}

function sessionKlunkTotal(p: Player): number {
  const s = p.stats ?? DEFAULT_PLAYER_SESSION_STATS;
  return s.totalKlunksGained ?? 0;
}

function sortEndedPlayers(players: Player[], winnerId: string | null | undefined): Player[] {
  return [...players].sort((a, b) => {
    const w = winnerId;
    if (w) {
      if (a.id === w) return -1;
      if (b.id === w) return 1;
    }
    const aK = sessionKlunkTotal(a);
    const bK = sessionKlunkTotal(b);
    if (bK !== aK) return bK - aK;
    if (b.klunkar !== a.klunkar) return b.klunkar - a.klunkar;
    if (b.gold !== a.gold) return b.gold - a.gold;
    return a.name.localeCompare(b.name, "sv");
  });
}

export function EndedScoreboardTable(props: { players: Player[]; winnerId: string | null | undefined }) {
  const sorted = sortEndedPlayers(props.players, props.winnerId);

  return (
    <div className={styles.wrap}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>{sv.play.scoreboardTableCaption}</caption>
          <colgroup>
            <col className={styles.colName} />
            <col className={styles.colLevel} />
            <col className={styles.colStup} />
            <col className={styles.colMonster} />
            <col className={styles.colPvp} />
            <col className={styles.colItems} />
            <col className={styles.colKlunk} />
            <col className={styles.colPant} />
            <col className={styles.colHp} />
          </colgroup>
          <thead>
            <tr className={styles.headerRow}>
              <ScoreboardIconHeader ariaLabel={sv.play.scoreboardColName} src="/icons/player-marker.svg" alignLeft />
              <ScoreboardIconHeader ariaLabel={sv.play.scoreboardColLevel} src="/icons/lvlup.svg" />
              <ScoreboardIconHeader ariaLabel={sv.play.scoreboardColKnockdowns} src="/icons/skull-icon.svg" />
              <ScoreboardIconHeader ariaLabel={sv.play.scoreboardColMonsterWl} src="/icons/monster-icon.svg" />
              <ScoreboardIconHeader ariaLabel={sv.play.scoreboardColPvpWl} src="/icons/bvb-icon.svg" />
              <ScoreboardIconHeader ariaLabel={sv.play.scoreboardColItems} src="/icons/reward-icon.svg" />
              <ScoreboardIconHeader colored ariaLabel={sv.play.scoreboardColKlunk} src="/icons/klunk.svg" />
              <ScoreboardIconHeader colored ariaLabel={sv.play.scoreboardColPant} src="/icons/pant.svg" />
              <ScoreboardIconHeader colored ariaLabel={sv.play.scoreboardColHp} src="/icons/hp.svg" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const isWinner = props.winnerId != null && p.id === props.winnerId;
              const eliminated = p.eliminated === true;
              const leftVoluntary = p.leftVoluntarily === true;
              const s = p.stats ?? DEFAULT_PLAYER_SESSION_STATS;
              const klunkTotal = s.totalKlunksGained ?? 0;
              const uiLevel = brewerLevelForUi(p);
              const ratio = brewerKlunkProgressRatio(p.xp);
              return (
                <tr key={p.id} className={[styles.bodyRow, isWinner ? styles.bodyRowWinner : ""].filter(Boolean).join(" ")}>
                  <td>
                    <span className={styles.nameBlock}>
                      {eliminated ? (
                        <img
                          src="/icons/skull-icon.svg"
                          alt=""
                          aria-hidden
                          width={16}
                          height={16}
                          className={styles.skullEliminated}
                        />
                      ) : leftVoluntary ? (
                        <img
                          src="/icons/door-exit.svg"
                          alt={sv.play.scoreboardLeftGameAria}
                          title={sv.play.scoreboardLeftGameAria}
                          width={16}
                          height={16}
                          className={styles.doorLeftVoluntary}
                        />
                      ) : null}
                      <span className={[styles.nameText, isWinner ? styles.nameTextWinner : ""].filter(Boolean).join(" ")}>
                        {p.name}
                      </span>
                      {isWinner ? <span aria-hidden>{" 🏆"}</span> : null}
                    </span>
                  </td>
                  <td className={styles.levelCell}>
                    <LevelRingCell
                      ariaLabel={sv.play.scoreboardBrewerLevelAria(uiLevel)}
                      level={uiLevel}
                      ratio={ratio}
                      size="compact"
                    />
                  </td>
                  <td className={styles.statCell}>{s.knockdownCount}</td>
                  <td className={styles.statCell}>
                    <span className={styles.wlWin}>{s.monsterCombatWins}</span>
                    <span className={styles.wlSep} aria-hidden>
                      /
                    </span>
                    <span className={styles.wlLoss}>{s.monsterCombatLosses}</span>
                  </td>
                  <td className={styles.statCell}>
                    <span className={styles.wlWin}>{s.pvpMatchWins}</span>
                    <span className={styles.wlSep} aria-hidden>
                      /
                    </span>
                    <span className={styles.wlLoss}>{s.pvpMatchLosses}</span>
                  </td>
                  <td className={styles.statCell}>{s.itemsPlayed}</td>
                  <td className={styles.statCell} aria-label={sv.play.scoreboardKlunkCellAria(klunkTotal)}>
                    {klunkTotal}
                  </td>
                  <td className={styles.statCell} aria-label={sv.play.scoreboardPantCellAria(p.gold)}>
                    {p.gold}
                  </td>
                  <td className={styles.statCell}>
                    {p.hp}/{p.maxHp}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
