import type { EventTableOutcome } from "./eventTableOutcomes.js";
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
  | "taproom_key"
  | "six_sense"
  | "rigged_game"
  | "bribes"
  | "paidassasin"
  | "charity"
  | "shuffle";

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
  /** Pant för valfri {@link sipAttackBonus} före monstertärning (om {@link sipWeaponBonusKlunks} saknas/0). */
  sipWeaponBonusGoldCost?: number;
  /** Straffklunk(ar) för valfri {@link sipAttackBonus} före monstertärning; om satt (positivt) används detta i stället för pant. */
  sipWeaponBonusKlunks?: number;
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
  /**
   * Antal kvarvarande monsterstridsvinster innan vapnet tas bort när {@link breakOnWin} är sant.
   * Sätts t.ex. till 6 för Tom flaska + Plastback; om `undefined` räknas som 1 vinst.
   */
  breakWinsRemaining?: number;
  /** Minskar bas-antalet straffklunkar vid förlust mot monster (per enhet, ej under 0 totalt före hjälm/tillbehör-extra). */
  monsterLossSipReduction?: number;
  /** Medan vapnet sitter utrustat: inga pantkostnader för att spela föremål (ITEM_PLAY_GOLD_COST). */
  freeInventoryItemPlay?: boolean;
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
  /** Bonus på platta föremålseffekter (HP/pant/klunk/attack-siffror). */
  itemCardBonus?: number;
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
  /** Bonus på platta föremålseffekter (HP/pant/klunk/attack-siffror). */
  itemCardBonus?: number;
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
  /** Pant per tilldelad straffklunk (via gemensam klunk-tilldelning med XP). */
  gainGoldPerPenaltyKlunk?: number;
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
  /** Om satt: när spelaren dör kan den betala pantkostnaden för att fortsätta med fullt liv. */
  deathContinueCost?: number;
  /** Rabatt i pant på alla varor i Panta burkar (golv 1 pant per rad). */
  merchantDiscountGold?: number;
  /** Bonus på platta föremålseffekter (HP/pant/klunk/attack-siffror). */
  itemCardBonus?: number;
  /** Flaskor kvar i Plastback-hållaren (0–6). */
  plastbackPackRemaining?: number;
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
  slot: EquipmentSlot | "heal" | "gold" | "inventory";
  /** Vid `slot: "inventory"` — föremål som läggs i spelarens förråd vid köp. */
  inventoryItemId?: ItemId;
  name: string;
  price: number;
  /** vapen */
  power?: number;
  sipAttackBonus?: number;
  sipWeaponBonusGoldCost?: number;
  sipWeaponBonusKlunks?: number;
  pvpDieBonus?: number;
  gainGoldOnWin?: number;
  powerAtGold10?: number;
  powerAtGold20?: number;
  powerAtGold30?: number;
  powerDynamicMax?: number;
  randomOtherDamageOnWin?: number;
  breakOnWin?: boolean;
  breakWinsRemaining?: number;
  monsterLossSipReduction?: number;
  /** Medan vapnet sitter utrustat: inga pantkostnader för att spela föremål (ITEM_PLAY_GOLD_COST). */
  freeInventoryItemPlay?: boolean;
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
  gainGoldPerPenaltyKlunk?: number;
  preventTheft?: boolean;
  levelUpDiscountGold?: number;
  canSkipMonsterEncounter?: boolean;
  ignoreCombatCritFailOnOne?: boolean;
  deathContinueCost?: number;
  merchantDiscountGold?: number;
  /** Bonus på platta föremålseffekter (HP/pant/klunk/attack-siffror). */
  itemCardBonus?: number;
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
  rewardXp: number;
  teammateName?: string;
  /** Enhörning m.fl.: namn på spelare som fick straffklunk vid vinst. */
  randomOtherSipRecipientName?: string;
  /** Visningsnamn för skatter till angriparen (ordning som vid slumpning); för mobil-toasts vid Fortsätt. */
  grantedRewardTitles?: string[];
  /** Ölkompis får samma antal skatter — för mobil-toast när angriparen bekräftar kortet. */
  beerBroGrantedRewardTitles?: string[];
  helpMateGrantedRewardTitles?: string[];
  assistPlayerId?: string;
  helpMatePlayerId?: string;
}

