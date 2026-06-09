import type { CSSProperties } from "react";
import styles from "../../routes/PlayView.module.css";

export function TutorialInlineIcon(props: {
  src: string;
  color: string;
  gap?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      data-arcade-label-icon=""
      className={[styles.tutorialInlineIcon, props.className].filter(Boolean).join(" ")}
      style={
        {
          ["--ti-gap" as string]: props.gap ?? "0 3px",
          ["--ti-color" as string]: props.color,
          ["--ti-mask-image" as string]: `url(${props.src})`,
          ...props.style,
        } as CSSProperties
      }
    />
  );
}
