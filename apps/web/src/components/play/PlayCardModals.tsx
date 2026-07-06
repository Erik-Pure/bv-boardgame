import { useMemo } from "react";
import {
  FINAL_BOSS_LIFE_TOTAL,
  MONSTERS,
  getCardDefById,
  localizeFinalBossRoundLabel,
  localizeSipNoticeBody,
  localizeSipNoticeFromPlayerName,
  localizeSipNoticeTitle,
  monsterEncounterCardPreviewFromState,
  monsterLossKlunkTotal,
  type CombatLoseSummary,
  type CombatWinSummary,
  type GameState,
  type SipNoticeKind,
} from "@bv/game-core";
import {
  artAttributionLabel,
  artImageSources,
  resolveCardRevealArtKey,
} from "../../lib/cardArt";
import {
  monsterBoardFloorLevel,
  parseLegacyCombatLoseText,
  parseLegacyCombatWinText,
  resolveCombatLossViewer,
  resolveCombatWinViewer,
} from "../../lib/combatUi";
import { equipmentUniqueImageSrc } from "../../lib/equipmentImageSrc";
import { CardArtAttribution } from "../CardArtAttribution";
import { CardFlipModalShell } from "../CardFlipModalShell";
import cardFlipShellStyles from "../CardFlipModalShell.module.css";
import { CardRichText } from "../CardRichText";
import { CombatLoseCardContent } from "../CombatLoseCard";
import { CombatSheetFrame } from "../CombatResultSheet";
import { CombatWinCardContent } from "../CombatWinCard";
import { MonsterEncounterCard } from "../MonsterEncounterCard";
import monsterCardFrameStyles from "../MonsterEncounterCard.module.css";
import { PictureImg } from "../PictureImg";
import { TreasureCardContent } from "../TreasureCardContent";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { useLocale, useUiStrings } from "../../lib/locale/LocaleContext";
import { localizePendingCard } from "../../lib/localizePendingCard";

function monsterFromCardId(cardId: string) {
  const m = /^monster:(.+)$/.exec(cardId);
  if (!m) return undefined;
  return MONSTERS.find((x) => x.id === m[1]);
}

function CardArtFrame({ artKey }: { artKey?: string }) {
  const sources = artImageSources(artKey);
  return (
    <div style={{ width: "100%", margin: "0 0 10px", boxSizing: "border-box" }}>
      <div
        style={{
          aspectRatio: "4/3",
          borderRadius: 14,
          overflow: "hidden",
          border: "none",
          background: "transparent",
        }}
      >
        <PictureImg
          sources={sources}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
          }}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
      </div>
      <CardArtAttribution artKey={artKey} />
    </div>
  );
}