/** Visning av förlust efter strid (`cardId === "combat_lose"`). */
export interface CombatLoseSummary {
  playerName: string;
  enemyName: string;
  rollTotal: number;
  need: number;
  /** HP-skada före sköld (rå skada). */
  rawDamage?: number;
  /** Hur mycket skada som blockerades av sköld/negate. */
  blockedDamage?: number;
  /** Faktisk HP-förlust efter sköld (netto). */
  damage: number;
  klunkGained: number;
  /** +1 om valfri straffklunk med pip-vapen togs före slaget (ingår i visad totalsumma). */
  straffKlunkFromWeaponSip?: number;
  assistRollNote?: string;
  redirectNote?: string;
  lostEquipmentName?: string;
  /** Stoorn (imperial_dragon_stout): övriga spelare på samma våning tog 1 skada vardera vid förlust. */
  imperialSameLevelSplash?: boolean;
  /** Mobil-toast för ölkompis när angriparen stänger förlustkortet. */
  assistPartnerImpact?: { playerId: string; hpLost: number; klunksGained: number };
  /** Mobil-toast för stridshjälpare (samma ögonblick). */
  helpMateImpact?: { playerId: string; hpLost: number; klunksGained: number };
}

export type CombatHelpContract = "free" | "pant" | "treasure" | "split";

/** Straffklunk som visas för mottagaren via sip-modal efter att dragande spelare tryckt Fortsätt. */
export type PenaltySipQueueEntry = {
  recipientId: string;
  klunkCount: number;
  fromPlayerName: string;
  /** Egen rubrik i sip-modalen (annars "Straffklunk"). */
  noticeTitle?: string;
  /** Egen brödtext; om satt används {@link pushPlayerNotice} vid flush (t.ex. vapen-klunk före slag). */
  noticeBody?: string;
  /** Utrustningsnamn för bild i sip-modalen (t.ex. Ölsejdel). */
  noticeEquipmentName?: string;
  noticeKind?: "custom" | "duel_loss";
};

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
      /** Slutbossens sista liv: firande innan `phase: "ended"`. */
      bossFinalWin?: {
        winnerName: string;
        bossName: string;
        roundLabel: string;
      };
      /** Efter skatt/händelse m.m.: ny utrustning när motsvarande slot redan är full. */
      equipmentReplaceOffer?: {
        slot: EquipmentSlot;
        catalogId?: string;
        newName: string;
      };
      /** Sip-notiser som pushas vid `confirmCard` (Fortsätt), efter att klunkar redan tillämpats i state. */
      queuedPenaltySipNotices?: PenaltySipQueueEntry[];
      /** Strukturerade bords-toasts (genereras av motorn vid händelseutfall). */
      tableOutcomes?: EventTableOutcome[];
    }
  | {
      type: "equipmentReplaceOffer";
      playerId: string;
      slot: EquipmentSlot;
      /** Affär/skatt: utrustning från katalog */
      catalogId?: string;
      newName: string;
      /** Stöld/PvP: konkret pjäs (ingen katalog); vid avböjan förstörs den (offret får inte tillbaka den) */
      incomingPiece?: Weapon | ArmorPiece | Helmet | Accessory;
      returnVictimId?: string;
      /** Stridsloot-kö: mottagaren får välja byte även när det inte är deras tur. */
      fromCombatLoot?: boolean;
      /** BvB-byte efter duell — avslutar tur / post-turn-prompts när bytesvalet är klart. */
      fromPvpLoot?: boolean;
      /** Ta flaska ur Plastback — pack dras vid accept. */
      fromPlastbackTake?: boolean;
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
      /** Skakad öl i BvB: målet som fått −1; vid rondförlust → öl i ögat / hopptur (som mot monster). */
      pvpYeastSabotageVictimId?: string;
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
      type: "brewerPerkChoice";
      playerId: string;
      /** Antal kvarvarande perk-val denna gång (flera nivåer i ett svep). */
      levelsRemaining: number;
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
      /**
       * Reactions: val om vapen-sipbonus (pant/klunk) ska användas på nästa t6 — måste sättas innan `combatRoll` om vapnet har `sipAttackBonus`.
       * Bakåtkompat: klient kan fortfarande skicka `useSipWeaponBonus` på `combatRoll` om fältet saknas.
       */
      sipWeaponBonusChoice?: Partial<Record<string, boolean>>;
      /** Reactions: köade straffklunk-notiser för vapen-klunk (Ölsejdel) — flyttas till `previewDeferredSipWeaponPenalties` vid rollPreview. */
      weaponSipDeferredPenalties?: PenaltySipQueueEntry[];
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
      rewardXp?: number;
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
      /** True när slaget är automatisk förlust p.g.a. etta (om inte fyrklöver/liknande ignorerar regeln). */
      previewCritFailOnOne?: boolean;
      /** Pip-vapen: spelaren tog valfri straffklunk före slaget (för bräd-tv + förlustsummering). */
      previewUsedSipWeaponBonus?: boolean;
      /** Attackbonus från den valfria klunken (2/3). */
      previewSipWeaponBonusValue?: number;
      /** Straffklunk(ar) från vapen-klunk — visas via `queuedPenaltySipNotices` efter vinst/förlust-kort (Fortsätt). */
      previewDeferredSipWeaponPenalties?: PenaltySipQueueEntry[];
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
      /** Under strid (reaktioner): bytesfråga efter stöld när tjuven redan har något i slotten */
      postReactionEquipmentOffer?: {
        playerId: string;
        slot: EquipmentSlot;
        newName: string;
        incomingPiece: Weapon | ArmorPiece | Helmet | Accessory;
        returnVictimId: string;
      };
    };

