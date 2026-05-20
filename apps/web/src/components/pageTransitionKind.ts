export type PageTransitionKind = "toHostLobby" | "toTable" | "fromTable" | "default";

function normalizePath(pathname: string): string {
  if (pathname.startsWith("/table")) return "/table";
  return pathname;
}

/** Directional transition for the host flow and table entry/exit. */
export function pageTransitionKind(fromPath: string, toPath: string): PageTransitionKind {
  const from = normalizePath(fromPath);
  const to = normalizePath(toPath);

  if (to === "/host-lobby" && from === "/") return "toHostLobby";
  if (to === "/table" || to === "/play") return "toTable";
  if (from === "/table" || from === "/play") return "fromTable";
  return "default";
}
