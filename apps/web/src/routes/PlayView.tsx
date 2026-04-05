import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  combatReactionsAllAnswered,
  MONSTERS,
  monsterLossKlunkTotal,
  type ClientAction,
  type CombatLoseSummary,
  type CombatWinSummary,
  type EquipmentSlot,
  type GameState,
  type Pending,
  type Player,
  type ShopItem,
} from "@bv/game-core";
import { isGameState } from "../lib/gameTypes";
import { type ServerMessage } from "../lib/ws";
import { useWsGameClient } from "../lib/useWsGameClient";
import { CombatLoseCard } from "../components/CombatLoseCard";
import { CombatOutcomeThumb } from "../components/CombatOutcomeThumb";
import { CombatWinCard } from "../components/CombatWinCard";
import { MonsterEncounterCard } from "../components/MonsterEncounterCard";
import { ArcadeButton } from "../components/ArcadeButton";
import { DiceCube3D } from "../components/DiceCube3D";
import { StatIcon, type StatIconKind } from "../components/StatIcon";
import { UserMenuIcon } from "../components/UserMenuIcon";
import { WsReconnectOverlay } from "../components/WsReconnectOverlay";
import styles from "./PlayView.module.css";
import activeTurnRainbow from "../styles/activeTurnRainbow.module.css";
import { artImageSrc } from "../lib/cardArt";
import {
  combatLossKlunksForDisplay,
  parseLegacyCombatLoseText,
  parseLegacyCombatWinText,
  resolveCombatLossViewer,
  resolveCombatWinViewer,
} from "../lib/combatUi";
import { sv, wsStatusLabel, capitalizeWord, equipmentSlotSv, tileTypeSv } from "../lib/uiStrings";

function findMe(state: GameState | null, myId: string | null) {
  if (!state || !myId) return null;
  return state.players.find((p) => p.id === myId) ?? null;
}

function isMyPending(pending: Pending | null, me: Player | null) {
  if (!pending || !me) return false;
  if (pending.type === "moveChoice") return pending.playerId === me.id;
  if (pending.type === "card") return pending.playerId === me.id;
  if (pending.type === "merchant") return pending.playerId === me.id;
  if (pending.type === "door") return pending.playerId === me.id;
  if (pending.type === "encounterChoice") return pending.moverId === me.id;
  if (pending.type === "pvp") {
    if (pending.phase === "awaitingRolls") return pending.attackerId === me.id || pending.defenderId === me.id;
    return pending.winnerId === me.id || pending.loserId === me.id;
  }
  return false;
}

type MerchantEquipmentSlot = "weapon" | "armor" | "helmet" | "accessory";

function isShopItemEquipment(it: ShopItem): it is ShopItem & { slot: MerchantEquipmentSlot } {
  const s = it.slot;
  return s === "weapon" || s === "armor" || s === "helmet" || s === "accessory";
}

function merchantSlotOccupied(me: Player, slot: MerchantEquipmentSlot): boolean {
  return !!me.equipment[slot];
}

function merchantEquippedName(me: Player, slot: MerchantEquipmentSlot): string {
  return me.equipment[slot]?.name ?? "";
}

function monsterFromCardId(cardId: string) {
  const m = /^monster:(.+)$/.exec(cardId);
  if (!m) return undefined;
  return MONSTERS.find((x) => x.id === m[1]);
}

type StatFlash = "up" | "down" | null;

/** Rensa flash efter radial + vobble; håll ≥ animationernas längd i PlayView.module.css */
const STAT_FLASH_MS = 1300;

const EQUIP_SLOTS: EquipmentSlot[] = ["weapon", "armor", "helmet", "accessory"];

const emptyEquipFlash = (): Record<EquipmentSlot, StatFlash> => ({
  weapon: null,
  armor: null,
  helmet: null,
  accessory: null,
});

const emptyEquipFlashKey = (): Record<EquipmentSlot, number> => ({
  weapon: 0,
  armor: 0,
  helmet: 0,
  accessory: 0,
});

function lootRadialToneClass(flash: StatFlash): string | null {
  if (flash === "up") return styles.statsRadialPantUp;
  if (flash === "down") return styles.statsRadialHpDown;
  return null;
}

function statsRadialToneClass(icon: StatIconKind, flash: "up" | "down"): string | null {
  const map: Partial<Record<StatIconKind, Record<"up" | "down", string>>> = {
    hp: { up: styles.statsRadialHpUp, down: styles.statsRadialHpDown },
    pant: { up: styles.statsRadialPantUp, down: styles.statsRadialPantDown },
    klunk: { up: styles.statsRadialKlunkUp, down: styles.statsRadialKlunkDown },
  };
  return map[icon]?.[flash] ?? null;
}

/** Samma ton som `EquipIcon` för generiska siluetter (vit + lätt blå glow). */
const MERCHANT_TYPE_ICON_FILTER =
  "brightness(0) invert(0.98) drop-shadow(0 0 6px rgba(96,165,250,0.38))";