export interface LogEntry {
  at: number;
  message: string;
}

/** Kumulativ statistik under aktuellt parti (serialiseras med GameState). */
export interface PlayerSessionStats {
  /** Antal gånger spelaren nått stupad bryggare (0 HP, innan val). */
  knockdownCount: number;
  monsterCombatWins: number;
  monsterCombatLosses: number;
  pvpMatchWins: number;
  pvpMatchLosses: number;
  itemsPlayed: number;
  /** Antal gånger spelarens egen t6 visat 1 i monsterstrid (lagkamrat räknas separat). */
  combatOnesRolled: number;
  /** Antal gånger spelaren slagit 1 i BvB-tärning (per slag). */
  pvpOnesRolled: number;
  sabotageItemsPlayed: number;
  /** Antal monsterstrider vinst där spelaren var accepterad hjälpare (inte lagkamrat). */
  helpedCombatWins: number;
  /** Högsta sedda slagtotal i monsterstrid eller BvB för denna spelare. */
  maxDiceRollTotal: number;
  /**
   * Kumulativ pant som lämnat spelaren till spelets sinkholes (handel, avgifter, monster/handelse-straff
   * utan mottagande spelare m.m.) — inte ren överföring till annan spelares plånbok.
   */
  goldSpent: number;
  /** Kumulativt antal klunkar som tilldelats spelaren under partiet (påverkas inte av «starta om»). */
  totalKlunksGained: number;
  /**
   * Kumulativ HP som förlorats till skada (strid, kort m.m. efter rustningsreduktion där `applyDamage` används;
   * ren «ignorera rustning»-kortskada ingår också). Ökar inte vid maxHp-justeringar som bara klampar HP.
   */
  totalHpLost: number;
}

export type { AvatarPartKind, PlayerAvatar } from "./avatar.js";

