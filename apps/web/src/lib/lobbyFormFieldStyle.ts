import type { CSSProperties } from "react";

/** Gemensam stil för select/number/text i lobby + join (HostLobbySetup). */
export const lobbyFieldControlStyle: CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.24)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%), rgba(15,23,42,0.72)",
  color: "#ffffff",
  padding: "0 14px",
  fontFamily: "var(--sans)",
  fontSize: 15,
  fontWeight: 600,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 18px rgba(0,0,0,0.28)",
  outline: "none",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxSizing: "border-box",
};

export const lobbyFieldLabelTextStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  opacity: 0.92,
  textAlign: "left",
};
