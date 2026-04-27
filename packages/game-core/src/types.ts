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
  | "lengraddad"
  | "canman"
  | "not_my_round"
  | "spill_intentional"
  | "early_night"
  | "get_lucky"
  | "manopositiv"
  | "shortcut"
  | "six_sense"
  | "rigged_game";

export interface ItemInstance {
  instanceId: string;
  itemId: ItemId;
  /** Endast `canman`: drag kvar med +1 pant per rörelsetärning; när 0 tas instansen bort. */
  canmanDrawsRemaining?: number;
}

export interface Weapon {
  name: string;
  power: number;
  /** Bonus om spelaren tar 1 klunk vid slag (auto-aktiveras i nuläget). */
  sipAttackBonus?: number;
  /** Bonus/malus på BvB-tärningsslag; påverkar inte monsterattack (samma fält finns valfritt på rustning/hjälm/tillbehör). */
  pvpDieBonus?: number;
  /** Bonus gold granted on each win while equipped. */
  gainGoldOnWin?: number;
  /** Dynamic weapon power thresholds by current gold. */
  powerAtGold10?: number;
  powerAtGold20?: number;
  powerAtGold30?: number;
  powerDynamicMax?: number;
  /** On win: deal this much damage to a random other living player. */
  randomOtherDamageOnWin?: number;
  /** If true: weapon breaks and is removed after a win. */
  breakOnWin?: boolean;
}

export interface ArmorPiece {
  name: string;
  bonusHp: number;
  /** +attack i strid (monster). */
  combatBonus?: number;
  /** Damage reduced per hit. */
  damageNegate?: number;
  /** Extra damage reduced per hit when source is a boss combat. */
  bossDamageNegateBonus?: number;
  /** If true: negates all damage once, then breaks. */
  negateAllOnce?: boolean;
  /** If true: other players cannot challenge this player to PvP. */
  pvpCannotBeChallenged?: boolean;
  /** Bonus/malus på BvB-tärningsslag; påverkar inte monsterattack. */
  pvpDieBonus?: number;
  /** Gain this much gold whenever you actually take damage. */
  gainGoldOnDamageTaken?: number;
  /** HP som återställs vid turstart (drag), upp till max HP. */
  healHpPerTurn?: number;
}

export interface Helmet {
  name: string;
  /** Extra max HP (räknas in i {@link Player.maxHp} tillsammans med rustning). */
  bonusHp?: number;
  /** +1 till stridsslag t.o.m. nästa duell */
  combatBonus?: number;
  damageNegate?: number;
  /** Extra damage reduced per hit when source is a boss combat. */
  bossDamageNegateBonus?: number;
  /** If true: negates all damage once, then breaks. */
  negateAllOnce?: boolean;
  /** Extra klunkar when this player receives a penalty sip event. */
  penaltySipExtra?: number;
  /** Dynamic attack bonus based on current klunkar. */
  klunkAttackBonus10?: number;
  klunkAttackBonus20?: number;
  klunkAttackBonusMax?: number;
  /** Bonus/malus på BvB-tärningsslag; påverkar inte monsterattack. */
  pvpDieBonus?: number;
}

