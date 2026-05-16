import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BEER_CAN_HELM1_NAME,
  BEER_CAN_RUSTNING_NAME,
  beerCanSetPiecesEquippedCount,
  isBeerCanShieldName,
  brewerKlunkProgressRatio,
  brewerLevel,
  BEER_HELM2_MIN_LEVEL,
  combatReactionsAllAnswered,
  FINAL_BOSS_LIFE_TOTAL,
  MONSTERS,
  isFinalBossMonsterId,
  isPlayerActiveInMatch,
  isLegendariskBurkhjälmName,
  effectiveWeaponPiecePower,
  monsterCombatEquipmentAttackBonus,
  pvpEquipmentDieBonusTotal,
  sipWeaponExtraAttackCosts,
  monsterLossKlunkTotal,
  monsterEncounterCardPreviewFromState,
  playerCanCombatIntervene,
  levelUpCostsForTargetLevel,
  penaltySipTotalForPlayer,
  previewHpAfterFlatDamage,
  effectiveMerchantBuyPrice,
  equipmentDamageNegate,
  findBossTileIndexInLevel,
  type ClientAction,
  type CombatLoseSummary,
  type CombatWinSummary,
  type EquipmentSlot,
  type GameState,
  type ItemInstance,
  type MonsterId,
  type Pending,
  type Player,
  type ShopItem,
  type SipNoticeKind,
  type TileType,
  type Weapon,
} from "@bv/game-core";
import {
  equipmentCatalogByEquippedName,
  equipmentInventoryEffectBadges,
  itemInventoryEffectBadge,
  ITEM_EFFECT_BADGE_ICONS,
  type ItemInventoryBadgeOpts,
} from "../lib/inventoryEffectBadges";
import { isGameState } from "../lib/gameTypes";
import { itemImageSrc } from "../lib/itemImageSrc";
import { formatShopItemEffectSummary } from "../lib/equipmentEffectSummary";
import { clearRememberedPlayerId, type ServerMessage } from "../lib/ws";
import { useWsGameClient } from "../lib/useWsGameClient";
import { CombatLoseCardContent } from "../components/CombatLoseCard";
import { CombatSheetFrame } from "../components/CombatResultSheet";
import { CombatWinCardContent } from "../components/CombatWinCard";
import { TreasureCardContent } from "../components/TreasureCardContent";
import { MonsterEncounterCard } from "../components/MonsterEncounterCard";
import { ArcadeButton } from "../components/ArcadeButton";
import { DiceCube3D } from "../components/DiceCube3D";
import { LevelRingCell } from "../components/LevelRingCell";
import { EndedScoreboardTable } from "../components/EndedScoreboardTable";
import { EndedSpotlightCarousel } from "../components/EndedSpotlightCarousel";
import { StatIcon, type StatIconKind } from "../components/StatIcon";
import { UserMenuIcon } from "../components/UserMenuIcon";
import { CombatChooseTeammateSheet } from "../components/play/CombatChooseTeammateSheet";
import { BossFinaleOverlay } from "../components/play/BossFinaleOverlay";
import { bossFinaleExitTotalMs } from "../lib/useBossFinaleExit";
import { FloatingEmoteControl } from "../components/play/FloatingEmoteControl";
import { withIdleEmotes } from "../components/play/withIdleEmotes";
import { resolveIdleEmoteContext } from "../lib/idleEmoteContext";
import { CombatEnemyIntroWaiting } from "../components/play/CombatEnemyIntroWaiting";
import { CombatRollPreviewSheet } from "../components/play/CombatRollPreviewSheet";
import { CombatHitMitigationSheet } from "../components/play/CombatHitMitigationSheet";
import styles from "./PlayView.module.css";
import u from "../styles/uiPrimitives.module.css";
import { CardArtAttribution } from "../components/CardArtAttribution";
import { CardFlipModalShell } from "../components/CardFlipModalShell";
import { TeamBattleIntroCard } from "../components/TeamBattleIntroCard";
import cardFlipShellStyles from "../components/CardFlipModalShell.module.css";
import { createLogger } from "../lib/logger";
import { artAttributionLabel, artImageSources, resolveCardRevealArtKey } from "../lib/cardArt";
import { equipmentImageSources, equipmentUniqueImageSrc } from "../lib/equipmentImageSrc";
import monsterCardFrameStyles from "../components/MonsterEncounterCard.module.css";
import { PictureImg } from "../components/PictureImg";
import {
  combatLossKlunksForDisplay,
  monsterEncounterCardPropsFromCombatPending,
  parseLegacyCombatLoseText,
  parseLegacyCombatWinText,
  resolveCombatLossViewer,
  resolveCombatWinViewer,
} from "../lib/combatUi";
import { sv, wsStatusLabel, capitalizeWord, equipmentSlotSv, tileTypeSv } from "../lib/uiStrings";
import { isRingTopEdgeTile, moveChoiceDirectionHints } from "../lib/moveChoiceDirectionHints";
import { moveChoiceTileVisual } from "../lib/moveChoiceTileVisual";

function findMe(state: GameState | null, myId: string | null) {
  if (!state || !myId) return null;
  return state.players.find((p) => p.id === myId) ?? null;
}

function isMyPending(pending: Pending | null, me: Player | null) {
  if (!pending || !me) return false;
  if (pending.type === "moveChoice") return pending.playerId === me.id;
  if (pending.type === "card") return pending.playerId === me.id;
  if (pending.type === "equipmentReplaceOffer") return pending.playerId === me.id;
  if (pending.type === "merchant") return pending.playerId === me.id;
  if (pending.type === "door") return pending.playerId === me.id;
  if (pending.type === "levelUpOffer") return pending.playerId === me.id;
  if (pending.type === "encounterChoice") return pending.moverId === me.id;
  if (pending.type === "pvp") {
    if (
      pending.phase === "preRoundItems" ||
      pending.phase === "awaitingRolls" ||
      pending.phase === "roundReveal"
    ) {
      return pending.attackerId === me.id || pending.defenderId === me.id;
    }
    return pending.winnerId === me.id || pending.loserId === me.id;
  }
  return false;
}

const POSITIVE_HELP_ITEM_IDS = [
  "light_beer",
  "folk_beer",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "get_lucky",
] as const;

type MobileTutorialStep = {
  title: string;
  body: ReactNode;
  imageSrc: string;
};