export function PlayView() {
  const [sp] = useSearchParams();
  const room = (sp.get("room") ?? "").toUpperCase() || "TEST1";
  const name = sp.get("name") ?? "Bryggare";

  const [state, setState] = useState<GameState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const [equipDetail, setEquipDetail] = useState<{
    slot: "weapon" | "armor" | "helmet" | "accessory";
  } | null>(null);
  const [itemDetail, setItemDetail] = useState<{ instanceId: string } | null>(null);
  const [itemTargetId, setItemTargetId] = useState<string | null>(null);
  const [wantsIntervene, setWantsIntervene] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [rollDiceSpinning, setRollDiceSpinning] = useState(true);
  const [combatDiceSpinning, setCombatDiceSpinning] = useState(true);
  const [pvpDiceSpinning, setPvpDiceSpinning] = useState(true);
  const [sheetFlashGen, setSheetFlashGen] = useState(0);
  const [sheetFlash, setSheetFlash] = useState(false);
  const [merchantReplaceItem, setMerchantReplaceItem] = useState<ShopItem | null>(null);
  const prevPendingRef = useRef<Pending | null>(null);

  const { status, reconnectAttemptN, overlayPhase, clientRef, requestReconnect, showReconnectOverlay } =
    useWsGameClient({
      roomCode: room,
      playerName: name,
      as: "controller",
      connectTimeoutMs: 10_000,
      onMessage: (m: ServerMessage) => {
        if (m.type === "helloAck") setMyId(m.playerId);
        if (m.type === "error") setErr(m.message);
        if (m.type === "state" && isGameState(m.state)) {
          setState(m.state);
          setErr(null);
        }
      },
    });
  useEffect(() => {
    if (status === "connected" || status === "connecting") setErr(null);
  }, [status]);

  const me = findMe(state, myId);

  const prevHpRef = useRef<number | undefined>(undefined);
  const prevGoldRef = useRef<number | undefined>(undefined);
  const prevKlunkRef = useRef<number | undefined>(undefined);
  const pendingStatFlashRef = useRef<{ hp: StatFlash; pant: StatFlash; klunk: StatFlash }>({
    hp: null,
    pant: null,
    klunk: null,
  });
  const [hpFlash, setHpFlash] = useState<StatFlash>(null);
  const [pantFlash, setPantFlash] = useState<StatFlash>(null);
  const [klunkFlash, setKlunkFlash] = useState<StatFlash>(null);
  const [hpFlashKey, setHpFlashKey] = useState(0);
  const [pantFlashKey, setPantFlashKey] = useState(0);
  const [klunkFlashKey, setKlunkFlashKey] = useState(0);

  const prevEquipNamesRef = useRef<Partial<Record<EquipmentSlot, string>>>({});
  const prevInvCountsRef = useRef<Record<string, number>>({});
  const lootPrimedRef = useRef(false);
  const pendingLootFlashRef = useRef<{
    equip: Partial<Record<EquipmentSlot, true>>;
    items: Record<string, true>;
  }>({ equip: {}, items: {} });

  const [equipFlash, setEquipFlash] = useState<Record<EquipmentSlot, StatFlash>>(() => emptyEquipFlash());
  const [equipFlashKey, setEquipFlashKey] = useState<Record<EquipmentSlot, number>>(() => emptyEquipFlashKey());
  const [itemFlash, setItemFlash] = useState<Record<string, StatFlash>>({});
  const [itemFlashKey, setItemFlashKey] = useState<Record<string, number>>({});

  useEffect(() => {
    prevHpRef.current = undefined;
    prevGoldRef.current = undefined;
    prevKlunkRef.current = undefined;
    setHpFlash(null);
    setPantFlash(null);
    setKlunkFlash(null);
    pendingStatFlashRef.current = { hp: null, pant: null, klunk: null };
    prevEquipNamesRef.current = {};
    prevInvCountsRef.current = {};
    lootPrimedRef.current = false;
    pendingLootFlashRef.current = { equip: {}, items: {} };
    setEquipFlash(emptyEquipFlash());
    setEquipFlashKey(emptyEquipFlashKey());
    setItemFlash({});
    setItemFlashKey({});
  }, [myId]);

  const groupedInventoryEntries = useMemo(() => {
    if (!me) return [] as [string, { count: number; firstInstanceId: string }][];
    return Object.entries(
      (me.inventory ?? []).reduce((acc, it) => {
        const k = String(it.itemId);
        const cur = acc[k];
        if (!cur) acc[k] = { count: 1, firstInstanceId: it.instanceId };
        else cur.count += 1;
        return acc;
      }, {} as Record<string, { count: number; firstInstanceId: string }>),
    );
  }, [me]);
  const activeId = state?.turnOrder?.[state.currentTurnIndex ?? 0] ?? null;
  const isMyTurn = me && activeId === me.id && state?.phase === "playing";
  const showHeaderStatsBar = Boolean(state && me && state.phase !== "lobby");
  const pending = state?.pending ?? null;
  const onRollDieScreen = !!isMyTurn && !pending;
  useEffect(() => {
    if (onRollDieScreen) return;
    setRollDiceSpinning(true);
  }, [onRollDieScreen]);

  const combatAttackerSheet =
    !!me &&
    pending?.type === "combat" &&
    pending.phase === "reactions" &&
    pending.attackerId === me.id;
  useEffect(() => {
    if (combatAttackerSheet) return;
    setCombatDiceSpinning(true);
  }, [combatAttackerSheet]);

  const pvpRollSheet =
    !!me &&
    pending?.type === "pvp" &&
    pending.phase === "awaitingRolls" &&
    (pending.attackerId === me.id || pending.defenderId === me.id);
  const myPvpRoll =
    me && pending?.type === "pvp" && pending.phase === "awaitingRolls" ? pending.rolls?.[me.id] : undefined;
  const pvpRound = pending?.type === "pvp" && pending.phase === "awaitingRolls" ? pending.pvpRound ?? 1 : 1;
  useEffect(() => {
    if (!pvpRollSheet) {
      setPvpDiceSpinning(true);
      return;
    }
    // On tie rerolls, your previous roll is cleared while panel stays open.
    if (!myPvpRoll) setPvpDiceSpinning(true);
  }, [pvpRollSheet, myPvpRoll, pvpRound]);

  useEffect(() => {
    if (!(pending?.type === "combat" && pending.phase === "reactions" && (pending.reactionsDeadlineAt ?? 0) > 0)) {
      return;
    }
    const t = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [pending]);

  useEffect(() => {
    const prev = prevPendingRef.current;
    if (me) {
      const now = pending?.type === "moveChoice" && pending.playerId === me.id;
      const was = prev?.type === "moveChoice" && prev.playerId === me.id;
      if (now && !was) setSheetFlashGen((g) => g + 1);
    }
    prevPendingRef.current = pending;
  }, [pending, me]);

  useEffect(() => {
    if (sheetFlashGen < 1) return;
    setSheetFlash(true);
    const t = window.setTimeout(() => setSheetFlash(false), 980);
    return () => clearTimeout(t);
  }, [sheetFlashGen]);

  useEffect(() => {
    if (pending?.type !== "merchant") setMerchantReplaceItem(null);
  }, [pending?.type]);

  const myPending = isMyPending(pending, me);
  const readyCount = state?.players?.filter((p) => p.ready).length ?? 0;
  const totalPlayers = state?.players?.length ?? 0;
  const canStart =
    !!me?.isHost && state?.phase === "lobby" && totalPlayers >= 2 && readyCount === totalPlayers;
  const highlightPulse = !!isMyTurn || state?.phase === "lobby" || !!canStart;
  const inCombat = pending?.type === "combat";
  const inCombatReactions = inCombat && pending.phase === "reactions";
  const isItemPlayableNow = (target: "self" | "other" | "combat") => {
    if (isMyTurn) return target !== "combat" || inCombat;
    if (inCombatReactions) return target === "combat";
    return false;
  };
  const itemCardTone = (target: "self" | "other" | "combat") => {
    const playable = isItemPlayableNow(target);
    if (playable && target === "combat") {
      return {
        border: "2px solid rgba(96,165,250,0.95)",
        background: "rgba(37,99,235,0.13)",
        boxShadow: "0 8px 16px rgba(0,0,0,0.28), 0 0 0 1px rgba(96,165,250,0.45) inset",
      };
    }
    if (playable) {
      return {
        border: "2px solid rgba(74,222,128,0.9)",
        background: "rgba(21,128,61,0.13)",
        boxShadow: "0 8px 16px rgba(0,0,0,0.28), 0 0 0 1px rgba(74,222,128,0.35) inset",
      };
    }
    return {
      border: "2px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.04)",
      boxShadow: "0 8px 16px rgba(0,0,0,0.28)",
    };
  };

  const mySipNotice = useMemo(() => {
    if (!me || !state || state.phase !== "playing") return null;
    const list = state.sipNotices ?? [];
    return list.find((n) => n.recipientId === me.id) ?? null;
  }, [state?.sipNotices, state?.phase, me?.id]);
  const hasBlockingSipNotice = !!mySipNotice;

  const send = (action: ClientAction) => {
    if (status !== "connected") {
      setErr(sv.play.notConnected);
      // eslint-disable-next-line no-console
      console.log("[play] blocked send; ws status:", status, action);
      return;
    }
    setErr(null);
    // eslint-disable-next-line no-console
    console.log("[play] send action", action);
    clientRef.current?.send({ type: "action", action });
  };

  const interaction = (() => {
    if (!state || !me) return null;
    if (state.phase === "lobby") {
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ textAlign: "center", opacity: 0.9 }}>
            {sv.play.lobbySheet(readyCount, totalPlayers)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: me.isHost ? "1fr 1fr" : "1fr",
              gap: 10,
              justifyItems: "center",
            }}
          >
            <ArcadeButton
              variant={me.ready ? "gray" : "blue"}
              fullWidth={me.isHost}
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
            <div style={{ textAlign: "center", opacity: 0.75, fontSize: 12 }}>
              {me.isHost ? sv.play.hostNeedPlayers : sv.play.waitHostStart}
            </div>
          )}
        </div>
      );
    }
    if (state.phase !== "playing") return null;
    if (pending?.type === "card" && myPending) return null; // handled as modal

    if (pending?.type === "combat" && pending.phase === "chooseTeammate") {
      const isAttacker = pending.attackerId === me.id;
      const attacker = state.players.find((p) => p.id === pending.attackerId);
      const options = state.players.filter((p) => p.id !== pending.attackerId);
      if (isAttacker) {
        return (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ textAlign: "center", opacity: 0.95 }}>{sv.play.chooseTeammate}</div>
            <div style={{ textAlign: "center", opacity: 0.78, fontSize: 13 }}>{sv.play.teammateMustFight}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {options.map((p) => (
                <ArcadeButton
                  key={p.id}
                  variant="blue"
                  fullWidth
                  onClick={() => send({ type: "chooseCombatTeammate", playerId: me.id, teammateId: p.id })}
                >
                  {p.name}
                </ArcadeButton>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div style={{ textAlign: "center", opacity: 0.85 }}>
          {sv.play.waitAttackerChooseTeammate(attacker?.name ?? capitalizeWord(sv.play.theAttacker))}
        </div>
      );
    }

    if (pending?.type === "combat" && pending.phase === "enemyIntro") {
      const isAttacker = pending.attackerId === me.id;
      const attacker = state.players.find((p) => p.id === pending.attackerId);
      const teammate = pending.assistId ? state.players.find((p) => p.id === pending.assistId) : null;
      const hasEnemyCard = pending.monsterId !== "boss";
      if (isAttacker) {
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {teammate ? <div style={{ textAlign: "center", opacity: 0.86 }}>{sv.play.teammatePicked(teammate.name)}</div> : null}
            {hasEnemyCard ? (
              <MonsterEncounterCard
                title={pending.enemyName}
                artKey={pending.enemyArtKey}
                combatStrength={pending.need + (pending.needMod ?? 0)}
                winGold={pending.rewardGold ?? 0}
                winItems={pending.rewardItems ?? 0}
                lossDamage={pending.baseDamage}
                lossKlunks={combatLossKlunksForDisplay(pending)}
                specialRules={pending.enemyIntroText?.trim() || undefined}
              />
            ) : (
              <div style={{ textAlign: "center", opacity: 0.9, padding: "8px 0" }}>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{pending.enemyName}</div>
                <div>
                  {sv.play.strength}: <b>{pending.need + (pending.needMod ?? 0)}</b>
                </div>
              </div>
            )}
            <ArcadeButton variant="pink" fullWidth onClick={() => send({ type: "combatIntroAck", playerId: me.id })}>
              {sv.play.continue}
            </ArcadeButton>
          </div>
        );
      }
      return (
        <div style={{ textAlign: "center", opacity: 0.85 }}>
          {sv.play.attackerViewingEncounter(attacker?.name ?? capitalizeWord(sv.play.theAttacker))}
        </div>
      );
    }

    if (pending?.type === "combat" && pending.phase === "rollPreview") {
      const isAttacker = pending.attackerId === me.id;
      const attacker = state.players.find((p) => p.id === pending.attackerId);
      const die = pending.previewDie ?? 1;
      const total = pending.previewTotal ?? 0;
      const need = pending.previewNeed ?? 0;
      const broDie = pending.previewBroDie;
      const baseDiceTotal = die + (broDie ?? 0);
      const bonus = total - baseDiceTotal;
      const bonusText = bonus === 0 ? "" : bonus > 0 ? ` (+${bonus})` : ` (${bonus})`;
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div className={styles.sheetDiceBlock}>
            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <DiceCube3D value={die} size={76} oneAsMonsterIcon />
              {broDie != null ? <DiceCube3D value={broDie} size={76} oneAsMonsterIcon /> : null}
            </div>
            <div className={styles.sheetDiceCaption}>
              <span className={styles.sheetDiceCaptionText}>
                {`Attack totalt ${total}${bonusText} mot styrka ${need}`}
              </span>
            </div>
          </div>
          {isAttacker ? (
            <ArcadeButton variant="pink" fullWidth onClick={() => send({ type: "combatRollAck", playerId: me.id })}>
              {sv.play.continue}
            </ArcadeButton>
          ) : (
            <div style={{ textAlign: "center", opacity: 0.85 }}>
              {sv.play.waitAttackerContinue(attacker?.name ?? sv.play.theAttacker)}
            </div>
          )}
        </div>
      );
    }

    if (pending?.type === "combat" && pending.phase === "chooseHitMitigation") {
      const isAttacker = pending.attackerId === me.id;
      const attacker = state.players.find((p) => p.id === pending.attackerId);
      const die = pending.previewDie ?? 1;
      const total = pending.previewTotal ?? 0;
      const need = pending.previewNeed ?? 0;
      const broDie = pending.previewBroDie;
      const reduce = pending.monsterId === "brewizard" ? 3 : 2;
      const full = pending.monsterId === "brewizard" ? 5 : 4;
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div className={styles.sheetDiceBlock}>
            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <DiceCube3D value={die} size={76} oneAsMonsterIcon />
              {broDie != null ? <DiceCube3D value={broDie} size={76} oneAsMonsterIcon /> : null}
            </div>
            <div className={styles.sheetDiceCaption}>
              <span className={styles.sheetDiceCaptionText}>
                {sv.play.youLostTotal(total, need)}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "center", opacity: 0.9, fontSize: 14, lineHeight: 1.45 }}>
            {sv.play.hitChoiceIntro(pending.enemyName)}
            <br />
            <span style={{ opacity: 0.88 }}>{sv.play.hitChoiceDetail(reduce, full)}</span>
          </div>
          {isAttacker ? (
            <div style={{ display: "grid", gap: 8 }}>
              <ArcadeButton
                variant="pink"
                fullWidth
                onClick={() => send({ type: "chooseCombatHitMitigation", playerId: me.id, choice: "sip" })}
              >
                {sv.play.takeSipReduce(reduce)}
              </ArcadeButton>
              <ArcadeButton
                variant="gray"
                fullWidth
                onClick={() => send({ type: "chooseCombatHitMitigation", playerId: me.id, choice: "no_sip" })}
              >
                {sv.play.fullDamageNoSip(full)}
              </ArcadeButton>
            </div>
          ) : (
            <div style={{ textAlign: "center", opacity: 0.85 }}>
              {sv.play.waitAttackerChoose(attacker?.name ?? sv.play.theAttacker)}
            </div>
          )}
        </div>
      );
    }

    if (pending?.type === "combat" && pending.phase === "reactions") {
      const isAttacker = pending.attackerId === me.id;
      const isTeamMate = !!pending.teamBattleRequired && pending.assistId === me.id;
      const isTeamFighter = isAttacker || isTeamMate;
      const hasAnyReaction = (me.inventory ?? []).some((it) =>
        [
          "weak_beer",
          "light_beer",
          "folk_beer",
          "tripwire",
          "double_hops",
          "beer_bomb",
          "hangover",
          "monster_hype",
          "yeast_sabotage",
          "beer_bro",
        ].includes(String(it.itemId)),
      );
      const attacker = state.players.find((p) => p.id === pending.attackerId) ?? null;
      const teammate = pending.assistId ? state.players.find((p) => p.id === pending.assistId) ?? null : null;
      const mod = pending.attackMods?.[pending.attackerId] ?? 0;
      const isEligibleReactor = pending.reactors?.includes(me.id) ?? false;
      const hasPassed = pending.reacted?.[me.id] === "pass";
      const everyoneDone = combatReactionsAllAnswered(pending.reactors ?? [], pending.reacted);
      const deadlineAt = pending.reactionsDeadlineAt ?? 0;
      const secondsLeft = deadlineAt > 0 ? Math.max(0, Math.ceil((deadlineAt - nowTick) / 1000)) : 0;
      const reactionOpen = deadlineAt <= 0 || secondsLeft > 0;
      const myTeamRoll = pending.teamRolls?.[me.id];
      const attackerRoll = pending.teamRolls?.[pending.attackerId];
      const teammateRoll = pending.assistId ? pending.teamRolls?.[pending.assistId] : undefined;
      const bothTeamRolled = !!attackerRoll && (!!teammateRoll || !pending.teamBattleRequired);

      if (isTeamFighter) {
        return (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ textAlign: "center", opacity: 0.9 }}>
              Strid — {pending.enemyName} (styrka <b>{pending.need + (pending.needMod ?? 0)}</b>)
            </div>
            {pending.teamBattleRequired && teammate ? (
              <div style={{ textAlign: "center", opacity: 0.82, fontSize: 12 }}>
                Team battle: {attacker?.name ?? "—"} {attackerRoll ? "har slagit" : "har inte slagit"} ·{" "}
                {teammate.name} {teammateRoll ? "har slagit" : "har inte slagit"}
              </div>
            ) : null}
            {mod !== 0 && (
              <div style={{ textAlign: "center", opacity: 0.85, fontSize: 12 }}>
                {sv.play.attackModifier(mod)}
              </div>
            )}
            <div className={styles.sheetDiceBlock}>
              {myTeamRoll ? (
                <>
                  <DiceCube3D value={myTeamRoll.die} size={76} oneAsMonsterIcon />
                  <div className={styles.sheetDiceCaption}>
                    <span className={styles.sheetDiceCaptionText}>
                      {sv.play.yourD6TotalWeapon(myTeamRoll.die, myTeamRoll.total)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <DiceCube3D idleSpin spinning={!everyoneDone || combatDiceSpinning} size={76} />
                  <div className={styles.sheetDiceCaption} aria-hidden />
                </>
              )}
            </div>
            {(pending.reactors?.length ?? 0) > 0 && !everyoneDone && reactionOpen ? (
              <div style={{ textAlign: "center", opacity: 0.85 }}>
                {sv.play.waitIntervene}
                {deadlineAt > 0 ? ` (${secondsLeft}s)` : ""}
              </div>
            ) : pending.teamBattleRequired && !bothTeamRolled && myTeamRoll ? (
              <div style={{ textAlign: "center", opacity: 0.82 }}>
                {teammate ? sv.play.waitTeammateCombatRoll(teammate.name) : sv.play.waitTeamSecondRoll}
              </div>
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

      if (isEligibleReactor && hasAnyReaction && attacker) {
        if (!reactionOpen) {
          return <div style={{ textAlign: "center", opacity: 0.75 }}>Reaktionsfönstret har stängt.</div>;
        }
        if (wantsIntervene) {
          return (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ textAlign: "center", opacity: 0.9 }}>{sv.play.intervenePickCard}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {(me.inventory ?? [])
                  .filter((it) =>
                    [
                      "weak_beer",
                      "light_beer",
                      "folk_beer",
                      "tripwire",
                      "double_hops",
                      "beer_bomb",
                      "hangover",
                      "monster_hype",
                      "yeast_sabotage",
                      "beer_bro",
                    ].includes(String(it.itemId)),
                  )
                  .map((it) => (
                    <ArcadeButton
                      key={it.instanceId}
                      variant="blue"
                      fullWidth
                      onClick={() => {
                        const id = String(it.itemId);
                        const targetPlayerId =
                          [
                            "weak_beer",
                            "light_beer",
                            "folk_beer",
                            "tripwire",
                            "double_hops",
                            "beer_bomb",
                            "hangover",
                          ].includes(id)
                            ? attacker.id
                            : undefined;
                        send({ type: "useItem", playerId: me.id, instanceId: it.instanceId, targetPlayerId });
                        setWantsIntervene(false);
                      }}
                    >
                      {itemTitle(it.itemId)}
                      {String(it.itemId) === "weak_beer" ? sv.play.itemSuffixWeakBeer : ""}
                      {String(it.itemId) === "light_beer" ? sv.play.itemSuffixLightBeer : ""}
                      {String(it.itemId) === "folk_beer" ? sv.play.itemSuffixFolkBeer : ""}
                      {String(it.itemId) === "tripwire" ? sv.play.itemSuffixTripwire : ""}
                      {String(it.itemId) === "double_hops" ? sv.play.itemSuffixDoubleHops : ""}
                      {String(it.itemId) === "beer_bomb" ? sv.play.itemSuffixBeerBomb : ""}
                      {String(it.itemId) === "hangover" ? sv.play.itemSuffixHangover : ""}
                      {String(it.itemId) === "monster_hype" ? sv.play.itemSuffixMonsterHype : ""}
                      {String(it.itemId) === "yeast_sabotage" ? sv.play.itemSuffixYeast : ""}
                      {String(it.itemId) === "beer_bro" ? sv.play.itemSuffixBeerBro : ""}
                    </ArcadeButton>
                  ))}
              </div>
              <ArcadeButton variant="gray" fullWidth onClick={() => setWantsIntervene(false)}>
                {sv.play.back}
              </ArcadeButton>
            </div>
          );
        }
        if (hasPassed) {
          return (
            <div style={{ textAlign: "center", opacity: 0.78 }}>
              Du har redan valt. Väntar på att striden fortsätter…
            </div>
          );
        }
        return (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ textAlign: "center", opacity: 0.9 }}>{sv.play.inCombat(attacker.name)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
      const bonus = hasBaseDie ? pending.die - pending.baseDie : 0;
      const diceFaceValue = hasBaseDie ? pending.baseDie : pending.die;
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div className={styles.sheetDiceBlock}>
            <DiceCube3D value={diceFaceValue} size={76} />
            <div className={styles.sheetDiceCaption}>
              {bonus > 0 && hasBaseDie ? (
                <span className={styles.sheetDiceCaptionText}>
                  {sv.play.rolledBonus(pending.baseDie!, bonus, pending.die)}
                </span>
              ) : (
                <span className={styles.sheetDiceCaptionText}>
                  {sv.play.rolledSteps(pending.die)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {pending.options.map((o) => (
              <ArcadeButton
                key={o.dir}
                variant="blue"
                fullWidth
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
            ))}
          </div>
        </div>
      );
    }

    if (pending?.type === "encounterChoice" && pending.moverId === me.id) {
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ textAlign: "center", opacity: 0.9 }}>{sv.play.encounterChoose}</div>
          <div style={{ display: "grid", gap: 10 }}>
            <ArcadeButton
              variant="pink"
              fullWidth
              onClick={() => send({ type: "chooseEncounter", playerId: me.id, choice: "pvp" })}
            >
              {sv.play.pvpBothRoll}
            </ArcadeButton>
            <ArcadeButton
              variant="blue"
              fullWidth
              onClick={() => send({ type: "chooseEncounter", playerId: me.id, choice: "tile" })}
            >
              {sv.play.resolveTileNoPvp}
            </ArcadeButton>
          </div>
        </div>
      );
    }

    if (pending?.type === "pvp" && pending.phase === "awaitingRolls") {
      const isParticipant = pending.attackerId === me.id || pending.defenderId === me.id;
      if (!isParticipant) return null;
      const myRoll = pending.rolls?.[me.id];
      const round = pending.pvpRound ?? 1;
      return (
        <div style={{ display: "grid", gap: 10 }}>
          {round > 1 ? (
            <>
              <div style={{ textAlign: "center", fontWeight: 800, color: "#fef08a" }}>{sv.play.pvpRound(round)}</div>
              <div style={{ textAlign: "center", fontSize: 13, opacity: 0.82 }}>{sv.play.pvpTieRerollHint}</div>
            </>
          ) : null}
          <div style={{ textAlign: "center", opacity: 0.9 }}>{sv.play.pvpRollDie}</div>
          <div className={styles.sheetDiceBlock}>
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

    if (pending?.type === "door" && myPending) {
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ textAlign: "center", opacity: 0.9 }}>
            Dörr — gå till nivå <b>{pending.targetLevelIndex + 1}</b>?
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <ArcadeButton
              variant="blue"
              fullWidth
              onClick={() => send({ type: "useDoor", playerId: me.id, method: "gold" })}
              disabled={me.gold < pending.costs.gold}
            >
              {sv.play.payPant(pending.costs.gold)}
            </ArcadeButton>
            <ArcadeButton
              variant="pink"
              fullWidth
              onClick={() => send({ type: "useDoor", playerId: me.id, method: "sips" })}
              disabled={me.klunkar < pending.costs.sips}
            >
              {sv.play.haveKlunkar(pending.costs.sips)}
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

    if (pending?.type === "merchant" && myPending) {
      const effectLabel = (it: ShopItem): string | null => {
        const m = sv.play.merchantEffect;
        if (it.slot === "weapon") return sv.play.powerPlus(it.power ?? 1);
        if (it.slot === "armor") {
          const parts: string[] = [];
          if (it.negateAllOnce) parts.push(m.negateAllOnce);
          if (typeof it.damageNegate === "number") parts.push(m.dmg(it.damageNegate));
          if (typeof it.bonusHp === "number" && it.bonusHp > 0) parts.push(sv.play.bonusHp(it.bonusHp));
          return parts.length ? parts.join(" · ") : null;
        }
        if (it.slot === "helmet") {
          const parts: string[] = [];
          if (typeof it.damageNegate === "number") parts.push(m.dmg(it.damageNegate));
          return parts.length ? parts.join(" · ") : m.combatPlus;
        }
        if (it.slot === "accessory") {
          const parts: string[] = [];
          if (typeof it.damageNegate === "number") parts.push(m.dmg(it.damageNegate));
          if (typeof it.moveBonus === "number") parts.push(sv.play.moveSteps(it.moveBonus));
          return parts.length ? parts.join(" · ") : null;
        }
        if (it.slot === "heal") return m.healHp(it.healAmount ?? 4);
        return null;
      };
      const requestMerchantBuy = (it: ShopItem) => {
        if (me.gold < it.price) {
          setErr(sv.play.merchantCantAfford);
          return;
        }
        if (isShopItemEquipment(it) && merchantSlotOccupied(me, it.slot)) {
          setMerchantReplaceItem(it);
          return;
        }
        send({ type: "merchantBuy", playerId: me.id, itemId: it.id });
      };
      return (
        <div style={{ display: "grid", gap: 10, position: "relative" }}>
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
              <div style={{ fontSize: 15, lineHeight: 1.45, textAlign: "center", color: "#ffffff" }}>
                {sv.play.merchantReplaceBody(
                  capitalizeWord(equipmentSlotSv(merchantReplaceItem.slot)),
                  merchantEquippedName(me, merchantReplaceItem.slot),
                  merchantReplaceItem.name,
                )}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <ArcadeButton
                  variant="pink"
                  fullWidth
                  onClick={() => {
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              width: "100%",
            }}
          >
            <div
              style={{
                fontFamily: "var(--heading)",
                fontWeight: 400,
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
              aria-label={`${me.gold} pant`}
            >
              <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1, opacity: 0.98 }}>{me.gold}</span>
              <StatIcon kind="pant" size={22} />
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {pending.items.slice(0, 4).map((it) => (
              <ArcadeButton
                key={it.id}
                onClick={() => requestMerchantBuy(it)}
                variant="blue"
                fullWidth
                disabled={me.gold < it.price}
              >
                <span
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr) auto",
                    alignItems: "center",
                    width: "100%",
                    gap: 12,
                  }}
                >
                  <MerchantShopItemArt item={it} />
                  <div style={{ display: "grid", gap: 6, justifyItems: "start", textAlign: "left", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
                        {it.slot === "gold" ? (
                          <StatIcon kind="pant" size={MERCHANT_TYPE_ICON_PX} />
                        ) : (
                          <MerchantShopTypeIcon item={it} />
                        )}
                      </span>
                      <span>{it.name}</span>
                    </div>
                    {effectLabel(it) ? (
                      <span style={{ opacity: 0.82, fontSize: 12, fontWeight: 800 }}>{effectLabel(it)}</span>
                    ) : null}
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 5,
                      flexShrink: 0,
                      alignSelf: "start",
                    }}
                  >
                    <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1, opacity: 0.98 }}>{it.price}</span>
                    <StatIcon kind="pant" size={20} />
                  </span>
                </span>
              </ArcadeButton>
            ))}
            <ArcadeButton
              variant="gray"
              fullWidth
              onClick={() => send({ type: "merchantBuy", playerId: me.id, itemId: null })}
            >
              {sv.play.leave}
            </ArcadeButton>
          </div>
        </div>
      );
    }

    if (pending?.type === "pvp" && pending.phase === "chooseLoot" && pending.winnerId === me.id) {
      const loser = state.players.find((p) => p.id === pending.loserId);
      const items = loser?.equipment ?? {};
      const availableSlots = (["weapon", "armor", "helmet", "accessory"] as const).filter((slot) => !!items[slot]);
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ textAlign: "center", opacity: 0.9 }}>{sv.play.pvpChooseLoot}</div>
          <div style={{ display: "grid", gap: 10 }}>
            <ArcadeButton
              variant="blue"
              fullWidth
              onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: "gold" })}
            >
              {sv.play.takePantMax5}
            </ArcadeButton>
            <ArcadeButton
              variant="pink"
              fullWidth
              onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: "sip" })}
            >
              {sv.play.givePenaltyKlunk}
            </ArcadeButton>
            {availableSlots.length > 0 ? (
              availableSlots.map((slot) => (
                <ArcadeButton
                  key={slot}
                  variant="gray"
                  fullWidth
                  onClick={() => send({ type: "pvpLootChoice", playerId: me.id, choice: slot })}
                >
                  {sv.play.takeSlot(capitalizeWord(equipmentSlotSv(slot)))}
                </ArcadeButton>
              ))
            ) : (
              <div style={{ textAlign: "center", opacity: 0.75, fontSize: 12 }}>{sv.play.noItemsToSteal}</div>
            )}
          </div>
        </div>
      );
    }

    if (isMyTurn && !pending) {
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div className={styles.sheetDiceBlock}>
            <DiceCube3D idleSpin spinning={rollDiceSpinning} size={76} />
            <div className={styles.sheetDiceCaption} aria-hidden />
          </div>
          <ArcadeButton
            variant="pink"
            fullWidth
            onClick={() => {
              setRollDiceSpinning(false);
              send({ type: "rollMove", playerId: me.id });
            }}
          >
            {sv.play.rollDie}
          </ArcadeButton>
        </div>
      );
    }

    return null;
  })();

  /** Fullskärmsmodal, straffklunk eller nedersta sheet (strid/handlare/tärning …) — stat-animation under ska vänta tills detta är borta. */
  const blocksStatFlashOverlay =
    !!me &&
    state?.phase === "playing" &&
    (!!hasBlockingSipNotice ||
      !!(myPending && pending?.type === "card") ||
      !!interaction);

  useEffect(() => {
    const self = findMe(state, myId);
    if (!self) {
      prevHpRef.current = undefined;
      return;
    }
    const prev = prevHpRef.current;
    const next = self.hp;
    prevHpRef.current = next;
    if (prev === undefined) return;
    if (prev === next) return;
    const dir: StatFlash = next < prev ? "down" : "up";
    if (blocksStatFlashOverlay) {
      pendingStatFlashRef.current.hp = dir;
      return;
    }
    pendingStatFlashRef.current.hp = null;
    setHpFlash(dir);
    setHpFlashKey((k) => k + 1);
    const t = window.setTimeout(() => setHpFlash(null), STAT_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [state, myId, blocksStatFlashOverlay]);

  useEffect(() => {
    const self = findMe(state, myId);
    if (!self) {
      prevGoldRef.current = undefined;
      return;
    }
    const prev = prevGoldRef.current;
    const next = self.gold;
    prevGoldRef.current = next;
    if (prev === undefined) return;
    if (prev === next) return;
    const dir: StatFlash = next < prev ? "down" : "up";
    if (blocksStatFlashOverlay) {
      pendingStatFlashRef.current.pant = dir;
      return;
    }
    pendingStatFlashRef.current.pant = null;
    setPantFlash(dir);
    setPantFlashKey((k) => k + 1);
    const t = window.setTimeout(() => setPantFlash(null), STAT_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [state, myId, blocksStatFlashOverlay]);

  useEffect(() => {
    const self = findMe(state, myId);
    if (!self) {
      prevKlunkRef.current = undefined;
      return;
    }
    const prev = prevKlunkRef.current;
    const next = self.klunkar;
    prevKlunkRef.current = next;
    if (prev === undefined) return;
    if (prev === next) return;
    const dir: StatFlash = next < prev ? "down" : "up";
    if (blocksStatFlashOverlay) {
      pendingStatFlashRef.current.klunk = dir;
      return;
    }
    pendingStatFlashRef.current.klunk = null;
    setKlunkFlash(dir);
    setKlunkFlashKey((k) => k + 1);
    const t = window.setTimeout(() => setKlunkFlash(null), STAT_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [state, myId, blocksStatFlashOverlay]);

  useEffect(() => {
    const self = findMe(state, myId);
    if (!self) {
      prevEquipNamesRef.current = {};
      prevInvCountsRef.current = {};
      lootPrimedRef.current = false;
      return;
    }

    const counts: Record<string, number> = {};
    for (const it of self.inventory ?? []) {
      const k = String(it.itemId);
      counts[k] = (counts[k] ?? 0) + 1;
    }

    if (!lootPrimedRef.current) {
      lootPrimedRef.current = true;
      for (const slot of EQUIP_SLOTS) {
        prevEquipNamesRef.current[slot] = self.equipment[slot]?.name ?? "";
      }
      prevInvCountsRef.current = { ...counts };
      return;
    }

    const timers: ReturnType<typeof window.setTimeout>[] = [];

    const flashEquipUp = (slot: EquipmentSlot) => {
      if (blocksStatFlashOverlay) {
        pendingLootFlashRef.current.equip[slot] = true;
        return;
      }
      delete pendingLootFlashRef.current.equip[slot];
      setEquipFlash((e) => ({ ...e, [slot]: "up" }));
      setEquipFlashKey((e) => ({ ...e, [slot]: (e[slot] ?? 0) + 1 }));
      timers.push(
        window.setTimeout(() => setEquipFlash((e) => ({ ...e, [slot]: null })), STAT_FLASH_MS),
      );
    };

    const flashItemUp = (itemId: string) => {
      if (blocksStatFlashOverlay) {
        pendingLootFlashRef.current.items[itemId] = true;
        return;
      }
      delete pendingLootFlashRef.current.items[itemId];
      setItemFlash((m) => ({ ...m, [itemId]: "up" }));
      setItemFlashKey((m) => ({ ...m, [itemId]: (m[itemId] ?? 0) + 1 }));
      timers.push(
        window.setTimeout(() => {
          setItemFlash((m) => {
            const n = { ...m };
            delete n[itemId];
            return n;
          });
        }, STAT_FLASH_MS),
      );
    };

    for (const slot of EQUIP_SLOTS) {
      const name = self.equipment[slot]?.name ?? "";
      const prevName = prevEquipNamesRef.current[slot] ?? "";
      if (name === prevName) continue;
      prevEquipNamesRef.current[slot] = name;
      if (name) flashEquipUp(slot);
    }

    for (const [itemId, n] of Object.entries(counts)) {
      const p = prevInvCountsRef.current[itemId] ?? 0;
      if (n > p) flashItemUp(itemId);
    }
    prevInvCountsRef.current = { ...counts };

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [state, myId, blocksStatFlashOverlay]);

  useEffect(() => {
    if (blocksStatFlashOverlay) return;
    const q = pendingStatFlashRef.current;
    const timers: ReturnType<typeof window.setTimeout>[] = [];
    if (q.hp) {
      const d = q.hp;
      q.hp = null;
      setHpFlash(d);
      setHpFlashKey((k) => k + 1);
      timers.push(window.setTimeout(() => setHpFlash(null), STAT_FLASH_MS));
    }
    if (q.pant) {
      const d = q.pant;
      q.pant = null;
      setPantFlash(d);
      setPantFlashKey((k) => k + 1);
      timers.push(window.setTimeout(() => setPantFlash(null), STAT_FLASH_MS));
    }
    if (q.klunk) {
      const d = q.klunk;
      q.klunk = null;
      setKlunkFlash(d);
      setKlunkFlashKey((k) => k + 1);
      timers.push(window.setTimeout(() => setKlunkFlash(null), STAT_FLASH_MS));
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [blocksStatFlashOverlay]);

  useEffect(() => {
    if (blocksStatFlashOverlay) return;
    const q = pendingLootFlashRef.current;
    const timers: ReturnType<typeof window.setTimeout>[] = [];
    for (const slot of EQUIP_SLOTS) {
      if (!q.equip[slot]) continue;
      delete q.equip[slot];
      setEquipFlash((e) => ({ ...e, [slot]: "up" }));
      setEquipFlashKey((e) => ({ ...e, [slot]: (e[slot] ?? 0) + 1 }));
      timers.push(
        window.setTimeout(() => setEquipFlash((e) => ({ ...e, [slot]: null })), STAT_FLASH_MS),
      );
    }
    const pendingItemIds = Object.keys(q.items);
    for (const itemId of pendingItemIds) {
      if (!q.items[itemId]) continue;
      delete q.items[itemId];
      setItemFlash((m) => ({ ...m, [itemId]: "up" }));
      setItemFlashKey((m) => ({ ...m, [itemId]: (m[itemId] ?? 0) + 1 }));
      timers.push(
        window.setTimeout(() => {
          setItemFlash((m) => {
            const n = { ...m };
            delete n[itemId];
            return n;
          });
        }, STAT_FLASH_MS),
      );
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [blocksStatFlashOverlay]);

  return (
    <div
      className={[styles.page, highlightPulse ? activeTurnRainbow.activeTurn : ""].filter(Boolean).join(" ")}
      style={{
        width: "100%",
        maxWidth: 740,
        margin: "0 auto",
        /* Headerhöjd (namn + stat-rad med 11px padding upp/ned) + ~20px luft innan utrustning */
        padding: `${showHeaderStatsBar ? 160 : 76}px 16px 78px`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          boxShadow: "0 6px 24px rgba(0, 0, 0, 0.22)",
        }}
      >
        <div
          style={{
            background: me?.color ?? "rgba(30, 41, 59, 0.96)",
            borderBottom: showHeaderStatsBar ? undefined : "1px solid rgba(0, 0, 0, 0.2)",
          }}
        >
          <div
            style={{
              maxWidth: 740,
              margin: "0 auto",
              padding: "12px 16px",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--heading)",
                fontWeight: 500,
                fontSize: 22,
                lineHeight: 1.05,
                letterSpacing: 0.04,
                color: "#ffffff",
                textShadow: "0 1px 2px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.2)",
                flex: "1 1 auto",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {me?.name ?? name}
            </div>
            <button
              type="button"
              aria-label={sv.play.players}
              title={sv.play.players}
              disabled={!state}
              onClick={() => setShowPlayers(true)}
              className={styles.headerPlayersBtn}
            >
              <UserMenuIcon size={26} />
            </button>
          </div>
        </div>
        {showHeaderStatsBar && me ? (
          <div className={styles.headerStatsBar}>
            <div className={styles.headerStatsInner}>
              <div className={styles.statsStrip}>
                <PlayerStatCell
                  ariaLabel={`HP ${me.hp}/${me.maxHp}`}
                  value={`${me.hp}/${me.maxHp}`}
                  icon="hp"
                  flash={hpFlash}
                  flashKey={hpFlashKey}
                  iconSize={36}
                />
                <PlayerStatCell
                  ariaLabel={`${sv.play.pant} ${me.gold}`}
                  value={String(me.gold)}
                  icon="pant"
                  flash={pantFlash}
                  flashKey={pantFlashKey}
                  iconSize={36}
                />
                <PlayerStatCell
                  ariaLabel={`${sv.play.klunkar} ${me.klunkar}`}
                  value={String(me.klunkar)}
                  icon="klunk"
                  flash={klunkFlash}
                  flashKey={klunkFlashKey}
                  iconSize={36}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Utanför .content så fixed-modaler inte fastnar under header (z 60) i .content:s stacking context */}
      {state?.phase === "playing" && me && myPending && pending?.type === "card" && (
        <CardModal
          title={pending.title}
          text={pending.text}
          artKey={pending.artKey}
          kind={pending.kind}
          cardId={pending.cardId}
          combatWin={pending.combatWin}
          combatLoss={pending.combatLoss}
          viewerName={me.name}
          choices={pending.choices}
          onChoose={(choiceId) => send({ type: "chooseCardOption", playerId: me.id, choiceId })}
          onConfirm={() => send({ type: "confirmCard", playerId: me.id })}
        />
      )}

      {state?.phase === "playing" && me && mySipNotice && (
        <SipNoticeCardModal
          recipientName={me.name}
          fromPlayerName={mySipNotice.fromPlayerName}
          onConfirm={() => send({ type: "sipNoticeAck", playerId: me.id })}
        />
      )}

      <div className={styles.content}>
        {err && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{err}</div>}

        {!state && <div>{sv.play.waitingState}</div>}

        {state && (
          <>
            {(!me || state.phase !== "lobby") && (
              <section
                style={{
                  marginBottom: 12,
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                {!me && <div>{sv.play.lookingForPlayer}</div>}
                {me && (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      width: "100%",
                      minWidth: 0,
                      gridTemplateColumns: "minmax(0, 1fr)",
                    }}
                  >
                    <div className={styles.equipmentGridWrap}>
                      <div className={styles.equipmentGrid}>
                        <EquipButton
                          slot="weapon"
                          equipped={!!me.equipment.weapon}
                          equippedName={me.equipment.weapon?.name}
                          lootFlash={equipFlash.weapon}
                          lootFlashKey={equipFlashKey.weapon}
                          onClick={() => setEquipDetail({ slot: "weapon" })}
                        />
                        <EquipButton
                          slot="armor"
                          equipped={!!me.equipment.armor}
                          equippedName={me.equipment.armor?.name}
                          lootFlash={equipFlash.armor}
                          lootFlashKey={equipFlashKey.armor}
                          onClick={() => setEquipDetail({ slot: "armor" })}
                        />
                        <EquipButton
                          slot="helmet"
                          equipped={!!me.equipment.helmet}
                          equippedName={me.equipment.helmet?.name}
                          lootFlash={equipFlash.helmet}
                          lootFlashKey={equipFlashKey.helmet}
                          onClick={() => setEquipDetail({ slot: "helmet" })}
                        />
                        <EquipButton
                          slot="accessory"
                          equipped={!!me.equipment.accessory}
                          equippedName={me.equipment.accessory?.name}
                          lootFlash={equipFlash.accessory}
                          lootFlashKey={equipFlashKey.accessory}
                          onClick={() => setEquipDetail({ slot: "accessory" })}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        width: "100%",
                        minWidth: 0,
                        gridTemplateColumns: "minmax(0, 1fr)",
                      }}
                    >
                      <div
                        style={{
                          opacity: 0.8,
                          fontSize: 12,
                          fontWeight: 900,
                          letterSpacing: 0.3,
                          textAlign: "center",
                        }}
                      >
                        {sv.play.itemsHeading}
                      </div>
                      <div className={styles.equipmentGridWrap}>
                        {groupedInventoryEntries.length === 0 ? (
                          <div className={styles.inventoryEmpty}>{sv.play.itemsEmpty}</div>
                        ) : (
                          <div className={styles.equipmentGrid}>
                            {groupedInventoryEntries.map(([itemId, info]) => {
                              const tone = itemCardTone(itemMeta(itemId).target);
                              const iflash = itemFlash[itemId] ?? null;
                              const iflashKey = itemFlashKey[itemId] ?? 0;
                              return (
                                <button
                                  key={itemId}
                                  type="button"
                                  onClick={() => {
                                    setItemTargetId(null);
                                    setItemDetail({ instanceId: info.firstInstanceId });
                                  }}
                                  aria-label={itemTitle(itemId)}
                                  style={{
                                    width: "100%",
                                    aspectRatio: "1 / 1",
                                    borderRadius: 14,
                                    border: tone.border,
                                    background: tone.background,
                                    boxShadow: tone.boxShadow,
                                    position: "relative",
                                    overflow: iflash ? "visible" : "hidden",
                                    padding: 8,
                                    cursor: "pointer",
                                  }}
                                >
                                  <LootFlashShell flash={iflash} flashKey={iflashKey}>
                                    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}>
                                      <img
                                        src={itemImageSrc(itemId)}
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
                                        }}
                                        alt=""
                                        aria-hidden
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          borderRadius: 8,
                                          display: "block",
                                        }}
                                      />
                                      {info.count > 1 ? (
                                        <span
                                          style={{
                                            position: "absolute",
                                            right: 6,
                                            top: 6,
                                            minWidth: 20,
                                            height: 20,
                                            borderRadius: 999,
                                            border: "1px solid #ffffff55",
                                            background: "rgba(11,18,38,0.88)",
                                            color: "#fff",
                                            fontSize: 12,
                                            fontWeight: 800,
                                            display: "grid",
                                            placeItems: "center",
                                            padding: "0 4px",
                                            zIndex: 2,
                                          }}
                                        >
                                          {info.count}
                                        </span>
                                      ) : null}
                                    </div>
                                  </LootFlashShell>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {state.phase === "lobby" && me && (
              <section
                style={{
                  padding: 12,
                  border: "1px solid #3333",
                  borderRadius: 12,
                  marginBottom: 12,
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "center",
                }}
              >
                <h2 style={{ marginTop: 0 }}>{sv.play.lobbySectionTitle}</h2>
                <div style={{ opacity: 0.8, marginBottom: 8 }}>{sv.play.lobbyReadyLine(readyCount, state.players.length)}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>{sv.play.lobbyBottomHint}</div>
              </section>
            )}

            {state.phase === "ended" && (
              <section style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
              <h2 style={{ marginTop: 0 }}>{sv.play.gameOver}</h2>
              <div>
                {sv.play.winner}: <b>{state.winnerName ?? "—"}</b>
              </div>
              </section>
            )}
          </>
        )}
      </div>

      {!hasBlockingSipNotice && interaction && (
        <div className={[styles.bottomSheet, styles.bottomSheetEnter].join(" ")}>
          <div
            className={[styles.bottomSheetInner, sheetFlash && styles.bottomSheetInnerFlash]
              .filter(Boolean)
              .join(" ")}
          >
            {interaction}
          </div>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          borderTop: "1px solid #ffffff22",
          background: "rgba(11, 18, 38, 0.75)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: 740,
            margin: "0 auto",
            padding: "10px 16px",
            fontSize: 12,
            color: "#ffffff",
            opacity: 0.92,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sv.play.lobbyHeader(room, wsStatusLabel(status))}
        </div>
      </div>

      {showPlayers && state && (
        <Modal title={sv.play.modalPlayers} onClose={() => setShowPlayers(false)}>
          <div style={{ display: "grid", gap: 10 }}>
            {state.players.map((p) => (
              <div
                key={p.id}
                style={{
                  border: "1px solid #ffffff22",
                  borderRadius: 14,
                  padding: 12,
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: p.color, display: "inline-block" }} />
                  <div style={{ fontWeight: 900 }}>
                    {p.name} {p.isHost ? sv.play.hostTag : ""} {p.ready ? "✅" : ""}
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      opacity: 0.85,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <StatIcon kind="hp" size={15} />
                      <span>
                        {p.hp}/{p.maxHp}
                      </span>
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <StatIcon kind="pant" size={15} />
                      <span>{p.gold}</span>
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <StatIcon kind="klunk" size={15} />
                      <span>{p.klunkar}</span>
                    </span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, opacity: 0.9 }}>
                  <div>
                    <b>{sv.play.equipWeapon}:</b> {p.equipment.weapon?.name ?? "—"}
                  </div>
                  <div>
                    <b>{sv.play.equipArmor}:</b> {p.equipment.armor?.name ?? "—"}
                  </div>
                  <div>
                    <b>{sv.play.equipHelmet}:</b> {p.equipment.helmet?.name ?? "—"}
                  </div>
                  <div>
                    <b>{sv.play.equipAccessory}:</b> {p.equipment.accessory?.name ?? "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {equipDetail && me && (
        <Modal
          title={capitalizeWord(equipmentSlotSv(equipDetail.slot))}
          onClose={() => setEquipDetail(null)}
        >
          <div style={{ opacity: 0.9, whiteSpace: "pre-wrap" }}>
            {equipDetail.slot === "weapon" &&
              (me.equipment.weapon
                ? `${me.equipment.weapon.name}\n${sv.play.powerPlus(me.equipment.weapon.power)}`
                : sv.play.emptySlot)}
            {equipDetail.slot === "armor" &&
              (me.equipment.armor
                ? [
                    me.equipment.armor.name,
                    me.equipment.armor.negateAllOnce ? sv.play.armorNegateAllOnce : null,
                    typeof me.equipment.armor.damageNegate === "number"
                      ? sv.play.negatePerHit(me.equipment.armor.damageNegate)
                      : null,
                    me.equipment.armor.bonusHp ? sv.play.bonusHp(me.equipment.armor.bonusHp) : null,
                  ]
                    .filter(Boolean)
                    .join("\n")
                : sv.play.emptySlot)}
            {equipDetail.slot === "helmet" &&
              (me.equipment.helmet
                ? [
                    me.equipment.helmet.name,
                    me.equipment.helmet.combatBonus
                      ? sv.play.combatBonus(me.equipment.helmet.combatBonus)
                      : null,
                    typeof me.equipment.helmet.damageNegate === "number"
                      ? sv.play.negatePerHit(me.equipment.helmet.damageNegate)
                      : null,
                  ]
                    .filter(Boolean)
                    .join("\n")
                : sv.play.emptySlot)}
            {equipDetail.slot === "accessory" &&
              (me.equipment.accessory
                ? [
                    me.equipment.accessory.name,
                    typeof me.equipment.accessory.damageNegate === "number"
                      ? sv.play.negatePerHit(me.equipment.accessory.damageNegate)
                      : null,
                    typeof me.equipment.accessory.moveBonus === "number"
                      ? sv.play.moveSteps(me.equipment.accessory.moveBonus)
                      : null,
                  ]
                    .filter(Boolean)
                    .join("\n")
                : sv.play.emptySlot)}
          </div>
        </Modal>
      )}

      {itemDetail && me && state && (
        <Modal title={sv.play.modalItem} onClose={() => setItemDetail(null)}>
          {(() => {
            const inst = (me.inventory ?? []).find((x) => x.instanceId === itemDetail.instanceId);
            if (!inst) return <div>{sv.play.itemNotFound}</div>;
            const meta = itemMeta(inst.itemId);
            const needsTarget = meta.target === "other";
            const canUse = isItemPlayableNow(meta.target);
            const candidates =
              meta.target === "other"
                ? state.players.filter((p) => p.id !== me.id)
                : [];
            const chosen = needsTarget ? itemTargetId : null;
            return (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>{meta.title}</div>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid #ffffff22",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))",
                  }}
                >
                  <img
                    src={itemImageSrc(inst.itemId)}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
                    }}
                    alt=""
                    aria-hidden
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{ opacity: 0.9 }}>{meta.text}</div>
                {needsTarget && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>{sv.play.chooseTarget}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {candidates.map((p) => (
                        <ArcadeButton
                          key={p.id}
                          variant={itemTargetId === p.id ? "pink" : "gray"}
                          fullWidth
                          onClick={() => setItemTargetId(p.id)}
                        >
                          {p.name}
                        </ArcadeButton>
                      ))}
                    </div>
                  </div>
                )}
                <ArcadeButton
                  variant="blue"
                  fullWidth
                  disabled={!canUse || (needsTarget && !chosen)}
                  onClick={() => {
                    send({
                      type: "useItem",
                      playerId: me.id,
                      instanceId: inst.instanceId,
                      targetPlayerId: chosen ?? undefined,
                    });
                    setItemDetail(null);
                  }}
                >
                  {sv.play.use}
                </ArcadeButton>
                {!canUse && (
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{sv.play.itemsUseHint}</div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      <WsReconnectOverlay
        show={showReconnectOverlay}
        phase={overlayPhase}
        attempt={reconnectAttemptN}
        connectingLabel={sv.play.wsConnecting}
        waitingRetryLabel={sv.play.wsWaitingRetry}
        attemptLabel={sv.play.wsReconnectAttempt}
        retryLabel={sv.play.wsRetry}
        onRetry={requestReconnect}
      />
    </div>
  );
}

function PlayerStatCell(props: {
  ariaLabel: string;
  value: string;
  icon: StatIconKind;
  iconSize?: number;
  flash?: StatFlash;
  flashKey?: number;
}) {
  const sz = props.iconSize ?? 40;
  const flash = props.flash ?? null;
  const radialTone = flash ? statsRadialToneClass(props.icon, flash) : null;
  return (
    <div className={styles.statsCell} role="group" aria-label={props.ariaLabel}>
      <div className={styles.statsCellIconSlot}>
        {flash && radialTone ? (
          <div
            key={props.flashKey ?? 0}
            className={`${styles.statsCellRadial} ${radialTone} ${styles.statsCellRadialRun}`}
            aria-hidden
          />
        ) : null}
        <div className={flash ? styles.statIconWobble : styles.statsCellIconBare}>
          <StatIcon kind={props.icon} size={sz} />
        </div>
      </div>
      <span className={styles.statsCellValue}>{props.value}</span>
    </div>
  );
}

/** Radial + vobble som för HP/pant/klunk, för ny utrustning / nytt föremål */
function LootFlashShell(props: { flash: StatFlash | null; flashKey: number; children: ReactNode }) {
  const tone = props.flash ? lootRadialToneClass(props.flash) : null;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "visible",
        display: "grid",
        placeItems: "center",
      }}
    >
      {props.flash && tone ? (
        <div
          key={props.flashKey}
          className={`${styles.statsCellRadial} ${tone} ${styles.statsCellRadialRun}`}
          aria-hidden
        />
      ) : null}
      <div
        className={props.flash ? styles.statIconWobble : undefined}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          minHeight: 0,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

function EquipButton(props: {
  slot: "weapon" | "armor" | "helmet" | "accessory";
  equipped: boolean;
  equippedName?: string;
  lootFlash: StatFlash | null;
  lootFlashKey: number;
  onClick: () => void;
}) {
  const label =
    props.slot === "weapon"
      ? sv.play.equipWeapon
      : props.slot === "armor"
        ? sv.play.equipArmor
        : props.slot === "helmet"
          ? sv.play.equipHelmet
          : sv.play.equipAccessory;
  const disabled = !props.equipped;
  const lf = props.lootFlash;
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        props.onClick();
      }}
      disabled={disabled}
      aria-label={disabled ? sv.equipAria.empty(label) : sv.equipAria.view(label)}
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        minHeight: 0,
        borderRadius: 14,
        border: `2px solid ${disabled ? "rgba(255,255,255,0.12)" : "rgba(59,130,246,0.85)"}`,
        background: disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)",
        boxShadow: disabled ? "none" : "0 10px 22px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "grid",
        placeItems: "center",
        padding: 0,
        opacity: disabled ? 0.55 : 1,
        position: "relative",
        overflow: lf ? "visible" : "hidden",
        transition: "transform 120ms ease, filter 120ms ease, opacity 120ms ease",
      }}
    >
      <LootFlashShell flash={lf} flashKey={props.lootFlashKey}>
        <EquipIcon slot={props.slot} disabled={disabled} equippedName={props.equippedName} />
      </LootFlashShell>
    </button>
  );
}

function equipmentUniqueImageSrc(name?: string): string | null {
  if (!name) return null;
  const map: Record<string, string> = {
    Stouthjälm: "/equipment/unique/stouthjalm.png",
    Burkplåtsbrynja: "/equipment/unique/burkplatsbrynja.png",
    Pilsnersköld: "/equipment/unique/pilsnerskold.png",
    Humleklor: "/equipment/unique/humleklor.png",
    Kristallmaltsrustning: "/equipment/unique/kristallmaltsrustning.png",
    Skumvisir: "/equipment/unique/skumvisir.png",
    "Fatknytnävs-vaddering": "/equipment/unique/fatknytnavs-vaddering.png",
    "Disig mantel": "/equipment/unique/disig-mantel.png",
    "Taproom-nyckelring": "/equipment/unique/taproom-nyckelring.png",
    Fatlädersväst: "/equipment/unique/fatladersvast.png",
    "Första hjälpen-lager": "/equipment/unique/forsta-hjalpen-lager.png",
    Mäskpaddel: "/equipment/unique/maskpaddel-3.png",
    Burkrustning: "/equipment/unique/burkrustning-3.png",
  };
  if (map[name]) return map[name]!;
  const mash = /^Mäskpaddel\s+(\d+)$/.exec(name);
  if (mash) return `/equipment/unique/maskpaddel-${mash[1]}.png`;
  const can = /^Burkrustning\s+(\d+)$/.exec(name);
  if (can) return `/equipment/unique/burkrustning-${can[1]}.png`;
  return null;
}

function EquipIcon(props: {
  slot: "weapon" | "armor" | "helmet" | "accessory";
  disabled: boolean;
  equippedName?: string;
  /** Endast slot-siluett (vapen/tröja/mössa/accessoar), aldrig unik art — t.ex. typmärke bredvid varubild. */
  genericOnly?: boolean;
  /** Pixelstorlek för generisk siluett (unik art fyller fortfarande 100% av föräldern). */
  iconSize?: number;
}) {
  const uniqueSrc = props.genericOnly ? null : equipmentUniqueImageSrc(props.equippedName);
  // Note: provided file name is "accesory.svg" in public/equipment.
  const src =
    uniqueSrc ??
    (props.slot === "weapon"
      ? "/equipment/weapon.svg"
      : props.slot === "armor"
        ? "/equipment/armor.svg"
        : props.slot === "helmet"
          ? "/equipment/helmet.svg"
          : "/equipment/accesory.svg");
  const tintFilter = uniqueSrc
    ? props.disabled
      ? "grayscale(0.6) brightness(0.9) opacity(0.72)"
      : "drop-shadow(0 0 8px rgba(96,165,250,0.28))"
    : props.disabled
      ? "brightness(0) invert(0.78) opacity(0.72)"
      : "brightness(0) invert(0.98) drop-shadow(0 0 8px rgba(96,165,250,0.38))";
  const genericPx = props.iconSize ?? 36;
  const size = uniqueSrc ? "100%" : genericPx;
  return (
    <img
      src={src}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src =
          props.slot === "weapon"
            ? "/equipment/weapon.svg"
            : props.slot === "armor"
              ? "/equipment/armor.svg"
              : props.slot === "helmet"
                ? "/equipment/helmet.svg"
                : "/equipment/accesory.svg";
      }}
      alt=""
      aria-hidden
      style={{
        width: size,
        height: size,
        objectFit: uniqueSrc ? "cover" : "contain",
        borderRadius: uniqueSrc ? 12 : 0,
        display: "block",
        filter: tintFilter,
      }}
    />
  );
}

function merchantHealArtSrc(name: string): string {
  return equipmentUniqueImageSrc(name) ?? "/items/healing-potion.png";
}

const MERCHANT_ART_FRAME: CSSProperties = {
  width: 52,
  height: 52,
  flexShrink: 0,
  borderRadius: 14,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.28)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxSizing: "border-box",
};

/** Halv storlek jämfört med tidigare typ-badge (~36px → 18px). */
const MERCHANT_TYPE_ICON_PX = 18;

function MerchantShopItemArt(props: { item: ShopItem }) {
  const { item } = props;
  if (item.slot === "heal") {
    return (
      <div style={MERCHANT_ART_FRAME}>
        <img
          src={merchantHealArtSrc(item.name)}
          alt=""
          aria-hidden
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/items/healing-potion.png";
          }}
        />
      </div>
    );
  }
  if (item.slot === "gold") {
    return (
      <div style={MERCHANT_ART_FRAME}>
        <StatIcon kind="pant" size={30} popScale={1.05} />
      </div>
    );
  }
  if (item.slot === "weapon" || item.slot === "armor" || item.slot === "helmet" || item.slot === "accessory") {
    return (
      <div style={MERCHANT_ART_FRAME}>
        <EquipIcon slot={item.slot} disabled={false} equippedName={item.name} />
      </div>
    );
  }
  return null;
}

function MerchantShopTypeIcon(props: { item: ShopItem }) {
  const { item } = props;
  const s = MERCHANT_TYPE_ICON_PX;
  if (item.slot === "heal") {
    return (
      <img
        src="/icons/heart-icon.svg"
        width={s}
        height={s}
        alt=""
        aria-hidden
        draggable={false}
        style={{ display: "block", filter: MERCHANT_TYPE_ICON_FILTER }}
      />
    );
  }
  if (item.slot === "gold") {
    return null;
  }
  if (item.slot === "weapon" || item.slot === "armor" || item.slot === "helmet" || item.slot === "accessory") {
    return <EquipIcon slot={item.slot} disabled={false} genericOnly iconSize={s} />;
  }
  return null;
}

const ITEM_TARGET: Record<string, "self" | "other" | "combat"> = {
  healing_potion: "self",
  sleep_potion: "other",
  sip_card: "other",
  weak_beer: "combat",
  light_beer: "combat",
  folk_beer: "combat",
  tripwire: "combat",
  double_hops: "combat",
  beer_bomb: "combat",
  beard_back: "self",
  hangover: "combat",
  pretzel_snack: "self",
  coin_purse: "self",
  monster_hype: "combat",
  yeast_sabotage: "combat",
  beer_bro: "combat",
};

function itemMeta(itemId: any): { title: string; text: string; target: "self" | "other" | "combat" } {
  const id = String(itemId);
  const row = (sv.items as Record<string, { title: string; text: string } | undefined>)[id];
  if (row) return { title: row.title, text: row.text, target: ITEM_TARGET[id] ?? "self" };
  return { title: id, text: "", target: "self" };
}

function itemTitle(itemId: any): string {
  return itemMeta(itemId).title;
}

function itemImageSrc(itemId: any): string {
  const id = String(itemId);
  const m: Record<string, string> = {
    healing_potion: "/items/healing-potion.png",
    sleep_potion: "/items/sleep-potion.png",
    sip_card: "/items/sip-card.png",
    weak_beer: "/items/drunk-too-much.png",
    light_beer: "/items/light-beer.png",
    folk_beer: "/items/folk-beer.png",
    tripwire: "/items/tripwire.png",
    pretzel_snack: "/items/brezel.png",
    coin_purse: "/items/coin-purse.png",
    double_hops: "/items/double-hops.png",
    beer_bomb: "/items/beer-bomb.png",
    beard_back: "/items/beard-back.png",
    hangover: "/items/hangover.png",
    monster_hype: "/items/monster-hype.png",
    yeast_sabotage: "/items/yeast-sabotage.png",
    beer_bro: "/items/beer-bro.png",
  };
  return m[id] ?? "/card-placeholder.png";
}

function Modal(props: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 120,
      }}
      onMouseDown={props.onClose}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          borderRadius: 16,
          border: "1px solid #ffffff22",
          background: "#0b1226",
          padding: 14,
          textAlign: "left",
          color: "#ffffff",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#ffffff" }}>{props.title}</div>
          <div style={{ marginLeft: "auto" }}>
            <ArcadeButton variant="gray" size="sm" onClick={props.onClose}>
              {sv.play.modalClose}
            </ArcadeButton>
          </div>
        </div>
        {props.children}
      </div>
    </div>
  );
}

function titleCaseTileType(t: string): string {
  return (tileTypeSv as Record<string, string>)[t] ?? String(t);
}

function MoveOptionLabel(props: {
  state: GameState;
  meId: string;
  levelIndex: number;
  tileIndex: number;
  tileType: string;
}) {
  const hasOtherPlayer = props.state.players.some(
    (p) =>
      p.id !== props.meId &&
      p.levelIndex === props.levelIndex &&
      p.tileIndex === props.tileIndex,
  );
  const primary = hasOtherPlayer ? "PvP" : titleCaseTileType(props.tileType);
  return (
    <span style={{ display: "grid", gap: 2, textAlign: "center", width: "100%" }}>
      <span style={{ fontWeight: 900 }}>{primary}</span>
    </span>
  );
}

function CardArtFrame({ artKey }: { artKey?: string }) {
  return (
    <div
      style={{
        width: "92%",
        margin: "0 auto 10px",
        aspectRatio: "4/3",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #ffffff22",
        background: "rgba(255,255,255,0.92)",
      }}
    >
      <img
        src={artImageSrc(artKey)}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
        }}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
    </div>
  );
}

function SipNoticeCardModal(props: {
  recipientName: string;
  fromPlayerName: string;
  onConfirm: () => void;
}) {
  const from = props.fromPlayerName?.trim() || sv.sipNotice.fallbackFrom;
  const recipient = props.recipientName?.trim() || "—";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 110,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          borderRadius: 16,
          border: "1px solid #ffffff22",
          background: "#0b1226",
          padding: 16,
          textAlign: "center",
          boxShadow: "0 24px 56px rgba(0,0,0,0.5)",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 17,
            marginBottom: 10,
            textAlign: "left",
            width: "100%",
            color: "#ffffff",
          }}
        >
          {sv.sipNotice.title}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            padding: "4px 0 8px",
          }}
        >
          <CombatOutcomeThumb outcome="klunk" />
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: 16,
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.45,
              opacity: 0.96,
              maxWidth: 400,
            }}
          >
            {sv.sipNotice.line(recipient, from)}
          </p>
        </div>
        <div style={{ marginTop: 20 }}>
          <ArcadeButton variant="pink" fullWidth onClick={props.onConfirm}>
            {sv.sipNotice.cheers}
          </ArcadeButton>
        </div>
      </div>
    </div>
  );
}