export function EnemyIntroModal(props: {
  enemyName: string;
  enemyArtKey?: string;
  need: number;
  needMod?: number;
  rewardGold?: number;
  rewardItems?: number;
  rewardXp?: number;
  baseDamage: number;
  lossKlunks: number;
  specialRules?: string;
  showCard: boolean;
  bossLivesRemaining?: number;
  bossWinLootDash?: boolean;
  bossPulsingBackdrop?: boolean;
  teammateName?: string;
  cardCoverId?: string | null;
  boardLevel?: number;
}) {
  const ui = useUiStrings();
  const locale = useLocale();
  const bossRoundLabel = (() => {
    const raw = props.bossLivesRemaining;
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    const lives = Math.max(1, Math.min(FINAL_BOSS_LIFE_TOTAL, Math.floor(raw)));
    const round = FINAL_BOSS_LIFE_TOTAL - lives + 1;
    return localizeFinalBossRoundLabel(`RUNDA ${round} AV ${FINAL_BOSS_LIFE_TOTAL}`, locale);
  })();
  const aboveScene =
    bossRoundLabel || props.teammateName || props.showCard ? (
      <div className={u.stack6Mb4}>
        {bossRoundLabel ? (
          <div
            style={{
              textAlign: "center",
              fontFamily: '"Permanent Marker", var(--heading), sans-serif',
              fontSize: "clamp(1.5rem, 7.8vw, 2.35rem)",
              lineHeight: 1.02,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#f8fafc",
              textShadow: "0 2px 12px rgba(0,0,0,0.8), 0 0 24px rgba(239,68,68,0.45)",
            }}
          >
            {bossRoundLabel}
          </div>
        ) : null}
        {props.showCard && !bossRoundLabel ? (
          <div
            style={{
              textAlign: "center",
              fontFamily: '"Permanent Marker", var(--heading), sans-serif',
              fontWeight: 900,
              fontSize: "clamp(1.4rem, 6vw, 2rem)",
              letterSpacing: "0.06em",
              lineHeight: 1.05,
              textTransform: "uppercase",
              color: "#f8fafc",
              textShadow: "0 2px 18px rgba(0,0,0,0.45)",
              marginBottom: 2,
            }}
          >
            {ui.play.combatMeetYou}
          </div>
        ) : null}
        {props.teammateName ? (
          <div
            style={{
              textAlign: "center",
              opacity: 0.9,
              fontSize: 14,
              color: "#f1f5f9",
              textShadow: "0 1px 3px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.45)",
            }}
          >
            {ui.play.teammatePicked(props.teammateName)}
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <CardFlipModalShell
      zIndex={100}
      aboveScene={aboveScene}
      bossPulsingBackdrop={props.bossPulsingBackdrop}
      cardCoverId={props.cardCoverId}
      faceInnerClassName={props.showCard ? cardFlipShellStyles.faceInnerNoVerticalOverflow : undefined}
      style={{
        placeItems: "start center",
        paddingTop: "max(14px, env(safe-area-inset-top))",
        paddingBottom: "max(108px, env(safe-area-inset-bottom))",
      }}
    >
      {props.showCard ? (
        <div
          style={{
            width: "100%",
            minWidth: 0,
            flex: 1,
            minHeight: 0,
            boxSizing: "border-box",
            padding: "0 10px 12px",
            display: "flex",
            flexDirection: "column",
            color: "#ffffff",
          }}
        >
          <MonsterEncounterCard
            title={props.enemyName}
            boardLevel={props.boardLevel}
            artKey={props.enemyArtKey}
            combatStrength={props.need + (props.needMod ?? 0)}
            winGold={props.rewardGold ?? 0}
            winItems={props.rewardItems ?? 0}
            winXp={props.rewardXp ?? 0}
            lossDamage={props.baseDamage}
            lossKlunks={props.lossKlunks}
            specialRules={props.specialRules}
            bossLivesRemaining={props.bossLivesRemaining}
            bossWinLootAsDash={props.bossWinLootDash}
            fillAvailableHeight
          />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            borderRadius: 16,
            border: "1px solid #ffffff22",
            background: "var(--modal-panel-bg)",
            padding: 16,
            color: "#ffffff",
            textAlign: "center",
            minHeight: "100%",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, opacity: 0.95 }}>{props.enemyName}</div>
          <div style={{ opacity: 0.9 }}>
            {ui.play.strength}: <b>{props.need + (props.needMod ?? 0)}</b>
          </div>
        </div>
      )}
    </CardFlipModalShell>
  );
}

const SIP_NOTICE_FROM_COLOR = "#fb923c";

