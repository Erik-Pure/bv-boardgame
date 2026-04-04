import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ArcadeButton.module.css";

export function ArcadeButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "blue" | "pink" | "gray";
    size?: "md" | "sm";
    fullWidth?: boolean;
    children: ReactNode;
  },
) {
  const {
    variant = "blue",
    size = "md",
    fullWidth = false,
    className,
    children,
    ...rest
  } = props;

  const cls = [
    styles.btn,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth ? styles.fullWidth : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} {...rest}>
      <span className={styles.inner}>{children}</span>
    </button>
  );
}

