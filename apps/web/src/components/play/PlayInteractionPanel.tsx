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
  getEquipmentDisplay,
  getEquipmentDisplayByEquippedName,
  MERCHANT_REROLL_GOLD_COST,
  effectiveWeaponPiecePower,
  isBrewerPerkChoiceAvailable,
  isFinalBossMonsterId,
  isPlayerActiveInMatch,
  itemPlayGoldCost,
  monsterCombatEquipmentAttackBonus,
  penaltySipTotalForPlayer,
  playerCanCombatIntervene,
  playerHasPlayablePositiveHelpItem,
  playerTotalItemCardBonus,
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
import { formatLocalizedShopItemEffectSummary } from "../../lib/equipmentEffectSummary";
import { formatPantAmount } from "../../lib/formatPantAmount";
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
import { PlayArcadeButton as ArcadeButton } from "./PlayArcadeButton";
import { DiceCube3D } from "../DiceCube3D";
import { EffectBadgePillStrip } from "../EffectBadgePillStrip";
import { CombatStrengthPill } from "../MonsterEncounterCard";
import { PictureImg } from "../PictureImg";
import { StatIcon } from "../StatIcon";
import { CombatChooseTeammateSheet } from "./CombatChooseTeammateSheet";
import { CombatEnemyIntroWaiting } from "./CombatEnemyIntroWaiting";
import { CombatHitMitigationSheet } from "./CombatHitMitigationSheet";
import { CombatItemButtonSuffix } from "./CombatItemButtonSuffix";
import { CombatRollPreviewSheet } from "./CombatRollPreviewSheet";
import { EquipmentCombatTotalsRow } from "./EquipmentCombatTotalsRow";
import { MoveOptionLabel } from "./MoveOptionLabel";
import { MerchantShopItemArt, MerchantShopTypeIcon, MERCHANT_TYPE_ICON_PX } from "./merchantShopUi";
import { TutorialInlineIcon } from "./TutorialInlineIcon";
import {
  BREWER_PERK_BUTTONS,
  brewerPerkChoiceLabel,
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
import { merchantShopItemDisplayName } from "../../lib/merchantLocale";
import { localizedCombatMonster } from "../../lib/combatUi";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";
import { useLocale, useUiStrings } from "../../lib/locale/LocaleContext";
import { capitalizeWord, equipmentSlotLabel, tileTypeLabel } from "../../lib/uiStrings";

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
  const locale = useLocale();
  const ui = useUiStrings();
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
  const combatItemSuffixOpts = {
    boardLevelIndex: me.levelIndex,
    itemCardBonus: playerTotalItemCardBonus(me),
  };
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
          {ui.play.lobbySheet(readyCount, totalPlayers)}
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
            {ui.play.shuffleAvatar}
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
              {ui.play.shuffleAvatar}
            </ArcadeButton>
          ) : null}
          <ArcadeButton
            variant={me.ready ? "gray" : "blue"}
            fullWidth
            disabled={status !== "connected"}
            onClick={() => send({ type: "setReady", playerId: me.id, ready: !me.ready })}
          >
            {me.ready ? ui.play.unready : ui.play.ready}
          </ArcadeButton>
          {me.isHost ? (
            <ArcadeButton
              variant="pink"
              fullWidth
              disabled={status !== "connected" || !canStart}
              onClick={() => send({ type: "startGame", playerId: me.id })}
            >
              {ui.play.startGame}
            </ArcadeButton>
          ) : null}
        </div>
        {!canStart && (
          <div className={`${u.textCenter} ${u.o75} ${u.fs12}`}>
            {me.isHost ? ui.play.hostNeedPlayers : ui.play.waitHostStart}
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
        {BREWER_PERK_BUTTONS.map(({ choice, icon, variant }) => {
          const available = isBrewerPerkChoiceAvailable(me, choice);
          const label = brewerPerkChoiceLabel(ui.play, choice);
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
                  {ui.play.brewerPerkChoiceWithCap(
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
    const equippedDisplayName =
      (getEquipmentDisplayByEquippedName(merchantEquippedName(me, slot), locale)?.name ??
        merchantEquippedName(me, slot)) ||
      "—";
    const newDisplayName =
      "catalogId" in equipOffer && equipOffer.catalogId
        ? getEquipmentDisplay(equipOffer.catalogId, locale).name
        : getEquipmentDisplayByEquippedName(equipOffer.newName, locale)?.name ?? equipOffer.newName;
    return (
      <div className={u.stack12}>
        <div className={`${u.textCenter} ${u.o95} ${u.fs16} ${u.lineHeight135}`}>
          {ui.play.lootEquipmentReplaceTitle}
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
          {ui.play.merchantReplaceBody(
            capitalizeWord(equipmentSlotLabel(slot, locale)),
            equippedDisplayName,
            newDisplayName,
          )}
        </div>
        {renderEquipmentReplaceEffects(
          slot,
          me,
          equipOffer.newName,
          ui,
          "catalogId" in equipOffer ? equipOffer.catalogId : undefined,
          locale,
        )}
        <div className={u.stack8}>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "equipmentReplaceDecision", playerId: me.id, accept: true })}
          >
            {ui.play.merchantReplaceConfirm}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "equipmentReplaceDecision", playerId: me.id, accept: false })}
          >
            {ui.play.lootEquipmentReplaceDecline}
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
          <div className={`${u.textCenter} ${u.o9}`}>{ui.play.pvpChooseOpponent}</div>
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
    const encounterPvpButtonLabel = ui.play.pvpBothRollVersus(encounterPvpEligibleNames.join(", "));
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o9}`}>{ui.play.encounterChoose}</div>
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
            {ui.play.resolveTileNoPvp(tileTypeLabel(pending.tileType ?? "empty", locale))}
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
          {ui.play.waitAttackerContinue(attacker?.name ?? ui.play.theAttacker)}
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
          {ui.play.waitAttackerChoose(attacker?.name ?? ui.play.theAttacker)}
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
          <div className={`${u.textCenter} ${u.o92}`}>{ui.play.combatHelpChooseHelper}</div>
          {helperPlayers.length === 0 ? (
            <div className={`${u.textCenter} ${u.o82}`}>{ui.play.combatHelpNoCandidates}</div>
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
            {ui.play.combatHelpCancel}
          </ArcadeButton>
        </div>
      );
    }
    const attackerName = state.players.find((p) => p.id === pending.attackerId)?.name ?? ui.play.theAttacker;
    return (
      <div className={`${u.textCenter} ${u.o82}`}>
        {ui.play.combatHelpWaitAttackerChoose(attackerName)}
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
    if (!helperId) return <div className={`${u.textCenter} ${u.o82}`}>{ui.play.waitingState}</div>;
    if (isHelper) {
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o92}`}>{ui.play.combatHelpDecisionPrompt}</div>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "decline" })}
          >
            {ui.play.combatHelpDecisionDecline}
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "free" })}
          >
            {ui.play.combatHelpDecisionFree}
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "pant" })}
          >
            <>
              {ui.play.combatHelpDecisionPant}
              {pantOutcomeInline}
            </>
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "treasure" })}
          >
            <>
              {ui.play.combatHelpDecisionTreasure}
              {treasureOutcomeInline}
            </>
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelperDecision", playerId: me.id, decision: "split" })}
          >
            <>
              {ui.play.combatHelpDecisionSplit}
              {splitOutcomeInline}
            </>
          </ArcadeButton>
        </div>
      );
    }
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o82}`}>
          {ui.play.combatHelpWaitDecision(helperName)}
        </div>
        {pending.attackerId === me.id ? (
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={cancelCombatHelpRequest}
          >
            {ui.play.combatHelpCancel}
          </ArcadeButton>
        ) : null}
      </div>
    );
  }

  if (pending?.type === "combat" && pending.phase === "helpAwaitRequesterDecision") {
    const helperId = pending.helpSelectedHelperId;
    const helperName = helperId ? (state.players.find((p) => p.id === helperId)?.name ?? "—") : "—";
    const requesterName = state.players.find((p) => p.id === pending.attackerId)?.name ?? ui.play.theAttacker;
    const isRequester = pending.attackerId === me.id;
    const requested = pending.helpProposedContract;
    const pantGoldReward = Math.max(0, Math.floor(pending.rewardGold ?? 4));
    const treasureItemsReward = Math.max(0, Math.floor(pending.rewardItems ?? 1));
    if (!helperId || !requested) return <div className={`${u.textCenter} ${u.o82}`}>{ui.play.waitingState}</div>;
    const requestedLabel =
      requested === "pant"
        ? (
            <>
              {ui.play.combatHelpDecisionPant}{" "}
              <span className={styles.contractOutcomeSuffix}>
                ({pantGoldReward}{" "}
                <TutorialInlineIcon src="/icons/pant-icon.svg" color={CONTRACT_ICON_PANT_COLOR} gap="0 2px 0 0" />)
              </span>
            </>
          )
        : requested === "treasure"
          ? (
              <>
                {ui.play.combatHelpDecisionTreasure}{" "}
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
                {ui.play.combatHelpDecisionSplit}{" "}
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
            {ui.play.combatHelpRequesterPrompt(helperName)}
          </div>
          <div className={`${u.textCenter} ${u.o85}`}>{requestedLabel}</div>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "combatHelpRequesterDecision", playerId: me.id, accept: true })}
          >
            {ui.play.combatHelpRequesterAccept}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "combatHelpRequesterDecision", playerId: me.id, accept: false })}
          >
            {ui.play.combatHelpRequesterDecline}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={cancelCombatHelpRequest}
          >
            {ui.play.combatHelpCancel}
          </ArcadeButton>
        </div>
      );
    }
    return (
      <div className={`${u.textCenter} ${u.o82}`}>
        {me.id === helperId
          ? ui.play.combatHelpRequesterWait(requesterName)
          : ui.play.combatHelpWaitDecision(requesterName)}
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
            {ui.play.combatHelpPlayPositiveCard}
          </div>
          {helperItems.length === 0 ? (
            <div className={`${u.textCenter} ${u.o82}`}>{ui.play.combatHelpNoPlayablePositiveCards}</div>
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
                <CombatItemButtonSuffix itemId={it.itemId} {...combatItemSuffixOpts} />
              </ArcadeButton>
            ))
          )}
        </div>
      );
    }
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o82}`}>
          {ui.play.combatHelpWaitHelperCard(helperName)}
        </div>
        {pending.attackerId === me.id ? (
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={cancelCombatHelpRequest}
          >
            {ui.play.combatHelpCancel}
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
        : (attacker?.name ?? ui.play.theAttacker);

    if (isTeamFighter) {
      return (
        <div className={u.stack10}>
          <div className={u.reactionTitleRow}>
            <span className={u.combatMonsterName}>{localizedCombatMonster(pending, locale).name}</span>
            <CombatStrengthPill value={pending.need + (pending.needMod ?? 0)} />
          </div>
          {teammate ? (
            <div className={`${u.textCenter} ${u.o82} ${u.fs12}`}>
              {pending.teamBattleRequired ? `${ui.play.teamBattleLabel}:` : `${ui.play.combatBeerBroLabel} `}
              {attacker?.name ?? "—"}{" "}
              {attackerRoll ? ui.play.combatPlayerHasRolled : ui.play.combatPlayerHasNotRolled} · {teammate.name}{" "}
              {teammateRoll ? ui.play.combatPlayerHasRolled : ui.play.combatPlayerHasNotRolled}
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
              {ui.play.waitIntervene}
              {deadlineAt > 0 ? ` (${secondsLeft}s)` : ""}
            </div>
          ) : pending.assistId && !bothTeamRolled && myTeamRoll ? (
            <div className={`${u.textCenter} ${u.o82}`}>
              {otherFighterName
                ? ui.play.waitTeammateCombatRoll(otherFighterName)
                : ui.play.waitTeamSecondRoll}
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
                      {ui.play.combatHelpRequest}
                    </ArcadeButton>
                  ) : null}
                  {!sipChoiceMade ? (
                    <div className={`${u.textCenter} ${u.o92} ${u.fs14} ${u.lineHeight145}`}>
                      {ui.play.combatSipWeaponPrompt(
                        getEquipmentDisplayByEquippedName(me.equipment.weapon?.name, locale)?.name ??
                          me.equipment.weapon?.name ??
                          ui.play.equipWeapon,
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
                        {ui.play.combatSipWeaponRollWith(
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
                        {ui.play.combatSipWeaponRollWithout}
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
                      {myTeamRoll ? ui.play.youRolled : ui.play.rollCombat}
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
                    {ui.play.combatHelpRequest}
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
                  {myTeamRoll ? ui.play.youRolled : ui.play.rollCombat}
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
          <div className={`${u.textCenter} ${u.o9}`}>{ui.play.inCombat(attacker.name)}</div>
          <div className={`${u.textCenter} ${u.o85} ${u.fs14} ${u.lineHeight145}`}>
            {ui.play.noInterveneCards}
          </div>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "combatReact", playerId: me.id, choice: "pass" })}
          >
            {ui.play.doNothing}
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
              <div className={`${u.textCenter} ${u.o9}`}>{ui.play.interveneNoCardsPlayable}</div>
              <ArcadeButton
                variant="gray"
                fullWidth
                onClick={() => {
                  send({ type: "combatReact", playerId: me.id, choice: "pass" });
                  setWantsIntervene(false);
                }}
              >
                {ui.play.doNothing}
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
                <div className={`${u.textCenter} ${u.o85}`}>{ui.play.itemNotFound}</div>
                <ArcadeButton variant="gray" fullWidth onClick={() => setBeerBroPickInstance(null)}>
                  {ui.play.back}
                </ArcadeButton>
              </div>
            );
          }
          return (
            <div className={u.stack10}>
              <div className={`${u.textCenter} ${u.o9}`}>{ui.play.chooseBeerBroPartner}</div>
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
                {ui.play.back}
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
                <div className={`${u.textCenter} ${u.o85}`}>{ui.play.itemNotFound}</div>
                <ArcadeButton variant="gray" fullWidth onClick={() => setInterveneOtherTargetPickInstance(null)}>
                  {ui.play.back}
                </ArcadeButton>
              </div>
            );
          }
          return (
            <div className={u.stack10}>
              <div className={`${u.textCenter} ${u.o9}`}>{ui.play.chooseTarget}</div>
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
                {ui.play.back}
              </ArcadeButton>
            </div>
          );
        }
        return (
          <div className={u.stack10}>
            <div className={`${u.textCenter} ${u.o9}`}>{ui.play.intervenePickCard}</div>
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
                          showToast(ui.play.beerBroUnavailableTeamBattle);
                          return;
                        }
                        if (pending.assistId) {
                          showToast(ui.play.beerBroAlreadyHelping);
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
                    <CombatItemButtonSuffix
                      itemId={it.itemId}
                      beerBroText={ui.play.itemSuffixBeerBro}
                      {...combatItemSuffixOpts}
                    />
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
              {ui.play.interveneCancelPass}
            </ArcadeButton>
          </div>
        );
      }
      if (hasPassed) {
        return null;
      }
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o9}`}>{ui.play.inCombat(attacker.name)}</div>
          <div className={u.grid2Equal10}>
            <ArcadeButton
              variant="pink"
              fullWidth
              onClick={() => {
                send({ type: "combatReact", playerId: me.id, choice: "intervene" });
                setWantsIntervene(true);
              }}
            >
              {ui.play.intervene}
            </ArcadeButton>
            <ArcadeButton
              variant="gray"
              fullWidth
              onClick={() => send({ type: "combatReact", playerId: me.id, choice: "pass" })}
            >
              {ui.play.doNothing}
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
              {ui.play.pvpRoundBestOf(pvpRound, bestOf)}
            </div>
            <div className={`${u.textCenter} ${u.fs13} ${u.o82}`}>
              {`${ui.play.pvpScoreLabel}: ${pending.attackerId === me.id ? pvpWins.attacker : pvpWins.defender}–${pending.attackerId === me.id ? pvpWins.defender : pvpWins.attacker}`}
            </div>
          </>
        ) : null}
        <div className={`${u.textCenter} ${u.fs13} ${u.o88}`}>{ui.play.pvpPreRoundItemsHint}</div>
        {meHasPvpItems ? (
          <ArcadeButton
            variant={myReadyExplicit ? "gray" : "pink"}
            fullWidth
            onClick={() => send({ type: "pvpRoundReady", playerId: me.id, ready: !myReadyExplicit })}
          >
            {myReadyExplicit ? ui.play.pvpReadyUndo : ui.play.pvpReady}
          </ArcadeButton>
        ) : (
          <div className={`${u.textCenter} ${u.fs13} ${u.o85}`}>{ui.play.pvpNoItemsAutoReady}</div>
        )}
        <div className={`${u.textCenter} ${u.fs12} ${u.o75}`}>
          {myEffectiveReady
            ? opponentEffectiveReady
              ? ui.play.pvpBothReady
              : ui.play.pvpWaitingOpponentItemsOrReady(opponent?.name ?? "motståndaren")
            : ui.play.pvpPressReadyWhenDone}
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
        <div className={`${u.textCenter} ${u.o9}`}>{ui.play.pvpRollDie}</div>
        <div className={sheetDiceBlockClass}>
          {myRoll ? (
            <DiceCube3D value={myRoll.die} size={76} />
          ) : (
            <DiceCube3D idleSpin spinning={pvpDiceSpinning} size={76} />
          )}
          <div className={styles.sheetDiceCaption}>
            {myRoll ? (
              <span className={styles.sheetDiceCaptionText}>
                {ui.play.yourD6TotalWeapon(myRoll.die, myRoll.total)}
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
          {myRoll ? ui.play.youRolled : ui.play.rollPvpDie}
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
        <div className={`${u.textCenter} ${u.o92} ${u.fs15} ${u.lineHeight135}`}>{ui.play.pvpRound(pvpRound)}</div>
        {myTotal !== null && oppTotal !== null && myTotal !== oppTotal ? (
          <div className={`${u.textCenter} ${u.fs15} ${u.fw700} ${u.o95}`}>
            {myTotal > oppTotal ? ui.play.pvpRoundYouWon : ui.play.pvpRoundYouLost}
          </div>
        ) : null}
        {tieRound ? (
          <div className={`${u.textCenter} ${u.fs15} ${u.fw700} ${u.o95}`}>{ui.play.pvpTieRerollHint}</div>
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
                {ui.play.yourD6TotalWeapon(myRoll.die, myRoll.total)}
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
          {myAck ? ui.play.pvpRoundRevealDone : ui.play.pvpRoundRevealContinue}
        </ArcadeButton>
        <div className={`${u.textCenter} ${u.fs12} ${u.o75}`}>
          {myAck
            ? oppAck
              ? ui.play.pvpRoundRevealBothAcked
              : ui.play.pvpRoundRevealWaitOther(opponent?.name ?? "motståndaren")
            : ui.play.pvpRoundRevealTapToContinue}
        </div>
      </div>
    );
    }
  }

  if (pending?.type === "door" && myPending) {
    const monsterScaleNote = ui.play.levelUpMonsterScaleOnDestination(pending.targetLevelIndex);
    const doorPantCost = Number.isFinite(pending.costs?.gold) ? Math.max(0, Math.round(pending.costs.gold)) : 0;
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o9}`}>{ui.play.levelUpPrompt(pending.targetLevelIndex + 1)}</div>
        <div className={`${u.textCenter} ${u.fs14} ${u.o92} ${u.lineHeight145}`}>{ui.play.payPant(doorPantCost)}</div>
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
            {ui.play.payPant(doorPantCost)}
          </ArcadeButton>
          <ArcadeButton
            variant="gray"
            fullWidth
            onClick={() => send({ type: "useDoor", playerId: me.id, method: "stay" })}
          >
            {ui.play.stay}
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
          {ui.play.levelUpNow}
        </ArcadeButton>
        <ArcadeButton
          variant="gray"
          fullWidth
          onClick={() => send({ type: "levelUpDecision", playerId: me.id, choice: "stay" })}
        >
          {ui.play.levelUpStayForTile}
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
        showToast(ui.play.merchantCantAfford);
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
        ? ui.play.merchantItemKindEquipment
        : detail.slot === "gold"
          ? ui.play.merchantItemKindGold
          : ui.play.merchantItemKindConsumable;
      const effectSummary = formatLocalizedShopItemEffectSummary(detail, locale, ui);
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.fs15} ${u.o92}`}>{kindLabel}</div>
          <div className={styles.merchantDetailArtWrap}>
            <MerchantShopItemArt item={detail} variant="detail" />
          </div>
          <div className={`${u.textCenter} ${u.fs18} ${u.fw700}`}>
            {merchantShopItemDisplayName(detail, locale)}
          </div>
          {effectSummary !== "—" ? (
            <div className={`${u.textCenter} ${u.o85}`}>{effectSummary}</div>
          ) : null}
          <div className={u.grid2Equal10}>
            <ArcadeButton variant="gray" fullWidth onClick={() => setMerchantDetailItem(null)}>
              {ui.play.merchantDetailBack}
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
              {ui.play.merchantDetailBuy} ({formatPantAmount(price, locale)})
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
              {ui.play.merchantReplaceBody(
                capitalizeWord(equipmentSlotLabel(merchantReplaceItem.slot, locale)),
                (getEquipmentDisplayByEquippedName(
                  merchantEquippedName(me, merchantReplaceItem.slot),
                  locale,
                )?.name ??
                  merchantEquippedName(me, merchantReplaceItem.slot)) ||
                  "—",
                merchantShopItemDisplayName(merchantReplaceItem, locale),
              )}
            </div>
            {renderEquipmentReplaceEffects(
              merchantReplaceItem.slot,
              me,
              merchantReplaceItem.name,
              ui,
              merchantReplaceItem.id,
              locale,
            )}
            <div className={u.stack8}>
              <ArcadeButton
                variant="pink"
                fullWidth
                onClick={() => {
                  const pr = effectiveMerchantBuyPrice(me, merchantReplaceItem.price);
                  if (!canAffordPant(me, pr)) {
                    showToast(ui.play.merchantCantAfford);
                    return;
                  }
                  playMerchantBuySfx();
                  send({ type: "merchantBuy", playerId: me.id, itemId: merchantReplaceItem.id });
                  setMerchantReplaceItem(null);
                }}
              >
                {ui.play.merchantReplaceConfirm}
              </ArcadeButton>
              <ArcadeButton variant="gray" fullWidth onClick={() => setMerchantReplaceItem(null)}>
                {ui.play.merchantReplaceCancel}
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
            {tileTypeLabel("merchant", locale)}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 6,
              flexShrink: 0,
            }}
            aria-label={formatPantAmount(playerPant(me), locale)}
          >
            <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1, opacity: 0.98 }}>{playerPant(me)}</span>
            <StatIcon kind="pant" size={22} />
          </div>
        </div>
        {interactionPanelCollapsed ? (
          <p className={styles.merchantShopCollapsedHint}>{ui.play.merchantShopCollapsedHint}</p>
        ) : (
          <div className={u.stack10}>
            {pending.items.map((it) => {
              const effectSummary = formatLocalizedShopItemEffectSummary(it, locale, ui);
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
                        <span>
                          {merchantShopItemDisplayName(it, locale)}
                        </span>
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
        <div className={styles.merchantShopFooterActions}>
          <ArcadeButton
            variant="gray"
            fullWidth
            className={styles.merchantShopFooterBtn}
            onClick={() => send({ type: "merchantBuy", playerId: me.id, itemId: null })}
          >
            {ui.play.leave}
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            className={styles.merchantShopFooterBtn}
            aria-label={`${ui.play.merchantReroll} (${formatPantAmount(MERCHANT_REROLL_GOLD_COST, locale)})`}
            disabled={!canAffordPant(me, MERCHANT_REROLL_GOLD_COST)}
            onClick={() => {
              if (!canAffordPant(me, MERCHANT_REROLL_GOLD_COST)) {
                showToast(ui.play.merchantCantAfford);
                return;
              }
              playMerchantBuySfx();
              send({ type: "merchantReroll", playerId: me.id });
            }}
          >
            <span className={styles.merchantRerollLabel} aria-hidden>
              {ui.play.merchantReroll}
              <span className={styles.merchantRerollCost}>
                ({MERCHANT_REROLL_GOLD_COST}
                <StatIcon kind="pant" size={18} />)
              </span>
            </span>
          </ArcadeButton>
        </div>
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
      ? ui.play.pvpLootDealDamageLine(loser.hp, dmgPreview.hpAfter, dmgPreview.blockedByNegateAllOnce)
      : ui.play.pvpDeal2Damage;
    const truncatePvpLootEquipName = (name: string, maxLen = 36): string => {
      const t = name.trim();
      if (t.length <= maxLen) return t;
      const ell = "...";
      return `${t.slice(0, Math.max(0, maxLen - ell.length)).trimEnd()}${ell}`;
    };
    return (
      <div className={u.stack10}>
        <div className={`${u.textCenter} ${u.o9}`}>{ui.play.pvpChooseLoot}</div>
        <div className={u.stack10}>
          <ArcadeButton
            variant="blue"
            fullWidth
            onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: "gold" })}
          >
            {ui.play.pvpLootTakePant(pantSteal)}
          </ArcadeButton>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: "sip" })}
          >
            {ui.play.pvpLootPenaltyKlunk(Math.max(0, penaltyKlunkTotal))}
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
              const rawName =
                getEquipmentDisplayByEquippedName(items[slot]?.name, locale)?.name ??
                (items[slot]?.name ?? slot).trim();
              const shownName = truncatePvpLootEquipName(rawName);
              return (
                <ArcadeButton
                  key={slot}
                  variant="gray"
                  fullWidth
                  title={rawName.length > shownName.length ? rawName : undefined}
                  onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: slot })}
                >
                  {ui.play.pvpLootTakeEquipment(
                    capitalizeWord(equipmentSlotLabel(slot, locale)),
                    shownName,
                  )}
                </ArcadeButton>
              );
            })
          ) : theftProtected ? (
            <div className={`${u.textCenter} ${u.o75} ${u.fs12}`}>{ui.play.pvpLootTheftProtectedHint}</div>
          ) : (
            <div className={`${u.textCenter} ${u.o75} ${u.fs12}`}>{ui.play.noItemsToSteal}</div>
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
          {ui.play.rollDie}
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
              <span>{ui.play.moveChoiceMerchant}</span>
            </span>
          </ArcadeButton>
        ) : null}
      </div>
    );
  }

  return null;
}
