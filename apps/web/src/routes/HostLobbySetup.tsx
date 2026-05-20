import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { allCards, CONFIG_NUMERIC, clampConfigNumber, type DifficultyPreset } from "@bv/game-core";
import { useNavigate } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import {
  readBoardPerformancePrefs,
  subscribeBoardPerformancePrefs,
  writeBoardAnimationsEnabled,
  writeBoardPanEnabled,
} from "../lib/boardPerformancePrefs";
import { lobbyFieldControlStyle } from "../lib/lobbyFormFieldStyle";
import { defaultLobbyConfigDraft, saveLobbyConfigDraft } from "../lib/lobbyConfigDraft";
import { sv } from "../lib/uiStrings";
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

const DIFFICULTY_OPTIONS: Array<{
  id: DifficultyPreset;
  label: string;
  iconSrc: string;
}> = [
  { id: "lattol", label: sv.play.lobbyDifficultyLattol, iconSrc: "/icons/lvl1.svg" },
  { id: "folkol", label: sv.play.lobbyDifficultyFolkol, iconSrc: "/icons/lvl2.svg" },
  { id: "starkol", label: sv.play.lobbyDifficultyStarkol, iconSrc: "/icons/lvl3.svg" },
  { id: "imperial", label: sv.play.lobbyDifficultyImperial, iconSrc: "/icons/lvl5.svg" },
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
  const nav = useNavigate();
  const roomCode = useMemo(() => randomCode(), []);
  const [cfg, setCfg] = useState(defaultLobbyConfigDraft);
  const [boardPerf, setBoardPerf] = useState(() => readBoardPerformancePrefs());

  useEffect(() => subscribeBoardPerformancePrefs(() => setBoardPerf(readBoardPerformancePrefs())), []);

  const disabledSet = new Set(cfg.disabledCardIds);
  const byKind = {
    item: TOGGLE_CARDS.filter((c) => c.kind === "item"),
    event: TOGGLE_CARDS.filter((c) => c.kind === "event"),
  };
  const cardBackOptions: Array<{ id: string; label: string; srcWebp: string; srcPng: string }> = [
    { id: "card1", label: sv.play.lobbyCardCoverDefault, srcWebp: "/cardbg/card1.webp", srcPng: "/cardbg/card1.png" },
    { id: "card2", label: sv.play.lobbyCardCoverAlt1, srcWebp: "/cardbg/card2.webp", srcPng: "/cardbg/card2.png" },
    { id: "card3", label: sv.play.lobbyCardCoverAlt2, srcWebp: "/cardbg/card3.webp", srcPng: "/cardbg/card3.png" },
  ];
  const checkboxStyle: CSSProperties = {
    width: 18,
    height: 18,
    accentColor: "#ffffff",
    cursor: "pointer",
  };

  return (
    <div className={styles.root}>
      <picture className={styles.logoHeader}>
        <source srcSet="/icons/bmm-logo-horisontal.avif" type="image/avif" />
        <source srcSet="/icons/bmm-logo-horisontal.webp" type="image/webp" />
        <img
          src="/icons/bmm-logo-horisontal.png"
          alt="Bryggmästarnas Mästare"
          draggable={false}
          className={styles.logoImg}
        />
      </picture>
      <h1 className={styles.title}>Lobbyinställningar</h1>

      <div className={styles.stack}>
        <div className={styles.heroBlock}>
          <div className={styles.fieldLabel}>{sv.play.lobbyDifficulty}</div>
          <div className={styles.difficultyGroup} role="group" aria-label={sv.play.lobbyDifficulty}>
            {DIFFICULTY_OPTIONS.map((opt) => {
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
              <span>Hardcore mode (endast 1 liv)</span>
            </span>
          </label>
        </div>
        <AdvancedSection title={sv.play.lobbyAdvancedSettings}>
          <SubSection title="Bräde">
            <div className={`${styles.stack} ${styles.boardGrid}`}>
              <label className={styles.field}>
                <span>{sv.play.lobbyBoardSize}</span>
                <select
                  value={cfg.boardSize}
                  onChange={(e) => setCfg((v) => ({ ...v, boardSize: e.target.value as typeof v.boardSize }))}
                  style={lobbyFieldControlStyle}
                >
                  <option value="default">{sv.play.lobbyBoardSizeDefault}</option>
                  <option value="large">{sv.play.lobbyBoardSizeLarge}</option>
                  <option value="xlarge">{sv.play.lobbyBoardSizeXLarge}</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>{sv.play.lobbyLevelCount}</span>
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
          <SubSection title={sv.play.lobbyAppearance}>
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
          <SubSection title={sv.play.lobbyAccessibility}>
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
                  <span>{sv.table.settingsBoardPan}</span>
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
                  <span>{sv.table.settingsBoardAnimations}</span>
                </label>
              </div>
            </SubSection>
            <SubSection title={sv.play.lobbyGameValues}>
              <div className={styles.stack}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    {sv.play.lobbyMaxHp}{" "}
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
                    {sv.play.lobbyStartPant}{" "}
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
                    {sv.play.lobbyReactionSeconds}{" "}
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
            <SubSection title={sv.play.lobbyAllowedCards}>
              <p className={styles.cardToggleHint}>{sv.play.lobbyCardToggleHint}</p>
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
        <label className={styles.inlineCheck}>
          <input
            type="checkbox"
            checked={cfg.wakeLockBeforeStart}
            onChange={(e) => setCfg((v) => ({ ...v, wakeLockBeforeStart: e.target.checked }))}
            style={checkboxStyle}
          />
          <span>Inaktivera sömnläge för skärm</span>
        </label>
        <ArcadeButton
          variant="pink"
          fullWidth
          onClick={() => {
            const safe = {
              ...cfg,
              maxHp: clampMaxHp(cfg.maxHp),
              startPant: clampStartPant(cfg.startPant),
              reactionSeconds: clampReactionSeconds(cfg.reactionSeconds),
            };
            setCfg(safe);
            saveLobbyConfigDraft(roomCode, safe);
            nav(`/table?room=${roomCode}&name=Bord`);
          }}
        >
          Starta lobby
        </ArcadeButton>
      </div>
    </div>
  );
}
