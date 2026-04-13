import { useMemo } from "react";
import { Link } from "react-router-dom";
import { allCards, MONSTERS, type CardDef, type CardKind } from "@bv/game-core";
import { artAttributionLabel, artImageSrc } from "../lib/cardArt";

const KIND_ORDER: CardKind[] = ["event", "item", "combat", "treasure", "rest", "empty"];

const KIND_LABEL_SV: Record<CardKind, string> = {
  event: "Händelse",
  item: "Föremål",
  combat: "Strid / system",
  treasure: "Skatt",
  rest: "Vila",
  empty: "Tom",
};

function groupCardsByKind(cards: CardDef[]): Map<CardKind, CardDef[]> {
  const m = new Map<CardKind, CardDef[]>();
  for (const k of KIND_ORDER) m.set(k, []);
  for (const c of cards) {
    const list = m.get(c.kind) ?? [];
    list.push(c);
    m.set(c.kind, list);
  }
  for (const list of m.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, "sv"));
  }
  return m;
}

export function CardsCatalog() {
  const byKind = useMemo(() => groupCardsByKind(allCards()), []);
  const monstersSorted = useMemo(
    () => [...MONSTERS].sort((a, b) => a.name.localeCompare(b.name, "sv")),
    [],
  );

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px 48px",
        color: "#f8fafc",
        minHeight: "100vh",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.35rem, 4vw, 1.75rem)" }}>Kortkatalog</h1>
        <Link to="/" style={{ color: "#93c5fd", fontSize: 15 }}>
          Till startsidan
        </Link>
      </div>
      <p style={{ margin: "0 0 24px", opacity: 0.85, lineHeight: 1.5, maxWidth: 720 }}>
        Alla kort från <code style={{ color: "#cbd5e1" }}>cards.json</code> med resolved bild (
        <code style={{ color: "#cbd5e1" }}>artImageSrc</code>
        ). Längst ner: monster från <code style={{ color: "#cbd5e1" }}>monsters.ts</code> för snabb
        bildkoll.
      </p>

      {KIND_ORDER.map((kind) => {
        const list = byKind.get(kind) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={kind} style={{ marginBottom: 36 }}>
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: "1.15rem",
                borderBottom: "1px solid rgba(148,163,184,0.35)",
                paddingBottom: 8,
              }}
            >
              {KIND_LABEL_SV[kind]} <span style={{ opacity: 0.55, fontWeight: 500 }}>({list.length})</span>
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {list.map((card) => (
                <CatalogCard key={card.id} card={card} />
              ))}
            </div>
          </section>
        );
      })}

      <section style={{ marginBottom: 24 }}>
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "1.15rem",
            borderBottom: "1px solid rgba(148,163,184,0.35)",
            paddingBottom: 8,
          }}
        >
          Monster <span style={{ opacity: 0.55, fontWeight: 500 }}>({monstersSorted.length})</span>
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {monstersSorted.map((m) => {
            const src = artImageSrc(m.artKey);
            const attr = artAttributionLabel(m.artKey);
            return (
              <article
                key={m.id}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(15,23,42,0.75)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    aspectRatio: "16/10",
                    background: "rgba(0,0,0,0.35)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <img
                    src={src}
                    alt=""
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ padding: "10px 12px 12px", display: "grid", gap: 6, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>{m.name}</div>
                  <code style={{ fontSize: 11, opacity: 0.65, wordBreak: "break-all" }}>{m.id}</code>
                  <code style={{ fontSize: 11, opacity: 0.55, wordBreak: "break-all" }}>{m.artKey}</code>
                  {attr ? (
                    <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>Etikett: {attr}</div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CatalogCard({ card }: { card: CardDef }) {
  const src = artImageSrc(card.artKey);
  const attr = artAttributionLabel(card.artKey);
  return (
    <article
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(15,23,42,0.75)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          aspectRatio: "16/10",
          background: "rgba(0,0,0,0.35)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <img
          src={src}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ padding: "10px 12px 12px", display: "grid", gap: 6, flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>{card.title}</div>
        <code style={{ fontSize: 11, opacity: 0.65, wordBreak: "break-all" }}>{card.id}</code>
        {card.artKey ? (
          <code style={{ fontSize: 11, opacity: 0.55, wordBreak: "break-all" }}>{card.artKey}</code>
        ) : null}
        {card.text ? (
          <div
            style={{
              fontSize: 12,
              opacity: 0.82,
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 5,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {card.text}
          </div>
        ) : null}
        {attr ? <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>Etikett: {attr}</div> : null}
      </div>
    </article>
  );
}
