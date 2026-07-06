import { useRef, type CSSProperties, type ReactNode } from "react";
import { useFitScaleTransition } from "../../hooks/useFitScaleTransition";
import { useFitToViewportScale } from "../../hooks/useFitToViewportScale";
import { useTableOverlayContentScale } from "../../lib/tablePresentationScale";

/**
 * Skal-till-passa för bords-överlägg: mäter innehållets naturliga storlek (inre otransformerat
 * element) och skalar så det alltid ryms i viewporten — krymper under 1 på tablets, skalar upp
 * mot presentationsskalan på stor TV/projektor.
 */
export function TableFitScale(props: {
  children: ReactNode;
  /** Reserverad yta ovanför innehållet (header + toppmarginal), px. */
  reservedTop?: number;
  /** Reserverad yta under innehållet (t.ex. solfjäder + turbanner), px. */
  reservedBottom?: number;
  /** Total horisontell marginal (vänster + höger), px. Default 24. */
  sidePadPx?: number;
  style?: CSSProperties;
}) {
  const { reservedTop = 0, reservedBottom = 0, sidePadPx = 24 } = props;
  const desiredScale = useTableOverlayContentScale();
  const measureRef = useRef<HTMLDivElement | null>(null);
  const scale = useFitToViewportScale(measureRef, {
    reservedTop,
    reservedBottom,
    sidePadPx,
    desiredScale,
  });
  const scaleTransition = useFitScaleTransition();

  return (
    <div
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transition: scaleTransition,
        transformOrigin: "top center",
        width: "100%",
        display: "grid",
        justifyItems: "center",
        minHeight: 0,
        ...props.style,
      }}
    >
      {/* Otransformerat mät-element: offsetWidth/Height påverkas inte av förälderns scale. */}
      <div ref={measureRef} style={{ display: "grid", justifyItems: "center", maxWidth: "100%" }}>
        {props.children}
      </div>
    </div>
  );
}
