import { useUiStrings } from "../lib/locale/LocaleContext";
import { BrandLogoImg } from "../components/BrandLogoImg";

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
  const ui = useUiStrings();
  const r = ui.rules;

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
      <BrandLogoImg
        variant="horizontal"
        alt={r.logoAlt}
        style={{
          display: "block",
          width: "min(100%, 560px)",
          height: "auto",
          margin: "16px auto 12px",
        }}
        draggable={false}
      />
      <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.7rem, 5.2vw, 2.3rem)", fontWeight: 900, color: "#fff", textAlign: "center" }}>
        {r.title}
      </h1>
      <p style={{ margin: "0 0 12px", opacity: 0.92, fontSize: 16 }}>{r.intro}</p>
      {sectionTitle(r.section1Title)}
      {tutorialImage("/tutorial/tut4.png", r.section1ImageAlt)}
      <p>{r.section1TurnIntro}</p>
      <p style={{ marginTop: 12 }}>
        <strong>{r.movementLabel}</strong> {r.movementText}
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>{r.recycleLabel}</strong> {r.recycleText}
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>{r.prepLabel}</strong> {r.prepText}
      </p>

      {sectionTitle(r.section2Title)}
      <p>{r.xpIntro}</p>
      <p style={{ marginTop: 12 }}>
        <strong>{r.winXpLabel}</strong> {r.winXpText}
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>{r.lossXpLabel}</strong> {r.lossXpText}
      </p>
      <p style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.32)", background: "rgba(15,23,42,0.45)" }}>
        <strong>{r.levelUpBoxTitle}</strong>
        <br />
        {r.levelUpBoxText}
      </p>

      {sectionTitle(r.section3Title)}
      {tutorialImage("/tutorial/tut3.png", r.section3ImageAlt)}
      <p>{r.section3Intro}</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          {inlineIcon("/icons/event-icon.svg", "#60a5fa")}
          <strong>{r.tileEventLabel}</strong> {r.tileEventText}
        </li>
        <li>
          {inlineIcon("/icons/reward-icon.svg", "#facc15")}
          <strong>{r.tileTreasureLabel}</strong> {r.tileTreasureText}
        </li>
        <li>
          {inlineIcon("/icons/heart-icon.svg", "#f472b6")}
          <strong>{r.tileRestLabel}</strong> {r.tileRestText}
        </li>
        <li>
          {inlineIcon("/icons/monster-icon.svg", "#ef4444")}
          {inlineIcon("/icons/bvb-icon.svg", "#d1d5db")}
          <strong>{r.tileCombatLabel}</strong> {r.tileCombatText}
        </li>
      </ul>

      {sectionTitle(r.section4Title)}
      {tutorialImage("/tutorial/tut2.png", r.section4ImageAlt)}
      <p>{r.combatIntro}</p>
      <p style={{ marginTop: 12 }}>
        <strong>{r.combatWinLabel}</strong> {r.combatWinYouGet} {inlineIcon("/icons/lvlup.svg", "#60a5fa")}, {r.combatWinPant}{" "}
        {inlineIcon("/icons/pant-icon.svg", "#d1d5db")} {r.combatWinAndTreasure} {inlineIcon("/icons/reward-icon.svg", "#facc15")}.
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>{r.combatLossLabel}</strong> {r.combatLossYouLose} {inlineIcon("/icons/heart-icon.svg", "#f472b6")} {r.combatLossAndSips}{" "}
        {inlineIcon("/icons/klunk-icon.svg", "#facc15")} {r.combatLossSipXpNote}
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>{r.combatCritLabel}</strong> {r.combatCritBeforeDie} {inlineIcon("/icons/skull-icon.svg", "#ef4444")} {r.combatCritAfterDie}
      </p>
      <p style={{ marginTop: 12 }}>
        <strong>{r.combatInteractLabel}</strong> {r.combatInteractText}
      </p>

      {sectionTitle(r.section5Title)}
      {tutorialImage("/tutorial/tut1.png", r.section5ImageAlt)}
      <p>{r.section5Intro}</p>
      <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
        <li>
          <strong>{r.winMasterLabel}</strong> {r.winMasterText}
        </li>
        <li>
          <strong>{r.winLastLabel}</strong> {r.winLastText}
        </li>
      </ul>
    </div>
  );
}
