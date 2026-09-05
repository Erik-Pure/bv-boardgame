/** English copy — mirrors `sv` in uiStrings.ts */
import { formatCanAmount } from "@bv/game-core";

export const en = {
  home: {
    title: "Master of the Brewmasters",
    subtitle: "The Bad Batches",
    primaryJoin: "Join game",
    createLobby: "Start new game",
    /** Label above start buttons during beta. */
    playtestBadge: "BETA",
    howToPlayTitle: "How to play",
    howToPlayLead:
      "Start the game and invite your friends (or enemies, we don't judge).",
    howToPlayBody:
      'We recommend throwing the game up on a giant screen so nobody can blame "bad eyesight" when they lose, and don\'t forget to put on some background music to ease the awkward silence.',
    howToPlayDeviceBody:
      "Everyone bags a spot with their screen of choice at the ready (phone, tablet, or your trusty old laptop). Does it have a web browser? Perfect.",
    howToPlayCheersBody:
      "And hey... don't forget to stay hydrated. Fill your glass with something ice-cold, preferably from Bryggverket, of course. Cheers! 🍻",
    explainerAlt: "Overview: how to play Master of the Brewmasters with phone and big screen",
    footerCards: "Card catalog",
    footerRules: "Game rules",
    /** First visit on the home page — age gate 18+. */
    ageGateTitle: "Hold on to your hat! Are you 18+?",
    ageGateBody:
      "You need to be at least 18 years old to play. Remember to always drink responsibly!",
    ageGateConfirm: "Yes, I'm over 18",
    ageGateDecline: "I'm under 18",
    ageGateDeclineBody:
      "This game is for adults. You can close the tab or come back when you meet the age requirement.",
    ageGateBack: "Back",
    promoSectionTitle: "Discover more from Bryggverket",
    promoCards: [
      {
        title: "Bryggverket",
        body: "This edition's brewery partner. Read about the beers, the brewery, and book your next beer tasting.",
        href: "https://www.bryggverket.se/",
        cta: "Bryggverket",
        image: "/landing/bv-bryggverket.png",
      },
      {
        title: "Buy beer from Bryggverket",
        body: "Many of the beers you meet in the game exist in real life — perfect before your next game night.",
        href: "https://www.systembolaget.se/sortiment/?q=bryggverket",
        cta: "Systembolaget",
        image: "/landing/bv-systemet.png",
      },
      {
        title: "Buy clothes from Bryggverket",
        body: "Did you know you can buy the in-game clothes for real? Sweaters, caps, and merch await.",
        href: "https://brewmerch.se/varumarke/bryggverket/",
        cta: "Brewmerch",
        image: "/landing/bv-clothes.png",
      },
    ] as const,
    promoSocialLabel: "Follow us on social media",
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
    loginLink: "Log in",
    footerNavLabel: "Footer",
    deployedVersionTitle: "Deployed version",
    languageLabel: "Language",
    languageSv: "SV",
    languageEn: "EN",
  },
  joinPage: {
    title: "Join game",
    subtitle: "Enter the lobby code the host shows and pick your name.",
    roomLabel: "Lobby code",
    nameLabel: "Name",
    namePlaceholder: "Your name",
    connect: "Connect",
  },
  play: {
    wsConnecting: "Connecting to game…",
    wsWaitingRetry: "Trying again in a moment…",
    wsRetry: "Try again",
    wsReconnectAttempt: (n: number) => `Reconnecting · attempt ${n}`,
    /** Footer (mobile): short line to the right of lobby link */
    wsReconnectFooterConnecting: "Connecting…",
    wsReconnectFooterWaiting: (n: number) => (n > 0 ? `Attempt ${n}` : "New attempt soon…"),
    notConnected: "Not connected to server.",
    sessionEndedKicked: "You were removed from the game.",
    sessionEndedLobbyCleared: "The lobby was cleared — join again if you want to continue.",
    lobbySheet: (ready: number, total: number) => `Lobby — ready: ${ready} / ${total}`,
    unready: "Undo ready",
    ready: "Ready",
    startGame: "Start game",
    shuffleAvatar: "Randomize avatar",
    hostNeedPlayers: "Need at least 2 players and everyone must be ready.",
    waitHostStart: "Waiting for the host to start when everyone is ready.",
    strength: "Strength",
    /** Mobile: equipment row under slots — attack from gear + any combat modifiers. */
    equipmentAttackFromGearAria: (n: number) => `Attack from equipment: ${n}`,
    equipmentAttackFromGearWithTempAria: (gear: number, temp: number) =>
      `Attack from equipment: ${gear}, temporary modifier for next combat: ${temp > 0 ? `+${temp}` : temp}`,
    equipmentNextCombatModHint: "Temporary attack modifier for next combat",
    equipmentMaxHpAria: (n: number) => `Max HP (equipment and brew bonuses): ${n}`,
    /** Mobile: shield = damage reduction from armor/helmet/accessory etc. */
    equipmentDefenseFromGearAria: (n: number) => `Shield — damage reduction from equipment: ${n}`,
    equipmentBvbFromGearAria: (n: number) => `BvB bonus on die rolls from equipment: ${n}`,
    continue: "Continue",
    chooseTeammate: "Team battle — choose a teammate",
    teamBattleLabel: "Team battle",
    teammateMustFight: "Selected player must fight with you this round.",
    waitAttackerChooseTeammate: (name: string) => `Waiting for ${name} to choose a teammate…`,
    teammatePicked: (name: string) => `Teammate: ${name}`,
    waitTeammateCombatRoll: (name: string) => `${name} still needs to roll their die.`,
    waitTeamSecondRoll: "Waiting for teammate's die roll.",
    chooseBeerBroPartner: "Choose a player to roll with the attacker (own d6 + weapon):",
    combatMeetYou: "YOU MEET",
    combatBeerBroLabel: "Beer Bro:",
    attackerViewingEncounter: (name: string) => `${name} is viewing the encounter…`,
    bossFinaleVictory: "VICTORY!",
    bossFinaleWinner: (name: string) => `${name} wins!`,
    bossFinaleEnding: "Ending…",
    skipMonsterEncounter: "Avoid bad batch (−2 cans)",
    skipMonsterEncounterToast: (playerName: string, enemyName: string) =>
      `${playerName} avoids ${enemyName} (−2 cans)`,
    beerBroUnavailableTeamBattle: "Beer Bro can't be used in team battle — choose a teammate instead.",
    beerBroAlreadyHelping: "A Beer Bro is already helping in this fight.",
    theAttacker: "the attacker",
    yourD6: "Your d6",
    beerBroD6: "Beer Bro d6",
    attackTotalVs: (total: number, need: number) => `Attack total ${total} vs strength ${need}`,
    /** Under combat die after roll (number + icon shown separately in UI). */
    combatRollAttackTotalLabel: "Attack total",
    combatRollVsLabel: "vs",
    waitAttackerContinue: (name: string) => `Waiting for ${name} to continue…`,
    youLostTotal: (total: number, need: number) => `You lost: total ${total} vs strength ${need}`,
    hitChoiceIntro: (enemy: string) => `${enemy} — choose how you take the hit:`,
    hitChoiceDetail: (reduce: number, full: number) =>
      `Take a sip: −${reduce} damage (you get +1 sip). Or take full ${full} damage, no sip.`,
    takeSipReduce: (n: number) => `Take a sip (−${n} damage)`,
    fullDamageNoSip: (n: number) => `Full damage (${n}), no sip`,
    /** Captain Interrobang / Transporter: secondary button without can/compensation */
    takeFullDamageHp: (n: number) => `Take full damage (${n} damage)`,
    /** Captain Interrobang: post-loss choice. */
    hitMitigationInterrobangDetail:
      "Pay 5 cans to reduce damage by 3, or take full damage.",
    hitMitigationInterrobangPrimary: "Pay 5 cans (−3 damage)",
    /** Transporter: post-loss choice. */
    hitMitigationTransporterDetail: "Pay 10 cans to take 0 damage, or take full damage.",
    hitMitigationTransporterPrimary: "Pay 10 cans (0 damage)",
    /** When the player doesn't have cans for Captain Interrobang / Transporter. */
    hitMitigationPantOnlyFullDamage: (cost: number) =>
      `You don't have ${formatCanAmount(cost)} — take full damage.`,
    waitAttackerChoose: (name: string) => `Waiting for ${name} to choose…`,
    attackModifier: (m: number) => `Attack modifier: ${m}`,
    waitIntervene: "Waiting for other players to intervene…",
    rollCombat: "Roll die",
    /** Approximate win chance before the combat roll (next to monster strength). */
    combatWinChancePct: (pct: number) => `${pct}%`,
    combatWinChanceAria: (pct: number) => `Approximate win chance ${pct} percent`,
    combatHelpRequest: "Ask for help",
    combatHelpCancel: "Cancel help request",
    combatHelpChooseHelper: "Choose who you want to ask for help",
    combatHelpNoCandidates: "Nobody can help right now.",
    combatHelpWaitAttackerChoose: (name: string) => `Waiting for ${name} to choose a helper…`,
    combatHelpDecisionPrompt:
      "Do you want to help? You roll your own die (like a team battle) and share the risk on a loss.",
    combatHelpDecisionDecline: "Don't help",
    combatHelpDecisionFree: "Help (free)",
    combatHelpDecisionPant: "Help for cans",
    combatHelpDecisionTreasure: "Help for treasure",
    combatHelpDecisionAll: "Help for everything",
    combatHelpDecisionSplit: "Split winnings equally",
    combatHelpWaitDecision: (name: string) => `Waiting for a response from ${name}…`,
    combatHelpRequesterPrompt: (name: string) => `${name} wants to help for the following compensation:`,
    combatHelpRequesterWait: (name: string) => `Waiting for ${name} to respond to your terms…`,
    combatHelpRequesterAccept: "Yes, accept terms",
    combatHelpRequesterDecline: "No, continue without help",
    combatHelpPlayPositiveCard: "Play at least one positive card to help.",
    combatHelpNoPlayablePositiveCards: "You have no positive help cards to play.",
    combatHelpWaitHelperCard: (name: string) => `Waiting for ${name} to play a help card…`,
    combatHelpWaitHelperRoll: (name: string) => `Waiting for ${name} to roll their die in combat…`,
    combatHelpDeniedToast: (name: string) => `${name} declined to help.`,
    intervenePickCard: "Intervene — choose a card",
    /** Ends intervention without a card — sends pass to server (same as "Do nothing"). */
    interveneCancelPass: "Cancel intervention",
    /** Reactor with no intervention items in inventory — must be able to pass so the fight doesn't lock up. */
    noInterveneCards: "You have no items to intervene with in this fight.",
    /** After "Intervene" there are no playable cards (e.g. already used) — end with pass. */
    interveneNoCardsPlayable: "You have no playable intervention cards.",
    itemSuffixBeerBro: " (join the fight)",
    back: "Back",
    inCombat: (name: string) => `${name} is in combat`,
    intervene: "Intervene",
    doNothing: "Do nothing",
    encounterChoose: "Encounter — brewer vs brewer. Choose:",
    /** Prefix when move choice leads to tile with another brewer; combined with tile type, e.g. «BvB / Event». */
    moveChoiceBvbLabel: "BvB",
    moveChoiceMerchant: "Recycle cans",
    pvpChooseOpponent: "BvB — choose opponent:",
    /** Encounter choice: no parenthetical when no valid names (extreme case). */
    pvpBothRollVersus: (opponentNamesCommaSeparated: string) =>
      opponentNamesCommaSeparated.trim().length > 0
        ? `BvB (${opponentNamesCommaSeparated})`
        : "BvB",
    /** Encounter choice: button text to skip BvB — just the tile type (e.g. Treasure, Event). */
    resolveTileNoPvp: (tileLabel: string) => tileLabel,
    pvpRollDie: "Roll your die",
    pvpRound: (n: number) => `Round ${n}`,
    pvpRoundYouWon: "You won the round",
    pvpRoundYouLost: "You lost the round",
    pvpRoundBestOf: (round: number, bestOf: number) => `Round ${round} of ${bestOf}`,
    pvpTieRerollHint: "Tie — both re-roll.",
    /** After round roll: match continues after both confirm. */
    pvpRoundRevealNextRound: (completedRound: number, nextRound: number) =>
      `Round ${completedRound} done. Confirm before round ${nextRound}.`,
    pvpRoundRevealMatchEnd: "Final round done — match decided. Confirm before loot.",
    pvpRoundRevealTotals: (attackerTotal: number, defenderTotal: number) =>
      `Attacker total ${attackerTotal} · defender ${defenderTotal}`,
    pvpRoundRevealContinue: "Continue",
    pvpRoundRevealDone: "Confirmed",
    pvpRoundRevealTapToContinue: "Tap Continue when you've seen the result.",
    pvpRoundRevealWaitOther: (name: string) => `Waiting for ${name} to confirm…`,
    pvpRoundRevealBothAcked: "Done — moving on…",
    yourD6TotalWeapon: (die: number, total: number) => `Your d6: ${die} · total ${total} with weapon.`,
    youRolled: "You rolled",
    combatPlayerHasRolled: "has rolled",
    combatPlayerHasNotRolled: "has not rolled",
    rollPvpDie: "Roll BvB die",
    pvpPreRoundItemsHint: "Play items to affect the duel.",
    pvpReady: "Ready",
    pvpReadyUndo: "Not ready yet",
    pvpBothReady: "Both ready — roll round starting now.",
    pvpWaitingOpponentReady: (name: string) => `Waiting for ${name} to mark ready…`,
    pvpPressReadyWhenDone: "Press Ready when you've finished playing your cards.",
    /** You have none of the items playable in BvB prep — server counts you as ready without a button press. */
    pvpNoItemsAutoReady: "You have no BvB items to play.",
    pvpWaitingOpponentItemsOrReady: (name: string) =>
      `Waiting for ${name} to finish playing or mark ready…`,
    pvpScoreLabel: "Match score",
    payPant: (n: number) => `Pay ${formatCanAmount(n)}`,
    haveKlunkar: (n: number) => `Have at least ${n} sips`,
    /** Door/level: sip count _or_ brewer level (header) can suffice without the number being reached. */
    doorAscendSipsOrBrewer: (minKlunk: number) =>
      `Ascend with sips (at least ${minKlunk})`,
    stay: "Stay",
    levelUpPrompt: (levelDisplay: number) =>
      `As a brewmaster you can rise to level ${levelDisplay}. Will you?`,
    levelUpBrewerToast: (level: number) => `Brew level ${level}! You rose in brew level.`,
    levelUpProgressTitle: (brewerLevel: number) => `Brew level ${brewerLevel}`,
    levelUpProgressAria: (brewerLevel: number) =>
      `Brew level ${brewerLevel}, XP toward next brew level.`,
    levelUpOfferTitle: "Go up to the next level?",
    levelUpOfferPrompt: (_levelDisplay: number) =>
      "From rescued batches to the bottom of the glass; you’ve seen it all. Like a true brewmaster, you have now mastered the craft and unlocked the next level. Do you dare to accept the challenge and raise the difficulty?",
    levelUpOfferHint: "",
    /**
     * `boardLevelIndex` = target floor 0-based (same as `levelIndex` after ascending).
     * Only monsters **on that floor** get +N on strength requirement; cans/sips/damage don't change from the level change.
     */
    levelUpMonsterScaleOnDestination: (boardLevelIndex: number): string => {
      const bonus = boardLevelIndex;
      if (bonus <= 0) return "";
      return `On the next floor, bad batches get stronger and deal more damage.`;
    },
    levelUpNow: "Ascend to next level now",
    levelUpStayForTile: "Stay put (one more turn)",
    brewerPerkTitle: "Level up!",
    brewerPerkPrompt: (levelsRemaining: number) =>
      levelsRemaining > 1
        ? `Choose bonus (${levelsRemaining} left).`
        : "Choose a permanent bonus:",
    brewerPerkAttack: "+1 strength",
    brewerPerkShield: "+1 shield",
    brewerPerkHp: "+2 HP",
    brewerPerkPvp: "+1 BvB",
    brewerPerkItems: "+1 item card",
    brewerPerkChoiceWithCap: (label: string, count: number, max: number) => `${label} (${count}/${max})`,
    brewerItemCardBonusAria: (bonus: number) => `Item bonus ${bonus}`,
    merchantItemKindEquipment: "Equipment · permanent",
    merchantItemKindConsumable: "Item · single use",
    merchantItemKindGold: "Deposit · instant",
    merchantDetailBuy: "Buy",
    merchantDetailBack: "Back",
    pvpArmorDamageHint:
      "Armor helps you win the BvB duel. It only blocks damage if your opponent chooses the HP penalty afterward.",
    merchantReplaceBody: (slot: string, currentName: string, newName: string) =>
      `You already have ${currentName} as ${slot}. Swap for ${newName}? The old equipment is replaced.`,
    merchantReplaceConfirm: "Yes, swap",
    merchantReplaceCancel: "Cancel",
    lootEquipmentReplaceTitle: (slot: string) => {
      switch (slot) {
        case "weapon":
          return "New weapon — want to swap?";
        case "armor":
          return "New armor — want to swap?";
        case "helmet":
          return "New helmet — want to swap?";
        case "accessory":
          return "New accessory — want to swap?";
        default:
          return "New equipment — want to swap?";
      }
    },
    equipmentReplaceCurrentEffects: "Current",
    equipmentReplaceNewEffects: "New equipment",
    lootEquipmentReplaceDecline: "No, keep what I have",
    merchantCantAfford: "You can't afford it.",
    merchantReroll: "Re-roll",
    merchantShopCollapsedHint: "Minimized — show panel to see what you can buy.",
    /** Merchant detail: mechanical effect line when card rules are missing (EN). */
    shopPower: (n: number) => (n >= 0 ? `Power +${n}` : `Power ${n}`),
    shopGoldDeposit: (n: number) => `+${formatCanAmount(n)}`,
    shopPvpOnRoll: (n: number) => (n > 0 ? `BvB: +${n} on roll` : `BvB: ${n} on roll`),
    shopPerFightGold: (n: number) => `Per fight: +${formatCanAmount(n)}`,
    shopBreaksAfterWin: "Breaks after a win",
    shopMonsterLossSip: (n: number) => `On monster loss: −${n} penalty sip`,
    shopAttackSigned: (n: number) => (n > 0 ? `Attack +${n}` : `Attack ${n}`),
    shopBeerSetArmor: "Can set armor: +2 / +4 / +10 max HP (1–3 pieces)",
    shopBeerSetHelm: "Can set helmet: +1 / +2 / +3 attack (1–3 pieces)",
    shopBeerSetShield: "Can set shield: +1 / +2 / +3 damage blocked (1–3 pieces)",
    shopDamageNegateFromLevel4: (n: number) => `Damage −${n} (active from level 4)`,
    shopDamageNegate: (v: number) => (v >= 0 ? `Damage −${v}` : `Damage +${Math.abs(v)}`),
    shopPerFightSip: (n: number) => `Per fight: +${n} sip`,
    shopCannotBeStolen: "Cannot be stolen",
    shopLevelUpDiscount: (n: number) => `Level up: −${formatCanAmount(n)}`,
    shopMerchantDiscount: (n: number) => `Shopping: −${formatCanAmount(n)} cheaper in the shop`,
    shopCanSkipMonsterFight: "Can choose to skip monster combat",
    shopNegateAllOnce: "Blocks all damage once",
    shopCannotBeChallengedBvb: "Cannot be challenged in BvB",
    shopIgnoreCritFailOnOne: "Rolling 1 on the combat die doesn't auto-lose",
    shopDeathContinue: (n: number) => `On death: pay ${formatCanAmount(n)} for full HP`,
    shopItemCardBonus: (n: number) => `+${n} item cards`,
    shopFreeItemPlay: "Items: free to play",
    shopPlastbackSupplement: "Empty bottle: 6 fights",
    /** Crate: argument = cans on sale (= bottles left in holder). */
    sellPlastbackAccessory: (pant: number) =>
      pant > 0 ? `Sell Crate (+${formatCanAmount(pant)})` : "Sell Crate",
    takePlastbackBottle: (packRemaining: number) =>
      packRemaining > 0 ? `Take bottle (${packRemaining} left)` : "Take bottle",
    /** Remove/discard equipped piece (destroyed). */
    unequipEquipment: "Remove",
    unequipEquipmentAria: (itemName: string) => `Remove ${itemName}`,
    leave: "Leave",
    pvpChooseLoot: "BvB — choose loot",
    takePantMax10: "Take cans (max 10)",
    givePenaltyKlunk: "Penalty sip (+1)",
    pvpDeal2Damage: "Deal 2 damage to loser",
    takeSlot: (slot: string) => `Take ${slot}`,
    /** BvB loot: shows actual can amount taken (max 10). */
    pvpLootTakePant: (amount: number) => `Take cans (${amount})`,
    /** BvB loot: sips opponent gets (incl. helmet/accessory penalty bonus). */
    pvpLootPenaltyKlunk: (klunkar: number) =>
      klunkar === 1 ? `Penalty sip (+1 sip)` : `Penalty sip (+${klunkar} sips)`,
    /** BvB loot: 2 HP damage with preview of opponent's HP. */
    pvpLootDealDamageLine: (fromHp: number, toHp: number, blockedByNegateOnce: boolean): string => {
      if (blockedByNegateOnce) return `Deal 2 damage (HP unchanged — armor/helmet blocks)`;
      return `Deal 2 damage (HP ${fromHp}→${toHp})`;
    },
    /** BvB loot: slot already capitalized, `itemName` truncated in caller if needed. */
    pvpLootTakeEquipment: (slotLabel: string, itemName: string) => `Take ${slotLabel}: ${itemName}`,
    noItemsToSteal: "No items to take.",
    /** Loser has e.g. sunglasses (preventTheft): BvB loot is only cans, penalty sip, or damage. */
    pvpLootTheftProtectedHint:
      "Opponent is protected from equipment theft — choose cans, penalty sip, or damage.",
    rollDie: "Roll die",
    /** Item «Sixth Beer Sense»: choose fixed die face before Use. */
    itemsChooseDiceFace: "Pick number (1–6) for next roll",
    /** During combat after Beard Back — d6 shows the roll but contribution to total is 2×. */
    combatAttackDoubledHint: "Die counts double in attack total (Beard Back).",
    lobbyHeader: (room: string, status: string) => `Lobby ${room} · ${status}`,
    /** Status footer in PlayView during game — own row above lobby line. */
    footerTurnYou: "Your turn",
    footerTurnOther: (name: string) => {
      const n = name.trim() || "—";
      return n.endsWith("s") ? `${n}' turn` : `${n}'s turn`;
    },
    /** Toast when someone plays an item on you. */
    itemPlayedOnYou: (actorName: string) => `${actorName} played on you`,
    /** Mobile: spectator during ongoing BvB. */
    emoteCaptionSpectatingPvp: (attacker: string, defender: string) =>
      `BvB: ${attacker} vs ${defender}`,
    /** Mobile: after intervention pass, waiting for fight to continue. */
    emoteCaptionWaitingCombatContinue:
      "You've already chosen. Waiting for the fight to continue…",
    emoteOpenPickerAria: "Send emote",
    emoteClosePickerAria: "Close emote picker",
    emotePickerAria: "Choose emote",
    emoteCooldown: "Wait a bit before the next emote",
    emoteSendAria: (id: string) => {
      const labels: Record<string, string> = {
        surprised: "Surprised",
        happy: "Happy",
        sad: "Sad",
        angry: "Angry",
        love: "Love",
      };
      return `Send ${labels[id] ?? "emote"}`;
    },
    players: "Players",
    settings: "Settings",
    settingsTitle: "Settings",
    settingsLanguage: "Language",
    settingsRainbowEffects: "Rainbow effect",
    settingsDiceAnimations: "Spinning 3D dice",
    settingsMobileSfx: "Sound effects",
    settingsLobbyStatus: "Connection",
    settingsTurnStatus: "Turn status",
    settingsOpenTutorial: "Read game rules",
    settingsLeaveGame: "Leave game",
    settingsLeaveGameConfirm: "Are you sure you want to leave the game?",
    settingsLeaveGameCancel: "Cancel",
    /** Mobile after join: responsible play / alcohol (mandatory confirmation). */
    responsibleReminderTitle: "An important reminder",
    responsibleReminderBody:
      "We want everyone to have fun! Drink responsibly and remember that alcohol can be harmful to your health. You absolutely don't need to drink alcohol to participate — water, soda, or non-alcoholic beer works just as well for winning (or losing) with style.",
    responsibleReminderOk: "I understand",
    panelMinimize: "Minimize panel",
    panelMaximize: "Show panel",
    waitingState: "Waiting for state…",
    lookingForPlayer: "Looking for your player…",
    sessionStale:
      "The server restarted or the game no longer matches your connection. Go to the home page and join again if it doesn't resolve within a few seconds.",
    sessionStaleLeave: "To home page",
    pant: "Deposit",
    klunkar: "Sips",
    itemsHeading: "ITEMS",
    itemsEmpty: "No items yet.",
    lobbySectionTitle: "Lobby",
    lobbyReadyLine: (ready: number, total: number) =>
      `Ready: ${ready} / ${total} (everyone must be ready)`,
    lobbyBottomHint: "Use the panel at the bottom to get ready and start.",
    lobbyDifficulty: "Difficulty",
    lobbyDifficultyLattol: "Light beer",
    lobbyDifficultyFolkol: "Session beer",
    lobbyDifficultyStarkol: "Strong beer",
    lobbyDifficultyImperial: "Imperial",
    lobbyBoardSize: "Board size",
    lobbyBoardSizeDefault: "Standard",
    lobbyBoardSizeLarge: "Large",
    lobbyBoardSizeXLarge: "Extra large",
    lobbyLevelCount: "Number of levels",
    lobbyHardcore: "Hardcore (no restart at 0 HP)",
    lobbySetupTitle: "Lobby Settings",
    lobbyHardcoreModeLabel: "Hardcore mode (only 1 life)",
    lobbyAllowLateJoinLabel: "Allow late join",
    lobbyClearPlayersOnRematchLabel: "Clear players on new game",
    lobbyWakeLockDisableScreen: "Disable sleep mode for screens",
    lobbyWakeLockBeforeStart: "Keep screen awake already in lobby",
    lobbyStartLobby: "Start lobby",
    /** Lobby: section for cosmetics (card back, future tokens, frames …). */
    lobbyAppearance: "Appearance",
    lobbyCardCoverDefault: "Default",
    lobbyCardCoverAlt1: "Variant 1",
    lobbyCardCoverAlt2: "Variant 2",
    lobbyShowCardToggles: "Choose allowed cards",
    lobbyHideCardToggles: "Hide card selection",
    lobbyCardToggleHint: "System cards can't be turned off here. Unchecked cards aren't drawn in the game.",
    lobbyAdvancedSettings: "Advanced settings",
    lobbyGeneral: "General",
    lobbyAccessibility: "Accessibility",
    lobbyGameValues: "Game values",
    lobbyAllowedCards: "Allowed cards",
    lobbyMaxHp: "Max HP",
    lobbyStartPant: "Starting cans",
    lobbyPvpBestOf: "BvB rounds",
    lobbyMaxPlayers: "Max players",
    lobbyTurnTimeoutEnabled: "Turn timeout",
    lobbyTurnSeconds: "Time per turn",
    lobbyMissedTurnsKickAfter: "Kick after missed turns",
    lobbyMissedTurnsKickAfterOff: "Off",
    lobbyReactionSeconds: "Reaction timer",
    brewerDownTitle: "Downed brewer",
    brewerDownLead: "You're at zero HP. Choose how to continue.",
    brewerDownRetry: "Start over",
    brewerDownInsuredContinue: (cost: number) => `Life insurance: pay ${formatCanAmount(cost)}`,
    brewerDownGiveUp: "Give up",
    brewerDownWaitOther: (name: string) => `Waiting for ${name} to choose …`,
    gameOver: "Game over",
    scoreboardTableCaption: "Final results per player",
    scoreboardColName: "Player",
    scoreboardColLevel: "Level",
    /** Number of downed brewer times (0 HP). */
    scoreboardColKnockdowns: "Down",
    /** Monster fights won / lost. */
    scoreboardColMonsterWl: "Monst.",
    /** BvB matches won / lost (column aria-label). */
    scoreboardColPvpWl: "BvB, matches won and lost",
    scoreboardColItems: "Used",
    /** Sip column shows cumulative sips taken (all lives). */
    scoreboardColKlunk: "Sips (game total)",
    scoreboardColPant: "Deposit",
    scoreboardColHp: "HP",
    scoreboardKlunkCellAria: (total: number) => `${total} sips taken total during the game`,
    scoreboardPantCellAria: (wallet: number) => `Deposit in wallet ${wallet}`,
    scoreboardBrewerLevelAria: (n: number) => `Brew level ${n}`,
    scoreboardLeftGameAria: "Left the game",
    winner: "Winner",
    /** Button in modal when game ends — goes to home page. */
    gameOverLeaveToHome: "Exit game",
    /** Table: new match in the same room with the same lobby settings. */
    gameOverPlayAgain: "New game",
    /** Optional link to Google Forms after finished game (mobile). */
    gameOverFeedback: "Give feedback (optional)",
    spotlightRegionAria: "Highlights",
    spotlightMostOnesTitle: "Most ones",
    spotlightMostPantSpentTitle: "Most cans spent",
    spotlightMostPvpWinsTitle: "Most BvB wins",
    spotlightMostPvpMatchesTitle: "Most BvB matches",
    spotlightMostLossesTitle: "Most losses",
    spotlightMostSabotageTitle: "Sabotaged the most",
    spotlightMostHelpedTitle: "Helped the most",
    spotlightMaxRollTitle: "Highest die roll",
    spotlightMostKnockdownsTitle: "Died the most",
    spotlightMostMonsterWinsTitle: "Saved the most batches",
    spotlightMostHpLostTitle: "Lost the most HP",
    debugLine: (parts: {
      ws: string;
      myId: string;
      meId: string;
      lastState: string;
      players: string | number;
      rtt: string;
    }) =>
      `ws: ${parts.ws} · debug: my id=${parts.myId} · me=${parts.meId} · last state=${parts.lastState} · players=${parts.players} · latency=${parts.rtt}`,
    modalPlayers: "Players",
    hostTag: "(host)",
    statsLine: (hp: number, maxHp: number, pant: number, klunk: number) =>
      `HP ${hp}/${maxHp} · Deposit ${pant} · Sips ${klunk}`,
    equipWeapon: "Weapon",
    equipArmor: "Armor",
    equipHelmet: "Helmet",
    equipAccessory: "Accessory",
    modalItem: "ITEM",
    itemNotFound: "Item not found.",
    chooseTarget: "Choose target",
    use: "Use",
    itemsUseOnSelf: "Use on self",
    itemsUseHint: "You can use items on your turn or during combat reactions.",
    itemsPassiveHint: "This item doesn't need to be used — it applies automatically while in your inventory.",
    itemShortcutNoBossTile: "No boss tile on the final floor.",
    itemShortcutBossCost: (goldCost: number, onBoss: boolean) =>
      `Current cost: ${formatCanAmount(goldCost)} (${onBoss ? "clear the final boss tile directly — you're already on it." : "go directly to the final boss tile."})`,
    itemShortcutTopFloor: "You're already on the top floor.",
    itemShortcutLevelCost: (goldCost: number, levelNumber: number) =>
      `Current cost: ${formatCanAmount(goldCost)} (to floor ${levelNumber}).`,
    modalClose: "Close",
    emptySlot: "Empty slot.",
    armorNegateAllOnce: "Negate all damage once (then breaks)",
    negatePerHit: (n: number) => `Negate ${n} damage per hit`,
    bonusHp: (n: number) => `Bonus HP +${n}`,
    healHpPerTurn: (n: number) => `Each turn: +${n} HP (up to max).`,
    combatBonus: (n: number) => `Combat bonus +${n}`,
    moveSteps: (n: number) => `Movement +${n} steps`,
    powerPlus: (n: number) => `Power +${n}`,
    equipmentWinGold: (n: number) => `On win: +${formatCanAmount(n)}.`,
    equipmentRandomOtherDamage: (n: number) => `On win: a random other player takes ${n} damage.`,
    equipmentPowerAtGold10: (n: number) => `At 10+ cans: power +${n}.`,
    equipmentPowerAtGold20: (n: number) => `At 20+ cans: power +${n}.`,
    equipmentPowerAtGold30: (n: number) => `At 30+ cans: power +${n}.`,
    equipmentSipWeaponKlunkBonus: (kl: number, tot: number, base: number) =>
      `Monster combat: optionally drink ${kl} sip(s) before the combat roll → +${tot} attack from weapon (+${base} without sip).`,
    equipmentSipWeaponPantBonus: (cost: number, bonus: number) =>
      `Monster combat: optional ${formatCanAmount(cost)} before the combat roll for +${bonus} attack.`,
    equipmentSipWeaponFreeBonus: (bonus: number) =>
      `Monster combat: optional bonus before the combat roll for +${bonus} attack.`,
    equipmentPvpCannotBeChallenged:
      "Other players can't challenge you to BvB, but you can challenge them.",
    equipmentGoldOnDamage: (n: number) => `When you take damage: gain +${formatCanAmount(n)}.`,
    equipmentBossDamageNegate: (n: number) => `Vs boss: negate an additional ${n} damage per hit.`,
    equipmentPenaltySipExtra: (n: number) => `When you get a penalty sip: drink ${n} extra sip.`,
    equipmentGoldPerPenaltyKlunk: (n: number) => `Per penalty sip: +${formatCanAmount(n)}.`,
    equipmentKlunkAttack10: (n: number) => `At 10+ sips: +${n} attack.`,
    equipmentKlunkAttack20: (n: number) => `At 20+ sips: +${n} attack.`,
    pvpWeaponDieBonus: (n: number) =>
      `In duels (BvB): +${n} on roll total (doesn't affect bad batch combat).`,
    combatCardSheetTitle: "Bad batch",
    treasureCardSheetTitle: "Treasure",
    treasureLootHeading: "Loot",
    combatWinTitle: "Batch saved!",
    combatWinRewards: "Rewards",
    combatWinContinue: "CONTINUE",
    combatWinEnemyFallback: "the bad batch",
    combatWinTeamLegacy: "You win!",
    combatWinSubtitle: (winner: string, enemy: string) => `${winner} wins against ${enemy}`,
    combatWinSubtitleTeam: (a: string, b: string, enemy: string) => `${a} and ${b} win against ${enemy}`,
    combatWinSubtitleHelpMate: (attacker: string, enemy: string) =>
      `You helped — ${attacker} wins against ${enemy}`,
    combatWinRoll: (roll: number, need: number) => `Roll: ${roll} (needed ${need})`,
    combatWinRandomOtherSip: (recipient: string) =>
      `${recipient} gets a penalty sip — random other player.`,
    /** Mobile PlayView: after Continue on win modal — cards/equipment you drew */
    combatWinGrantedLootToast: (titles: string[]) =>
      titles.length === 1 ? `You got: ${titles[0]}` : `You got:\n${titles.map((t) => `• ${t}`).join("\n")}`,
    combatSipWeaponPrompt: (
      weaponName: string,
      bonusIncrement: number,
      costGold: number,
      costKlunks = 0,
      totalWeaponAtk?: number,
    ) =>
      costKlunks > 0
        ? `${weaponName}: drink ${costKlunks} sip(s) for +${totalWeaponAtk ?? bonusIncrement} attack from the weapon on this roll?`
        : `${weaponName}: pay ${formatCanAmount(costGold)} for +${bonusIncrement} attack on this roll?`,
    combatSipWeaponRollWith: (
      bonusIncrement: number,
      costGold: number,
      costKlunks = 0,
      totalWeaponAtk?: number,
    ) =>
      costKlunks > 0
        ? `Drink ${costKlunks} sip (+${totalWeaponAtk ?? bonusIncrement} from weapon)`
        : `Pay ${formatCanAmount(costGold)} (+${bonusIncrement} attack)`,
    combatSipWeaponRollWithout: "Roll without bonus",
    /** After roll with 1 on d6 — by the die (mobile + table). */
    combatCritFailOnOneNearDice: "Critical fail!",
    combatLoseTitle: "Dumped!",
    combatLoseContinue: "CONTINUE",
    combatLoseSubtitle: (player: string, enemy: string) => `${player} loses against ${enemy}`,
    combatLoseSubtitleHelpMate: (attacker: string, enemy: string) =>
      `You helped in the fight — ${attacker} lost against ${enemy}`,
    combatLoseSubtitleBeerBro: (attacker: string, enemy: string) =>
      `You lost together — ${attacker} lost against ${enemy}`,
    combatLosePenalties: "Penalties",
    /** Mobile: when attacker closes loss — you were combat help or beer bro */
    /** Mobile: target player when someone plays Point Angrily. */
    pekaArgtDamageToast: (fromName: string) =>
      `${fromName} pointed angrily at you. You take 1 damage.`,
    combatLoseAllyImpactToast: (role: "helpMate" | "beerBro", hpLost: number, klunksGained: number) => {
      const head = role === "helpMate" ? "Combat help" : "Beer Bro in the fight";
      const bits: string[] = [];
      if (hpLost > 0) bits.push(`−${hpLost} HP`);
      if (klunksGained > 0) bits.push(`+${klunksGained} penalty sip`);
      return bits.length === 0 ? `${head}: no further penalty for you.` : `${head}: you were hit — ${bits.join(", ")}`;
    },
    combatLoseNoDirectPenalty: (player: string) =>
      `No direct damage or extra sip for ${player} on this hit.`,
    combatLoseLostEquipment: (player: string, item: string) => `${player} lost equipment: ${item}.`,
    combatLoseImperialSplash: "Other players on the same floor took 1 damage each (Stoorns splash).",
  },
  table: {
    wsConnecting: "Connecting to table…",
    wsWaitingRetry: "Trying again in a moment…",
    wsRetry: "Try again",
    wsReconnectAttempt: (n: number) => `Reconnecting · attempt ${n}`,
    wsReconnectFooterConnecting: "Connecting…",
    wsReconnectFooterWaiting: (n: number) => (n > 0 ? `Attempt ${n}` : "New attempt soon…"),
    combatOverlayTitle: "Board — bad batch",
    combatPhase1: "1 — Encounter",
    combatPhaseTeam: "0 — Choose teammate",
    teamBattleIntroTitle: "Team battle",
    teamBattleLabel: "Team battle",
    teamBattleWaitTeammate: "waiting for teammate choice",
    teamBattleNextOpponent: "Opponent",
    teamBattleIntroBody: (attacker: string) =>
      `${attacker} chooses a teammate on their phone before the fight begins.`,
    teamBattleIntroHint:
      "On loss, both drink an extra penalty sip per the batch card — you roll together against the same strength.",
    combatPhase2: "2 — Cards & die",
    combatPhase3Choice: "3 — Hit choice (sip or full)",
    combatPhase3Result: "3 — Result",
    isFighting: "facing",
    strength: "Strength",
    canIntervene: "Can intervene:",
    combatHelpAsking: "Requesting help:",
    combatHelpAwaitDecision: (name: string) => `Waiting for a response from ${name}…`,
    combatHelpAwaitCard: (name: string) => `${name} should roll their die in combat.`,
    combatHelpAcceptedContract: (name: string, contract: string) =>
      `${name} is helping (${contract}).`,
    /** Board TV: large banner while helper participates (legacy helpAwaitCard). */
    combatHelpAwaitCardBanner: (helperName: string) => `${helperName} is helping`,
    /** Board TV: large banner while help request awaits yes/no (same family as merchantShopping). */
    combatHelpRequestBanner: (attackerName: string) => `${attackerName} asking for help`,
    combatHelpRequestBannerAria: (attackerName: string) => `${attackerName} is asking for help`,
    /** Board TV: large banner while attacker responds to helper's terms. */
    combatHelpRequesterWaitBanner: (attackerName: string) => `Waiting for ${attackerName}`,
    combatHelpRequesterWaitBannerAria: (attackerName: string) =>
      `Waiting for ${attackerName} to respond to the help terms`,
    attackerChoosesHit: (reduce: number) =>
      `Attacker chooses: sip (−${reduce} damage) or full hit.`,
    attackerChoosesInterrobangHit:
      "Attacker chooses: pay 5 cans (−3 damage) or full hit.",
    attackerChoosesTransporterHit:
      "Attacker chooses: pay 10 cans (0 damage) or full hit.",
    /** Shown by the die during reaction phase when attacker has pip weapon (modifier outside d6). */
    diceModifierOptionalSipSuffix: (sipBonus: number, costKlunks = 0) =>
      costKlunks > 0
        ? `· +${sipBonus} for penalty sip (optional)`
        : `· +${sipBonus} for can cost (optional)`,
    diceModifierOnlyOptionalSip: (sipBonus: number, costKlunks = 0) =>
      costKlunks > 0
        ? `+${sipBonus} for penalty sip (optional)`
        : `+${sipBonus} for can cost (optional)`,
    /** Board TV: after roll if optional pip weapon bonus was taken — just number + label by die. */
    diceModifierSipTakenSub: (costKlunks = 0) => (costKlunks > 0 ? "for penalty sip" : "for can cost"),
    /** Board: summary line under the combat die ("total 9"). */
    diceTotalCaption: "total",
    pvpDuel: "BvB",
    pvpRound: (n: number) => `Round ${n}`,
    pvpRoundBestOf: (round: number, bestOf: number) => `Round ${round} of ${bestOf}`,
    pvpTieRerollHint: "Tie — both re-roll.",
    pvpPrepPhase: "Preparation (cards)",
    pvpRoundResultPhase: "Round result",
    pvpRoundResultHint: "Both confirm on phone before next step.",
    pvpScoreLine: (attackerWins: number, defenderWins: number) => `Match score: ${attackerWins}-${defenderWins}`,
    roleAttacker: "Attacker",
    roleDefender: "Defender",
    dieAttackTotal: (die: number, total: number) => `D6 ${die} · attack total ${total}`,
    waitingRoll: "Waiting for roll…",
    winner: "Winner",
    winnerChoosesLoot: "Winner chooses loot on their phone…",
    board: "Board",
    /** Board view: current turn color field, right — next in turnOrder */
    turnBannerNext: (name: string) => `Next: ${name}`,
    combatMeetBanner: (name: string) => `${name.toLocaleUpperCase("en-US")} MEETS`,
    /** Team battle with chosen teammate: both names in the title (replaces the "Team battle: X" line). */
    combatMeetBannerTeam: (a: string, b: string) =>
      `${a.toLocaleUpperCase("en-US")} AND ${b.toLocaleUpperCase("en-US")} MEET`,
    /** Name join in combat/team battle lines ("Erik and Vera"). */
    namesAndJoin: (a: string, b: string) => `${a} and ${b}`,
    /** Sleeping pill: upcoming skipped turns before player acts normally */
    playerStatusSleepSkip: (skippedTurns: number) =>
      skippedTurns === 1
        ? "Skips next turn (sleep)"
        : `Skips ${skippedTurns} turns (sleep)`,
    /** Shaken beer: loss vs monster — skipped turn with this label until corresponding turn consumed. */
    playerStatusOilInEye: "Beer in the eye",
    /** Board TV: who played (card name shown separately above) */
    tableItemPlayActorLine: (actorName: string) => actorName,
    /** Board TV: player and target */
    tableItemPlayActorTargetLine: (actorName: string, targetName: string) =>
      `${actorName} · ${targetName}`,
    sipNoticeToast: (recipientName: string, count: number) =>
      `${recipientName} gets ${count} penalty sip${count === 1 ? "" : "s"}.`,
    brewerLevelUpToast: (name: string, level: number) => `${name} reached brew level ${level}!`,
    combatRewardGoldToast: (recipients: string, amount: number) =>
      `Reward to ${recipients}: +${amount} cans`,
    combatRewardItemsToast: (recipients: string, count: number) =>
      `Reward to ${recipients}: ${count} treasure${count === 1 ? "" : "s"}`,
    combatRewardHelpMateToast: (name: string, titles: string) => `Reward to ${name}: ${titles}`,
    toastFallbackPlayer: "Player",
    toastFallbackHelper: "Helper",
    floorN: (n: number) => `Level ${n}`,
    lobby: "Lobby",
    status: "Status",
    wakeLockToggle: "Disable sleep mode",
    wakeLockUnsupported: "Not supported in this browser",
    lastState: "last state",
    game: "Game",
    waitingState: "Waiting for state…",
    phase: "Phase",
    players: "Players",
    readyAll: (r: number, t: number) => `Ready: ${r} / ${t} (everyone must be ready)`,
    die: "Die",
    pending: "Pending",
    lobbyList: "Lobby",
    lobbyScanQrToJoin: "Scan qr code to join lobby",
    lobbyJoinUrlShort: "spela.bryggverket.se/join",
    lobbyCopyJoinUrl: "Copy join link",
    lobbyJoinUrlCopied: "Copied!",
    /** Board TV: remove a player from the room (e.g. has to leave). */
    tableKickPlayer: "Remove from game",
    /** Button text (short) — full line in `tableKickPlayer` + `title`. */
    tableKickPlayerButton: "Remove",
    tableKickPlayerAria: (name: string) => `Remove ${name} from game`,
    tableKickConfirm: (name: string) =>
      `Remove ${name} from the game? Their phone control disconnects and the slot frees up.`,
    log: "Log",
    /** Side panel: show game event log (off by default). */
    sidebarShowLog: "Show log",
    hiddenItemFoundTitle: "Found an item!",
    hiddenItemFoundBody: "The player found an item and handles it on their phone.",
    cardArtAlt: "Card art",
    waitingConfirmPhone: "(Waiting for player to confirm on phone…)",
    brewerDownWaitPhone: (name: string) => `${name} is at zero HP — choosing on phone …`,
    hidePanel: "Hide side panel",
    showPanel: "Show side panel",
    tileTypeLabels: "Tile type labels",
    openSettings: "Board settings",
    turnTimeoutAria: (time: string) => `Turn timeout ${time}`,
    togglePlayersPanel: "Show or hide players and log",
    settingsTitle: "Settings (board)",
    settingsBoardPan: "Board panning (auto-focus and drag) — off: full floor",
    settingsBoardAnimations: "Die animations and combat panels",
    settingsTokenMoveAnimations: "Player token movement animation",
    settingsTileBobAnimations: "Animated board tiles (bob wave)",
    settingsScaleAnimations: "Smooth card rescaling (e.g. when items are played)",
    settingsTurnBannerRight: "Show players on the right (vertical)",
    settingsClose: "Close",
    settingsEndMatch: "End game",
    settingsEndMatchConfirm:
      "Really end the game for everyone? During a match this shows the scoreboard.",
    settingsEndMatchCancel: "Cancel",
    /** Board: player is in buy/shop mode (phone). */
    merchantShopping: (playerName: string) => `${playerName} shopping`,
    merchantShoppingAria: (playerName: string) => `${playerName} is in the shop`,
  },
  items: {
    healing_potion: { title: "Healing brew", text: "Restore 3 HP." },
    sleep_potion: { title: "Sleeping draught", text: "Target skips their next turn." },
    sip_card: { title: "Beer tasting", text: "Give +1 sip to a target." },
    weak_beer: {
      title: "Drank too much",
      text: "Combat reaction: −2 attack.",
    },
    light_beer: {
      title: "Energy drink",
      text: "Combat reaction: +1 attack.",
    },
    folk_beer: {
      title: "8-bit beer",
      text: "Combat reaction: +2 attack.",
    },
    tripwire: {
      title: "Slippery floor",
      text: "Combat reaction: −1 attack.",
    },
    double_hops: {
      title: "A helping hand",
      text: "Combat reaction: +2 attack.",
    },
    beer_bomb: {
      title: "Beer bomb",
      text: "Combat reaction: +3 attack.",
    },
    beard_back: {
      title: "Beard Back",
      text: "Double your die roll in combat.",
    },
    hangover: {
      title: "Hangover",
      text: "Combat reaction: −3 attack.",
    },
    pretzel_snack: {
      title: "Pretzel",
      text: "Restore 2 HP for yourself or another player.",
    },
    coin_purse: { title: "Can pouch", text: "+4 cans." },
    monster_hype: {
      title: "Uncontrolled fermentation",
      text: "Combat reaction: −2 attack",
    },
    yeast_sabotage: {
      title: "Shaken beer",
      text: "Combat reaction: −1 attack. If the affected player loses a fight, they skip a turn from beer in the eye.",
    },
    beer_bro: {
      title: "Beer Bro",
      text: "Combined attack: An extra player helps. On loss both take damage; on win the helper gets the same treasure. Automatic loss only if both dice show 1.",
    },
    split_the_g: { title: "Split the G", text: "Take half of another player's cans (rounded down)." },
    lengraddad: {
      title: "Lengräddad",
      text: "Play on another player: −2 attack",
    },
    canman: {
      title: "Canman",
      text: "+1 can every turn for 10 rounds",
    },
    get_lucky: {
      title: "Get Lucky",
      text: "Pay 5 cans: +4 attack in combat. On loss you take double HP damage.",
    },
    manopositiv: {
      title: "Manopositiv",
      text: "Pay 10 cans for +4 attack in combat.",
    },
    shortcut: {
      title: "Shortcut",
      text: "On your turn: pay 10 cans and teleport to any other player.",
    },
    taproom_key: {
      title: "Taproom key",
      text: "On your turn: ascend one floor for 10 cans less than Shortcut — or on the last floor go to the boss for the same discount off Shortcut's price on that level.",
    },
    six_sense: {
      title: "Sixth Beer Sense",
      text: "Pay 5 cans and pick number 1–6: your next die roll (movement, bad batch combat, or BvB) shows that face. Card is consumed when you choose. Applies to both movement and bad batch encounters.",
    },
    rigged_game: {
      title: "Rigged game",
      text: "Pay 5 cans and take random equipment from another player.",
    },
    not_my_round: { title: "A simple theft", text: "Steal random item or equipment from a player" },
    spill_intentional: { title: "Spill on purpose", text: "Pay 2 cans and destroy random item or equipment for a player." },
    early_night: {
      title: "Dump it",
      text: "Use in combat as attacker: skip the bad batch. No XP, no loot.",
    },
    bribes: { title: "Bribes", text: "Avoid a fight for 10 cans. No XP, no loot." },
    paidassasin: {
      title: "Hired thug",
      text: "Pay 15 cans and apply −5 attack to a player in combat or in the BvB round.",
    },
    charity: {
      title: "Donate to charity",
      text: "On your turn: donate cans and restore equal HP — up to your missing health and up to your cans (never more cans than HP you restore).",
    },
    shuffle: {
      title: "Shuffle",
      text: "Swap all your items for another player's items. Costs 10 cans.",
    },

  },
  sipNotice: {
    title: "Penalty sip",
    /** Intro under recipient's name (name not repeated here); sender name «…» colored separately in UI. */
    bodyPrefix: (count: number) => {
      const k = count === 1 ? "A penalty sip" : `${count} penalty sips`;
      return `${k} from `;
    },
    cheers: "Cheers!",
    ack: "OK",
    /** Acknowledgment after duel loss notice (different tone than other custom notices). */
    duelAck: "OK",
    duelLossTitle: "You lost the duel",
    xpGain: (count: number) => `+${Math.max(1, Math.floor(count)) * 10} XP`,
    fallbackFrom: "another player",
  },
  cardModal: {
    continue: "Continue",
    /** Prefix before label reference line under card art (e.g. beer label). */
    etikettRef: "Label:",
    /** Under card text on mobile when player should confirm the card. */
    hintOwnerContinue: "(Tap Continue below when you're ready.)",
  },
  equipAria: {
    empty: (label: string) => `${label} (empty)`,
    view: (label: string) => `${label} (view)`,
  },
  rules: {
    logoAlt: "Master of the Brewmasters",
    title: "Game rules",
    intro:
      "In the quest for the perfect brew, every experience counts. Whether you save a fantastic batch or are forced to drink up your failures, your wisdom grows. You learn from mistakes — but you learn faster from success.",
    section1Title: "🎲 1. How a turn works",
    section1ImageAlt: "Quick guide: roll and choose your path",
    section1TurnIntro: "Each turn starts with a choice — then you resolve the tiles you reach:",
    movementLabel: "Movement:",
    movementText:
      "Roll the movement die and move exactly as many steps as the die shows in any direction.",
    recycleLabel: "Recycle cans:",
    recycleText:
      "Instead of rolling the die you can shop (requires at least 5 cans). Your piece stays put; the turn ends when you leave the shop.",
    prepLabel: "Preparation:",
    prepText:
      "Before you land on a tile you may play items from your hand to improve your odds or optimize your stats.",
    section2Title: "📈 2. Experience (XP) & levels",
    xpIntro:
      "You climb levels by collecting Experience Points (XP). The higher your level, the more XP the next step requires.",
    winXpLabel: "Combat win (batch saved):",
    winXpText: "Defeating a bad batch gives a hefty dose of XP (see value on the card).",
    lossXpLabel: "Combat loss (penalty sips):",
    lossXpText:
      "If you lose you must drink penalty sips. Each sip hardens you and grants a small amount of XP — setbacks move you forward too!",
    levelUpBoxTitle: "Level up!",
    levelUpBoxText:
      "Your experiences — from saved batches to bitter lessons in the glass — have paid off. You leave the beginner swamp behind. Dare you raise the difficulty, or have you had enough?",
    section3Title: "🧭 3. Tiles and events",
    section3ImageAlt: "Quick guide: resolve the tile",
    section3Intro: "When you land on a tile its effect triggers immediately:",
    tileEventLabel: "Event:",
    tileEventText: "Random encounters that can help or hinder your journey.",
    tileTreasureLabel: "Treasure:",
    tileTreasureText: "Chance to find new equipment or powerful items.",
    tileRestLabel: "Rest:",
    tileRestText: "Recover HP so you can keep brewing.",
    tileCombatLabel: "Bad batch / BvB:",
    tileCombatText: "Fight a failed brew or challenge another player (Brewer vs Brewer).",
    section4Title: "⚔️ 4. Combat, bribes, and sabotage",
    section4ImageAlt: "Quick guide: bad batches, bribes, and sabotage",
    combatIntro:
      "In combat your Total Strength (die roll + equipment + items) is compared to the enemy's strength.",
    combatWinLabel: "Win:",
    combatWinYouGet: "You gain XP",
    combatWinPant: "cans",
    combatWinAndTreasure: "and treasure",
    combatLossLabel: "Loss:",
    combatLossYouLose: "You lose HP",
    combatLossAndSips: "and drink penalty sips",
    combatLossSipXpNote: "(which in turn grant XP).",
    combatCritLabel: "Critical fail:",
    combatCritBeforeDie: "A 1 on the die",
    combatCritAfterDie: "is always a loss.",
    combatInteractLabel: "Interaction:",
    combatInteractText:
      "Other players can often affect fights by helping or sabotaging, sometimes for a can payment.",
    section5Title: "🏆 5. Winning conditions",
    section5ImageAlt: "Quick guide: levels, the boss, and victory",
    section5Intro: "When a player reaches the highest level the endgame begins. The game can be won two ways:",
    winMasterLabel: "Master brewer:",
    winMasterText: "Defeat the final boss (who has 3 lives) before everyone else.",
    winLastLabel: "Last sip standing:",
    winLastText:
      "If all other players lose their HP or give up, the last remaining brewer wins.",
  },
  tutorial: {
    header: "Quick guide",
    logoAlt: "Master of the Brewmasters",
    back: "Back",
    skip: "Skip",
    next: "Next",
    start: "Let's go",
    step1Title: "Welcome to Master of the Brewmasters!",
    step1SaveBatches: "Save the bad batches",
    step1SaveBatchesRest:
      "to collect XP and climb levels — first to defeat the final boss on the last level wins!",
    step1Sabotage: "Sabotage or cooperate with your rivals along the way",
    step2Title: "Roll and choose your path",
    step2Move:
      "At the start of your turn you either roll the movement die and move as many tiles as it shows in your chosen direction, or",
    step2Recycle: "Recycle cans",
    step2RecycleRest: "(requires at least 5 cans) — you stay put and shop instead of moving.",
    step2Items: "You can also play items from your hand to gear up.",
    step3Title: "Resolve the tile",
    step3Event: "Event: Random events that can help or ruin your day.",
    step3Treasure: "Treasure: Find new equipment and items.",
    step3Rest: "Rest: Recover and regain 3 HP.",
    step3Combat: "Bad batch: Get ready for combat!",
    step3Bvb: "BvB: Brewer vs brewer, one round. The winner chooses loot from the loser.",
    step4Title: "Bad batches, bribes, and sabotage",
    step4Strength:
      "Strength check: Your die roll + equipment & items must equal or exceed the enemy's strength.",
    step4Win: "Win:",
    step4WinPantWord: "Deposit",
    step4WinTreasureWord: "Treasure",
    step4WinXpWord: "XP",
    step4Loss: "Loss:",
    step4LossHpWord: "HP",
    step4LossSipsWord: "sips.",
    step4Crit: "Critical fail: A 1 on the die is always a loss!",
    step4Social:
      "Social play: Other players can help or sabotage. You can ask for help for payment (Deposit/Treasure) — they can accept or decline.",
    step5Title: "Levels, the Boss, and Victory",
    step5XpYouGet: "You gain",
    step5XpFromSips: "XP from sips and",
    step5XpFromMonsters: "monster victories.",
    step5Boss: "Final boss: Defeat the boss on the last level to win the game. The boss is tough and has 3 lives.",
    step5LastStanding: "Last standing: If everyone else is out, you win the game.",
    step5ElimBeforeHp: "Elimination: If your",
    step5ElimAfterHp:
      "HP reaches zero you're out of the game. You can restart from the beginning or give up.",
  },
  catalog: {
    title: "Card catalog",
    filterActive: "Showing beer reference",
    filterInactive: "Beer reference only",
    homeLink: "To home page",
    introBeerRefBefore: "Showing",
    introBeerRefAfter:
      "cards and monsters with a registered beer reference (label under the image). Equipment has no beer references in the catalog.",
    introFullBeforeCards: "Overview: cards from",
    introFullCardsFile: "cards.json",
    introFullBeforeEquip: ", equipment from",
    introFullEquipFile: "equipmentDefs.ts",
    introFullBeforeMonsters: ", monsters from",
    introFullMonstersFile: "monsters.ts",
    introFullTail: "split into",
    introFullAnd: "and",
    introFullVanliga: "regular",
    introFullLagstrid: "team battle",
    introFullBossar: "final bosses",
    kindEvent: "Event",
    kindItem: "Item",
    kindCombat: "Combat / system",
    kindTreasure: "Treasure",
    kindRest: "Rest",
    kindEmpty: "Empty",
    positive: "Positive",
    negative: "Negative",
    equipmentTitle: "Equipment",
    equipmentIntro:
      "Shop catalog / loot pool. Image = unique art when available, otherwise slot silhouette.",
    monsterSoloTitle: "Monsters — regular (solo)",
    monsterSoloSubtitle: "No team battle, not a final boss.",
    monsterTeamTitle: "Monsters — team battle",
    monsterTeamSubtitle: "Requires a teammate; the attacker chooses who fights alongside.",
    monsterBossTitle: "Monsters — final bosses",
    monsterBossSubtitle: (bossIds: string) =>
      `One is randomized per game (${bossIds}). Individual combat.`,
    badgeTeam: "Team",
    badgeBoss: "Boss",
    emptyCategory: "No entries in this category.",
    strength: (n: number) => `Strength ${n}`,
    teamBattleBonus: (gold: number) => ` · +${formatCanAmount(gold)}/teammate on team win`,
    flavourAndRules: "Flavour & rules",
    flavour: "Flavour",
    cardText: "Card text",
    rules: "Rules",
    depositPrice: (slot: string, price: number) => `${slot} · ${formatCanAmount(price)}`,
  },
  seo: {
    homeTitle: "Master of the Brewmasters – Bryggverket edition",
    homeDescription:
      "Play Master of the Brewmasters online: big screen as the board, phone as your controller. Beer-themed battles, cans, and sips. The Bryggverket edition from Umeå.",
    rulesTitle: "Game rules — Master of the Brewmasters",
    rulesDescription:
      "Read the rules for Master of the Brewmasters: turns, movement, combat, cans, equipment, and how to play with a big screen and phones.",
    cardsTitle: "Card catalog — Master of the Brewmasters",
    cardsDescription:
      "Browse the Master of the Brewmasters card catalog: event cards, monsters, equipment, and beer references in the Bryggverket edition.",
    privateTitle: "Master of the Brewmasters – Bryggverket edition",
    privateDescription: "Web-based board game — Bryggverket edition.",
    ogImageAlt:
      "Master of the Brewmasters – Bryggverket edition. Big screen as the board, phone as your controller.",
    breadcrumbHome: "Home",
  },
  app: {
    loading: "Loading…",
    loginTitle: "Log in",
    loginReadingStatus: "Reading login status…",
    loginLoggedInPrefix: "Logged in as",
    loginLoggedInTier: (tier: string) => `Tier: ${tier}`,
    loginLogout: "Log out",
    loginLead: "Log in as host with OTP or Google.",
    loginEmailPlaceholder: "Email",
    loginCodePlaceholder: "Code (dev: 123456)",
    loginSendCode: "Send code",
    loginVerifyCode: "Verify code",
    loginGoogle: "Continue with Google",
    loginCodeSent: "Code sent. Check email/logs and verify.",
    loginHomeLink: "To home page",
    loginErrorReadStatus: "Could not read login status.",
    loginErrorReachServer: "Could not reach auth server.",
    loginErrorInvalidEmail: "Enter a valid email address.",
    loginErrorSendCode: "Could not send one-time code.",
    loginErrorMissingFields: "Enter both email and code.",
    loginErrorBadCode: "Wrong or expired code.",
    loginErrorVerify: "Could not verify code.",
    loginErrorLogout: "Could not log out.",
  },
  festDashboard: {
    title: "Party dashboard",
    homeLink: "← Home",
    lead: "Add lobby codes from your TV screens to follow all ongoing matches in real time. Connects as a spectator without affecting the game.",
    codePlaceholder: "LOBBY CODE",
    addRoom: "Track lobby",
    removeRoom: "Remove",
    emptyRooms: "No lobby codes yet — add the code shown on the table.",
    noPlayersYet: "No players in the lobby yet (or wrong code).",
    roomAria: (code: string) => `Lobby ${code}`,
    summaryAria: "Summary all tables",
    summaryRooms: "Live tables",
    summaryPlayers: "Active players",
    summaryMonsterWins: "Monster wins",
    summaryBvbWins: "PvP wins",
    summaryKlunks: "Sips total",
    colPlayer: "Player",
    colHp: "HP",
    colPant: "Deposit",
    colKlunk: "Sips",
    colBrewer: "Brew level",
    colFloor: "Floor",
    colMonster: "Monster W/L",
    colBvb: "PvP W/L",
    colSabotage: "Sabotage",
    colBestRoll: "Best roll",
    activeTurn: "turn",
    eliminated: "out",
    left: "left",
    bossLives: (n: number) => `boss ${n} lives`,
    highlightsAria: "Party highlights",
    highlightMostWins: "Most wins",
    highlightMostPant: "Most deposit",
    highlightMostLosses: "Most losses",
    highlightMostBvb: "Most PvP",
    highlightMostKlunks: "Most sips",
    highlightMostSabotage: "Most sabotage",
    highlightMostXp: "Most XP",
    highlightLeastHp: "Lowest HP",
    highlightBestRoll: "Best roll",
    highlightMostOnes: "Most ones",
  },
  statsDashboard: {
    title: "Statistics",
    lead: "History of starts and players per period. Live counts are secondary. The page is password-protected.",
    homeLink: "← Home",
    tokenAria: "Password",
    tokenLabel: "Password",
    tokenPlaceholder: "Password",
    tokenSave: "Unlock",
    tokenHint: "Enter the stats page password. It is kept only in this tab until you clear it or close the tab.",
    rangeAria: "Time range",
    range7d: "7 days",
    range30d: "30 days",
    rangeWeek: "This week",
    rangeMonth: "This month",
    rangeMeta: "Range",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    clearToken: "Lock",
    errorUnauthorized: "Wrong password.",
    errorLoad: "Could not load statistics.",
    errorReachServer: "Could not reach the server.",
    liveAria: "Right now",
    liveTitle: "Right now",
    liveRooms: "Rooms",
    livePlaying: "Playing",
    livePlayers: "Players in match",
    historyAria: "History",
    historyTitle: "History",
    gamesStarted: "Starts",
    gamesEnded: "Completed",
    gamesAbandoned: "Abandoned",
    playerParticipations: "Player participations",
    uniquePlayerNames: "Unique names",
    uniquePlayerNamesNote: "Estimate via normalized display names — not accounts.",
    averageDuration: "Avg duration",
    averageDurationEmpty: "—",
  },
};
