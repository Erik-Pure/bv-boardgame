import type { CombatWinSummary } from "@bv/game-core";
import { ArcadeButton } from "./ArcadeButton";
import { CombatOutcomeThumb } from "./CombatOutcomeThumb";
import { CombatSheetFrame } from "./CombatResultSheet";
import { sv } from "../lib/uiStrings";

const PANT_ICON = "/icons/pant-icon.svg";
const REWARD_ICON = "/icons/reward-icon.svg";

const PANT_TINT = "#d1d5db";
const REWARD_TINT = "#fbb040";

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

function RewardLine({
  iconSrc,
  tint,
  value,
  showPlus,
}: {
  iconSrc: string;
  tint: string;
  value: number;
  showPlus: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <MaskedIcon src={iconSrc} color={tint} size={28} />
      <span style={{ fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "0.02em" }}>
        {showPlus ? "+" : ""}
        {value}
      </span>
    </div>
  );
}

function combatWinSubtitleFor(data: CombatWinSummary): string {
  const enemyLabel = data.enemyName.trim() || sv.play.combatWinEnemyFallback;
  if (data.winnerName === "Ni") return sv.play.combatWinTeamLegacy;
  if (data.teammateName) {
    return sv.play.combatWinSubtitleTeam(data.winnerName, data.teammateName, enemyLabel);
  }
  return sv.play.combatWinSubtitle(data.winnerName, enemyLabel);
}

export function CombatWinCardContent(props: { data: CombatWinSummary }) {
  const { data } = props;
  const subtitle = combatWinSubtitleFor(data);

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
          fontSize: "clamp(2.4rem, 10vw, 3.25rem)",
          fontWeight: 400,
          lineHeight: 1.05,
          margin: 0,
          color: "#ffffff",
          letterSpacing: "0.04em",
        }}
      >
        {sv.play.combatWinTitle}
      </h1>
      <CombatOutcomeThumb outcome="win" />
      <p style={{ fontFamily: "var(--sans)", fontSize: 17, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>
        {subtitle}
      </p>
      <p style={{ fontFamily: "var(--sans)", fontSize: 16, margin: 0, opacity: 0.92 }}>
        {sv.play.combatWinRoll(data.rollTotal, data.need)}
      </p>

      <div style={{ width: "100%", maxWidth: 340, marginTop: 10 }}>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          {sv.play.combatWinRewards}
        </div>
        <div
          style={{
            height: 1,
            width: "100%",
            background: "rgba(255,255,255,0.28)",
            marginBottom: 18,
          }}
        />
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
          {data.rewardGold > 0 ? (
            <RewardLine iconSrc={PANT_ICON} tint={PANT_TINT} value={data.rewardGold} showPlus />
          ) : null}
          {data.rewardItems > 0 ? (
            <RewardLine iconSrc={REWARD_ICON} tint={REWARD_TINT} value={data.rewardItems} showPlus />
          ) : null}
        </div>
        {data.randomOtherSipRecipientName ? (
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: 15,
              margin: "14px 0 0",
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            {sv.play.combatWinRandomOtherSip(data.randomOtherSipRecipientName)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CombatWinCard(props: { data: CombatWinSummary; onContinue: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <CombatSheetFrame>
        <CombatWinCardContent data={props.data} />
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
          {sv.play.combatWinContinue}
        </span>
      </ArcadeButton>
    </div>
  );
}
