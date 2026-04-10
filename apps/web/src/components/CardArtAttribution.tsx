import { artAttributionLabel } from "../lib/cardArt";
import { sv } from "../lib/uiStrings";

/** Mindre etikettreferens under kortbild när `artKey` har mappad källa. */
export function CardArtAttribution(props: { artKey?: string; dense?: boolean }) {
  const detail = artAttributionLabel(props.artKey);
  if (!detail) return null;
  return (
    <div
      style={{
        fontSize: 10,
        lineHeight: 1.35,
        opacity: 0.72,
        marginTop: props.dense ? 0 : 6,
        marginBottom: props.dense ? 0 : 4,
        textAlign: "center",
        color: "rgba(226, 232, 240, 0.88)",
        fontWeight: 500,
      }}
    >
      <span style={{ opacity: 0.88 }}>{sv.cardModal.etikettRef}</span> {detail}
    </div>
  );
}
