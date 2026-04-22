import { createContext, useContext, type ReactNode } from "react";
import { useTablePresentationScale } from "../hooks/useTablePresentationScale";

const TablePresentationScaleContext = createContext(1);

export function TablePresentationScaleProvider({ children }: { children: ReactNode }) {
  const scale = useTablePresentationScale();
  return <TablePresentationScaleContext.Provider value={scale}>{children}</TablePresentationScaleContext.Provider>;
}

/** Skala för bords-overlay (1 utanför TablePresentationScaleProvider). */
export function useTableOverlayContentScale(): number {
  return useContext(TablePresentationScaleContext);
}
