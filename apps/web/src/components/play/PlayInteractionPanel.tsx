import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  BREWER_PERK_MAX_PER_CATEGORY,
  POSITIVE_HELP_ITEM_IDS,
  PVP_PRE_ROUND_ITEM_IDS,
  brewerPerkPickCount,
  canAffordPant,
  playerPant,
  combatReactionsAllAnswered,
  effectiveMerchantBuyPrice,
  effectiveWeaponPiecePower,
  isBrewerPerkChoiceAvailable,
  isFinalBossMonsterId,
  isPlayerActiveInMatch,
  itemPlayGoldCost,
  monsterCombatEquipmentAttackBonus,
  penaltySipTotalForPlayer,
  playerCanCombatIntervene,
  playerHasPlayablePositiveHelpItem,
  previewHpAfterFlatDamage,
  pvpLootPantStealAmount,
  randomPlayerAvatar,
  sipWeaponExtraAttackCosts,
  type ClientAction,
  type GameState,
  type ItemId,
  type ItemUseTarget,
  type MonsterId,
  type Pending,
  type Player,
  type ShopItem,
} from "@bv/game-core";
import { formatShopItemEffectSummary } from "../../lib/equipmentEffectSummary";
import { combatTeamRollShowsSkullOnOne } from "../../lib/combatCritFailUi";
import { readBoardPerformancePrefs } from "../../lib/boardPerformancePrefs";
import { playOptimisticMoveRollSfx, playTableSfx } from "../../lib/tableSfx";
import {
  shopItemEffectBadges,
  shopItemEffectSupplementText,
} from "../../lib/inventoryEffectBadges";
import { isRingTopEdgeTile, moveChoiceDirectionHints } from "../../lib/moveChoiceDirectionHints";
import { moveChoiceTileVisual } from "../../lib/moveChoiceTileVisual";
import { equipmentImageSources } from "../../lib/equipmentImageSrc";
import { ArcadeButton } from "../ArcadeButton";
import { DiceCube3D } from "../DiceCube3D";
import { EffectBadgePillStrip } from "../EffectBadgePillStrip";
import { PictureImg } from "../PictureImg";
import { StatIcon } from "../StatIcon";
import { CombatChooseTeammateSheet } from "./CombatChooseTeammateSheet";
import { CombatEnemyIntroWaiting } from "./CombatEnemyIntroWaiting";
import { CombatHitMitigationSheet } from "./CombatHitMitigationSheet";
import { CombatRollPreviewSheet } from "./CombatRollPreviewSheet";
import { EquipmentCombatTotalsRow } from "./EquipmentCombatTotalsRow";
import { MoveOptionLabel } from "./MoveOptionLabel";
import { MerchantShopItemArt, MerchantShopTypeIcon, MERCHANT_TYPE_ICON_PX } from "./merchantShopUi";
import { TutorialInlineIcon } from "./TutorialInlineIcon";
import {
  BREWER_PERK_BUTTONS,
  COMBAT_INTERVENE_PLAYABLE_ITEM_IDS,
  CONTRACT_ICON_PANT_COLOR,
  CONTRACT_ICON_REWARD_COLOR,
  isMyPending,
  isShopItemEquipment,
  merchantEquippedName,
  merchantSlotOccupied,
  myOffTurnCombatEquipReplace,
} from "../../lib/playInteractionHelpers";
import { renderEquipmentReplaceEffects } from "../../lib/playInteractionEquipmentEffects";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { capitalizeWord, equipmentSlotSv, sv, tileTypeSv } from "../../lib/uiStrings";

export type MobileEquipmentCombatTotals = {
  maxHp: number;
  attack: number;
  shield: number;
  bvb: number;
  itemCards: number;
};

export type PlayInteractionPanelProps = {
  state: GameState;
  me: Player;
  status: string;
  send: (action: ClientAction) => void;
  readyCount: number;
  totalPlayers: number;
  canStart: boolean;
  needsBrewerPerkChoice: boolean;
  mobileEquipmentCombatTotals: MobileEquipmentCombatTotals | null;
  isMyTurn: boolean;
  personalTurnPrompt: Extract<Pending, { type: "brewerPerkChoice" | "levelUpOffer" }> | null;
  personalPromptBlocksRoll: boolean;
  nowTick: number;
  combatDiceSpinning: boolean;
  setCombatDiceSpinning: (v: boolean) => void;
  pvpDiceSpinning: boolean;
  setPvpDiceSpinning: (v: boolean) => void;
  rollDiceSpinning: boolean;
  setRollDiceSpinning: (v: boolean) => void;
  sheetDiceBlockClass: string;
  cancelCombatHelpRequest: () => void;
  itemMetaForView: (itemId: string) => { title: string; text: string; target: ItemUseTarget };
  showToast: (message: string, durationMs?: number) => void;
  interactionPanelCollapsed: boolean;
};

