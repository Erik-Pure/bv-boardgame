import type { CSSProperties, ReactNode } from "react";
import { sv } from "../lib/uiStrings";

export function CombatSheetFrame(props: {
  children: ReactNode;
  sheetTitle?: string;
  titleStyle?: CSSProperties;
  /** false: ingen rubrikrad (t.ex. vinst/förlust där huvudrubriken är i innehållet). */
  showSheetTitle?: boolean;
}) {
  const showTitle = props.showSheetTitle !== false;
  return (
    <>
      {showTitle ? (
        <div
          style={{
            fontFamily: "var(--heading)",
            fontWeight: 800,
            fontSize: 17,
            marginBottom: 10,
            textAlign: "left",
            width: "100%",
            color: "#fff",
            ...props.titleStyle,
          }}
        >
          {props.sheetTitle ?? sv.play.combatCardSheetTitle}
        </div>
      ) : null}
      {props.children}
    </>
  );
}
