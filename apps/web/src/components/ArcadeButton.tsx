import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import styles from "./ArcadeButton.module.css";

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
        <span className={styles.label}>{children}</span>
      </span>
    </button>
  );
}

