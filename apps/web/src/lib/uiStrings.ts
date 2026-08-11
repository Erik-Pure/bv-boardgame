import type { GameLocale, TileType } from "@bv/game-core";
import { en } from "./uiStringsEn";

/** WebSocket-status → visningstext */
export function wsStatusLabel(s: string, locale: GameLocale = "sv"): string {
  if (locale === "en") {
    if (s === "connecting") return "connecting";
    if (s === "connected") return "connected";
    if (s === "disconnected") return "disconnected";
    return s;
  }
  if (s === "connecting") return "ansluter";
  if (s === "connected") return "ansluten";
  if (s === "disconnected") return "frånkopplad";
  return s;
}

export function phaseLabel(phase: string, locale: GameLocale = "sv"): string {
  if (locale === "en") {
    if (phase === "lobby") return "lobby";
    if (phase === "playing") return "in progress";
    if (phase === "ended") return "ended";
    return phase;
  }
  if (phase === "lobby") return "lobby";
  if (phase === "playing") return "spel pågår";
  if (phase === "ended") return "avslutat";
  return phase;
}

/** @deprecated use phaseLabel */
export const phaseLabelSv = (phase: string) => phaseLabel(phase, "sv");

export function pendingTypeLabel(t: string | undefined, locale: GameLocale = "sv"): string {
  if (!t) return "—";
  const mSv: Record<string, string> = {
    moveChoice: "rörelseval",
    card: "kort",
    equipmentReplaceOffer: "byte av utrustning",
    merchant: "panta burkar",
    door: "nivå upp",
    levelUpOffer: "nivåval",
    encounterChoice: "mötesval",
    combat: "dålig batch",
    pvp: "BvB",
  };
  const mEn: Record<string, string> = {
    moveChoice: "move choice",
    card: "card",
    equipmentReplaceOffer: "equipment swap",
    merchant: "recycle cans",
    door: "level up",
    levelUpOffer: "level choice",
    encounterChoice: "encounter choice",
    combat: "bad batch",
    pvp: "BvB",
  };
  const m = locale === "en" ? mEn : mSv;
  return m[t] ?? t;
}

/** @deprecated use pendingTypeLabel */
export const pendingTypeLabelSv = (t: string | undefined) => pendingTypeLabel(t, "sv");

const TILE_TYPE_SV: Record<TileType, string> = {
  empty: "Tom",
  event: "Händelse",
  combat: "Dålig batch",
  merchant: "Panta burkar",
  door: "Nivå upp",
  rest: "Vila",
  treasure: "Skatt",
  boss: "Boss",
};

const TILE_TYPE_EN: Record<TileType, string> = {
  empty: "Empty",
  event: "Event",
  combat: "Bad batch",
  merchant: "Recycle cans",
  door: "Level up",
  rest: "Rest",
  treasure: "Treasure",
  boss: "Boss",
};

export function tileTypeLabel(tile: TileType, locale: GameLocale = "sv"): string {
  return (locale === "en" ? TILE_TYPE_EN : TILE_TYPE_SV)[tile];
}

/** @deprecated use tileTypeLabel */
export const tileTypeSv = TILE_TYPE_SV;

export function equipmentSlotLabel(slot: string, locale: GameLocale = "sv"): string {
  const mSv: Record<string, string> = {
    weapon: "vapen",
    armor: "rustning",
    helmet: "hjälm",
    accessory: "tillbehör",
  };
  const mEn: Record<string, string> = {
    weapon: "weapon",
    armor: "armor",
    helmet: "helmet",
    accessory: "accessory",
  };
  const m = locale === "en" ? mEn : mSv;
  return m[slot] ?? slot;
}

/** @deprecated use equipmentSlotLabel */
export const equipmentSlotSv = (slot: string) => equipmentSlotLabel(slot, "sv");

