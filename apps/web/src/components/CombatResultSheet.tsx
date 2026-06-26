import type { CSSProperties, ReactNode } from "react";
import { useUiStrings } from "../lib/locale/LocaleContext";

export function CombatSheetFrame(props: {
  children: ReactNode;
  sheetTitle?: string;
  titleStyle?: CSSProperties;
  /** false: ingen rubrikrad (t.ex. vinst/förlust där huvudrubriken är i innehållet). */
  showSheetTitle?: boolean;
}) {
  const ui = useUiStrings();
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
          {props.sheetTitle ?? ui.play.combatCardSheetTitle}
        </div>
      ) : null}
      {props.children}
    </>
  );
}
