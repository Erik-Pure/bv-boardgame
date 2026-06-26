import type { CSSProperties, ReactNode } from "react";
import { ArcadeButton } from "../ArcadeButton";
import { CardFlipModalShell } from "../CardFlipModalShell";
import { useUiStrings } from "../../lib/locale/LocaleContext";

export function PlayModal(props: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Ingen kort-flip; framsida visas direkt (används för inventory-föremål). */
  instantFront?: boolean;
  titleStyle?: CSSProperties;
  /** Rad under rubriken (t.ex. ikon), centrerad om `centered`. */
  titleBelow?: ReactNode;
  hideClose?: boolean;
  headerRight?: ReactNode;
  /** Centrera rubrik, titleBelow och innehåll. */
  centered?: boolean;
  /** false: stäng inte vid klick utanför (t.ex. obligatorisk påminnelse). */
  backdropCloses?: boolean;
  zIndex?: number;
  /** Extra stilar på kortpanelen (t.ex. mer luft uppe/nere). */
  panelStyle?: CSSProperties;
  cardCoverId?: string | null;
  /** Låt innehållet fylla panelens höjd (för layouts med footer i botten). */
  contentFill?: boolean;
}) {
  const ui = useUiStrings();
  const showClose = props.hideClose !== true;
  const z = props.zIndex ?? 120;
  const centered = props.centered === true;
  return (
    <CardFlipModalShell
      zIndex={z}
      maxWidth={560}
      onBackdropMouseDown={props.backdropCloses === false ? undefined : props.onClose}
      instantFront={props.instantFront}
      cardCoverId={props.cardCoverId}
    >
      <div
        style={{
          width: "100%",
          borderRadius: 16,
          border: "1px solid #ffffff22",
          background: "var(--modal-panel-bg)",
          padding: 14,
          textAlign: centered ? "center" : "left",
          color: "#ffffff",
          ...(props.contentFill
            ? {
                display: "flex",
                flexDirection: "column" as const,
              }
            : {}),
          ...props.panelStyle,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: props.titleBelow != null ? (centered ? 8 : 4) : 10,
            minWidth: 0,
            justifyContent: centered ? (showClose ? "space-between" : "center") : undefined,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 16,
              color: "#ffffff",
              flex: showClose ? "1 1 auto" : props.headerRight ? "1 1 auto" : undefined,
              minWidth: 0,
              ...(centered && !showClose ? { width: "100%", maxWidth: "100%", textAlign: "center" as const } : {}),
              ...props.titleStyle,
            }}
          >
            {props.title}
          </div>
          {props.headerRight ? (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{props.headerRight}</div>
          ) : null}
          {showClose ? (
            <div style={{ marginLeft: props.headerRight ? 0 : "auto", flexShrink: 0 }}>
              <ArcadeButton variant="gray" size="sm" onClick={props.onClose}>
                {ui.play.modalClose}
              </ArcadeButton>
            </div>
          ) : null}
        </div>
        {props.titleBelow != null ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: centered ? 16 : 12,
              marginTop: centered ? 8 : 2,
            }}
          >
            {props.titleBelow}
          </div>
        ) : null}
        {centered ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              maxWidth: 440,
              margin: "0 auto",
              ...(props.contentFill
                ? {
                    width: "100%",
                    flex: 1,
                    minHeight: 0,
                  }
                : {}),
            }}
          >
            {props.children}
          </div>
        ) : (
          props.children
        )}
      </div>
    </CardFlipModalShell>
  );
}