export function SipNoticeCardModal(props: {
  fromPlayerName: string;
  klunkCount: number;
  customTitle?: string;
  customBody?: string;
  noticeKind?: SipNoticeKind;
  imageEquipmentName?: string;
}) {
  const ui = useUiStrings();
  const locale = useLocale();
  const from = localizeSipNoticeFromPlayerName(
    props.fromPlayerName?.trim() || ui.sipNotice.fallbackFrom,
    locale,
  );
  const count = Math.max(1, Math.floor(props.klunkCount));
  const hasCustom = !!props.customTitle || !!props.customBody;
  const duelLoss = props.noticeKind === "duel_loss";
  const title = duelLoss
    ? ui.sipNotice.duelLossTitle
    : localizeSipNoticeTitle(props.customTitle?.trim() || ui.sipNotice.title, locale);
  const body = localizeSipNoticeBody(props.customBody, locale);
  const equipmentArtSrc = props.imageEquipmentName
    ? equipmentUniqueImageSrc(props.imageEquipmentName)
    : null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        /** Under stupad bryggare (165) och under nedersta arket vid «över kort» (125), men över CardModal (100). */
        zIndex: 110,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "min(400px, 100%)",
          maxHeight: "min(82dvh, 620px)",
          borderRadius: 16,
          border: "1px solid #ffffff22",
          background: "var(--modal-panel-bg)",
          boxShadow: "0 24px 56px rgba(0,0,0,0.5)",
          color: "#ffffff",
          padding: 22,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          justifyContent: "flex-start",
          gap: 16,
          boxSizing: "border-box",
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <h2
          style={{
            margin: 0,
            width: "100%",
            fontFamily: "var(--heading)",
            fontWeight: 400,
            fontSize: duelLoss ? "clamp(1.35rem, 7.5cqw, 2rem)" : "clamp(1.5rem, 9cqw, 2.35rem)",
            lineHeight: 1.05,
            letterSpacing: duelLoss ? "0.02em" : "0.03em",
            textTransform: duelLoss ? "none" : "uppercase",
          }}
        >
          {title}
        </h2>
        {duelLoss ? (
          <div
            aria-hidden
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#dc2626",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 8px 24px rgba(220, 38, 38, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <img
              src="/icons/thumbdown-icon.svg"
              alt=""
              draggable={false}
              style={{
                width: 36,
                height: 36,
                objectFit: "contain",
                filter: "brightness(0) invert(1)",
              }}
            />
          </div>
        ) : equipmentArtSrc ? (
          <img
            src={equipmentArtSrc}
            alt=""
            aria-hidden
            style={{
              width: "clamp(88px, 32cqw, 130px)",
              height: "clamp(88px, 32cqw, 130px)",
              objectFit: "contain",
              filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.35))",
            }}
          />
        ) : !hasCustom ? (
          <img
            src="/icons/klunk.svg"
            alt=""
            aria-hidden
            className={styles.sipKlunkIconWobble}
            style={{
              width: "clamp(88px, 32cqw, 130px)",
              height: "clamp(88px, 32cqw, 130px)",
              objectFit: "contain",
              filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.35))",
            }}
          />
        ) : null}
        {body ? (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--sans)",
              fontSize: duelLoss ? "clamp(0.88rem, 4.2cqw, 1.05rem)" : "clamp(1rem, 5.2cqw, 1.45rem)",
              fontWeight: duelLoss ? 600 : 700,
              lineHeight: 1.25,
              opacity: duelLoss ? 0.9 : 0.98,
              maxWidth: "100%",
            }}
          >
            {body}
          </p>
        ) : (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--sans)",
              fontSize: "clamp(1rem, 5.2cqw, 1.45rem)",
              fontWeight: 700,
              lineHeight: 1.25,
              opacity: 0.98,
              maxWidth: "100%",
            }}
          >
            {ui.sipNotice.bodyPrefix(count)}
            <span style={{ color: SIP_NOTICE_FROM_COLOR, fontWeight: 800 }}>{`«${from}»`}</span>.
          </p>
        )}
        {!hasCustom && !duelLoss ? (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--sans)",
              fontSize: "clamp(0.82rem, 3.6cqw, 0.96rem)",
              fontWeight: 600,
              lineHeight: 1.2,
              opacity: 0.72,
            }}
          >
            {ui.sipNotice.xpGain(count)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CardModal(props: {
  title: string;
  text: string;
  artKey?: string;
  grantedItemId?: string;
  equipmentReplaceOffer?: {
    slot: "weapon" | "armor" | "helmet" | "accessory";
    catalogId?: string;
    newName: string;
  };
  kind: "event" | "combat" | "rest" | "treasure" | "empty";
  cardId: string;
  combatWin?: CombatWinSummary;
  combatLoss?: CombatLoseSummary;
  bossFinalWin?: { winnerName: string; bossName: string; roundLabel: string };
  /** Kortägarens visningsnamn (ersätter "Du" i vinst/förlust om det behövs). */
  viewerName?: string;
  cardCoverId?: string | null;
  /** För monster:* kort: rätt skalade stats mot {@link cardOwnerPlayerId}. */
  gameState?: GameState | null;
  cardOwnerPlayerId?: string;
}) {
  const locale = useLocale();
  const ui = useUiStrings();
  const localized = useMemo(
    () =>
      localizePendingCard(
        {
          type: "card",
          playerId: props.cardOwnerPlayerId ?? "",
          cardId: props.cardId,
          kind: props.kind,
          title: props.title,
          text: props.text,
          grantedItemId: props.grantedItemId,
          equipmentReplaceOffer: props.equipmentReplaceOffer,
        },
        locale,
      ),
    [
      props.cardOwnerPlayerId,
      props.cardId,
      props.kind,
      props.title,
      props.text,
      props.grantedItemId,
      props.equipmentReplaceOffer,
      locale,
    ],
  );
  const cardTitle = localized.title;
  const cardText = localized.text;
  const effectiveArtKey = resolveCardRevealArtKey(props.artKey, props.grantedItemId, {
    cardText,
    cardId: props.cardId,
  });
  const mon = props.kind === "combat" ? monsterFromCardId(props.cardId) : undefined;
  const monsterScaled = useMemo(() => {
    if (!props.gameState || !props.cardOwnerPlayerId || props.kind !== "combat") return null;
    const m = /^monster:(.+)$/.exec(props.cardId);
    if (!m) return null;
    const monster = MONSTERS.find((x) => x.id === m[1]);
    const owner = props.gameState.players.find((p) => p.id === props.cardOwnerPlayerId);
    if (!monster || !owner) return null;
    return monsterEncounterCardPreviewFromState(props.gameState, owner, monster);
  }, [props.gameState, props.cardOwnerPlayerId, props.cardId, props.kind]);
  const useMonsterLayout = !!mon;
  const monsterFloorLevel = useMemo(() => {
    if (!mon || !props.gameState || !props.cardOwnerPlayerId || props.kind !== "combat") return undefined;
    const owner = props.gameState.players.find((p) => p.id === props.cardOwnerPlayerId);
    if (!owner) return undefined;
    return monsterBoardFloorLevel(mon.id, owner.levelIndex);
  }, [mon, props.gameState, props.cardOwnerPlayerId, props.kind]);
  const effectiveWin =
    props.cardId === "combat_win"
      ? resolveCombatWinViewer(
          props.combatWin ?? parseLegacyCombatWinText(props.text, props.viewerName),
          props.viewerName,
        )
      : null;
  const showCombatWin = !!effectiveWin;
  const effectiveLoss =
    props.cardId === "combat_lose"
      ? resolveCombatLossViewer(
          props.combatLoss ?? parseLegacyCombatLoseText(props.text, props.viewerName),
          props.viewerName,
        )
      : null;
  const showCombatLose = !!effectiveLoss;
  /** Slumpat föremål från skatt ska samma kort-layout som händelse-fynd (ram + Permanent Marker), inte TreasureCardContent. */
  const treasureItemReveal = props.kind === "treasure" && props.cardId.startsWith("treasure_item_");
  const showTreasure =
    props.kind === "treasure" && !treasureItemReveal && !showCombatWin && !showCombatLose;
  const foundItemReveal =
    props.cardId.startsWith("event_find_item_") || props.cardId.startsWith("treasure_item_");
  const showDoorLocked = props.cardId === "door_locked";
  const centeredCombatOutcome = showCombatWin || showCombatLose || showTreasure;
  const useSimpleOutcomeEntrance = showCombatWin || showCombatLose;
  const eventStoryLayout =
    !centeredCombatOutcome && !showDoorLocked && !useMonsterLayout;
  const showBeerRef = !!artAttributionLabel(effectiveArtKey);

  return (
    <CardFlipModalShell
      zIndex={100}
      simpleEntrance={useSimpleOutcomeEntrance}
      cardCoverId={props.cardCoverId}
      faceInnerClassName={
        eventStoryLayout || (useMonsterLayout && mon)
          ? cardFlipShellStyles.faceInnerNoVerticalOverflow
          : undefined
      }
      style={{
        placeItems: "start center",
        paddingTop: "max(14px, env(safe-area-inset-top))",
        paddingBottom: "max(108px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          ...(eventStoryLayout
            ? {
                borderRadius: 0,
                border: "none",
                background: "transparent",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                minHeight: "100%",
                textAlign: "left",
                color: "#ffffff",
              }
            : {
                borderRadius: 16,
                border: "1px solid #ffffff22",
                background: "var(--modal-panel-bg)",
                padding: useMonsterLayout && mon ? 0 : 16,
                textAlign: centeredCombatOutcome ? "center" : "left",
                color: "#ffffff",
                ...(useMonsterLayout && mon
                  ? { display: "flex", flexDirection: "column", minHeight: "100%" }
                  : {}),
              }),
        }}
      >
        {showCombatWin && effectiveWin ? (
          <CombatSheetFrame showSheetTitle={false}>
            <CombatWinCardContent data={effectiveWin} />
          </CombatSheetFrame>
        ) : showCombatLose && effectiveLoss ? (
          <CombatSheetFrame showSheetTitle={false}>
            <CombatLoseCardContent data={effectiveLoss} />
          </CombatSheetFrame>
        ) : showDoorLocked ? (
          <CombatSheetFrame
            sheetTitle={cardTitle}
            titleStyle={{ textAlign: "center", fontSize: 22, letterSpacing: "0.02em", marginBottom: 14 }}
          >
            <LevelUpLockedCardContent text={cardText} />
          </CombatSheetFrame>
        ) : showTreasure ? (
          <CombatSheetFrame sheetTitle={ui.play.treasureCardSheetTitle}>
            <TreasureCardContent title={cardTitle} text={cardText} cardId={props.cardId} />
          </CombatSheetFrame>
        ) : eventStoryLayout ? (
          <div
            className={[
              monsterCardFrameStyles.wrap,
              monsterCardFrameStyles.wrapFill,
              monsterCardFrameStyles.wrapEventStory,
            ].join(" ")}
          >
            <div className={monsterCardFrameStyles.spin} aria-hidden />
            <div
              className={monsterCardFrameStyles.inner}
              style={{
                background: "var(--modal-panel-bg)",
                padding: 12,
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                minHeight: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  minWidth: 0,
                }}
              >
                <img
                  src="/icons/event-icon.svg"
                  alt=""
                  draggable={false}
                  style={{
                    flexShrink: 0,
                    height: 24,
                    width: "auto",
                    objectFit: "contain",
                    filter:
                      "brightness(0) invert(1) drop-shadow(0 0 6px rgba(255, 255, 255, 0.22))",
                    opacity: 0.96,
                  }}
                />
                <div
                  style={{
                    fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                    fontWeight: 900,
                    fontSize: 22,
                    lineHeight: 1.1,
                    letterSpacing: "0.02em",
                    wordBreak: "break-word",
                    minWidth: 0,
                  }}
                >
                  {cardTitle}
                </div>
              </div>
              <div
                style={{
                  width: "100%",
                  margin: "0 0 14px",
                  aspectRatio: "4/3",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "none",
                  background: foundItemReveal ? "transparent" : "rgba(255,255,255,0.92)",
                  boxSizing: "border-box",
                }}
                className={foundItemReveal ? styles.cardFoundItemArtFrame : undefined}
              >
                <PictureImg
                  sources={artImageSources(effectiveArtKey)}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
                  }}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    display: "block",
                  }}
                />
              </div>
              <CardRichText
                text={cardText}
                rollOutcomes={getCardDefById(props.cardId, locale)?.rollOutcomes}
                style={{
                  opacity: 0.98,
                  color: "#e5e7eb",
                  fontSize: 15,
                }}
              />
              <div
                style={{
                  opacity: 0.62,
                  fontSize: 12,
                  lineHeight: 1.35,
                  marginTop: 12,
                  color: "rgba(226, 232, 240, 0.9)",
                }}
              >
                {ui.cardModal.hintOwnerContinue}
              </div>
              {showBeerRef ? <div style={{ flex: "1 1 0", minHeight: 0 }} aria-hidden /> : null}
              {showBeerRef ? (
                <div
                  style={{
                    marginTop: 0,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    flexShrink: 0,
                  }}
                >
                  <CardArtAttribution artKey={effectiveArtKey} dense />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {!useMonsterLayout ? (
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: "#ffffff" }}>{cardTitle}</div>
            ) : null}
            {useMonsterLayout && mon ? (
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginBottom: 0 }}>
                <MonsterEncounterCard
                  title={cardTitle}
                  boardLevel={monsterFloorLevel}
                  artKey={effectiveArtKey}
                  combatStrength={monsterScaled?.need ?? mon.strength}
                  winGold={monsterScaled?.rewardGold ?? mon.rewardGold}
                  winItems={monsterScaled?.rewardItems ?? mon.rewardItems}
                  winXp={monsterScaled?.rewardXp ?? mon.rewardXp}
                  lossDamage={monsterScaled?.baseDamage ?? mon.baseDamage}
                  lossKlunks={monsterLossKlunkTotal(mon)}
                  specialRules={cardText.trim() || undefined}
                  fillAvailableHeight
                />
              </div>
            ) : (
              <>
                <CardArtFrame artKey={effectiveArtKey} />
                <div style={{ opacity: 0.98, color: "#ffffff", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                  {cardText}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </CardFlipModalShell>
  );
}

function LevelUpLockedCardContent(props: { text: string }) {
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
      <div
        aria-hidden
        style={{
          width: 112,
          height: 112,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.1)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
        }}
      >
        <img
          src="/icons/lvlup.svg"
          alt=""
          className="lvlup-lock-icon lvlup-lock-icon-down"
          style={{
            width: 36,
            height: 36,
            filter: "brightness(0) invert(1)",
            opacity: 0.96,
          }}
        />
      </div>
      <p style={{ fontFamily: "var(--sans)", fontSize: 17, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
        {props.text}
      </p>
    </div>
  );
}