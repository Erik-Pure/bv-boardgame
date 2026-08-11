import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { allCards, CONFIG_NUMERIC, clampConfigNumber, type DifficultyPreset } from "@bv/game-core";
import { useNavigate } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { BrandLogoImg } from "../components/BrandLogoImg";
import {
  readBoardPerformancePrefs,
  subscribeBoardPerformancePrefs,
  writeBoardAnimationsEnabled,
  writeBoardPanEnabled,
  writeScaleAnimationsEnabled,
  writeTokenMoveAnimationsEnabled,
  writeTileBobAnimationsEnabled,
  writeTurnBannerPlacement,
} from "../lib/boardPerformancePrefs";
import { lobbyFieldControlStyle } from "../lib/lobbyFormFieldStyle";
import { defaultLobbyConfigDraft, saveLobbyConfigDraft } from "../lib/lobbyConfigDraft";
import { useUiStrings } from "../lib/locale/LocaleContext";
import styles from "./HostLobbySetup.module.css";

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const n = 6;
  let s = "";
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

const TOGGLE_KINDS = new Set(["item", "event"]);
const TOGGLE_CARDS = allCards()
  .filter((card) => TOGGLE_KINDS.has(card.kind))
  .sort((a, b) => a.title.localeCompare(b.title, "sv"));

/** Måste matcha server/engine (Zod `min(6)`); lägre värden gör att `hello` avvisas och WS fastnar. */
function clampMaxHp(n: number): number {
  return clampConfigNumber("maxHp", n);
}

function clampStartPant(n: number): number {
  return clampConfigNumber("startPant", n);
}

function clampReactionSeconds(n: number): number {
  return clampConfigNumber("reactionSeconds", n);
}

function clampTurnSeconds(n: number): number {
  return clampConfigNumber("turnSeconds", n);
}

function clampPvpBestOf(n: number): number {
  return clampConfigNumber("pvpBestOf", n);
}

function clampMaxPlayers(n: number): number {
  return clampConfigNumber("maxPlayers", n);
}

function clampMissedTurnsKickAfter(n: number): number {
  return clampConfigNumber("missedTurnsKickAfter", n);
}

const DIFFICULTY_OPTION_DEFS: Array<{
  id: DifficultyPreset;
  iconSrc: string;
}> = [
  { id: "lattol", iconSrc: "/icons/lvl1.svg" },
  { id: "folkol", iconSrc: "/icons/lvl2.svg" },
  { id: "starkol", iconSrc: "/icons/lvl3.svg" },
  { id: "imperial", iconSrc: "/icons/lvl5.svg" },
];

function AdvancedSection(props: { title: string; children: ReactNode }) {
  return (
    <details className={styles.sectionAdvanced}>
      <summary className={styles.summaryAdvanced}>{props.title}</summary>
      <div className={styles.advancedSectionBody}>
        <div className={styles.nestedSections}>{props.children}</div>
      </div>
    </details>
  );
}

function SubSection(props: { title: string; children: ReactNode }) {
  return (
    <details className={styles.sectionNested}>
      <summary className={styles.summaryNested}>{props.title}</summary>
      <div className={styles.nestedSectionBody}>{props.children}</div>
    </details>
  );
}

