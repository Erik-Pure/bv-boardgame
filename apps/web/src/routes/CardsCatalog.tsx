import { useMemo, useState, type CSSProperties } from "react";
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
import { artAttributionLabel, artImageSources, hasArtAttribution } from "../lib/cardArt";
import { CatalogImageBadgeStrip, cardDefOverviewBadges } from "../lib/catalogCardOverviewBadges";
import { formatShopItemEffectSummary } from "../lib/equipmentEffectSummary";
import { equipmentShopCatalogBadges, type EffectBadgeData } from "../lib/inventoryEffectBadges";
import { equipmentImageSources } from "../lib/equipmentImageSrc";
import { capitalizeWord, equipmentSlotSv } from "../lib/uiStrings";
import { PictureImg } from "../components/PictureImg";
import { CardRichText, TextWithBoldNumbers } from "../components/CardRichText";
import {
  CARD_BODY_TEXT_STYLE,
  CARD_EVENT_TITLE_STYLE,
  CARD_FLAVOUR_TEXT_STYLE,
  CARD_ITEM_DETAIL_TEXT_STYLE,
} from "../lib/cardTypography";
import catalogStyles from "./CardsCatalog.module.css";

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
const EXTRA_OVERVIEW_EQUIPMENT: EquipmentShopItem[] = [
  { id: "special_robotarm", slot: "weapon", name: "Robotarm", price: 0, power: 0, pvpDieBonus: 1 },
  { id: "special_robothjalm", slot: "helmet", name: "Robothjälm", price: 0, damageNegate: 1 },
];
const CATALOG_SECTION_LABEL: CSSProperties = {
  fontSize: 10,
  opacity: 0.62,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 700,
};

/** Motverkar `#root { text-align: center }` — all korttext i översikten vänsterjusteras. */
const CATALOG_CARD_BODY_WRAP: CSSProperties = {
  padding: "10px 12px 12px",
  display: "grid",
  flex: 1,
  textAlign: "left",
};

function catalogCardUsesEventTitle(kind: CardKind): boolean {
  return kind === "event" || kind === "rest" || kind === "treasure";
}

/** Föremål som främst saboterar andra eller sänker attack i strid — sorteras under "Negativa" i översikten. */
const NEGATIVE_ITEM_CARD_IDS = new Set<string>([
  "item_sleep_potion",
  "item_sip_card",
  "item_weak_beer",
  "item_tripwire",
  "item_hangover",
  "item_monster_hype",
  "item_yeast_sabotage",
  "item_split_the_g",
  "item_lengraddad",
  "item_not_my_round",
  "item_spill_intentional",
  "item_rigged_game",
  "item_paidassasin",
]);

/** Kort-id:n som inte ska visas (mall/systemkort). Skatt döljs med `kind` — samma kort visas vid skattrutor i spelet. */
const HIDDEN_CATALOG_CARD_IDS = new Set<string>([
  "combat_monster",
  "boss_round_win",
  "boss_final_win",
  "event_find_item_random",
]);

function monsterOverviewBadges(m: MonsterDef): EffectBadgeData[] {
  const badges: EffectBadgeData[] = [{ icon: "monster", label: String(m.strength) }];
  const teamGold = m.teamBattleBonusGold ?? 0;
  if (m.teamBattleRequired && teamGold > 0) badges.push({ icon: "pant", label: `+${teamGold}` });
  return badges;
}

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

function splitItemCardsByPolarity(cards: CardDef[]): {
  positive: CardDef[];
  negative: CardDef[];
} {
  const positive: CardDef[] = [];
  const negative: CardDef[] = [];
  for (const c of cards) {
    if (NEGATIVE_ITEM_CARD_IDS.has(c.id)) negative.push(c);
    else positive.push(c);
  }
  positive.sort((a, b) => a.title.localeCompare(b.title, "sv"));
  negative.sort((a, b) => a.title.localeCompare(b.title, "sv"));
  return { positive, negative };
}