export function capitalizeWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const sv = {
  home: {
    title: "Bryggmästarnas mästare",
    subtitle: "De dåliga batcherna",
    primaryJoin: "Gå med i spel",
    createLobby: "Starta nytt spel",
    /** Etikett ovanför startknapparna under beta. */
    playtestBadge: "BETA",
    howToPlayTitle: "Så spelar ni",
    howToPlayLead:
      "Starta spelet och bjud in dina vänner (eller fiender, vi dömer ingen).",
    howToPlayBody:
      'Vi rekommenderar att ni slänger upp spelet på en gigantisk skärm så ingen kan skylla på "dålig syn" när de förlorar, och glöm inte att sätta på lite bakgrundsmusik för att dämpa den stela tystnaden.',
    howToPlayDeviceBody:
      "Alla bänkar sig med valfri skärm i högsta hugg (mobil, platta eller din gamla trotjänare till laptop). Har den en webbläsare? Perfekt.",
    howToPlayCheersBody:
      "Och du... glöm inte vätskeersättningen. Ladda upp med något iskallt i glaset, gärna från Bryggverket såklart. Skål! 🍻",
    explainerAlt: "Översikt: så spelar ni Bryggmästarnas mästare med mobil och storskärm",
    footerCards: "Kortkatalog",
    footerRules: "Spelets regler",
    /** Första besöket på startsidan — åldersgräns 18+. */
    ageGateTitle: "Håll i hatten! Är du 18+?",
    ageGateBody:
      "För att spela behöver du vara minst 18 år gammal. Kom ihåg att alltid dricka ansvarsfullt!",
    ageGateConfirm: "Ja, jag är över 18 år",
    ageGateDecline: "Jag är under 18",
    ageGateDeclineBody:
      "Spelet är till för vuxna. Du kan stänga fliken eller komma tillbaka när du uppfyller ålderskravet.",
    ageGateBack: "Tillbaka",
    promoSectionTitle: "Upptäck mer från Bryggverket",
    promoCards: [
      {
        title: "Bryggverket",
        body: "Partnerbryggeri för den här utgåvan. Läs om ölen, om oss på bryggeriet, och boka din nästa ölprovning.",
        href: "https://www.bryggverket.se/",
        cta: "Bryggverket",
        image: "/landing/bv-bryggverket.png",
      },
      {
        title: "Köp öl från Bryggverket",
        body: "Många sorter du möter i spelet finns på riktigt — perfekt inför nästa spelkväll.",
        href: "https://www.systembolaget.se/sortiment/?q=bryggverket",
        cta: "Systembolaget",
        image: "/landing/bv-systemet.png",
      },
      {
        title: "Köp kläder från Bryggverket",
        body: "Visste du att du kan köpa kläderna i spelet på riktigt? Tröjor, kepsar och merch väntar.",
        href: "https://brewmerch.se/varumarke/bryggverket/",
        cta: "Brewmerch",
        image: "/landing/bv-clothes.png",
      },
    ] as const,
    promoSocialLabel: "Följ oss på sociala medier",
    promoSocialLinks: [
      {
        label: "Instagram",
        href: "https://www.instagram.com/bryggverket/",
      },
      {
        label: "Facebook",
        href: "https://www.facebook.com/bryggverket/",
      },
    ] as const,
    loginLink: "Logga in",
    footerNavLabel: "Sidfot",
    deployedVersionTitle: "Deployad version",
    languageLabel: "Språk",
    languageSv: "SV",
    languageEn: "EN",
  },
  joinPage: {
    title: "Gå med i spel",
    subtitle: "Skriv in lobbyn som värden visar och välj ditt namn.",
    roomLabel: "Lobbykod",
    nameLabel: "Namn",
    namePlaceholder: "Ditt namn",
    connect: "Anslut",
  },
  play: {
    wsConnecting: "Ansluter till spelet…",
    wsWaitingRetry: "Försöker igen om en stund…",
    wsRetry: "Försök igen",
    wsReconnectAttempt: (n: number) => `Återanslutning · försök ${n}`,
    /** Footern (mobil): kort rad till höger om lobby-länken */
    wsReconnectFooterConnecting: "Ansluter…",
    wsReconnectFooterWaiting: (n: number) => (n > 0 ? `Försök ${n}` : "Nytt försök snart…"),
    notConnected: "Inte ansluten till servern.",
    sessionEndedKicked: "Du togs bort från spelet.",
    sessionEndedLobbyCleared: "Lobbyn rensades — gå med igen om du vill fortsätta.",
    lobbySheet: (ready: number, total: number) => `Lobby — redo: ${ready} / ${total}`,
    unready: "Ångra redo",
    ready: "Redo",
    startGame: "Starta spelet",
    shuffleAvatar: "Slumpa avatar",
    hostNeedPlayers: "Behövs minst 2 spelare och alla måste vara redo.",
    waitHostStart: "Väntar på att värden startar när alla är redo.",
    strength: "Styrka",
    /** Mobil: utrustningsrad under slots — attack från utrustning (utan tillfällig modifierare). */
    equipmentAttackFromGearAria: (n: number) => `Attack från utrustning: ${n}`,
    equipmentAttackFromGearWithTempAria: (gear: number, temp: number) =>
      `Attack från utrustning: ${gear}, tillfällig modifierare till nästa strid: ${temp > 0 ? `+${temp}` : temp}`,
    equipmentNextCombatModHint: "Tillfällig attackmodifierare till nästa strid",
    equipmentMaxHpAria: (n: number) => `Max HP (utrustning och bryggbonusar): ${n}`,
    /** Mobil: sköld = skadersläckning från rustning/hjälm/tillbehör m.m. */
    equipmentDefenseFromGearAria: (n: number) => `Sköld — skadersläckning från utrustning: ${n}`,
    equipmentBvbFromGearAria: (n: number) => `BvB-bonus på tärningsslag från utrustning: ${n}`,
    continue: "Fortsätt",
    chooseTeammate: "Lagstrid — välj en medkämpe",
    teamBattleLabel: "Lagstrid",
    teammateMustFight: "Vald spelare måste strida med dig i denna runda.",
    waitAttackerChooseTeammate: (name: string) => `Väntar på att ${name} väljer medkämpe…`,
    teammatePicked: (name: string) => `Medkämpe: ${name}`,
    waitTeammateCombatRoll: (name: string) => `${name} ska fortfarande slå sin tärning.`,
    waitTeamSecondRoll: "Väntar på lagkamratens tärning.",
    chooseBeerBroPartner: "Välj spelare som slår med angriparen (egen t6 + vapen):",
    combatMeetYou: "DU MÖTER",
    combatBeerBroLabel: "Ölkompis:",
    attackerViewingEncounter: (name: string) => `${name} tittar på mötet…`,
    bossFinaleVictory: "SEGER!",
    bossFinaleWinner: (name: string) => `${name} vinner!`,
    bossFinaleEnding: "Avslutar…",
    skipMonsterEncounter: "Undvik dålig batch (−2 pant)",
    skipMonsterEncounterToast: (playerName: string, enemyName: string) =>
      `${playerName} undviker ${enemyName} (−2 pant)`,
    beerBroUnavailableTeamBattle: "Ölkompis kan inte användas i lagstrid — välj medkämpe i stället.",
    beerBroAlreadyHelping: "En Ölkompis hjälper redan i den här striden.",
    theAttacker: "angriparen",
    yourD6: "Din t6",
    beerBroD6: "Ölkompis t6",
    attackTotalVs: (total: number, need: number) => `Attack totalt ${total} mot styrka ${need}`,
    /** Under stridstärning efter slag (siffra + ikon visas separat i UI). */
    combatRollAttackTotalLabel: "Attack totalt",
    combatRollVsLabel: "mot",
    waitAttackerContinue: (name: string) => `Väntar på att ${name} fortsätter…`,
    youLostTotal: (total: number, need: number) => `Du förlorade: totalt ${total} mot styrka ${need}`,
    hitChoiceIntro: (enemy: string) => `${enemy} — välj hur du tar träffen:`,
    hitChoiceDetail: (reduce: number, full: number) =>
      `Ta en klunk: −${reduce} skada (du får +1 klunk). Eller ta full ${full} skada, ingen klunk.`,
    takeSipReduce: (n: number) => `Ta en klunk (−${n} skada)`,
    fullDamageNoSip: (n: number) => `Full skada (${n}), ingen klunk`,
    /** Kapten Interrobang / Transporter: sekundär knapp utan pant/kompensation */
    takeFullDamageHp: (n: number) => `Ta full skada (${n} skada)`,
    /** Kapten Interrobang: val efter förlust. */
    hitMitigationInterrobangDetail:
      "Betala 5 pant för att minska skadan med 3, eller ta full skada.",
    hitMitigationInterrobangPrimary: "Betala 5 pant (−3 skada)",
    /** Transporter: val efter förlust. */
    hitMitigationTransporterDetail: "Betala 10 pant för att ta 0 skada, eller ta full skada.",
    hitMitigationTransporterPrimary: "Betala 10 pant (0 skada)",
    /** När spelaren inte har pant för Kapten Interrobang / Transporter. */
    hitMitigationPantOnlyFullDamage: (cost: number) =>
      `Du har inte ${cost} pant — ta full skada.`,
    waitAttackerChoose: (name: string) => `Väntar på att ${name} väljer…`,
    attackModifier: (m: number) => `Attackmodifierare: ${m}`,
    waitIntervene: "Väntar på att andra spelare ingriper…",
    rollCombat: "Slå tärning",
    /** Ungefärlig vinstchans före tärningsslag (bredvid monsterstyrka). */
    combatWinChancePct: (pct: number) => `${pct}%`,
    combatWinChanceAria: (pct: number) => `Ungefärlig vinstchans ${pct} procent`,
    combatHelpRequest: "Be om hjälp",
    combatHelpCancel: "Avbryt hjälpbegäran",
    combatHelpChooseHelper: "Välj vem du vill be om hjälp",
    combatHelpNoCandidates: "Ingen kan hjälpa till just nu.",
    combatHelpWaitAttackerChoose: (name: string) => `Väntar på att ${name} väljer hjälpare…`,
    combatHelpDecisionPrompt:
      "Vill du hjälpa till? Du slår din egen tärning (som i lagstrid) och delar risken vid förlust.",
    combatHelpDecisionDecline: "Hjälp inte till",
    combatHelpDecisionFree: "Hjälp till (gratis)",
    combatHelpDecisionPant: "Hjälp till mot panten",
    combatHelpDecisionTreasure: "Hjälp till mot skatten",
    combatHelpDecisionAll: "Hjälp till mot allt",
    combatHelpDecisionSplit: "Dela lika på vinsten",
    combatHelpWaitDecision: (name: string) => `Väntar på svar från ${name}…`,
    combatHelpRequesterPrompt: (name: string) => `${name} vill hjälpa till mot följande ersättning:`,
    combatHelpRequesterWait: (name: string) => `Väntar på att ${name} svarar på ditt villkor…`,
    combatHelpRequesterAccept: "Ja, acceptera villkoret",
    combatHelpRequesterDecline: "Nej, fortsätt utan hjälp",
    combatHelpPlayPositiveCard: "Spela minst ett positivt kort för att hjälpa till.",
    combatHelpNoPlayablePositiveCards: "Du har inget positivt hjälpkort att spela.",
    combatHelpWaitHelperCard: (name: string) => `Väntar på att ${name} spelar ett hjälpkort…`,
    combatHelpWaitHelperRoll: (name: string) => `Väntar på att ${name} slår sin tärning i striden…`,
    combatHelpDeniedToast: (name: string) => `${name} avböjde att hjälpa till.`,
    intervenePickCard: "Ingrip — välj ett kort",
    /** Avslutar ingripande utan kort — skickar pass till servern (samma som “Gör inget”). */
    interveneCancelPass: "Avbryt ingripande",
    /** Reaktor utan några ingripandeföremål i inventory — måste kunna passa så striden inte låser sig. */
    noInterveneCards: "Du har inga föremål att ingripa med i den här striden.",
    /** Efter “Ingrip” finns inga spelbara kort (t.ex. redan förbrukade) — avsluta med pass. */
    interveneNoCardsPlayable: "Du har inga spelbara ingripandekort.",
    itemSuffixBeerBro: " (häng på i striden)",
    back: "Tillbaka",
    inCombat: (name: string) => `${name} är i strid`,
    intervene: "Ingrip",
    doNothing: "Gör inget",
    encounterChoose: "Möte — bryggare mot bryggare. Välj:",
    /** Prefix när rörelseval leder till ruta med annan bryggare; kombineras med ruttyp, t.ex. «BvB / Händelse». */
    moveChoiceBvbLabel: "BvB",
    moveChoiceMerchant: "Panta burkar",
    pvpChooseOpponent: "BvB — välj motståndare:",
    /** Mötesval: inget parentestext om inga giltiga namn (extremt fall). */
    pvpBothRollVersus: (opponentNamesCommaSeparated: string) =>
      opponentNamesCommaSeparated.trim().length > 0
        ? `BvB (${opponentNamesCommaSeparated})`
        : "BvB",
    /** Mötesval: knapptext för att inte ta BvB — bara ruttypen (t.ex. Skatt, Händelse). */
    resolveTileNoPvp: (tileLabel: string) => tileLabel,
    pvpRollDie: "Slå din tärning",
    pvpRound: (n: number) => `Rond ${n}`,
    pvpRoundYouWon: "Du vann ronden",
    pvpRoundYouLost: "Du förlorade ronden",
    pvpRoundBestOf: (round: number, bestOf: number) => `Rond ${round} av ${bestOf}`,
    pvpTieRerollHint: "Lika — båda slår om.",
    /** Efter rondslag: matchen fortsätter efter att båda bekräftat. */
    pvpRoundRevealNextRound: (completedRound: number, nextRound: number) =>
      `Rond ${completedRound} klar. Bekräfta innan rond ${nextRound}.`,
    pvpRoundRevealMatchEnd: "Sista ronden klar — matchen är avgjord. Bekräfta innan byte.",
    pvpRoundRevealTotals: (attackerTotal: number, defenderTotal: number) =>
      `Totalt angripare ${attackerTotal} · försvarare ${defenderTotal}`,
    pvpRoundRevealContinue: "Fortsätt",
    pvpRoundRevealDone: "Bekräftat",
    pvpRoundRevealTapToContinue: "Tryck Fortsätt när du sett resultatet.",
    pvpRoundRevealWaitOther: (name: string) => `Väntar på att ${name} bekräftar…`,
    pvpRoundRevealBothAcked: "Klart — går vidare…",
    yourD6TotalWeapon: (die: number, total: number) => `Din t6: ${die} · totalt ${total} med vapen.`,
    youRolled: "Du har slagit",
    combatPlayerHasRolled: "har slagit",
    combatPlayerHasNotRolled: "har inte slagit",
    rollPvpDie: "Slå BvB-tärning",
    pvpPreRoundItemsHint: "Spela föremål för att påverka striden.",
    pvpReady: "Klar",
    pvpReadyUndo: "Inte klar än",
    pvpBothReady: "Båda är redo — slagrundan startar nu.",
    pvpWaitingOpponentReady: (name: string) => `Väntar på att ${name} markerar klar…`,
    pvpPressReadyWhenDone: "Tryck Klar när du spelat färdigt dina kort.",
    /** Du har inget av de föremål som får spelas i BvB-förberedelsen — servern räknar dig som klar utan knapptryck. */
    pvpNoItemsAutoReady: "Du har inga BvB-föremål att spela.",
    pvpWaitingOpponentItemsOrReady: (name: string) =>
      `Väntar på att ${name} spelar klart eller markerar klar…`,
    pvpScoreLabel: "Matchställning",
    payPant: (n: number) => `Betala ${n} pant`,
    haveKlunkar: (n: number) => `Ha minst ${n} klunkar`,
    /** Dörr/nivå: klunkantal _eller_ bryggnivå (header) kan räcka utan att siffran nåtts. */
    doorAscendSipsOrBrewer: (minKlunk: number) =>
      `Stig med klunkar (minst ${minKlunk})`,
    stay: "Stanna",
    levelUpPrompt: (levelDisplay: number) =>
      `Som bryggmästare kan du stiga till nivå ${levelDisplay}. Gör du det?`,
    levelUpBrewerToast: (level: number) => `Bryggnivå ${level}! Du steg i bryggnivå.`,
    levelUpProgressTitle: (brewerLevel: number) => `Bryggnivå ${brewerLevel}`,
    levelUpProgressAria: (brewerLevel: number) =>
      `Bryggnivå ${brewerLevel}, XP mot nästa bryggnivå.`,
    levelUpOfferTitle: "Gå upp till nästa nivå?",
    levelUpOfferPrompt: (_levelDisplay: number) =>
      "Från räddade batcher till botten av glaset; du har sett allt. Som en sann bryggmästare har du nu bemästrat hantverket och låst upp nästa nivå. Vågar du anta utmaningen och höja svårighetsgraden?",
    levelUpOfferHint: "",
    /**
     * `boardLevelIndex` = målvåning 0-baserad (samma som `levelIndex` efter uppstigning).
     * Endast monster **på det planet** får +N på styrkekrav; pant/klunkar/skada ändras inte av nivåbytet.
     */
    levelUpMonsterScaleOnDestination: (boardLevelIndex: number): string => {
      const bonus = boardLevelIndex;
      if (bonus <= 0) return "";
      return `På nästa våning blir dåliga batchar starkare och gör mer i skada.`;
    },
    levelUpNow: "Stig till nästa nivå nu",
    levelUpStayForTile: "Stanna kvar (en tur till)",
    brewerPerkTitle: "Bryggnivå upp!",
    brewerPerkPrompt: (levelsRemaining: number) =>
      levelsRemaining > 1
        ? `Välj bonus (${levelsRemaining} kvar).`
        : "Välj en permanent bonus:",
    brewerPerkAttack: "+1 styrka",
    brewerPerkShield: "+1 sköld",
    brewerPerkHp: "+2 HP",
    brewerPerkPvp: "+1 BvB",
    brewerPerkItems: "+1 föremålskort",
    brewerPerkChoiceWithCap: (label: string, count: number, max: number) => `${label} (${count}/${max})`,
    brewerItemCardBonusAria: (bonus: number) => `Föremålsbonus ${bonus}`,
    merchantItemKindEquipment: "Utrustning · permanent",
    merchantItemKindConsumable: "Föremål · engångsanvändning",
    merchantItemKindGold: "Pant · direkt",
    merchantDetailBuy: "Köp",
    merchantDetailBack: "Tillbaka",
    pvpArmorDamageHint:
      "Rustning hjälper dig vinna BvB-duellen. Den stoppar bara skada om motståndaren väljer HP-straff efteråt.",
    merchantReplaceBody: (slot: string, currentName: string, newName: string) =>
      `Du har redan ${currentName} som ${slot}. Vill du byta mot ${newName}? Den gamla utrustningen ersätts.`,
    merchantReplaceConfirm: "Ja, byt ut",
    merchantReplaceCancel: "Avbryt",
    lootEquipmentReplaceTitle: (slot: string) => {
      switch (slot) {
        case "weapon":
          return "Nytt vapen — vill du byta?";
        case "armor":
          return "Ny rustning — vill du byta?";
        case "helmet":
          return "Ny hjälm — vill du byta?";
        case "accessory":
          return "Nytt tillbehör — vill du byta?";
        default:
          return "Ny utrustning — vill du byta?";
      }
    },
    equipmentReplaceCurrentEffects: "Nuvarande",
    equipmentReplaceNewEffects: "Ny utrustning",
    lootEquipmentReplaceDecline: "Nej, behåll det jag har",
    merchantCantAfford: "Du har inte råd.",
    merchantReroll: "Slumpa om",
    merchantShopCollapsedHint: "Minimerad — visa panelen för att se vad du kan köpa.",
    /** Affärsdetalj: mekanisk effektrad när kortregel saknas (sv). */
    shopPower: (n: number) => (n >= 0 ? `Kraft +${n}` : `Kraft ${n}`),
    shopGoldDeposit: (n: number) => `+${n} pant`,
    shopPvpOnRoll: (n: number) => (n > 0 ? `BvB: +${n} på slag` : `BvB: ${n} på slag`),
    shopPerFightGold: (n: number) => `Per strid: +${n} pant`,
    shopBreaksAfterWin: "Går sönder efter vinst",
    shopMonsterLossSip: (n: number) => `Vid förlust mot monster: −${n} straffklunk`,
    shopAttackSigned: (n: number) => (n > 0 ? `Attack +${n}` : `Attack ${n}`),
    shopBeerSetArmor: "Burk-set rustning: +2 / +4 / +10 max HP (1–3 delar)",
    shopBeerSetHelm: "Burk-set hjälm: +1 / +2 / +3 attack (1–3 delar)",
    shopBeerSetShield: "Burk-set sköld: +1 / +2 / +3 skada bort (1–3 delar)",
    shopDamageNegateFromLevel4: (n: number) => `Skada −${n} (aktiv från nivå 4)`,
    shopDamageNegate: (v: number) => (v >= 0 ? `Skada −${v}` : `Skada +${Math.abs(v)}`),
    shopPerFightSip: (n: number) => `Per strid: +${n} klunk`,
    shopCannotBeStolen: "Kan inte bli bestulen",
    shopLevelUpDiscount: (n: number) => `Nivå upp: −${n} pant`,
    shopMerchantDiscount: (n: number) => `Handel: −${n} billigare i affären`,
    shopCanSkipMonsterFight: "Kan välja att undvika monsterstrid",
    shopNegateAllOnce: "Blockar all skada en gång",
    shopCannotBeChallengedBvb: "Kan inte utmanas i BvB",
    shopIgnoreCritFailOnOne: "Etta på stridstärning ger inte automatisk förlust",
    shopDeathContinue: (n: number) => `Vid död: betala ${n} pant för fullt liv`,
    shopItemCardBonus: (n: number) => `+${n} föremålskort`,
    shopFreeItemPlay: "Föremål: gratis att spela",
    shopPlastbackSupplement: "Tom flaska: 6 strider",
    /** Plastback: argument = pant vid försäljning (= flaskor kvar i hållaren). */
    sellPlastbackAccessory: (pant: number) =>
      pant > 0 ? `Sälj Plastback (+${pant} pant)` : "Sälj Plastback",
    takePlastbackBottle: (packRemaining: number) =>
      packRemaining > 0 ? `Ta flaska (${packRemaining} kvar)` : "Ta flaska",
    /** Ta bort/kasta utrustad pjäs (förstörs). */
    unequipEquipment: "Ta bort",
    unequipEquipmentAria: (itemName: string) => `Ta bort ${itemName}`,
    leave: "Lämna",
    pvpChooseLoot: "BvB — välj byte",
    takePantMax10: "Ta pant (max 10)",
    givePenaltyKlunk: "Straffklunk (+1)",
    pvpDeal2Damage: "Ge förloraren 2 skada",
    takeSlot: (slot: string) => `Ta ${slot}`,
    /** BvB-byte: visar faktiskt borttaget pantbelopp (max 10). */
    pvpLootTakePant: (amount: number) => `Ta pant (${amount})`,
    /** BvB-byte: klunkar motståndaren får (inkl. hjälm/tillbehör-straffbonus). */
    pvpLootPenaltyKlunk: (klunkar: number) =>
      klunkar === 1 ? `Straffklunk (+1 klunk)` : `Straffklunk (+${klunkar} klunkar)`,
    /** BvB-byte: 2 HP-skada med förhandsvisning av motståndarens HP. */
    pvpLootDealDamageLine: (fromHp: number, toHp: number, blockedByNegateOnce: boolean): string => {
      if (blockedByNegateOnce) return `Ge 2 skada (HP oförändrad — rustning/hjälm blockerar)`;
      return `Ge 2 skada (HP ${fromHp}→${toHp})`;
    },
    /** BvB-byte: slot redan versaliserad, `itemName` trunkeras i anroparen vid behov. */
    pvpLootTakeEquipment: (slotLabel: string, itemName: string) => `Ta ${slotLabel}: ${itemName}`,
    noItemsToSteal: "Inga föremål att ta.",
    /** Förloraren har t.ex. solbrillor (preventTheft): BvB-byte är bara pant, straffklunk eller skada. */
    pvpLootTheftProtectedHint:
      "Motståndaren är skyddad mot utrustningsbyte — välj pant, straffklunk eller skada.",
    rollDie: "Slå tärning",
    /** Föremålet «Ett sjätte ölsinne»: välj fast tärningsyta innan Använd. */
    itemsChooseDiceFace: "Välj siffra (1–6) för nästa slag",
    /** Under strid efter Skägget rakt bak — t6 visas som slaget men bidraget till total är 2×. */
    combatAttackDoubledHint: "Tärningen räknas dubbelt i attacktotalen (Skägget rakt bak).",
    lobbyHeader: (room: string, status: string) => `Lobby ${room} · ${status}`,
    /** Statusfot i PlayView när spelet pågår — egen rad ovanför lobby-raden. */
    footerTurnYou: "Din tur",
    footerTurnOther: (name: string) => {
      const n = name.trim() || "—";
      return `${n}${n.endsWith("s") ? "" : "s"} tur`;
    },
    /** Toast när någon spelar ett föremål på dig. */
    itemPlayedOnYou: (actorName: string) => `${actorName} spelade på dig`,
    /** Mobil: åskådare under pågående BvB. */
    emoteCaptionSpectatingPvp: (attacker: string, defender: string) =>
      `BvB: ${attacker} mot ${defender}`,
    /** Mobil: efter ingripande-pass, väntar på att striden går vidare. */
    emoteCaptionWaitingCombatContinue:
      "Du har redan valt. Väntar på att striden fortsätter…",
    emoteOpenPickerAria: "Skicka emote",
    emoteClosePickerAria: "Stäng emote-väljare",
    emotePickerAria: "Välj emote",
    emoteCooldown: "Vänta lite innan nästa emote",
    emoteSendAria: (id: string) => {
      const labels: Record<string, string> = {
        surprised: "Förvånad",
        happy: "Glad",
        sad: "Ledsen",
        angry: "Arg",
        love: "Kärlek",
      };
      return `Skicka ${labels[id] ?? "emote"}`;
    },
    players: "Spelare",
    settings: "Inställningar",
    settingsTitle: "Inställningar",
    settingsLanguage: "Språk",
    settingsRainbowEffects: "Regnbågseffekt",
    settingsDiceAnimations: "Snurrande 3D-tärning",
    settingsMobileSfx: "Ljudeffekter",
    settingsLobbyStatus: "Anslutning",
    settingsTurnStatus: "Turstatus",
    settingsOpenTutorial: "Läs spelregler",
    settingsLeaveGame: "Lämna spelet",
    settingsLeaveGameConfirm: "Är du säker på att du vill lämna spelet?",
    settingsLeaveGameCancel: "Avbryt",
    /** Mobil efter join: ansvarsfullt spelande / alkohol (obligatorisk bekräftelse). */
    responsibleReminderTitle: "En viktig påminnelse",
    responsibleReminderBody:
      "Vi vill att alla ska ha roligt! Drick ansvarsfullt och tänk på att alkohol kan vara skadligt för hälsan. Du behöver absolut inte dricka alkohol för att delta – vatten, läsk eller alkoholfri öl fungerar precis lika bra för att vinna (eller förlora) med stil.",
    responsibleReminderOk: "Jag förstår",
    panelMinimize: "Minimera panel",
    panelMaximize: "Visa panel",
    waitingState: "Väntar på tillstånd…",
    lookingForPlayer: "Letar efter din spelare…",
    sessionStale:
      "Servern har startats om eller spelet matchar inte längre din anslutning. Gå till startsidan och gå med igen om det inte löser sig inom några sekunder.",
    sessionStaleLeave: "Till startsidan",
    pant: "Pant",
    klunkar: "Klunkar",
    itemsHeading: "FÖREMÅL",
    itemsEmpty: "Inga föremål än.",
    lobbySectionTitle: "Lobby",
    lobbyReadyLine: (ready: number, total: number) =>
      `Redo: ${ready} / ${total} (alla måste vara redo)`,
    lobbyBottomHint: "Använd panelen längst ned för att bli redo och starta.",
    lobbyDifficulty: "Svårighetsgrad",
    lobbyDifficultyLattol: "Lättöl",
    lobbyDifficultyFolkol: "Folköl",
    lobbyDifficultyStarkol: "Starköl",
    lobbyDifficultyImperial: "Imperial",
    lobbyBoardSize: "Brädstorlek",
    lobbyBoardSizeDefault: "Standard",
    lobbyBoardSizeLarge: "Stor",
    lobbyBoardSizeXLarge: "Extra stor",
    lobbyLevelCount: "Antal nivåer",
    lobbyHardcore: "Hardcore (ingen omstart vid 0 HP)",
    lobbySetupTitle: "Lobbyinställningar",
    lobbyHardcoreModeLabel: "Hardcore mode (endast 1 liv)",
    lobbyAllowLateJoinLabel: "Tillåt sen anslutning",
    lobbyClearPlayersOnRematchLabel: "Rensa spelare vid nytt spel",
    lobbyWakeLockDisableScreen: "Inaktivera sömnläge för skärm",
    lobbyWakeLockBeforeStart: "Håll skärmen vaken redan i lobby",
    lobbyStartLobby: "Starta lobby",
    /** Lobby: sektion för kosmetik (kortbaksida, framtida pjäsar, ramar …). */
    lobbyAppearance: "Utseende",
    lobbyCardCoverDefault: "Standard",
    lobbyCardCoverAlt1: "Variant 1",
    lobbyCardCoverAlt2: "Variant 2",
    lobbyShowCardToggles: "Välj tillåtna kort",
    lobbyHideCardToggles: "Dölj kortval",
    lobbyCardToggleHint: "Systemkort kan inte stängas av här. Avmarkerade kort dras inte i spelet.",
    lobbyAdvancedSettings: "Avancerade inställningar",
    lobbyGeneral: "Generella",
    lobbyAccessibility: "Tillgänglighet",
    lobbyGameValues: "Spelvärden",
    lobbyAllowedCards: "Tillåtna kort",
    lobbyMaxHp: "Max HP",
    lobbyStartPant: "Startpant",
    lobbyPvpBestOf: "Antal BvB-rundor",
    lobbyMaxPlayers: "Max antal spelare",
    lobbyTurnTimeoutEnabled: "Tur-timeout",
    lobbyTurnSeconds: "Tid per tur",
    lobbyMissedTurnsKickAfter: "Kick efter missade turer",
    lobbyMissedTurnsKickAfterOff: "Av",
    lobbyReactionSeconds: "Reaktionstimer",
    brewerDownTitle: "Stupad bryggare",
    brewerDownLead: "Du har noll HP. Välj hur du vill fortsätta.",
    brewerDownRetry: "Starta om på nytt",
    brewerDownInsuredContinue: (cost: number) => `Livförsäkring: betala ${cost} pant`,
    brewerDownGiveUp: "Ge upp",
    brewerDownWaitOther: (name: string) => `Väntar på att ${name} väljer …`,
    gameOver: "Spelet är slut",
    scoreboardTableCaption: "Slutresultat per spelare",
    scoreboardColName: "Spelare",
    scoreboardColLevel: "Nivå",
    /** Antal gånger stupad bryggare (0 HP). */
    scoreboardColKnockdowns: "Stup",
    /** Monsterstrider vunna / förlorade. */
    scoreboardColMonsterWl: "Monst.",
    /** BvB-matcher vunna / förlorade (rubrik aria-label). */
    scoreboardColPvpWl: "BvB, vunna och förlorade matcher",
    scoreboardColItems: "Förbr.",
    /** Klunk-kolumnen visar kumulativt intagna klunkar (alla liv). */
    scoreboardColKlunk: "Klunk (totalt parti)",
    scoreboardColPant: "Pant",
    scoreboardColHp: "HP",
    scoreboardKlunkCellAria: (total: number) => `${total} klunkar intagna totalt under partiet`,
    scoreboardPantCellAria: (wallet: number) => `Pant i plånbok ${wallet}`,
    scoreboardBrewerLevelAria: (n: number) => `Bryggnivå ${n}`,
    scoreboardLeftGameAria: "Lämnade spelet",
    winner: "Vinnare",
    /** Knapp i modalen när spelet är slut — går till startsidan. */
    gameOverLeaveToHome: "Avsluta spelet",
    /** Bord: nytt parti i samma rum med samma lobbyinställningar. */
    gameOverPlayAgain: "Nytt spel",
    /** Valfri länk till Google Forms efter avslutat parti (mobil). */
    gameOverFeedback: "Ge feedback (valfritt)",
    spotlightRegionAria: "Höjdpunkter",
    spotlightMostOnesTitle: "Flest ettor",
    spotlightMostPantSpentTitle: "Mest spenderad pant",
    spotlightMostPvpWinsTitle: "Flest BvB vinster",
    spotlightMostPvpMatchesTitle: "Flest BvB matcher",
    spotlightMostLossesTitle: "Flest förluster",
    spotlightMostSabotageTitle: "Saboterat mest",
    spotlightMostHelpedTitle: "Hjälpt till mest",
    spotlightMaxRollTitle: "Högsta tärningsslag",
    spotlightMostKnockdownsTitle: "Dog mest",
    spotlightMostMonsterWinsTitle: "Räddat flest batcher",
    spotlightMostHpLostTitle: "Förlorat mest HP",
    debugLine: (parts: {
      ws: string;
      myId: string;
      meId: string;
      lastState: string;
      players: string | number;
      rtt: string;
    }) =>
      `ws: ${parts.ws} · felsök: mitt id=${parts.myId} · jag=${parts.meId} · senaste tillstånd=${parts.lastState} · spelare=${parts.players} · svarstid=${parts.rtt}`,
    modalPlayers: "Spelare",
    hostTag: "(värd)",
    statsLine: (hp: number, maxHp: number, pant: number, klunk: number) =>
      `HP ${hp}/${maxHp} · Pant ${pant} · Klunkar ${klunk}`,
    equipWeapon: "Vapen",
    equipArmor: "Rustning",
    equipHelmet: "Hjälm",
    equipAccessory: "Tillbehör",
    modalItem: "FÖREMÅL",
    itemNotFound: "Föremålet hittades inte.",
    chooseTarget: "Välj mål",
    use: "Använd",
    itemsUseOnSelf: "Använd själv",
    itemsUseHint: "Du kan använda föremål på din tur eller under stridsreaktioner.",
    itemsPassiveHint: "Detta föremål behöver inte användas — det gäller automatiskt så länge det ligger i förrådet.",
    itemShortcutNoBossTile: "Ingen bossruta på sista våningen.",
    itemShortcutBossCost: (goldCost: number, onBoss: boolean) =>
      `Nuvarande kostnad: ${goldCost} pant (${onBoss ? "lös slutbossrutan direkt — du står redan på rutan." : "gå direkt till slutbossens ruta."})`,
    itemShortcutTopFloor: "Du är redan på översta våningen.",
    itemShortcutLevelCost: (goldCost: number, levelNumber: number) =>
      `Nuvarande kostnad: ${goldCost} pant (till nivå ${levelNumber}).`,
    modalClose: "Stäng",
    emptySlot: "Tom plats.",
    armorNegateAllOnce: "Nollställ all skada en gång (går sedan sönder)",
    negatePerHit: (n: number) => `Nollställ ${n} skada per träff`,
    bonusHp: (n: number) => `Bonus-HP +${n}`,
    healHpPerTurn: (n: number) => `Varje drag: +${n} HP (upp till max).`,
    combatBonus: (n: number) => `Stridsbonus +${n}`,
    moveSteps: (n: number) => `Rörelse +${n} steg`,
    powerPlus: (n: number) => `Kraft +${n}`,
    equipmentWinGold: (n: number) => `Vid vinst: +${n} pant.`,
    equipmentRandomOtherDamage: (n: number) => `Vid vinst: slumpad annan spelare tar ${n} skada.`,
    equipmentPowerAtGold10: (n: number) => `Vid 10+ pant: kraft +${n}.`,
    equipmentPowerAtGold20: (n: number) => `Vid 20+ pant: kraft +${n}.`,
    equipmentPowerAtGold30: (n: number) => `Vid 30+ pant: kraft +${n}.`,
    equipmentSipWeaponKlunkBonus: (kl: number, tot: number, base: number) =>
      `Strid mot monster: valfritt ${kl} klunk före stridstärningen → +${tot} attack från vapnet (+${base} utan klunk).`,
    equipmentSipWeaponPantBonus: (cost: number, bonus: number) =>
      `Strid mot monster: valfri betalning ${cost} pant före stridstärningen för +${bonus} attack.`,
    equipmentSipWeaponFreeBonus: (bonus: number) =>
      `Strid mot monster: valfri bonus före stridstärningen för +${bonus} attack.`,
    equipmentPvpCannotBeChallenged:
      "Andra spelare kan inte utmana dig till BvB, men du kan utmana dem.",
    equipmentGoldOnDamage: (n: number) => `När du tar skada: få +${n} pant.`,
    equipmentBossDamageNegate: (n: number) => `Mot boss: nollställ ytterligare ${n} skada per träff.`,
    equipmentPenaltySipExtra: (n: number) => `När du får straffklunk: drick ${n} extra klunk.`,
    equipmentGoldPerPenaltyKlunk: (n: number) => `Per straffklunk: +${n} pant.`,
    equipmentKlunkAttack10: (n: number) => `Vid 10+ klunkar: +${n} attack.`,
    equipmentKlunkAttack20: (n: number) => `Vid 20+ klunkar: +${n} attack.`,
    pvpWeaponDieBonus: (n: number) =>
      `I dueller (BvB): +${n} på slagtotalen (påverkar inte strid mot dålig batch).`,
    combatCardSheetTitle: "Dålig batch",
    treasureCardSheetTitle: "Skatt",
    treasureLootHeading: "Byte",
    combatWinTitle: "Batch räddad!",
    combatWinRewards: "Belöningar",
    combatWinContinue: "FORTSÄTT",
    combatWinEnemyFallback: "den dåliga batchen",
    combatWinTeamLegacy: "Ni vinner!",
    combatWinSubtitle: (winner: string, enemy: string) => `${winner} vinner mot ${enemy}`,
    combatWinSubtitleTeam: (a: string, b: string, enemy: string) => `${a} och ${b} vinner mot ${enemy}`,
    combatWinSubtitleHelpMate: (attacker: string, enemy: string) =>
      `Du hjälpte till — ${attacker} vinner mot ${enemy}`,
    combatWinRoll: (roll: number, need: number) => `Slag: ${roll} (krävdes ${need})`,
    combatWinRandomOtherSip: (recipient: string) =>
      `${recipient} får en straffklunk — slumpad annan spelare.`,
    /** Mobil PlayView: efter Fortsätt på vinst-modal — kort/utrustning du drog */
    combatWinGrantedLootToast: (titles: string[]) =>
      titles.length === 1 ? `Du fick: ${titles[0]}` : `Du fick:\n${titles.map((t) => `• ${t}`).join("\n")}`,
    combatSipWeaponPrompt: (
      weaponName: string,
      bonusIncrement: number,
      costGold: number,
      costKlunks = 0,
      totalWeaponAtk?: number,
    ) =>
      costKlunks > 0
        ? `${weaponName}: vill du dricka ${costKlunks} klunk för +${totalWeaponAtk ?? bonusIncrement} attack från vapnet på detta slag?`
        : `${weaponName}: vill du betala ${costGold} pant för +${bonusIncrement} attack på detta slag?`,
    combatSipWeaponRollWith: (
      bonusIncrement: number,
      costGold: number,
      costKlunks = 0,
      totalWeaponAtk?: number,
    ) =>
      costKlunks > 0
        ? `Drick ${costKlunks} klunk (+${totalWeaponAtk ?? bonusIncrement} från vapnet)`
        : `Betala ${costGold} pant (+${bonusIncrement} attack)`,
    combatSipWeaponRollWithout: "Slå utan bonus",
    /** Efter slag med etta på t6 — vid tärningen (mobil + bord). */
    combatCritFailOnOneNearDice: "Kritisk miss!",
    combatLoseTitle: "Vaskad!",
    combatLoseContinue: "FORTSÄTT",
    combatLoseSubtitle: (player: string, enemy: string) => `${player} förlorar mot ${enemy}`,
    combatLoseSubtitleHelpMate: (attacker: string, enemy: string) =>
      `Du hjälpte i striden — ${attacker} förlorade mot ${enemy}`,
    combatLoseSubtitleBeerBro: (attacker: string, enemy: string) =>
      `Ni förlorade tillsammans — ${attacker} förlorade mot ${enemy}`,
    combatLosePenalties: "Påföljder",
    /** Mobil: när angriparen stänger förlust — du var stridshjälp eller ölkompis */
    /** Mobil: målspelare när någon spelar Peka argt. */
    pekaArgtDamageToast: (fromName: string) =>
      `${fromName} pekade argt på dig. Du tar 1 skada.`,
    combatLoseAllyImpactToast: (role: "helpMate" | "beerBro", hpLost: number, klunksGained: number) => {
      const head = role === "helpMate" ? "Stridshjälp" : "Ölkompis i striden";
      const bits: string[] = [];
      if (hpLost > 0) bits.push(`−${hpLost} HP`);
      if (klunksGained > 0) bits.push(`+${klunksGained} straffklunk`);
      return bits.length === 0 ? `${head}: ingen ytterligare påföljd för dig.` : `${head}: du drabbades — ${bits.join(", ")}`;
    },
    combatLoseNoDirectPenalty: (player: string) =>
      `Ingen direkt skada eller extra klunk för ${player} på denna träff.`,
    combatLoseLostEquipment: (player: string, item: string) => `${player} tappade utrustning: ${item}.`,
    combatLoseImperialSplash: "Övriga spelare på samma våning tog 1 skada vardera (Stoorns stänk).",
  },
  table: {
    wsConnecting: "Ansluter till bordet…",
    wsWaitingRetry: "Försöker igen om en stund…",
    wsRetry: "Försök igen",
    wsReconnectAttempt: (n: number) => `Återanslutning · försök ${n}`,
    wsReconnectFooterConnecting: "Ansluter…",
    wsReconnectFooterWaiting: (n: number) => (n > 0 ? `Försök ${n}` : "Nytt försök snart…"),
    combatOverlayTitle: "Bräde — dålig batch",
    combatPhase1: "1 — Möte",
    combatPhaseTeam: "0 — Välj medkämpe",
    teamBattleIntroTitle: "Lagstrid",
    teamBattleLabel: "Lagstrid",
    teamBattleWaitTeammate: "väntar på val av medkämpe",
    teamBattleNextOpponent: "Motståndare",
    teamBattleIntroBody: (attacker: string) =>
      `${attacker} väljer medkämpe på sin mobil innan striden börjar.`,
    teamBattleIntroHint:
      "Vid förlust dricker båda extra straffklunk enligt batchkortet — ni slår tillsammans mot samma styrka.",
    combatPhase2: "2 — Kort & tärning",
    combatPhase3Choice: "3 — Träffval (klunk eller full)",
    combatPhase3Result: "3 — Resultat",
    isFighting: "möter",
    strength: "Styrka",
    canIntervene: "Kan ingripa:",
    combatHelpAsking: "Begär hjälp:",
    combatHelpAwaitDecision: (name: string) => `Väntar på svar från ${name}…`,
    combatHelpAwaitCard: (name: string) => `${name} ska slå tärning i striden.`,
    combatHelpAcceptedContract: (name: string, contract: string) =>
      `${name} hjälper till (${contract}).`,
    /** Bräd-TV: stor banner medan hjälpare deltar (legacy helpAwaitCard). */
    combatHelpAwaitCardBanner: (helperName: string) => `${helperName} hjälper till`,
    /** Bräd-TV: stor banner medan hjälpbegäran väntar på ja/nej (stil som merchantShopping). */
    combatHelpRequestBanner: (attackerName: string) => `${attackerName} ber om hjälp`,
    combatHelpRequestBannerAria: (attackerName: string) => `${attackerName} ber om hjälp`,
    /** Bräd-TV: stor banner medan angriparen svarar på hjälparens villkor. */
    combatHelpRequesterWaitBanner: (attackerName: string) => `Väntar på ${attackerName}`,
    combatHelpRequesterWaitBannerAria: (attackerName: string) =>
      `Väntar på att ${attackerName} svarar på hjälpvillkoret`,
    attackerChoosesHit: (reduce: number) =>
      `Angriparen väljer: klunk (−${reduce} skada) eller full träff.`,
    attackerChoosesInterrobangHit:
      "Angriparen väljer: betala 5 pant (−3 skada) eller full träff.",
    attackerChoosesTransporterHit:
      "Angriparen väljer: betala 10 pant (0 skada) eller full träff.",
    /** Visas vid tärningen under reaktionsfasen när angriparen har pip-vapen (modifier utanför t6). */
    diceModifierOptionalSipSuffix: (sipBonus: number, costKlunks = 0) =>
      costKlunks > 0
        ? `· +${sipBonus} mot straffklunk (valfritt)`
        : `· +${sipBonus} mot pantkostnad (valfritt)`,
    diceModifierOnlyOptionalSip: (sipBonus: number, costKlunks = 0) =>
      costKlunks > 0
        ? `+${sipBonus} mot straffklunk (valfritt)`
        : `+${sipBonus} mot pantkostnad (valfritt)`,
    /** Bräd-tv: efter slag om valfri pip-vapenbonus faktiskt togs — bara siffra + etikett vid tärningen. */
    diceModifierSipTakenSub: (costKlunks = 0) => (costKlunks > 0 ? "mot straffklunk" : "mot pantkostnad"),
    /** Bräde: summeringsrad under stridstärningen ("totalt 9"). */
    diceTotalCaption: "totalt",
    pvpDuel: "BvB",
    pvpRound: (n: number) => `Rond ${n}`,
    pvpRoundBestOf: (round: number, bestOf: number) => `Rond ${round} av ${bestOf}`,
    pvpTieRerollHint: "Lika — båda slår om.",
    pvpPrepPhase: "Förberedelser (kort)",
    pvpRoundResultPhase: "Rondresultat",
    pvpRoundResultHint: "Båda bekräftar på mobilen innan nästa steg.",
    pvpScoreLine: (attackerWins: number, defenderWins: number) => `Matchställning: ${attackerWins}-${defenderWins}`,
    roleAttacker: "Angripare",
    roleDefender: "Försvarare",
    dieAttackTotal: (die: number, total: number) => `T6 ${die} · attack totalt ${total}`,
    waitingRoll: "Väntar på slag…",
    winner: "Vinnare",
    winnerChoosesLoot: "Vinnaren väljer byte på sin mobil…",
    board: "Bräde",
    /** Brädvy: aktuell turs färgfält, höger — nästa i turnOrder */
    turnBannerNext: (name: string) => `Nästa: ${name}`,
    combatMeetBanner: (name: string) => `${name.toLocaleUpperCase("sv-SE")} MÖTER`,
    /** Lagstrid med vald medkämpe: båda namnen i rubriken (ersätter "Lagstrid: X"-raden). */
    combatMeetBannerTeam: (a: string, b: string) =>
      `${a.toLocaleUpperCase("sv-SE")} OCH ${b.toLocaleUpperCase("sv-SE")} MÖTER`,
    /** Namnsammanfogning i strids-/lagstridsrader ("Erik och Vera"). */
    namesAndJoin: (a: string, b: string) => `${a} och ${b}`,
    /** Sömnmedel: kommande hoppade turer innan spelaren får agera normalt */
    playerStatusSleepSkip: (skippedTurns: number) =>
      skippedTurns === 1
        ? "Står över nästa tur (sömn)"
        : `Står över ${skippedTurns} turer (sömn)`,
    /** Skakad öl: förlust mot monster — hopptur med denna etikett tills motsvarande tur förbrukats. */
    playerStatusOilInEye: "Öl i ögat",
    /** Bräd-tv: vem som spelade (kortnamn visas separat ovanför) */
    tableItemPlayActorLine: (actorName: string) => actorName,
    /** Bräd-tv: spelare och mottagare */
    tableItemPlayActorTargetLine: (actorName: string, targetName: string) =>
      `${actorName} · ${targetName}`,
    /** Bräd-toast när straffklunk-notis pushas (ej custom modal-body). */
    sipNoticeToast: (recipientName: string, count: number) =>
      `${recipientName} får ${count} straffklunk${count === 1 ? "" : "ar"}.`,
    brewerLevelUpToast: (name: string, level: number) => `${name} når bryggnivå ${level}!`,
    combatRewardGoldToast: (recipients: string, amount: number) =>
      `Belöning till ${recipients}: +${amount} pant`,
    combatRewardItemsToast: (recipients: string, count: number) =>
      `Belöning till ${recipients}: ${count} ${count === 1 ? "skatt" : "skatter"}`,
    combatRewardHelpMateToast: (name: string, titles: string) => `Belöning till ${name}: ${titles}`,
    toastFallbackPlayer: "Spelare",
    toastFallbackHelper: "Hjälparen",
    floorN: (n: number) => `Nivå ${n}`,
    lobby: "Lobby",
    status: "Status",
    wakeLockToggle: "Inaktivera sömnläge",
    wakeLockUnsupported: "Stöds inte i denna webbläsare",
    lastState: "senaste tillstånd",
    game: "Spel",
    waitingState: "Väntar på tillstånd…",
    phase: "Fas",
    players: "Spelare",
    readyAll: (r: number, t: number) => `Redo: ${r} / ${t} (alla måste vara redo)`,
    die: "Tärning",
    pending: "Väntande",
    lobbyList: "Lobby",
    lobbyScanQrToJoin: "Skanna för att gå med i lobbyn",
    lobbyJoinUrlShort: "spela.bryggverket.se/join",
    lobbyCopyJoinUrl: "Kopiera join-länk",
    lobbyJoinUrlCopied: "Kopierad!",
    /** Bords-tv: ta bort en spelare ur rummet (t.ex. måste gå). */
    tableKickPlayer: "Ta bort från spelet",
    /** Knapptext (kort) — hel rad i `tableKickPlayer` + `title`. */
    tableKickPlayerButton: "Ta bort",
    tableKickPlayerAria: (name: string) => `Ta bort ${name} från spelet`,
    tableKickConfirm: (name: string) =>
      `Ta bort ${name} från spelet? Mobilkontrollen kopplas ner och platsen frigörs.`,
    log: "Logg",
    /** Sidopanel: visa spelhändelseloggen (av som standard). */
    sidebarShowLog: "Visa logg",
    hiddenItemFoundTitle: "Hittade ett föremål!",
    hiddenItemFoundBody: "Spelaren hittar ett föremål och hanterar det på sin mobil.",
    cardArtAlt: "Kortbild",
    waitingConfirmPhone: "(Väntar på att spelaren bekräftar på mobilen…)",
    brewerDownWaitPhone: (name: string) => `${name} har noll HP — väljer på mobilen …`,
    hidePanel: "Dölj sidopanel",
    showPanel: "Visa sidopanel",
    tileTypeLabels: "Typetiketter på rutor",
    openSettings: "Inställningar för brädet",
    turnTimeoutAria: (time: string) => `Tur-timeout ${time}`,
    togglePlayersPanel: "Visa eller dölj spelare och logg",
    settingsTitle: "Inställningar (bräde)",
    settingsBoardPan: "Panorering på brädet (auto-fokus och drag) — av: hel våning",
    settingsBoardAnimations: "Tärningsanimationer och stridspaneler",
    settingsTokenMoveAnimations: "Animation av spelpjäsernas förflyttning",
    settingsTileBobAnimations: "Animerade rutor på brädet (gupp-våg)",
    settingsScaleAnimations: "Mjuk omskalning av kort (t.ex. när föremål spelas)",
    settingsTurnBannerRight: "Visa spelare till höger (vertikalt)",
    settingsClose: "Stäng",
    settingsEndMatch: "Avsluta spelet",
    settingsEndMatchConfirm:
      "Vill du verkligen avsluta spelet för alla? Under pågående match visas resultatlistan.",
    settingsEndMatchCancel: "Avbryt",
    /** Bräde: spelaren är i köp/affär-läge (mobil). */
    merchantShopping: (playerName: string) => `${playerName} handlar`,
    merchantShoppingAria: (playerName: string) => `${playerName} är i affären`,
  },
  items: {
    healing_potion: { title: "Helande brygd", text: "Återställ 3 HP." },
    sleep_potion: { title: "Sömnmedel", text: "Målet hoppar över sin nästa tur." },
    sip_card: { title: "Ölprovning", text: "Ge +1 klunk till ett mål." },
    weak_beer: {
      title: "Druckit för mycket",
      text: "Stridsreaktion: −2 attack.",
    },
    light_beer: {
      title: "Energidryck",
      text: "Stridsreaktion: +1 attack.",
    },
    folk_beer: {
      title: "8-bit beer",
      text: "Stridsreaktion: +2 attack.",
    },
    tripwire: {
      title: "Halt golv",
      text: "Stridsreaktion: −1 attack.",
    },
    double_hops: {
      title: "En hjälpande hand",
      text: "Stridsreaktion: +2 attack.",
    },
    beer_bomb: {
      title: "Ölbomb",
      text: "Stridsreaktion: +3 attack.",
    },
    beard_back: {
      title: "Skägget rakt bak",
      text: "Dubbla ditt tärningsslag vid strid.",
    },
    hangover: {
      title: "Baksmälla",
      text: "Stridsreaktion: −3 attack.",
    },
    pretzel_snack: {
      title: "Pretzel",
      text: "Återställ 2 HP hos dig eller en annan spelare.",
    },
    coin_purse: { title: "Pantpåse", text: "+4 pant." },
    monster_hype: {
      title: "Okontrollerad jäsning",
      text: "Stridsreaktion: −2 attack",
    },
    yeast_sabotage: {
      title: "Skakad öl",
      text: "Stridsreaktion: −1 attack. Om påverkad spelare förlorar en strid får den stå över en tur på grund av öl i ögat.",
    },
    beer_bro: {
      title: "Ölkompis",
      text: "Kombinerad attack: En extra spelare hjälper till. Vid förlust skadas båda; vid vinst får hjälparen samma mängd skatt. Automatisk förlust sker endast om båda tärningarna visar 1.",
    },
    split_the_g: { title: "Split the G", text: "Ta hälften av en annan spelares pant (avrundat nedåt)." },
    lengraddad: {
      title: "Lengräddad",
      text: "Spela på en annan spelare: −2 attack",
    },
    canman: {
      title: "Canman",
      text: "+1 pant varje tur i 10 omgångar",
    },
    get_lucky: {
      title: "Get Lucky",
      text: "Betala 5 pant: +4 attack i strid. Vid förlust tar du dubbel HP-skada.",
    },
    manopositiv: {
      title: "Manopositiv",
      text: "Betala 10 pant för +4 attack i strid.",
    },
    shortcut: {
      title: "Genväg",
      text: "På din tur: betala 10 pant och teleportera till en valfri annan spelare.",
    },
    taproom_key: {
      title: "Taproom-nyckel",
      text: "På din tur: stig en våning för 10 pant mindre än Genväg — eller på sista våningen gå till boss för samma rabatt mot Genvägs-priset på den nivån.",
    },
    six_sense: {
      title: "Ett sjätte ölsinne",
      text: "Betala 5 pant och välj siffra 1–6: din nästa tärning (rörelse, strid mot dålig batch eller BvB) visar den sidan. Kortet förbrukas när du väljer. Gäller både vid förflyttning och möte med dålig batch.",
    },
    rigged_game: {
      title: "Riggat spel",
      text: "Betala 5 pant och ta en slumpmässig utrustning från en annan spelare.",
    },
    not_my_round: { title: "En enkel stöld", text: "Stjäl slumpmässigt föremål eller utrustning från en spelare" },
    spill_intentional: { title: "Spilla med flit", text: "Betala 2 pant och förstör slumpmässigt föremål eller utrustning för en spelare." },
    early_night: {
      title: "Vaska",
      text: "Använd i strid som angripare: skippa den dåliga batchen. Ingen XP, ingen loot.",
    },
    bribes: { title: "Mutor", text: "Undvik en strid för 10 pant. Ingen XP, ingen loot." },
    paidassasin: {
      title: "Hejduk",
      text: "Betala 15 pant och sätt −5 attack på en spelare i strid eller i BvB-ronden.",
    },
    charity: {
      title: "Skänk till välgörenhet",
      text: "På din tur: skänk pant och fyll på lika många HP — högst din saknade hälsa och högst din pant (aldrig mer pant än liv du fyller på).",
    },
    shuffle: {
      title: "Shuffle",
      text: "Byt alla dina föremål mot en annan spelares föremål. Kostar 10 pant.",
    },

  },
  sipNotice: {
    title: "Straffklunk",
    /** Inledning under mottagarens namn (namnet upprepas inte här); avsändarnamnet «…» färgsätts separat i UI. */
    bodyPrefix: (count: number) => {
      const k = count === 1 ? "En straffklunk" : `${count} straffklunkar`;
      return `${k} från `;
    },
    cheers: "Skål!",
    ack: "Okej",
    /** Bekräftelse efter duell-förlust-notis (annat tonläge än övriga anpassade notices). */
    duelAck: "Okej",
    duelLossTitle: "Du förlorade duellen",
    xpGain: (count: number) => `+${Math.max(1, Math.floor(count)) * 10} XP`,
    fallbackFrom: "en annan spelare",
  },
  cardModal: {
    continue: "Fortsätt",
    /** Prefix före etikettreferensrad under kortbild (t.ex. öletikett). */
    etikettRef: "Etikett:",
    /** Under korttext på mobil när spelaren ska bekräfta kortet. */
    hintOwnerContinue: "(Tryck på Fortsätt nedan när du är redo.)",
  },
  equipAria: {
    empty: (label: string) => `${label} (tom)`,
    view: (label: string) => `${label} (visa)`,
  },
  rules: {
    logoAlt: "Bryggmästarnas mästare",
    title: "Spelregler",
    intro:
      "I jakten på den perfekta brygden räknas varje erfarenhet. Oavsett om du räddar en fantastisk batch eller tvingas dricka upp dina misslyckanden, växer din visdom. Man lär sig av sina misstag – men man lär sig snabbare av framgång.",
    section1Title: "🎲 1. Spelets gång",
    section1ImageAlt: "Snabbguide: slå och välj väg",
    section1TurnIntro: "Varje tur börjar med ett val — sedan handling på rutorna du når:",
    movementLabel: "Förflyttning:",
    movementText:
      "Slå rörelsetärningen och flytta exakt så många steg tärningen visar i valfri riktning.",
    recycleLabel: "Panta burkar:",
    recycleText:
      "I stället för att slå tärningen kan du handla (kräver minst 5 pant). Pjäsen står kvar; tur avslutas när du lämnar butiken.",
    prepLabel: "Förberedelser:",
    prepText:
      "Innan du landar på en ruta får du spela föremål från handen för att förbättra dina odds eller optimera dina stats.",
    section2Title: "📈 2. Erfarenhet (XP) & Nivåer",
    xpIntro:
      "Du klättrar i nivå genom att samla Erfarenhetspoäng (XP). Ju högre nivå du når, desto mer XP krävs för nästa steg.",
    winXpLabel: "Vinst i strid (Räddad batch):",
    winXpText: "Att besegra en dålig batch ger en rejäl dos XP (se värde på kortet).",
    lossXpLabel: "Förlust i strid (Straffklunkar):",
    lossXpText:
      "Om du förlorar tvingas du dricka straffklunkar. Varje klunk härdar dig och ger en liten mängd XP – även motgångar för dig framåt!",
    levelUpBoxTitle: "Nivå upp!",
    levelUpBoxText:
      "Dina erfarenheter – från räddade batcher till bittra läxor i glaset – har gett resultat. Du lämnar nu nybörjarträsket bakom dig. Vågar du höja svårighetsgraden, eller har du redan fått nog?",
    section3Title: "🧭 3. Rutor och händelser",
    section3ImageAlt: "Snabbguide: hantera rutan",
    section3Intro: "När du landar på en ruta aktiveras dess effekt omedelbart:",
    tileEventLabel: "Händelse:",
    tileEventText: "Slumpmässiga möten som kan hjälpa eller stjälpa din resa.",
    tileTreasureLabel: "Skatt:",
    tileTreasureText: "Möjlighet att hitta ny utrustning eller kraftfulla föremål.",
    tileRestLabel: "Vila:",
    tileRestText: "Återhämtning av HP så att du orkar fortsätta bryggandet.",
    tileCombatLabel: "Dålig batch / BvB:",
    tileCombatText: "Strid mot en misslyckad brygd eller utmana en medspelare (Bryggare mot Bryggare).",
    section4Title: "⚔️ 4. Strider, mutor och sabotage",
    section4ImageAlt: "Snabbguide: dåliga batchar, mutor och sabotage",
    combatIntro:
      "I strid jämförs din Totalstyrka (Tärningsslag + Utrustning + Föremål) mot fiendens styrka.",
    combatWinLabel: "Vinst:",
    combatWinYouGet: "Du får XP",
    combatWinPant: "pant",
    combatWinAndTreasure: "och skatter",
    combatLossLabel: "Förlust:",
    combatLossYouLose: "Du tappar HP",
    combatLossAndSips: "och dricker straffklunkar",
    combatLossSipXpNote: "(som i sin tur ger XP).",
    combatCritLabel: "Kritisk miss:",
    combatCritBeforeDie: "En etta på tärningen",
    combatCritAfterDie: "är alltid en förlust.",
    combatInteractLabel: "Interaktion:",
    combatInteractText:
      "Medspelare kan ofta påverka strider genom att hjälpa eller sabotera, ibland mot betalning i pant.",
    section5Title: "🏆 5. Vinstvillkor",
    section5ImageAlt: "Snabbguide: nivåer, bossen och vinst",
    section5Intro: "När en spelare når den högsta nivån inleds slutskedet. Spelet kan vinnas på två sätt:",
    winMasterLabel: "Mästerbryggaren:",
    winMasterText: "Besegra slutbossen (som har 3 liv) före alla andra.",
    winLastLabel: "Sista klunken:",
    winLastText:
      "Om alla andra spelare förlorar sitt HP eller ger upp, vinner den sista kvarvarande bryggaren.",
  },
  tutorial: {
    header: "Snabbguide",
    logoAlt: "Bryggmästarnas mästare",
    back: "Tillbaka",
    skip: "Hoppa över",
    next: "Nästa",
    start: "Kör igång",
    step1Title: "Välkommen till Bryggmästarnas mästare!",
    step1SaveBatches: "Rädda de dåliga batcherna",
    step1SaveBatchesRest:
      "för att samla XP och klättra i nivå – först att besegra slutbossen på sista nivån vinner!",
    step1Sabotage: "Sabotera eller samarbeta med dina motståndare på vägen",
    step2Title: "Slå och välj väg",
    step2Move:
      "I början av din tur väljer du antingen att slå rörelsetärningen och flytta så många rutor som tärningen visar åt vald riktning, eller att",
    step2Recycle: "Panta burkar",
    step2RecycleRest: "(kräver minst 5 pant) — då står du kvar och handlar i stället för att gå.",
    step2Items: "Du kan även spela föremål från din hand för att rusta upp dig.",
    step3Title: "Hantera rutan",
    step3Event: "Händelse: Slumpmässiga händelser som kan hjälpa eller förstöra för dig.",
    step3Treasure: "Skatt: Hitta ny utrustning och föremål.",
    step3Rest: "Vila: Återhämta dig och få tillbaka 3 HP.",
    step3Combat: "Dålig batch: Gör dig redo för strid!",
    step3Bvb: "BvB: Bryggare mot bryggare, en rond. Vinnaren väljer ett byte från förloraren.",
    step4Title: "Dåliga batchar, mutor och sabotage",
    step4Strength:
      "Styrkekollen: Ditt tärningskast + utrustning & föremål måste vara lika med eller högre än fiendens styrka.",
    step4Win: "Vinst:",
    step4WinPantWord: "Pant",
    step4WinTreasureWord: "Skatter",
    step4WinXpWord: "XP",
    step4Loss: "Förlust:",
    step4LossHpWord: "HP",
    step4LossSipsWord: "klunkar.",
    step4Crit: "Kritisk miss: En 1:a på tärningen är alltid en förlust!",
    step4Social:
      "Socialt spel: Medspelare kan hjälpa eller sabotera. Du kan be om hjälp mot betalning (Pant/Skatter) – de kan välja att acceptera eller avstå.",
    step5Title: "Nivåer, Bossen och Vinst",
    step5XpYouGet: "Du får",
    step5XpFromSips: "XP av klunkar och",
    step5XpFromMonsters: "monstersegrar.",
    step5Boss: "Slutbossen: Besegra bossen på sista nivån för att vinna spelet. Bossen är tuff och har 3 liv.",
    step5LastStanding: "Sist kvar: Om alla andra åker ut vinner du spelet.",
    step5ElimBeforeHp: "Eliminering: Om dina",
    step5ElimAfterHp:
      "HP når noll är du ute ur spelet. Du kan välja att starta om från början eller ge upp.",
  },
  catalog: {
    title: "Kortkatalog",
    filterActive: "Visar ölreferens",
    filterInactive: "Endast ölreferens",
    homeLink: "Till startsidan",
    introBeerRefBefore: "Visar",
    introBeerRefAfter:
      "kort och monster med registrerad ölreferens (etikett under bilden). Utrustning har inga ölreferenser i katalogen.",
    introFullBeforeCards: "Översikt: kort från",
    introFullCardsFile: "cards.json",
    introFullBeforeEquip: ", utrustning från",
    introFullEquipFile: "equipmentDefs.ts",
    introFullBeforeMonsters: ", monster från",
    introFullMonstersFile: "monsters.ts",
    introFullTail: "uppdelade i",
    introFullAnd: "och",
    introFullVanliga: "vanliga",
    introFullLagstrid: "lagstrid",
    introFullBossar: "slutbossar",
    kindEvent: "Händelse",
    kindItem: "Föremål",
    kindCombat: "Strid / system",
    kindTreasure: "Skatt",
    kindRest: "Vila",
    kindEmpty: "Tom",
    positive: "Positiva",
    negative: "Negativa",
    equipmentTitle: "Utrustning",
    equipmentIntro:
      "Handelskatalog / loot-pool. Bild = unik art om den finns, annars slot-siluett.",
    monsterSoloTitle: "Monster — vanliga (solo)",
    monsterSoloSubtitle: "Ingen lagstrid, inte slutboss.",
    monsterTeamTitle: "Monster — lagstrid",
    monsterTeamSubtitle: "Kräver medkämpe; angriparen väljer vem som slåss med.",
    monsterBossTitle: "Monster — slutbossar",
    monsterBossSubtitle: (bossIds: string) =>
      `Slumpas en per parti (${bossIds}). Individuell strid.`,
    badgeTeam: "Lag",
    badgeBoss: "Boss",
    emptyCategory: "Inga poster i denna kategori.",
    strength: (n: number) => `Styrka ${n}`,
    teamBattleBonus: (gold: number) => ` · +${gold} pant/medkämpe vid lagseger`,
    flavourAndRules: "Smaktext & regler",
    flavour: "Smaktext",
    cardText: "Korttext",
    rules: "Regler",
    depositPrice: (slot: string, price: number) => `${slot} · ${price} pant`,
  },
  seo: {
    homeTitle: "Bryggmästarnas mästare – Bryggverket edition",
    homeDescription:
      "Spela Bryggmästarnas mästare online: storskärm som bord, mobil som handkontroll. Öl-tema, strider, pant och klunkar. Bryggverket-utgåvan från Umeå.",
    rulesTitle: "Spelregler — Bryggmästarnas mästare",
    rulesDescription:
      "Läs reglerna för Bryggmästarnas mästare: turordning, rörelse, strider, pant, utrustning och hur ni spelar med storskärm och mobil.",
    cardsTitle: "Kortkatalog — Bryggmästarnas mästare",
    cardsDescription:
      "Bläddra i kortkatalogen för Bryggmästarnas mästare: händelsekort, monster, utrustning och ölreferenser i Bryggverket-editionen.",
    privateTitle: "Bryggmästarnas mästare – Bryggverket edition",
    privateDescription: "Webbaserat brädspel — Bryggverket edition.",
    ogImageAlt:
      "Bryggmästarnas mästare – Bryggverket edition. Storskärm som bord, mobil som handkontroll.",
    breadcrumbHome: "Start",
  },
  app: {
    loading: "Laddar…",
    loginTitle: "Logga in",
    loginReadingStatus: "Läser inloggningsstatus…",
    loginLoggedInPrefix: "Inloggad som",
    loginLoggedInTier: (tier: string) => `Tier: ${tier}`,
    loginLogout: "Logga ut",
    loginLead: "Logga in som host med OTP eller Google.",
    loginEmailPlaceholder: "E-post",
    loginCodePlaceholder: "Kod (dev: 123456)",
    loginSendCode: "Skicka kod",
    loginVerifyCode: "Verifiera kod",
    loginGoogle: "Fortsätt med Google",
    loginCodeSent: "Kod skickad. Kontrollera e-post/logg och verifiera.",
    loginHomeLink: "Till startsidan",
    loginErrorReadStatus: "Kunde inte läsa inloggningsstatus.",
    loginErrorReachServer: "Kunde inte nå auth-servern.",
    loginErrorInvalidEmail: "Ange en giltig e-postadress.",
    loginErrorSendCode: "Kunde inte skicka engångskod.",
    loginErrorMissingFields: "Ange både e-post och kod.",
    loginErrorBadCode: "Fel eller utgången kod.",
    loginErrorVerify: "Kunde inte verifiera kod.",
    loginErrorLogout: "Kunde inte logga ut.",
  },
  festDashboard: {
    title: "Festöversikt",
    homeLink: "← Startsidan",
    lead: "Lägg till lobbykoder från era TV-skärmar för att följa alla pågående matcher i realtid. Ansluter som åskådare utan att påverka spelet.",
    codePlaceholder: "LOBBYKOD",
    addRoom: "Spåra lobby",
    removeRoom: "Ta bort",
    emptyRooms: "Inga lobbykoder ännu — lägg till koden som visas på bordet.",
    noPlayersYet: "Inga spelare i lobbyn ännu (eller fel kod).",
    roomAria: (code: string) => `Lobby ${code}`,
    summaryAria: "Summering alla bord",
    summaryRooms: "Live-bord",
    summaryPlayers: "Aktiva spelare",
    summaryMonsterWins: "Monstersegrar",
    summaryBvbWins: "BvB-segrar",
    summaryKlunks: "Klunkar totalt",
    colPlayer: "Spelare",
    colHp: "HP",
    colPant: "Pant",
    colKlunk: "Klunk",
    colBrewer: "Bryggnivå",
    colFloor: "Våning",
    colMonster: "Monster V/F",
    colBvb: "BvB V/F",
    colSabotage: "Sabotage",
    colBestRoll: "Bästa slag",
    activeTurn: "tur",
    eliminated: "ute",
    left: "lämnat",
    bossLives: (n: number) => `boss ${n} liv`,
    highlightsAria: "Festhöjdpunkter",
    highlightMostWins: "Flest segrar",
    highlightMostPant: "Mest pant",
    highlightMostLosses: "Flest förluster",
    highlightMostBvb: "Mest BvB",
    highlightMostKlunks: "Mest klunkar",
    highlightMostSabotage: "Mest sabotage",
    highlightMostXp: "Mest XP",
    highlightLeastHp: "Minst HP",
    highlightBestRoll: "Högsta slag",
    highlightMostOnes: "Flest ettor",
  },
};

export type UiStrings = typeof sv;

export const uiStrings: Record<GameLocale, UiStrings> = { sv, en: en as unknown as UiStrings };

export function getUiStrings(locale: GameLocale): UiStrings {
  return uiStrings[locale];
}

