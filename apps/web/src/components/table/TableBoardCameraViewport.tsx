import type { ReactNode } from "react";
import { useTableCamera, type UseTableCameraParams } from "../../hooks/useTableCamera";
import tableStyles from "../../routes/TableView.module.css";

type Props = {
  camera: UseTableCameraParams;
  /** false: ingen drag/scroll-zoom på brädet (auto-kamera kvar). */
  boardPanEnabled?: boolean;
  panChildren: ReactNode;
  viewportOverlayChildren: ReactNode;
};

/**
 * Isolerar `useTableCamera` + pan-transform från övriga TableView så kamera-RAF
 * inte renderar om t.ex. PvB-/strids-paneler (CSS-tärningsanimationer).
 */
export function TableBoardCameraViewport({
  camera,
  boardPanEnabled = true,
  panChildren,
  viewportOverlayChildren,
}: Props) {
  const { cam, boardViewportRef, viewportHandlers } = useTableCamera(camera);
  /** Annars fångar `setPointerCapture` på viewport alla klick — t.ex. “Avsluta spelet” i game over når aldrig knappen. */
  const blockBoardPan =
    camera.state?.phase === "lobby" || camera.state?.phase === "ended" || !boardPanEnabled;
  return (
    <div
      ref={boardViewportRef}
      className={tableStyles.boardViewport}
      {...(blockBoardPan ? {} : viewportHandlers)}
    >
      <div
        className={tableStyles.boardPanLayer}
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`,
        }}
      >
        {panChildren}
      </div>
      {viewportOverlayChildren}
    </div>
  );
}