export interface Accessory {
  name: string;
  damageNegate?: number;
  /** +attack i strid (monster). */
  combatBonus?: number;
  /** Extra klunkar when this player receives a penalty sip event. */
  penaltySipExtra?: number;
  /** Få pant per strid (oavsett utfall). */
  gainGoldPerCombat?: number;
  /** Få klunk per strid (oavsett utfall). */
  gainKlunkPerCombat?: number;
  /** Om true: andra kan inte stjäla pant/prylar från dig. */
  preventTheft?: boolean;
  /** Rabatt i pant när du går upp en nivå. */
  levelUpDiscountGold?: number;
  /** Om true: angriparen kan välja att undvika monstermöte. */
  canSkipMonsterEncounter?: boolean;
  /** Extra steps added to movement roll. */
  moveBonus?: number;
  /** Bonus/malus på BvB-tärningsslag; påverkar inte monsterattack. */
  pvpDieBonus?: number;
  /** Om true: spelarens egna etta på tärning i strid räknas inte som automatisk förlust. */
  ignoreCombatCritFailOnOne?: boolean;
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
  pvpDieBonus?: number;
  gainGoldOnWin?: number;
  powerAtGold10?: number;
  powerAtGold20?: number;
  powerAtGold30?: number;
  powerDynamicMax?: number;
  randomOtherDamageOnWin?: number;
  breakOnWin?: boolean;
  /** rustning */
  bonusHp?: number;
  healHpPerTurn?: number;
  damageNegate?: number;
  bossDamageNegateBonus?: number;
  negateAllOnce?: boolean;
  pvpCannotBeChallenged?: boolean;
  gainGoldOnDamageTaken?: number;
  combatBonus?: number;
  penaltySipExtra?: number;
  klunkAttackBonus10?: number;
  klunkAttackBonus20?: number;
  klunkAttackBonusMax?: number;
  moveBonus?: number;
  gainGoldPerCombat?: number;
  gainKlunkPerCombat?: number;
  preventTheft?: boolean;
  levelUpDiscountGold?: number;
  canSkipMonsterEncounter?: boolean;
  ignoreCombatCritFailOnOne?: boolean;
  healAmount?: number;
  goldAmount?: number;
  /** Kort smaktext / särregler för UI (affär, inventarie). */
  rulesText?: string;
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
  /** +1 om valfri straffklunk med pip-vapen togs före slaget (ingår i visad totalsumma). */
  straffKlunkFromWeaponSip?: number;
  assistRollNote?: string;
  redirectNote?: string;
  lostEquipmentName?: string;
  /** Stoorn (imperial_dragon_stout): granne på brädet tog 1 skada. */
  imperialAdjacentSplash?: boolean;
}

