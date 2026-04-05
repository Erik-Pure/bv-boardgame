export type TileType =
  | "empty"
  | "event"
  | "combat"
  | "merchant"
  | "door"
  | "rest"
  | "treasure"
  | "boss";

export type EquipmentSlot = "weapon" | "armor" | "helmet" | "accessory";

export type ItemId =
  | "healing_potion"
  | "sleep_potion"
  | "sip_card"
  | "weak_beer"
  | "light_beer"
  | "folk_beer"
  | "tripwire"
  | "beer_bomb"
  | "beard_back"
  | "hangover"
  | "pretzel_snack"
  | "coin_purse"
  | "double_hops"
  | "monster_hype"
  | "yeast_sabotage"
  | "beer_bro";

export interface ItemInstance {
  instanceId: string;
  itemId: ItemId;
}

export interface Weapon {
  name: string;
  power: number;
}

export interface ArmorPiece {
  name: string;
  bonusHp: number;
  /** Damage reduced per hit (sum is capped elsewhere). */
  damageNegate?: number;
  /** If true: negates all damage once, then breaks. */
  negateAllOnce?: boolean;
}

export interface Helmet {
  name: string;
  /** +1 till stridsslag t.o.m. nästa duell */
  combatBonus?: number;
  damageNegate?: number;
}

export interface Accessory {
  name: string;
  damageNegate?: number;
  /** Extra steps added to movement roll. */
  moveBonus?: number;
}

export interface Equipment {
  weapon?: Weapon;
  armor?: ArmorPiece;
  helmet?: Helmet;
  accessory?: Accessory;
}

export interface Tile {
  id: string;
  type: TileType;
  /** Stridsvärde för monster / boss */
  combatValue?: number;
  /** Dörr: kräv brewerLevel >= detta för att gå vidare */
  doorMinLevel?: number;
  /** Mål-nivåindex (t.ex. 0..3) när man passerar dörr */
  doorTargetLevelIndex?: number;
  bossName?: string;
}

export interface LevelBoard {
  tiles: Tile[];
}

export interface ShopItem {
  id: string;
  slot: EquipmentSlot | "heal" | "gold";
  name: string;
  price: number;
  /** vapen */
  power?: number;
  /** rustning */
  bonusHp?: number;
  damageNegate?: number;
  negateAllOnce?: boolean;
  moveBonus?: number;
  healAmount?: number;
  goldAmount?: number;
}

/** Visning av vinst efter strid (`cardId === "combat_win"`). */
export interface CombatWinSummary {
  winnerName: string;
  enemyName: string;
  rollTotal: number;
  need: number;
  rewardGold: number;
  rewardItems: number;
  teammateName?: string;
}

/** Visning av förlust efter strid (`cardId === "combat_lose"`). */
export interface CombatLoseSummary {
  playerName: string;
  enemyName: string;
  rollTotal: number;
  need: number;
  damage: number;
  klunkGained: number;
  assistRollNote?: string;
  redirectNote?: string;
  lostEquipmentName?: string;
  /** Imperial Drak-Stout: granne på brädet tog 1 skada. */
  imperialAdjacentSplash?: boolean;
}

export type Pending =
  | { type: "merchant"; items: ShopItem[]; playerId: string }
  | {
      type: "moveChoice";
      playerId: string;
      /** Total steps (d6 + move item bonus). */
      die: number;
      /** Raw d6 result (1–6) for visuals / physical die face. */
      baseDie: number;
      from: { levelIndex: number; tileIndex: number };
      options: Array<{
        dir: "cw" | "ccw";
        target: { levelIndex: number; tileIndex: number };
        tileType: TileType;
        label: string;
      }>;
    }
  | {
      type: "card";
      playerId: string;
      cardId: string;
      kind: "event" | "combat" | "rest" | "treasure" | "empty";
      title: string;
      text: string;
      /** Nyckel för framtida SVG/bild, t.ex. "event/spill" */
      artKey?: string;
      choices?: Array<{ id: string; label: string }>;
      combatWin?: CombatWinSummary;
      combatLoss?: CombatLoseSummary;
    }
  | {
      type: "encounterChoice";
      moverId: string;
      opponentId: string;
      phase: "choosePvpOrTile";
    }
  | {
      type: "pvp";
      attackerId: string;
      defenderId: string;
      /** 1 = första slaget; ökas vid lika så båda måste slå om (rond 2, 3, …). */
      pvpRound?: number;
      phase: "awaitingRolls" | "chooseLoot";
      rolls?: Partial<
        Record<
          string,
          {
            die: number;
            total: number;
          }
        >
      >;
      winnerId?: string;
      loserId?: string;
      /** Satta när båda slagit (inkl. ev. omslag) — för bords-UI. */
      resolvedTotals?: { attackerTotal: number; defenderTotal: number };
    }
  | {
      type: "door";
      playerId: string;
      targetLevelIndex: number;
      costs: { gold: number; sips: number };
    }
  | {
      type: "combat";
      attackerId: string;
      levelIndex: number;
      tileIndex: number;
      monsterId: string;
      enemyName: string;
      need: number;
      /** Modifies enemy strength (need). Positive = harder, negative = easier. */
      needMod: number;
      baseDamage: number;
      /** Klunk(ar) vid förlust enligt monsterkort (före team battle-extra +1 i motorn). */
      lossSipsOnLose?: number;
      phase: "chooseTeammate" | "enemyIntro" | "reactions" | "rollPreview" | "chooseHitMitigation";
      /** Per-player attack modifiers for this combat. */
      attackMods: Partial<Record<string, number>>;
      /** Team battle: attacker must pick one teammate before combat starts. */
      teamBattleRequired?: boolean;
      /** Team battle: bonus gold each on win. */
      teamBattleBonusGold?: number;
      /** Optional assisting player (e.g. Ölkompis). */
      assistId?: string;
      /** Team battle: individuella slag innan preview. */
      teamRolls?: Partial<Record<string, { die: number; total: number }>>;
      reactors: string[];
      reacted: Partial<Record<string, "pass" | "intervened">>;
      /** Epoch ms när reaktionsfönstret stänger (server-auktoritativ timeout). */
      reactionsDeadlineAt?: number;
      /** Fiendeintro som tidigare visades på kort — visas nu tillsammans med tärningspanelen. */
      enemyArtKey?: string;
      enemyIntroText?: string;
      /** Fasta rewards vid vinst för detta monster. */
      rewardGold?: number;
      rewardItems?: number;
      /** När phase === "rollPreview": resultat av slaget; effekter/kort efter combatRollAck. */
      previewDie?: number;
      previewBroDie?: number | null;
      previewPrBase?: number;
      previewAssistRoll?: number | null;
      previewTotal?: number;
      previewNeed?: number;
      previewWon?: boolean;
    };

