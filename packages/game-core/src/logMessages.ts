import { formatCanAmount } from "./canFormat.js";
import type { GameLocale } from "./locale.js";
import { DEFAULT_LOCALE } from "./locale.js";
import { getEquipmentDisplayByEquippedName } from "./equipmentLocale.js";
import type { GameState, LogEntry } from "./types.js";

/** Stable keys for structured game-log lines (engine + server). */
export const LOG_MESSAGE_KEYS = {
  lobbyCreated: "lobby.created",
  lobbyClosed: "lobby.closed",
  lobbySettingsSaved: "lobby.settingsSaved",
  lobbyPlayerJoined: "lobby.playerJoined",
  playingPlayerJoined: "playing.playerJoined",
  lobbyPlayerLeft: "lobby.playerLeft",
  lobbyPlayerLeftReason: "lobby.playerLeftReason",
  lobbyPlayerKicked: "lobby.playerKicked",
  lobbyReady: "lobby.ready",
  lobbyNotReady: "lobby.notReady",
  lobbyAvatarChanged: "lobby.avatarChanged",
  gameStarted: "game.started",
  gameFinalBossIntro: "game.finalBossIntro",
  turnRollDice: "turn.rollDice",
  turnChanged: "turn.changed",
  tileEmpty: "tile.empty",
  tileRestHeal: "tile.restHeal",
  tileTreasureAlreadyTaken: "tile.treasureAlreadyTaken",
  tileTreasureFound: "tile.treasureFound",
  tileMerchant: "tile.merchant",
  tileOldLevelDisabled: "tile.oldLevelDisabled",
  tileBossConfigError: "tile.bossConfigError",
  encounterOneOpponent: "encounter.oneOpponent",
  encounterMultiOpponent: "encounter.multiOpponent",
  pvpMatchResult: "pvp.matchResult",
  pvpDuelReady: "pvp.duelReady",
  playerInsurance: "player.insurance",
  playerGaveUp: "player.gaveUp",
  combatSkipEncounter: "combat.skipEncounter",
  combatReactionsOpen: "combat.reactionsOpen",
  combatChooseTeammate: "combat.chooseTeammate",
  combatNoAction: "combat.noAction",
  combatIntervene: "combat.intervene",
  combatHelpRequest: "combat.helpRequest",
  combatHelpCancelled: "combat.helpCancelled",
  combatHelpAsk: "combat.helpAsk",
  combatHelpDeclined: "combat.helpDeclined",
  playerTakePlastbackBottle: "player.takePlastbackBottle",
  playerSwapWeaponTomFlaskaFromPlastback: "player.swapWeaponTomFlaskaFromPlastback",
  itemGrantPenaltySip: "item.grantPenaltySip",
  pvpLootGold: "pvp.lootGold",
  pvpLootSip: "pvp.lootSip",
  pvpLootDamage: "pvp.lootDamage",
  itemVaskaSkip: "item.vaskaSkip",
  itemBribeSkip: "item.bribeSkip",
  combatWinRandomSip: "combat.winRandomSip",
  combatWeaponSipReduction: "combat.weaponSipReduction",
  playerCanmanGold: "player.canmanGold",
  playerWeaponWinGold: "player.weaponWinGold",
  itemSplitTheG: "item.splitTheG",
  itemRiggedGameSteal: "item.riggedGameSteal",
  itemRiggedGameStealReplace: "item.riggedGameStealReplace",
  itemShortcutTeleport: "item.shortcutTeleport",
} as const;

export type LogMessageKey = (typeof LOG_MESSAGE_KEYS)[keyof typeof LOG_MESSAGE_KEYS];

type LogTemplate = { sv: string; en: string };

