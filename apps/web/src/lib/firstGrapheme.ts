/** Första grafem (emoji-säker) för spelmarkörer och initialer. */
export function firstGrapheme(name: string | undefined | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const first = seg.segment(trimmed)[Symbol.iterator]().next().value?.segment;
    if (first) return first.toUpperCase();
  }
  return trimmed[0]!.toUpperCase();
}
