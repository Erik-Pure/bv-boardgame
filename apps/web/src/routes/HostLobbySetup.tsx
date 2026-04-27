import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { allCards } from "@bv/game-core";
import { useNavigate } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { defaultLobbyConfigDraft, saveLobbyConfigDraft } from "../lib/lobbyConfigDraft";

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

export function HostLobbySetup() {
  const nav = useNavigate();
  const roomCode = useMemo(() => randomCode(), []);
  const [cfg, setCfg] = useState(defaultLobbyConfigDraft);

  const disabledSet = new Set(cfg.disabledCardIds);
  const byKind = {
    item: TOGGLE_CARDS.filter((c) => c.kind === "item"),
    event: TOGGLE_CARDS.filter((c) => c.kind === "event"),
  };
  const cardBackOptions: Array<{ id: typeof cfg.cardCover; label: string; srcWebp: string; srcPng: string }> = [
    { id: "default", label: "Standard", srcWebp: "/cardbg/card1.webp", srcPng: "/cardbg/card1.png" },
    { id: "alt1", label: "Variant 1", srcWebp: "/cardbg/card2.webp", srcPng: "/cardbg/card2.png" },
    { id: "alt2", label: "Variant 2", srcWebp: "/cardbg/card3.webp", srcPng: "/cardbg/card3.png" },
  ];
  const fieldStyle: CSSProperties = {
    width: "100%",
    minHeight: 46,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.24)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%), rgba(15,23,42,0.72)",
    color: "#ffffff",
    padding: "0 14px",
    fontFamily: "var(--sans)",
    fontSize: 15,
    fontWeight: 600,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 18px rgba(0,0,0,0.28)",
    outline: "none",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    boxSizing: "border-box",
  };
  const checkboxStyle: CSSProperties = {
    width: 18,
    height: 18,
    accentColor: "#ffffff",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        width: "min(900px, calc(100% - 28px))",
        margin: "20px auto",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(4, 9, 22, 0.92)",
        padding: "18px 16px",
        boxSizing: "border-box",
        color: "#fff",
      }}
    >
      <h1 style={{ margin: "0 0 34px" }}>Lobbyinställningar</h1>

      <div style={{ display: "grid", gap: 10, textAlign: "left" }}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <label style={{ display: "grid", gap: 4, textAlign: "left" }}>
            <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.92, textAlign: "left" }}>Svårighetsgrad</span>
            <select
              value={cfg.difficulty}
              onChange={(e) => setCfg((v) => ({ ...v, difficulty: e.target.value as typeof v.difficulty }))}
              style={fieldStyle}
            >
              <option value="lattol">Lättöl</option>
              <option value="folkol">Folköl (standard)</option>
              <option value="starkol">Starköl</option>
              <option value="imperial">Imperial</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", paddingTop: 34 }}>
            <input
              type="checkbox"
              checked={cfg.hardcore}
              onChange={(e) => setCfg((v) => ({ ...v, hardcore: e.target.checked }))}
              style={checkboxStyle}
            />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#ef4444", fontWeight: 700 }}>
              <img
                src="/icons/skull-icon.svg"
                alt=""
                aria-hidden
                draggable={false}
                style={{
                  width: 18,
                  height: 18,
                  filter: "brightness(0) saturate(100%) invert(49%) sepia(80%) saturate(2057%) hue-rotate(332deg) brightness(96%) contrast(95%) drop-shadow(0 0 4px rgba(239,68,68,0.45))",
                }}
              />
              <span>Hardcore mode (endast 1 liv)</span>
            </span>
          </label>
        </div>
        <div
          style={{
            marginTop: 6,
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            padding: 10,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, opacity: 0.94, marginBottom: 10 }}>Bräde</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <label style={{ display: "grid", gap: 4, textAlign: "left" }}>
              <span style={{ fontSize: 17, fontWeight: 700, opacity: 0.92, textAlign: "left" }}>Brädstorlek</span>
              <select
                value={cfg.boardSize}
                onChange={(e) => setCfg((v) => ({ ...v, boardSize: e.target.value as typeof v.boardSize }))}
                style={fieldStyle}
              >
                <option value="default">Standard</option>
                <option value="large">Stor</option>
                <option value="xlarge">Extra stor</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, textAlign: "left" }}>
              <span style={{ fontSize: 17, fontWeight: 700, opacity: 0.92, textAlign: "left" }}>Antal nivåer</span>
              <select
                value={cfg.levelCount}
                onChange={(e) => setCfg((v) => ({ ...v, levelCount: Number(e.target.value) as 2 | 3 | 4 | 5 }))}
                style={fieldStyle}
              >
                <option value={2}>2</option>
                <option value={3}>3 (standard)</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </label>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
          <input
            type="checkbox"
            checked={cfg.wakeLockBeforeStart}
            onChange={(e) => setCfg((v) => ({ ...v, wakeLockBeforeStart: e.target.checked }))}
            style={checkboxStyle}
          />
          <span>Inaktivera sömnläge för skärm</span>
        </label>
        <div style={{ display: "grid", gap: 8, textAlign: "left" }}>
          <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.92, textAlign: "left" }}>Kortbaksida</span>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {cardBackOptions.map((opt) => {
              const selected = cfg.cardCover === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCfg((v) => ({ ...v, cardCover: opt.id }))}
                  style={{
                    borderRadius: 14,
                    border: selected ? "2px solid rgba(251,191,36,0.95)" : "1px solid rgba(255,255,255,0.22)",
                    background: selected ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
                    padding: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: selected ? "0 0 0 1px rgba(251,191,36,0.35), 0 10px 24px rgba(0,0,0,0.35)" : "0 8px 18px rgba(0,0,0,0.28)",
                  }}
                >
                  <picture>
                    <source srcSet={opt.srcWebp} type="image/webp" />
                    <img
                      src={opt.srcPng}
                      alt={opt.label}
                      draggable={false}
                      style={{
                        width: "100%",
                        aspectRatio: "5 / 7",
                        objectFit: "cover",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.22)",
                        display: "block",
                      }}
                    />
                  </picture>
                  <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: selected ? "#fcd34d" : "#e2e8f0" }}>
                    {opt.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <details
          style={{
            marginTop: 4,
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            padding: "8px 10px",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 20, opacity: 0.95 }}>Fler inställningar</summary>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 17, fontWeight: 700, opacity: 0.92 }}>Max HP</span>
              <input
                type="number"
                min={6}
                max={30}
                value={cfg.maxHp}
                onChange={(e) => setCfg((v) => ({ ...v, maxHp: Number(e.target.value) }))}
                style={fieldStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 17, fontWeight: 700, opacity: 0.92 }}>Startpant</span>
              <input
                type="number"
                min={0}
                max={50}
                value={cfg.startPant}
                onChange={(e) => setCfg((v) => ({ ...v, startPant: Number(e.target.value) }))}
                style={fieldStyle}
              />
            </label>
            <details
              style={{
                border: "1px solid #ffffff2e",
                borderRadius: 10,
                padding: "8px 10px",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Tillåtna kort</summary>
              <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto", borderRadius: 8, padding: 4 }}>
                {(["item", "event"] as const).map((kind) => (
                  <div key={kind} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.85, textTransform: "uppercase" }}>{kind}</div>
                    {byKind[kind].map((card) => {
                      const disabled = disabledSet.has(card.id);
                      return (
                        <label key={card.id} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
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
            </details>
          </div>
        </details>
      </div>

      <div
        style={{
          marginTop: 42,
          paddingTop: 22,
          borderTop: "1px solid rgba(255,255,255,0.2)",
          display: "grid",
          gap: 8,
        }}
      >
        <ArcadeButton
          variant="pink"
          fullWidth
          onClick={() => {
            saveLobbyConfigDraft(roomCode, cfg);
            nav(`/table?room=${roomCode}&name=Bord`);
          }}
        >
          Fortsätt till brädet
        </ArcadeButton>
        <ArcadeButton variant="gray" fullWidth onClick={() => nav("/")}>
          Avbryt
        </ArcadeButton>
      </div>
    </div>
  );
}
