import {
  Children,
  isValidElement,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { segmentStringForArcadeButtonLabel } from "../lib/splitLeadingEmojiFromDisplayName";
import styles from "./ArcadeButton.module.css";

function isLabelLeadingIcon(el: unknown): el is ReactElement {
  if (!isValidElement(el)) return false;
  if ((el.props as Record<string, unknown>)["data-arcade-label-icon"] != null) return true;
  if (el.type !== "span") return false;
  const cls = (el.props as { className?: string }).className ?? "";
  return cls.includes("tutorialInlineIcon") || cls.includes("labelEmoji");
}

function renderStringLabel(text: string): ReactNode {
  const segments = segmentStringForArcadeButtonLabel(text);
  if (segments.length === 0) return null;
  if (segments.length === 1 && segments[0].kind === "text") {
    return <span className={styles.labelText}>{segments[0].value}</span>;
  }
  return (
    <span className={styles.labelInline}>
      {segments.map((seg, i) =>
        seg.kind === "emoji" ? (
          <span key={i} className={styles.labelEmoji} aria-hidden>
            {seg.value}
          </span>
        ) : (
          <span key={i} className={styles.labelText}>
            {seg.value}
          </span>
        ),
      )}
    </span>
  );
}

function renderLabelChildren(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    return renderStringLabel(children);
  }
  const parts = Children.toArray(children);
  if (parts.length === 1 && typeof parts[0] === "string") {
    return renderLabelChildren(parts[0]);
  }
  if (parts.every((p) => typeof p === "string")) {
    return renderLabelChildren(parts.join(""));
  }
  if (parts.length === 1 && isLabelLeadingIcon(parts[0])) {
    return children;
  }
  if (parts.length >= 2 && isLabelLeadingIcon(parts[0])) {
    const rest = parts.slice(1);
    const text =
      rest.length === 1 && typeof rest[0] === "string" ? (
        <span className={styles.labelText}>{rest[0]}</span>
      ) : (
        <span className={styles.labelText}>{rest}</span>
      );
    return (
      <>
        {parts[0]}
        {text}
      </>
    );
  }
  return <span className={styles.labelText}>{children}</span>;
}

export function ArcadeButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "blue" | "pink" | "gray" | "merchant";
    /** Mörka knappar (`pink`/`blue`): guldram + guldtext — t.ex. vald spelare i målval. */
    selected?: boolean;
    size?: "lg" | "md" | "sm";
    fullWidth?: boolean;
    innerStyle?: CSSProperties;
    children: ReactNode;
  },
) {
  const {
    variant = "blue",
    selected = false,
    size = "md",
    fullWidth = false,
    innerStyle,
    className,
    children,
    ...rest
  } = props;

  const cls = [
    styles.btn,
    styles[`variant_${variant}`],
    selected ? styles.selectedGold : "",
    styles[`size_${size}`],
    fullWidth ? styles.fullWidth : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} {...rest}>
      <span className={styles.inner} style={innerStyle}>
        <span className={styles.label}>{renderLabelChildren(children)}</span>
      </span>
    </button>
  );
}

