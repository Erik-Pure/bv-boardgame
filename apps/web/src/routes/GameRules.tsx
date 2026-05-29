import { Link } from "react-router-dom";

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
        upp dina misslyckanden, växer din visdom. Man lär sig av sina misstag – men man lär sig snabbare av framgång.
      </p>
      <p style={{ margin: "0 0 20px", opacity: 0.72, fontSize: 14 }}>
        Vill du se alla kort? Se vår{" "}
        <Link to="/cards" style={{ color: "#93c5fd" }}>
          [Kortkatalog]
        </Link>
      </p>

      {sectionTitle("🎲 1. Spelets gång")}
      {tutorialImage("/tutorial/tut4.png", "Snabbguide: slå och välj väg")}
      <p>Varje tur börjar med ett val — sedan handling på rutorna du når:</p>
      <p style={{ marginTop: 12 }}>
        <strong>Förflyttning:</strong> Slå rörelsetärningen och flytta exakt så många steg tärningen visar i valfri riktning.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Panta burkar:</strong> I stället för att slå tärningen kan du handla (kräver minst 5 pant). Pjäsen står kvar;
        tur avslutas när du lämnar butiken.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Förberedelser:</strong> Innan du landar på en ruta får du spela föremål från handen för att förbättra dina odds
        eller optimera dina stats.
      </p>

      {sectionTitle("📈 2. Erfarenhet (XP) & Nivåer")}
      <p>
        Du klättrar i nivå genom att samla Erfarenhetspoäng (XP). Ju högre nivå du når, desto mer XP krävs för nästa steg.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Vinst i strid (Räddad batch):</strong> Att besegra en dålig batch ger en rejäl dos XP (se värde på kortet).
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>Förlust i strid (Straffklunkar):</strong> Om du förlorar tvingas du dricka straffklunkar. Varje klunk härdar dig
        och ger en liten mängd XP – även motgångar för dig framåt!
      </p>
      <p style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.32)", background: "rgba(15,23,42,0.45)" }}>
        <strong>Nivå upp!</strong>
        <br />
        "Dina erfarenheter – från räddade batcher till bittra läxor i glaset – har gett resultat. Du lämnar nu nybörjarträsket
        bakom dig. Vågar du höja svårighetsgraden, eller har du redan fått nog?"
      </p>

      {sectionTitle("🧭 3. Rutor och händelser")}
      {tutorialImage("/tutorial/tut3.png", "Snabbguide: hantera rutan")}
      <p>När du landar på en ruta aktiveras dess effekt omedelbart:</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          {inlineIcon("/icons/event-icon.svg", "#60a5fa")}
          <strong>Händelse:</strong> Slumpmässiga möten som kan hjälpa eller stjälpa din resa.
        </li>
        <li>
          {inlineIcon("/icons/reward-icon.svg", "#facc15")}
          <strong>Skatt:</strong> Möjlighet att hitta ny utrustning eller kraftfulla föremål.
        </li>
        <li>
          {inlineIcon("/icons/heart-icon.svg", "#f472b6")}
          <strong>Vila:</strong> Återhämtning av HP så att du orkar fortsätta bryggandet.
        </li>
        <li>
          {inlineIcon("/icons/monster-icon.svg", "#ef4444")}
          {inlineIcon("/icons/bvb-icon.svg", "#d1d5db")}
          <strong>Dålig batch / BvB:</strong> Strid mot en misslyckad brygd eller utmana en medspelare (Bryggare mot Bryggare).
        </li>
      </ul>
      <p style={{ marginTop: 12, opacity: 0.88, fontSize: 15 }}>
        <strong>Handel:</strong> Det finns ingen affärsruta på brädet — butiken nås via{" "}
        {inlineIcon("/icons/panta-icon.svg", "#fb923c")}
        <strong>Panta burkar</strong> i början av din tur (se avsnitt 1).
      </p>

      {sectionTitle("⚔️ 4. Strider, mutor och sabotage")}
      {tutorialImage("/tutorial/tut2.png", "Snabbguide: dåliga batchar, mutor och sabotage")}
      <p>
        I strid jämförs din Totalstyrka (Tärningsslag + Utrustning + Föremål) mot fiendens styrka.
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
      <p>När en spelare når den högsta nivån inleds slutskedet. Spelet kan vinnas på två sätt:</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          <strong>Mästerbryggaren:</strong> Besegra slutbossen (som har 3 liv) före alla andra.
        </li>
        <li>
          <strong>Sista klunken:</strong> Om alla andra spelare förlorar sitt HP eller ger upp, vinner den sista kvarvarande
          bryggaren.
        </li>
      </ul>
    </div>
  );
}