export interface Player {
  id: string;
  name: string;
  color: string;
  /** Slumpade/konfigurerade ansiktsdelar (lobby). */
  avatar: import("./avatar.js").PlayerAvatar;
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
  /** Permanent +attack från bryggnivåperk. */
  brewerAttackBonus?: number;
  /** Permanent sköld (skademinskning) från bryggnivåperk. */
  brewerShieldBonus?: number;
  /** Permanent +1 BvB-tärning från bryggnivåperk. */
  brewerPvpBonus?: number;
  /** Extra max-HP från bryggnivåperk (+2 per val). */
  brewerHpBonus?: number;
  /** Permanent +1 på platta föremålseffekter per bryggnivå-val (attack/HP/pant/klunk). */
  brewerItemCardBonus?: number;
  /** Antal bryggnivåer där perk redan valts (undviker retroaktiva val). */
  brewerPerkLevelsClaimed?: number;
  /** Bryggnivåer som väntar på perk-val (när annan pending blockerar). */
  pendingBrewerPerkLevels?: number;
  skippedTurns: number;
  /** FIFO med orsak till varje köad hopptur (sömn = normal, skakad öl-förlust = oil). */
  skipTurnReasons?: ("normal" | "oil")[];
  /** True när spelaren gett upp efter stupad bryggare — hoppas över i turordning. */
  eliminated?: boolean;
  /** True när spelaren lämnat spelet frivilligt — rad finns kvar för resultatlista / statistik. */
  leftVoluntarily?: boolean;
  /** Sessionsstatistik (partipoäng); saknas i äldre sparningar tills normaliserad. */
  stats?: PlayerSessionStats;
}

export type GameMode = "bossKill";
export type DifficultyPreset = "lattol" | "folkol" | "starkol" | "imperial";
export type BoardSizePreset = "default" | "large" | "xlarge";

export interface GameConfig {
  turnSeconds: number;
  reactionSeconds: number;
  gameMode: GameMode;
  difficulty: DifficultyPreset;
  hardcore: boolean;
  boardSize: BoardSizePreset;
  levelCount: number;
  maxHp: number;
  startPant: number;
  wakeLockBeforeStart: boolean;
  disabledCardIds: string[];
  cardCover: string;
}

export type EmoteId = "surprised" | "happy" | "sad" | "angry" | "love";

export interface PlayerEmoteBurst {
  playerId: string;
  emoteId: EmoteId;
  at: number;
}

/** Straffklunk på bräd-tv (samma ballong som emotes över spelarnamnet). */
export interface PlayerKlunkBurst {
  playerId: string;
  at: number;
  klunkCount?: number;
}

export type SipNoticeKind = "custom" | "duel_loss" | "toast";

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
  /** Utrustningsnamn för bild under rubriken (t.ex. vapen vid straffklunk efter klunk-bonus). */
  equipmentName?: string;
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

/** Nivå-upp / bryggarperk / stridsloot-bytesval utanför tur — parallellt med nästa spelares `pending`. */
export type OffTurnPersonalPending =
  | Extract<Pending, { type: "levelUpOffer" }>
  | Extract<Pending, { type: "brewerPerkChoice" }>
  | Extract<Pending, { type: "equipmentReplaceOffer" }>;

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
  /** Pausad `pending` medan spelaren väljer bryggbonus (återställs efter `brewerPerkDecision`). */
  deferredPending?: Pending | null;
  /** Personliga val för spelare vars tur redan gått vidare (nivå-upp / bryggbonus). */
  offTurnPersonalPending?: OffTurnPersonalPending | null;
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
  /** Slutboss-seger: satt vid första confirmCard → bord animerar bort kort; andra confirm avslutar spelet. */
  bossFinaleExitStartedAt: number | null;
  /** tileKey: `${levelIndex}-${tileIndex}` för skatter som tömts */
  treasureTaken: Record<string, true>;
  /** Genväg/Taproom till boss-ruta: kör tile utan att `encounterChoice` blockerar */
  landingBypassEncounter?: boolean;
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
  /** Senaste emotes för turbanner (ballonger); rensas efter EMOTE_DISPLAY_MS. */
  playerEmoteBursts?: PlayerEmoteBurst[];
  /** Senaste straffklunkar för turbanner; rensas efter KLUNK_BURST_DISPLAY_MS. */
  playerKlunkBursts?: PlayerKlunkBurst[];
  /**
   * Stridsloot: byte-erbjudanden efter combat_win (alla mottagare), töms via equipmentReplaceDecision.
   */
  combatEquipReplaceQueue?: Array<{
    playerId: string;
    slot: EquipmentSlot;
    catalogId: string;
    newName: string;
  }>;
  /**
   * Stulen utrustning som väntar på bytesval (stöld/PvP). Överlever om `pending` rensas eller skrivs över.
   */
  stolenEquipmentEscrow?: {
    thiefId: string;
    victimId: string;
    slot: EquipmentSlot;
    piece: Weapon | ArmorPiece | Helmet | Accessory;
    pieceName: string;
  };
}