const LOG_MESSAGE_TEMPLATES: Record<string, LogTemplate> = {
  [LOG_MESSAGE_KEYS.lobbyCreated]: {
    sv: "Ny lobby skapad ({roomCode}).",
    en: "New lobby created ({roomCode}).",
  },
  [LOG_MESSAGE_KEYS.lobbyClosed]: {
    sv: "Lobby stängdes ({reason}).",
    en: "Lobby closed ({reason}).",
  },
  [LOG_MESSAGE_KEYS.lobbySettingsSaved]: {
    sv: "Värden sparade lobbyinställningar.",
    en: "Host saved lobby settings.",
  },
  [LOG_MESSAGE_KEYS.lobbyPlayerJoined]: {
    sv: "{name} gick med i lobbyn.",
    en: "{name} joined the lobby.",
  },
  [LOG_MESSAGE_KEYS.playingPlayerJoined]: {
    sv: "{name} hoppade in i spelet.",
    en: "{name} joined the game mid-match.",
  },
  [LOG_MESSAGE_KEYS.lobbyPlayerLeft]: {
    sv: "{name} lämnade spelet.",
    en: "{name} left the game.",
  },
  [LOG_MESSAGE_KEYS.lobbyPlayerLeftReason]: {
    sv: "{name} lämnade spelet ({reason}).",
    en: "{name} left the game ({reason}).",
  },
  [LOG_MESSAGE_KEYS.lobbyPlayerKicked]: {
    sv: "{name} togs bort från spelet (bordet).",
    en: "{name} was removed from the game (table).",
  },
  [LOG_MESSAGE_KEYS.lobbyReady]: {
    sv: "{name} är redo.",
    en: "{name} is ready.",
  },
  [LOG_MESSAGE_KEYS.lobbyNotReady]: {
    sv: "{name} är inte redo.",
    en: "{name} is not ready.",
  },
  [LOG_MESSAGE_KEYS.lobbyAvatarChanged]: {
    sv: "{name} ändrade avatar och är inte redo.",
    en: "{name} changed avatar and is not ready.",
  },
  [LOG_MESSAGE_KEYS.gameStarted]: {
    sv: "— Bryggmästarnas Mästare börjar! (seed {seed}) —",
    en: "— Brewmasters' Master begins! (seed {seed}) —",
  },
  [LOG_MESSAGE_KEYS.gameFinalBossIntro]: {
    sv: "Slutboss {bossName} — {lives} liv, vinn {lives} {roundsWord}.",
    en: "Final boss {bossName} — {lives} lives, win {lives} {roundsWord}.",
  },
  [LOG_MESSAGE_KEYS.turnRollDice]: {
    sv: "{name}s tur. Slå tärningen.",
    en: "{name}'s turn. Roll the dice.",
  },
  [LOG_MESSAGE_KEYS.turnChanged]: {
    sv: "— {name}s tur —",
    en: "— {name}'s turn —",
  },
  [LOG_MESSAGE_KEYS.tileEmpty]: {
    sv: "{name} hamnar på en lugn ruta.",
    en: "{name} lands on a quiet tile.",
  },
  [LOG_MESSAGE_KEYS.tileRestHeal]: {
    sv: "{name} vilar på bryggeriet (+{heal} HP, max {maxHp}).",
    en: "{name} rests at the brewery (+{heal} HP, max {maxHp}).",
  },
  [LOG_MESSAGE_KEYS.tileTreasureAlreadyTaken]: {
    sv: "Gömman är redan plundrad.",
    en: "The stash has already been looted.",
  },
  [LOG_MESSAGE_KEYS.tileTreasureFound]: {
    sv: "{name} hittar skatt: +{gold} pant.",
    en: "{name} finds treasure: +{gold} cans.",
  },
  [LOG_MESSAGE_KEYS.tileMerchant]: {
    sv: "{name} kommer till Panta burkar.",
    en: "{name} arrives at Recycle Cans.",
  },
  [LOG_MESSAGE_KEYS.tileOldLevelDisabled]: {
    sv: "{name} hittar en gammal nivå-ruta men den är avstängd i detta läge.",
    en: "{name} finds an old level tile but it is disabled in this mode.",
  },
  [LOG_MESSAGE_KEYS.tileBossConfigError]: {
    sv: "{name} kan inte möta slutbossen (konfigurationsfel).",
    en: "{name} cannot face the final boss (configuration error).",
  },
  [LOG_MESSAGE_KEYS.encounterOneOpponent]: {
    sv: "{name} springer in i {opponents}. Välj BvB eller rutan.",
    en: "{name} runs into {opponents}. Choose PvP or the tile.",
  },
  [LOG_MESSAGE_KEYS.encounterMultiOpponent]: {
    sv: "{name} möter {opponents} på rutan. Välj BvB eller rutan.",
    en: "{name} meets {opponents} on the tile. Choose PvP or the tile.",
  },
  [LOG_MESSAGE_KEYS.pvpMatchResult]: {
    sv: "BvB: {a} ({ar}) vs {b} ({br}) — {winner} vinner!",
    en: "PvP: {a} ({ar}) vs {b} ({br}) — {winner} wins!",
  },
  [LOG_MESSAGE_KEYS.pvpDuelReady]: {
    sv: "Båda duellanterna är redo — slagrundan startar.",
    en: "Both duelists are ready — the round begins.",
  },
  [LOG_MESSAGE_KEYS.playerInsurance]: {
    sv: "{name} använder Livförsäkring och betalar {cost} pant för att fortsätta med fullt liv.",
    en: "{name} uses Life Insurance and pays {cost} cans to continue at full health.",
  },
  [LOG_MESSAGE_KEYS.playerGaveUp]: {
    sv: "{name} ger upp och lämnar bryggeriet.",
    en: "{name} gives up and leaves the brewery.",
  },
  [LOG_MESSAGE_KEYS.combatSkipEncounter]: {
    sv: "{name} undviker batchmötet ({enemyName}) — ingen XP, ingen loot (−{cost} pant).",
    en: "{name} avoids the batch encounter ({enemyName}) — no XP, no loot (−{cost} cans).",
  },
  [LOG_MESSAGE_KEYS.combatReactionsOpen]: {
    sv: "Strid: andra kan spela föremål innan slaget.",
    en: "Combat: others may play items before the roll.",
  },
  [LOG_MESSAGE_KEYS.combatChooseTeammate]: {
    sv: "{attacker} väljer {teammate} som medkämpe i lagstrid.",
    en: "{attacker} picks {teammate} as teammate in team battle.",
  },
  [LOG_MESSAGE_KEYS.combatNoAction]: {
    sv: "{name} gör inget.",
    en: "{name} does nothing.",
  },
  [LOG_MESSAGE_KEYS.combatIntervene]: {
    sv: "{name} ingriper.",
    en: "{name} intervenes.",
  },
  [LOG_MESSAGE_KEYS.combatHelpRequest]: {
    sv: "{name} ber om hjälp.",
    en: "{name} asks for help.",
  },
  [LOG_MESSAGE_KEYS.combatHelpCancelled]: {
    sv: "{name} avbröt hjälpbegäran.",
    en: "{name} cancelled the help request.",
  },
  [LOG_MESSAGE_KEYS.combatHelpAsk]: {
    sv: "{attacker} frågar {helper} om hjälp.",
    en: "{attacker} asks {helper} for help.",
  },
  [LOG_MESSAGE_KEYS.combatHelpDeclined]: {
    sv: "{name} avböjer att hjälpa till.",
    en: "{name} declines to help.",
  },
  [LOG_MESSAGE_KEYS.playerTakePlastbackBottle]: {
    sv: "{name} tar en flaska ur Plastback.",
    en: "{name} takes a bottle from the Crate.",
  },
  [LOG_MESSAGE_KEYS.playerSwapWeaponTomFlaskaFromPlastback]: {
    sv: "{name} byter ut vapen mot Tom flaska från Plastback.",
    en: "{name} swaps weapon for Empty Bottle from the Crate.",
  },
  [LOG_MESSAGE_KEYS.itemGrantPenaltySip]: {
    sv: "{giver} ger {target} en straffklunk (+1 klunk).",
    en: "{giver} gives {target} a penalty sip (+1 sip).",
  },
  [LOG_MESSAGE_KEYS.pvpLootGold]: {
    sv: "{winner} tar {amount} pant från {loser}.",
    en: "{winner} takes {amount} from {loser}.",
  },
  [LOG_MESSAGE_KEYS.pvpLootSip]: {
    sv: "{winner} ger {loser} en straffklunk (+1 klunk).",
    en: "{winner} gives {loser} a penalty sip (+1 sip).",
  },
  [LOG_MESSAGE_KEYS.pvpLootDamage]: {
    sv: "{winner} ger {loser} 2 skada i PvP (HP {beforeHp} → {afterHp}).",
    en: "{winner} deals 2 damage to {loser} in PvP (HP {beforeHp} → {afterHp}).",
  },
  [LOG_MESSAGE_KEYS.itemVaskaSkip]: {
    sv: "{name} spelar Vaska och skippar den dåliga batchen.",
    en: "{name} plays Sink It and skips the bad batch.",
  },
  [LOG_MESSAGE_KEYS.itemBribeSkip]: {
    sv: "{name} mutar sig ur batchmötet ({enemyName}) och betalar {cost} pant.",
    en: "{name} bribed out of the batch encounter ({enemyName}) and paid {cost}.",
  },
  [LOG_MESSAGE_KEYS.combatWinRandomSip]: {
    sv: "{recipient} får straffklunk ({winner} vann mot {enemyName}).",
    en: "{recipient} gets a penalty sip ({winner} won against {enemyName}).",
  },
  [LOG_MESSAGE_KEYS.combatWeaponSipReduction]: {
    sv: "{name}s {weaponName} mildrar straffklunken vid förlust (−{reduction}).",
    en: "{name}'s {weaponName} reduces penalty sips on loss (−{reduction}).",
  },
  [LOG_MESSAGE_KEYS.playerCanmanGold]: {
    sv: "{name} får +{amount} pant från Canman.",
    en: "{name} gains +{amount} from Canman.",
  },
  [LOG_MESSAGE_KEYS.playerWeaponWinGold]: {
    sv: "{name} får +{amount} pant från {weaponName} efter vinsten.",
    en: "{name} gains +{amount} from {weaponName} after the win.",
  },
  [LOG_MESSAGE_KEYS.itemSplitTheG]: {
    sv: "{user} spelar Split the G och tar {amount} pant från {target}.",
    en: "{user} plays Split the G and takes {amount} from {target}.",
  },
  [LOG_MESSAGE_KEYS.itemRiggedGameSteal]: {
    sv: "{user} spelar Riggat spel och tar {pieceName} ({slot}) från {target} (−{cost} pant).",
    en: "{user} plays Rigged game and takes {pieceName} ({slot}) from {target} (−{cost}).",
  },
  [LOG_MESSAGE_KEYS.itemRiggedGameStealReplace]: {
    sv: "{user} spelar Riggat spel och rycker {pieceName} ({slot}) från {target} — välj om du tar emot den (du har redan något där, −{cost} pant).",
    en: "{user} plays Rigged game and snatches {pieceName} ({slot}) from {target} — choose whether to take it (you already have something there, −{cost}).",
  },
  [LOG_MESSAGE_KEYS.itemShortcutTeleport]: {
    sv: "{user} använder Genväg och betalar {cost} pant för att teleportera till {target}.",
    en: "{user} uses Shortcut and pays {cost} to teleport to {target}.",
  },
};

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