export function CardsCatalog() {
  const [onlyBeerRef, setOnlyBeerRef] = useState(false);

  const byKind = useMemo(() => {
    let cards = allCards().filter((c) => !HIDDEN_CATALOG_CARD_IDS.has(c.id) && c.kind !== "treasure");
    if (onlyBeerRef) cards = cards.filter((c) => hasArtAttribution(c.artKey));
    return groupCardsByKind(cards);
  }, [onlyBeerRef]);

  const equipmentBySlot = useMemo(() => {
    if (onlyBeerRef) {
      const empty = new Map<EquipmentShopItem["slot"], EquipmentShopItem[]>();
      for (const s of EQUIP_SLOT_ORDER) empty.set(s, []);
      return empty;
    }
    return groupEquipmentBySlot([...EQUIPMENT_CATALOG, ...EXTRA_OVERVIEW_EQUIPMENT]);
  }, [onlyBeerRef]);

  const { soloMonsters, teamMonsters, bossMonsters } = useMemo(() => {
    const bossIds = new Set(FINAL_BOSS_IDS);
    const solo: MonsterDef[] = [];
    const team: MonsterDef[] = [];
    const bosses: MonsterDef[] = [];
    for (const m of MONSTERS) {
      if (onlyBeerRef && !hasArtAttribution(m.artKey)) continue;
      if (bossIds.has(m.id)) bosses.push(m);
      else if (m.teamBattleRequired) team.push(m);
      else solo.push(m);
    }
    const sort = (a: MonsterDef, b: MonsterDef) => a.name.localeCompare(b.name, "sv");
    solo.sort(sort);
    team.sort(sort);
    bosses.sort(sort);
    return { soloMonsters: solo, teamMonsters: team, bossMonsters: bosses };
  }, [onlyBeerRef]);

  const beerRefCount = useMemo(() => {
    let n = 0;
    for (const list of byKind.values()) n += list.length;
    n += soloMonsters.length + teamMonsters.length + bossMonsters.length;
    return n;
  }, [byKind, soloMonsters.length, teamMonsters.length, bossMonsters.length]);

  return (
    <div className={catalogStyles.pageRoot}>
      <div className={catalogStyles.catalogHeaderRow}>
        <h1 className={catalogStyles.catalogTitle}>Kortkatalog</h1>
        <div className={catalogStyles.catalogHeaderActions}>
          <button
            type="button"
            className={onlyBeerRef ? catalogStyles.filterBtnActive : catalogStyles.filterBtn}
            aria-pressed={onlyBeerRef}
            onClick={() => setOnlyBeerRef((v) => !v)}
          >
            {onlyBeerRef ? "Visar ölreferens" : "Endast ölreferens"}
          </button>
          <Link to="/" className={catalogStyles.catalogHomeLink}>
            Till startsidan
          </Link>
        </div>
      </div>
      <p className={catalogStyles.catalogIntro}>
        {onlyBeerRef ? (
          <>
            Visar <strong>{beerRefCount}</strong> kort och monster med registrerad ölreferens (etikett under bilden).
            Utrustning har inga ölreferenser i katalogen.
          </>
        ) : (
          <>
            Översikt: kort från <code className={catalogStyles.codeInline}>cards.json</code>, utrustning från{" "}
            <code className={catalogStyles.codeInline}>equipmentDefs.ts</code>, monster från{" "}
            <code className={catalogStyles.codeInline}>monsters.ts</code> uppdelade i <strong>vanliga</strong>,{" "}
            <strong>team battle</strong> och <strong>slutbossar</strong>.
          </>
        )}
      </p>

      {KIND_ORDER.map((kind) => {
        const list = byKind.get(kind) ?? [];
        if (list.length === 0) return null;
        if (kind === "item") {
          const { positive, negative } = splitItemCardsByPolarity(list);
          return (
            <section key={kind} className={catalogStyles.sectionMb36}>
              <h2 className={catalogStyles.h2Section}>
                {KIND_LABEL_SV[kind]}{" "}
                <span className={catalogStyles.countMuted}>({list.length})</span>
              </h2>
              {positive.length > 0 ? (
                <div className={catalogStyles.itemPolarityBlock}>
                  <h3 className={catalogStyles.h3Positive}>
                    Positiva <span className={catalogStyles.countMuted}>({positive.length})</span>
                  </h3>
                  <div className={catalogStyles.catalogCardGrid}>
                    {positive.map((card) => (
                      <CatalogCard key={card.id} card={card} />
                    ))}
                  </div>
                </div>
              ) : null}
              {negative.length > 0 ? (
                <div>
                  <h3 className={catalogStyles.h3Negative}>
                    Negativa <span className={catalogStyles.countMuted}>({negative.length})</span>
                  </h3>
                  <div className={catalogStyles.catalogCardGrid}>
                    {negative.map((card) => (
                      <CatalogCard key={card.id} card={card} />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          );
        }
        return (
          <section key={kind} className={catalogStyles.sectionMb36}>
            <h2 className={catalogStyles.h2Section}>
              {KIND_LABEL_SV[kind]} <span className={catalogStyles.countMuted}>({list.length})</span>
            </h2>
            <div className={catalogStyles.catalogCardGrid}>
              {list.map((card) => (
                <CatalogCard key={card.id} card={card} />
              ))}
            </div>
          </section>
        );
      })}

      {!onlyBeerRef ? (
        <section className={catalogStyles.sectionMb36}>
        <h2 className={catalogStyles.h2SectionTight}>
          Utrustning{" "}
          <span className={catalogStyles.countMuted}>
            ({EQUIPMENT_CATALOG.length + EXTRA_OVERVIEW_EQUIPMENT.length})
          </span>
        </h2>
        <p className={catalogStyles.equipIntro}>Handelskatalog / loot-pool. Bild = unik art om den finns, annars slot-siluett.</p>
        {EQUIP_SLOT_ORDER.map((slot) => {
          const list = equipmentBySlot.get(slot) ?? [];
          if (list.length === 0) return null;
          const label = capitalizeWord(equipmentSlotSv(slot));
          return (
            <div key={slot} className={catalogStyles.equipSlotBlock}>
              <h3 className={catalogStyles.h3EquipSlot}>
                {label}{" "}
                <span className={catalogStyles.countMutedSoft}>({list.length})</span>
              </h3>
              <div className={catalogStyles.catalogCardGrid}>
                {list.map((it) => (
                  <EquipmentCatalogCard key={it.id} item={it} />
                ))}
              </div>
            </div>
          );
        })}
      </section>
      ) : null}

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
      <section className={catalogStyles.sectionMb24}>
        <h2 className={catalogStyles.h2SectionTight}>
          {props.title} <span className={catalogStyles.countMuted}>(0)</span>
        </h2>
        <p className={catalogStyles.emptyHint}>Inga poster i denna kategori.</p>
      </section>
    );
  }
  return (
    <section className={catalogStyles.sectionMb36}>
      <h2 className={catalogStyles.h2SectionTight}>
        {props.title} <span className={catalogStyles.countMuted}>({props.monsters.length})</span>
      </h2>
      <p className={catalogStyles.monsterSubtitle}>{props.subtitle}</p>
      <div className={catalogStyles.catalogCardGrid}>
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
  const sources = artImageSources(m.artKey);
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
          position: "relative",
          overflow: "hidden",
        }}
      >
        <PictureImg
          sources={sources}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <CatalogImageBadgeStrip badges={monsterOverviewBadges(m)} />
      </div>
      <div style={{ ...CATALOG_CARD_BODY_WRAP, gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>{m.name}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Styrka {m.strength}
          {m.teamBattleRequired ? ` · +${m.teamBattleBonusGold ?? 0} pant/medhjälpare vid team-seger` : null}
        </div>
        {m.rulesText ? (
          <>
            <div style={CATALOG_SECTION_LABEL}>Smaktext & regler</div>
            <CardRichText text={m.rulesText} style={CARD_FLAVOUR_TEXT_STYLE} />
          </>
        ) : null}
        {tagline ? (
          <CardRichText
            text={tagline}
            style={{ fontSize: 11, opacity: 0.78, lineHeight: 1.35, fontStyle: "normal" }}
          />
        ) : null}
        {attr ? <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>Etikett: {attr}</div> : null}
      </div>
    </article>
  );
}

function EquipmentCatalogCard({ item }: { item: EquipmentShopItem }) {
  const sources = equipmentImageSources(item.name, item.slot);
  const src = sources.webp ?? sources.fallback;
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
          position: "relative",
          overflow: "hidden",
        }}
      >
        <PictureImg
          sources={sources}
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
            display: "block",
            filter: src.endsWith(".svg") ? "brightness(0) invert(0.92)" : undefined,
          }}
        />
        <CatalogImageBadgeStrip badges={equipmentShopCatalogBadges(item)} />
      </div>
      <div style={{ ...CATALOG_CARD_BODY_WRAP, gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>{item.name}</div>
        <div style={CARD_ITEM_DETAIL_TEXT_STYLE}>{formatShopItemEffectSummary(item)}</div>
        {item.rulesText ? (
          <>
            <div style={CATALOG_SECTION_LABEL}>Smaktext & regler</div>
            <div style={CARD_FLAVOUR_TEXT_STYLE}>
              <TextWithBoldNumbers value={item.rulesText} />
            </div>
          </>
        ) : null}
        <div style={{ fontSize: 11, opacity: 0.65 }}>
          {capitalizeWord(equipmentSlotSv(item.slot))} · {item.price} pant
        </div>
      </div>
    </article>
  );
}

function CatalogCard({ card }: { card: CardDef }) {
  const sources = artImageSources(card.artKey);
  const attr = artAttributionLabel(card.artKey);
  const overviewBadges = cardDefOverviewBadges(card);
  const eventLayout = catalogCardUsesEventTitle(card.kind);
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
          aspectRatio: eventLayout ? "4 / 3" : "16 / 10",
          background: "rgba(0,0,0,0.35)",
          display: "grid",
          placeItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <PictureImg
          sources={sources}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <CatalogImageBadgeStrip badges={overviewBadges} />
      </div>
      <div style={{ ...CATALOG_CARD_BODY_WRAP, gap: 8 }}>
        <div style={eventLayout ? CARD_EVENT_TITLE_STYLE : { fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>
          {card.title}
        </div>
        {card.flavourText ? (
          <>
            <div style={CATALOG_SECTION_LABEL}>Smaktext</div>
            <div style={CARD_FLAVOUR_TEXT_STYLE}>
              <TextWithBoldNumbers value={card.flavourText} />
            </div>
          </>
        ) : null}
        {card.text ? (
          <>
            <div style={CATALOG_SECTION_LABEL}>{card.flavourText ? "Regler" : "Korttext"}</div>
            <CardRichText text={card.text} rollOutcomes={card.rollOutcomes} style={CARD_BODY_TEXT_STYLE} />
          </>
        ) : null}
        {attr ? <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>Etikett: {attr}</div> : null}
      </div>
    </article>
  );
}
