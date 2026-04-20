import type { ItemPlayModifierBadge } from "../../lib/tableItemPlayModifier";

const ICON_LIGHT = "brightness(0) invert(1)";

const CARD_BORDER = "2px solid #64748b";
const IMAGE_BORDER = "1px solid #94a3b8";

type Props = {
  title: string;
  /** Spelare som spelade kortet — under bilden (ev. med pil till mål) */
  actorName: string;
  imageSrc: string;
  /** Annan spelare kortet riktades mot; visas efter pil när satt */
  targetPlayerName?: string;
  modifierBadge: ItemPlayModifierBadge | null;
};

/** Föremålskort för bräd-tv (grå ram). */
export function TableItemPlayCard(props: Props) {
  const { title, actorName, imageSrc, targetPlayerName, modifierBadge } = props;
  const showTarget =
    typeof targetPlayerName === "string" &&
    targetPlayerName.trim().length > 0 &&
    targetPlayerName.trim() !== actorName.trim();
  return (
    <div
      style={{
        width: "100%",
        borderRadius: 14,
        border: CARD_BORDER,
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#0b1226",
        display: "flex",
        flexDirection: "column",
        minHeight: "min(50vh, 420px)",
      }}
    >
      <div
        style={{
          flex: "1 1 auto",
          padding: 14,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
            minWidth: 0,
          }}
        >
          <div
            style={{
              minWidth: 0,
              flex: "1 1 auto",
              fontFamily: '"Permanent Marker", var(--heading), sans-serif',
              fontWeight: 900,
              fontSize: "clamp(14px, 3.5vmin, 18px)",
              lineHeight: 1.2,
              letterSpacing: 0.02,
              wordBreak: "break-word",
              textAlign: "left",
            }}
          >
            {title}
          </div>
          {modifierBadge ? (
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid rgba(167, 139, 250, 0.65)",
                background: "rgba(67, 56, 202, 0.22)",
              }}
            >
              <img
                src={modifierBadge.iconSrc}
                alt=""
                width={20}
                height={20}
                draggable={false}
                style={{ display: "block", filter: ICON_LIGHT }}
              />
              <span
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1,
                  color: "#e9d5ff",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {modifierBadge.value}
              </span>
            </div>
          ) : null}
        </div>
        <div
          style={{
            width: "100%",
            margin: "0 0 12px",
            aspectRatio: "4 / 3",
            borderRadius: 12,
            overflow: "hidden",
            border: IMAGE_BORDER,
            background: "rgba(15, 23, 42, 0.5)",
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        >
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 0,
            fontSize: "clamp(12px, 2.8vmin, 14px)",
            fontWeight: 800,
            lineHeight: 1.35,
            color: "rgba(248,250,252,0.95)",
            textAlign: "left",
            textShadow: "0 1px 2px rgba(0,0,0,0.45)",
            wordBreak: "break-word",
            flexShrink: 0,
          }}
          aria-label={
            showTarget
              ? `${actorName} spelade mot ${targetPlayerName?.trim()}`
              : `${actorName} spelade kortet`
          }
        >
          <span>{actorName}</span>
          {showTarget ? (
            <>
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  opacity: 0.92,
                  fontSize: "1.15em",
                  lineHeight: 1,
                }}
              >
                →
              </span>
              <span>{targetPlayerName?.trim()}</span>
            </>
          ) : null}
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 16 }} aria-hidden />
      </div>
    </div>
  );
}
