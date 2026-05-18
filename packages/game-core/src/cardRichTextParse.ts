/** Ikon-typer som webben mappar till SVG (pant, HP, klunk, stridsreaktion/attack, tärning). */
export type CardRichIconKind = "pant" | "hp" | "klunk" | "combat" | "combatPos" | "combatNeg" | "dice";

export type CardRichSegment =
  | { type: "text"; value: string; bold?: boolean }
  | { type: "icon"; kind: CardRichIconKind };

export type CardRichLine = CardRichSegment[];

type IconPlacement = "before" | "after";

type KeywordRule = {
  pattern: RegExp;
  icon?: { kind: CardRichIconKind; placement: IconPlacement };
};

const KEYWORD_RULES: KeywordRule[] = [
  { pattern: /stridsreaktion/gi },
  { pattern: /\battack\b/gi, icon: { kind: "combat", placement: "after" } },
  { pattern: /straffklunk(?:ar)?/gi, icon: { kind: "klunk", placement: "after" } },
  { pattern: /\bklunk(?:ar)?\b/gi, icon: { kind: "klunk", placement: "after" } },
  { pattern: /\bpant\b/gi, icon: { kind: "pant", placement: "after" } },
  { pattern: /\bHP\b/g, icon: { kind: "hp", placement: "after" } },
  { pattern: /\bskada\b/gi, icon: { kind: "hp", placement: "after" } },
];

type MatchSpan = {
  start: number;
  end: number;
  icon?: { kind: CardRichIconKind; placement: IconPlacement };
};

/** +N attack → grön ikon; −N attack → röd (samma som tidigare combat). */
function combatIconKindBeforeAttack(line: string, attackStart: number): "combatPos" | "combatNeg" {
  const before = line.slice(0, attackStart);
  if (/[−-]\s*\d+\s*$/.test(before)) return "combatNeg";
  if (/\+\s*\d+\s*$/.test(before)) return "combatPos";
  return "combatNeg";
}

function findKeywordMatches(line: string): MatchSpan[] {
  const raw: MatchSpan[] = [];
  for (const rule of KEYWORD_RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const icon =
        rule.icon?.kind === "combat"
          ? {
              kind: combatIconKindBeforeAttack(line, m.index),
              placement: rule.icon.placement,
            }
          : rule.icon;
      raw.push({
        start: m.index,
        end: m.index + m[0].length,
        icon,
      });
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
  const matches = findKeywordMatches(line);
  if (matches.length === 0) {
    if (line.length > 0 || segments.length === 0) {
      segments.push({ type: "text", value: line });
    }
    return markDiceLineTextBold(segments);
  }
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ type: "text", value: line.slice(cursor, m.start) });
    }
    const word = line.slice(m.start, m.end);
    if (!m.icon) {
      segments.push({ type: "text", value: word, bold: true });
    } else if (m.icon.placement === "after") {
      segments.push({ type: "text", value: word, bold: true });
      segments.push({ type: "icon", kind: m.icon.kind });
    } else {
      segments.push({ type: "icon", kind: m.icon.kind });
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
