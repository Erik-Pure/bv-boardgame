import type { CSSProperties } from "react";

/** Händelse-/skattkort: rubrik i spel (mobil + bord). */
export const CARD_EVENT_TITLE_STYLE: CSSProperties = {
  fontFamily: '"Permanent Marker", var(--heading), sans-serif',
  fontWeight: 900,
  fontSize: 22,
  lineHeight: 1.1,
  letterSpacing: "0.02em",
  wordBreak: "break-word",
};

/** Brödtext + CardRichText i spel (mobil CardModal, bord eventCardBody). */
export const CARD_BODY_TEXT_STYLE: CSSProperties = {
  fontFamily: "var(--sans)",
  fontSize: 15,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  color: "#e5e7eb",
  opacity: 0.98,
};

export const CARD_FLAVOUR_TEXT_STYLE: CSSProperties = {
  ...CARD_BODY_TEXT_STYLE,
  fontStyle: "italic",
  opacity: 0.85,
};

/** Föremål/utrustning i detaljvy — nära spelkänsla. */
export const CARD_ITEM_DETAIL_TEXT_STYLE: CSSProperties = {
  fontFamily: "var(--sans)",
  fontSize: 15,
  lineHeight: 1.45,
  opacity: 0.9,
};
