import { Fragment, type CSSProperties } from "react";
import type { CardRichLine, CardRollOutcomeRow } from "@bv/game-core";
import { parseCardRichText, parseCardRichTextLine, shouldShowCardRollOutcomeTable } from "@bv/game-core";
import { CardInlineIcon } from "./CardInlineIcon";
import styles from "./CardRichText.module.css";

/** Fetstilar alla tal i korttext (t.ex. +3, 2 skada, tärningsutfall). */
export function TextWithBoldNumbers({ value }: { value: string }) {
  const parts = value.split(/(\d+)/);
  if (parts.length <= 1) return <>{value}</>;
  return (
    <>
      {parts.map((part, i) =>
        part.length > 0 && /^\d+$/.test(part) ? (
          <span key={i} className={styles.num}>
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function RichLine(props: { segments: CardRichLine }) {
  return (
    <span className={styles.inlineLine}>
      {props.segments.map((seg, i) =>
        seg.type === "icon" ? (
          <CardInlineIcon key={i} kind={seg.kind} />
        ) : (
          <span key={i} className={seg.bold ? styles.iconKeyword : undefined}>
            <TextWithBoldNumbers value={seg.value} />
          </span>
        ),
      )}
    </span>
  );
}

function CardRollOutcomeList(props: { intro: string; rows: CardRollOutcomeRow[] }) {
  const introLines = parseCardRichText(props.intro.trim());
  return (
    <div className={styles.rollBlock}>
      {introLines.map((segments, i) => (
        <div key={i} className={styles.line}>
          <RichLine segments={segments} />
        </div>
      ))}
      <ul className={styles.rollList}>
        {props.rows.map((row) => (
          <li key={row.range} className={styles.rollItem}>
            <span className={styles.rollRange}>{row.range}: </span>
            <span className={styles.rollItemBody}>
              <RichLine segments={parseCardRichTextLine(row.text)} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CardRichText(props: {
  text: string;
  rollOutcomes?: CardRollOutcomeRow[];
  className?: string;
  style?: CSSProperties;
}) {
  const showTable = shouldShowCardRollOutcomeTable(props.rollOutcomes, props.text);
  if (showTable && props.rollOutcomes?.length) {
    const intro = props.text.split("\n")[0]?.trim() || "Slå tärningen.";
    return (
      <div
        className={[styles.root, props.className].filter(Boolean).join(" ")}
        style={props.style}
      >
        <CardRollOutcomeList intro={intro} rows={props.rollOutcomes} />
      </div>
    );
  }
  const lines = parseCardRichText(props.text);
  return (
    <div
      className={[styles.root, props.className].filter(Boolean).join(" ")}
      style={props.style}
    >
      {lines.map((segments, i) => (
        <div key={i} className={styles.line}>
          <RichLine segments={segments} />
        </div>
      ))}
    </div>
  );
}
