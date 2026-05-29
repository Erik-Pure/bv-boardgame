export type ArcadeButtonLabelSegment = { kind: "emoji" | "text"; value: string };

function graphemesOf(text: string): string[] {
  if (!text) return [];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...seg.segment(text)].map((s) => s.segment);
  }
  return [...text];
}

function isEmojiGrapheme(g: string): boolean {
  return /\p{Extended_Pictographic}/u.test(g);
}

/** Delar sträng i text/emoji för ArcadeButton (gradient-text får inte täcka emoji). */
export function segmentStringForArcadeButtonLabel(text: string): ArcadeButtonLabelSegment[] {
  if (!text) return [];
  const out: ArcadeButtonLabelSegment[] = [];
  let buf = "";
  let kind: "emoji" | "text" | null = null;
  const flush = () => {
    if (buf && kind) out.push({ kind, value: buf });
    buf = "";
    kind = null;
  };
  for (const g of graphemesOf(text)) {
    const gKind = isEmojiGrapheme(g) ? "emoji" : "text";
    if (kind === gKind) {
      buf += g;
    } else {
      flush();
      kind = gKind;
      buf = g;
    }
  }
  flush();
  return out;
}

/** Delar ledande emoji från visningsnamn (t.ex. spelarnamn på knappar). */
export function splitLeadingEmojiFromDisplayName(name: string): { emoji: string | null; text: string } {
  const trimmed = name.trim();
  if (!trimmed) return { emoji: null, text: "" };
  const segments = segmentStringForArcadeButtonLabel(trimmed);
  if (segments[0]?.kind !== "emoji") {
    return { emoji: null, text: trimmed };
  }
  const emoji = segments[0].value;
  const text = segments
    .slice(1)
    .map((s) => s.value)
    .join("")
    .trimStart();
  return { emoji, text };
}
