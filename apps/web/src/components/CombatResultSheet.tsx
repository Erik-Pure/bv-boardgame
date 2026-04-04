import type { ReactNode } from "react";
import { sv } from "../lib/uiStrings";

export function CombatSheetFrame(props: { children: ReactNode }) {
  return (
    <>
      <div
        style={{
          fontWeight: 800,
          fontSize: 17,
          marginBottom: 10,
          textAlign: "left",
          width: "100%",
          color: "#fff",
        }}
      >
        {sv.play.combatCardSheetTitle}
      </div>
      {props.children}
    </>
  );
}
