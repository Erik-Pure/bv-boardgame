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

function tutorialImage(src: string, alt: string) {
  return (
    <div
      style={{
        margin: "10px 0 14px",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(148,163,184,0.35)",
        background: "rgba(2,6,23,0.65)",
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
        draggable={false}
      />
    </div>
  );
}

function inlineIcon(src: string, color: string) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        width: 15,
        height: 15,
        verticalAlign: "middle",
        margin: "0 4px",
        background: color,
        WebkitMaskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        maskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
      }}
    />
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
        background: "#000",
        lineHeight: 1.55,
        textAlign: "left",
      }}
    >
      <picture>
        <source srcSet="/icons/bmm-logo-horisontal.avif" type="image/avif" />
        <source srcSet="/icons/bmm-logo-horisontal.webp" type="image/webp" />
        <img
          src="/icons/bmm-logo-horisontal.png"
          alt="Bryggmästarnas Mästare"
          style={{
            display: "block",
            width: "min(100%, 560px)",
            height: "auto",
            margin: "16px auto 12px",
          }}
          draggable={false}
        />
      </picture>
      <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.7rem, 5.2vw, 2.3rem)", fontWeight: 900, color: "#fff", textAlign: "center" }}>
        Spelets regler
      </h1>
      <p style={{ margin: "0 0 20px", opacity: 0.9, fontSize: 16 }}>
        Här är samma upplägg som i snabbguiden: slå och välj väg, hantera rutan, klara strider och nå bossrundan. Målet är att
        vinna genom att besegra slutbossen eller vara sista bryggaren kvar.
      </p>
      <p style={{ margin: "0 0 20px", opacity: 0.72, fontSize: 14 }}>
        Vill du se alla kort med bild? Öppna{" "}
        <Link to="/cards" style={{ color: "#93c5fd" }}>
          {sv.home.footerCards}
        </Link>
        .
      </p>

      {sectionTitle("🎲 Slå och välj väg")}
      {tutorialImage("/tutorial/tut4.png", "Snabbguide: slå och välj väg")}
      <p>
        På din tur slår du rörelsetärningen och väljer riktning. Du flyttar exakt så många steg som tärningen visar.
      </p>
      <p style={{ marginTop: 12 }}>
        Under turen kan du också spela föremål från handen för att förbättra dina odds inför det som väntar på rutan du landar
        på.
      </p>
      <p style={{ marginTop: 14 }}>
        När du senare vill gå upp i nivå kostar det Pant {inlineIcon("/icons/pant-icon.svg", "#d1d5db")} eller Klunkar{" "}
        {inlineIcon("/icons/klunk-icon.svg", "#facc15")}:
      </p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          <strong>Nivå 2:</strong> Kostar 20 Pant eller 8 Klunkar.
        </li>
        <li>
          <strong>Nivå 3:</strong> Kostar 30 Pant eller 16 Klunkar.
        </li>
      </ul>

      {sectionTitle("🧭 Hantera rutan")}
      {tutorialImage("/tutorial/tut3.png", "Snabbguide: hantera rutan")}
      <p>När du landar på en ruta aktiveras dess effekt. Vanliga ruttyper är:</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          {inlineIcon("/icons/event-icon.svg", "#60a5fa")}
          <strong>Händelse:</strong> Slumpmässig effekt som kan hjälpa eller stjälpa.
        </li>
        <li>
          {inlineIcon("/icons/reward-icon.svg", "#facc15")}
          <strong>Skatt:</strong> Möjlighet till ny utrustning/föremål.
        </li>
        <li>
          {inlineIcon("/icons/heart-icon.svg", "#f472b6")}
          <strong>Vila:</strong> Återhämtning av HP.
        </li>
        <li>
          {inlineIcon("/icons/panta-icon.svg", "#fb923c")}
          <strong>Panta burkar:</strong> Butik där du använder Pant.
        </li>
        <li>
          {inlineIcon("/icons/monster-icon.svg", "#ef4444")}
          {inlineIcon("/icons/bvb-icon.svg", "#d1d5db")}
          <strong>Dålig batch / BvB:</strong> Strid mot monster eller annan spelare.
        </li>
      </ul>

      {sectionTitle("⚔️ Dåliga batchar, mutor och sabotage")}
      {tutorialImage("/tutorial/tut2.png", "Snabbguide: dåliga batchar, mutor och sabotage")}
      <p>
        I strid jämförs din total (tärning + utrustning + eventuella föremål) med fiendens styrka.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Vinst:</strong> Belöningar som pant {inlineIcon("/icons/pant-icon.svg", "#d1d5db")} / skatter{" "}
        {inlineIcon("/icons/reward-icon.svg", "#facc15")}. <strong>Förlust:</strong> HP-förlust{" "}
        {inlineIcon("/icons/heart-icon.svg", "#f472b6")} och ibland straffklunkar{" "}
        {inlineIcon("/icons/klunk-icon.svg", "#facc15")}.
      </p>
      <p style={{ marginTop: 12 }}>
        Medspelare kan ofta påverka strider genom att hjälpa eller sabotera. Ibland sker det mot betalning i pant/skatter.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Kritisk miss:</strong> En etta på tärningen {inlineIcon("/icons/skull-icon.svg", "#ef4444")} är alltid en
        förlust.
      </p>

      {sectionTitle("🏆 Nivåer, bossen och vinst")}
      {tutorialImage("/tutorial/tut1.png", "Snabbguide: nivåer, bossen och vinst")}
      <p>
        När en spelare når hög nivå startar slutskedet där målet är att klara bossrundan. Där avgörs ofta matchen.
      </p>
      <p style={{ marginTop: 12 }}>Spelet kan avslutas på två sätt:</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          <strong>Seger:</strong> Den spelare som först besegrar slutbossen (som har {FINAL_BOSS_LIFE_TOTAL} liv) vinner.
        </li>
        <li>
          <strong>Sist kvar:</strong> Om alla andra spelare slagits ut eller gett upp vinner sista bryggaren.
        </li>
      </ul>
    </div>
  );
}
