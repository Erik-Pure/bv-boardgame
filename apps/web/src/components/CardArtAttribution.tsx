import { artAttributionParts } from "../lib/cardArt";
import { useUiStrings } from "../lib/locale/LocaleContext";

/** Mindre etikettreferens under kortbild när `artKey` har mappad källa. */
export function CardArtAttribution(props: { artKey?: string; dense?: boolean }) {
  const ui = useUiStrings();
  const parts = artAttributionParts(props.artKey);
  if (!parts) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.35em",
        fontSize: 10,
        lineHeight: 1.35,
        opacity: 0.9,
        marginTop: props.dense ? 0 : 6,
        marginBottom: props.dense ? 0 : 4,
        textAlign: "center",
        color: "rgba(255, 255, 255, 0.92)",
        fontWeight: 500,
      }}
    >
      <span>
        <span style={{ opacity: 0.95 }}>{ui.cardModal.etikettRef}</span> {parts.beer},
      </span>
      <img
        src="/icons/bryggverket_logo.svg"
        alt="Bryggverket"
        style={{ height: 10, width: "auto", display: "block" }}
      />
      {parts.collab ? <span>& {parts.collab}</span> : null}
    </div>
  );
}