export type CombatHelpContract = "free" | "pant" | "treasure" | "split";

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
      /** Efter skatt/händelse m.m.: ny utrustning när motsvarande slot redan är full. */
      equipmentReplaceOffer?: {
        slot: EquipmentSlot;
        catalogId: string;
        newName: string;
      };
    }
  | {
      type: "equipmentReplaceOffer";
      playerId: string;
      slot: EquipmentSlot;
      catalogId: string;
      newName: string;
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
      /** Visad rond i bäst-av-3 (1..3). */
      pvpRound?: number;
      /** Matchlängd i rundor (standard: 3). */
      bestOf?: number;
      /** Antal vunna rundor per duellant. */
      wins?: { attacker: number; defender: number };
      /** Aktiv rond i matchen. Alias till `pvpRound` för bakåtkompatibel UI. */
      roundNumber?: number;
      phase: "preRoundItems" | "awaitingRolls" | "roundReveal" | "chooseLoot";
      /** Efter rondslag: vad som händer när båda bekräftat resultatet. */
      roundRevealLead?: "nextRound" | "chooseLoot";
      /** När `roundRevealLead === "nextRound"`: rondnummer som sätts vid övergång till `preRoundItems`. */
      nextRoundNumber?: number;
      /** Båda duellanterna måste skicka `pvpRoundRevealAck` innan `roundRevealLead` tillämpas. */
      roundRevealAcked?: Partial<Record<string, boolean>>;
      /** Båda spelare markerar redo innan rundans slag startar. */
      roundItemReady?: Partial<Record<string, boolean>>;
      /** Per-rond attackmodifierare från spelade PvP-föremål. */
      pvpAttackMods?: Partial<Record<string, number>>;
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
      /** Kort historik för spelade rundor i matchen. */
      roundResults?: Array<{ round: number; attackerTotal: number; defenderTotal: number; winnerId?: string; tie?: boolean }>;
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
      phase:
        | "chooseTeammate"
        | "enemyIntro"
        | "reactions"
        | "helpChooseHelper"
        | "helpAwaitDecision"
        | "helpAwaitRequesterDecision"
        | "helpAwaitCard"
        | "rollPreview"
        | "chooseHitMitigation";
      /** Per-player attack modifiers for this combat. */
      attackMods: Partial<Record<string, number>>;
      /** Föremål spelade under reaktionsfasen — följer med tills striden är slut (solfjäder på bräd-tv). */
      reactionItemPlays?: CombatReactionItemPlay[];
      /** Skakad öl: spelare som fick −1 attack; vid förlust mot monster → hoppar tur + "Öl i ögat". */
      yeastSabotageVictimId?: string;
      /** Get Lucky: spelare med +4 attack i denna strid men som tar dubbel HP-skada om laget förlorar. */
      getLuckyRiskPlayerIds?: string[];
      /** Team battle: attacker must pick one teammate before combat starts. */
      teamBattleRequired?: boolean;
      /** Team battle: bonus gold each on win. */
      teamBattleBonusGold?: number;
      /** Optional assisting player (e.g. Ölkompis). */
      assistId?: string;
      /** Team battle: individuella slag innan preview. `attackDiceDoubled`: Skägget rakt bak — 2× t6 i total, `die` kvar fysiskt 1–6. Med två slag: auto-förlust bara om båda är 1. */
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
      /** Pip-vapen: spelaren tog valfri straffklunk före slaget (för bräd-tv + förlustsummering). */
      previewUsedSipWeaponBonus?: boolean;
      /** Attackbonus från den valfria klunken (2/3). */
      previewSipWeaponBonusValue?: number;
      /** Hjälp-funktion: möjliga spelare som kan hjälpa med positivt kort. */
      helpCandidateIds?: string[];
      /** Hjälp-funktion: vald hjälpare för aktuell förfrågan. */
      helpSelectedHelperId?: string;
      /** Hjälp-funktion: ersättningsmodell om hjälp accepterats. */
      helpContract?: CombatHelpContract;
      /** Hjälp-funktion: hjälparens föreslagna ersättning som angriparen måste godkänna. */
      helpProposedContract?: "pant" | "treasure" | "split";
      /** Hjälp-funktion: hjälparen har accepterat att hjälpa. */
      helpAccepted?: boolean;
      /** Hjälp-funktion: hjälparen har spelat minst ett positivt kort i denna förfrågan. */
      helpUsedPositiveItem?: boolean;
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
  /** Nästa egna t6 (rörelse, monsterstrid, BvB): fast sida efter «Ett sjätte ölsinne»; nollas när slaget görs. */
  nextForcedDieFace?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Tillfällig modifierare på nästa stridsslag för spelaren. */
  nextCombatModifier: number;
  skippedTurns: number;
  /** FIFO med orsak till varje köad hopptur (sömn = normal, skakad öl-förlust = oil). */
  skipTurnReasons?: ("normal" | "oil")[];
  /** True när spelaren gett upp efter stupad bryggare — hoppas över i turordning. */
  eliminated?: boolean;
}

export type GameMode = "bossKill";
export type DifficultyPreset = "lattol" | "folkol" | "starkol" | "imperial";
export type BoardSizePreset = "default" | "large" | "xlarge";

export interface GameConfig {
  turnSeconds: number;
  gameMode: GameMode;
  difficulty: DifficultyPreset;
  hardcore: boolean;
  boardSize: BoardSizePreset;
  levelCount: number;
  maxHp: number;
  startPant: number;
  wakeLockBeforeStart: boolean;
  disabledCardIds: string[];
  cardCover: "default" | "alt1" | "alt2";
}

export type SipNoticeKind = "custom" | "duel_loss";

export interface SipNoticeEntry {
  recipientId: string;
  /** Vem som gav sipen (visningsnamn). */
  fromPlayerName: string;
  /** Antal straffklunkar som tilldelats i samband med detta besked (default 1). */
  klunkCount?: number;
  /** Optional custom title/body for non-klunk prompts (e.g. targeted card effects). */
  title?: string;
  body?: string;
  /** Mobil-UI-variant för anpassade notices (t.ex. duell-förlust). */
  noticeKind?: SipNoticeKind;
}

/** Sidokort i solfjäder: stulet/förstört inventory eller utrustning (bredvid spelat kort). */
export interface TableItemPlaySidePayload {
  sideInventoryItemId?: ItemId;
  sideEquipmentSlot?: EquipmentSlot;
  sideEquipmentName?: string;
}