function CardModal(props: {
  title: string;
  text: string;
  artKey?: string;
  kind: "event" | "combat" | "rest" | "treasure" | "empty";
  cardId: string;
  combatWin?: CombatWinSummary;
  combatLoss?: CombatLoseSummary;
  /** Kortägarens visningsnamn (ersätter "Du" i vinst/förlust om det behövs). */
  viewerName?: string;
  choices?: Array<{ id: string; label: string }>;
  onChoose: (choiceId: string) => void;
  onConfirm: () => void;
}) {
  const mon = props.kind === "combat" ? monsterFromCardId(props.cardId) : undefined;
  const useMonsterLayout = !!mon;
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
  const centeredCombatOutcome = showCombatWin || showCombatLose;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          borderRadius: 16,
          border: "1px solid #ffffff22",
          background: "#0b1226",
          padding: 16,
          textAlign: centeredCombatOutcome ? "center" : "left",
          color: "#ffffff",
        }}
      >
        {showCombatWin && effectiveWin ? (
          <CombatWinCard data={effectiveWin} onContinue={props.onConfirm} />
        ) : showCombatLose && effectiveLoss ? (
          <CombatLoseCard data={effectiveLoss} onContinue={props.onConfirm} />
        ) : (
          <>
            {!useMonsterLayout ? (
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: "#ffffff" }}>{props.title}</div>
            ) : null}
            {useMonsterLayout && mon ? (
              <div style={{ marginBottom: 12 }}>
                <MonsterEncounterCard
                  title={props.title}
                  artKey={props.artKey}
                  combatStrength={mon.strength}
                  winGold={mon.rewardGold}
                  winItems={mon.rewardItems}
                  lossDamage={mon.baseDamage}
                  lossKlunks={monsterLossKlunkTotal(mon)}
                  specialRules={props.text.trim() || undefined}
                />
              </div>
            ) : (
              <>
                <CardArtFrame artKey={props.artKey} />
                <div style={{ opacity: 0.98, color: "#ffffff", marginBottom: 12, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                  {props.text}
                </div>
              </>
            )}
            {props.choices && props.choices.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {props.choices.map((c) => (
                  <ArcadeButton key={c.id} variant="blue" fullWidth onClick={() => props.onChoose(c.id)}>
                    {c.label}
                  </ArcadeButton>
                ))}
              </div>
            ) : (
              <ArcadeButton variant="pink" fullWidth onClick={props.onConfirm}>
                {sv.cardModal.continue}
              </ArcadeButton>
            )}
          </>
        )}
      </div>
    </div>
  );
}

