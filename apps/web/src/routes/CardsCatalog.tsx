import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  allCards,
  EQUIPMENT_CATALOG,
  FINAL_BOSS_IDS,
  finalBossCardTagline,
  MONSTERS,
  type CardDef,
  type CardKind,
  type EquipmentShopItem,
  type MonsterDef,
} from "@bv/game-core";
import { artAttributionLabel, artImageSrc } from "../lib/cardArt";
import { equipmentCatalogImageSrc } from "../lib/equipmentImageSrc";
import { capitalizeWord, equipmentSlotSv } from "../lib/uiStrings";

const KIND_ORDER: CardKind[] = ["event", "item", "combat", "treasure", "rest", "empty"];

const KIND_LABEL_SV: Record<CardKind, string> = {
  event: "Händelse",
  item: "Föremål",
  combat: "Strid / system",
  treasure: "Skatt",
  rest: "Vila",
  empty: "Tom",
};

const EQUIP_SLOT_ORDER: Array<EquipmentShopItem["slot"]> = ["weapon", "armor", "helmet", "accessory"];

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

function groupEquipmentBySlot(items: EquipmentShopItem[]): Map<EquipmentShopItem["slot"], EquipmentShopItem[]> {
  const m = new Map<EquipmentShopItem["slot"], EquipmentShopItem[]>();
  for (const s of EQUIP_SLOT_ORDER) m.set(s, []);
  for (const it of items) {
    const list = m.get(it.slot) ?? [];
    list.push(it);
    m.set(it.slot, list);
  }
  for (const list of m.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }
  return m;
}

function formatEquipmentStats(it: EquipmentShopItem): string {
  const parts: string[] = [];
  if (typeof it.power === "number") parts.push(`Kraft +${it.power}`);
  if (typeof it.sipAttackBonus === "number") parts.push(`Sip-attack +${it.sipAttackBonus}`);
  if (typeof it.bonusHp === "number" && it.bonusHp > 0) parts.push(`+${it.bonusHp} max HP`);
  if (typeof it.damageNegate === "number") parts.push(`Skada −${it.damageNegate}`);
  if (it.negateAllOnce) parts.push("Blockar all skada en gång");
  if (typeof it.moveBonus === "number") parts.push(`Rörelse +${it.moveBonus}`);
  return parts.length ? parts.join(" · ") : "—";
}

export function CardsCatalog() {
  const byKind = useMemo(() => groupCardsByKind(allCards()), []);
  const equipmentBySlot = useMemo(() => groupEquipmentBySlot(EQUIPMENT_CATALOG), []);

  const { soloMonsters, teamMonsters, bossMonsters } = useMemo(() => {
    const bossIds = new Set(FINAL_BOSS_IDS);
    const solo: MonsterDef[] = [];
    const team: MonsterDef[] = [];
    const bosses: MonsterDef[] = [];
    for (const m of MONSTERS) {
      if (bossIds.has(m.id)) bosses.push(m);
      else if (m.teamBattleRequired) team.push(m);
      else solo.push(m);
    }
    const sort = (a: MonsterDef, b: MonsterDef) => a.name.localeCompare(b.name, "sv");
    solo.sort(sort);
    team.sort(sort);
    bosses.sort(sort);
    return { soloMonsters: solo, teamMonsters: team, bossMonsters: bosses };
  }, []);

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
      <p style={{ margin: "0 0 24px", opacity: 0.85, lineHeight: 1.5, maxWidth: 820 }}>
        Översikt: kort från <code style={{ color: "#cbd5e1" }}>cards.json</code>, utrustning från{" "}
        <code style={{ color: "#cbd5e1" }}>equipmentDefs.ts</code>, monster från{" "}
        <code style={{ color: "#cbd5e1" }}>monsters.ts</code> uppdelade i <strong>vanliga</strong>,{" "}
        <strong>team battle</strong> och <strong>slutbossar</strong>.
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

      <section style={{ marginBottom: 36 }}>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "1.15rem",
            borderBottom: "1px solid rgba(148,163,184,0.35)",
            paddingBottom: 8,
          }}
        >
          Utrustning <span style={{ opacity: 0.55, fontWeight: 500 }}>({EQUIPMENT_CATALOG.length})</span>
        </h2>
        <p style={{ margin: "0 0 20px", opacity: 0.75, fontSize: 14, lineHeight: 1.45 }}>
          Handelskatalog / loot-pool. Bild = unik art om den finns, annars slot-siluett.
        </p>
        {EQUIP_SLOT_ORDER.map((slot) => {
          const list = equipmentBySlot.get(slot) ?? [];
          if (list.length === 0) return null;
          const label = capitalizeWord(equipmentSlotSv(slot));
          return (
            <div key={slot} style={{ marginBottom: 28 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "1.02rem", opacity: 0.95 }}>
                {label}{" "}
                <span style={{ opacity: 0.5, fontWeight: 500 }}>({list.length})</span>
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                {list.map((it) => (
                  <EquipmentCatalogCard key={it.id} item={it} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <MonsterSection
        title="Monster — vanliga (solo)"
        subtitle="Ingen team battle, inte slutboss."
        monsters={soloMonsters}
      />
      <MonsterSection
        title="Monster — team battle"
        subtitle="Kräver medkämpe; angripare väljer teammate."
        monsters={teamMonsters}
        badge={{ text: "Team", color: "rgba(96,165,250,0.95)" }}
      />
      <MonsterSection
        title="Monster — slutbossar"
        subtitle={`Slumpas en per parti (${FINAL_BOSS_IDS.join(", ")}). Individuell strid.`}
        monsters={bossMonsters}
        badge={{ text: "Boss", color: "rgba(248,113,113,0.95)" }}
        showBossTagline
      />
    </div>
  );
}

function MonsterSection(props: {
  title: string;
  subtitle: string;
  monsters: MonsterDef[];
  badge?: { text: string; color: string };
  showBossTagline?: boolean;
}) {
  if (props.monsters.length === 0) {
    return (
      <section style={{ marginBottom: 24 }}>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "1.15rem",
            borderBottom: "1px solid rgba(148,163,184,0.35)",
            paddingBottom: 8,
          }}
        >
          {props.title}{" "}
          <span style={{ opacity: 0.55, fontWeight: 500 }}>(0)</span>
        </h2>
        <p style={{ margin: 0, opacity: 0.65, fontSize: 14 }}>Inga poster i denna kategori.</p>
      </section>
    );
  }
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "1.15rem",
          borderBottom: "1px solid rgba(148,163,184,0.35)",
          paddingBottom: 8,
        }}
      >
        {props.title}{" "}
        <span style={{ opacity: 0.55, fontWeight: 500 }}>({props.monsters.length})</span>
      </h2>
      <p style={{ margin: "0 0 16px", opacity: 0.75, fontSize: 14, lineHeight: 1.45 }}>{props.subtitle}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {props.monsters.map((m) => (
          <MonsterCatalogCard
            key={m.id}
            monster={m}
            badge={props.badge}
            showBossTagline={props.showBossTagline}
          />
        ))}
      </div>
    </section>
  );
}

