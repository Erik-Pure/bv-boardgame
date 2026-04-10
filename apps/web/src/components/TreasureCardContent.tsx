import { CombatOutcomeThumb } from "./CombatOutcomeThumb";
import { sv } from "../lib/uiStrings";

const PANT_ICON = "/icons/pant-icon.svg";
const PANT_TINT = "#d1d5db";

function MaskedIcon({ src, color, size = 26 }: { src: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: color,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

function PantRewardLine({ value }: { value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <MaskedIcon src={PANT_ICON} color={PANT_TINT} size={28} />
      <span style={{ fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "0.02em" }}>
        +{value}
      </span>
    </div>
  );
}

function parseTreasurePant(text: string, cardId: string): { intro: string; pant: number | null } {
  if (cardId === "treasure_empty") {
    return { intro: text.trim(), pant: null };
  }
  if (cardId !== "treasure_cache") {
    return { intro: text.trim(), pant: null };
  }
  const m = text.match(/\+(\d+)\s*pant/i);
  if (!m) return { intro: text.trim(), pant: null };
  const pant = parseInt(m[1], 10);
  const intro = text.replace(/\s*\+\s*\d+\s*pant\.?/i, "").trim();
  return { intro, pant };
}

/** Skattkort — samma visuella språk som vinst/förlust (ark, tumme-byte, belöningsruta). */
export function TreasureCardContent(props: { title: string; text: string; cardId: string }) {
  const { intro, pant } = parseTreasurePant(props.text, props.cardId);
  const isEmpty = props.cardId === "treasure_empty";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        color: "#fff",
        padding: "8px 4px 0",
        gap: 14,
      }}
    >
      <h1
        style={{
          fontFamily: "var(--heading)",
          fontSize: "clamp(1.65rem, 9cqw, 2.85rem)",
          fontWeight: 400,
          lineHeight: 1.05,
          margin: 0,
          color: "#ffffff",
          letterSpacing: "0.04em",
        }}
      >
        {props.title}
      </h1>
      <CombatOutcomeThumb outcome={isEmpty ? "treasureEmpty" : "treasure"} />
      <p style={{ fontFamily: "var(--sans)", fontSize: 17, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>
        {intro}
      </p>

      {typeof pant === "number" && pant > 0 ? (
        <div style={{ width: "100%", maxWidth: 340, marginTop: 10 }}>
          <div
            style={{
              fontFamily: "var(--sans)",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            {sv.play.treasureLootHeading}
          </div>
          <div
            style={{
              height: 1,
              width: "100%",
              background: "rgba(255,255,255,0.28)",
              marginBottom: 18,
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px 32px",
            }}
          >
            <PantRewardLine value={pant} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
