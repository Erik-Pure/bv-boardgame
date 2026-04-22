import { Link } from "react-router-dom";
import { FINAL_BOSS_LIFE_TOTAL } from "@bv/game-core";
import { sv } from "../lib/uiStrings";

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
        textAlign: "left",
      }}
    >
      <Link to="/" style={{ color: "#93c5fd", fontSize: 15, textDecoration: "none" }}>
        ← Till startsidan
      </Link>
      <h1 style={{ margin: "18px 0 10px", fontSize: "clamp(1.45rem, 4.5vw, 1.9rem)", fontWeight: 800, color: "#fff" }}>
        🍺 Bryggmästarens väg: Snabbguide
      </h1>
      <p style={{ margin: "0 0 20px", opacity: 0.9, fontSize: 16 }}>
        Målet är att bli den sista stående bryggaren eller den som först besegrar spelets Slutboss. Spelet styrs via mobilen
        medan spelplanen visas på en gemensam storskärm.
      </p>
      <p style={{ margin: "0 0 20px", opacity: 0.72, fontSize: 14 }}>
        Vill du se alla kort med bild? Öppna{" "}
        <Link to="/cards" style={{ color: "#93c5fd" }}>
          {sv.home.footerCards}
        </Link>
        .
      </p>

      {sectionTitle("🎲 Spelets gång & Nivåer")}
      <p>
        Spelet är turordnat. Du slår tärning för att flytta mellan rutor som kan innehålla skatter, butiker, händelser eller
        monster.
      </p>
      <p style={{ marginTop: 14 }}>För att gå upp i nivå krävs antingen Pant eller Klunkar:</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          <strong>Nivå 2:</strong> Kostar 20 Pant eller 8 Klunkar.
        </li>
        <li>
          <strong>Nivå 3:</strong> Kostar 30 Pant eller 16 Klunkar.
        </li>
      </ul>

      {sectionTitle("⚔️ Monster & Strider")}
      <p>
        Du möter monster genom att jämföra din attack (tärning + utrustning) mot monstrets styrka.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Vinst:</strong> Ger pant och föremål. <strong>Förlust:</strong> Kostar HP och kan ge straffklunkar.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Monster-typer:</strong> Det finns vanliga monster, team battles (där två samarbetar) och bossar.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>BvB:</strong> Hamnar ni på samma ruta kan ni utmana varandra i strid.
      </p>

      {sectionTitle("🃏 Kort & Interaktion")}
      <p>
        Kortleken innehåller händelser, föremål och skatter. Under pågående strid kan medspelare lägga föremål för att antingen
        hjälpa eller sabotera för den som slåss.
      </p>

      {sectionTitle("🏆 Hur man vinner")}
      <p>Spelet kan avslutas på två sätt:</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          <strong>Seger:</strong> Den spelare som först besegrar slutbossen (som har {FINAL_BOSS_LIFE_TOTAL} liv) vinner.
        </li>
        <li>
          <strong>Utslagning:</strong> Om alla spelare utom en har gett upp/förlorat sina liv står den sista bryggaren som
          vinnare.
        </li>
      </ul>
    </div>
  );
}