export interface LogEntry {
  at: number;
  message: string;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  ready: boolean;
  /** Nivå på brädet 0,1,2 */
  levelIndex: number;
  tileIndex: number;
  gold: number;
  klunkar: number;
  hp: number;
  maxHp: number;
  xp: number;
  equipment: Equipment;
  inventory: ItemInstance[];
  /** Engångsbonus till nästa rörelseslag från items. */
  nextMoveBonus: number;
  skippedTurns: number;
}

export type GameMode = "bossKill" | "goldenBeerEscape";

export interface GameConfig {
  turnSeconds: number;
  gameMode: GameMode;
}

export interface SipNoticeEntry {
  recipientId: string;
  /** Vem som gav sipen (visningsnamn). */
  fromPlayerName: string;
}

export interface GameState {
  phase: "lobby" | "playing" | "ended";
  seed: number;
  config: GameConfig;
  roomCode: string;
  players: Player[];
  /** Ordning för turer */
  turnOrder: string[];
  currentTurnIndex: number;
  levels: LevelBoard[];
  pending: Pending | null;
  log: LogEntry[];
  winnerId: string | null;
  winnerName: string | null;
  goldenBeerCarrierId: string | null;
  /** tileKey: `${levelIndex}-${tileIndex}` för skatter som tömts */
  treasureTaken: Record<string, true>;
  /** Senaste tärningsslag (visning) */
  lastDiceRoll: number | null;
  lastDiceRollerId: string | null;
  /** Kö av sip-meddelanden per mottagare; bekräftas med sipNoticeAck (en i taget). */
  sipNotices: SipNoticeEntry[];
}

export type ClientAction =
  | { type: "setReady"; playerId: string; ready: boolean }
  | { type: "startGame"; playerId: string }
  | { type: "setConfig"; playerId: string; turnSeconds: number; gameMode: GameMode }
  | { type: "rollMove"; playerId: string }
  | { type: "chooseMove"; playerId: string; dir: "cw" | "ccw" }
  | { type: "chooseEncounter"; playerId: string; choice: "pvp" | "tile" }
  | { type: "pvpRoll"; playerId: string }
  | { type: "confirmCard"; playerId: string }
  | { type: "chooseCardOption"; playerId: string; choiceId: string }
  | { type: "merchantBuy"; playerId: string; itemId: string | null }
  | { type: "useDoor"; playerId: string; method: "gold" | "sips" | "stay" }
  | { type: "pvpLootChoice"; playerId: string; choice: "gold" | "sip" | EquipmentSlot }
  | { type: "useItem"; playerId: string; instanceId: string; targetPlayerId?: string }
  | { type: "combatRoll"; playerId: string }
  | { type: "combatIntroAck"; playerId: string }
  | { type: "chooseCombatTeammate"; playerId: string; teammateId: string }
  | { type: "combatRollAck"; playerId: string }
  | { type: "chooseCombatHitMitigation"; playerId: string; choice: "sip" | "no_sip" }
  | { type: "combatReact"; playerId: string; choice: "intervene" | "pass" }
  | { type: "sipNoticeAck"; playerId: string };

export interface ApplyResult {
  state: GameState;
  events: string[];
  error?: string;
}
