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
        Spelregler
      </h1>
      <p style={{ margin: "0 0 12px", opacity: 0.92, fontSize: 16 }}>
        I jakten på den perfekta brygden räknas varje erfarenhet. Oavsett om du räddar en fantastisk batch eller tvingas dricka
        upp dina misslyckanden, så blir du en visare bryggmästare.
      </p>
      <p style={{ margin: "0 0 20px", opacity: 0.92, fontSize: 16 }}>
        Man lär sig av sina misstag – men man lär sig snabbare av framgång.
      </p>
      <p style={{ margin: "0 0 20px", opacity: 0.72, fontSize: 14 }}>
        Vill du se alla kort med bild? Öppna{" "}
        <Link to="/cards" style={{ color: "#93c5fd" }}>
          {sv.home.footerCards}
        </Link>
        .
      </p>

      {sectionTitle("🎲 1. Spelets gång")}
      {tutorialImage("/tutorial/tut4.png", "Snabbguide: slå och välj väg")}
      <p>
        På din tur slår du rörelsetärningen och väljer riktning. Du flyttar exakt så många steg som tärningen visar.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Förberedelser:</strong> Du kan spela föremål från handen för att förbättra dina odds inför rutan du landar på.
      </p>

      {sectionTitle("📈 2. Erfarenhet (XP) & Nivåer")}
      <p>
        Du klättrar i nivå genom att samla Erfarenhetspoäng (XP).
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Vinst i strid (Räddad batch):</strong> Att besegra en dålig batch ger en rejäl dos XP (se respektive kort).
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Förlust i strid (Straffklunkar):</strong> Om du förlorar tvingas du dricka straffklunkar. Varje klunk ger XP,
        så även motgångar för dig framåt.
      </p>
      <p style={{ marginTop: 12 }}>
        XP-systemet är progressivt: varje nytt nivåsteg kräver mer XP än det förra.
      </p>
      <p style={{ marginTop: 12 }}>
        När du når en ny nivå möts du av budskapet:
      </p>
      <p style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.32)", background: "rgba(15,23,42,0.45)" }}>
        "Dina erfarenheter – från räddade batcher till den bittra läxan i glaset – har gett resultat. Du är nu tillräckligt
        härdad för att lämna nybörjarträsket bakom dig och låsa upp nästa nivå. Vågar du anta utmaningen och höja
        svårighetsgraden, eller har du redan fått nog?"
      </p>

      {sectionTitle("🧭 3. Hantera rutan")}
      {tutorialImage("/tutorial/tut3.png", "Snabbguide: hantera rutan")}
      <p>När du landar på en ruta aktiveras dess effekt:</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          {inlineIcon("/icons/event-icon.svg", "#60a5fa")}
          <strong>Händelse:</strong> Slumpmässiga möten som kan hjälpa eller stjälpa din resa.
        </li>
        <li>
          {inlineIcon("/icons/reward-icon.svg", "#facc15")}
          <strong>Skatt:</strong> Möjlighet till ny utrustning eller kraftfulla föremål.
        </li>
        <li>
          {inlineIcon("/icons/heart-icon.svg", "#f472b6")}
          <strong>Vila:</strong> Återhämtning av HP så att du orkar fortsätta brygga.
        </li>
        <li>
          {inlineIcon("/icons/panta-icon.svg", "#fb923c")}
          <strong>Panta burkar:</strong> Butik där du använder din Pant för att köpa utrustning och sabotage.
        </li>
        <li>
          {inlineIcon("/icons/monster-icon.svg", "#ef4444")}
          {inlineIcon("/icons/bvb-icon.svg", "#d1d5db")}
          <strong>Dålig batch / BvB:</strong> Strid mot monster eller utmana en medspelare.
        </li>
      </ul>

      {sectionTitle("⚔️ 4. Strider, mutor och sabotage")}
      {tutorialImage("/tutorial/tut2.png", "Snabbguide: dåliga batchar, mutor och sabotage")}
      <p>
        I strid jämförs din total (tärning + utrustning + eventuella föremål) med fiendens styrka.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Vinst:</strong> Du får XP {inlineIcon("/icons/lvlup.svg", "#60a5fa")}, pant{" "}
        {inlineIcon("/icons/pant-icon.svg", "#d1d5db")} och skatter {inlineIcon("/icons/reward-icon.svg", "#facc15")}.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Förlust:</strong> Du tappar HP {inlineIcon("/icons/heart-icon.svg", "#f472b6")} och dricker straffklunkar{" "}
        {inlineIcon("/icons/klunk-icon.svg", "#facc15")} (som i sin tur ger XP).
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Kritisk miss:</strong> En etta på tärningen {inlineIcon("/icons/skull-icon.svg", "#ef4444")} är alltid en
        förlust.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Interaktion:</strong> Medspelare kan ofta påverka strider genom att hjälpa eller sabotera, ibland mot betalning
        i pant.
      </p>

      {sectionTitle("🏆 5. Vinstvillkor")}
      {tutorialImage("/tutorial/tut1.png", "Snabbguide: nivåer, bossen och vinst")}
      <p>När en spelare når högsta nivåskiktet startar slutskedet.</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          <strong>Seger:</strong> Den spelare som först besegrar slutbossen (som har {FINAL_BOSS_LIFE_TOTAL} liv) vinner.
        </li>
        <li>
          <strong>Sist kvar:</strong> Om alla andra spelare förlorat sitt HP eller gett upp vinner den sista kvarvarande
          bryggaren.
        </li>
      </ul>
    </div>
  );
}
