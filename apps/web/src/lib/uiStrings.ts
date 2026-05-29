import type { TileType } from "@bv/game-core";

/** WebSocket-status → visningstext */
export function wsStatusLabel(s: string): string {
  if (s === "connecting") return "ansluter";
  if (s === "connected") return "ansluten";
  if (s === "disconnected") return "frånkopplad";
  return s;
}

export function phaseLabelSv(phase: string): string {
  if (phase === "lobby") return "lobby";
  if (phase === "playing") return "spel pågår";
  if (phase === "ended") return "avslutat";
  return phase;
}

export function pendingTypeLabelSv(t: string | undefined): string {
  if (!t) return "—";
  const m: Record<string, string> = {
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
  return m[t] ?? t;
}

export const tileTypeSv: Record<TileType, string> = {
  empty: "Tom",
  event: "Händelse",
  combat: "Dålig batch",
  merchant: "Panta burkar",
  door: "Nivå upp",
  rest: "Vila",
  treasure: "Skatt",
  boss: "Boss",
};

export function equipmentSlotSv(slot: string): string {
  const m: Record<string, string> = {
    weapon: "vapen",
    armor: "rustning",
    helmet: "hjälm",
    accessory: "tillbehör",
  };
  return m[slot] ?? slot;
}

export function capitalizeWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Samlad svensk copy tills riktig i18n finns */
export const sv = {
  home: {
    title: "Bryggmästarnas Mästare",
    subtitle: "De dåliga batcherna",
    primaryJoin: "Gå med i ett spel",
    createLobby: "Skapa lobby",
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
    notConnected: "Inte ansluten till servern (WebSocket).",
    lobbySheet: (ready: number, total: number) => `Lobby — redo: ${ready} / ${total}`,
    unready: "Ångra redo",
    ready: "Redo",
    startGame: "Starta spelet",
    hostNeedPlayers: "Behövs minst 2 spelare och alla måste vara redo.",
    waitHostStart: "Väntar på att värden startar när alla är redo.",
    strength: "Styrka",
    /** Mobil: utrustningsrad under slots — attack från utrustning + ev. stridsmodifierare. */
    equipmentAttackFromGearAria: (n: number) => `Attack från utrustning (inkl. modifierare): ${n}`,
    /** Mobil: sköld = skadersläckning från rustning/hjälm/tillbehör m.m. */
    equipmentDefenseFromGearAria: (n: number) => `Sköld — skadersläckning från utrustning: ${n}`,
    equipmentBvbFromGearAria: (n: number) => `BvB-bonus på tärningsslag från utrustning: ${n}`,
    continue: "Fortsätt",
    chooseTeammate: "Team battle — välj en medkämpe",
    teammateMustFight: "Vald spelare måste strida med dig i denna runda.",
    waitAttackerChooseTeammate: (name: string) => `Väntar på att ${name} väljer medkämpe…`,
    teammatePicked: (name: string) => `Medkämpe: ${name}`,
    waitTeammateCombatRoll: (name: string) => `${name} ska fortfarande slå sin tärning.`,
    waitTeamSecondRoll: "Väntar på lagkamratens tärning.",
    chooseBeerBroPartner: "Välj spelare som slår med angriparen (egen t6 + vapen):",
    attackerViewingEncounter: (name: string) => `${name} tittar på mötet…`,
    bossFinaleVictory: "SEGER!",
    bossFinaleWinner: (name: string) => `${name} vinner!`,
    bossFinaleEnding: "Avslutar…",
    skipMonsterEncounter: "Undvik dålig batch (−2 pant)",
    skipMonsterEncounterToast: (playerName: string, enemyName: string) =>
      `${playerName} undviker ${enemyName} (−2 pant)`,
    beerBroUnavailableTeamBattle: "Ölkompis kan inte användas i team battle — välj medkämpe i stället.",
    beerBroAlreadyHelping: "En Ölkompis hjälper redan i den här striden.",
    theAttacker: "angriparen",
    yourD6: "Din t6",
    beerBroD6: "Ölkompis t6",
    attackTotalVs: (total: number, need: number) => `Attack totalt ${total} mot styrka ${need}`,
    waitAttackerContinue: (name: string) => `Väntar på att ${name} fortsätter…`,
    youLostTotal: (total: number, need: number) => `Du förlorade: totalt ${total} mot styrka ${need}`,
    hitChoiceIntro: (enemy: string) => `${enemy} — välj hur du tar träffen:`,
    hitChoiceDetail: (reduce: number, full: number) =>
      `Ta en klunk: −${reduce} skada (du får +1 klunk). Eller ta full ${full} skada, ingen klunk.`,
    takeSipReduce: (n: number) => `Ta en klunk (−${n} skada)`,
    fullDamageNoSip: (n: number) => `Full skada (${n}), ingen klunk`,
    /** Kapten Interrobang / Transporter: sekundär knapp utan pant/kompensation */
    takeFullDamageHp: (n: number) => `Ta full skada (${n} skada)`,
    /** När spelaren inte har pant för Kapten Interrobang / Transporter. */
    hitMitigationPantOnlyFullDamage: (cost: number) =>
      `Du har inte ${cost} pant — ta full skada.`,
    waitAttackerChoose: (name: string) => `Väntar på att ${name} väljer…`,
    attackModifier: (m: number) => `Attackmodifierare: ${m}`,
    waitIntervene: "Väntar på att andra spelare ingriper…",
    rollCombat: "Slå tärning",
    combatHelpRequest: "Be om hjälp",
    combatHelpChooseHelper: "Välj vem du vill be om hjälp",
    combatHelpNoCandidates: "Ingen kan hjälpa till just nu.",
    combatHelpWaitAttackerChoose: (name: string) => `Väntar på att ${name} väljer hjälpare…`,
    combatHelpDecisionPrompt: "Vill du hjälpa till i striden?",
    combatHelpDecisionDecline: "Hjälp inte till",
    combatHelpDecisionFree: "Hjälp till (gratis)",
    combatHelpDecisionPant: "Hjälp till mot panten",
    combatHelpDecisionTreasure: "Hjälp till mot skatten",
    combatHelpDecisionSplit: "Dela lika på vinsten",
    combatHelpWaitDecision: (name: string) => `Väntar på svar från ${name}…`,
    combatHelpRequesterPrompt: (name: string) => `${name} vill hjälpa till mot följande ersättning:`,
    combatHelpRequesterWait: (name: string) => `Väntar på att ${name} svarar på ditt villkor…`,
    combatHelpRequesterAccept: "Ja, acceptera villkoret",
    combatHelpRequesterDecline: "Nej, fortsätt utan hjälp",
    combatHelpPlayPositiveCard: "Spela minst ett positivt kort för att hjälpa till.",
    combatHelpNoPlayablePositiveCards: "Du har inget positivt hjälpkort att spela.",
    combatHelpWaitHelperCard: (name: string) => `Väntar på att ${name} spelar ett hjälpkort…`,
    intervenePickCard: "Ingrip — välj ett kort",
    /** Avslutar ingripande utan kort — skickar pass till servern (samma som “Gör inget”). */
    interveneCancelPass: "Avbryt ingripande",
    /** Reaktor utan några ingripandeföremål i inventory — måste kunna passa så striden inte låser sig. */
    noInterveneCards: "Du har inga föremål att ingripa med i den här striden.",
    /** Efter “Ingrip” finns inga spelbara kort (t.ex. redan förbrukade) — avsluta med pass. */
    interveneNoCardsPlayable: "Du har inga spelbara ingripandekort.",
    itemSuffixWeakBeer: " (−2 spelarattack)",
    itemSuffixLightBeer: " (+1 spelarattack)",
    itemSuffixFolkBeer: " (+2 spelarattack)",
    itemSuffixTripwire: " (−1 spelarattack)",
    itemSuffixDoubleHops: " (+2 spelarattack)",
    itemSuffixBeerBomb: " (+3 spelarattack)",
    itemSuffixManopositiv: " (+4 spelarattack, −10 pant)",
    itemSuffixHangover: " (−3 spelarattack)",
    itemSuffixLengraddad: " (−2 spelarattack)",
    itemSuffixMonsterHype: " (−2 attack)",
    itemSuffixYeast: " (−1 attack)",
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
    merchantReplaceBody: (slot: string, currentName: string, newName: string) =>
      `Du har redan ${currentName} som ${slot}. Vill du byta mot ${newName}? Den gamla utrustningen ersätts.`,
    merchantReplaceConfirm: "Ja, byt ut",
    merchantReplaceCancel: "Avbryt",
    lootEquipmentReplaceTitle: "Ny utrustning — vill du byta?",
    equipmentReplaceCurrentEffects: "Nuvarande",
    equipmentReplaceNewEffects: "Ny utrustning",
    lootEquipmentReplaceDecline: "Nej, behåll det jag har",
    merchantCantAfford: "Du har inte råd.",
    merchantShopCollapsedHint: "Minimerad — visa panelen för att se vad du kan köpa.",
    /** Plastback: argument = pant vid försäljning (0 om ingen Tom flaska-synergi). */
    sellPlastbackAccessory: (pant: number) =>
      pant > 0 ? `Sälj Plastback (+${pant} pant)` : "Sälj Plastback",
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
    settingsRainbowEffects: "Regnbågseffekt",
    settingsLobbyStatus: "Anslutning",
    settingsTurnStatus: "Turstatus",
    settingsOpenTutorial: "Läs spelregler",
    settingsLeaveGame: "Lämna spelet",
    /** Mobil efter join: ansvarsfullt spelande / alkohol (obligatorisk bekräftelse). */
    responsibleReminderTitle: "En viktig påminnelse",
    responsibleReminderBody:
      "Vi vill att alla ska ha roligt! Drick ansvarsfullt och tänk på att alkohol kan vara skadligt för hälsan. Du behöver absolut inte dricka alkohol för att delta – vatten, läsk eller alkoholfri öl fungerar precis lika bra för att vinna (eller förlora) med stil.",
    responsibleReminderOk: "Jag förstår",
    panelMinimize: "Minimera panel",
    panelMaximize: "Visa panel",
    waitingState: "Väntar på tillstånd…",
    lookingForPlayer: "Letar efter din spelare…",
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
    lobbyWakeLockBeforeStart: "Håll skärmen vaken redan i lobby",
    /** Lobby: sektion för kosmetik (kortbaksida, framtida pjäsar, ramar …). */
    lobbyAppearance: "Utseende",
    lobbyCardCoverDefault: "Standard",
    lobbyCardCoverAlt1: "Variant 1",
    lobbyCardCoverAlt2: "Variant 2",
    lobbyShowCardToggles: "Välj tillåtna kort",
    lobbyHideCardToggles: "Dölj kortval",
    lobbyCardToggleHint: "Systemkort kan inte stängas av här. Avmarkerade kort dras inte i spelet.",
    lobbyAdvancedSettings: "Avancerade inställningar",
    lobbyAccessibility: "Tillgänglighet",
    lobbyGameValues: "Spelvärden",
    lobbyAllowedCards: "Tillåtna kort",
    lobbyMaxHp: "Max HP",
    lobbyStartPant: "Startpant",
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
    itemsUseHint: "Du kan använda föremål på din tur eller under stridsreaktioner.",
    itemsPassiveHint: "Detta föremål behöver inte användas — det gäller automatiskt så länge det ligger i förrådet.",
    modalClose: "Stäng",
    emptySlot: "Tom plats.",
    armorNegateAllOnce: "Nollställ all skada en gång (går sedan sönder)",
    negatePerHit: (n: number) => `Nollställ ${n} skada per träff`,
    bonusHp: (n: number) => `Bonus-HP +${n}`,
    healHpPerTurn: (n: number) => `Varje drag: +${n} HP (upp till max).`,
    combatBonus: (n: number) => `Stridsbonus +${n}`,
    moveSteps: (n: number) => `Rörelse +${n} steg`,
    powerPlus: (n: number) => `Kraft +${n}`,
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
    teamBattleIntroTitle: "Team battle",
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
    combatHelpAwaitCard: (name: string) => `${name} måste spela ett positivt hjälpkort.`,
    combatHelpAcceptedContract: (name: string, contract: string) =>
      `${name} hjälper till (${contract}).`,
    attackerChoosesHit: (reduce: number) =>
      `Angriparen väljer: klunk (−${reduce} skada) eller full träff.`,
    /** Visas vid tärningen under reaktionsfasen när angriparen har pip-vapen (modifier utanför t6). */
    diceModifierOptionalSipSuffix: (sipBonus: number) => `· +${sipBonus} mot pantkostnad (valfritt)`,
    diceModifierOnlyOptionalSip: (sipBonus: number) => `+${sipBonus} mot pantkostnad (valfritt)`,
    /** Bräd-tv: efter slag om valfri pip-vapenbonus faktiskt togs — bara siffra + etikett vid tärningen. */
    diceModifierSipTakenSub: "mot pantkostnad",
    pvpSubtitle: "Bryggare mot bryggare",
    pvpDuel: "Duell",
    pvpRound: (n: number) => `Rond ${n}`,
    pvpRoundBestOf: (round: number, bestOf: number) => `Rond ${round} av ${bestOf}`,
    pvpTieRerollHint: "Lika — båda slår om.",
    pvpPrepPhase: "Förberedelser (kort)",
    pvpPrepPhaseHint: "Båda spelare kan spela kort tills de markerat Klar.",
    pvpRollPhaseHint: "Båda slår tärning för denna rond.",
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
    togglePlayersPanel: "Visa eller dölj spelare och logg",
    settingsTitle: "Inställningar (bräde)",
    settingsBoardPan: "Panorering på brädet (drag och mushjul)",
    settingsBoardAnimations: "Animationer på brädet (mjuk kamera, tärningssnurr m.m.)",
    settingsTokenMoveAnimations: "Animation av spelpjäsernas förflyttning",
    settingsBoardSfx: "Ljudeffekter på brädet",
    settingsClose: "Stäng",
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
      text: "På din tur: betala för nästa våning och stig — eller på sista våningen betala samma nivåtaxa och hamna på slutbossens ruta.",
    },
    taproom_key: {
      title: "Taproom-nyckel",
      text: "På din tur: stig en våning för 10 pant mindre än Genväg — eller på sista våningen gå till boss för samma rabatt mot Genvägs-priset på den nivån.",
    },
    six_sense: {
      title: "Ett sjätte ölsinne",
      text: "Betala 5 pant och välj siffra 1–6: din nästa tärning (rörelse, strid mot dålig batch eller BvB) visar den sidan. Kortet förbrukas när du väljer.",
    },
    rigged_game: {
      title: "Riggat spel",
      text: "Betala 5 pant och ta en slumpmässig utrustning från en annan spelare.",
    },
    not_my_round: { title: "En enkel stöld", text: "Stjäl slumpmässigt föremål eller utrustning från en spelare" },
    spill_intentional: { title: "Spilla med flit", text: "Betala 2 pant och förstör slumpmässigt föremål eller utrustning för en spelare." },
    early_night: { title: "Vaska", text: "Skippa dålig batch." },
    bribes: { title: "Mutor", text: "Undvik en strid för 10 pant." },
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
};