/** «Din tur»-overlay: en bokstav i taget fades in (behåll sr-text på föräldern). */
function MyTurnOverlayHeading({ text }: { text: string }) {
  const chars = Array.from(text);
  const staggerMs = 38;
  return (
    <div className={styles.myTurnOverlayText} aria-hidden>
      {chars.map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className={styles.myTurnOverlayLetter}
          style={{ animationDelay: `${i * staggerMs}ms` }}
        >
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </div>
  );
}

function TutorialInlineIcon(props: { src: string; color: string; gap?: string }) {
  return (
    <span
      aria-hidden
      className={styles.tutorialInlineIcon}
      style={
        {
          ["--ti-gap" as string]: props.gap ?? "0 3px",
          ["--ti-color" as string]: props.color,
          ["--ti-mask-image" as string]: `url(${props.src})`,
        } as CSSProperties
      }
    />
  );
}

/** Hjälp-kontrakt: pant ljusgrå, skatt/belöning gul (samma ton som tutorial reward). */
const CONTRACT_ICON_PANT_COLOR = "#d1d5db";
const CONTRACT_ICON_REWARD_COLOR = "#facc15";

const MOBILE_TUTORIAL_STEPS: MobileTutorialStep[] = [
  {
    title: "Slå och välj väg",
    body: (
      <>
        <p className={styles.tutorialPara}>
          Slå rörelsetärningen och flytta så många rutor som tärningen visar åt vald riktning.
        </p>
        <p className={styles.tutorialParaSpaced}>
        Du kan även spela föremål från din hand för att rusta upp dig.
        </p>
      </>
    ),
    imageSrc: "/tutorial/tut4.png",
  },
  {
    title: "Hantera rutan",
    body: (
      <>
        <ul className={styles.tutorialList}>
          <li>
            <TutorialInlineIcon src="/icons/event-icon.svg" color="#60a5fa" gap="0 5px 0 0" />
            Händelse: Slumpmässiga händelser som kan hjälpa eller förstöra för dig.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/reward-icon.svg" color="#facc15" gap="0 5px 0 0" />
            Skatt: Hitta ny utrustning och föremål.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/heart-icon.svg" color="#f472b6" gap="0 5px 0 0" />
            Vila: Återhämta dig och få tillbaka 3 HP.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/panta-icon.svg" color="#fb923c" gap="0 5px 0 0" />
            Panta burkar: Handla i butiken för din insamlade Pant.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/monster-icon.svg" color="#ef4444" gap="0 5px 0 0" />
            Dålig batch: Gör dig redo för strid!
          </li>
          <li>
            <TutorialInlineIcon src="/icons/bvb-icon.svg" color="#f472b6" gap="0 5px 0 0" />
            BvB: Bryggare mot bryggare, bäst av 3. Vinnaren väljer ett byte från förloraren.
          </li>
        </ul>
      </>
    ),
    imageSrc: "/tutorial/tut3.png",
  },
  {
    title: "Dåliga batchar, mutor och sabotage",
    body: (
      <>
        <ul className={`${styles.tutorialList} ${styles.tutorialListSpaced}`}>
          <li>
            <TutorialInlineIcon src="/icons/combat-icon.svg" color="#f87171" gap="0 5px 0 0" />
            Styrkekollen: Ditt tärningskast + utrustning & föremål måste vara lika med eller högre än fiendens styrka.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/thumbup-icon.svg" color="#16a34a" gap="0 5px 0 0" />
            Vinst: 
            <TutorialInlineIcon src="/icons/pant-icon.svg" color="#ccc" />
            Pant ,
            <TutorialInlineIcon src="/icons/reward-icon.svg" color="#facc15" />
            Skatter ,
            <TutorialInlineIcon src="/icons/lvlup.svg" color="#60a5fa" />
            XP
          </li>
          <li>
            <TutorialInlineIcon src="/icons/thumbdown-icon.svg" color="#b4232c" gap="0 5px 0 0" />
            Förlust:
            <TutorialInlineIcon src="/icons/heart-icon.svg" color="#f472b6" />
            HP ,
            <TutorialInlineIcon src="/icons/klunk-icon.svg" color="#facc15" />
            klunkar.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/skull-icon.svg" color="#ef4444" gap="0 5px 0 0" />
            Kritisk miss: En 1:a på tärningen är alltid en förlust!</li>
          <li>
          <TutorialInlineIcon src="/icons/bvb-icon.svg" color="#cccccc" gap="0 5px 0 0" />
            Socialt spel: Medspelare kan hjälpa eller sabotera. Du kan be om hjälp mot betalning (
            <TutorialInlineIcon src="/icons/pant-icon.svg" color="#ccc" />
            Pant/
            <TutorialInlineIcon src="/icons/reward-icon.svg" color="#facc15" />
            Skatter) – de kan välja att acceptera eller avstå.
          </li>
        </ul>
      </>
    ),
    imageSrc: "/tutorial/tut2.png",
  },
  {
    title: "Nivåer, Bossen och Vinst",
    body: (
      <>
        <p className={styles.tutorialPara}>
          Du får
          <TutorialInlineIcon src="/icons/klunk-icon.svg" color="#fb7185" />
          XP av klunkar och
          <TutorialInlineIcon src="/icons/monster-icon.svg" color="#ef4444" />
          monstersegrar.
        </p>
        <ul className={`${styles.tutorialList} ${styles.tutorialListSpaced}`}>
          <li>Slutbossen: Besegra bossen på sista nivån för att vinna spelet. Bossen är tuff och har 3 liv.</li>
          <li>Sist kvar: Om alla andra åker ut vinner du spelet.</li>
          <li>
            Eliminering: Om dina
            <TutorialInlineIcon src="/icons/heart-icon.svg" color="#f472b6" />
            HP når noll är du ute ur spelet. Du kan välja att starta om från börjaneller ge upp.
          </li>
        </ul>
      </>
    ),
    imageSrc: "/tutorial/tut1.png",
  },
];

function responsibleReminderAckKey(room: string): string {
  return `bv:responsibleReminderAck:${room}`;
}

function mobileTutorialAckKey(room: string): string {
  return `bv:mobileTutorialAck:${room}`;
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

/** Matchar `.page` max-width — smal skärm får vertikal gradient (spelarfärg → svart). */
const PLAY_ROOT_MOBILE_GRADIENT_MQ = "(max-width: 740px)";
const RAINBOW_EFFECTS_STORAGE_KEY = "bv.play.rainbowEffectsEnabled";

/** Publika tillgångar under apps/web/public/backgrounds/ — index = våningsindex (0 = nivå 1). */
function playLevelBackgroundSrc(levelIndex: number): string {
  const idx = Math.max(0, Math.floor(levelIndex));
  // Filnamn: level1bg.webp, level2bg.webp, …
  return `/backgrounds/level${idx + 1}bg.webp`;
}

function shortcutItemGoldCostForTargetLevel(targetLevelIndex: number): number {
  const levelNumber = Math.max(1, Math.floor(targetLevelIndex) + 1);
  return Math.max(0, levelNumber * 10);
}

function brewerLevelForUiFromValue(level: number): number {
  return Math.max(1, Math.floor(level || 0) + 1);
}

function brewerLevelForUi(player: Player): number {
  return brewerLevelForUiFromValue(brewerLevel(player));
}

function clearPlayRootBackground(): void {
  const root = document.getElementById("root");
  const html = document.documentElement;
  if (!root) return;
  for (const el of [root, html]) {
    el.style.removeProperty("background");
    el.style.removeProperty("background-image");
    el.style.removeProperty("background-color");
  }
}

function applyPlayRootBackground(playerTint: string | undefined): void {
  const root = document.getElementById("root");
  const html = document.documentElement;
  if (!root) return;
  if (!playerTint) {
    clearPlayRootBackground();
    return;
  }
  const useGradient = window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches;
  if (useGradient) {
    const gradient = `linear-gradient(180deg, ${playerTint} 0%, ${playerTint} 10%, #0a0a12 45%, #000000 100%)`;
    for (const el of [root, html]) {
      el.style.background = gradient;
      el.style.backgroundColor = "#000000";
    }
  } else {
    for (const el of [root, html]) {
      el.style.removeProperty("background-image");
      el.style.background = playerTint;
      el.style.backgroundColor = playerTint;
    }
  }
}

export function PlayView() {
  const log = useMemo(() => createLogger("play"), []);
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const room = (sp.get("room") ?? "").toUpperCase() || "TEST1";
  const name = sp.get("name") ?? "Bryggare";

  const [state, setState] = useState<GameState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastHideTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, durationMs = 3600) => {
    if (toastHideTimerRef.current != null) {
      window.clearTimeout(toastHideTimerRef.current);
      toastHideTimerRef.current = null;
    }
    setToast(message);
    toastHideTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastHideTimerRef.current = null;
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (toastHideTimerRef.current != null) {
        window.clearTimeout(toastHideTimerRef.current);
        toastHideTimerRef.current = null;
      }
    };
  }, []);
  const [myId, setMyId] = useState<string | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  /** Mobil: ansvarsfullt spelande — en gång per rum & flik efter bekräftelse. */
  const [showResponsibleReminder, setShowResponsibleReminder] = useState(false);
  /** Kort mobilguide efter ansvarsfullhets-rutan, en gång per rum/flik. */
  const [showMobileTutorial, setShowMobileTutorial] = useState(false);
  const [mobileTutorialStep, setMobileTutorialStep] = useState(0);
  const [tutorialBodyNeedsScroll, setTutorialBodyNeedsScroll] = useState(false);
  const tutorialBodyScrollRef = useRef<HTMLDivElement | null>(null);
  const [interactionPanelCollapsed, setInteractionPanelCollapsed] = useState(false);
  const [rainbowEffectsEnabled, setRainbowEffectsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(RAINBOW_EFFECTS_STORAGE_KEY) !== "0";
  });
  const [equipDetail, setEquipDetail] = useState<{
    slot: "weapon" | "armor" | "helmet" | "accessory";
  } | null>(null);
  const [itemDetail, setItemDetail] = useState<{ instanceId: string } | null>(null);
  const [itemTargetId, setItemTargetId] = useState<string | null>(null);
  /** Efter första "Använd" för föremål som kräver målspelare: visa då mål-knapparna. */
  const [itemUseTargetPhase, setItemUseTargetPhase] = useState(false);
  /** «Ett sjätte ölsinne»: vald tärningsyta innan useItem. */
  const [itemSixSenseFace, setItemSixSenseFace] = useState<number | null>(null);
  const [wantsIntervene, setWantsIntervene] = useState(false);
  const [beerBroPickInstance, setBeerBroPickInstance] = useState<string | null>(null);
  /** Lengräddad, En enkel stöld, Spilla med flit — kräver målspelare vid ingripande. */
  const [interveneOtherTargetPickInstance, setInterveneOtherTargetPickInstance] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [rollDiceSpinning, setRollDiceSpinning] = useState(true);
  const [combatDiceSpinning, setCombatDiceSpinning] = useState(true);
  const [pvpDiceSpinning, setPvpDiceSpinning] = useState(true);
  const [sheetFlashGen, setSheetFlashGen] = useState(0);
  const [sheetFlash, setSheetFlash] = useState(false);
  const [sheetTurnAnim, setSheetTurnAnim] = useState<"in" | "out" | null>(null);
  const [showMyTurnOverlay, setShowMyTurnOverlay] = useState(false);
  const [showLevelUpOverlay, setShowLevelUpOverlay] = useState<number | null>(null);
  const [queuedLevelUpOverlay, setQueuedLevelUpOverlay] = useState<number | null>(null);
  const bottomSheetMeasureRef = useRef<HTMLDivElement | null>(null);
  const turnSwapTimerRef = useRef<number | null>(null);
  const prevIsMyTurnRef = useRef(false);
  const prevMyTurnOverlayRef = useRef(false);
  const myTurnOverlayTimerRef = useRef<number | null>(null);
  const levelUpOverlayTimerRef = useRef<number | null>(null);
  const prevBrewerLevelsRef = useRef<Map<string, number> | null>(null);
  const [bottomSheetAnimatedHeight, setBottomSheetAnimatedHeight] = useState<number | null>(null);
  const [bottomSheetHeightInstant, setBottomSheetHeightInstant] = useState(false);
  const [bottomSheetEnterDone, setBottomSheetEnterDone] = useState(false);
  const [merchantReplaceItem, setMerchantReplaceItem] = useState<ShopItem | null>(null);
  const prevPendingRef = useRef<Pending | null>(null);
  const lastToastSipNoticeRef = useRef<string | null>(null);
  const bossFinaleFinishTimerRef = useRef<number | null>(null);
  const [bossFinaleExitLocal, setBossFinaleExitLocal] = useState(false);

  const { status, clientRef } = useWsGameClient({
    roomCode: room,
    playerName: name,
    as: "controller",
    connectTimeoutMs: 10_000,
    onMessage: (m: ServerMessage) => {
      if (m.type === "helloAck") setMyId(m.playerId);
      if (m.type === "error") showToast(m.message);
      if (m.type === "state" && isGameState(m.state)) {
        setState(m.state);
      }
      if (m.type === "stateDelta") {
        setState((prev) => {
          if (!prev || typeof m.patch !== "object" || m.patch == null) return prev;
          const merged = { ...prev, ...(m.patch as Partial<GameState>) };
          return isGameState(merged) ? merged : prev;
        });
      }
    },
  });

  const me = findMe(state, myId);
  const lobbyCardCoverId = state?.config.cardCover;

  const iAmEliminated = useMemo(() => {
    if (!state || !myId) return false;
    return !!state.players.find((p) => p.id === myId)?.eliminated;
  }, [state, myId]);

  /** Efter «Ge upp» (eliminated): lämna server-rummet och gå till startsidan — som «Lämna spel». */
  useEffect(() => {
    if (!iAmEliminated) return;
    clientRef.current?.send({ type: "action", action: { type: "leaveGame" } });
    clearRememberedPlayerId(room);
    navigate("/", { replace: true });
  }, [iAmEliminated, navigate, room]);

  useEffect(() => {
    setShowResponsibleReminder(false);
    setShowMobileTutorial(false);
    setMobileTutorialStep(0);
  }, [room]);

  const dismissResponsibleReminder = useCallback(() => {
    try {
      window.sessionStorage.setItem(responsibleReminderAckKey(room), "1");
    } catch {
      // ignore
    }
    setShowResponsibleReminder(false);
  }, [room]);

  const dismissMobileTutorial = useCallback(() => {
    try {
      window.sessionStorage.setItem(mobileTutorialAckKey(room), "1");
    } catch {
      // ignore
    }
    setShowMobileTutorial(false);
  }, [room]);

  useEffect(() => {
    if (status !== "connected") {
      setShowResponsibleReminder(false);
      return;
    }
    if (showResponsibleReminder) return;
    if (!state || !myId) return;
    if (!state.players.some((p) => p.id === myId)) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches) return;
    try {
      if (window.sessionStorage.getItem(responsibleReminderAckKey(room)) === "1") return;
    } catch {
      return;
    }
    setShowResponsibleReminder(true);
  }, [status, state, myId, room, showResponsibleReminder]);
  useEffect(() => {
    if (status !== "connected") {
      setShowMobileTutorial(false);
      return;
    }
    if (showResponsibleReminder || showMobileTutorial) return;
    if (!state || !myId) return;
    if (!state.players.some((p) => p.id === myId)) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches) return;
    try {
      if (window.sessionStorage.getItem(mobileTutorialAckKey(room)) === "1") return;
    } catch {
      return;
    }
    setMobileTutorialStep(0);
    setShowMobileTutorial(true);
  }, [status, state, myId, room, showResponsibleReminder, showMobileTutorial]);
  useLayoutEffect(() => {
    if (!showMobileTutorial) return;
    const measure = () => {
      const el = tutorialBodyScrollRef.current;
      if (!el) return;
      setTutorialBodyNeedsScroll(el.scrollHeight > el.clientHeight + 2);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [showMobileTutorial, mobileTutorialStep]);

  const prevHpRef = useRef<number | undefined>(undefined);
  const prevGoldRef = useRef<number | undefined>(undefined);
  const prevKlunkRef = useRef<number | undefined>(undefined);
  const suppressNextHpFlashRef = useRef(false);
  const [hpFlash, setHpFlash] = useState<StatFlash>(null);
  const [pantFlash, setPantFlash] = useState<StatFlash>(null);
  const [klunkFlash, setKlunkFlash] = useState<StatFlash>(null);
  const [hpFlashKey, setHpFlashKey] = useState(0);
  const [pantFlashKey, setPantFlashKey] = useState(0);
  const [klunkFlashKey, setKlunkFlashKey] = useState(0);
  const [xpGainPromptText, setXpGainPromptText] = useState<string | null>(null);
  const [xpGainPromptKey, setXpGainPromptKey] = useState(0);
  const xpGainPromptTimerRef = useRef<number | null>(null);

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
    if (!me) return [] as { groupKey: string; itemId: string; count: number; firstInstanceId: string }[];
    const acc: Record<string, { count: number; firstInstanceId: string; itemId: string }> = {};
    for (const it of me.inventory ?? []) {
      const groupKey = it.itemId === "canman" ? `canman:${it.instanceId}` : String(it.itemId);
      const cur = acc[groupKey];
      if (!cur) acc[groupKey] = { count: 1, firstInstanceId: it.instanceId, itemId: String(it.itemId) };
      else cur.count += 1;
    }
    const rows = Object.entries(acc).map(([groupKey, v]) => ({ groupKey, ...v }));
    rows.sort((a, b) => {
      const ta = inventoryGroupSortTier(a.itemId);
      const tb = inventoryGroupSortTier(b.itemId);
      if (ta !== tb) return ta - tb;
      return a.groupKey.localeCompare(b.groupKey);
    });
    return rows;
  }, [me]);
  const itemInvBadgeOpts = useMemo<ItemInventoryBadgeOpts | undefined>(() => {
    if (!me || !state?.levels?.length) return undefined;
    return { playerLevelIndex: me.levelIndex, levelCount: state.levels.length };
  }, [me, state?.levels?.length, me?.levelIndex]);
  const mobileEquipmentCombatTotals = useMemo(() => {
    if (!me || state?.phase !== "playing") return null;
    return {
      attack: monsterCombatEquipmentAttackBonus(me) + (me.nextCombatModifier ?? 0),
      shield: equipmentDamageNegate(me),
      bvb: pvpEquipmentDieBonusTotal(me),
    };
  }, [me, state?.phase]);
  const activeId = state?.turnOrder?.[state.currentTurnIndex ?? 0] ?? null;
  const footerTurnCaption = useMemo(() => {
    if (!state || state.phase !== "playing" || !activeId) return null;
    const p = state.players.find((x) => x.id === activeId);
    const name = p?.name?.trim() || "—";
    if (me && activeId === me.id) return sv.play.footerTurnYou;
    return sv.play.footerTurnOther(name);
  }, [state, activeId, me?.id]);
  const isMyTurn = me && activeId === me.id && state?.phase === "playing";
  /** Spelarfärg på #root/html; smal vy: gradient spelarfärg → svart längst ned. */
  useEffect(() => {
    const mq = window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ);
    const apply = () => applyPlayRootBackground(me?.color);
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      clearPlayRootBackground();
    };
  }, [me?.color]);

  const showHeaderStatsBar = Boolean(state && me && state.phase !== "lobby");
  const headerStatusTag = useMemo(() => {
    if (!me) return "";
    const parts: string[] = [];
    if ((me.skippedTurns ?? 0) > 0 && me.skipTurnReasons?.includes("normal")) parts.push("(Zzz)");
    if (me.skipTurnReasons?.includes("oil")) parts.push(`(${sv.table.playerStatusOilInEye})`);
    return parts.length ? parts.join(" ") : "";
  }, [me]);
  const brewerProgressUi = useMemo(() => {
    if (!state || !me || state.phase !== "playing") return null;
    const bl = brewerLevelForUi(me);
    const ratio = brewerKlunkProgressRatio(me.xp);
    return { brewerLevel: bl, ratio };
  }, [state, me]);
  /* Namnrad: 12+46+12=70 (knapp 46px). Stats-rad är något lägre efter mindre level-ikon, så total offset justeras för att undvika glipa mot utrustning. */
  const headerTopPad = showHeaderStatsBar ? 130 : 70;
  /** Fixed utrustningspanel har egen botten-padding; håll sidans bottenmarginal låg. */
  const pageBottomPad = 12;
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RAINBOW_EFFECTS_STORAGE_KEY, rainbowEffectsEnabled ? "1" : "0");
  }, [rainbowEffectsEnabled]);

  const pending = state?.pending ?? null;
  const onRollDieScreen = !!isMyTurn && !pending;
  useEffect(() => {
    if (onRollDieScreen) return;
    setRollDiceSpinning(true);
  }, [onRollDieScreen]);

  const combatFighterSheet =
    !!me &&
    pending?.type === "combat" &&
    pending.phase === "reactions" &&
    (pending.attackerId === me.id || pending.assistId === me.id);
  useEffect(() => {
    if (combatFighterSheet) return;
    setCombatDiceSpinning(true);
  }, [combatFighterSheet]);

  const pvpPending = pending?.type === "pvp" ? pending : null;
  const pvpParticipant =
    !!me && !!pvpPending && (pvpPending.attackerId === me.id || pvpPending.defenderId === me.id);
  const pvpRollSheet = pvpParticipant && pvpPending?.phase === "awaitingRolls";
  const myPvpRoll = me && pvpPending?.phase === "awaitingRolls" ? pvpPending.rolls?.[me.id] : undefined;
  const pvpRound = pvpPending ? (pvpPending.roundNumber ?? pvpPending.pvpRound ?? 1) : 1;
  const pvpWins =
    pvpPending?.wins ?? {
      attacker: 0,
      defender: 0,
    };
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

    if (me?.id && prev?.type === "card" && prev.cardId === "combat_win" && prev.combatWin) {
      const cw = prev.combatWin;
      const stillCombatWin = pending?.type === "card" && pending.cardId === "combat_win";
      if (!stillCombatWin) {
        const loot: string[] = [];
        if (cw.assistPlayerId === me.id && cw.beerBroGrantedRewardTitles?.length) {
          loot.push(...cw.beerBroGrantedRewardTitles);
        }
        if (cw.helpMatePlayerId === me.id && cw.helpMateGrantedRewardTitles?.length) {
          loot.push(...cw.helpMateGrantedRewardTitles);
        }
        if (loot.length > 0) {
          showToast(sv.play.combatWinGrantedLootToast(loot), Math.min(9000, 2800 + loot.length * 1200));
        }
      }
    }

    if (me?.id && prev?.type === "card" && prev.cardId === "combat_lose" && prev.combatLoss) {
      const cl = prev.combatLoss;
      const stillCombatLose = pending?.type === "card" && pending.cardId === "combat_lose";
      if (!stillCombatLose) {
        const impactToastMs = 5200;
        const hmImpact = cl.helpMateImpact;
        if (
          hmImpact &&
          hmImpact.playerId === me.id &&
          (hmImpact.hpLost > 0 || hmImpact.klunksGained > 0)
        ) {
          showToast(
            sv.play.combatLoseAllyImpactToast("helpMate", hmImpact.hpLost, hmImpact.klunksGained),
            impactToastMs,
          );
        }
        const broImpact = cl.assistPartnerImpact;
        if (
          broImpact &&
          broImpact.playerId === me.id &&
          (broImpact.hpLost > 0 || broImpact.klunksGained > 0)
        ) {
          showToast(
            sv.play.combatLoseAllyImpactToast("beerBro", broImpact.hpLost, broImpact.klunksGained),
            impactToastMs,
          );
        }
      }
    }

    if (me) {
      const now = pending?.type === "moveChoice" && pending.playerId === me.id;
      const was = prev?.type === "moveChoice" && prev.playerId === me.id;
      if (now && !was) setSheetFlashGen((g) => g + 1);
    }
    prevPendingRef.current = pending;
  }, [pending, me, showToast]);

  useEffect(() => {
    if (sheetFlashGen < 1) return;
    setSheetFlash(true);
    const t = window.setTimeout(() => setSheetFlash(false), 980);
    return () => clearTimeout(t);
  }, [sheetFlashGen]);

  useEffect(() => {
    if (pending?.type !== "merchant") setMerchantReplaceItem(null);
  }, [pending?.type]);

  useEffect(() => {
    setItemTargetId(null);
    setItemUseTargetPhase(false);
    setItemSixSenseFace(null);
  }, [itemDetail?.instanceId]);

  const combatReactionsPhase = pending?.type === "combat" && pending.phase === "reactions";
  useEffect(() => {
    if (!combatReactionsPhase) {
      setBeerBroPickInstance(null);
      setInterveneOtherTargetPickInstance(null);
    }
  }, [combatReactionsPhase]);

  const myPending = isMyPending(pending, me);
  const readyCount = state?.players?.filter((p) => p.ready).length ?? 0;
  const totalPlayers = state?.players?.length ?? 0;
  const canStart =
    !!me?.isHost && state?.phase === "lobby" && totalPlayers >= 2 && readyCount === totalPlayers;
  /** Regnbåge även off-turn när du har konkret interaktion (ingripande, ölkompis-strid, hjälpkontrakt m.m.). */
  const hasCombatMobileAttention = useMemo(() => {
    if (!me || state?.phase !== "playing" || pending?.type !== "combat") return false;
    if (combatFighterSheet) return true;
    if (pending.phase === "reactions") {
      const isEligibleReactor =
        (pending.reactors?.includes(me.id) ?? false) && playerCanCombatIntervene(me);
      const hasPassed = pending.reacted?.[me.id] === "pass";
      const deadlineAt = pending.reactionsDeadlineAt ?? 0;
      const secondsLeft = deadlineAt > 0 ? Math.max(0, Math.ceil((deadlineAt - nowTick) / 1000)) : 0;
      const reactionOpen = deadlineAt <= 0 || secondsLeft > 0;
      if (isEligibleReactor && !hasPassed && reactionOpen) return true;
    }
    const pid = me.id;
    if (pending.phase === "helpChooseHelper" && pending.attackerId === pid) return true;
    if (pending.phase === "helpAwaitDecision" && pending.helpSelectedHelperId === pid) return true;
    if (pending.phase === "helpAwaitRequesterDecision" && pending.attackerId === pid) return true;
    if (pending.phase === "helpAwaitCard" && pending.helpSelectedHelperId === pid) return true;
    if (pending.phase === "chooseTeammate" && pending.attackerId === pid) return true;
    if (pending.phase === "rollPreview" && pending.attackerId === pid) return true;
    if (pending.phase === "chooseHitMitigation" && pending.attackerId === pid) return true;
    return false;
  }, [me, state?.phase, pending, combatFighterSheet, nowTick]);
  const highlightPulse =
    !!isMyTurn ||
    state?.phase === "lobby" ||
    !!canStart ||
    !!myPending ||
    hasCombatMobileAttention;
  const showRainbowPulse = highlightPulse && rainbowEffectsEnabled;
  const inCombat = pending?.type === "combat";
  const inCombatReactions = inCombat && pending.phase === "reactions";
  const isCombatFighterNow =
    !!me &&
    inCombatReactions &&
    pending?.type === "combat" &&
    (pending.attackerId === me.id || pending.assistId === me.id);
  const inPvpAwaitingRolls = pvpParticipant && pvpPending?.phase === "awaitingRolls";
  const inPvpPreRoundItems = pvpParticipant && pvpPending?.phase === "preRoundItems";
  const isThirdPartyCombatIntervention =
    !!me &&
    inCombatReactions &&
    pending?.type === "combat" &&
    pending.attackerId !== me.id &&
    pending.assistId !== me.id &&
    (pending.reactors?.includes(me.id) ?? false) &&
    playerCanCombatIntervene(me);
  const itemPlayGoldCost = (itemId: string): number => {
    if (itemId === "six_sense") return 5;
    if (itemId === "get_lucky") return 5;
    if (itemId === "manopositiv") return 10;
    if (itemId === "beard_back") return 5;
    if (itemId === "rigged_game") return 5;
    if (itemId === "spill_intentional") return 2;
    if (itemId === "bribes") return 10;
    if (itemId === "paidassasin") return 15;
    return 0;
  };
  const playerHasPlayablePositiveHelpItem = (pl: Player) =>
    (pl.inventory ?? []).some((it) => {
      const id = String(it.itemId);
      if (!POSITIVE_HELP_ITEM_IDS.includes(id as (typeof POSITIVE_HELP_ITEM_IDS)[number])) return false;
      const cost = itemPlayGoldCost(id);
      return cost <= 0 || pl.gold >= cost;
    });
  const isItemPlayableNow = (itemId: string, target: ItemUseTarget) => {
    if (target === "passive") return false;
    if (itemId === "healing_potion" || itemId === "pretzel_snack") {
      if (!me || !state) return false;
      if (state.phase !== "playing") return false;
      if (me.eliminated) return false;
      if (pending?.type === "brewerDown") return false;
      if (
        pending?.type === "combat" &&
        pending.phase === "helpAwaitCard" &&
        me.id === pending.helpSelectedHelperId
      ) {
        return false;
      }
      return true;
    }
    if (itemId === "shortcut" || itemId === "taproom_key") {
      if (!me || !state) return false;
      if (inCombatReactions || inPvpPreRoundItems) return false;
      if (!isMyTurn) return false;
      const levelsLen = state.levels?.length ?? 0;
      const lastIdx = levelsLen > 0 ? levelsLen - 1 : 0;
      const tli = me.levelIndex + 1;
      const onFinalFloor = levelsLen > 0 && me.levelIndex >= lastIdx;
      let goldCost: number;
      if (onFinalFloor) {
        const bossIdx = findBossTileIndexInLevel(state.levels[me.levelIndex]);
        if (bossIdx < 0) return false;
        goldCost =
          itemId === "taproom_key"
            ? Math.max(0, shortcutItemGoldCostForTargetLevel(me.levelIndex) - 10)
            : shortcutItemGoldCostForTargetLevel(me.levelIndex);
      } else {
        if (tli >= levelsLen) return false;
        goldCost =
          itemId === "taproom_key"
            ? (() => {
                const shortcutCost = shortcutItemGoldCostForTargetLevel(tli);
                return Math.max(0, shortcutCost - 10);
              })()
            : shortcutItemGoldCostForTargetLevel(tli);
      }
      if (me.gold < goldCost) return false;
      const pe = state.pending;
      if (
        pe != null &&
        !(
          (pe.type === "moveChoice" && pe.playerId === me.id) ||
          (pe.type === "merchant" && pe.playerId === me.id) ||
          (pe.type === "encounterChoice" && pe.moverId === me.id)
        )
      ) {
        return false;
      }
      return true;
    }
    if (itemId === "charity") {
      if (!me || !state) return false;
      if (state.phase !== "playing") return false;
      if (me.eliminated) return false;
      if (pending?.type === "brewerDown") return false;
      if (inCombatReactions || inPvpPreRoundItems || inPvpAwaitingRolls) return false;
      const missingHp = Math.max(0, me.maxHp - me.hp);
      if (missingHp <= 0) return false;
      const donation = Math.min(missingHp, me.gold);
      if (donation <= 0) return false;
      const pe = state.pending;
      if (
        pe != null &&
        !(
          (pe.type === "moveChoice" && pe.playerId === me.id) ||
          (pe.type === "merchant" && pe.playerId === me.id) ||
          (pe.type === "encounterChoice" && pe.moverId === me.id)
        )
      ) {
        return false;
      }
      return true;
    }
    if (itemId === "shuffle") {
      if (!me || !state) return false;
      if (inCombatReactions || inPvpPreRoundItems || inPvpAwaitingRolls) return false;
      if (!isMyTurn) return false;
      if (itemPlayGoldCost(itemId) > 0 && me.gold < itemPlayGoldCost(itemId)) return false;
      const pe = state.pending;
      if (
        pe != null &&
        !(
          (pe.type === "moveChoice" && pe.playerId === me.id) ||
          (pe.type === "merchant" && pe.playerId === me.id) ||
          (pe.type === "encounterChoice" && pe.moverId === me.id)
        )
      ) {
        return false;
      }
      return true;
    }
    if (itemId === "lengraddad" && inCombatReactions) return true;
    if (itemId === "lengraddad" && inPvpPreRoundItems) return true;
    if (itemId === "lengraddad") return false;
    if (itemId === "early_night") {
      if (!me || pending?.type !== "combat") return false;
      if (pending.phase !== "enemyIntro" && pending.phase !== "reactions") return false;
      return pending.attackerId === me.id;
    }
    if (itemId === "bribes") {
      if (!me || pending?.type !== "combat") return false;
      if (pending.phase !== "enemyIntro" && pending.phase !== "reactions") return false;
      if (pending.attackerId !== me.id) return false;
      const cost = itemPlayGoldCost("bribes");
      return cost <= 0 || me.gold >= cost;
    }
    if (itemId === "not_my_round" && inCombatReactions) return isCombatFighterNow || isThirdPartyCombatIntervention;
    if (itemId === "spill_intentional" && inCombatReactions) return isCombatFighterNow || isThirdPartyCombatIntervention;
    if (itemPlayGoldCost(itemId) > 0 && (!me || me.gold < itemPlayGoldCost(itemId))) return false;
    /** BvB: spel som inte är karttursberoende — måste ligga efter pant-check. */
    if (itemId === "spill_intentional" && (inPvpPreRoundItems || pvpRollSheet)) return true;
    if (itemId === "get_lucky" && inCombatReactions) return isCombatFighterNow || isThirdPartyCombatIntervention;
    if (itemId === "beard_back" && inCombatReactions) return isCombatFighterNow;
    if (itemId === "beard_back" && inPvpPreRoundItems) return true;
    if (itemId === "beard_back" && inPvpAwaitingRolls) return true;
    if (itemId === "beard_back") return false;
    if (itemId === "six_sense") {
      if (inCombatReactions) return isCombatFighterNow;
      if (inPvpPreRoundItems) return true;
      if (inPvpAwaitingRolls) return true;
      if (isMyTurn) return true;
      return false;
    }
    if (inPvpPreRoundItems) return PVP_PRE_ROUND_ITEM_IDS.has(itemId);
    if (isMyTurn) return (target !== "combat" && target !== "combat_bro") || inCombat;
    if (inCombatReactions) return target === "combat" || target === "combat_bro";
    return false;
  };
  const itemCardTone = (itemId: string, target: ItemUseTarget, playableHint?: boolean) => {
    const playable = playableHint ?? isItemPlayableNow(itemId, target);
    const id = String(itemId);
    const greenPositive = {
      border: "2px solid rgba(74,222,128,0.9)",
      background: "rgba(21,128,61,0.13)",
      boxShadow: "0 8px 16px rgba(0,0,0,0.28), 0 0 0 1px rgba(74,222,128,0.35) inset",
    };
    const redEvil = {
      border: "2px solid rgba(248,113,113,0.95)",
      background: "rgba(127,29,29,0.14)",
      boxShadow: "0 8px 16px rgba(0,0,0,0.28), 0 0 0 1px rgba(248,113,113,0.4) inset",
    };
    const neutral = {
      border: "2px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.04)",
      boxShadow: "0 8px 16px rgba(0,0,0,0.28)",
    };

    if (playable) {
      if (PLAYABLE_DEBUFF_ITEM_IDS.has(id)) return redEvil;
      return greenPositive;
    }
    return neutral;
  };
  const itemMetaForView = (itemId: any): { title: string; text: string; target: ItemUseTarget } => {
    const base = itemMeta(itemId);
    const isLevelJumpItem = String(itemId) === "shortcut" || String(itemId) === "taproom_key";
    if (!isLevelJumpItem || !me || !state) return base;
    const levelsLen = state.levels?.length ?? 0;
    const lastIdx = levelsLen > 0 ? levelsLen - 1 : 0;
    const targetLevelIndex = me.levelIndex + 1;
    const onFinalFloor = levelsLen > 0 && me.levelIndex >= lastIdx;
    if (onFinalFloor) {
      const bossIdx = findBossTileIndexInLevel(state.levels[me.levelIndex]);
      if (bossIdx < 0) {
        return {
          ...base,
          text: `${base.text}\nIngen bossruta på sista våningen.`,
        };
      }
      const goldCost =
        String(itemId) === "taproom_key"
          ? Math.max(0, shortcutItemGoldCostForTargetLevel(me.levelIndex) - 10)
          : shortcutItemGoldCostForTargetLevel(me.levelIndex);
      const onBoss = me.tileIndex === bossIdx;
      return {
        ...base,
        text: `${base.text}\nNuvarande kostnad: ${goldCost} pant (${onBoss ? "lös slutbossrutan direkt — du står redan på rutan." : "gå direkt till slutbossens ruta."})`,
      };
    }
    if (targetLevelIndex >= levelsLen) {
      return {
        ...base,
        text: `${base.text}\nDu är redan på översta våningen.`,
      };
    }
    const goldCost =
      String(itemId) === "taproom_key"
        ? (() => {
            const shortcutCost = shortcutItemGoldCostForTargetLevel(targetLevelIndex);
            return Math.max(0, shortcutCost - 10);
          })()
        : shortcutItemGoldCostForTargetLevel(targetLevelIndex);
    return {
      ...base,
      text: `${base.text}\nNuvarande kostnad: ${goldCost} pant (till nivå ${targetLevelIndex + 1}).`,
    };
  };

  const mySipNotice = useMemo(() => {
    if (!me || !state || state.phase !== "playing") return null;
    const list = state.sipNotices ?? [];
    return list.find((n) => n.recipientId === me.id) ?? null;
  }, [state?.sipNotices, state?.phase, me?.id]);
  const myCardPending = useMemo(() => {
    if (!state || state.phase !== "playing" || !me) return null;
    if (state.pending?.type !== "card") return null;
    return state.pending.playerId === me.id ? state.pending : null;
  }, [state?.pending, state?.phase, me?.id]);
  const bossFinalePending = useMemo(() => {
    if (!state || state.phase !== "playing") return null;
    if (state.pending?.type !== "card" || state.pending.cardId !== "boss_final_win") return null;
    return state.pending;
  }, [state?.pending, state?.phase]);
  const bossFinaleExiting =
    bossFinaleExitLocal || (state?.bossFinaleExitStartedAt ?? null) != null;
  useEffect(() => {
    if (!bossFinalePending) setBossFinaleExitLocal(false);
  }, [bossFinalePending]);
  useEffect(() => {
    return () => {
      if (bossFinaleFinishTimerRef.current != null) {
        window.clearTimeout(bossFinaleFinishTimerRef.current);
        bossFinaleFinishTimerRef.current = null;
      }
    };
  }, []);
  const myEnemyIntroPending = useMemo(() => {
    if (!state || state.phase !== "playing" || !me) return null;
    if (state.pending?.type !== "combat" || state.pending.phase !== "enemyIntro") return null;
    return state.pending.attackerId === me.id ? state.pending : null;
  }, [state?.pending, state?.phase, me?.id]);

  const canSkipMonsterEncounter =
    !!myEnemyIntroPending && me?.equipment?.accessory?.canSkipMonsterEncounter === true;
  /** Måste matcha `SKIP_MONSTER_ENCOUNTER_GOLD_COST` i motorn (2). */
  const canAffordSkipMonsterEncounter = (me?.gold ?? 0) >= 2;
  /** Tillbehör för undvikande finns men för lite pant — ingen monster-intro-modal / Fortsätt-steg. */
  const skipMonsterIntroBecauseCantAffordSkip =
    canSkipMonsterEncounter && !canAffordSkipMonsterEncounter;

  /** Straffklunk efter monsterförlust: visa Vaskad-kortet först, sedan sip-modal (motorn lägger sip i kö före kortet). */
  const suppressSipNoticeForCombatLoseCard = myCardPending?.cardId === "combat_lose";
  const levelUpOfferActiveForMe = !!myPending && pending?.type === "levelUpOffer";
  const hasBlockingSipNotice =
    !!mySipNotice &&
    mySipNotice.noticeKind !== "toast" &&
    !suppressSipNoticeForCombatLoseCard &&
    !levelUpOfferActiveForMe;

  const send = (action: ClientAction) => {
    if (status !== "connected") {
      showToast(sv.play.notConnected);
      log.debug("blocked send; ws status:", status, (action as any)?.type ?? action);
      return;
    }
    log.debug("send action", (action as any)?.type ?? action);
    clientRef.current?.send({ type: "action", action });
  };

  useEffect(() => {
    if (!me || !mySipNotice || mySipNotice.noticeKind !== "toast") return;
    const sig = `${mySipNotice.title ?? ""}|${mySipNotice.body ?? ""}|${mySipNotice.fromPlayerName}`;
    if (lastToastSipNoticeRef.current === sig) return;
    lastToastSipNoticeRef.current = sig;
    const msg =
      mySipNotice.body?.trim() ||
      sv.play.pekaArgtDamageToast(mySipNotice.fromPlayerName || sv.sipNotice.fallbackFrom);
    showToast(msg, 4500);
    send({ type: "sipNoticeAck", playerId: me.id });
  }, [mySipNotice, me?.id, showToast, send]);

  const autoCombatIntroAckSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (!myEnemyIntroPending || status !== "connected" || !me) {
      if (!myEnemyIntroPending) autoCombatIntroAckSigRef.current = null;
      return;
    }
    if (!skipMonsterIntroBecauseCantAffordSkip) return;
    const sig = `${myEnemyIntroPending.attackerId}:${myEnemyIntroPending.monsterId}:${myEnemyIntroPending.enemyName}:${myEnemyIntroPending.need}:${myEnemyIntroPending.needMod ?? 0}`;
    if (autoCombatIntroAckSigRef.current === sig) return;
    autoCombatIntroAckSigRef.current = sig;
    clientRef.current?.send({ type: "action", action: { type: "combatIntroAck", playerId: me.id } });
  }, [myEnemyIntroPending, me?.id, skipMonsterIntroBecauseCantAffordSkip, status]);

  const showXpGainPrompt = useCallback((xpAmount: number) => {
    const xp = Math.max(0, Math.floor(xpAmount));
    if (xp <= 0) return;
    if (xpGainPromptTimerRef.current != null) {
      window.clearTimeout(xpGainPromptTimerRef.current);
      xpGainPromptTimerRef.current = null;
    }
    setXpGainPromptText(`+${xp} XP`);
    setXpGainPromptKey((k) => k + 1);
    xpGainPromptTimerRef.current = window.setTimeout(() => {
      setXpGainPromptText(null);
      xpGainPromptTimerRef.current = null;
    }, 1700);
  }, []);
  const leaveCurrentGame = () => {
    clientRef.current?.send({ type: "action", action: { type: "leaveGame" } });
    window.setTimeout(() => {
      clientRef.current?.close();
      clearRememberedPlayerId(room);
      navigate("/", { replace: true });
    }, 90);
  };

  useEffect(() => {
    return () => {
      if (xpGainPromptTimerRef.current != null) {
        window.clearTimeout(xpGainPromptTimerRef.current);
        xpGainPromptTimerRef.current = null;
      }
    };
  }, []);

  const interactionInner = (() => {
    if (!state || !me) return null;
    if (state.phase === "lobby") {
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o9}`}>
            {sv.play.lobbySheet(readyCount, totalPlayers)}
          </div>
          <div
            className={`${u.stack10} ${me.isHost ? u.gridCols2 : u.gridCols1} ${u.justifyItemsCenter}`}
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
            <div className={`${u.textCenter} ${u.o75} ${u.fs12}`}>
              {me.isHost ? sv.play.hostNeedPlayers : sv.play.waitHostStart}
            </div>
          )}
        </div>
      );
    }
    if (state.phase !== "playing") return null;
    if (pending?.type === "brewerDown") return null;
    if (pending?.type === "card" && myPending) return null; // handled as modal

    if (pending?.type === "encounterChoice" && pending.moverId === me.id) {
      if (pending.phase === "choosePvpOpponent") {
        return (
          <div className={u.stack10}>
            <div className={`${u.textCenter} ${u.o9}`}>{sv.play.pvpChooseOpponent}</div>
            <div className={u.stack10}>
              {pending.opponentIds.map((oid) => {
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
      const encounterPvpEligibleNames = pending.opponentIds
        .map((oid) => state.players.find((p) => p.id === oid))
        .filter(
          (pl): pl is Player => !!pl && pl.equipment.armor?.pvpCannotBeChallenged !== true,
        )
        .map((pl) => pl.name);
      const encounterPvpButtonLabel = sv.play.pvpBothRollVersus(encounterPvpEligibleNames.join(", "));
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o9}`}>{sv.play.encounterChoose}</div>
          <div className={u.stack10}>
            <ArcadeButton
              variant="pink"
              fullWidth
              onClick={() => send({ type: "chooseEncounter", playerId: me.id, choice: "pvp" })}
            >
              {encounterPvpButtonLabel}
            </ArcadeButton>
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
      return (
        <CombatRollPreviewSheet
          state={state}
          me={me}
          pending={pending}
          send={send}
          sheetDiceBlockClass={styles.sheetDiceBlock}
          sheetDiceCaptionClass={styles.sheetDiceCaption}
          sheetDiceCaptionTextClass={styles.sheetDiceCaptionText}
        />
      );
    }

    if (pending?.type === "combat" && pending.phase === "chooseHitMitigation") {
      return (
        <CombatHitMitigationSheet
          state={state}
          me={me}
          pending={pending}
          send={send}
          sheetDiceBlockClass={styles.sheetDiceBlock}
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
        <div className={`${u.textCenter} ${u.o82}`}>
          {sv.play.combatHelpWaitDecision(helperName)}
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
        if (!POSITIVE_HELP_ITEM_IDS.includes(id as (typeof POSITIVE_HELP_ITEM_IDS)[number])) return false;
        const cost = itemPlayGoldCost(id);
        return cost <= 0 || me.gold >= cost;
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
                  {itemTitle(it.itemId)}
                </ArcadeButton>
              ))
            )}
          </div>
        );
      }
      return (
        <div className={`${u.textCenter} ${u.o82}`}>
          {sv.play.combatHelpWaitHelperCard(helperName)}
        </div>
      );
    }

    if (pending?.type === "combat" && pending.phase === "reactions") {
      const isAttacker = pending.attackerId === me.id;
      const isAssistPartner = pending.assistId === me.id;
      const isTeamFighter = isAttacker || isAssistPartner;
      const canPlayInterveneItem = (itemId: string) => {
        if (!COMBAT_INTERVENE_PLAYABLE_ITEM_IDS.has(itemId)) return false;
        if (itemPlayGoldCost(itemId) > 0 && me.gold < itemPlayGoldCost(itemId)) return false;
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
          playerHasPlayablePositiveHelpItem(pl),
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
            <div className={styles.sheetDiceBlock}>
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
                    <DiceCube3D value={myTeamRoll.die} size={76} oneAsSkullIcon />
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
                const cantAffordGold = sipPay.klunks <= 0 && sipPay.gold > 0 && me.gold < sipPay.gold;
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
                      {itemTitle(it.itemId)}
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
          <div className={styles.sheetDiceBlock}>
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
      const bestOf = pending.bestOf ?? 3;
      const meHasPvpItems = (me.inventory ?? []).some((it) => PVP_PRE_ROUND_ITEM_IDS.has(it.itemId));
      const myReadyExplicit = pending.roundItemReady?.[me.id] === true;
      const myEffectiveReady = myReadyExplicit || !meHasPvpItems;
      const opponentId = pending.attackerId === me.id ? pending.defenderId : pending.attackerId;
      const opponent = state.players.find((p) => p.id === opponentId);
      const opponentHasPvpItems = (opponent?.inventory ?? []).some((it) => PVP_PRE_ROUND_ITEM_IDS.has(it.itemId));
      const opponentReadyExplicit = opponentId ? pending.roundItemReady?.[opponentId] === true : false;
      const opponentEffectiveReady = opponentReadyExplicit || !opponentHasPvpItems;
      const scoreLine = `${sv.play.pvpScoreLabel}: ${pending.attackerId === me.id ? pvpWins.attacker : pvpWins.defender}–${pending.attackerId === me.id ? pvpWins.defender : pvpWins.attacker}`;
      return (
        <div className={u.stack10}>
          <div className={`${u.textCenter} ${u.o92}`}>
            {sv.play.pvpRoundBestOf(pvpRound, bestOf)}
          </div>
          <div className={`${u.textCenter} ${u.fs13} ${u.o82}`}>{scoreLine}</div>
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
          <div className={styles.sheetDiceBlock}>
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
              disabled={me.gold < doorPantCost}
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

    const stealEquipOffer =
      pending?.type === "combat" && pending.postReactionEquipmentOffer?.playerId === me.id
        ? pending.postReactionEquipmentOffer
        : null;
    const catalogEquipOffer =
      pending?.type === "equipmentReplaceOffer" && myPending ? pending : null;
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

    if (pending?.type === "levelUpOffer" && myPending) {
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
      const requestMerchantBuy = (it: ShopItem) => {
        const price = effectiveMerchantBuyPrice(me, it.price);
        if (me.gold < price) {
          showToast(sv.play.merchantCantAfford);
          return;
        }
        if (isShopItemEquipment(it) && merchantSlotOccupied(me, it.slot)) {
          setMerchantReplaceItem(it);
          return;
        }
        send({ type: "merchantBuy", playerId: me.id, itemId: it.id });
      };
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
              <div className={u.stack8}>
                <ArcadeButton
                  variant="pink"
                  fullWidth
                  onClick={() => {
                    const pr = effectiveMerchantBuyPrice(me, merchantReplaceItem.price);
                    if (me.gold < pr) {
                      showToast(sv.play.merchantCantAfford);
                      return;
                    }
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
              aria-label={`${me.gold} pant`}
            >
              <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1, opacity: 0.98 }}>{me.gold}</span>
              <StatIcon kind="pant" size={22} />
            </div>
          </div>
          <div className={u.stack10}>
            {pending.items.slice(0, 4).map((it) => {
              const effectSummary = formatShopItemEffectSummary(it);
              const price = effectiveMerchantBuyPrice(me, it.price);
              const cantAfford = me.gold < price;
              return (
              <ArcadeButton
                key={it.id}
                onClick={() => requestMerchantBuy(it)}
                variant="merchant"
                fullWidth
                disabled={cantAfford}
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
                  <div className={u.gridStart6}>
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
                    {effectSummary !== "—" ? (
                      <span
                        style={{
                          opacity: 0.88,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "var(--sans)",
                          letterSpacing: "0.03em",
                          lineHeight: 1.35,
                        }}
                      >
                        {effectSummary}
                      </span>
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
                      ...(cantAfford
                        ? {
                            background: "rgba(178, 38, 52, 0.95)",
                            borderRadius: 8,
                            padding: "5px 10px",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                          }
                        : {}),
                    }}
                  >
                    <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1, opacity: 0.98 }}>{price}</span>
                    <StatIcon kind="pant" size={20} />
                  </span>
                </span>
              </ArcadeButton>
            );
            })}
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
      const theftProtected = loser?.equipment.accessory?.preventTheft === true;
      const showEquipmentLoot = !theftProtected && availableSlots.length > 0;
      const pantSteal = loser ? Math.min(5, loser.gold) : 0;
      const penaltyKlunkTotal = loser ? penaltySipTotalForPlayer(loser, 1) : 0;
      const dmgPreview = loser
        ? previewHpAfterFlatDamage({ player: loser, amount: 2, isBossHit: false })
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

    if (isMyTurn && !pending) {
      return (
        <div className={u.stack10}>
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

  const idleEmoteCtx =
    state && me
      ? resolveIdleEmoteContext(state, me, pending ?? null, !!isMyTurn, footerTurnCaption)
      : null;
  const interaction = withIdleEmotes(interactionInner, idleEmoteCtx);

  const cardOrSipActions = (() => {
    if (!me) return null;
    if (state?.pending?.type === "brewerDown") return null;
    if (hasBlockingSipNotice) return null;
    if (myEnemyIntroPending) {
      if (skipMonsterIntroBecauseCantAffordSkip) return null;
      return (
        <div className={u.stack10}>
          {canSkipMonsterEncounter ? (
            <ArcadeButton
              variant="gray"
              fullWidth
              disabled={!canAffordSkipMonsterEncounter}
              onClick={() => send({ type: "skipMonsterEncounter", playerId: me.id })}
            >
              {sv.play.skipMonsterEncounter}
            </ArcadeButton>
          ) : null}
          <ArcadeButton variant="pink" fullWidth onClick={() => send({ type: "combatIntroAck", playerId: me.id })}>
            {sv.play.continue}
          </ArcadeButton>
        </div>
      );
    }
    if (!myCardPending) return null;
    const rolledEventDie = (() => {
      if (myCardPending.kind !== "event") return null;
      const m = /Tärning:\s*(\d+)/i.exec(myCardPending.text);
      if (!m) return null;
      const n = Number(m[1]);
      if (!Number.isFinite(n)) return null;
      return Math.max(1, Math.min(6, Math.round(n)));
    })();
    if (myCardPending.choices && myCardPending.choices.length > 0) {
      const showEventRollDie =
        myCardPending.kind === "event" && myCardPending.choices.some((c) => c.id === "roll");
      return (
        <div className={u.stack8}>
          {showEventRollDie ? (
            <div className={styles.sheetDiceBlock}>
              <DiceCube3D idleSpin spinning size={76} />
              <div className={styles.sheetDiceCaption} aria-hidden />
            </div>
          ) : null}
          {myCardPending.choices.map((c) => (
            <ArcadeButton
              key={c.id}
              variant="blue"
              fullWidth
              onClick={() => send({ type: "chooseCardOption", playerId: me.id, choiceId: c.id })}
            >
              {c.label}
            </ArcadeButton>
          ))}
        </div>
      );
    }
    return (
      <div className={u.stack8}>
        {rolledEventDie != null ? (
          <div className={styles.sheetDiceBlock}>
            <DiceCube3D value={rolledEventDie} size={76} />
            <div className={styles.sheetDiceCaption} aria-hidden />
          </div>
        ) : null}
        <ArcadeButton
          variant="pink"
          fullWidth
          disabled={myCardPending.cardId === "boss_final_win" && bossFinaleExiting}
          onClick={() => {
            if (myCardPending.cardId === "combat_win") {
              showXpGainPrompt(myCardPending.combatWin?.rewardXp ?? 0);
              const lootTitles = myCardPending.combatWin?.grantedRewardTitles;
              if (lootTitles && lootTitles.length > 0) {
                showToast(sv.play.combatWinGrantedLootToast(lootTitles), Math.min(9000, 2800 + lootTitles.length * 1200));
              }
              send({ type: "confirmCard", playerId: me.id });
              return;
            }
            if (myCardPending.cardId === "combat_lose") {
              const klunk = Math.max(0, Math.floor(myCardPending.combatLoss?.klunkGained ?? 0));
              const hpLoss = Math.max(0, Math.floor(myCardPending.combatLoss?.damage ?? 0));
              if (hpLoss === 0) suppressNextHpFlashRef.current = true;
              showXpGainPrompt(klunk * 10);
              send({ type: "confirmCard", playerId: me.id });
              return;
            }
            if (myCardPending.cardId === "boss_final_win") {
              if (bossFinaleExiting) return;
              if (bossFinaleFinishTimerRef.current != null) return;
              const reducedMotion =
                typeof window !== "undefined" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              setBossFinaleExitLocal(true);
              send({ type: "confirmCard", playerId: me.id });
              bossFinaleFinishTimerRef.current = window.setTimeout(() => {
                bossFinaleFinishTimerRef.current = null;
                send({ type: "confirmCard", playerId: me.id });
              }, bossFinaleExitTotalMs(reducedMotion));
              return;
            }
            send({ type: "confirmCard", playerId: me.id });
          }}
        >
          {myCardPending.cardId === "boss_final_win" && bossFinaleExiting
            ? sv.play.bossFinaleEnding
            : sv.cardModal.continue}
        </ArcadeButton>
      </div>
    );
  })();

  const itemDetailSheet = (() => {
    if (!itemDetail || !me || !state) return null;
    const inst = (me.inventory ?? []).find((x) => x.instanceId === itemDetail.instanceId);
    if (!inst) {
      return (
        <ArcadeButton variant="gray" fullWidth onClick={() => setItemDetail(null)}>
          {sv.play.modalClose}
        </ArcadeButton>
      );
    }
    const meta = itemMetaForView(inst.itemId);
    const passive = meta.target === "passive";
    const broPick = meta.target === "combat_bro";
    const needsTarget = meta.target === "other" || meta.target === "self_or_other" || broPick;
    const healingTargetItem = inst.itemId === "healing_potion" || inst.itemId === "pretzel_snack";
    const canUse = isItemPlayableNow(inst.itemId, meta.target);
    const combatAttackerId = state.pending?.type === "combat" ? state.pending.attackerId : null;
    const pvpDuelOpponentId =
      state.pending?.type === "pvp" &&
      (state.pending.phase === "preRoundItems" || state.pending.phase === "awaitingRolls") &&
      (state.pending.attackerId === me.id || state.pending.defenderId === me.id)
        ? state.pending.attackerId === me.id
          ? state.pending.defenderId
          : state.pending.attackerId
        : null;
    const candidates =
      broPick && combatAttackerId
        ? state.players.filter((p) => p.id !== combatAttackerId && isPlayerActiveInMatch(p))
        : meta.target === "other" && pvpDuelOpponentId
          ? state.players.filter((p) => p.id === pvpDuelOpponentId && isPlayerActiveInMatch(p))
          : meta.target === "other"
            ? state.players.filter((p) => p.id !== me.id && isPlayerActiveInMatch(p))
            : meta.target === "self_or_other"
              ? state.players.filter((p) => p.id === me.id || isPlayerActiveInMatch(p))
              : [];
    const chosen = needsTarget ? (itemTargetId ?? (healingTargetItem ? me.id : null)) : null;
    const targetPrompt = broPick ? sv.play.chooseBeerBroPartner : sv.play.chooseTarget;
    const showTargetPicker = needsTarget && itemUseTargetPhase;
    const needsSixSenseFace = inst.itemId === "six_sense" && canUse;
    const usePrimaryDisabled =
      passive ||
      !canUse ||
      (broPick && !combatAttackerId) ||
      (needsTarget && itemUseTargetPhase && !chosen) ||
      (needsSixSenseFace && itemSixSenseFace == null);
    return (
      <div className={u.stack10}>
        {passive ? (
          <div className={u.itemsHint13}>{sv.play.itemsPassiveHint}</div>
        ) : !canUse ? (
          <div className={u.itemsHint13}>{sv.play.itemsUseHint}</div>
        ) : null}
        {showTargetPicker ? (
          <div className={u.stack8}>
            <div className={u.itemsTarget12}>{targetPrompt}</div>
            <div className={u.stack8}>
              {candidates.map((p) => (
                <ArcadeButton
                  key={p.id}
                  variant="pink"
                  selected={chosen === p.id}
                  fullWidth
                  onClick={() => setItemTargetId(p.id)}
                >
                  {inst.itemId === "split_the_g"
                    ? `${p.name} (+${Math.floor((p.gold ?? 0) / 2)} pant)`
                    : inst.itemId === "shuffle"
                      ? `${p.name} (${(p.inventory ?? []).length} föremål)`
                    : healingTargetItem && p.id === me.id
                      ? "Använd själv"
                      : p.name}
                </ArcadeButton>
              ))}
            </div>
          </div>
        ) : null}
        {needsSixSenseFace ? (
          <div className={u.stack8}>
            <div className={u.itemsTarget12}>{sv.play.itemsChooseDiceFace}</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {([1, 2, 3, 4, 5, 6] as const).map((n) => (
                <ArcadeButton
                  key={n}
                  variant="pink"
                  selected={itemSixSenseFace === n}
                  fullWidth
                  onClick={() => setItemSixSenseFace(n)}
                >
                  {String(n)}
                </ArcadeButton>
              ))}
            </div>
          </div>
        ) : null}
        {passive ? (
          <ArcadeButton variant="gray" fullWidth onClick={() => setItemDetail(null)}>
            {sv.play.modalClose}
          </ArcadeButton>
        ) : (
          <div className={u.grid2Equal10}>
            <ArcadeButton variant="gray" fullWidth onClick={() => setItemDetail(null)}>
              {sv.play.modalClose}
            </ArcadeButton>
            <ArcadeButton
              variant="blue"
              fullWidth
              disabled={usePrimaryDisabled}
              onClick={() => {
                if (needsTarget && !itemUseTargetPhase) {
                  if (healingTargetItem) setItemTargetId(me.id);
                  setItemUseTargetPhase(true);
                  return;
                }
                send({
                  type: "useItem",
                  playerId: me.id,
                  instanceId: inst.instanceId,
                  targetPlayerId: chosen ?? undefined,
                  chosenDieFace:
                    inst.itemId === "six_sense" && typeof itemSixSenseFace === "number"
                      ? itemSixSenseFace
                      : undefined,
                });
                setItemDetail(null);
              }}
            >
              {sv.play.use}
            </ArcadeButton>
          </div>
        )}
      </div>
    );
  })();

  /** Stäng utrustningsmodal — samma mönster som föremål (nedre arket ska inte ersättas av t.ex. kort-knapp). */
  const equipDetailSheet =
    equipDetail && me ? (
      <ArcadeButton variant="gray" fullWidth onClick={() => setEquipDetail(null)}>
        {sv.play.modalClose}
      </ArcadeButton>
    ) : null;

  const sipNoticeAckSheet =
    hasBlockingSipNotice && me && mySipNotice ? (
      <div className={u.stack10}>
        <ArcadeButton
          variant="pink"
          fullWidth
          onClick={() => {
            const hasCustom = !!mySipNotice.title?.trim() || !!mySipNotice.body?.trim();
            const duelLoss = mySipNotice.noticeKind === "duel_loss";
            if (!hasCustom && !duelLoss) {
              const count = Math.max(1, Math.floor(mySipNotice.klunkCount ?? 1));
              showXpGainPrompt(count * 10);
            }
            send({ type: "sipNoticeAck", playerId: me.id });
          }}
        >
          {mySipNotice.noticeKind === "duel_loss"
            ? sv.sipNotice.duelAck
            : mySipNotice.title?.trim() || mySipNotice.body?.trim()
              ? sv.sipNotice.ack
              : sv.sipNotice.cheers}
        </ArcadeButton>
      </div>
    ) : null;

  const tutorialStep = MOBILE_TUTORIAL_STEPS[Math.max(0, Math.min(mobileTutorialStep, MOBILE_TUTORIAL_STEPS.length - 1))];

  const bottomSheetPrimary =
    itemDetailSheet ?? equipDetailSheet ?? cardOrSipActions ?? sipNoticeAckSheet ?? interaction;
  const bottomSheetVisible = pending?.type !== "brewerDown" && !!bottomSheetPrimary;
  const floatingEmoteBottom =
    !bottomSheetVisible || interactionPanelCollapsed
      ? "max(10px, env(safe-area-inset-bottom))"
      : Math.max(10, (bottomSheetAnimatedHeight ?? 110) + 10);
  const showFloatingEmote = !!me && state?.phase === "playing" && isPlayerActiveInMatch(me);
  const bottomSheetPrimaryKind = itemDetailSheet
    ? "item"
    : equipDetailSheet
      ? "equip"
      : cardOrSipActions
        ? "card"
        : sipNoticeAckSheet
          ? "sip"
          : interaction
            ? "interaction"
            : "none";

  useEffect(() => {
    if (!bottomSheetVisible) {
      setInteractionPanelCollapsed(false);
      setBottomSheetEnterDone(false);
      return;
    }
    const t = window.setTimeout(() => setBottomSheetEnterDone(true), 380);
    return () => window.clearTimeout(t);
  }, [bottomSheetVisible]);

  useLayoutEffect(() => {
    const curr = !!isMyTurn;
    if (state?.phase !== "playing" || !bottomSheetVisible) {
      prevIsMyTurnRef.current = curr;
      setSheetTurnAnim(null);
    } else {
      const prev = prevIsMyTurnRef.current;
      if (prev !== curr) {
        setSheetTurnAnim(curr ? "in" : "out");
        if (turnSwapTimerRef.current) clearTimeout(turnSwapTimerRef.current);
        turnSwapTimerRef.current = window.setTimeout(() => {
          setSheetTurnAnim(null);
          turnSwapTimerRef.current = null;
        }, 620);
      }
      prevIsMyTurnRef.current = curr;
    }
    return () => {
      if (turnSwapTimerRef.current) {
        clearTimeout(turnSwapTimerRef.current);
        turnSwapTimerRef.current = null;
      }
    };
  }, [isMyTurn, state?.phase, bottomSheetVisible]);

  useEffect(() => {
    const isPlaying = state?.phase === "playing";
    const curr = !!isMyTurn && isPlaying;
    const prev = prevMyTurnOverlayRef.current;
    prevMyTurnOverlayRef.current = curr;

    if (myTurnOverlayTimerRef.current != null) {
      window.clearTimeout(myTurnOverlayTimerRef.current);
      myTurnOverlayTimerRef.current = null;
    }

    if (!curr) {
      setShowMyTurnOverlay(false);
      return;
    }
    if (prev === curr) return;
    if (showResponsibleReminder || showMobileTutorial) return;
    if (typeof window !== "undefined" && !window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches) return;

    setShowMyTurnOverlay(true);
    myTurnOverlayTimerRef.current = window.setTimeout(() => {
      setShowMyTurnOverlay(false);
      myTurnOverlayTimerRef.current = null;
    }, 3000);

    return () => {
      if (myTurnOverlayTimerRef.current != null) {
        window.clearTimeout(myTurnOverlayTimerRef.current);
        myTurnOverlayTimerRef.current = null;
      }
    };
  }, [isMyTurn, state?.phase, showResponsibleReminder, showMobileTutorial]);

  useEffect(() => {
    if (!state || state.phase !== "playing") {
      prevBrewerLevelsRef.current = null;
      return;
    }
    const currLevels = new Map<string, number>();
    for (const p of state.players) {
      currLevels.set(p.id, brewerLevelForUi(p));
    }
    const prev = prevBrewerLevelsRef.current;
    prevBrewerLevelsRef.current = currLevels;
    if (!prev) return;
    const leveled = state.players
      .map((p) => ({
        player: p,
        prev: prev.get(p.id) ?? brewerLevelForUi(p),
        curr: currLevels.get(p.id) ?? brewerLevelForUi(p),
      }))
      .filter((x) => x.curr > x.prev);
    if (leveled.length === 0) return;
    const own = me ? leveled.find((x) => x.player.id === me.id) : null;
    if (own) {
      const ownCombatResultCardOpen =
        state.pending?.type === "card" &&
        state.pending.playerId === own.player.id &&
        (state.pending.cardId === "combat_win" || state.pending.cardId === "combat_lose");
      if (ownCombatResultCardOpen) {
        setQueuedLevelUpOverlay(own.curr);
        return;
      }
      showToast(`Level up! Du nådde bryggnivå ${own.curr}.`);
      const isMobile =
        typeof window !== "undefined" && window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches;
      if (isMobile && !showResponsibleReminder && !showMobileTutorial) {
        if (levelUpOverlayTimerRef.current != null) {
          window.clearTimeout(levelUpOverlayTimerRef.current);
          levelUpOverlayTimerRef.current = null;
        }
        setShowLevelUpOverlay(own.curr);
        levelUpOverlayTimerRef.current = window.setTimeout(() => {
          setShowLevelUpOverlay(null);
          levelUpOverlayTimerRef.current = null;
        }, 3400);
      }
      return;
    }
    const first = leveled[0];
    if (first) {
      showToast(`${first.player.name} nådde bryggnivå ${first.curr}.`);
    }
  }, [state, me, showToast, showResponsibleReminder, showMobileTutorial]);

  useEffect(() => {
    if (queuedLevelUpOverlay == null || !state || !me) return;
    const ownCombatResultCardOpen =
      state.pending?.type === "card" &&
      state.pending.playerId === me.id &&
      (state.pending.cardId === "combat_win" || state.pending.cardId === "combat_lose");
    if (ownCombatResultCardOpen) return;
    showToast(`Level up! Du nådde bryggnivå ${queuedLevelUpOverlay}.`);
    const isMobile =
      typeof window !== "undefined" && window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches;
    if (isMobile && !showResponsibleReminder && !showMobileTutorial) {
      if (levelUpOverlayTimerRef.current != null) {
        window.clearTimeout(levelUpOverlayTimerRef.current);
        levelUpOverlayTimerRef.current = null;
      }
      setShowLevelUpOverlay(queuedLevelUpOverlay);
      levelUpOverlayTimerRef.current = window.setTimeout(() => {
        setShowLevelUpOverlay(null);
        levelUpOverlayTimerRef.current = null;
      }, 3400);
    }
    setQueuedLevelUpOverlay(null);
  }, [queuedLevelUpOverlay, state, me, showToast, showResponsibleReminder, showMobileTutorial]);

  useEffect(() => {
    return () => {
      if (levelUpOverlayTimerRef.current != null) {
        window.clearTimeout(levelUpOverlayTimerRef.current);
        levelUpOverlayTimerRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!bottomSheetVisible) {
      setBottomSheetAnimatedHeight(null);
      setBottomSheetHeightInstant(false);
      return;
    }
    setBottomSheetHeightInstant(true);
    const el = bottomSheetMeasureRef.current;
    if (!el) return;

    let raf = 0;
    let rafUnlock1 = 0;
    let rafUnlock2 = 0;
    const syncHeight = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const h = Math.ceil(el.getBoundingClientRect().height);
        setBottomSheetAnimatedHeight((prev) => {
          if (prev == null) return h;
          return Math.abs(prev - h) < 1 ? prev : h;
        });
      });
    };

    syncHeight();
    rafUnlock1 = window.requestAnimationFrame(() => {
      rafUnlock2 = window.requestAnimationFrame(() => {
        setBottomSheetHeightInstant(false);
      });
    });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncHeight) : null;
    ro?.observe(el);
    window.addEventListener("resize", syncHeight);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (rafUnlock1) cancelAnimationFrame(rafUnlock1);
      if (rafUnlock2) cancelAnimationFrame(rafUnlock2);
      ro?.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [bottomSheetVisible, bottomSheetPrimaryKind]);

  /** Medkämpe-val ligger i `interaction`, inte i `cardOrSipActions` — sheet måste ändå ligga över TeamBattleIntroCard (z 105). */
  const bottomSheetOverTeamBattleIntro =
    !!me &&
    state?.phase === "playing" &&
    pending?.type === "combat" &&
    pending.phase === "chooseTeammate" &&
    !!pending.teamBattleRequired;

  /** Mötesval / motståndarval ska ligga över kort- och statslager (samma z som team battle-sheet). */
  const bottomSheetOverEncounterChoice =
    !!me && state?.phase === "playing" && pending?.type === "encounterChoice" && pending.moverId === me.id;

  /** Fullskärmsmodal, straffklunk eller nedersta sheet (strid/handlare/tärning …) — stat-animation under ska vänta tills detta är borta. */
  const blocksStatFlashOverlay =
    !!me &&
    state?.phase === "playing" &&
    (!!hasBlockingSipNotice ||
      !!(myPending && pending?.type === "card") ||
      !!(myPending && pending?.type === "equipmentReplaceOffer") ||
      !!(pending?.type === "combat" && pending.postReactionEquipmentOffer?.playerId === me.id) ||
      !!itemDetail ||
      !!equipDetail ||
      !!cardOrSipActions ||
      !!interaction ||
      pending?.type === "brewerDown");

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
    if (suppressNextHpFlashRef.current) {
      suppressNextHpFlashRef.current = false;
      return;
    }
    const dir: StatFlash = next < prev ? "down" : "up";
    if (blocksStatFlashOverlay) return;
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
    if (blocksStatFlashOverlay) return;
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
    if (blocksStatFlashOverlay) return;
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
      className={styles.page}
      style={{
        width: "100%",
        maxWidth: 740,
        margin: "0 auto",
        /* Headerhöjd = exakt under fixed header (namn + ev. stats); ska matcha .playerEquipmentShell top */
        padding: `${headerTopPad}px 16px ${pageBottomPad}px`,
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
              gap: 10,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              aria-label={sv.play.settings}
              title={sv.play.settings}
              onClick={() => setShowSettings(true)}
              className={styles.headerPlayersBtn}
            >
              <SettingsIcon size={22} />
            </button>
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
                textAlign: "center",
              }}
            >
              {me?.name ?? name}
              {headerStatusTag ? ` ${headerStatusTag}` : ""}
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
                  value={String(me.hp)}
                  valueMutedSuffix={`/${me.maxHp}`}
                  icon="hp"
                  flash={hpFlash}
                  flashKey={hpFlashKey}
                  iconSize={32}
                  lowHpDanger={me.hp <= 3}
                />
                <PlayerStatCell
                  ariaLabel={`${sv.play.pant} ${me.gold}`}
                  value={String(me.gold)}
                  icon="pant"
                  flash={pantFlash}
                  flashKey={pantFlashKey}
                  iconSize={32}
                />
                <PlayerStatCell
                  ariaLabel={`${sv.play.klunkar} ${me.klunkar}`}
                  value={String(me.klunkar)}
                  icon="klunk"
                  flash={klunkFlash}
                  flashKey={klunkFlashKey}
                  iconSize={32}
                />
                <div className={styles.levelRingCellWrap}>
                  <LevelRingCell
                    ariaLabel={sv.play.levelUpProgressAria(brewerProgressUi?.brewerLevel ?? 1)}
                    level={brewerProgressUi?.brewerLevel ?? 1}
                    ratio={brewerProgressUi?.ratio ?? 0}
                  />
                  {xpGainPromptText ? (
                    <div key={xpGainPromptKey} className={styles.levelXpGainPrompt} aria-live="polite">
                      {xpGainPromptText}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Utanför .content så fixed-modaler inte fastnar under header (z 60) i .content:s stacking context */}
      {state?.phase === "playing" &&
        me &&
        myPending &&
        pending?.type === "card" &&
        pending.cardId !== "boss_final_win" && (
        <CardModal
          title={pending.title}
          text={pending.text}
          artKey={pending.artKey}
          grantedItemId={pending.grantedItemId}
          kind={pending.kind}
          cardId={pending.cardId}
          combatWin={pending.combatWin}
          combatLoss={pending.combatLoss}
          viewerName={me.name}
          cardCoverId={lobbyCardCoverId}
          gameState={state}
          cardOwnerPlayerId={pending.playerId}
          bossFinalWin={pending.bossFinalWin}
        />
      )}
      {state?.phase === "playing" && me && myPending && pending?.type === "levelUpOffer" && (
        <CardFlipModalShell
          zIndex={112}
          backdropZIndex={60}
          contentZIndex={112}
          onBackdropMouseDown={undefined}
          simpleEntrance
          cardCoverId={lobbyCardCoverId}
          // Backdrop ligger under bottom sheet; kortet ligger över.
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              pointerEvents: "auto",
              width: "100%",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(11,18,38,0.94)",
              overflow: "hidden",
              boxShadow: "0 18px 56px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ padding: 14 }}>
              <div
                style={{
                  fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                  fontWeight: 500,
                  fontSize: "clamp(1.6rem, 6.2vw, 2.2rem)",
                  letterSpacing: "0.04em",
                  lineHeight: 1.05,
                  textTransform: "uppercase",
                  textAlign: "center",
                  color: "#ffffff",
                  textShadow: "0 3px 16px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.55)",
                  marginBottom: 16,
                }}
              >
                {sv.play.levelUpOfferTitle}
              </div>
              <div
                aria-hidden
                style={{
                  width: "100%",
                  height: 176,
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundImage: `url(${playLevelBackgroundSrc(pending.targetLevelIndex)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  position: "relative",
                  border: "1px solid rgba(255,255,255,0.14)",
                  marginTop: 4,
                  marginBottom: 16,
                }}
              />
              <div
                className={`${u.textCenter} ${u.lineHeight15}`}
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  fontSize: 16,
                  opacity: 0.94,
                }}
              >
                {sv.play.levelUpOfferPrompt(pending.targetLevelIndex + 1)}
              </div>
              <div style={{ height: 8 }} aria-hidden />
            </div>
          </div>
        </CardFlipModalShell>
      )}
      {state?.phase === "playing" &&
        me &&
        pending?.type === "combat" &&
        pending.teamBattleRequired &&
        pending.phase === "chooseTeammate" && (
          <TeamBattleIntroCard
            variant="play"
            cardCoverId={lobbyCardCoverId}
            attackerName={
              state.players.find((p) => p.id === pending.attackerId)?.name ?? capitalizeWord(sv.play.theAttacker)
            }
            monster={monsterEncounterCardPropsFromCombatPending(pending, {
              finalBossLivesRemaining: state.finalBossLivesRemaining,
              monsterLossSipReduction: Math.max(
                0,
                Math.floor(
                  state.players.find((pl) => pl.id === pending.attackerId)?.equipment.weapon
                    ?.monsterLossSipReduction ?? 0,
                ),
              ),
            })}
          />
        )}

      {state?.phase === "playing" &&
        me &&
        myEnemyIntroPending &&
        !skipMonsterIntroBecauseCantAffordSkip && (
        <EnemyIntroModal
          enemyName={myEnemyIntroPending.enemyName}
          enemyArtKey={myEnemyIntroPending.enemyArtKey}
          need={myEnemyIntroPending.need}
          needMod={myEnemyIntroPending.needMod}
          rewardGold={myEnemyIntroPending.rewardGold}
          rewardItems={myEnemyIntroPending.rewardItems}
          rewardXp={myEnemyIntroPending.rewardXp}
          baseDamage={myEnemyIntroPending.baseDamage}
          lossKlunks={combatLossKlunksForDisplay(myEnemyIntroPending, {
            monsterLossSipReduction: Math.max(
              0,
              Math.floor(me?.equipment.weapon?.monsterLossSipReduction ?? 0),
            ),
          })}
          specialRules={myEnemyIntroPending.enemyIntroText?.trim() || undefined}
          showCard={myEnemyIntroPending.monsterId !== "boss"}
          bossLivesRemaining={
            isFinalBossMonsterId(myEnemyIntroPending.monsterId as MonsterId)
              ? (state?.finalBossLivesRemaining ?? 3)
              : undefined
          }
          bossWinLootDash={isFinalBossMonsterId(myEnemyIntroPending.monsterId as MonsterId)}
          bossPulsingBackdrop={isFinalBossMonsterId(myEnemyIntroPending.monsterId as MonsterId)}
          teammateName={
            myEnemyIntroPending.assistId
              ? state.players.find((p) => p.id === myEnemyIntroPending.assistId)?.name
              : undefined
          }
          cardCoverId={lobbyCardCoverId}
        />
      )}

      {state?.phase === "playing" && me && mySipNotice && hasBlockingSipNotice && (
        <SipNoticeCardModal
          fromPlayerName={mySipNotice.fromPlayerName}
          klunkCount={mySipNotice.klunkCount ?? 1}
          customTitle={mySipNotice.title}
          customBody={mySipNotice.body}
          noticeKind={mySipNotice.noticeKind ?? "custom"}
        />
      )}

      {state?.phase === "playing" && pending?.type === "brewerDown" && me && (
        <CardFlipModalShell
          zIndex={165}
          cardCoverId={lobbyCardCoverId}
          faceInnerClassName={cardFlipShellStyles.faceInnerNoVerticalOverflow}
          style={{
            placeItems: "center",
            paddingTop: "max(14px, env(safe-area-inset-top))",
            paddingBottom: "max(108px, env(safe-area-inset-bottom))",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              margin: "0 auto",
              boxSizing: "border-box",
              padding: 22,
              borderRadius: 16,
              border: "1px solid #ffffff22",
              background: "#0b1226",
              color: "#fff",
              textAlign: "center",
              display: "grid",
              gap: 16,
            }}
          >
            {pending.playerId === me.id ? (
              <>
                <div
                  style={{
                    fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                    fontWeight: 900,
                    fontSize: "clamp(1.45rem, 5.8vw, 2rem)",
                    letterSpacing: "0.06em",
                    lineHeight: 1.1,
                    textTransform: "uppercase",
                  }}
                >
                  {sv.play.brewerDownTitle}
                </div>
                <img
                  src="/icons/skull-icon.svg"
                  alt=""
                  draggable={false}
                  style={{
                    width: "min(112px, 36vw)",
                    height: "auto",
                    margin: "0 auto",
                    filter: "brightness(0) invert(1)",
                  }}
                />
                <div style={{ fontFamily: "var(--sans)", fontSize: 18, fontWeight: 700 }}>{me.name}</div>
                <p style={{ margin: 0, opacity: 0.9, fontSize: 14, lineHeight: 1.45 }}>{sv.play.brewerDownLead}</p>
                {Math.max(
                  0,
                  (me.equipment.accessory as { deathContinueCost?: number } | undefined)?.deathContinueCost ?? 0,
                ) > 0 ? (
                  <p style={{ margin: 0, opacity: 0.85, fontSize: 13, lineHeight: 1.4 }}>
                    {sv.play.brewerDownInsuredContinue(
                      Math.max(
                        0,
                        (me.equipment.accessory as { deathContinueCost?: number } | undefined)?.deathContinueCost ?? 0,
                      ),
                    )}
                  </p>
                ) : null}
                <div className={u.stack10Mt4}>
                  {Math.max(
                    0,
                    (me.equipment.accessory as { deathContinueCost?: number } | undefined)?.deathContinueCost ?? 0,
                  ) > 0 ? (
                    <ArcadeButton
                      variant="blue"
                      fullWidth
                      disabled={
                        me.gold <
                        Math.max(
                          0,
                          (me.equipment.accessory as { deathContinueCost?: number } | undefined)?.deathContinueCost ??
                            0,
                        )
                      }
                      onClick={() =>
                        send({ type: "brewerDownChoice", playerId: me.id, choice: "insuredContinue" } as any)
                      }
                    >
                      {sv.play.brewerDownInsuredContinue(
                        Math.max(
                          0,
                          (me.equipment.accessory as { deathContinueCost?: number } | undefined)?.deathContinueCost ??
                            0,
                        ),
                      )}
                    </ArcadeButton>
                  ) : null}
                  {!state.config.hardcore ? (
                    <ArcadeButton
                      variant="pink"
                      fullWidth
                      onClick={() => send({ type: "brewerDownChoice", playerId: me.id, choice: "retry" })}
                    >
                      {sv.play.brewerDownRetry}
                    </ArcadeButton>
                  ) : null}
                  <ArcadeButton
                    variant="gray"
                    fullWidth
                    onClick={() => send({ type: "brewerDownChoice", playerId: me.id, choice: "giveUp" })}
                  >
                    {sv.play.brewerDownGiveUp}
                  </ArcadeButton>
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
                {sv.play.brewerDownWaitOther(
                  state.players.find((pl) => pl.id === pending.playerId)?.name ?? "",
                )}
              </div>
            )}
          </div>
        </CardFlipModalShell>
      )}

      {state?.phase === "ended" && (
        <div
          role="dialog"
          aria-label={sv.play.gameOver}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "max(12px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))",
            boxSizing: "border-box",
            background: "rgba(7, 11, 24, 0.94)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              maxHeight: "min(90dvh, 100%)",
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
              borderRadius: 16,
              border: "1px solid #ffffff2e",
              background: "linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)",
              padding: "clamp(20px, 5vw, 28px)",
              color: "#f8fafc",
              boxShadow: "0 24px 56px rgba(0,0,0,0.5)",
            }}
          >
            <h2 style={{ marginTop: 0, textAlign: "center", fontFamily: "var(--heading)", fontWeight: 500 }}>
              {sv.play.gameOver}
            </h2>
            <p style={{ textAlign: "center", marginBottom: 16 }}>
              {sv.play.winner}: <b>{state.winnerName ?? "—"}</b>
            </p>
            <EndedScoreboardTable players={state.players} winnerId={state.winnerId} />
            <EndedSpotlightCarousel players={state.players} />
            <div style={{ marginTop: 20, width: "100%" }}>
              <ArcadeButton variant="pink" fullWidth onClick={() => navigate("/", { replace: true })}>
                {sv.play.gameOverLeaveToHome}
              </ArcadeButton>
            </div>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {!state && <div>{sv.play.waitingState}</div>}

        {state && state.phase !== "ended" && (
          <>
            {(!me || state.phase !== "lobby") && (
              <section
                className={styles.playerBoardPanel}
                style={{
                  marginBottom: me ? 0 : 12,
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                {!me && <div>{sv.play.lookingForPlayer}</div>}
                {me && (
                  <div
                    className={styles.playerEquipmentShell}
                    style={{
                      top: headerTopPad,
                      /* Luft under föremålsgrid när nedersta panelen täcker — kan scrollas fram */
                      ...(bottomSheetVisible
                        ? {
                            paddingBottom: `calc(max(12px, env(safe-area-inset-bottom, 0px)) + ${(bottomSheetAnimatedHeight ?? 110) + 12}px)`,
                          }
                        : {}),
                    }}
                  >
                    <div className={styles.equipmentGridWrap}>
                      <div className={styles.equipmentGrid}>
                        <EquipButton
                          slot="weapon"
                          equipped={!!me.equipment.weapon}
                          equippedName={me.equipment.weapon?.name}
                          equippedPiece={me.equipment.weapon}
                          effectBadgeGold={me.gold}
                          effectBadgePlayer={me}
                          lootFlash={equipFlash.weapon}
                          lootFlashKey={equipFlashKey.weapon}
                          onClick={() => setEquipDetail({ slot: "weapon" })}
                        />
                        <EquipButton
                          slot="armor"
                          equipped={!!me.equipment.armor}
                          equippedName={me.equipment.armor?.name}
                          equippedPiece={me.equipment.armor}
                          burkSetEquippedCount={
                            me.equipment.armor?.name === BEER_CAN_RUSTNING_NAME
                              ? beerCanSetPiecesEquippedCount(me)
                              : undefined
                          }
                          effectBadgePlayer={me}
                          lootFlash={equipFlash.armor}
                          lootFlashKey={equipFlashKey.armor}
                          onClick={() => setEquipDetail({ slot: "armor" })}
                        />
                        <EquipButton
                          slot="helmet"
                          equipped={!!me.equipment.helmet}
                          equippedName={me.equipment.helmet?.name}
                          equippedPiece={me.equipment.helmet}
                          burkSetEquippedCount={
                            me.equipment.helmet?.name === BEER_CAN_HELM1_NAME
                              ? beerCanSetPiecesEquippedCount(me)
                              : undefined
                          }
                          effectBadgePlayer={me}
                          lootFlash={equipFlash.helmet}
                          lootFlashKey={equipFlashKey.helmet}
                          onClick={() => setEquipDetail({ slot: "helmet" })}
                        />
                        <EquipButton
                          slot="accessory"
                          equipped={!!me.equipment.accessory}
                          equippedName={me.equipment.accessory?.name}
                          equippedPiece={me.equipment.accessory}
                          burkSetEquippedCount={
                            me.equipment.accessory?.name &&
                            isBeerCanShieldName(me.equipment.accessory.name)
                              ? beerCanSetPiecesEquippedCount(me)
                              : undefined
                          }
                          effectBadgePlayer={me}
                          lootFlash={equipFlash.accessory}
                          lootFlashKey={equipFlashKey.accessory}
                          onClick={() => setEquipDetail({ slot: "accessory" })}
                        />
                      </div>
                      {mobileEquipmentCombatTotals ? (
                        <div
                          className={styles.equipmentCombatTotalsRow}
                          role="group"
                          aria-label={`${sv.play.equipmentAttackFromGearAria(mobileEquipmentCombatTotals.attack)} · ${sv.play.equipmentDefenseFromGearAria(mobileEquipmentCombatTotals.shield)} · ${sv.play.equipmentBvbFromGearAria(mobileEquipmentCombatTotals.bvb)}`}
                        >
                          <div
                            className={`${styles.equipmentCombatTotalPill}${mobileEquipmentCombatTotals.attack === 0 ? ` ${styles.equipmentCombatTotalPillMuted}` : ""}`}
                            aria-label={sv.play.equipmentAttackFromGearAria(mobileEquipmentCombatTotals.attack)}
                          >
                            <img
                              className={styles.equipmentCombatTotalIcon}
                              src="/icons/combat-icon.svg"
                              alt=""
                              width={18}
                              height={18}
                              draggable={false}
                            />
                            <span>{mobileEquipmentCombatTotals.attack}</span>
                          </div>
                          <div
                            className={`${styles.equipmentCombatTotalPill}${mobileEquipmentCombatTotals.shield === 0 ? ` ${styles.equipmentCombatTotalPillMuted}` : ""}`}
                            aria-label={sv.play.equipmentDefenseFromGearAria(mobileEquipmentCombatTotals.shield)}
                          >
                            <img
                              className={styles.equipmentCombatTotalIcon}
                              src="/icons/armor-icon.svg"
                              alt=""
                              width={18}
                              height={18}
                              draggable={false}
                            />
                            <span>{mobileEquipmentCombatTotals.shield}</span>
                          </div>
                          <div
                            className={`${styles.equipmentCombatTotalPill}${mobileEquipmentCombatTotals.bvb === 0 ? ` ${styles.equipmentCombatTotalPillMuted}` : ""}`}
                            aria-label={sv.play.equipmentBvbFromGearAria(mobileEquipmentCombatTotals.bvb)}
                          >
                            <img
                              className={styles.equipmentCombatTotalIcon}
                              src="/icons/bvb-icon.svg"
                              alt=""
                              width={18}
                              height={18}
                              draggable={false}
                            />
                            <span>{mobileEquipmentCombatTotals.bvb}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className={u.stack8FullMin1}>
                      <div className={u.itemsHeadingRow}>{sv.play.itemsHeading}</div>
                      <div className={styles.equipmentGridWrap}>
                        {groupedInventoryEntries.length === 0 ? (
                          <div className={styles.inventoryEmpty}>{sv.play.itemsEmpty}</div>
                        ) : (
                          <div className={styles.equipmentGrid}>
                            {groupedInventoryEntries.map((info) => {
                              const itemId = info.itemId;
                              const itemMeta = itemMetaForView(itemId);
                              const invPlayable = isItemPlayableNow(itemId, itemMeta.target);
                              const tone = itemCardTone(itemId, itemMeta.target, invPlayable);
                              const dimThirdPartyUnplayable =
                                isThirdPartyCombatIntervention && !invPlayable;
                              const iflash = itemFlash[itemId] ?? null;
                              const iflashKey = itemFlashKey[itemId] ?? 0;
                              const invInst =
                                me.inventory?.find((x) => x.instanceId === info.firstInstanceId) ?? null;
                              return (
                                <button
                                  key={info.groupKey}
                                  type="button"
                                  onClick={() => {
                                    setItemTargetId(null);
                                    if (
                                      pending?.type === "pvp" &&
                                      (pending.phase === "preRoundItems" || pending.phase === "awaitingRolls") &&
                                      me &&
                                      (pending.attackerId === me.id || pending.defenderId === me.id) &&
                                      info.itemId === "spill_intentional"
                                    ) {
                                      setItemTargetId(
                                        pending.attackerId === me.id ? pending.defenderId : pending.attackerId,
                                      );
                                    }
                                    setItemDetail({ instanceId: info.firstInstanceId });
                                  }}
                                  aria-label={itemMeta.title}
                                  style={{
                                    width: "100%",
                                    aspectRatio: "1 / 1",
                                    minHeight: 0,
                                    boxSizing: "border-box",
                                    borderRadius: 14,
                                    border: tone.border,
                                    background: tone.background,
                                    boxShadow: tone.boxShadow,
                                    position: "relative",
                                    overflow: iflash ? "visible" : "hidden",
                                    padding: 0,
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    opacity: dimThirdPartyUnplayable ? 0.42 : 1,
                                    filter: dimThirdPartyUnplayable ? "grayscale(0.22)" : undefined,
                                  }}
                                >
                                  <div
                                    style={{
                                      flex: 1,
                                      minHeight: 0,
                                      minWidth: 0,
                                      width: "100%",
                                      padding: 4,
                                      boxSizing: "border-box",
                                      display: "flex",
                                      flexDirection: "column",
                                    }}
                                  >
                                    <div style={{ flex: 1, minHeight: 0, minWidth: 0, width: "100%" }}>
                                    <LootFlashShell flash={iflash} flashKey={iflashKey}>
                                      {/*
                                        WebKit/mobil: två grid-barn med samma area gav overlay-flex min-innehållshöjd
                                        som tryckte ut bilden. Bild i absolute inset 0 + overlay absolute ovanpå.
                                      */}
                                      <div
                                        style={{
                                          position: "relative",
                                          width: "100%",
                                          height: "100%",
                                          minHeight: 0,
                                        }}
                                      >
                                        <div
                                          style={{
                                            position: "absolute",
                                            inset: 0,
                                            overflow: "hidden",
                                            borderRadius: 10,
                                          }}
                                        >
                                          <img
                                            src={itemImageSrc(itemId)}
                                            onError={(e) => {
                                              (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
                                            }}
                                            alt=""
                                            aria-hidden
                                            style={{
                                              position: "absolute",
                                              inset: 0,
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                              objectPosition: "center center",
                                              display: "block",
                                            }}
                                          />
                                        </div>
                                        <div
                                          style={{
                                            position: "absolute",
                                            inset: 0,
                                            zIndex: 2,
                                            pointerEvents: "none",
                                          }}
                                        >
                                          {info.count > 1 ? (
                                            <span
                                              style={{
                                                position: "absolute",
                                                bottom: 2,
                                                left: 2,
                                                minWidth: 24,
                                                minHeight: 20,
                                                borderRadius: 999,
                                                border: "1px solid #ffffff55",
                                                background: "rgba(11,18,38,0.88)",
                                                color: "#fff",
                                                fontSize: 12,
                                                fontWeight: 800,
                                                display: "grid",
                                                placeItems: "center",
                                                padding: "0 4px",
                                                lineHeight: 1,
                                              }}
                                            >
                                              x{info.count}
                                            </span>
                                          ) : null}
                                          <ItemInventoryAttackCorner itemId={itemId} instance={invInst} />
                                          <div
                                            style={{
                                              position: "absolute",
                                              right: 2,
                                              bottom: 2,
                                              display: "flex",
                                              flexDirection: "column",
                                              alignItems: "flex-end",
                                              gap: 2,
                                            }}
                                          >
                                            <ItemInventoryEffectBadge
                                              itemId={itemId}
                                              instance={invInst}
                                              opts={itemInvBadgeOpts}
                                            />
                                            <ItemInventoryCostBadge itemId={itemId} />
                                          </div>
                                        </div>
                                      </div>
                                    </LootFlashShell>
                                    </div>
                                  </div>
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
          </>
        )}
      </div>

      {showFloatingEmote ? (
        <FloatingEmoteControl me={me} send={send} bottom={floatingEmoteBottom} />
      ) : null}

      {bottomSheetVisible ? (
        <button
          type="button"
          aria-label={interactionPanelCollapsed ? sv.play.panelMaximize : sv.play.panelMinimize}
          title={interactionPanelCollapsed ? sv.play.panelMaximize : sv.play.panelMinimize}
          onClick={() => setInteractionPanelCollapsed((v) => !v)}
          style={{
            position: "fixed",
            right: "max(10px, env(safe-area-inset-right))",
            bottom: interactionPanelCollapsed
              ? "max(10px, env(safe-area-inset-bottom))"
              : Math.max(10, (bottomSheetAnimatedHeight ?? 110) + 10),
            zIndex: 92,
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.35)",
            background: "rgba(11,18,38,0.86)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <PanelToggleIcon collapsed={interactionPanelCollapsed} />
        </button>
      ) : null}

      {bottomSheetVisible && (
        <div
          className={[
            styles.bottomSheet,
            sheetTurnAnim === "in"
              ? styles.bottomSheetTurnSwapIn
              : sheetTurnAnim === "out"
                ? styles.bottomSheetTurnSwapOut
                : showRainbowPulse || bottomSheetEnterDone
                  ? ""
                  : styles.bottomSheetEnter,
            showRainbowPulse ? styles.bottomSheetActiveTurn : "",
            itemDetailSheet ||
              equipDetailSheet ||
              cardOrSipActions ||
              sipNoticeAckSheet ||
              bottomSheetOverTeamBattleIntro ||
              bottomSheetOverEncounterChoice
              ? styles.bottomSheetAboveCard
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {showRainbowPulse ? <div className={styles.bottomSheetActiveTurnBg} aria-hidden /> : null}
          <div
            className={[
              styles.bottomSheetHeightAnim,
              bottomSheetHeightInstant ? styles.bottomSheetHeightInstant : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={bottomSheetAnimatedHeight == null ? undefined : { height: bottomSheetAnimatedHeight }}
          >
            <div
              ref={bottomSheetMeasureRef}
              className={[
                styles.bottomSheetInner,
                sheetFlash && styles.bottomSheetInnerFlash,
                interactionPanelCollapsed && styles.bottomSheetButtonsOnly,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {bottomSheetPrimary}
            </div>
          </div>
        </div>
      )}

      {showMyTurnOverlay ? (
        <div className={styles.myTurnOverlay} aria-live="polite" aria-label={sv.play.footerTurnYou}>
          <MyTurnOverlayHeading text={sv.play.footerTurnYou} />
        </div>
      ) : null}
      {showLevelUpOverlay != null ? (
        <div
          className={styles.levelUpOverlay}
          aria-live="polite"
          aria-label={`Level up! Bryggnivå ${showLevelUpOverlay}`}
        >
          <div className={styles.levelUpOverlayText}>Level up!</div>
        </div>
      ) : null}
      {bossFinalePending ? (
        <>
          <div
            className={[
              styles.bossFinaleBackdrop,
              bossFinaleExiting ? styles.bossFinaleBackdropExiting : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden
          />
          <BossFinaleOverlay
            roundLabel={
              bossFinalePending.bossFinalWin?.roundLabel ??
              `RUNDA ${FINAL_BOSS_LIFE_TOTAL} AV ${FINAL_BOSS_LIFE_TOTAL}`
            }
            winnerName={bossFinalePending.bossFinalWin?.winnerName ?? bossFinalePending.text}
            bossName={bossFinalePending.bossFinalWin?.bossName}
            exiting={bossFinaleExiting}
          />
        </>
      ) : null}

      {showResponsibleReminder && (
        <Modal
          cardCoverId={lobbyCardCoverId}
          title={sv.play.responsibleReminderTitle}
          onClose={dismissResponsibleReminder}
          instantFront
          hideClose
          backdropCloses={false}
          zIndex={130}
          centered
          panelStyle={{ paddingTop: 24, paddingBottom: 24, paddingLeft: 16, paddingRight: 16 }}
          titleBelow={<StatIcon kind="hp" size={88} />}
          titleStyle={{
            fontFamily: '"Permanent Marker", var(--heading), sans-serif',
            fontWeight: 400,
            fontSize: "clamp(22px, 5.2vw, 30px)",
            letterSpacing: "0.03em",
            lineHeight: 1.15,
            color: "#fef9c3",
            textShadow: "0 2px 14px rgba(0,0,0,0.75), 0 0 22px rgba(250, 204, 21, 0.25)",
          }}
        >
          <div className={u.stack12} style={{ width: "100%", alignItems: "center" }}>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.5,
                color: "rgba(248, 250, 252, 0.95)",
                textAlign: "center",
                maxWidth: "100%",
              }}
            >
              {sv.play.responsibleReminderBody}
            </p>
            <ArcadeButton variant="pink" fullWidth onClick={dismissResponsibleReminder}>
              {sv.play.responsibleReminderOk}
            </ArcadeButton>
          </div>
        </Modal>
      )}
      {showMobileTutorial && tutorialStep ? (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className={styles.tutorialOverlay}
        >
          <div
            className={styles.tutorialPanel}
          >
            <div
              className={styles.tutorialHeader}
            >
              Snabbguide
            </div>
            <div
              ref={tutorialBodyScrollRef}
              className={[styles.tutorialBodyScrollArea, styles.tutorialBodyScroll].join(" ")}
              style={
                {
                  ["--tutorial-body-overflow" as string]: tutorialBodyNeedsScroll ? "auto" : "hidden",
                } as CSSProperties
              }
            >
              <div
                className={styles.tutorialBodyGrid}
              >
                <div
                  className={styles.tutorialImageCard}
                >
                  <img
                    src={tutorialStep.imageSrc}
                    alt=""
                    draggable={false}
                    className={styles.tutorialImage}
                  />
                </div>
                <div className={styles.tutorialStepTitle}>
                  {tutorialStep.title}
                </div>
                <div className={styles.tutorialStepBody}>
                  {tutorialStep.body}
                </div>
              </div>
            </div>
            <div
              className={styles.tutorialFooter}
              style={
                {
                  ["--tutorial-footer-border" as string]: tutorialBodyNeedsScroll
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(255,255,255,0.06)",
                  ["--tutorial-footer-bg" as string]: tutorialBodyNeedsScroll
                    ? "linear-gradient(180deg, rgba(12,18,40,0.12) 0%, rgba(12,18,40,0.22) 100%)"
                    : "linear-gradient(180deg, rgba(12,18,40,0.08) 0%, rgba(12,18,40,0.16) 100%)",
                } as CSSProperties
              }
            >
              <div className={`${u.textCenter} ${u.o85} ${u.fs12} ${styles.tutorialFooterPage}`}>
                {mobileTutorialStep + 1} / {MOBILE_TUTORIAL_STEPS.length}
              </div>
              <div className={styles.tutorialFooterButtons}>
              {mobileTutorialStep > 0 ? (
                <ArcadeButton variant="gray" fullWidth onClick={() => setMobileTutorialStep((s) => Math.max(0, s - 1))}>
                  Tillbaka
                </ArcadeButton>
              ) : (
                <ArcadeButton variant="gray" fullWidth onClick={dismissMobileTutorial}>
                  Hoppa över
                </ArcadeButton>
              )}
              {mobileTutorialStep < MOBILE_TUTORIAL_STEPS.length - 1 ? (
                <ArcadeButton
                  variant="pink"
                  fullWidth
                  onClick={() => setMobileTutorialStep((s) => Math.min(MOBILE_TUTORIAL_STEPS.length - 1, s + 1))}
                >
                  Nästa
                </ArcadeButton>
              ) : (
                <ArcadeButton variant="pink" fullWidth onClick={dismissMobileTutorial}>
                  Kör igång
                </ArcadeButton>
              )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showSettings && (
        <Modal cardCoverId={lobbyCardCoverId} title={sv.play.settingsTitle} onClose={() => setShowSettings(false)} instantFront>
          <div className={u.stack12}>
            <label className={styles.settingsToggleRow}>
              <span className={styles.settingsStrongLine}>{sv.play.settingsRainbowEffects}</span>
              <input
                type="checkbox"
                checked={rainbowEffectsEnabled}
                onChange={(e) => setRainbowEffectsEnabled(e.currentTarget.checked)}
              />
            </label>

            <div className={styles.settingsStatusCard}>
              <div className={styles.settingsMutedLabel}>{sv.play.settingsLobbyStatus}</div>
              <div className={styles.settingsStrongLine}>{sv.play.lobbyHeader(room, wsStatusLabel(status))}</div>
              {footerTurnCaption ? (
                <>
                  <div className={styles.settingsMutedLabelSpaced}>{sv.play.settingsTurnStatus}</div>
                  <div className={styles.settingsStrongLine}>{footerTurnCaption}</div>
                </>
              ) : null}
            </div>

            <ArcadeButton
              variant="gray"
              fullWidth
              onClick={() => {
                setMobileTutorialStep(0);
                setShowMobileTutorial(true);
                setShowSettings(false);
              }}
            >
              {sv.play.settingsOpenTutorial}
            </ArcadeButton>

            <ArcadeButton
              variant="gray"
              fullWidth
              onClick={() => {
                setShowLeaveConfirm(true);
              }}
            >
              {sv.play.settingsLeaveGame}
            </ArcadeButton>
          </div>
        </Modal>
      )}

      {showLeaveConfirm && (
        <Modal cardCoverId={lobbyCardCoverId} title={sv.play.settingsLeaveGame} onClose={() => setShowLeaveConfirm(false)} instantFront>
          <div className={u.stack12}>
            <div className={`${u.o9} ${u.fs14}`}>Är du säker på att du vill lämna spelet?</div>
            <ArcadeButton
              variant="pink"
              fullWidth
              onClick={() => {
                setShowLeaveConfirm(false);
                setShowSettings(false);
                leaveCurrentGame();
              }}
            >
              {sv.play.settingsLeaveGame}
            </ArcadeButton>
            <ArcadeButton variant="gray" fullWidth onClick={() => setShowLeaveConfirm(false)}>
              Avbryt
            </ArcadeButton>
          </div>
        </Modal>
      )}

      {showPlayers && state && (
        <Modal cardCoverId={lobbyCardCoverId} title={sv.play.modalPlayers} onClose={() => setShowPlayers(false)} instantFront>
          <div className={u.stack10}>
            {state.players.map((p) => (
              <div key={p.id} className={styles.playersCard}>
                <div className={styles.playersHeaderRow}>
                  <span className={styles.playersColorDot} style={{ background: p.color }} />
                  <div className={styles.playersName}>
                    {p.name} {p.isHost ? sv.play.hostTag : ""} {p.ready ? "✅" : ""}
                  </div>
                  <div className={styles.playersStats}>
                    <span className={styles.playersStatItem}>
                      <StatIcon kind="hp" size={15} />
                      <span>
                        {p.hp}/{p.maxHp}
                      </span>
                    </span>
                    <span className={styles.playersStatItem}>
                      <StatIcon kind="pant" size={15} />
                      <span>{p.gold}</span>
                    </span>
                    <span className={styles.playersStatItem}>
                      <StatIcon kind="klunk" size={15} />
                      <span>{p.klunkar}</span>
                    </span>
                  </div>
                </div>
                <div className={u.grid2Eq8Fs12}>
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

      {equipDetail && me && (() => {
        const slot = equipDetail.slot;
        const equipPiece =
          slot === "weapon"
            ? me.equipment.weapon
            : slot === "armor"
              ? me.equipment.armor
              : slot === "helmet"
                ? me.equipment.helmet
                : me.equipment.accessory;
        const pieceName =
          slot === "weapon"
            ? me.equipment.weapon?.name
            : slot === "armor"
              ? me.equipment.armor?.name
              : slot === "helmet"
                ? me.equipment.helmet?.name
                : me.equipment.accessory?.name;
        const equipped = !!pieceName;
        const slotLabel = capitalizeWord(equipmentSlotSv(slot));
        const modalTitle = pieceName ?? slotLabel;
        const catalogRow = equipped ? equipmentCatalogByEquippedName(pieceName) : undefined;
        const bodyLines = equipped ? equipmentModalDetailLines(slot, equipPiece, pieceName) : [];
        const uniqueArt = pieceName ? equipmentUniqueImageSrc(pieceName) : null;
        return (
          <Modal
            cardCoverId={lobbyCardCoverId}
            title={modalTitle}
            onClose={() => setEquipDetail(null)}
            instantFront
            hideClose
            titleStyle={ITEM_MODAL_TITLE_STYLE}
            headerRight={
              equipped ? (
                <EquipmentModalEffectBadge
                  piece={equipPiece}
                  playerGold={me.gold}
                  burkSetEquippedCount={
                    (slot === "armor" && pieceName === BEER_CAN_RUSTNING_NAME) ||
                    (slot === "helmet" && pieceName === BEER_CAN_HELM1_NAME) ||
                    (slot === "accessory" && pieceName && isBeerCanShieldName(pieceName))
                      ? beerCanSetPiecesEquippedCount(me)
                      : undefined
                  }
                  player={me}
                />
              ) : undefined
            }
          >
            <div className={u.stack10}>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #ffffff22",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: equipped && uniqueArt ? 12 : 14,
                  boxSizing: "border-box",
                  minHeight: 0,
                }}
              >
                <EquipIcon
                  slot={slot}
                  disabled={false}
                  equippedName={equipped ? pieceName : undefined}
                  iconSize={equipped && uniqueArt ? undefined : 96}
                />
              </div>
              {!equipped ? (
                <div style={{ opacity: 0.9, fontSize: 15 }}>{sv.play.emptySlot}</div>
              ) : (
                <>
                  {bodyLines.length > 0 ? (
                    <div className={u.stack8Fs15}>
                      {bodyLines.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  ) : null}
                  {catalogRow?.rulesText ? (
                    <div
                      style={{
                        opacity: 0.88,
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {catalogRow.rulesText}
                    </div>
                  ) : null}
                  {pieceName === "Plastback" && isMyTurn ? (
                    <ArcadeButton
                      variant="pink"
                      fullWidth
                      onClick={() => {
                        send({ type: "sellAccessory", playerId: me.id });
                        setEquipDetail(null);
                      }}
                    >
                      {sv.play.sellPlastbackAccessory(
                        me.equipment.weapon?.name === "Tom flaska" &&
                          typeof me.equipment.weapon?.breakWinsRemaining === "number"
                          ? me.equipment.weapon.breakWinsRemaining
                          : 0,
                      )}
                    </ArcadeButton>
                  ) : null}
                </>
              )}
            </div>
          </Modal>
        );
      })()}

      {itemDetail && me && state && (() => {
        const inst = (me.inventory ?? []).find((x) => x.instanceId === itemDetail.instanceId);
        const modalTitle = inst ? itemMetaForView(inst.itemId).title : sv.play.itemNotFound;
        return (
          <Modal
            cardCoverId={lobbyCardCoverId}
            title={modalTitle}
            onClose={() => setItemDetail(null)}
            instantFront
            hideClose
            headerRight={
              inst ? (
                <ItemModalEffectBadge
                  itemId={inst.itemId}
                  instance={inst}
                  opts={itemInvBadgeOpts}
                />
              ) : undefined
            }
            titleStyle={inst ? ITEM_MODAL_TITLE_STYLE : undefined}
          >
            {!inst ? (
              <div style={{ opacity: 0.9 }}>{sv.play.itemNotFound}</div>
            ) : (
              <div className={u.stack10}>
                <div className={styles.itemModalArtFrame}>
                  <img
                    src={itemImageSrc(inst.itemId)}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/card-placeholder.png";
                    }}
                    alt=""
                    aria-hidden
                    className={styles.itemModalArtImage}
                  />
                </div>
                <div style={{ opacity: 0.9, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                  {itemMetaForView(inst.itemId).text}
                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      {toast ? (
        <div className={styles.playToast} role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function PlayerStatCell(props: {
  ariaLabel: string;
  value: string;
  /** HP: maxliv visas utgråat efter nuvarande värde, t.ex. `"/10"`. */
  valueMutedSuffix?: string;
  /** HP: visuell varning när nuvarande HP är kritiskt lågt (≤3). */
  lowHpDanger?: boolean;
  icon: StatIconKind;
  iconSize?: number;
  flash?: StatFlash;
  flashKey?: number;
}) {
  const sz = props.iconSize ?? 40;
  const flash = props.flash ?? null;
  const radialTone = flash ? statsRadialToneClass(props.icon, flash) : null;
  const danger = !!props.lowHpDanger;
  const valueEl =
    props.valueMutedSuffix != null ? (
      <span className={styles.statsCellValueRow}>
        {danger ? (
          <span className={styles.statsHpCurrentWrap}>
            <span className={styles.statsHpDangerGlow} aria-hidden />
            <span className={`${styles.statsCellValue} ${styles.statsCellValueDanger}`}>{props.value}</span>
          </span>
        ) : (
          <span className={styles.statsCellValue}>{props.value}</span>
        )}
        <span className={styles.statsCellValueMuted}>{props.valueMutedSuffix}</span>
      </span>
    ) : (
      <span className={styles.statsCellValue}>{props.value}</span>
    );
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
      {valueEl}
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
  equippedPiece?: Player["equipment"][EquipmentSlot];
  /** Burk-set: antal utrustade delar (tier för rustning / Burkhjälm I / sköld). */
  burkSetEquippedCount?: number;
  /** Vapenbricka: pant för Burksvärd m.fl. (samma trösklar som i strid). */
  effectBadgeGold?: number;
  /** För hjälmbonus som följer spelarens klunkar (t.ex. Ölfylld rymdhjälm). */
  effectBadgePlayer?: Player;
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
  const legendaryBurkhjälmLocked =
    props.slot === "helmet" &&
    props.equipped &&
    isLegendariskBurkhjälmName(props.equippedName) &&
    brewerLevelForUi(props.effectBadgePlayer ?? ({ xp: 0 } as Player)) < BEER_HELM2_MIN_LEVEL;
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
        border: "none",
        background: disabled
          ? "radial-gradient(155% 100% at 50% 112%, rgba(107,114,128,0.52) 0%, rgba(31,41,55,0.62) 42%, rgba(0,0,0,0.66) 100%)"
          : legendaryBurkhjälmLocked
            ? "radial-gradient(175% 125% at 50% 114%, rgba(248,113,113,1) 0%, rgba(220,38,38,0.92) 24%, rgba(15,23,42,0.52) 52%, rgba(0,0,0,0.62) 100%)"
            : "radial-gradient(175% 125% at 50% 114%, rgba(34,211,238,1) 0%, rgba(14,165,233,0.92) 24%, rgba(15,23,42,0.52) 52%, rgba(0,0,0,0.62) 100%)",
        boxShadow: disabled
          ? "none"
          : legendaryBurkhjälmLocked
            ? "0 10px 22px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -22px 30px rgba(248,113,113,0.32)"
            : "0 10px 22px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -22px 30px rgba(34,211,238,0.28)",
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
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            minHeight: 0,
            display: "grid",
            gridTemplateAreas: '"stack"',
            gridTemplateRows: "1fr",
            gridTemplateColumns: "1fr",
          }}
        >
          <div
            style={{
              gridArea: "stack",
              minHeight: 0,
              overflow: "hidden",
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
            }}
          >
            <EquipIcon slot={props.slot} disabled={disabled} equippedName={props.equippedName} />
          </div>
          <EquipmentInventoryEffectBadges
            piece={props.equippedPiece}
            playerGold={props.slot === "weapon" ? props.effectBadgeGold : undefined}
            burkSetEquippedCount={props.burkSetEquippedCount}
            player={props.effectBadgePlayer}
          />
        </div>
      </LootFlashShell>
    </button>
  );
}

function EquipIcon(props: {
  slot: "weapon" | "armor" | "helmet" | "accessory";
  disabled: boolean;
  equippedName?: string;
  /** Endast slot-siluett (vapen/tröja/mössa/accessoar), aldrig unik art — t.ex. typmärke bredvid varubild. */
  genericOnly?: boolean;
  /** Pixelstorlek för generisk siluett (unik art: max storlek inom föräldern, `object-fit: contain`). */
  iconSize?: number;
}) {
  const uniqueSrc = props.genericOnly ? null : equipmentUniqueImageSrc(props.equippedName);
  // Note: provided file name is "accesory.svg" in public/equipment/accessory.
  const src =
    uniqueSrc ??
    (props.slot === "weapon"
      ? "/equipment/weapon/weapon.svg"
      : props.slot === "armor"
        ? "/equipment/armor/armor.svg"
        : props.slot === "helmet"
          ? "/equipment/helmet/helmet.svg"
          : "/equipment/accessory/accesory.svg");
  const tintFilter = uniqueSrc
    ? props.disabled
      ? "grayscale(0.6) brightness(0.9) opacity(0.72)"
      : "drop-shadow(0 0 8px rgba(96,165,250,0.28))"
    : props.disabled
      ? "brightness(0) invert(0.78) opacity(0.72)"
      : "brightness(0) invert(0.98) drop-shadow(0 0 8px rgba(96,165,250,0.38))";
  const genericPx = props.iconSize ?? 36;
  const size = uniqueSrc ? undefined : genericPx;
  const sources =
    uniqueSrc != null
      ? equipmentImageSources(props.equippedName ?? "", props.slot)
      : { fallback: src };
  if (!uniqueSrc) {
    return (
      <img
        src={src}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            props.slot === "weapon"
              ? "/equipment/weapon/weapon.svg"
              : props.slot === "armor"
                ? "/equipment/armor/armor.svg"
                : props.slot === "helmet"
                  ? "/equipment/helmet/helmet.svg"
                  : "/equipment/accessory/accesory.svg";
        }}
        alt=""
        aria-hidden
        style={{
          width: size,
          height: size,
          margin: "auto",
          objectFit: "contain",
          objectPosition: "center",
          borderRadius: 0,
          display: "block",
          flexShrink: 0,
          filter: tintFilter,
        }}
      />
    );
  }
  return (
    <PictureImg
      sources={sources}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src =
          props.slot === "weapon"
            ? "/equipment/weapon/weapon.svg"
            : props.slot === "armor"
              ? "/equipment/armor/armor.svg"
              : props.slot === "helmet"
                ? "/equipment/helmet/helmet.svg"
                : "/equipment/accessory/accesory.svg";
      }}
      alt=""
      aria-hidden
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center",
        borderRadius: uniqueSrc ? 12 : 0,
        display: "block",
        flexShrink: 0,
        filter: tintFilter,
      }}
    />
  );
}

function merchantHealArtSrc(name: string): string {
  return equipmentUniqueImageSrc(name) ?? "/items/healing-potion.webp";
}

const MERCHANT_ART_FRAME: CSSProperties = {
  width: 52,
  height: 52,
  flexShrink: 0,
  borderRadius: 8,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(72, 75, 85, 0.95)",
  boxSizing: "border-box",
};

/** Halv storlek jämfört med tidigare typ-badge (~36px → 18px). */
const MERCHANT_TYPE_ICON_PX = 18;

function MerchantShopItemArt(props: { item: ShopItem }) {
  const { item } = props;
  if (item.slot === "heal") {
    const src = merchantHealArtSrc(item.name);
    const sources = src.endsWith(".webp") ? { avif: src.slice(0, -".webp".length) + ".avif", webp: src, fallback: src } : { fallback: src };
    return (
      <div style={MERCHANT_ART_FRAME}>
        <PictureImg
          sources={sources}
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

type ItemUseTarget = "self" | "other" | "self_or_other" | "combat" | "combat_bro" | "passive";

const ITEM_TARGET: Record<string, ItemUseTarget> = {
  healing_potion: "self_or_other",
  sleep_potion: "other",
  sip_card: "other",
  weak_beer: "combat",
  light_beer: "combat",
  folk_beer: "combat",
  tripwire: "combat",
  double_hops: "combat",
  beer_bomb: "combat",
  manopositiv: "combat",
  beard_back: "self",
  hangover: "combat",
  paidassasin: "combat",
  pretzel_snack: "self_or_other",
  coin_purse: "self",
  charity: "self",
  shortcut: "self",
  taproom_key: "self",
  six_sense: "self",
  rigged_game: "other",
  monster_hype: "combat",
  yeast_sabotage: "combat",
  beer_bro: "combat_bro",
  split_the_g: "other",
  shuffle: "other",
  lengraddad: "combat",
  canman: "passive",
  not_my_round: "other",
  spill_intentional: "other",
  early_night: "combat",
  bribes: "combat",
  get_lucky: "combat",
};

/** Föremål som kan spelas vid ingripande i andras PvE-strid (reaktionsfasen). */
const COMBAT_INTERVENE_PLAYABLE_ITEM_IDS = new Set<string>([
  "weak_beer",
  "light_beer",
  "folk_beer",
  "tripwire",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "hangover",
  "paidassasin",
  "monster_hype",
  "yeast_sabotage",
  "beer_bro",
  "get_lucky",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
]);

/** Ingripandekort i andras strider — röd/grön ton i inventory (PlayView `itemCardTone`, baserat på faktisk spelbarhet). */
const COMBAT_INTERVENE_EVIL_ITEM_IDS = new Set<string>([
  "weak_beer",
  "tripwire",
  "hangover",
  "paidassasin",
  "monster_hype",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
  "yeast_sabotage",
]);
const COMBAT_INTERVENE_GOOD_ITEM_IDS = new Set<string>([
  "light_beer",
  "folk_beer",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "get_lucky",
  "beer_bro",
]);

function inventoryGroupSortTier(itemId: string): number {
  if (COMBAT_INTERVENE_GOOD_ITEM_IDS.has(itemId)) return 0;
  if (COMBAT_INTERVENE_EVIL_ITEM_IDS.has(itemId)) return 1;
  return 2;
}
/** Spelbara kort som primärt är debuff/sabotage ska få röd ton i inventory. */
const PLAYABLE_DEBUFF_ITEM_IDS = new Set<string>([
  "weak_beer",
  "tripwire",
  "hangover",
  "paidassasin",
  "monster_hype",
  "lengraddad",
  "not_my_round",
  "spill_intentional",
  "rigged_game",
  "sleep_potion",
  "yeast_sabotage",
]);
const PVP_PRE_ROUND_ITEM_IDS = new Set<string>([
  "weak_beer",
  "light_beer",
  "folk_beer",
  "tripwire",
  "double_hops",
  "beer_bomb",
  "manopositiv",
  "hangover",
  "monster_hype",
  "yeast_sabotage",
  "spill_intentional",
  "beard_back",
  "six_sense",
  "paidassasin",
  "lengraddad",
]);

/** Effektrader för modal: samma sammandrag som i affären när prylen finns i katalogen (annars fallback). */
function equipmentModalDetailLines(
  slot: EquipmentSlot,
  piece: Player["equipment"][EquipmentSlot] | undefined,
  pieceName: string | undefined,
): string[] {
  const cat = equipmentCatalogByEquippedName(pieceName);
  if (cat) {
    const s = formatShopItemEffectSummary(cat);
    if (s && s !== "—") return s.split(" · ").map((x) => x.trim());
    return [];
  }
  return equipmentModalEffectLines(slot, piece);
}

function equipmentModalEffectLines(
  slot: EquipmentSlot,
  piece?: Player["equipment"][EquipmentSlot],
): string[] {
  if (!piece) return [];
  const lines: string[] = [];
  if ("power" in piece && typeof piece.power === "number" && piece.power > 0) {
    lines.push(sv.play.powerPlus(piece.power));
  }
  if ("gainGoldOnWin" in piece && typeof piece.gainGoldOnWin === "number" && piece.gainGoldOnWin > 0) {
    lines.push(`Vid vinst: +${piece.gainGoldOnWin} pant.`);
  }
  if ("randomOtherDamageOnWin" in piece && typeof piece.randomOtherDamageOnWin === "number" && piece.randomOtherDamageOnWin > 0) {
    lines.push(`Vid vinst: slumpad annan spelare tar ${piece.randomOtherDamageOnWin} skada.`);
  }
  if ("powerAtGold10" in piece && typeof piece.powerAtGold10 === "number") {
    lines.push(`Vid 10+ pant: kraft +${piece.powerAtGold10}.`);
  }
  if ("powerAtGold20" in piece && typeof piece.powerAtGold20 === "number") {
    lines.push(`Vid 20+ pant: kraft +${piece.powerAtGold20}.`);
  }
  if ("powerAtGold30" in piece && typeof piece.powerAtGold30 === "number") {
    lines.push(`Vid 30+ pant: kraft +${piece.powerAtGold30}.`);
  }
  if ("combatBonus" in piece && typeof piece.combatBonus === "number" && piece.combatBonus > 0) {
    lines.push(sv.play.combatBonus(piece.combatBonus));
  }
  if ("bonusHp" in piece && typeof (piece as { bonusHp?: number }).bonusHp === "number") {
    const bh = (piece as { bonusHp?: number }).bonusHp ?? 0;
    if (bh > 0) lines.push(sv.play.bonusHp(bh));
  }
  if ("healHpPerTurn" in piece && typeof (piece as { healHpPerTurn?: number }).healHpPerTurn === "number") {
    const ht = (piece as { healHpPerTurn?: number }).healHpPerTurn ?? 0;
    if (ht > 0) lines.push(sv.play.healHpPerTurn(ht));
  }
  if ("damageNegate" in piece && typeof piece.damageNegate === "number" && piece.damageNegate > 0) {
    lines.push(sv.play.negatePerHit(piece.damageNegate));
  }
  if ("negateAllOnce" in piece && piece.negateAllOnce) {
    lines.push(sv.play.armorNegateAllOnce);
  }
  if ("moveBonus" in piece && typeof piece.moveBonus === "number" && piece.moveBonus > 0) {
    lines.push(sv.play.moveSteps(piece.moveBonus));
  }
  if ("pvpDieBonus" in piece && typeof piece.pvpDieBonus === "number") {
    lines.push(sv.play.pvpWeaponDieBonus(piece.pvpDieBonus));
  }
  if ("sipAttackBonus" in piece && typeof piece.sipAttackBonus === "number" && piece.sipAttackBonus > 0) {
    const wp = piece as Weapon;
    const kl = Math.max(0, Math.floor(wp.sipWeaponBonusKlunks ?? 0));
    if (kl > 0) {
      const basePow = typeof wp.power === "number" ? wp.power : 1;
      const tot = basePow + piece.sipAttackBonus;
      lines.push(
        `Strid mot monster: valfritt ${kl} klunk före stridstärningen → +${tot} attack från vapnet (+${basePow} utan klunk).`,
      );
    } else {
      const weaponPantCost =
        typeof wp.sipWeaponBonusGoldCost === "number"
          ? Math.max(0, Math.floor(wp.sipWeaponBonusGoldCost))
          : piece.name === "Dubbelpipa"
            ? 4
            : piece.name === "Enkelpipa"
              ? 2
              : 0;
      lines.push(
        weaponPantCost > 0
          ? `Strid mot monster: valfri betalning ${weaponPantCost} pant före stridstärningen för +${piece.sipAttackBonus} attack.`
          : `Strid mot monster: valfri bonus före stridstärningen för +${piece.sipAttackBonus} attack.`,
      );
    }
  }
  if ("pvpCannotBeChallenged" in piece && piece.pvpCannotBeChallenged) {
    lines.push("Andra spelare kan inte utmana dig till BvB, men du kan utmana dem.");
  }
  if ("gainGoldOnDamageTaken" in piece && typeof piece.gainGoldOnDamageTaken === "number" && piece.gainGoldOnDamageTaken > 0) {
    lines.push(`När du tar skada: få +${piece.gainGoldOnDamageTaken} pant.`);
  }
  if ("bossDamageNegateBonus" in piece && typeof piece.bossDamageNegateBonus === "number" && piece.bossDamageNegateBonus > 0) {
    lines.push(`Mot boss: nollställ ytterligare ${piece.bossDamageNegateBonus} skada per träff.`);
  }
  if ("penaltySipExtra" in piece && typeof piece.penaltySipExtra === "number" && piece.penaltySipExtra > 0) {
    lines.push(`När du får straffklunk: drick ${piece.penaltySipExtra} extra klunk.`);
  }
  if (
    piece.name !== "Tygkasse" &&
    "gainGoldPerPenaltyKlunk" in piece &&
    typeof (piece as { gainGoldPerPenaltyKlunk?: number }).gainGoldPerPenaltyKlunk === "number"
  ) {
    const gpk = Math.max(0, Math.floor((piece as { gainGoldPerPenaltyKlunk?: number }).gainGoldPerPenaltyKlunk ?? 0));
    if (gpk > 0) lines.push(`Per straffklunk: +${gpk} pant.`);
  }
  if ("klunkAttackBonus10" in piece && typeof piece.klunkAttackBonus10 === "number") {
    lines.push(`Vid 10+ klunkar: +${piece.klunkAttackBonus10} attack.`);
  }
  if ("klunkAttackBonus20" in piece && typeof piece.klunkAttackBonus20 === "number") {
    lines.push(`Vid 20+ klunkar: +${piece.klunkAttackBonus20} attack.`);
  }
  if (slot === "helmet" && lines.length === 0) return [];
  return lines;
}

const ITEM_MODAL_TITLE_STYLE: CSSProperties = {
  fontFamily: '"Permanent Marker", var(--heading), sans-serif',
  fontWeight: 400,
  fontSize: "clamp(1.05rem, 4.2vw, 1.35rem)",
  letterSpacing: "0.02em",
  lineHeight: 1.15,
};

/** Rubrik höger i föremålsmodal: samma data som inventory-brickan, större och i rad. */
function ItemModalEffectBadge({
  itemId,
  instance,
  opts,
}: {
  itemId: string;
  instance?: ItemInstance | null;
  opts?: ItemInventoryBadgeOpts;
}) {
  const b = itemInventoryEffectBadge(itemId, instance, opts);
  if (!b) return null;
  const danger = b.labelTone === "danger";
  const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
  if (b.iconAfter) {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 12,
          background: "rgba(11,18,38,0.88)",
          border: danger ? "1px solid rgba(248,113,113,0.45)" : "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            color: danger ? "#fca5a5" : "#f8fafc",
            textShadow: danger ? "0 0 10px rgba(248,113,113,0.5)" : undefined,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {b.label}
        </span>
        <img
          src={src}
          alt=""
          width={20}
          height={20}
          draggable={false}
          style={{
            display: "block",
            objectFit: "contain",
            filter: danger
              ? "brightness(0) invert(1) drop-shadow(0 0 5px rgba(248,113,113,0.95))"
              : "brightness(0) invert(1)",
          }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 12,
        background: "rgba(11,18,38,0.88)",
        border: danger ? "1px solid rgba(248,113,113,0.45)" : "1px solid rgba(255,255,255,0.22)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt=""
        width={20}
        height={20}
        draggable={false}
        style={{
          display: "block",
          objectFit: "contain",
          filter: danger
            ? "brightness(0) invert(1) drop-shadow(0 0 5px rgba(248,113,113,0.95))"
            : "brightness(0) invert(1)",
        }}
      />
      <span
        style={{
          fontSize: 15,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          color: danger ? "#fca5a5" : "#f8fafc",
          textShadow: danger ? "0 0 10px rgba(248,113,113,0.5)" : undefined,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {b.label}
      </span>
    </span>
  );
}

function EquipmentModalEffectBadge(props: {
  piece?: Player["equipment"][EquipmentSlot];
  playerGold?: number;
  burkSetEquippedCount?: number;
  player?: Player;
}) {
  const badges = equipmentInventoryEffectBadges(
    props.piece,
    props.playerGold,
    props.burkSetEquippedCount,
    props.player,
  );
  if (badges.length === 0) return null;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
      }}
    >
      {badges.map((b, idx) => {
        const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
        const danger = b.labelTone === "danger";
        return (
          <span
            key={`${idx}-${b.icon}:${b.label}:${b.labelTone ?? ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 12,
              background: "rgba(11,18,38,0.88)",
              border: danger ? "1px solid rgba(248,113,113,0.45)" : "1px solid rgba(255,255,255,0.22)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
            }}
          >
            <img
              src={src}
              alt=""
              width={20}
              height={20}
              draggable={false}
              style={{
                display: "block",
                objectFit: "contain",
                filter: danger
                  ? "brightness(0) invert(1) drop-shadow(0 0 5px rgba(248,113,113,0.95))"
                  : "brightness(0) invert(1)",
              }}
            />
            <span
              style={{
                fontSize: 15,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                color: danger ? "#fca5a5" : "#f8fafc",
                textShadow: danger ? "0 0 10px rgba(248,113,113,0.5)" : undefined,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {b.label}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Attack-effekt på föremålsbricka: stor färgkodad text med outline, utan ikon/bakgrund (övre vänster). */
function ItemInventoryAttackCorner({ itemId, instance }: { itemId: string; instance?: ItemInstance | null }) {
  const b = itemInventoryEffectBadge(itemId, instance);
  if (!b || b.icon !== "attack") return null;
  const raw = b.label.trim();
  const isNegative =
    b.labelTone === "danger" || /^[\u2212-]/.test(raw) || raw.startsWith("−");
  const isPositive = raw.startsWith("+") || (raw.startsWith("×") && raw.length > 1);
  const fill = isNegative ? "#f87171" : isPositive ? "#4ade80" : "#f1f5f9";
  const outlineDirs: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  const outline = [1, 2, 3]
    .flatMap((r) => outlineDirs.map(([dx, dy]) => `${dx * r}px ${dy * r}px 0 #0a0a12`))
    .join(", ");
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        top: 4,
        left: 4,
        zIndex: 3,
        fontFamily: "var(--sans), system-ui, sans-serif",
        fontSize: "clamp(16px, 5vw, 24px)",
        fontWeight: 900,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        letterSpacing: "-0.03em",
        color: fill,
        textShadow: outline,
        pointerEvents: "none",
      }}
    >
      {b.label}
    </span>
  );
}

function ItemInventoryEffectBadge({
  itemId,
  instance,
  opts,
}: {
  itemId: string;
  instance?: ItemInstance | null;
  opts?: ItemInventoryBadgeOpts;
}) {
  const b = itemInventoryEffectBadge(itemId, instance, opts);
  if (!b || b.icon === "attack") return null;
  const danger = b.labelTone === "danger";
  const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
  if (b.iconAfter) {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "clamp(2px, 0.55vw, 3px)",
          padding: "clamp(2px, 0.55vw, 3px) clamp(4px, 1.15vw, 5px)",
          borderRadius: 999,
          background: "rgba(11,18,38,0.92)",
          border: danger ? "1px solid rgba(248,113,113,0.42)" : "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: "clamp(10px, 2.8vw, 11px)",
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            color: danger ? "#fca5a5" : "#f8fafc",
            textShadow: danger ? "0 0 6px rgba(248,113,113,0.45)" : undefined,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {b.label}
        </span>
        <img
          src={src}
          alt=""
          width={14}
          height={14}
          draggable={false}
          style={{
            display: "block",
            width: "clamp(12px, 3.4vw, 15px)",
            height: "clamp(12px, 3.4vw, 15px)",
            objectFit: "contain",
            filter: danger
              ? "brightness(0) invert(1) drop-shadow(0 0 4px rgba(248,113,113,0.9))"
              : "brightness(0) invert(1)",
          }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "clamp(2px, 0.55vw, 3px)",
        padding: "clamp(2px, 0.55vw, 3px) clamp(4px, 1.15vw, 5px)",
        borderRadius: 999,
        background: "rgba(11,18,38,0.92)",
        border: danger ? "1px solid rgba(248,113,113,0.42)" : "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}
    >
      <img
        src={src}
        alt=""
        width={14}
        height={14}
        draggable={false}
        style={{
          display: "block",
          width: "clamp(12px, 3.4vw, 15px)",
          height: "clamp(12px, 3.4vw, 15px)",
          objectFit: "contain",
          filter: danger
            ? "brightness(0) invert(1) drop-shadow(0 0 4px rgba(248,113,113,0.9))"
            : "brightness(0) invert(1)",
        }}
      />
      <span
        style={{
          fontSize: "clamp(10px, 2.8vw, 11px)",
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          color: danger ? "#fca5a5" : "#f8fafc",
          textShadow: danger ? "0 0 6px rgba(248,113,113,0.45)" : undefined,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {b.label}
      </span>
    </span>
  );
}

function ItemInventoryCostBadge({ itemId }: { itemId: string }) {
  const itemCost: Record<string, number> = {
    six_sense: 5,
    get_lucky: 5,
    manopositiv: 10,
    beard_back: 5,
    rigged_game: 5,
    spill_intentional: 2,
    bribes: 10,
    paidassasin: 15,
  };
  const cost = itemCost[itemId] ?? 0;
  if (cost <= 0) return null;
  const src = ITEM_EFFECT_BADGE_ICONS.pant;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "clamp(2px, 0.55vw, 3px)",
        padding: "clamp(2px, 0.55vw, 3px) clamp(4px, 1.15vw, 5px)",
        borderRadius: 999,
        background: "rgba(11,18,38,0.92)",
        border: "1px solid rgba(248,113,113,0.42)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontSize: "clamp(10px, 2.8vw, 11px)",
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          color: "#fca5a5",
          textShadow: "0 0 6px rgba(248,113,113,0.45)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        -{cost}
      </span>
      <img
        src={src}
        alt=""
        width={14}
        height={14}
        draggable={false}
        style={{
          display: "block",
          width: "clamp(12px, 3.4vw, 15px)",
          height: "clamp(12px, 3.4vw, 15px)",
          objectFit: "contain",
          filter: "brightness(0) invert(1) drop-shadow(0 0 4px rgba(248,113,113,0.9))",
        }}
      />
    </span>
  );
}

function EquipmentInventoryEffectBadges(props: {
  piece?: Player["equipment"][EquipmentSlot];
  playerGold?: number;
  burkSetEquippedCount?: number;
  player?: Player;
}) {
  const badges = equipmentInventoryEffectBadges(
    props.piece,
    props.playerGold,
    props.burkSetEquippedCount,
    props.player,
  );
  if (badges.length === 0) return null;
  const cornerStyle = (idx: number): CSSProperties => {
    const row = Math.floor(idx / 2);
    if (idx % 2 === 0) return { bottom: 3 + row * 23, right: 3 };
    return { bottom: 3 + row * 23, left: 3 };
  };
  return (
    <span
      aria-hidden
      style={{
        gridArea: "stack",
        position: "relative",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {badges.map((b, idx) => {
        const src = ITEM_EFFECT_BADGE_ICONS[b.icon];
        const danger = b.labelTone === "danger";
        return (
          <span
            key={`${idx}-${b.icon}:${b.label}:${b.labelTone ?? ""}`}
            style={{
              position: "absolute",
              ...cornerStyle(idx),
              display: "inline-flex",
              alignItems: "center",
              gap: "clamp(2px, 0.55vw, 3px)",
              padding: "clamp(2px, 0.55vw, 3px) clamp(4px, 1.15vw, 5px)",
              borderRadius: 999,
              background: "rgba(11,18,38,0.92)",
              border: danger ? "1px solid rgba(248,113,113,0.42)" : "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
              maxWidth: "100%",
            }}
          >
            <img
              src={src}
              alt=""
              width={14}
              height={14}
              draggable={false}
              style={{
                display: "block",
                width: "clamp(12px, 3.4vw, 15px)",
                height: "clamp(12px, 3.4vw, 15px)",
                objectFit: "contain",
                filter: danger
                  ? "brightness(0) invert(1) drop-shadow(0 0 4px rgba(248,113,113,0.9))"
                  : "brightness(0) invert(1)",
              }}
            />
            <span
              style={{
                fontSize: "clamp(10px, 2.8vw, 11px)",
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                color: danger ? "#fca5a5" : "#f8fafc",
                textShadow: danger ? "0 0 6px rgba(248,113,113,0.45)" : undefined,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {b.label}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function itemMeta(itemId: any): { title: string; text: string; target: ItemUseTarget } {
  const id = String(itemId);
  const row = (sv.items as Record<string, { title: string; text: string } | undefined>)[id];
  if (row) return { title: row.title, text: row.text, target: ITEM_TARGET[id] ?? "self" };
  return { title: id, text: "", target: "self" };
}

function itemTitle(itemId: any): string {
  return itemMeta(itemId).title;
}

function SettingsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.8l2.2 1 .5 2.4 2.2.9 2-1.3 1.8 1.8-1.2 2 .9 2.2 2.3.5v2.6l-2.3.5-.9 2.2 1.2 2-1.8 1.8-2-1.3-2.2.9-.5 2.4-2.2 1-2.2-1-.5-2.4-2.2-.9-2 1.3-1.8-1.8 1.2-2-.9-2.2-2.3-.5v-2.6l2.3-.5.9-2.2-1.2-2L5.1 4.8l2 1.3 2.2-.9.5-2.4z" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  );
}

function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2.1">
      {collapsed ? <path d="M6 14l6-6 6 6" /> : <path d="M6 10l6 6 6-6" />}
    </svg>
  );
}

function Modal(props: {
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
          background: "#0b1226",
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
                {sv.play.modalClose}
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

function titleCaseTileType(t: string): string {
  return (tileTypeSv as Record<string, string>)[t] ?? String(t);
}

/** Pant som krävs för nivå upp via dörren — samma som vid `door`-pending (rabatt på tillbehör). */
function doorTileAscendGoldCost(
  state: GameState,
  playerId: string,
  doorLevelIndex: number,
  doorTileIndex: number,
): number | null {
  const tile = state.levels[doorLevelIndex]?.tiles[doorTileIndex];
  if (!tile || tile.type !== "door") return null;
  const targetLevelIndex = tile.doorTargetLevelIndex ?? doorLevelIndex + 1;
  const base = levelUpCostsForTargetLevel(targetLevelIndex);
  const me = state.players.find((p) => p.id === playerId);
  const discount = me?.equipment.accessory?.levelUpDiscountGold ?? 0;
  return Math.max(0, base.gold - Math.max(0, discount));
}

function MoveOptionLabel(props: {
  state: GameState;
  meId: string;
  levelIndex: number;
  tileIndex: number;
  tileType: TileType;
}) {
  const hasOtherPlayer = props.state.players.some(
    (p) =>
      p.id !== props.meId &&
      p.levelIndex === props.levelIndex &&
      p.tileIndex === props.tileIndex,
  );
  const tileVisual = moveChoiceTileVisual(props.tileType);
  const tileLabel = titleCaseTileType(props.tileType);
  const primary = hasOtherPlayer ? `${sv.play.moveChoiceBvbLabel} / ${tileLabel}` : tileLabel;
  const showDoorPant = props.tileType === "door" && !hasOtherPlayer;
  const doorGoldCost = showDoorPant
    ? doorTileAscendGoldCost(props.state, props.meId, props.levelIndex, props.tileIndex)
    : null;
  return (
    <span className={u.spanStack2Center}>
      <span
        style={{
          fontWeight: 900,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          lineHeight: 1.15,
        }}
      >
        <span
          className={styles.moveChoiceTileIconBadge}
          aria-hidden
        >
          <img
            src={tileVisual.src}
            alt=""
            width={tileVisual.monochrome ? 22 : 26}
            height={tileVisual.monochrome ? 22 : 26}
            draggable={false}
            className={[styles.moveChoiceTileIconImg, tileVisual.monochrome ? styles.moveChoiceTileIconImgMono : ""]
              .filter(Boolean)
              .join(" ")}
          />
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          <span>{primary}</span>
          {showDoorPant && doorGoldCost != null ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {"("}
              {doorGoldCost}
              <img
                src="/icons/pant-icon.svg"
                alt=""
                width={15}
                height={15}
                draggable={false}
                style={{
                  display: "block",
                  objectFit: "contain",
                  flexShrink: 0,
                  filter: "brightness(0) invert(1)",
                  opacity: 0.95,
                }}
              />
              {")"}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
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

function EnemyIntroModal(props: {
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
}) {
  const bossRoundLabel = (() => {
    const raw = props.bossLivesRemaining;
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    const lives = Math.max(1, Math.min(FINAL_BOSS_LIFE_TOTAL, Math.floor(raw)));
    const round = FINAL_BOSS_LIFE_TOTAL - lives + 1;
    return `RUNDA ${round} AV ${FINAL_BOSS_LIFE_TOTAL}`;
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
            DU MÖTER
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
            {sv.play.teammatePicked(props.teammateName)}
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
            background: "#0b1226",
            padding: 16,
            color: "#ffffff",
            textAlign: "center",
            minHeight: "100%",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, opacity: 0.95 }}>{props.enemyName}</div>
          <div style={{ opacity: 0.9 }}>
            {sv.play.strength}: <b>{props.need + (props.needMod ?? 0)}</b>
          </div>
        </div>
      )}
    </CardFlipModalShell>
  );
}

const SIP_NOTICE_FROM_COLOR = "#fb923c";

function SipNoticeCardModal(props: {
  fromPlayerName: string;
  klunkCount: number;
  customTitle?: string;
  customBody?: string;
  noticeKind?: SipNoticeKind;
}) {
  const from = props.fromPlayerName?.trim() || sv.sipNotice.fallbackFrom;
  const count = Math.max(1, Math.floor(props.klunkCount));
  const hasCustom = !!props.customTitle || !!props.customBody;
  const duelLoss = props.noticeKind === "duel_loss";
  const title = props.customTitle?.trim() || sv.sipNotice.title;
  const body = props.customBody?.trim();
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
          background: "#0b1226",
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
            {sv.sipNotice.bodyPrefix(count)}
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
            {sv.sipNotice.xpGain(count)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CardModal(props: {
  title: string;
  text: string;
  artKey?: string;
  grantedItemId?: string;
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
  const effectiveArtKey = resolveCardRevealArtKey(props.artKey, props.grantedItemId, {
    cardText: props.text,
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
                background: "#0b1226",
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
            sheetTitle={props.title}
            titleStyle={{ textAlign: "center", fontSize: 22, letterSpacing: "0.02em", marginBottom: 14 }}
          >
            <LevelUpLockedCardContent text={props.text} />
          </CombatSheetFrame>
        ) : showTreasure ? (
          <CombatSheetFrame sheetTitle={sv.play.treasureCardSheetTitle}>
            <TreasureCardContent title={props.title} text={props.text} cardId={props.cardId} />
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
                background: "#0b1226",
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
                  {props.title}
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
              <div
                style={{
                  opacity: 0.98,
                  color: "#e5e7eb",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.45,
                  fontSize: 15,
                }}
              >
                {props.text}
              </div>
              <div
                style={{
                  opacity: 0.62,
                  fontSize: 12,
                  lineHeight: 1.35,
                  marginTop: 12,
                  color: "rgba(226, 232, 240, 0.9)",
                }}
              >
                {sv.cardModal.hintOwnerContinue}
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
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: "#ffffff" }}>{props.title}</div>
            ) : null}
            {useMonsterLayout && mon ? (
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginBottom: 0 }}>
                <MonsterEncounterCard
                  title={props.title}
                  artKey={effectiveArtKey}
                  combatStrength={monsterScaled?.need ?? mon.strength}
                  winGold={monsterScaled?.rewardGold ?? mon.rewardGold}
                  winItems={monsterScaled?.rewardItems ?? mon.rewardItems}
                  winXp={monsterScaled?.rewardXp ?? mon.rewardXp}
                  lossDamage={monsterScaled?.baseDamage ?? mon.baseDamage}
                  lossKlunks={monsterLossKlunkTotal(mon)}
                  specialRules={props.text.trim() || undefined}
                  fillAvailableHeight
                />
              </div>
            ) : (
              <>
                <CardArtFrame artKey={effectiveArtKey} />
                <div style={{ opacity: 0.98, color: "#ffffff", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                  {props.text}
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