export function HostLobbySetup() {
  const ui = useUiStrings();
  const nav = useNavigate();
  const roomCode = useMemo(() => randomCode(), []);
  const [cfg, setCfg] = useState(() => defaultLobbyConfigDraft());
  const [boardPerf, setBoardPerf] = useState(() => readBoardPerformancePrefs());

  useEffect(() => subscribeBoardPerformancePrefs(() => setBoardPerf(readBoardPerformancePrefs())), []);

  const disabledSet = new Set(cfg.disabledCardIds);
  const byKind = {
    item: TOGGLE_CARDS.filter((c) => c.kind === "item"),
    event: TOGGLE_CARDS.filter((c) => c.kind === "event"),
  };
  const cardBackOptions: Array<{ id: string; label: string; srcWebp: string; srcPng: string }> = [
    { id: "card1", label: ui.play.lobbyCardCoverDefault, srcWebp: "/cardbg/card1.webp", srcPng: "/cardbg/card1.png" },
    { id: "card2", label: ui.play.lobbyCardCoverAlt1, srcWebp: "/cardbg/card2.webp", srcPng: "/cardbg/card2.png" },
    { id: "card3", label: ui.play.lobbyCardCoverAlt2, srcWebp: "/cardbg/card3.webp", srcPng: "/cardbg/card3.png" },
  ];
  const difficultyOptions = DIFFICULTY_OPTION_DEFS.map((opt) => ({
    ...opt,
    label:
      opt.id === "lattol"
        ? ui.play.lobbyDifficultyLattol
        : opt.id === "folkol"
          ? ui.play.lobbyDifficultyFolkol
          : opt.id === "starkol"
            ? ui.play.lobbyDifficultyStarkol
            : ui.play.lobbyDifficultyImperial,
  }));
  const checkboxStyle: CSSProperties = {
    width: 18,
    height: 18,
    accentColor: "#ffffff",
    cursor: "pointer",
  };

  return (
    <div className={styles.root}>
      <div className={styles.logoHeader}>
        <BrandLogoImg
          variant="horizontal"
          alt={ui.home.title}
          draggable={false}
          className={styles.logoImg}
        />
      </div>
      <h1 className={styles.title}>{ui.play.lobbySetupTitle}</h1>

      <div className={styles.stack}>
        <div className={styles.heroBlock}>
          <div className={styles.fieldLabel}>{ui.play.lobbyDifficulty}</div>
          <div className={styles.difficultyGroup} role="group" aria-label={ui.play.lobbyDifficulty}>
            {difficultyOptions.map((opt) => {
              const selected = cfg.difficulty === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  className={`${styles.difficultyBtn} ${selected ? styles.difficultyBtnSelected : ""}`}
                  onClick={() => setCfg((v) => ({ ...v, difficulty: opt.id }))}
                >
                  <img src={opt.iconSrc} alt="" aria-hidden draggable={false} className={styles.difficultyIcon} />
                  <span className={styles.difficultyLabel}>{opt.label}</span>
                </button>
              );
            })}
          </div>
          <label className={`${styles.inlineCheck} ${styles.hardcoreCenter}`}>
            <input
              type="checkbox"
              checked={cfg.hardcore}
              onChange={(e) => setCfg((v) => ({ ...v, hardcore: e.target.checked }))}
              style={checkboxStyle}
            />
            <span className={styles.hardcoreLabel}>
              <img
                src="/icons/skull-icon.svg"
                alt=""
                aria-hidden
                draggable={false}
                className={styles.hardcoreIcon}
              />
              <span>{ui.play.lobbyHardcoreModeLabel}</span>
            </span>
          </label>
        </div>
        <AdvancedSection title={ui.play.lobbyAdvancedSettings}>
          <SubSection title={ui.play.lobbyGeneral}>
            <div className={styles.stack}>
              <label className={styles.inlineCheck}>
                <input
                  type="checkbox"
                  checked={cfg.allowLateJoin}
                  onChange={(e) => setCfg((v) => ({ ...v, allowLateJoin: e.target.checked }))}
                  style={checkboxStyle}
                />
                <span>{ui.play.lobbyAllowLateJoinLabel}</span>
              </label>
              <label className={styles.inlineCheck}>
                <input
                  type="checkbox"
                  checked={cfg.clearPlayersOnRematch}
                  onChange={(e) => setCfg((v) => ({ ...v, clearPlayersOnRematch: e.target.checked }))}
                  style={checkboxStyle}
                />
                <span>{ui.play.lobbyClearPlayersOnRematchLabel}</span>
              </label>
            </div>
          </SubSection>
          <SubSection title={ui.table.board}>
            <div className={`${styles.stack} ${styles.boardGrid}`}>
              <label className={styles.field}>
                <span>{ui.play.lobbyBoardSize}</span>
                <select
                  value={cfg.boardSize}
                  onChange={(e) => setCfg((v) => ({ ...v, boardSize: e.target.value as typeof v.boardSize }))}
                  style={lobbyFieldControlStyle}
                >
                  <option value="default">{ui.play.lobbyBoardSizeDefault}</option>
                  <option value="large">{ui.play.lobbyBoardSizeLarge}</option>
                  <option value="xlarge">{ui.play.lobbyBoardSizeXLarge}</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>{ui.play.lobbyLevelCount}</span>
                <select
                  value={cfg.levelCount}
                  onChange={(e) => setCfg((v) => ({ ...v, levelCount: Number(e.target.value) as 2 | 3 | 4 | 5 }))}
                  style={lobbyFieldControlStyle}
                >
                  <option value={2}>2</option>
                  <option value={3}>3 (standard)</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </label>
            </div>
          </SubSection>
          <SubSection title={ui.play.lobbyAppearance}>
            <div className={`${styles.stack} ${styles.appearanceGrid}`}>
              {cardBackOptions.map((opt) => {
                const selected = cfg.cardCover === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCfg((v) => ({ ...v, cardCover: opt.id }))}
                    className={`${styles.coverBtn} ${selected ? styles.coverBtnSelected : ""}`}
                  >
                    <picture>
                      <source srcSet={opt.srcWebp} type="image/webp" />
                      <img src={opt.srcPng} alt={opt.label} draggable={false} className={styles.coverImg} />
                    </picture>
                    <div className={`${styles.coverLabel} ${selected ? styles.coverLabelSelected : ""}`}>
                      {opt.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </SubSection>
          <SubSection title={ui.play.lobbyAccessibility}>
              <div className={styles.stack}>
                <label className={styles.inlineCheck}>
                  <input
                    type="checkbox"
                    checked={boardPerf.boardPanEnabled}
                    onChange={(e) => {
                      writeBoardPanEnabled(e.target.checked);
                      setBoardPerf(readBoardPerformancePrefs());
                    }}
                    style={checkboxStyle}
                  />
                  <span>{ui.table.settingsBoardPan}</span>
                </label>
                <label className={styles.inlineCheck}>
                  <input
                    type="checkbox"
                    checked={boardPerf.boardAnimationsEnabled}
                    onChange={(e) => {
                      writeBoardAnimationsEnabled(e.target.checked);
                      setBoardPerf(readBoardPerformancePrefs());
                    }}
                    style={checkboxStyle}
                  />
                  <span>{ui.table.settingsBoardAnimations}</span>
                </label>
                <label className={styles.inlineCheck}>
                  <input
                    type="checkbox"
                    checked={boardPerf.tokenMoveAnimationsEnabled}
                    onChange={(e) => {
                      writeTokenMoveAnimationsEnabled(e.target.checked);
                      setBoardPerf(readBoardPerformancePrefs());
                    }}
                    style={checkboxStyle}
                  />
                  <span>{ui.table.settingsTokenMoveAnimations}</span>
                </label>
                <label className={styles.inlineCheck}>
                  <input
                    type="checkbox"
                    checked={boardPerf.tileBobAnimationsEnabled}
                    onChange={(e) => {
                      writeTileBobAnimationsEnabled(e.target.checked);
                      setBoardPerf(readBoardPerformancePrefs());
                    }}
                    style={checkboxStyle}
                  />
                  <span>{ui.table.settingsTileBobAnimations}</span>
                </label>
                <label className={styles.inlineCheck}>
                  <input
                    type="checkbox"
                    checked={boardPerf.scaleAnimationsEnabled}
                    onChange={(e) => {
                      writeScaleAnimationsEnabled(e.target.checked);
                      setBoardPerf(readBoardPerformancePrefs());
                    }}
                    style={checkboxStyle}
                  />
                  <span>{ui.table.settingsScaleAnimations}</span>
                </label>
                <label className={styles.inlineCheck}>
                  <input
                    type="checkbox"
                    checked={boardPerf.turnBannerPlacement === "right"}
                    onChange={(e) => {
                      writeTurnBannerPlacement(e.target.checked ? "right" : "bottom");
                      setBoardPerf(readBoardPerformancePrefs());
                    }}
                    style={checkboxStyle}
                  />
                  <span>{ui.table.settingsTurnBannerRight}</span>
                </label>
              </div>
            </SubSection>
            <SubSection title={ui.play.lobbyGameValues}>
              <div className={styles.stack}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    {ui.play.lobbyMaxHp}{" "}
                    <span className={styles.fieldHint}>
                      ({CONFIG_NUMERIC.maxHp.min}–{CONFIG_NUMERIC.maxHp.max})
                    </span>
                  </span>
                  <input
                    type="number"
                    min={CONFIG_NUMERIC.maxHp.min}
                    max={CONFIG_NUMERIC.maxHp.max}
                    value={cfg.maxHp}
                    onChange={(e) => setCfg((v) => ({ ...v, maxHp: Number(e.target.value) }))}
                    onBlur={() => setCfg((v) => ({ ...v, maxHp: clampMaxHp(v.maxHp) }))}
                    style={lobbyFieldControlStyle}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    {ui.play.lobbyStartPant}{" "}
                    <span className={styles.fieldHint}>
                      ({CONFIG_NUMERIC.startPant.min}–{CONFIG_NUMERIC.startPant.max})
                    </span>
                  </span>
                  <input
                    type="number"
                    min={CONFIG_NUMERIC.startPant.min}
                    max={CONFIG_NUMERIC.startPant.max}
                    value={cfg.startPant}
                    onChange={(e) => setCfg((v) => ({ ...v, startPant: Number(e.target.value) }))}
                    onBlur={() => setCfg((v) => ({ ...v, startPant: clampStartPant(v.startPant) }))}
                    style={lobbyFieldControlStyle}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    {ui.play.lobbyPvpBestOf}{" "}
                    <span className={styles.fieldHint}>
                      ({CONFIG_NUMERIC.pvpBestOf.min}–{CONFIG_NUMERIC.pvpBestOf.max})
                    </span>
                  </span>
                  <select
                    value={cfg.pvpBestOf}
                    onChange={(e) =>
                      setCfg((v) => ({ ...v, pvpBestOf: clampPvpBestOf(Number(e.target.value)) }))
                    }
                    style={lobbyFieldControlStyle}
                  >
                    {Array.from(
                      { length: CONFIG_NUMERIC.pvpBestOf.max - CONFIG_NUMERIC.pvpBestOf.min + 1 },
                      (_, i) => CONFIG_NUMERIC.pvpBestOf.min + i,
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    {ui.play.lobbyMaxPlayers}{" "}
                    <span className={styles.fieldHint}>
                      ({CONFIG_NUMERIC.maxPlayers.min}–{CONFIG_NUMERIC.maxPlayers.max})
                    </span>
                  </span>
                  <select
                    value={cfg.maxPlayers}
                    onChange={(e) =>
                      setCfg((v) => ({ ...v, maxPlayers: clampMaxPlayers(Number(e.target.value)) }))
                    }
                    style={lobbyFieldControlStyle}
                  >
                    {Array.from(
                      { length: CONFIG_NUMERIC.maxPlayers.max - CONFIG_NUMERIC.maxPlayers.min + 1 },
                      (_, i) => CONFIG_NUMERIC.maxPlayers.min + i,
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.inlineCheck}>
                  <input
                    type="checkbox"
                    checked={cfg.turnTimeoutEnabled}
                    onChange={(e) => setCfg((v) => ({ ...v, turnTimeoutEnabled: e.target.checked }))}
                    style={checkboxStyle}
                  />
                  <span>{ui.play.lobbyTurnTimeoutEnabled}</span>
                </label>
                {cfg.turnTimeoutEnabled ? (
                  <>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>
                        {ui.play.lobbyTurnSeconds}{" "}
                        <span className={styles.fieldHint}>
                          ({CONFIG_NUMERIC.turnSeconds.min}–{CONFIG_NUMERIC.turnSeconds.max} sek)
                        </span>
                      </span>
                      <input
                        type="number"
                        min={CONFIG_NUMERIC.turnSeconds.min}
                        max={CONFIG_NUMERIC.turnSeconds.max}
                        value={cfg.turnSeconds}
                        onChange={(e) => setCfg((v) => ({ ...v, turnSeconds: Number(e.target.value) }))}
                        onBlur={() => setCfg((v) => ({ ...v, turnSeconds: clampTurnSeconds(v.turnSeconds) }))}
                        style={lobbyFieldControlStyle}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>
                        {ui.play.lobbyMissedTurnsKickAfter}{" "}
                        <span className={styles.fieldHint}>
                          ({CONFIG_NUMERIC.missedTurnsKickAfter.min}–{CONFIG_NUMERIC.missedTurnsKickAfter.max})
                        </span>
                      </span>
                      <select
                        value={cfg.missedTurnsKickAfter}
                        onChange={(e) =>
                          setCfg((v) => ({
                            ...v,
                            missedTurnsKickAfter: clampMissedTurnsKickAfter(Number(e.target.value)),
                          }))
                        }
                        style={lobbyFieldControlStyle}
                      >
                        {Array.from(
                          {
                            length:
                              CONFIG_NUMERIC.missedTurnsKickAfter.max -
                              CONFIG_NUMERIC.missedTurnsKickAfter.min +
                              1,
                          },
                          (_, i) => CONFIG_NUMERIC.missedTurnsKickAfter.min + i,
                        ).map((n) => (
                          <option key={n} value={n}>
                            {n === 0 ? ui.play.lobbyMissedTurnsKickAfterOff : n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    {ui.play.lobbyReactionSeconds}{" "}
                    <span className={styles.fieldHint}>
                      ({CONFIG_NUMERIC.reactionSeconds.min}–{CONFIG_NUMERIC.reactionSeconds.max} sek)
                    </span>
                  </span>
                  <input
                    type="number"
                    min={CONFIG_NUMERIC.reactionSeconds.min}
                    max={CONFIG_NUMERIC.reactionSeconds.max}
                    value={cfg.reactionSeconds}
                    onChange={(e) => setCfg((v) => ({ ...v, reactionSeconds: Number(e.target.value) }))}
                    onBlur={() =>
                      setCfg((v) => ({ ...v, reactionSeconds: clampReactionSeconds(v.reactionSeconds) }))
                    }
                    style={lobbyFieldControlStyle}
                  />
                </label>
              </div>
            </SubSection>
            <SubSection title={ui.play.lobbyAllowedCards}>
              <p className={styles.cardToggleHint}>{ui.play.lobbyCardToggleHint}</p>
              <div className={styles.cardsInner}>
                {(["item", "event"] as const).map((kind) => (
                  <div key={kind} className={styles.cardsKind}>
                    <div className={styles.cardsKindTitle}>{kind}</div>
                    {byKind[kind].map((card) => {
                      const disabled = disabledSet.has(card.id);
                      return (
                        <label key={card.id} className={styles.cardsRow}>
                          <input
                            type="checkbox"
                            checked={!disabled}
                            onChange={(e) =>
                              setCfg((v) => {
                                const next = new Set(v.disabledCardIds);
                                if (e.target.checked) next.delete(card.id);
                                else next.add(card.id);
                                return { ...v, disabledCardIds: [...next] };
                              })
                            }
                          />
                          <span style={{ fontSize: 13 }}>{card.title}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </SubSection>
        </AdvancedSection>
      </div>

      <div className={styles.divider}>
        <div className={styles.footerChecks}>
          <label className={styles.inlineCheck}>
            <input
              type="checkbox"
              checked={cfg.wakeLockBeforeStart}
              onChange={(e) => setCfg((v) => ({ ...v, wakeLockBeforeStart: e.target.checked }))}
              style={checkboxStyle}
            />
            <span>{ui.play.lobbyWakeLockDisableScreen}</span>
          </label>
        </div>
        <ArcadeButton
          variant="pink"
          fullWidth
          onClick={() => {
            const safe = {
              ...cfg,
              maxHp: clampMaxHp(cfg.maxHp),
              startPant: clampStartPant(cfg.startPant),
              reactionSeconds: clampReactionSeconds(cfg.reactionSeconds),
              turnSeconds: clampTurnSeconds(cfg.turnSeconds),
              pvpBestOf: clampPvpBestOf(cfg.pvpBestOf),
              maxPlayers: clampMaxPlayers(cfg.maxPlayers),
              missedTurnsKickAfter: clampMissedTurnsKickAfter(cfg.missedTurnsKickAfter),
            };
            setCfg(safe);
            saveLobbyConfigDraft(roomCode, safe);
            nav(`/table?room=${roomCode}&name=Bord`);
          }}
        >
          {ui.play.lobbyStartLobby}
        </ArcadeButton>
      </div>
    </div>
  );
}