export function PlayInteractionPanel(props: PlayInteractionPanelProps) {
  const {
    state,
    me,
    status,
    send,
    readyCount,
    totalPlayers,
    canStart,
    needsBrewerPerkChoice,
    mobileEquipmentCombatTotals,
    isMyTurn,
    personalTurnPrompt,
    personalPromptBlocksRoll,
    nowTick,
    combatDiceSpinning,
    setCombatDiceSpinning,
    pvpDiceSpinning,
    setPvpDiceSpinning,
    rollDiceSpinning,
    setRollDiceSpinning,
    sheetDiceBlockClass,
    cancelCombatHelpRequest,
    itemMetaForView,
    showToast,
    interactionPanelCollapsed,
  } = props;

  const [merchantReplaceItem, setMerchantReplaceItem] = useState<ShopItem | null>(null);
  const [merchantDetailItem, setMerchantDetailItem] = useState<ShopItem | null>(null);
  const [wantsIntervene, setWantsIntervene] = useState(false);
  const [beerBroPickInstance, setBeerBroPickInstance] = useState<string | null>(null);
  const [interveneOtherTargetPickInstance, setInterveneOtherTargetPickInstance] = useState<string | null>(null);

  const pending = state.pending ?? null;
  const myPending = isMyPending(pending, me);
  const pvpPending = pending?.type === "pvp" ? pending : null;
  const pvpRound = pvpPending ? (pvpPending.roundNumber ?? pvpPending.pvpRound ?? 1) : 1;
  const pvpWins = pvpPending?.wins ?? { attacker: 0, defender: 0 };

  useEffect(() => {
    if (pending?.type !== "merchant") {
      setMerchantReplaceItem(null);
      setMerchantDetailItem(null);
    }
  }, [pending?.type]);

  useEffect(() => {
    if (!(pending?.type === "combat" && pending.phase === "reactions")) {
      setBeerBroPickInstance(null);
      setInterveneOtherTargetPickInstance(null);
    }
  }, [pending?.type === "combat" ? pending.phase : null]);

  if (!state || !me) return null;
  if (state.phase === "lobby") {
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o9}`}>
          {sv.play.lobbySheet(readyCount, totalPlayers)}
        </div>
        {me.isHost ? (
          <ArcadeButton
            variant="gray"
            fullWidth
            disabled={status !== "connected"}
            onClick={() => {
              const avatar = randomPlayerAvatar();
              send({ type: "setAvatar", playerId: me.id, avatar });
            }}
          >
            {sv.play.shuffleAvatar}
          </ArcadeButton>
        ) : null}
        <div className={`${u.stack10} ${u.gridCols2} ${u.justifyItemsCenter}`}>
          {!me.isHost ? (
            <ArcadeButton
              variant="gray"
              fullWidth
              disabled={status !== "connected"}
              onClick={() => {
                const avatar = randomPlayerAvatar();
                send({ type: "setAvatar", playerId: me.id, avatar });
              }}
            >
              {sv.play.shuffleAvatar}
            </ArcadeButton>
          ) : null}
          <ArcadeButton
            variant={me.ready ? "gray" : "blue"}
            fullWidth
            disabled={status !== "connected"}
            onClick={() => send({ type: "setReady", playerId: me.id, ready: !me.ready })}
          >
            {me.ready ? sv.play.unready : sv.play.ready}
          </ArcadeButton>
          {me.isHost ? (
            <ArcadeButton
              variant="pink"
              fullWidth
              disabled={status !== "connected" || !canStart}
              onClick={() => send({ type: "startGame", playerId: me.id })}
            >
              {sv.play.startGame}
            </ArcadeButton>
          ) : null}
        </div>
        {!canStart && (
          <div className={`${u.textCenter} ${u.o75} ${u.fs12}`}>
            {me.isHost ? sv.play.hostNeedPlayers : sv.play.waitHostStart}
          </div>
        )}
      </div>
    );
  }
  if (state.phase !== "playing") return null;
  if (pending?.type === "brewerDown") return null;
  if (needsBrewerPerkChoice) {
    return (
      <div className={u.stack10}>
        {mobileEquipmentCombatTotals ? (
          <EquipmentCombatTotalsRow totals={mobileEquipmentCombatTotals} />
        ) : null}
        {BREWER_PERK_BUTTONS.map(({ choice, label, icon, variant }) => {
          const available = isBrewerPerkChoiceAvailable(me, choice);
          return (
            <ArcadeButton
              key={choice}
              variant={variant}
              fullWidth
              disabled={!available}
              onClick={() => send({ type: "brewerPerkDecision", playerId: me.id, choice })}
            >
              <span className={styles.turnChoicePantaLabel}>
                <TutorialInlineIcon src={icon} color="#f8fafc" gap="0" />
                <span>
                  {sv.play.brewerPerkChoiceWithCap(
                    label,
                    brewerPerkPickCount(me, choice),
                    BREWER_PERK_MAX_PER_CATEGORY,
                  )}
                </span>
              </span>
            </ArcadeButton>
          );
        })}
      </div>
    );
  }
  if (pending?.type === "card" && myPending) return null; // handled as modal

  const stealEquipOffer =
    pending?.type === "combat" && pending.postReactionEquipmentOffer?.playerId === me.id
      ? pending.postReactionEquipmentOffer
      : null;
  const catalogEquipOffer =
    (pending?.type === "equipmentReplaceOffer" && myPending ? pending : null) ??
    myOffTurnCombatEquipReplace(state, me);
  const equipOffer = catalogEquipOffer ?? stealEquipOffer;
  if (equipOffer) {
    const slot = equipOffer.slot;
    return (
      <div className={u.stack12}>
        <div className={`${u.textCenter} ${u.o95} ${u.fs16} ${u.lineHeight135}`}>
          {sv.play.lootEquipmentReplaceTitle}
        </div>
        <div className={u.flexCenterFullWidth}>
          <div className={u.box96}>
            <PictureImg
              sources={equipmentImageSources(equipOffer.newName, slot)}
              alt=""
              className={u.fillContain}
            />
          </div>
        </div>
        <div className={`${u.textCenter} ${u.fs14} ${u.lineHeight145} ${u.colorE8}`}>
          {sv.play.merchantReplaceBody(
            capitalizeWord(equipmentSlotSv(slot)),
            merchantEquippedName(me, slot),
            equipOffer.newName,
          )}
        </div>
        {renderEquipmentReplaceEffects(
          slot,
          me,
          equipOffer.newName,
          "catalogId" in equipOffer ? equipOffer.catalogId : undefined,
        )}
        <div className={u.stack8}>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "equipmentReplaceDecision", playerId: me.id, accept: true })}
          >
            {sv.play.merchantReplaceConfirm}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "equipmentReplaceDecision", playerId: me.id, accept: false })}
          >
            {sv.play.lootEquipmentReplaceDecline}
          </ArcadeButton>
        </div>
      </div>
    );
  }

  if (pending?.type === "encounterChoice" && pending.moverId === me.id) {
    const activeEncounterOpponents = pending.opponentIds.filter((oid) => {
      const pl = state.players.find((p) => p.id === oid);
      return !!pl && isPlayerActiveInMatch(pl);
    });
    if (pending.phase === "choosePvpOpponent") {
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o9}`}>{sv.play.pvpChooseOpponent}</div>
          <div className={u.stack10}>
            {activeEncounterOpponents.map((oid) => {
              const pl = state.players.find((p) => p.id === oid);
              if (!pl) return null;
              return (
                <ArcadeButton
                  key={oid}
                  variant="pink"
                  fullWidth
                  onClick={() => send({ type: "choosePvpOpponent", playerId: me.id, opponentId: oid })}
                >
                  {pl.name}
                </ArcadeButton>
              );
            })}
          </div>
        </div>
      );
    }
    const encounterPvpEligibleNames = activeEncounterOpponents
      .map((oid) => state.players.find((p) => p.id === oid))
      .filter(
        (pl): pl is Player =>
          !!pl && isPlayerActiveInMatch(pl) && pl.equipment.armor?.pvpCannotBeChallenged !== true,
      )
      .map((pl) => pl.name);
    const encounterPvpButtonLabel = sv.play.pvpBothRollVersus(encounterPvpEligibleNames.join(", "));
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o9}`}>{sv.play.encounterChoose}</div>
        <div className={u.stack10}>
          {encounterPvpEligibleNames.length > 0 ? (
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "chooseEncounter", playerId: me.id, choice: "pvp" })}
          >
            {encounterPvpButtonLabel}
          </ArcadeButton>
          ) : null}
          <ArcadeButton
            variant="blue"
            fullWidth
            onClick={() => send({ type: "chooseEncounter", playerId: me.id, choice: "tile" })}
          >
            {sv.play.resolveTileNoPvp(tileTypeSv[pending.tileType ?? "empty"])}
          </ArcadeButton>
        </div>
      </div>
    );
  }

  if (pending?.type === "combat" && pending.phase === "chooseTeammate") {
    return <CombatChooseTeammateSheet state={state} me={me} pending={pending} send={send} />;
  }

  if (pending?.type === "combat" && pending.phase === "enemyIntro") {
    return <CombatEnemyIntroWaiting state={state} me={me} pending={pending} />;
  }

  if (pending?.type === "combat" && pending.phase === "rollPreview") {
    if (pending.attackerId !== me.id) {
      const attacker = state.players.find((p) => p.id === pending.attackerId);
      return (
        <div className={`${u.textCenter} ${u.o82}`}>
          {sv.play.waitAttackerContinue(attacker?.name ?? sv.play.theAttacker)}
        </div>
      );
    }
    return (
      <CombatRollPreviewSheet
        state={state}
        me={me}
        pending={pending}
        send={send}
        sheetDiceBlockClass={sheetDiceBlockClass}
        sheetDiceCaptionClass={styles.sheetDiceCaption}
        sheetDiceCaptionTextClass={styles.sheetDiceCaptionText}
      />
    );
  }

  if (pending?.type === "combat" && pending.phase === "chooseHitMitigation") {
    if (pending.attackerId !== me.id) {
      const attacker = state.players.find((p) => p.id === pending.attackerId);
      return (
        <div className={`${u.textCenter} ${u.o82}`}>
          {sv.play.waitAttackerChoose(attacker?.name ?? sv.play.theAttacker)}
        </div>
      );
    }
    return (
      <CombatHitMitigationSheet
        state={state}
        me={me}
        pending={pending}
        send={send}
        sheetDiceBlockClass={sheetDiceBlockClass}
        sheetDiceCaptionClass={styles.sheetDiceCaption}
        sheetDiceCaptionTextClass={styles.sheetDiceCaptionText}
      />
    );
  }

  if (pending?.type === "combat" && pending.phase === "helpChooseHelper") {
    const isAttacker = pending.attackerId === me.id;
    const helperIds = pending.helpCandidateIds ?? [];
    const helperPlayers = helperIds
      .map((id) => state.players.find((p) => p.id === id))
      .filter((p): p is Player => !!p);
    if (isAttacker) {
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o92}`}>{sv.play.combatHelpChooseHelper}</div>
          {helperPlayers.length === 0 ? (
            <div className={`${u.textCenter} ${u.o82}`}>{sv.play.combatHelpNoCandidates}</div>
          ) : (
            helperPlayers.map((pl) => (
              <ArcadeButton
                key={pl.id}
                variant="pink"
                fullWidth
                onClick={() => send({ type: "combatChooseHelper", playerId: me.id, helperId: pl.id })}
              >
                {pl.name}
              </ArcadeButton>
            ))
          )}
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={cancelCombatHelpRequest}
          >
            {sv.play.combatHelpCancel}
          </ArcadeButton>
        </div>
      );
    }
    const attackerName = state.players.find((p) => p.id === pending.attackerId)?.name ?? sv.play.theAttacker;
    return (
      <div className={`${u.textCenter} ${u.o82}`}>
        {sv.play.combatHelpWaitAttackerChoose(attackerName)}
      </div>
    );
  }

  if (pending?.type === "combat" && pending.phase === "helpAwaitDecision") {
    const helperId = pending.helpSelectedHelperId;
    const helperName = helperId ? (state.players.find((p) => p.id === helperId)?.name ?? "—") : "—";
    const isHelper = helperId === me.id;
    const pantGoldReward = Math.max(0, Math.floor(pending.rewardGold ?? 4));
    const treasureItemsReward = Math.max(0, Math.floor(pending.rewardItems ?? 1));
    const splitGoldReward = Math.floor(pantGoldReward / 2);
    const splitItemsReward = Math.floor(treasureItemsReward / 2);
    const pantOutcomeInline = (
      <span className={styles.contractOutcomeSuffix}>
        {" ("}
        {pantGoldReward}{" "}
        <TutorialInlineIcon src="/icons/pant-icon.svg" color={CONTRACT_ICON_PANT_COLOR} gap="0 2px 0 0" />
        {")"}
      </span>
    );
    const treasureOutcomeInline = (
      <span className={styles.contractOutcomeSuffix}>
        {" ("}
        {treasureItemsReward}{" "}
        <TutorialInlineIcon src="/icons/reward-icon.svg" color={CONTRACT_ICON_REWARD_COLOR} gap="0 2px 0 0" />
        {")"}
      </span>
    );
    const splitOutcomeInline = (
      <span className={styles.contractOutcomeSuffix}>
        {" ("}
        {splitGoldReward}{" "}
        <TutorialInlineIcon src="/icons/pant-icon.svg" color={CONTRACT_ICON_PANT_COLOR} gap="0 2px 0 0" />
        {", "}
        {splitItemsReward}{" "}
        <TutorialInlineIcon src="/icons/reward-icon.svg" color={CONTRACT_ICON_REWARD_COLOR} gap="0 2px 0 0" />
        {")"}
      </span>
    );
    if (!helperId) return <div className={`${u.textCenter} ${u.o82}`}>{sv.play.waitingState}</div>;
    if (isHelper) {
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o92}`}>{sv.play.combatHelpDecisionPrompt}</div>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "decline" })}
          >
            {sv.play.combatHelpDecisionDecline}
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "free" })}
          >
            {sv.play.combatHelpDecisionFree}
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "pant" })}
          >
            <>
              {sv.play.combatHelpDecisionPant}
              {pantOutcomeInline}
            </>
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "treasure" })}
          >
            <>
              {sv.play.combatHelpDecisionTreasure}
              {treasureOutcomeInline}
            </>
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "split" })}
          >
            <>
              {sv.play.combatHelpDecisionSplit}
              {splitOutcomeInline}
            </>
          </ArcadeButton>
        </div>
      );
    }
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o82}`}>
          {sv.play.combatHelpWaitDecision(helperName)}
        </div>
        {pending.attackerId === me.id ? (
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={cancelCombatHelpRequest}
          >
            {sv.play.combatHelpCancel}
          </ArcadeButton>
        ) : null}
      </div>
    );
  }

  if (pending?.type === "combat" && pending.phase === "helpAwaitRequesterDecision") {
    const helperId = pending.helpSelectedHelperId;
    const helperName = helperId ? (state.players.find((p) => p.id === helperId)?.name ?? "—") : "—";
    const requesterName = state.players.find((p) => p.id === pending.attackerId)?.name ?? sv.play.theAttacker;
    const isRequester = pending.attackerId === me.id;
    const requested = pending.helpProposedContract;
    const pantGoldReward = Math.max(0, Math.floor(pending.rewardGold ?? 4));
    const treasureItemsReward = Math.max(0, Math.floor(pending.rewardItems ?? 1));
    if (!helperId || !requested) return <div className={`${u.textCenter} ${u.o82}`}>{sv.play.waitingState}</div>;
    const requestedLabel =
      requested === "pant"
        ? (
            <>
              {sv.play.combatHelpDecisionPant}{" "}
              <span className={styles.contractOutcomeSuffix}>
                ({pantGoldReward}{" "}
                <TutorialInlineIcon src="/icons/pant-icon.svg" color={CONTRACT_ICON_PANT_COLOR} gap="0 2px 0 0" />)
              </span>
            </>
          )
        : requested === "treasure"
          ? (
              <>
                {sv.play.combatHelpDecisionTreasure}{" "}
                <span className={styles.contractOutcomeSuffix}>
                  ({treasureItemsReward}{" "}
                  <TutorialInlineIcon
                    src="/icons/reward-icon.svg"
                    color={CONTRACT_ICON_REWARD_COLOR}
                    gap="0 2px 0 0"
                  />)
                </span>
              </>
            )
          : (
              <>
                {sv.play.combatHelpDecisionSplit}{" "}
                <span className={styles.contractOutcomeSuffix}>
                  ({Math.floor(pantGoldReward / 2)}{" "}
                  <TutorialInlineIcon src="/icons/pant-icon.svg" color={CONTRACT_ICON_PANT_COLOR} gap="0 2px 0 0" />
                  {", "}
                  {Math.floor(treasureItemsReward / 2)}{" "}
                  <TutorialInlineIcon
                    src="/icons/reward-icon.svg"
                    color={CONTRACT_ICON_REWARD_COLOR}
                    gap="0 2px 0 0"
                  />)
                </span>
              </>
            );
    if (isRequester) {
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o92}`}>
            {sv.play.combatHelpRequesterPrompt(helperName)}
          </div>
          <div className={`${u.textCenter} ${u.o85}`}>{requestedLabel}</div>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelpRequesterDecision", playerId: me.id, accept: true })}
          >
            {sv.play.combatHelpRequesterAccept}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "combatHelpRequesterDecision", playerId: me.id, accept: false })}
          >
            {sv.play.combatHelpRequesterDecline}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={cancelCombatHelpRequest}
          >
            {sv.play.combatHelpCancel}
          </ArcadeButton>
        </div>
      );
    }
    return (
      <div className={`${u.textCenter} ${u.o82}`}>
        {me.id === helperId
          ? sv.play.combatHelpRequesterWait(requesterName)
          : sv.play.combatHelpWaitDecision(requesterName)}
      </div>
    );
  }

  if (pending?.type === "combat" && pending.phase === "helpAwaitCard") {
    const helperId = pending.helpSelectedHelperId;
    const isHelper = helperId === me.id;
    const helperName = helperId ? (state.players.find((p) => p.id === helperId)?.name ?? "—") : "—";
    const helperItems = (me.inventory ?? []).filter((it) => {
      const id = String(it.itemId);
      if (!POSITIVE_HELP_ITEM_IDS.has(id as ItemId)) return false;
      const cost = itemPlayGoldCost(id as ItemId);
      return cost <= 0 || canAffordPant(me, cost);
    });
    if (isHelper) {
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o92}`}>
            {sv.play.combatHelpPlayPositiveCard}
          </div>
          {helperItems.length === 0 ? (
            <div className={`${u.textCenter} ${u.o82}`}>{sv.play.combatHelpNoPlayablePositiveCards}</div>
          ) : (
            helperItems.map((it) => (
              <ArcadeButton
                key={it.instanceId}
                variant="pink"
                fullWidth
                onClick={() =>
                  send({
                    type: "useItem",
                    playerId: me.id,
                    instanceId: it.instanceId,
                    targetPlayerId: pending.attackerId,
                  })
                }
              >
                {itemMetaForView(it.itemId).title}
              </ArcadeButton>
            ))
          )}
        </div>
      );
    }
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o82}`}>
          {sv.play.combatHelpWaitHelperCard(helperName)}
        </div>
        {pending.attackerId === me.id ? (
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={cancelCombatHelpRequest}
          >
            {sv.play.combatHelpCancel}
          </ArcadeButton>
        ) : null}
      </div>
    );
  }

  if (pending?.type === "combat" && pending.phase === "reactions") {
    const isAttacker = pending.attackerId === me.id;
    const isAssistPartner = pending.assistId === me.id;
    const isTeamFighter = isAttacker || isAssistPartner;
    const canPlayInterveneItem = (itemId: string) => {
      if (!COMBAT_INTERVENE_PLAYABLE_ITEM_IDS.has(itemId)) return false;
      const cost = itemPlayGoldCost(itemId as ItemId);
      if (cost > 0 && !canAffordPant(me, cost)) return false;
      if (itemId === "beer_bro" && pending.assistId) return false;
      return true;
    };
    const hasAnyReaction = (me.inventory ?? []).some((it) => canPlayInterveneItem(String(it.itemId)));
    const attacker = state.players.find((p) => p.id === pending.attackerId) ?? null;
    const teammate = pending.assistId ? state.players.find((p) => p.id === pending.assistId) ?? null : null;
    /** Mobil: vid två slagande (team/ölkompis) bara *din* bonus vid tärningen — brädet visar fortfarande lagets samlade modifier. */
    const diceModifierBesideDice = (() => {
      if (pending.assistId) {
        const p = state.players.find((x) => x.id === me.id);
        if (!p) return 0;
        return (
          (pending.attackMods?.[me.id] ?? 0) +
          monsterCombatEquipmentAttackBonus(p) +
          (p.nextCombatModifier ?? 0)
        );
      }
      const p = state.players.find((x) => x.id === pending.attackerId);
      if (!p) return 0;
      return (
        (pending.attackMods?.[pending.attackerId] ?? 0) +
        monsterCombatEquipmentAttackBonus(p) +
        (p.nextCombatModifier ?? 0)
      );
    })();
    const myWeaponSipBonus = me.equipment.weapon?.sipAttackBonus ?? 0;
    const mySipWeaponChoice = pending.sipWeaponBonusChoice?.[me.id];
    const mySipWeaponBonusActive = mySipWeaponChoice === true && myWeaponSipBonus > 0;
    const diceModifierTotal =
      diceModifierBesideDice + (mySipWeaponBonusActive ? myWeaponSipBonus : 0);
    const modTotalDisplay =
      diceModifierTotal > 0 ? `+${diceModifierTotal}` : String(diceModifierTotal);
    const attackDiceDoubledHint =
      pending.assistId != null
        ? me.nextCombatAttackDiceDouble === true
          ? "2 x tärningsslag"
          : null
        : (() => {
            const attackDiceDoubledCount = [pending.attackerId, pending.assistId]
              .filter((id): id is string => !!id)
              .reduce((sum, id) => {
                const p = state.players.find((x) => x.id === id);
                return sum + (p?.nextCombatAttackDiceDouble === true ? 1 : 0);
              }, 0);
            if (attackDiceDoubledCount <= 0) return null;
            return attackDiceDoubledCount === 1
              ? "2 x tärningsslag"
              : `2 x tärningsslag (x${attackDiceDoubledCount})`;
          })();
    const isEligibleReactor =
      (pending.reactors?.includes(me.id) ?? false) && playerCanCombatIntervene(me);
    const hasPassed = pending.reacted?.[me.id] === "pass";
    const everyoneDone = combatReactionsAllAnswered(pending.reactors ?? [], pending.reacted);
    const deadlineAt = pending.reactionsDeadlineAt ?? 0;
    const secondsLeft = deadlineAt > 0 ? Math.max(0, Math.ceil((deadlineAt - nowTick) / 1000)) : 0;
    const reactionOpen = deadlineAt <= 0 || secondsLeft > 0;
    const helpCandidates = state.players.filter(
      (pl) =>
        pl.id !== pending.attackerId &&
        pl.id !== pending.assistId &&
        isPlayerActiveInMatch(pl) &&
        playerHasPlayablePositiveHelpItem(state, pl),
    );
    const myTeamRoll = pending.teamRolls?.[me.id];
    const attackerRoll = pending.teamRolls?.[pending.attackerId];
    const teammateRoll = pending.assistId ? pending.teamRolls?.[pending.assistId] : undefined;
    const bothTeamRolled = !!attackerRoll && (!pending.assistId || !!teammateRoll);
    const otherFighterName =
      me.id === pending.attackerId
        ? (teammate?.name ?? "")
        : (attacker?.name ?? sv.play.theAttacker);

    if (isTeamFighter) {
      return (
        <div className={u.stack10}>
          <div className={u.reactionTitleRow}>
            <span>{pending.enemyName}</span>
            <span className={u.inlineFlexGap5}>
              <img
                src="/icons/combat-icon.svg"
                alt=""
                aria-hidden
                className={u.combatIcon16}
              />
              <b>{pending.need + (pending.needMod ?? 0)}</b>
            </span>
          </div>
          {teammate ? (
            <div className={`${u.textCenter} ${u.o82} ${u.fs12}`}>
              {pending.teamBattleRequired ? "Team battle:" : "Ölkompis:"}{" "}
              {attacker?.name ?? "—"} {attackerRoll ? "har slagit" : "har inte slagit"} · {teammate.name}{" "}
              {teammateRoll ? "har slagit" : "har inte slagit"}
            </div>
          ) : null}
          <div className={sheetDiceBlockClass}>
            <div className={styles.sheetDiceRowWithModifier}>
              {diceModifierTotal !== 0 || attackDiceDoubledHint ? (
                <div className={styles.sheetDiceModifierSlot}>
                  {diceModifierTotal !== 0 ? (
                    <div className={styles.sheetDiceModifierBig}>{modTotalDisplay}</div>
                  ) : null}
                  {attackDiceDoubledHint ? (
                    <div className={styles.sheetDiceAttackDoubledHint}>{attackDiceDoubledHint}</div>
                  ) : null}
                </div>
              ) : null}
              <div className={styles.sheetDiceCenter}>
                {myTeamRoll ? (
                  <DiceCube3D
                    value={myTeamRoll.die}
                    size={76}
                    oneAsSkullIcon={combatTeamRollShowsSkullOnOne(me)}
                  />
                ) : (
                  <DiceCube3D idleSpin spinning={!everyoneDone || combatDiceSpinning} size={76} />
                )}
              </div>
            </div>
            {myTeamRoll ? (
              <>
                <div className={styles.sheetDiceCaption}>
                  <span className={styles.sheetDiceCaptionText}>
                    <span>Totalt </span>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: "1.2em",
                        lineHeight: 1,
                        letterSpacing: "-0.01em",
                        textShadow: "0 1px 8px rgba(0,0,0,0.45)",
                      }}
                    >
                      {myTeamRoll.total}
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.sheetDiceCaption} aria-hidden />
              </>
            )}
          </div>
          {(pending.reactors?.length ?? 0) > 0 && !everyoneDone && reactionOpen ? (
            <div className={`${u.textCenter} ${u.o85}`}>
              {sv.play.waitIntervene}
              {deadlineAt > 0 ? ` (${secondsLeft}s)` : ""}
            </div>
          ) : pending.assistId && !bothTeamRolled && myTeamRoll ? (
            <div className={`${u.textCenter} ${u.o82}`}>
              {otherFighterName
                ? sv.play.waitTeammateCombatRoll(otherFighterName)
                : sv.play.waitTeamSecondRoll}
            </div>
          ) : (() => {
            const sipBonus = myWeaponSipBonus;
            const sipPay = sipWeaponExtraAttackCosts(me.equipment.weapon);
            const weaponPow =
              sipBonus > 0 ? effectiveWeaponPiecePower(me.equipment.weapon, me.gold) : 0;
            const totalWeaponWithSip = weaponPow + sipBonus;
            if (sipBonus > 0) {
              const cantAffordGold = sipPay.klunks <= 0 && sipPay.gold > 0 && !canAffordPant(me, sipPay.gold);
              const sipChoiceMade = mySipWeaponChoice !== undefined;
              return (
                <div className={u.stack10}>
                  {isAttacker &&
                  !pending.teamBattleRequired &&
                  !pending.assistId &&
                  !isFinalBossMonsterId(pending.monsterId as MonsterId) &&
                  helpCandidates.length > 0 ? (
                    <ArcadeButton
                      variant="gray"
                      fullWidth
                      onClick={() => send({ type: "combatRequestHelp", playerId: me.id })}
                    >
                      {sv.play.combatHelpRequest}
                    </ArcadeButton>
                  ) : null}
                  {!sipChoiceMade ? (
                    <div className={`${u.textCenter} ${u.o92} ${u.fs14} ${u.lineHeight145}`}>
                      {sv.play.combatSipWeaponPrompt(
                        me.equipment.weapon?.name ?? "Vapnet",
                        sipBonus,
                        sipPay.gold,
                        sipPay.klunks,
                        totalWeaponWithSip,
                      )}
                    </div>
                  ) : null}
                  {!sipChoiceMade ? (
                    <>
                      <ArcadeButton
                        variant="pink"
                        fullWidth
                        onClick={() =>
                          send({
                            type: "combatChooseSipWeaponBonus",
                            playerId: me.id,
                            useSipWeaponBonus: true,
                          })
                        }
                        disabled={!!myTeamRoll || cantAffordGold}
                      >
                        {sv.play.combatSipWeaponRollWith(
                          sipBonus,
                          sipPay.gold,
                          sipPay.klunks,
                          totalWeaponWithSip,
                        )}
                      </ArcadeButton>
                      <ArcadeButton
                        variant="gray"
                        fullWidth
                        onClick={() =>
                          send({
                            type: "combatChooseSipWeaponBonus",
                            playerId: me.id,
                            useSipWeaponBonus: false,
                          })
                        }
                        disabled={!!myTeamRoll}
                      >
                        {sv.play.combatSipWeaponRollWithout}
                      </ArcadeButton>
                    </>
                  ) : (
                    <ArcadeButton
                      variant="pink"
                      fullWidth
                      onClick={() => {
                        setCombatDiceSpinning(false);
                        send({ type: "combatRoll", playerId: me.id });
                      }}
                      disabled={!!myTeamRoll}
                    >
                      {myTeamRoll ? "Du har slagit" : sv.play.rollCombat}
                    </ArcadeButton>
                  )}
                </div>
              );
            }
            return (
              <div className={u.stack10}>
                {isAttacker &&
                !pending.teamBattleRequired &&
                !pending.assistId &&
                !isFinalBossMonsterId(pending.monsterId as MonsterId) &&
                helpCandidates.length > 0 ? (
                  <ArcadeButton
                    variant="gray"
                    fullWidth
                    onClick={() => send({ type: "combatRequestHelp", playerId: me.id })}
                  >
                    {sv.play.combatHelpRequest}
                  </ArcadeButton>
                ) : null}
                <ArcadeButton
                  variant="pink"
                  fullWidth
                  onClick={() => {
                    setCombatDiceSpinning(false);
                    send({ type: "combatRoll", playerId: me.id });
                  }}
                  disabled={!!myTeamRoll}
                >
                  {myTeamRoll ? "Du har slagit" : sv.play.rollCombat}
                </ArcadeButton>
              </div>
            );
          })()}
        </div>
      );
    }

    if (isEligibleReactor && !hasAnyReaction && attacker) {
      if (hasPassed) {
        return null;
      }
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o9}`}>{sv.play.inCombat(attacker.name)}</div>
          <div className={`${u.textCenter} ${u.o85} ${u.fs14} ${u.lineHeight145}`}>
            {sv.play.noInterveneCards}
          </div>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "combatReact", playerId: me.id, choice: "pass" })}
          >
            {sv.play.doNothing}
          </ArcadeButton>
        </div>
      );
    }

    if (isEligibleReactor && hasAnyReaction && attacker) {
      if (wantsIntervene) {
        const interveneItems = (me.inventory ?? []).filter((it) => canPlayInterveneItem(String(it.itemId)));
        if (interveneItems.length === 0) {
          return (
            <div className={u.stack10}>
              <div className={`${u.textCenter} ${u.o9}`}>{sv.play.interveneNoCardsPlayable}</div>
              <ArcadeButton
                variant="gray"
                fullWidth
                onClick={() => {
                  send({ type: "combatReact", playerId: me.id, choice: "pass" });
                  setWantsIntervene(false);
                }}
              >
                {sv.play.doNothing}
              </ArcadeButton>
            </div>
          );
        }
        if (beerBroPickInstance) {
          const broInst = interveneItems.find((x) => x.instanceId === beerBroPickInstance);
          const broCandidates = state.players.filter(
            (p) => p.id !== pending.attackerId && isPlayerActiveInMatch(p),
          );
          if (!broInst) {
            return (
              <div className={u.stack10}>
                <div className={`${u.textCenter} ${u.o85}`}>{sv.play.itemNotFound}</div>
                <ArcadeButton variant="gray" fullWidth onClick={() => setBeerBroPickInstance(null)}>
                  {sv.play.back}
                </ArcadeButton>
              </div>
            );
          }
          return (
            <div className={u.stack10}>
              <div className={`${u.textCenter} ${u.o9}`}>{sv.play.chooseBeerBroPartner}</div>
              <div className={u.stack8}>
                {broCandidates.map((p) => (
                  <ArcadeButton
                    key={p.id}
                    variant="pink"
                    fullWidth
                    onClick={() => {
                      send({
                        type: "useItem",
                        playerId: me.id,
                        instanceId: broInst.instanceId,
                        targetPlayerId: p.id,
                      });
                      setBeerBroPickInstance(null);
                      setWantsIntervene(false);
                    }}
                  >
                    {p.name}
                  </ArcadeButton>
                ))}
              </div>
              <ArcadeButton variant="gray" fullWidth onClick={() => setBeerBroPickInstance(null)}>
                {sv.play.back}
              </ArcadeButton>
            </div>
          );
        }
        if (interveneOtherTargetPickInstance) {
          const otInst = interveneItems.find((x) => x.instanceId === interveneOtherTargetPickInstance);
          const otherTargetCandidates = state.players.filter(
            (p) => p.id !== me.id && isPlayerActiveInMatch(p),
          );
          if (!otInst) {
            return (
              <div className={u.stack10}>
                <div className={`${u.textCenter} ${u.o85}`}>{sv.play.itemNotFound}</div>
                <ArcadeButton variant="gray" fullWidth onClick={() => setInterveneOtherTargetPickInstance(null)}>
                  {sv.play.back}
                </ArcadeButton>
              </div>
            );
          }
          return (
            <div className={u.stack10}>
              <div className={`${u.textCenter} ${u.o9}`}>{sv.play.chooseTarget}</div>
              <div className={u.stack8}>
                {otherTargetCandidates.map((p) => (
                  <ArcadeButton
                    key={p.id}
                    variant="pink"
                    fullWidth
                    onClick={() => {
                      send({
                        type: "useItem",
                        playerId: me.id,
                        instanceId: otInst.instanceId,
                        targetPlayerId: p.id,
                      });
                      setInterveneOtherTargetPickInstance(null);
                      setWantsIntervene(false);
                    }}
                  >
                    {p.name}
                  </ArcadeButton>
                ))}
              </div>
              <ArcadeButton variant="gray" fullWidth onClick={() => setInterveneOtherTargetPickInstance(null)}>
                {sv.play.back}
              </ArcadeButton>
            </div>
          );
        }
        return (
          <div className={u.stack10}>
            <div className={`${u.textCenter} ${u.o9}`}>{sv.play.intervenePickCard}</div>
            <div className={u.stack8}>
              {interveneItems.map((it) => (
                  <ArcadeButton
                    key={it.instanceId}
                    variant="blue"
                    fullWidth
                    onClick={() => {
                      const id = String(it.itemId);
                      if (id === "beer_bro") {
                        if (pending.teamBattleRequired) {
                          showToast(sv.play.beerBroUnavailableTeamBattle);
                          return;
                        }
                        if (pending.assistId) {
                          showToast(sv.play.beerBroAlreadyHelping);
                          return;
                        }
                        setBeerBroPickInstance(it.instanceId);
                        return;
                      }
                      if (id === "not_my_round" || id === "spill_intentional") {
                        setInterveneOtherTargetPickInstance(it.instanceId);
                        return;
                      }
                      const targetPlayerId =
                        [
                          "weak_beer",
                          "light_beer",
                          "folk_beer",
                          "tripwire",
                          "double_hops",
                          "beer_bomb",
                          "manopositiv",
                          "get_lucky",
                          "hangover",
                          "lengraddad",
                        ].includes(id)
                          ? attacker.id
                          : undefined;
                      send({ type: "useItem", playerId: me.id, instanceId: it.instanceId, targetPlayerId });
                      setWantsIntervene(false);
                    }}
                  >
                    {itemMetaForView(it.itemId).title}
                    {String(it.itemId) === "weak_beer" ? sv.play.itemSuffixWeakBeer : ""}
                    {String(it.itemId) === "light_beer" ? sv.play.itemSuffixLightBeer : ""}
                    {String(it.itemId) === "folk_beer" ? sv.play.itemSuffixFolkBeer : ""}
                    {String(it.itemId) === "tripwire" ? sv.play.itemSuffixTripwire : ""}
                    {String(it.itemId) === "double_hops" ? sv.play.itemSuffixDoubleHops : ""}
                    {String(it.itemId) === "beer_bomb" ? sv.play.itemSuffixBeerBomb : ""}
                    {String(it.itemId) === "manopositiv" ? sv.play.itemSuffixManopositiv : ""}
                    {String(it.itemId) === "get_lucky" ? " (+4, risk)" : ""}
                    {String(it.itemId) === "hangover" ? sv.play.itemSuffixHangover : ""}
                    {String(it.itemId) === "monster_hype" ? sv.play.itemSuffixMonsterHype : ""}
                    {String(it.itemId) === "yeast_sabotage" ? sv.play.itemSuffixYeast : ""}
                    {String(it.itemId) === "beer_bro" ? sv.play.itemSuffixBeerBro : ""}
                    {String(it.itemId) === "lengraddad" ? sv.play.itemSuffixLengraddad : ""}
                  </ArcadeButton>
                ))}
            </div>
            <ArcadeButton
              variant="gray"
              fullWidth
              onClick={() => {
                send({ type: "combatReact", playerId: me.id, choice: "pass" });
                setWantsIntervene(false);
              }}
            >
              {sv.play.interveneCancelPass}
            </ArcadeButton>
          </div>
        );
      }
      if (hasPassed) {
        return null;
      }
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o9}`}>{sv.play.inCombat(attacker.name)}</div>
          <div className={u.grid2Equal10}>
            <ArcadeButton
              variant="pink"
              fullWidth
              onClick={() => {
                send({ type: "combatReact", playerId: me.id, choice: "intervene" });
                setWantsIntervene(true);
              }}
            >
              {sv.play.intervene}
            </ArcadeButton>
            <ArcadeButton
              variant="gray"
              fullWidth
              onClick={() => send({ type: "combatReact", playerId: me.id, choice: "pass" })}
            >
              {sv.play.doNothing}
            </ArcadeButton>
          </div>
        </div>
      );
    }
    return null;
  }

  if (pending?.type === "moveChoice" && pending.playerId === me.id) {
    const hasBaseDie = typeof pending.baseDie === "number" && Number.isFinite(pending.baseDie);
    const diceFaceValue = hasBaseDie ? pending.baseDie : pending.die;
    const moveRingN = state.levels[pending.from.levelIndex]?.tiles.length ?? 0;
    const cwOpt = pending.options.find((o) => o.dir === "cw");
    const ccwOpt = pending.options.find((o) => o.dir === "ccw");
    const swapMoveChoiceColumns =
      Boolean(cwOpt && ccwOpt) && isRingTopEdgeTile(pending.from.tileIndex, moveRingN);
    const moveChoiceDisplayOptions =
      swapMoveChoiceColumns && cwOpt && ccwOpt ? [ccwOpt, cwOpt] : pending.options;
    const moveDirHints =
      moveRingN > 0 && cwOpt && ccwOpt
        ? moveChoiceDirectionHints({
            fromTileIndex: pending.from.tileIndex,
            cwLandingTileIndex: cwOpt.target.tileIndex,
            ccwLandingTileIndex: ccwOpt.target.tileIndex,
            ringTileCount: moveRingN,
          })
        : null;
    const moveChoiceArrowLeft = moveDirHints
      ? swapMoveChoiceColumns
        ? moveDirHints.ccw.besideDice
        : moveDirHints.cw.besideDice
      : null;
    const moveChoiceArrowRight = moveDirHints
      ? swapMoveChoiceColumns
        ? moveDirHints.cw.besideDice
        : moveDirHints.ccw.besideDice
      : null;
    return (
      <div className={u.stack10}>
        <div className={sheetDiceBlockClass}>
          <div className={styles.moveChoiceDiceArrowsRow}>
            <div className={styles.moveChoiceArrowCell}>
              {moveChoiceArrowLeft ? (
                <img
                  src={`/icons/arrow-${moveChoiceArrowLeft}.svg`}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className={styles.moveChoiceArrowImg}
                />
              ) : (
                <span className={styles.moveChoiceSideArrowSpacer} aria-hidden />
              )}
            </div>
            <div className={styles.moveChoiceArrowCell}>
              {moveChoiceArrowRight ? (
                <img
                  src={`/icons/arrow-${moveChoiceArrowRight}.svg`}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className={styles.moveChoiceArrowImg}
                />
              ) : (
                <span className={styles.moveChoiceSideArrowSpacer} aria-hidden />
              )}
            </div>
            <div className={styles.moveChoiceDiceOverlay}>
              <DiceCube3D value={diceFaceValue} size={76} />
            </div>
          </div>
        </div>
        <div className={u.grid2Equal10}>
          {moveChoiceDisplayOptions.map((o) => {
            const v = moveChoiceTileVisual(o.tileType);
            return (
              <ArcadeButton
                key={o.dir}
                variant="blue"
                fullWidth
                innerStyle={
                  {
                    "--btn-bg": v.buttonBg,
                    "--btn-border": v.buttonBorder,
                    "--btn-focus": v.buttonFocus,
                    "--btn-shadow": v.buttonShadow,
                    "--btn-shadow-pressed": v.buttonShadowPressed,
                  } as CSSProperties
                }
                onClick={() => send({ type: "chooseMove", playerId: me.id, dir: o.dir })}
              >
                <MoveOptionLabel
                  state={state}
                  meId={me.id}
                  levelIndex={o.target.levelIndex}
                  tileIndex={o.target.tileIndex}
                  tileType={o.tileType}
                />
              </ArcadeButton>
            );
          })}
        </div>
      </div>
    );
  }

  if (pending?.type === "pvp" && pending.phase === "preRoundItems") {
    const isParticipant = pending.attackerId === me.id || pending.defenderId === me.id;
    if (isParticipant) {
    const bestOf = pending.bestOf ?? 1;
    const showPvpMatchMeta = bestOf > 1;
    const meHasPvpItems = (me.inventory ?? []).some((it) => PVP_PRE_ROUND_ITEM_IDS.has(it.itemId));
    const myReadyExplicit = pending.roundItemReady?.[me.id] === true;
    const myEffectiveReady = myReadyExplicit || !meHasPvpItems;
    const opponentId = pending.attackerId === me.id ? pending.defenderId : pending.attackerId;
    const opponent = state.players.find((p) => p.id === opponentId);
    const opponentHasPvpItems = (opponent?.inventory ?? []).some((it) => PVP_PRE_ROUND_ITEM_IDS.has(it.itemId));
    const opponentReadyExplicit = opponentId ? pending.roundItemReady?.[opponentId] === true : false;
    const opponentEffectiveReady = opponentReadyExplicit || !opponentHasPvpItems;
    return (
      <div className={u.stack10}>
        {showPvpMatchMeta ? (
          <>
            <div className={`${u.textCenter} ${u.o92}`}>
              {sv.play.pvpRoundBestOf(pvpRound, bestOf)}
            </div>
            <div className={`${u.textCenter} ${u.fs13} ${u.o82}`}>
              {`${sv.play.pvpScoreLabel}: ${pending.attackerId === me.id ? pvpWins.attacker : pvpWins.defender}–${pending.attackerId === me.id ? pvpWins.defender : pvpWins.attacker}`}
            </div>
          </>
        ) : null}
        <div className={`${u.textCenter} ${u.fs13} ${u.o88}`}>{sv.play.pvpPreRoundItemsHint}</div>
        {meHasPvpItems ? (
          <ArcadeButton
            variant={myReadyExplicit ? "gray" : "pink"}
            fullWidth
            onClick={() => send({ type: "pvpRoundReady", playerId: me.id, ready: !myReadyExplicit })}
          >
            {myReadyExplicit ? sv.play.pvpReadyUndo : sv.play.pvpReady}
          </ArcadeButton>
        ) : (
          <div className={`${u.textCenter} ${u.fs13} ${u.o85}`}>{sv.play.pvpNoItemsAutoReady}</div>
        )}
        <div className={`${u.textCenter} ${u.fs12} ${u.o75}`}>
          {myEffectiveReady
            ? opponentEffectiveReady
              ? sv.play.pvpBothReady
              : sv.play.pvpWaitingOpponentItemsOrReady(opponent?.name ?? "motståndaren")
            : sv.play.pvpPressReadyWhenDone}
        </div>
      </div>
    );
    }
  }

  if (pending?.type === "pvp" && pending.phase === "awaitingRolls") {
    const isParticipant = pending.attackerId === me.id || pending.defenderId === me.id;
    if (isParticipant) {
    const myRoll = pending.rolls?.[me.id];
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o9}`}>{sv.play.pvpRollDie}</div>
        <div className={sheetDiceBlockClass}>
          {myRoll ? (
            <DiceCube3D value={myRoll.die} size={76} />
          ) : (
            <DiceCube3D idleSpin spinning={pvpDiceSpinning} size={76} />
          )}
          <div className={styles.sheetDiceCaption}>
            {myRoll ? (
              <span className={styles.sheetDiceCaptionText}>
                {sv.play.yourD6TotalWeapon(myRoll.die, myRoll.total)}
              </span>
            ) : null}
          </div>
        </div>
        <ArcadeButton
          variant="pink"
          fullWidth
          onClick={() => {
            setPvpDiceSpinning(false);
            send({ type: "pvpRoll", playerId: me.id });
          }}
          disabled={!!myRoll}
        >
          {myRoll ? sv.play.youRolled : sv.play.rollPvpDie}
        </ArcadeButton>
      </div>
    );
    }
  }

  if (pending?.type === "pvp" && pending.phase === "roundReveal") {
    const isParticipant = pending.attackerId === me.id || pending.defenderId === me.id;
    if (isParticipant) {
    const myAck = pending.roundRevealAcked?.[me.id] === true;
    const opponentId = pending.attackerId === me.id ? pending.defenderId : pending.attackerId;
    const opponent = state.players.find((p) => p.id === opponentId);
    const oppAck = opponentId ? pending.roundRevealAcked?.[opponentId] === true : false;
    const myRoll = pending.rolls?.[me.id];
    const rt = pending.resolvedTotals;
    const myTotal = rt
      ? me.id === pending.attackerId
        ? rt.attackerTotal
        : rt.defenderTotal
      : null;
    const oppTotal = rt
      ? me.id === pending.attackerId
        ? rt.defenderTotal
        : rt.attackerTotal
      : null;
    const tieRound = myTotal !== null && oppTotal !== null && myTotal === oppTotal;
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o92} ${u.fs15} ${u.lineHeight135}`}>{sv.play.pvpRound(pvpRound)}</div>
        {myTotal !== null && oppTotal !== null && myTotal !== oppTotal ? (
          <div className={`${u.textCenter} ${u.fs15} ${u.fw700} ${u.o95}`}>
            {myTotal > oppTotal ? sv.play.pvpRoundYouWon : sv.play.pvpRoundYouLost}
          </div>
        ) : null}
        {tieRound ? (
          <div className={`${u.textCenter} ${u.fs15} ${u.fw700} ${u.o95}`}>{sv.play.pvpTieRerollHint}</div>
        ) : null}
        <div className={sheetDiceBlockClass}>
          {myRoll ? (
            <DiceCube3D value={myRoll.die} size={76} />
          ) : (
            <DiceCube3D idleSpin spinning={false} size={76} />
          )}
          <div className={styles.sheetDiceCaption}>
            {myRoll ? (
              <span className={styles.sheetDiceCaptionText}>
                {sv.play.yourD6TotalWeapon(myRoll.die, myRoll.total)}
              </span>
            ) : null}
          </div>
        </div>
        <ArcadeButton
          variant="blue"
          fullWidth
          disabled={myAck}
          onClick={() => send({ type: "pvpRoundRevealAck", playerId: me.id })}
        >
          {myAck ? sv.play.pvpRoundRevealDone : sv.play.pvpRoundRevealContinue}
        </ArcadeButton>
        <div className={`${u.textCenter} ${u.fs12} ${u.o75}`}>
          {myAck
            ? oppAck
              ? sv.play.pvpRoundRevealBothAcked
              : sv.play.pvpRoundRevealWaitOther(opponent?.name ?? "motståndaren")
            : sv.play.pvpRoundRevealTapToContinue}
        </div>
      </div>
    );
    }
  }

  if (pending?.type === "door" && myPending) {
    const monsterScaleNote = sv.play.levelUpMonsterScaleOnDestination(pending.targetLevelIndex);
    const doorPantCost = Number.isFinite(pending.costs?.gold) ? Math.max(0, Math.round(pending.costs.gold)) : 0;
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o9}`}>{sv.play.levelUpPrompt(pending.targetLevelIndex + 1)}</div>
        <div className={`${u.textCenter} ${u.fs14} ${u.o92} ${u.lineHeight145}`}>{sv.play.payPant(doorPantCost)}</div>
        {monsterScaleNote ? (
          <div className={`${u.textCenter} ${u.o88} ${u.fs13} ${u.lineHeight145}`}>{monsterScaleNote}</div>
        ) : null}
        <div className={u.stack10}>
          <ArcadeButton
            variant="blue"
            fullWidth
            onClick={() => send({ type: "useDoor", playerId: me.id, method: "gold" })}
            disabled={!canAffordPant(me, doorPantCost)}
          >
            {sv.play.payPant(doorPantCost)}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "useDoor", playerId: me.id, method: "stay" })}
          >
            {sv.play.stay}
          </ArcadeButton>
        </div>
      </div>
    );
  }


  if (personalTurnPrompt?.type === "levelUpOffer") {
    return (
      <div className={u.stack10}>
        <ArcadeButton
          variant="pink"
          fullWidth
          onClick={() => send({ type: "levelUpDecision", playerId: me.id, choice: "now" })}
        >
          {sv.play.levelUpNow}
        </ArcadeButton>
        <ArcadeButton
          variant="gray"
          fullWidth
          onClick={() => send({ type: "levelUpDecision", playerId: me.id, choice: "stay" })}
        >
          {sv.play.levelUpStayForTile}
        </ArcadeButton>
      </div>
    );
  }

  if (pending?.type === "merchant" && myPending) {
    const playMerchantBuySfx = () => {
      if (readBoardPerformancePrefs().mobileSfxEnabled) {
        playTableSfx("cans", { enabled: true });
      }
    };
    const requestMerchantBuy = (it: ShopItem) => {
      const price = effectiveMerchantBuyPrice(me, it.price);
      if (!canAffordPant(me, price)) {
        showToast(sv.play.merchantCantAfford);
        return;
      }
      if (isShopItemEquipment(it) && merchantSlotOccupied(me, it.slot)) {
        setMerchantReplaceItem(it);
        return;
      }
      playMerchantBuySfx();
      send({ type: "merchantBuy", playerId: me.id, itemId: it.id });
    };
    if (merchantDetailItem) {
      const detail = merchantDetailItem;
      const price = effectiveMerchantBuyPrice(me, detail.price);
      const kindLabel = isShopItemEquipment(detail)
        ? sv.play.merchantItemKindEquipment
        : detail.slot === "gold"
          ? sv.play.merchantItemKindGold
          : sv.play.merchantItemKindConsumable;
      const effectSummary = formatShopItemEffectSummary(detail);
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.fs15} ${u.o92}`}>{kindLabel}</div>
          <div className={styles.merchantDetailArtWrap}>
            <MerchantShopItemArt item={detail} variant="detail" />
          </div>
          <div className={`${u.textCenter} ${u.fs18} ${u.fw700}`}>{detail.name}</div>
          {effectSummary !== "—" ? (
            <div className={`${u.textCenter} ${u.o85}`}>{effectSummary}</div>
          ) : null}
          <div className={u.grid2Equal10}>
            <ArcadeButton variant="gray" fullWidth onClick={() => setMerchantDetailItem(null)}>
              {sv.play.merchantDetailBack}
            </ArcadeButton>
            <ArcadeButton
              variant="pink"
              fullWidth
              disabled={!canAffordPant(me, price)}
              onClick={() => {
                setMerchantDetailItem(null);
                requestMerchantBuy(detail);
              }}
            >
              {sv.play.merchantDetailBuy} ({price} pant)
            </ArcadeButton>
          </div>
        </div>
      );
    }
    return (
      <div className={u.stack10Relative}>
        {merchantReplaceItem && isShopItemEquipment(merchantReplaceItem) ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 3,
              margin: -4,
              borderRadius: 16,
              background: "rgba(6, 10, 22, 0.94)",
              border: "1px solid rgba(255,255,255,0.14)",
              display: "grid",
              gap: 14,
              alignContent: "center",
              justifyItems: "stretch",
              padding: "16px 14px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            <div className={`${u.fs15} ${u.lineHeight145} ${u.textCenter} ${u.colorWhite}`}>
              {sv.play.merchantReplaceBody(
                capitalizeWord(equipmentSlotSv(merchantReplaceItem.slot)),
                merchantEquippedName(me, merchantReplaceItem.slot),
                merchantReplaceItem.name,
              )}
            </div>
            {renderEquipmentReplaceEffects(
              merchantReplaceItem.slot,
              me,
              merchantReplaceItem.name,
              merchantReplaceItem.id,
            )}
            <div className={u.stack8}>
              <ArcadeButton
                variant="pink"
                fullWidth
                onClick={() => {
                  const pr = effectiveMerchantBuyPrice(me, merchantReplaceItem.price);
                  if (!canAffordPant(me, pr)) {
                    showToast(sv.play.merchantCantAfford);
                    return;
                  }
                  playMerchantBuySfx();
                  send({ type: "merchantBuy", playerId: me.id, itemId: merchantReplaceItem.id });
                  setMerchantReplaceItem(null);
                }}
              >
                {sv.play.merchantReplaceConfirm}
              </ArcadeButton>
              <ArcadeButton variant="gray" fullWidth onClick={() => setMerchantReplaceItem(null)}>
                {sv.play.merchantReplaceCancel}
              </ArcadeButton>
            </div>
          </div>
        ) : null}
        <div className={styles.merchantShopHeaderBar}>
          <div
            style={{
              fontFamily: "var(--sans)",
              fontWeight: 700,
              fontSize: "clamp(1.35rem, 5vw, 1.75rem)",
              lineHeight: 1.05,
              letterSpacing: 0.03,
              color: "#ffffff",
              textAlign: "left",
              textShadow: "0 1px 2px rgba(0,0,0,0.45)",
            }}
          >
            {tileTypeSv.merchant}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 6,
              flexShrink: 0,
            }}
            aria-label={`${playerPant(me)} pant`}
          >
            <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1, opacity: 0.98 }}>{playerPant(me)}</span>
            <StatIcon kind="pant" size={22} />
          </div>
        </div>
        {interactionPanelCollapsed ? (
          <p className={styles.merchantShopCollapsedHint}>{sv.play.merchantShopCollapsedHint}</p>
        ) : (
          <div className={u.stack10}>
            {pending.items.slice(0, 4).map((it) => {
              const effectSummary = formatShopItemEffectSummary(it);
              const effectBadges = shopItemEffectBadges(it);
              const effectSupplement = shopItemEffectSupplementText(it);
              const price = effectiveMerchantBuyPrice(me, it.price);
              const cantAfford = !canAffordPant(me, price);
              return (
                <ArcadeButton
                  key={it.id}
                  onClick={() => setMerchantDetailItem(it)}
                  variant="merchant"
                  fullWidth
                  disabled={cantAfford}
                >
                  <span className={styles.merchantShopRow}>
                    <div className={styles.merchantShopRowArt}>
                      <MerchantShopItemArt item={it} />
                    </div>
                    <div className={styles.merchantShopRowBody}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", lineHeight: 0 }}
                        >
                          {it.slot === "gold" ? (
                            <StatIcon kind="pant" size={MERCHANT_TYPE_ICON_PX} />
                          ) : (
                            <MerchantShopTypeIcon item={it} />
                          )}
                        </span>
                        <span>{it.name}</span>
                      </div>
                      {effectBadges.length > 0 ? (
                        <span
                          className={styles.merchantShopRowEffect}
                          aria-label={effectSummary !== "—" ? effectSummary : undefined}
                        >
                          <EffectBadgePillStrip badges={effectBadges} size="md" />
                          {effectSupplement ? (
                            <span className={styles.merchantShopRowEffectSupplement}>{effectSupplement}</span>
                          ) : null}
                        </span>
                      ) : effectSummary !== "—" ? (
                        <span className={styles.merchantShopRowEffect}>{effectSummary}</span>
                      ) : null}
                    </div>
                    <span
                      className={[
                        styles.merchantShopRowPrice,
                        cantAfford ? styles.merchantShopRowPriceCantAfford : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1, opacity: 0.98 }}>
                        {price}
                      </span>
                      <StatIcon kind="pant" size={20} />
                    </span>
                  </span>
                </ArcadeButton>
              );
            })}
          </div>
        )}
        <ArcadeButton
          variant="gray"
          fullWidth
          onClick={() => send({ type: "merchantBuy", playerId: me.id, itemId: null })}
        >
          {sv.play.leave}
        </ArcadeButton>
      </div>
    );
  }

  if (pending?.type === "pvp" && pending.phase === "chooseLoot" && pending.winnerId === me.id) {
    const loser = state.players.find((p) => p.id === pending.loserId);
    const items = loser?.equipment ?? {};
    const availableSlots = (["weapon", "armor", "helmet", "accessory"] as const).filter((slot) => !!items[slot]);
    const theftProtected = loser?.equipment.accessory?.preventTheft === true;
    const showEquipmentLoot = !theftProtected && availableSlots.length > 0;
    const pantSteal = loser ? pvpLootPantStealAmount(loser.gold) : 0;
    const penaltyKlunkTotal = loser ? penaltySipTotalForPlayer(loser, 1) : 0;
    const dmgPreview = loser
      ? previewHpAfterFlatDamage({ player: loser, amount: 2, isBossHit: false, bypassShield: true })
      : { hpAfter: 0, blockedByNegateAllOnce: false };
    const damageButtonLabel = loser
      ? sv.play.pvpLootDealDamageLine(loser.hp, dmgPreview.hpAfter, dmgPreview.blockedByNegateAllOnce)
      : sv.play.pvpDeal2Damage;
    const truncatePvpLootEquipName = (name: string, maxLen = 36): string => {
      const t = name.trim();
      if (t.length <= maxLen) return t;
      const ell = "...";
      return `${t.slice(0, Math.max(0, maxLen - ell.length)).trimEnd()}${ell}`;
    };
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o9}`}>{sv.play.pvpChooseLoot}</div>
        <div className={u.stack10}>
          <ArcadeButton
            variant="blue"
            fullWidth
            onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: "gold" })}
          >
            {sv.play.pvpLootTakePant(pantSteal)}
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: "sip" })}
          >
            {sv.play.pvpLootPenaltyKlunk(Math.max(0, penaltyKlunkTotal))}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: "damage" })}
          >
            {damageButtonLabel}
          </ArcadeButton>
          {showEquipmentLoot ? (
            availableSlots.map((slot) => {
              const rawName = (items[slot]?.name ?? slot).trim();
              const shownName = truncatePvpLootEquipName(rawName);
              return (
                <ArcadeButton
                  key={slot}
                  variant="gray"
                  fullWidth
                  title={rawName.length > shownName.length ? rawName : undefined}
                  onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: slot })}
                >
                  {sv.play.pvpLootTakeEquipment(capitalizeWord(equipmentSlotSv(slot)), shownName)}
                </ArcadeButton>
              );
            })
          ) : theftProtected ? (
            <div className={`${u.textCenter} ${u.o75} ${u.fs12}`}>{sv.play.pvpLootTheftProtectedHint}</div>
          ) : (
            <div className={`${u.textCenter} ${u.o75} ${u.fs12}`}>{sv.play.noItemsToSteal}</div>
          )}
        </div>
      </div>
    );
  }

  if (isMyTurn && !pending && !personalPromptBlocksRoll) {
    const canChooseMerchant = canAffordPant(me, 5);
    return (
      <div className={u.stack10}>
        <div className={sheetDiceBlockClass}>
          <DiceCube3D idleSpin spinning={rollDiceSpinning} size={76} />
          <div className={styles.sheetDiceCaption} aria-hidden />
        </div>
        <ArcadeButton
          variant="pink"
          fullWidth
          onClick={() => {
            setRollDiceSpinning(false);
            playOptimisticMoveRollSfx(readBoardPerformancePrefs().mobileSfxEnabled);
            send({ type: "rollMove", playerId: me.id });
          }}
        >
          {sv.play.rollDie}
        </ArcadeButton>
        {canChooseMerchant ? (
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "chooseMerchant", playerId: me.id })}
          >
            <span className={styles.turnChoicePantaLabel}>
              <TutorialInlineIcon
                src="/icons/panta-icon.svg"
                color="#111827"
                gap="0"
                className={styles.turnChoicePantaIcon}
              />
              <span>{sv.play.moveChoiceMerchant}</span>
            </span>
          </ArcadeButton>
        ) : null}
      </div>
    );
  }

  return null;
}