function MonsterCatalogCard(props: {
  monster: MonsterDef;
  badge?: { text: string; color: string };
  showBossTagline?: boolean;
}) {
  const m = props.monster;
  const src = artImageSrc(m.artKey);
  const attr = artAttributionLabel(m.artKey);
  const tagline = props.showBossTagline ? finalBossCardTagline(m.id) : null;
  return (
    <article
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(15,23,42,0.75)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {props.badge ? (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.04,
            textTransform: "uppercase",
            padding: "4px 8px",
            borderRadius: 8,
            background: "rgba(15,23,42,0.92)",
            border: `1px solid ${props.badge.color}`,
            color: props.badge.color,
          }}
        >
          {props.badge.text}
        </span>
      ) : null}
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
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Styrka {m.strength}
          {m.teamBattleRequired ? ` · +${m.teamBattleBonusGold ?? 0} pant/medhjälpare vid team-seger` : null}
        </div>
        <code style={{ fontSize: 11, opacity: 0.65, wordBreak: "break-all" }}>{m.id}</code>
        <code style={{ fontSize: 11, opacity: 0.55, wordBreak: "break-all" }}>{m.artKey}</code>
        {tagline ? (
          <div style={{ fontSize: 11, opacity: 0.78, lineHeight: 1.35 }}>{tagline}</div>
        ) : null}
        {attr ? <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>Etikett: {attr}</div> : null}
      </div>
    </article>
  );
}

function EquipmentCatalogCard({ item }: { item: EquipmentShopItem }) {
  const src = equipmentCatalogImageSrc(item.name, item.slot);
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
          padding: 12,
          boxSizing: "border-box",
        }}
      >
        <img
          src={src}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
          }}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            filter: src.endsWith(".svg") ? "brightness(0) invert(0.92)" : undefined,
          }}
        />
      </div>
      <div style={{ padding: "10px 12px 12px", display: "grid", gap: 6, flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>{item.name}</div>
        <div style={{ fontSize: 12, opacity: 0.82, lineHeight: 1.4 }}>{formatEquipmentStats(item)}</div>
        <code style={{ fontSize: 11, opacity: 0.65, wordBreak: "break-all" }}>{item.id}</code>
        <div style={{ fontSize: 11, opacity: 0.65 }}>
          {capitalizeWord(equipmentSlotSv(item.slot))} · {item.price} pant
        </div>
      </div>
    </article>
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
