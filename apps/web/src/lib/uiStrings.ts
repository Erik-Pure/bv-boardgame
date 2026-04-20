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
    title: "Bryggmästarens väg",
    subtitle: "Storskärmsbräde och mobila spelkontroller — samma lobbykod.",
    primaryJoin: "Gå med i ett spel",
    createLobby: "Skapa lobby",
    footerCards: "Kortkatalog",
    footerRules: "Spelets regler",
  },
  joinPage: {
    title: "Gå med i spel",
    subtitle: "Skriv in lobbyn som värden visar och välj ditt namn.",
    back: "Till startsidan",
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
    continue: "Fortsätt",
    chooseTeammate: "Team battle — välj en medkämpe",
    teammateMustFight: "Vald spelare måste strida med dig i denna runda.",
    waitAttackerChooseTeammate: (name: string) => `Väntar på att ${name} väljer medkämpe…`,
    teammatePicked: (name: string) => `Medkämpe: ${name}`,
    waitTeammateCombatRoll: (name: string) => `${name} ska fortfarande slå sin tärning.`,
    waitTeamSecondRoll: "Väntar på lagkamratens tärning.",
    chooseBeerBroPartner: "Välj spelare som slår med angriparen (egen t6 + vapen):",
    attackerViewingEncounter: (name: string) => `${name} tittar på mötet…`,
    skipMonsterEncounter: "Undvik strid",
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
    itemSuffixHangover: " (−3 spelarattack)",
    itemSuffixMonsterHype: " (−2 attack)",
    itemSuffixYeast: " (−1 attack)",
    itemSuffixBeerBro: " (häng på i striden)",
    back: "Tillbaka",
    inCombat: (name: string) => `${name} är i strid`,
    intervene: "Ingrip",
    doNothing: "Gör inget",
    encounterChoose: "Möte — bryggare mot bryggare. Välj:",
    /** Kort etikett när rörelseval leder till ruta med annan bryggare */
    moveChoiceBvbLabel: "BvB",
    pvpChooseOpponent: "BvB — välj motståndare:",
    pvpBothRoll: "BvB (båda slår)",
    resolveTileNoPvp: (tileLabel: string) => `Lös rutan (${tileLabel})`,
    pvpRollDie: "Slå din tärning",
    pvpRound: (n: number) => `Rond ${n}`,
    pvpTieRerollHint: "Lika — båda slår om.",
    yourD6TotalWeapon: (die: number, total: number) => `Din t6: ${die} · totalt ${total} med vapen.`,
    youRolled: "Du har slagit",
    rollPvpDie: "Slå BvB-tärning",
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
      `Bryggnivå ${brewerLevel}, klunkar mot nästa bryggnivå.`,
    levelUpOfferTitle: "Gå upp till nästa nivå?",
    levelUpOfferPrompt: (_levelDisplay: number) =>
      "Dina framgångar vid glaset har gett resultat. Som en sann ölkännare har du nu bemästrat grunderna och låst upp nästa nivå. Vågar du anta utmaningen och höja svårighetsgraden direkt?",
    levelUpOfferHint: "",
    /**
     * `boardLevelIndex` = målvåning 0-baserad (samma som `levelIndex` efter uppstigning).
     * Endast monster **på det planet** får +N på styrkekrav; pant/klunkar/skada ändras inte av nivåbytet.
     */
    levelUpMonsterScaleOnDestination: (boardLevelIndex: number): string => {
      const bonus = boardLevelIndex;
      if (bonus <= 0) return "";
      return `På våning ${boardLevelIndex + 1} (planet du går in på) har monster +${bonus} på styrkekrav i strid — bara där, inte på andra våningar. Pant, klunkar och skada ändras inte av detta.`;
    },
    levelUpNow: "Stig till nästa nivå nu",
    levelUpStayForTile: "Stanna kvar (ta nivå-rutan senare)",
    merchantReplaceBody: (slot: string, currentName: string, newName: string) =>
      `Du har redan ${currentName} som ${slot}. Vill du byta mot ${newName}? Den gamla utrustningen ersätts.`,
    merchantReplaceConfirm: "Ja, byt ut",
    merchantReplaceCancel: "Avbryt",
    lootEquipmentReplaceTitle: "Ny utrustning — vill du byta?",
    lootEquipmentReplaceDecline: "Nej, behåll det jag har",
    merchantCantAfford: "Du har inte råd.",
    leave: "Lämna",
    pvpChooseLoot: "BvB — välj byte",
    takePantMax5: "Ta pant (max 5)",
    givePenaltyKlunk: "Straffklunk (+1)",
    pvpDeal2Damage: "Ge förloraren 2 skada",
    takeSlot: (slot: string) => `Ta ${slot}`,
    noItemsToSteal: "Inga föremål att ta.",
    rollDie: "Slå tärning",
    /** Under strid efter Skägget rakt bak — t6 visas som slaget men bidraget till total är 2×. */
    combatAttackDoubledHint: "Tärningen räknas dubbelt i attacktotalen (Skägget rakt bak).",
    lobbyHeader: (room: string, status: string) => `Lobby ${room} · ${status}`,
    /** Statusfot i PlayView när spelet pågår — egen rad ovanför lobby-raden. */
    footerTurnYou: "Din tur",
    footerTurnOther: (name: string) => `Tur · ${name}`,
    players: "Spelare",
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
    brewerDownTitle: "Stupad bryggare",
    brewerDownLead: "Du har noll HP. Välj hur du vill fortsätta.",
    brewerDownRetry: "Starta om på nytt",
    brewerDownGiveUp: "Ge upp",
    brewerDownWaitOther: (name: string) => `Väntar på att ${name} väljer …`,
    gameOver: "Spelet är slut",
    scoreboardTitle: "Resultatlista",
    scoreboardBrewerLevelAria: (n: number) => `Bryggnivå ${n}`,
    scoreboardHint:
      "Vinnaren överst, därefter flest klunkar. Jämte: pant, sedan namn. Ikoner: bryggnivå, klunkar, pant, liv.",
    winner: "Vinnare",
    /** Knapp i modalen när spelet är slut — går till startsidan. */
    gameOverLeaveToHome: "Avsluta spelet",
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
      `I dueller (BvB): +${n} på slagtotalen (påverkar inte monsterstrid).`,
    combatCardSheetTitle: "Dålig batch",
    treasureCardSheetTitle: "Skatt",
    treasureLootHeading: "Byte",
    combatWinTitle: "Batch räddad!",
    combatWinRewards: "Belöningar",
    combatWinContinue: "FORTSÄTT",
    combatWinEnemyFallback: "monstret",
    combatWinTeamLegacy: "Ni vinner!",
    combatWinSubtitle: (winner: string, enemy: string) => `${winner} vinner mot ${enemy}`,
    combatWinSubtitleTeam: (a: string, b: string, enemy: string) => `${a} och ${b} vinner mot ${enemy}`,
    combatWinRoll: (roll: number, need: number) => `Slag: ${roll} (krävdes ${need})`,
    combatWinRandomOtherSip: (recipient: string) =>
      `${recipient} får en straffklunk — slumpad annan spelare.`,
    combatSipWeaponPrompt: (weaponName: string, bonus: number) =>
      `${weaponName}: vill du ta en straffklunk för +${bonus} attack på detta slag?`,
    combatSipWeaponRollWith: (bonus: number) => `Slå med straffklunk (+${bonus} attack)`,
    combatSipWeaponRollWithout: "Slå utan straffklunk",
    combatLoseTitle: "Vaskad!",
    combatLoseContinue: "FORTSÄTT",
    combatLoseSubtitle: (player: string, enemy: string) => `${player} förlorar mot ${enemy}`,
    combatLosePenalties: "Påföljder",
    combatLoseNoDirectPenalty: (player: string) =>
      `Ingen direkt skada eller extra klunk för ${player} på denna träff.`,
    combatLoseLostEquipment: (player: string, item: string) => `${player} tappade utrustning: ${item}.`,
    combatLoseImperialSplash: "En spelare på intilliggande ruta tog 1 skada (drakstänk).",
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
    teamBattleIntroBody: (attacker: string) =>
      `${attacker} väljer medkämpe på sin mobil innan striden börjar.`,
    teamBattleIntroHint:
      "Vid förlust dricker båda extra straffklunk enligt monsterkortet — ni slår tillsammans mot samma styrka.",
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
    diceModifierOptionalSipSuffix: (sipBonus: number) => `· +${sipBonus} med straffklunk (valfritt)`,
    diceModifierOnlyOptionalSip: (sipBonus: number) => `+${sipBonus} med straffklunk (valfritt)`,
    /** Bräd-tv: efter slag om valfri straffklunk med pip-vapen faktiskt togs — bara siffra + etikett vid tärningen. */
    diceModifierSipTakenSub: "med straffklunk",
    pvpSubtitle: "Bryggare mot bryggare",
    pvpDuel: "Duell",
    pvpRound: (n: number) => `Rond ${n}`,
    pvpTieRerollHint: "Lika — båda slår om.",
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
    lastState: "senaste tillstånd",
    game: "Spel",
    waitingState: "Väntar på tillstånd…",
    phase: "Fas",
    players: "Spelare",
    readyAll: (r: number, t: number) => `Redo: ${r} / ${t} (alla måste vara redo)`,
    die: "Tärning",
    pending: "Väntande",
    lobbyList: "Lobby",
    log: "Logg",
    hiddenItemFoundTitle: "Hittade ett föremål!",
    hiddenItemFoundBody: "Spelaren hittar ett föremål och hanterar det på sin mobil.",
    cardArtAlt: "Kortbild",
    waitingConfirmPhone: "(Väntar på att spelaren bekräftar på mobilen…)",
    brewerDownWaitPhone: (name: string) => `${name} har noll HP — väljer på mobilen …`,
    hidePanel: "Dölj sidopanel",
    showPanel: "Visa sidopanel",
    tileTypeLabels: "Typetiketter på rutor",
  },
  items: {
    healing_potion: { title: "Helande brygd", text: "Återställ 3 HP." },
    sleep_potion: { title: "Sömnmedel", text: "Målet hoppar över sin nästa tur." },
    sip_card: { title: "Ölprovning", text: "Ge +1 klunk till ett mål." },
    weak_beer: {
      title: "Druckit för mycket",
      text: "Stridsreaktion: −2 på vald spelares attack.",
    },
    light_beer: {
      title: "Energidryck",
      text: "Stridsreaktion: +1 på vald spelares attack.",
    },
    folk_beer: {
      title: "8-bit beer",
      text: "Stridsreaktion: +2 på vald spelares attack.",
    },
    tripwire: {
      title: "Halt golv",
      text: "Stridsreaktion: −1 på vald spelares attack.",
    },
    double_hops: {
      title: "En hjälpande hand",
      text: "Stridsreaktion: +2 på vald spelares attack.",
    },
    beer_bomb: {
      title: "Ölbomb",
      text: "Stridsreaktion: +3 på vald spelares attack.",
    },
    beard_back: {
      title: "Skägget rakt bak",
      text: "Dubbla ditt tärningsslag vid strid.",
    },
    hangover: {
      title: "Baksmälla",
      text: "Stridsreaktion: −3 på vald spelares attack.",
    },
    pretzel_snack: { title: "Pretzel", text: "Återställ 2 HP." },
    coin_purse: { title: "Pantpåse", text: "+4 pant." },
    monster_hype: {
      title: "Okontrollerad jäsning",
      text: "Stridsreaktion: −2 på vald spelares attack. Påverkar spelare, inte monstrets styrka.",
    },
    yeast_sabotage: {
      title: "Skakad öl",
      text: "Stridsreaktion: −1 på vald spelares attack. Om påverkad spelare förlorar en strid får den stå över en tur på grund av öl i ögat.",
    },
    beer_bro: {
      title: "Ölkompis",
      text: "Stridsreaktion: en till spelare slår med angriparen — kombinerad attack. Gäller spelarnas slag, inte monstrets styrka. Vid vinst får ölkompisen lika många skatter som angriparen. Automatisk förlust bara om båda tärningarna visar 1 (en ensam 1 räcker inte).",
    },
    split_the_g: { title: "Split the G", text: "Ta hälften av en annan spelares pant (avrundat nedåt)." },
    lengraddad: {
      title: "Lengräddad",
      text: "Spela på en annan spelare: nästa strid får den spelaren −2 i attack.",
    },
    canman: {
      title: "Canman",
      text: "+1 pant varje tur i 10 omgångar",
    },
    not_my_round: { title: "En enkel stöld", text: "Stjäl slumpmässigt föremål eller utrustning från en spelare" },
    spill_intentional: { title: "Spilla med flit", text: "Förstör slumpmässigt föremål eller utrustning för en spelare." },
    early_night: { title: "Vaska", text: "Skippa dålig batch." },

  },
  sipNotice: {
    title: "Straffklunk",
    /** Inledning under mottagarens namn (namnet upprepas inte här); avsändarnamnet «…» färgsätts separat i UI. */
    bodyPrefix: (count: number) => {
      const k = count === 1 ? "En straffklunk" : `${count} straffklunkar`;
      return `${k} från `;
    },
    cheers: "Skål!",
    ack: "Fattat",
    /** Bekräftelse efter duell-förlust-notis (annat tonläge än övriga anpassade notices). */
    duelAck: "Fattar",
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