export type ClientAction =
  | { type: "setReady"; playerId: string; ready: boolean }
  | { type: "setAvatar"; playerId: string; avatar: import("./avatar.js").PlayerAvatar }
  | { type: "startGame"; playerId: string }
  | {
      type: "setConfig";
      playerId: string;
      turnSeconds?: number;
      reactionSeconds?: number;
      difficulty?: DifficultyPreset;
      hardcore?: boolean;
      boardSize?: BoardSizePreset;
      levelCount?: number;
      maxHp?: number;
      startPant?: number;
      wakeLockBeforeStart?: boolean;
      disabledCardIds?: string[];
      cardCover?: string;
    }
  | { type: "rollMove"; playerId: string }
  | { type: "chooseMove"; playerId: string; dir: "cw" | "ccw" }
  | { type: "chooseMerchant"; playerId: string }
  | { type: "chooseEncounter"; playerId: string; choice: "pvp" | "tile" }
  | { type: "choosePvpOpponent"; playerId: string; opponentId: string }
  | { type: "pvpRoundReady"; playerId: string; ready: boolean }
  | { type: "pvpRoundRevealAck"; playerId: string }
  | { type: "pvpRoll"; playerId: string }
  | { type: "confirmCard"; playerId: string }
  | { type: "chooseCardOption"; playerId: string; choiceId: string }
  | { type: "merchantBuy"; playerId: string; itemId: string | null }
  | { type: "merchantReroll"; playerId: string }
  | { type: "useDoor"; playerId: string; method: "gold" | "sips" | "stay" }
  | { type: "levelUpDecision"; playerId: string; choice: "now" | "stay" }
  | { type: "brewerPerkDecision"; playerId: string; choice: "attack" | "shield" | "hp" | "pvp" | "items" }
  | { type: "pvpLootChoice"; playerId: string; choice: "gold" | "sip" | "damage" | EquipmentSlot }
  | { type: "useItem"; playerId: string; instanceId: string; targetPlayerId?: string; chosenDieFace?: number }
  /** Valt innan `combatRoll` när vapnet har `sipAttackBonus` (mobil tvåsteg + bord). */
  | { type: "combatChooseSipWeaponBonus"; playerId: string; useSipWeaponBonus: boolean }
  /** `useSipWeaponBonus`: bakåtkompat; annars läses val från `pending.sipWeaponBonusChoice`. */
  | { type: "combatRoll"; playerId: string; useSipWeaponBonus?: boolean }
  | { type: "skipMonsterEncounter"; playerId: string }
  | { type: "combatIntroAck"; playerId: string }
  | { type: "chooseCombatTeammate"; playerId: string; teammateId: string }
  | { type: "combatRollAck"; playerId: string }
  | { type: "chooseCombatHitMitigation"; playerId: string; choice: "sip" | "no_sip" }
  | { type: "combatReact"; playerId: string; choice: "intervene" | "pass" }
  | { type: "combatRequestHelp"; playerId: string }
  | { type: "combatCancelHelpRequest"; playerId: string }
  | { type: "combatChooseHelper"; playerId: string; helperId: string }
  | {
      type: "combatHelperDecision";
      playerId: string;
      decision: "decline" | "free" | "pant" | "treasure" | "split";
    }
  | { type: "combatHelpRequesterDecision"; playerId: string; accept: boolean }
  | { type: "sipNoticeAck"; playerId: string }
  | { type: "brewerDownChoice"; playerId: string; choice: "retry" | "giveUp" | "insuredContinue" }
  | { type: "equipmentReplaceDecision"; playerId: string; accept: boolean }
  /** Sälj tillbehöret Plastback (pant = kvarvarande flaskor i hållaren). */
  | { type: "sellAccessory"; playerId: string }
  /** Ta en Tom flaska ur Plastback-hållaren. */
  | { type: "takePlastbackBottle"; playerId: string }
  | { type: "sendEmote"; playerId: string; emoteId: EmoteId };

export interface ApplyResult {
  state: GameState;
  events: string[];
  error?: string;
}
