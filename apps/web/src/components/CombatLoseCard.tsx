import type { CombatLoseSummary } from "@bv/game-core";
import { ArcadeButton } from "./ArcadeButton";
import { CombatOutcomeThumb } from "./CombatOutcomeThumb";
import { CombatSheetFrame } from "./CombatResultSheet";
import { sv } from "../lib/uiStrings";

const HEART_ICON = "/icons/heart-icon.svg";
const KLUNK_ICON = "/icons/klunk-icon.svg";
const ARMOR_ICON = "/icons/armor-icon.svg";

const HEART_TINT = "#ee5aa6";
const KLUNK_TINT = "#fbb040";

function MaskedIcon({ src, color, size = 26 }: { src: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: color,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

function PenaltyLine({
  iconSrc,
  tint,
  prefix,
  value,
  blockedValue,
}: {
  iconSrc: string;
  tint: string;
  prefix: string;
  value: number;
  blockedValue?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <MaskedIcon src={iconSrc} color={tint} size={28} />
      <span style={{ fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "0.02em" }}>
        {prefix}
        {value}
        {typeof blockedValue === "number" && blockedValue > 0 ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 700,
              fontSize: 16,
              opacity: 0.9,
              marginLeft: 6,
            }}
          >
            (
            <MaskedIcon src={ARMOR_ICON} color="#ffffff" size={14} />
            {blockedValue}
            )
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function CombatLoseCardContent(props: { data: CombatLoseSummary & { uiSubtitle?: string } }) {
  const { data } = props;
  const enemyLabel = data.enemyName.trim() || sv.play.combatWinEnemyFallback;
  const subtitle =
    data.uiSubtitle?.trim() || sv.play.combatLoseSubtitle(data.playerName, enemyLabel);
  const blockedDamage = Math.max(0, Math.floor(data.blockedDamage ?? 0));
  const rawDamage = Math.max(0, Math.floor(data.rawDamage ?? data.damage + blockedDamage));
  const netDamage = Math.max(0, Math.floor(data.damage));
  const showHpPenalty = rawDamage > 0 || blockedDamage > 0 || netDamage > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        color: "#fff",
        padding: "8px 4px 0",
        gap: 14,
      }}
    >
      <h1
        style={{
          fontFamily: "var(--heading)",
          fontSize: "clamp(1.85rem, 10cqw, 3.25rem)",
          fontWeight: 400,
          lineHeight: 1.05,
          margin: 0,
          color: "#ffffff",
          letterSpacing: "0.04em",
        }}
      >
        {sv.play.combatLoseTitle}
      </h1>
      <CombatOutcomeThumb outcome="loss" />
      <p style={{ fontFamily: "var(--sans)", fontSize: 17, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>
        {subtitle}
      </p>
      <p style={{ fontFamily: "var(--sans)", fontSize: 16, margin: 0, opacity: 0.92 }}>
        {sv.play.combatWinRoll(data.rollTotal, data.need)}
      </p>

      <div style={{ width: "100%", maxWidth: 340, marginTop: 10, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.06em",
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          {sv.play.combatLosePenalties}
        </div>
        <div
          style={{
            height: 1,
            width: "100%",
            background: "rgba(255,255,255,0.28)",
            marginBottom: 18,
          }}
        />
        {showHpPenalty ||
        data.klunkGained > 0 ||
        (data.straffKlunkFromWeaponSip ?? 0) > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px 32px",
            }}
          >
            {showHpPenalty ? (
              <PenaltyLine
                iconSrc={HEART_ICON}
                tint={HEART_TINT}
                prefix="−"
                value={netDamage}
                blockedValue={rawDamage > 0 ? blockedDamage : undefined}
              />
            ) : null}
            {data.klunkGained > 0 || (data.straffKlunkFromWeaponSip ?? 0) > 0 ? (
              <PenaltyLine
                iconSrc={KLUNK_ICON}
                tint={KLUNK_TINT}
                prefix="+"
                value={data.klunkGained + (data.straffKlunkFromWeaponSip ?? 0)}
              />
            ) : null}
          </div>
        ) : (
          <p style={{ fontFamily: "var(--sans)", fontSize: 15, margin: 0, opacity: 0.88 }}>
            {sv.play.combatLoseNoDirectPenalty(data.playerName)}
          </p>
        )}
      </div>

      {(data.assistRollNote ||
        data.redirectNote ||
        data.lostEquipmentName ||
        data.imperialSameLevelSplash) && (
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            textAlign: "center",
            fontFamily: "var(--sans)",
            fontSize: 14,
            lineHeight: 1.45,
            opacity: 0.88,
            marginTop: 4,
          }}
        >
          {data.assistRollNote ? <p style={{ margin: "0 0 8px" }}>{data.assistRollNote}</p> : null}
          {data.redirectNote ? <p style={{ margin: "0 0 8px" }}>{data.redirectNote}</p> : null}
          {data.lostEquipmentName ? (
            <p style={{ margin: "0 0 8px" }}>
              {sv.play.combatLoseLostEquipment(data.playerName, data.lostEquipmentName)}
            </p>
          ) : null}
          {data.imperialSameLevelSplash ? (
            <p style={{ margin: 0 }}>{sv.play.combatLoseImperialSplash}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function CombatLoseCard(props: { data: CombatLoseSummary; onContinue: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0, width: "100%" }}>
      <CombatSheetFrame showSheetTitle={false}>
        <CombatLoseCardContent data={props.data} />
      </CombatSheetFrame>
      <ArcadeButton variant="pink" fullWidth onClick={props.onContinue}>
        <span
          style={{
            fontStyle: "italic",
            letterSpacing: "0.12em",
            fontWeight: 900,
            textTransform: "uppercase",
            fontSize: 15,
          }}
        >
          {sv.play.combatLoseContinue}
        </span>
      </ArcadeButton>
    </div>
  );
}
