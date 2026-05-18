/** Ikon-typer som webben mappar till SVG (pant, HP, klunk, stridsreaktion, tärning). */
export type CardRichIconKind = "pant" | "hp" | "klunk" | "combat" | "dice";

export type CardRichSegment =
  | { type: "text"; value: string; bold?: boolean }
  | { type: "icon"; kind: CardRichIconKind };

export type CardRichLine = CardRichSegment[];

type IconPlacement = "before" | "after";

type IconRule = { kind: CardRichIconKind; pattern: RegExp; placement: IconPlacement };

const ICON_RULES: IconRule[] = [
  { kind: "combat", pattern: /stridsreaktion/gi, placement: "before" },
  { kind: "klunk", pattern: /straffklunk(?:ar)?/gi, placement: "after" },
  { kind: "klunk", pattern: /\bklunk(?:ar)?\b/gi, placement: "after" },
  { kind: "pant", pattern: /\bpant\b/gi, placement: "after" },
  { kind: "hp", pattern: /\bHP\b/g, placement: "after" },
  { kind: "hp", pattern: /\bskada\b/gi, placement: "after" },
];

type MatchSpan = { start: number; end: number; kind: CardRichIconKind };

function findIconMatches(line: string): MatchSpan[] {
  const raw: MatchSpan[] = [];
  for (const rule of ICON_RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      raw.push({ start: m.index, end: m.index + m[0].length, kind: rule.kind });
    }
  }
  raw.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept: MatchSpan[] = [];
  let lastEnd = -1;
  for (const span of raw) {
    if (span.start >= lastEnd) {
      kept.push(span);
      lastEnd = span.end;
    }
  }
  return kept;
}

function lineNeedsLeadingDiceIcon(line: string): boolean {
  return /^\s*Slå tärning/i.test(line) || /^\s*Tärning:/i.test(line);
}

function markDiceLineTextBold(segments: CardRichLine): CardRichLine {
  if (segments[0]?.type !== "icon" || segments[0].kind !== "dice") return segments;
  return segments.map((s) => (s.type === "text" ? { ...s, bold: true } : s));
}

/** Tokeniserar en textrad: ikoner som visuellt stöd — nyckelord + tärningsrader fetstils. */
export function parseCardRichTextLine(line: string): CardRichLine {
  const segments: CardRichLine = [];
  if (lineNeedsLeadingDiceIcon(line)) {
    segments.push({ type: "icon", kind: "dice" });
  }
  const matches = findIconMatches(line);
  if (matches.length === 0) {
    if (line.length > 0 || segments.length === 0) {
      segments.push({ type: "text", value: line });
    }
    return markDiceLineTextBold(segments);
  }
  const placementByKind = new Map<CardRichIconKind, IconPlacement>();
  for (const rule of ICON_RULES) {
    if (!placementByKind.has(rule.kind)) placementByKind.set(rule.kind, rule.placement);
  }
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ type: "text", value: line.slice(cursor, m.start) });
    }
    const word = line.slice(m.start, m.end);
    const placement = placementByKind.get(m.kind) ?? "before";
    if (placement === "after") {
      segments.push({ type: "text", value: word, bold: true });
      segments.push({ type: "icon", kind: m.kind });
    } else {
      segments.push({ type: "icon", kind: m.kind });
      segments.push({ type: "text", value: word, bold: true });
    }
    cursor = m.end;
  }
  if (cursor < line.length) {
    segments.push({ type: "text", value: line.slice(cursor) });
  }
  return markDiceLineTextBold(segments);
}

/** Delar brödtext på rader och tokeniserar varje rad. */
export function parseCardRichText(text: string): CardRichLine[] {
  if (!text) return [];
  return text.split("\n").map((line) => parseCardRichTextLine(line));
}

/** Sant om utfallstabell ska visas (intro + lista, inte efter tärningsslag). */
export function shouldShowCardRollOutcomeTable(
  rollOutcomes: readonly { range: string; text: string }[] | undefined,
  displayText: string,
): boolean {
  if (!rollOutcomes?.length) return false;
  return !/\nTärning:/i.test(displayText);
}
