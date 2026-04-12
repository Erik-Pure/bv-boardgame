import type { MonsterId } from "./monsters.js";

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
  | "beer_bro"
  | "split_the_g"
  | "canman"
  | "not_my_round"
  | "spill_intentional"
  | "early_night";

export interface ItemInstance {
  instanceId: string;
  itemId: ItemId;
}

export interface Weapon {
  name: string;
  power: number;
  /** Bonus om spelaren tar 1 klunk vid slag (auto-aktiveras i nuläget). */
  sipAttackBonus?: number;
  /** Läggs bara till i BvB (påverkar inte monsterstrid). */
  pvpDieBonus?: number;
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
  /** Nivå upp-ruta: kräv brewerLevel >= detta för att gå vidare */
  doorMinLevel?: number;
  /** Mål-nivåindex (t.ex. 0..3) när man passerar nivå-upp-rutan */
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
  sipAttackBonus?: number;
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
  /** Enhörning m.fl.: namn på spelare som fick straffklunk vid vinst. */
  randomOtherSipRecipientName?: string;
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
  /** Stoorn (imperial_dragon_stout): granne på brädet tog 1 skada. */
  imperialAdjacentSplash?: boolean;
}

export type Pending =
  | { type: "merchant"; items: ShopItem[]; playerId: string }
  | {
      type: "moveChoice";
      playerId: string;
      /** Total steps (d6 plus equipment / item bonuses). */
      die: number;
      /** Raw d6 result (1–6) for visuals / physical die face. */
      baseDie: number;
      /** Reserverat; rörelse dubblas inte längre av föremål. */
      diceDoubled?: boolean;
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
      /** Vid slumpat föremål: id (t.ex. `early_night`) för rätt bild även om `artKey` saknas i state. */
      grantedItemId?: string;
      choices?: Array<{ id: string; label: string }>;
      combatWin?: CombatWinSummary;
      combatLoss?: CombatLoseSummary;
    }
  | {
      type: "encounterChoice";
      moverId: string;
      /** Alla andra spelare på samma ruta (turordning). */
      opponentIds: string[];
      phase: "choosePvpOrTile" | "choosePvpOpponent";
      /** Rutans typ när mötet skapades (UI: "lös rutan (…)"). */
      tileType?: TileType;
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
      type: "levelUpOffer";
      playerId: string;
      targetLevelIndex: number;
      costs: { gold: number; sips: number };
      /** True om prompten triggas precis när turen annars skulle gått vidare. */
      deferTurnAdvance?: boolean;
    }
  | {
      type: "brewerDown";
      /** Spelare med HP 0 som måste välja respawn eller ge upp. */
      playerId: string;
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
      /** Team battle: individuella slag innan preview. `attackDiceDoubled`: Skägget rakt bak — 2× t6 i total, `die` kvar fysiskt 1–6 (krit på 1). */
      teamRolls?: Partial<Record<string, { die: number; total: number; attackDiceDoubled?: boolean }>>;
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
      /** Angriparens t6 räknades dubbelt i total (Skägget rakt bak). */
      previewAttackDiceDoubled?: boolean;
      previewBroDie?: number | null;
      /** Ölkompisens t6 räknades dubbelt i total. */
      previewBroAttackDiceDoubled?: boolean;
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
  /** Engångsbonus till nästa rörelseslag från items (för kompatibilitet; inget item sätter längre detta). */
  nextMoveBonus: number;
  /** Nästa monsterstrid: dubblera spelarens t6-värde i attacktotalen (Skägget rakt bak); `die` kvar 1–6 för krit. */
  nextCombatAttackDiceDouble?: boolean;
  /** Tillfällig modifierare på nästa stridsslag för spelaren. */
  nextCombatModifier: number;
  /** Canman: +1 pant per drag så länge > 0. */
  canmanTurnsRemaining: number;
  skippedTurns: number;
  /** True när spelaren gett upp efter stupad bryggare — hoppas över i turordning. */
  eliminated?: boolean;
}

export type GameMode = "bossKill";

export interface GameConfig {
  turnSeconds: number;
  gameMode: GameMode;
}

export interface SipNoticeEntry {
  recipientId: string;
  /** Vem som gav sipen (visningsnamn). */
  fromPlayerName: string;
  /** Antal straffklunkar som tilldelats i samband med detta besked (default 1). */
  klunkCount?: number;
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
  /** Slutboss på sista nivån (en av {@link FINAL_BOSS_IDS}); sätts vid spelstart. */
  finalBossMonsterId: MonsterId | null;
  /** Liv kvar för slutbossen (start 3); delas av alla spelare, minskar vid vunnet slag. */
  finalBossLivesRemaining: number | null;
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
  | { type: "setConfig"; playerId: string; turnSeconds: number }
  | { type: "rollMove"; playerId: string }
  | { type: "chooseMove"; playerId: string; dir: "cw" | "ccw" }
  | { type: "chooseEncounter"; playerId: string; choice: "pvp" | "tile" }
  | { type: "choosePvpOpponent"; playerId: string; opponentId: string }
  | { type: "pvpRoll"; playerId: string }
  | { type: "confirmCard"; playerId: string }
  | { type: "chooseCardOption"; playerId: string; choiceId: string }
  | { type: "merchantBuy"; playerId: string; itemId: string | null }
  | { type: "useDoor"; playerId: string; method: "gold" | "sips" | "stay" }
  | { type: "levelUpDecision"; playerId: string; choice: "now" | "stay" }
  | { type: "pvpLootChoice"; playerId: string; choice: "gold" | "sip" | "damage" | EquipmentSlot }
  | { type: "useItem"; playerId: string; instanceId: string; targetPlayerId?: string }
  | { type: "combatRoll"; playerId: string }
  | { type: "combatIntroAck"; playerId: string }
  | { type: "chooseCombatTeammate"; playerId: string; teammateId: string }
  | { type: "combatRollAck"; playerId: string }
  | { type: "chooseCombatHitMitigation"; playerId: string; choice: "sip" | "no_sip" }
  | { type: "combatReact"; playerId: string; choice: "intervene" | "pass" }
  | { type: "sipNoticeAck"; playerId: string }
  | { type: "brewerDownChoice"; playerId: string; choice: "retry" | "giveUp" };

export interface ApplyResult {
  state: GameState;
  events: string[];
  error?: string;
}