function localizeLogWeaponName(name: string, locale: GameLocale): string {
  if (locale === "sv") return name;
  if (name === "vapen" || name === "vapnet") return "the weapon";
  return getEquipmentDisplayByEquippedName(name, locale)?.name ?? name;
}

const EN_CAN_AMOUNT_LOG_KEYS = new Set<string>([
  LOG_MESSAGE_KEYS.pvpLootGold,
  LOG_MESSAGE_KEYS.playerCanmanGold,
  LOG_MESSAGE_KEYS.playerWeaponWinGold,
  LOG_MESSAGE_KEYS.itemSplitTheG,
]);

const EN_CAN_COST_LOG_KEYS = new Set<string>([
  LOG_MESSAGE_KEYS.itemRiggedGameSteal,
  LOG_MESSAGE_KEYS.itemRiggedGameStealReplace,
  LOG_MESSAGE_KEYS.itemBribeSkip,
  LOG_MESSAGE_KEYS.itemShortcutTeleport,
]);

export function formatLogEntry(entry: LogEntry, locale: GameLocale = DEFAULT_LOCALE): string {
  if (!entry.key) return entry.message;
  const templates = LOG_MESSAGE_TEMPLATES[entry.key];
  if (!templates) return entry.message;
  const template = locale === "en" ? templates.en : templates.sv;
  const params = { ...(entry.params ?? {}) };
  if (entry.key === LOG_MESSAGE_KEYS.gameFinalBossIntro && params.lives != null) {
    const lives = Number(params.lives);
    params.roundsWord =
      locale === "en" ? finalBossRoundsWordEn(lives) : finalBossRoundsWordSv(lives);
  }
  if (
    locale === "en" &&
    (entry.key === LOG_MESSAGE_KEYS.combatWeaponSipReduction ||
      entry.key === LOG_MESSAGE_KEYS.playerWeaponWinGold) &&
    params.weaponName != null
  ) {
    params.weaponName = localizeLogWeaponName(String(params.weaponName), locale);
  }
  if (
    locale === "en" &&
    (entry.key === LOG_MESSAGE_KEYS.itemRiggedGameSteal ||
      entry.key === LOG_MESSAGE_KEYS.itemRiggedGameStealReplace) &&
    params.pieceName != null
  ) {
    params.pieceName = localizeLogWeaponName(String(params.pieceName), locale);
  }
  if (locale === "en" && entry.key && EN_CAN_AMOUNT_LOG_KEYS.has(entry.key) && params.amount != null) {
    params.amount = formatCanAmount(Number(params.amount));
  }
  if (locale === "en" && entry.key && EN_CAN_COST_LOG_KEYS.has(entry.key) && params.cost != null) {
    params.cost = formatCanAmount(Number(params.cost));
  }
  return interpolate(template, params);
}

export function pushLogEntry(
  state: GameState,
  entry: { message: string; key?: string; params?: Record<string, string | number> },
): void {
  if (state.logSeq == null) state.logSeq = state.log.length;
  state.logSeq += 1;
  const row: LogEntry = { at: Date.now(), message: entry.message };
  if (entry.key) row.key = entry.key;
  if (entry.params) row.params = entry.params;
  state.log.push(row);
  if (state.log.length > 200) state.log.shift();
}

/** Swedish rounds word for final-boss intro log. */
export function finalBossRoundsWordSv(lives: number): string {
  return lives === 1 ? "runda" : "rundor";
}

export function finalBossRoundsWordEn(lives: number): string {
  return lives === 1 ? "round" : "rounds";
}
