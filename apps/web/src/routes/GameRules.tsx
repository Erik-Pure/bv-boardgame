import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  allCards,
  FINAL_BOSS_IDS,
  FINAL_BOSS_LIFE_TOTAL,
  isFinalBossMonsterId,
  MONSTERS,
  type CardKind,
  type MonsterDef,
} from "@bv/game-core";
import { sv } from "../lib/uiStrings";

const KIND_LABEL: Record<CardKind, string> = {
  event: "Händelsekort",
  item: "Föremål",
  combat: "Strid / system",
  treasure: "Skatter",
  rest: "Vila",
  empty: "Tomma rutor",
};

function sectionTitle(text: string) {
  return (
    <h2
      style={{
        margin: "36px 0 12px",
        fontSize: "1.15rem",
        fontWeight: 800,
        letterSpacing: "0.02em",
        borderBottom: "1px solid rgba(148,163,184,0.35)",
        paddingBottom: 8,
      }}
    >
      {text}
    </h2>
  );
}

export function GameRules() {
  const byKind = useMemo(() => {
    const m = new Map<CardKind, number>();
    for (const c of allCards()) {
      m.set(c.kind, (m.get(c.kind) ?? 0) + 1);
    }
    return m;
  }, []);

  const bossMonsters = useMemo(
    () => FINAL_BOSS_IDS.map((id) => MONSTERS.find((x) => x.id === id)).filter((m): m is MonsterDef => !!m),
    [],
  );

  const regularMonsters = useMemo(() => MONSTERS.filter((m) => !isFinalBossMonsterId(m.id)), []);

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "28px 20px 56px",
        minHeight: "100vh",
        boxSizing: "border-box",
        color: "#e2e8f0",
        background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        lineHeight: 1.55,
      }}
    >
      <Link to="/" style={{ color: "#93c5fd", fontSize: 15, textDecoration: "none" }}>
        ← Till startsidan
      </Link>
      <h1 style={{ margin: "18px 0 10px", fontSize: "clamp(1.45rem, 4.5vw, 1.9rem)", fontWeight: 800, color: "#fff" }}>
        Spelets regler
      </h1>
      <p style={{ margin: "0 0 8px", opacity: 0.88, fontSize: 16 }}>
        Kort översikt av hur <strong>Bryggmästarens väg</strong> är uppbyggt i nuvarande webb-MVP — spelet drivs av servern; detta är
        orientering för spelare.
      </p>
      <p style={{ margin: "0 0 20px", opacity: 0.72, fontSize: 14 }}>
        Vill du se alla kort med bild? Öppna{" "}
        <Link to="/cards" style={{ color: "#93c5fd" }}>
          {sv.home.footerCards}
        </Link>
        .
      </p>

      {sectionTitle("Roller: bräde och mobil")}
      <p>
        <strong>Storskärm</strong> visar spelplanen, turer och gemensamma händelser. <strong>Mobil</strong> är din personliga
        kontroll: bli redo, starta, slå tärning, välja rutor, handla, öppna kort och använda föremål — med en tydlig
        interaktionspanel längst ned när det är relevant.
      </p>

      {sectionTitle("Lobby och start")}
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>Värden skapar en lobby och får en <strong>kod</strong> som delas med gruppen.</li>
        <li>Spelare ansluter med kod och valfritt namn (minst två spelare för att starta).</li>
        <li>Alla markerar <strong>redo</strong>; värden startar spelet när alla är redo.</li>
      </ul>

      {sectionTitle("Turer och spelplan")}
      <p>
        Spelet är <strong>strikt turordnat</strong>. På din tur slår du tärning för förflyttning och väljer var du vill gå på
        banan. Planen har flera <strong>våningar</strong> kopplade med <strong>dörrar</strong>; rutor kan vara tomma, ge
        händelser, skatter, monster, vilorum, butiker med mera.
      </p>

      {sectionTitle("Pant, liv och klunkar")}
      <p>
        <strong>Pant</strong> är spelets valuta. <strong>Liv (HP)</strong> och <strong>klunkar</strong> spårar hur mycket du
        druckit i sagans värld — klunkar påverkar t.ex. bryggarnivå och vissa kort. Utrustning ger bonusar i strid och
        annat.
      </p>

      {sectionTitle("Monsterstrider")}
      <p>
        När du möter ett monster jämförs din <strong>attack</strong> (tärning + vapen m.m.) mot monstrets{" "}
        <strong>styrkekrav</strong>. Vinst ger pant och ofta skatter (föremål); förlust kostar HP och kan ge{" "}
        <strong>straffklunkar</strong>. Vissa monster kräver <strong>team battle</strong> — då slår två spelare tillsammans.
      </p>

      {sectionTitle("Slutboss")}
      <p>
        Målet i standardläget är att nå sista nivån och besegra <strong>slutbossen</strong>. Bossen har{" "}
        <strong>{FINAL_BOSS_LIFE_TOTAL} liv</strong> — varje vunten strid tar ett liv tills sista matchen avgör. En av följande
        slumpas per parti:
      </p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        {bossMonsters.map((m) => (
          <li key={m.id}>
            <strong>{m.name}</strong> — styrka {m.strength}, pant vid vinst {m.rewardGold}, skatter {m.rewardItems}
          </li>
        ))}
      </ul>

      {sectionTitle("Övriga monster (urval)")}
      <p style={{ opacity: 0.85, fontSize: 14 }}>
        Alla monster finns i kortkatalogen med bild. Här är de som finns i datan just nu ({regularMonsters.length} st) med
        styrka och grundbelöning:
      </p>
      <ul style={{ margin: "8px 0", paddingLeft: 22, fontSize: 14, columns: 2, gap: "0 24px" }}>
        {regularMonsters.map((m) => (
          <li key={m.id} style={{ breakInside: "avoid" }}>
            {m.name} — krav {m.strength}, +{m.rewardGold} pant / +{m.rewardItems} skatt
          </li>
        ))}
      </ul>

      {sectionTitle("Händelser, föremål och skatter")}
      <p>
        Kortleken innehåller bland annat (antal ungefärligt från nuvarande data):
      </p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        {(["event", "item", "treasure", "rest", "combat", "empty"] as const).map((k) => {
          const n = byKind.get(k) ?? 0;
          if (n === 0) return null;
          return (
            <li key={k}>
              {KIND_LABEL[k]}: <strong>{n}</strong> kort
            </li>
          );
        })}
      </ul>
      <p>
        Under <strong>stridsreaktioner</strong> kan andra spelare ibland lägga in föremål som påverkar tärningsslaget — både
        hjälpsamma och busiga.
      </p>

      {sectionTitle("BvB och övrigt")}
      <p>
        På samma ruta kan <strong>bryggare möta bryggare</strong> (BvB) med egen tärnings- och byte-logik. Vissa händelser
        och utrustningar har specialregler som beskrivs på respektive kort i spelet.
      </p>
    </div>
  );
}