/** Senaste föremåls-/kortspel för bräd-tv (mobil spelar; bordet ser kort + vem). */
export interface TableItemPlayReveal extends TableItemPlaySidePayload {
  /** Monotont; UI kan key:a om samma kort spelas flera gånger. */
  seq: number;
  itemId: ItemId;
  actorId: string;
  /** Mottagare/mål om kortet riktar sig mot annan spelare. */
  targetPlayerId?: string;
}

/** Ett föremål spelat under stridsreaktioner (solfjäder på bräd-tv tills striden är klar). */
export interface CombatReactionItemPlay extends TableItemPlaySidePayload {
  playSeq: number;
  itemId: ItemId;
  actorId: string;
  targetPlayerId?: string;
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
  /** Monotont räknare per loggrad; används till RNG (log kapas vid 200 rader). */
  logSeq?: number;
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
  /**
   * Föremål spelade utanför stridsreaktioner (t.ex. under tur eller PvB-förberedelse).
   * Appendas per spel; solfjäder på bräd-tv. Rensas vid rörelse m.m.
   */
  tableItemPlayReveals?: TableItemPlayReveal[];
}

export type ClientAction =
  | { type: "setReady"; playerId: string; ready: boolean }
  | { type: "startGame"; playerId: string }
  | {
      type: "setConfig";
      playerId: string;
      turnSeconds?: number;
      difficulty?: DifficultyPreset;
      hardcore?: boolean;
      boardSize?: BoardSizePreset;
      levelCount?: number;
      maxHp?: number;
      startPant?: number;
      wakeLockBeforeStart?: boolean;
      disabledCardIds?: string[];
      cardCover?: "default" | "alt1" | "alt2";
    }
  | { type: "rollMove"; playerId: string }
  | { type: "chooseMove"; playerId: string; dir: "cw" | "ccw" }
  | { type: "chooseEncounter"; playerId: string; choice: "pvp" | "tile" }
  | { type: "choosePvpOpponent"; playerId: string; opponentId: string }
  | { type: "pvpRoundReady"; playerId: string; ready: boolean }
  | { type: "pvpRoundRevealAck"; playerId: string }
  | { type: "pvpRoll"; playerId: string }
  | { type: "confirmCard"; playerId: string }
  | { type: "chooseCardOption"; playerId: string; choiceId: string }
  | { type: "merchantBuy"; playerId: string; itemId: string | null }
  | { type: "useDoor"; playerId: string; method: "gold" | "sips" | "stay" }
  | { type: "levelUpDecision"; playerId: string; choice: "now" | "stay" }
  | { type: "pvpLootChoice"; playerId: string; choice: "gold" | "sip" | "damage" | EquipmentSlot }
  | { type: "useItem"; playerId: string; instanceId: string; targetPlayerId?: string; chosenDieFace?: number }
  /** `useSipWeaponBonus`: vid pip-vapen måste anges (true = +1 klunk och +sipAttackBonus på slaget). */
  | { type: "combatRoll"; playerId: string; useSipWeaponBonus?: boolean }
  | { type: "skipMonsterEncounter"; playerId: string }
  | { type: "combatIntroAck"; playerId: string }
  | { type: "chooseCombatTeammate"; playerId: string; teammateId: string }
  | { type: "combatRollAck"; playerId: string }
  | { type: "chooseCombatHitMitigation"; playerId: string; choice: "sip" | "no_sip" }
  | { type: "combatReact"; playerId: string; choice: "intervene" | "pass" }
  | { type: "combatRequestHelp"; playerId: string }
  | { type: "combatChooseHelper"; playerId: string; helperId: string }
  | {
      type: "combatHelperDecision";
      playerId: string;
      decision: "decline" | "free" | "pant" | "treasure" | "split";
    }
  | { type: "combatHelpRequesterDecision"; playerId: string; accept: boolean }
  | { type: "sipNoticeAck"; playerId: string }
  | { type: "brewerDownChoice"; playerId: string; choice: "retry" | "giveUp" }
  | { type: "equipmentReplaceDecision"; playerId: string; accept: boolean };

export interface ApplyResult {
  state: GameState;
  events: string[];
  error?: string;
}
