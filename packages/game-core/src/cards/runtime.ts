import type { CardDef, EffectApplyOut } from "./types.js";
import { applyEffects } from "./effects.js";
import { getCard } from "./db.js";
import { appendTextForGrantedItem, artKeyForGrantedItem } from "./grantedItemText.js";
import { pushSipNotice } from "../sipNotice.js";
import { formatSelfStatDeltas, formatTargetStatDeltas } from "../statDeltaText.js";
import type { CombatLoseSummary, CombatWinSummary, GameState, Pending, Player } from "../types.js";
import { combatReactorsFor } from "../combatReactors.js";
import {
  finalBossCardTagline,
  isFinalBossMonsterId,
  monsterNeedBonusForBoardLevel,
  MONSTERS,
  type MonsterDef,
  type MonsterId,
} from "../monsters.js";

export type LogFn = (state: GameState, message: string) => void;
export type ShowCardFn = (state: GameState, params: {
  playerId: string;
  kind: "event" | "combat" | "rest" | "treasure" | "empty";
  cardId: string;
  title: string;
  text: string;
  artKey?: string;
  grantedItemId?: string;
  choices?: Array<{ id: string; label: string }>;
  combatWin?: CombatWinSummary;
  combatLoss?: CombatLoseSummary;
}) => void;

/** Endast specialregler — standard styrka/vinst/förlust visas i UI med ikoner. */
function formatMonsterText(m: { rulesText: string }): string {
  return m.rulesText.trim();
}

function pickMonsterForLevel(rng: () => number, levelIndex: number): MonsterDef {
  const team = MONSTERS.filter((m) => m.teamBattleRequired && !isFinalBossMonsterId(m.id));
  const normal = MONSTERS.filter((m) => !m.teamBattleRequired && !isFinalBossMonsterId(m.id));
  const teamChance = levelIndex <= 0 ? 0.08 : levelIndex === 1 ? 0.18 : 0.28;
  if (team.length > 0 && rng() < teamChance) {
    return team[Math.floor(rng() * team.length)]!;
  }
  return normal[Math.floor(rng() * normal.length)]!;
}

/** Slutboss-ruta: använder {@link GameState.finalBossMonsterId}; alltid individuell strid (ingen team battle). */
export function createFinalBossCombatPending(
  state: GameState,
  attacker: Player,
): Extract<Pending, { type: "combat" }> | null {
  const id = state.finalBossMonsterId;
  if (!id) return null;
  const monster = MONSTERS.find((m) => m.id === id);
  if (!monster) return null;
  const soloMonster: MonsterDef = { ...monster, teamBattleRequired: false, teamBattleBonusGold: 0 };
  const base = createMonsterCombatPending(state, attacker, soloMonster);
  const tag = finalBossCardTagline(id);
  return {
    ...base,
    enemyIntroText: tag ?? base.enemyIntroText,
  };
}

export function createMonsterCombatPending(
  state: GameState,
  attacker: Player,
  monster: MonsterDef,
): Extract<Pending, { type: "combat" }> {
  const teamBattleRequired = !!monster.teamBattleRequired;
  const reactors = teamBattleRequired ? [] : combatReactorsFor(state, attacker.id);
  return {
    type: "combat",
    attackerId: attacker.id,
    levelIndex: attacker.levelIndex,
    tileIndex: attacker.tileIndex,
    monsterId: monster.id,
    enemyName: monster.name,
    need: monster.strength + monsterNeedBonusForBoardLevel(attacker.levelIndex),
    needMod: 0,
    baseDamage: monster.baseDamage,
    lossSipsOnLose: monster.lossSipsOnLose,
    phase: teamBattleRequired ? "chooseTeammate" : "enemyIntro",
    attackMods: {},
    teamBattleRequired,
    teamBattleBonusGold: monster.teamBattleBonusGold ?? 0,
    rewardGold: monster.rewardGold,
    rewardItems: monster.rewardItems,
    reactors,
    reacted: {},
    enemyArtKey: monster.artKey,
    enemyIntroText: formatMonsterText(monster),
  };
}

/**
 * Vanliga monster: går direkt till strid med intro i state (UI visar fiende + tärning).
 * Sip Snatcher: kortmodal med val — ta sip (ingen strid) eller slåss.
 */
export function enterMonsterCombatFromTile(
  state: GameState,
  player: Player,
  rng: () => number,
  log: LogFn,
  showCard: ShowCardFn,
): void {
  const monster = pickMonsterForLevel(rng, player.levelIndex);
  log(state, `${player.name} stöter på: ${monster.name}.`);
  if (monster.id === "belgisk_munk") {
    showCard(state, {
      playerId: player.id,
      kind: "combat",
      cardId: `monster:${monster.id}`,
      title: monster.name,
      text: formatMonsterText(monster),
      artKey: monster.artKey,
      choices: [
        { id: "sip_leave", label: "Ta en klunk (den försvinner)" },
        { id: "fight", label: "Slåss" },
      ],
    });
    return;
  }

  state.pending = createMonsterCombatPending(state, player, monster);
  log(state, `${player.name} möter ${monster.name}.`);
}

/** @deprecated Använd enterMonsterCombatFromTile */
export function presentMonsterCard(
  state: GameState,
  player: Player,
  rng: () => number,
  log: LogFn,
  showCard: ShowCardFn,
): void {
  enterMonsterCombatFromTile(state, player, rng, log, showCard);
}

export function resolveEventCardOnLand(params: {
  state: GameState;
  player: Player;
  card: CardDef;
  rng: () => number;
  log: LogFn;
  showCard: ShowCardFn;
}): void {
  const { state, player: p, card, rng, log, showCard } = params;

  const beforeHp = p.hp;
  const beforeGold = p.gold;
  const beforeKlunk = p.klunkar;

  // Special: affects everyone
  if (card.id === "event_apocalypse") {
    for (const pl of state.players) {
      pl.klunkar += 1;
      pushSipNotice(state, pl.id, `${p.name} (Apocalypse)`);
    }
    log(state, `Händelse: ${card.title}`);
    showCard(state, { playerId: p.id, kind: "event", cardId: card.id, title: card.title, text: card.text, artKey: card.artKey });
    return;
  }
  if (card.id === "event_round_on_me") {
    for (const pl of state.players) pl.hp = Math.min(pl.maxHp, pl.hp + 1);
    log(state, `Händelse: ${card.title}`);
    showCard(state, { playerId: p.id, kind: "event", cardId: card.id, title: card.title, text: card.text, artKey: card.artKey });
    return;
  }
  if (card.id === "event_loser_wins") {
    p.klunkar += 2;
    let lowest = state.players[0]!;
    for (const pl of state.players) if (pl.hp < lowest.hp) lowest = pl;
    const beforeLow = lowest.hp;
    lowest.hp = Math.min(lowest.maxHp, lowest.hp + 2);
    log(state, `Händelse: ${card.title}`);
    const lowHpLine =
      beforeLow !== lowest.hp ? `\n${lowest.name}: HP ${beforeLow} → ${lowest.hp}.` : "";
    const yourSipsLine =
      beforeKlunk !== p.klunkar ? `\nDina klunkar: ${beforeKlunk} → ${p.klunkar}.` : "";
    showCard(state, {
      playerId: p.id,
      kind: "event",
      cardId: card.id,
      title: card.title,
      text: `${card.text}${lowHpLine}${yourSipsLine}`,
      artKey: card.artKey,
    });
    return;
  }

  // Special: needs a target player (dynamic choices)
  if (card.id === "event_gift_sip" || card.id === "event_friendly_offering") {
    const others = state.players.filter((x) => x.id !== p.id);
    const choices = others.map((x) => ({ id: x.id, label: x.name }));
    log(state, `Händelse: ${card.title} — ${p.name} måste välja.`);
    showCard(state, {
      playerId: p.id,
      kind: "event",
      cardId: card.id,
      title: card.title,
      text: card.text,
      artKey: card.artKey,
      choices,
    });
    return;
  }

  // Default: choice cards declared in JSON
  if (card.choices && card.choices.length > 0) {
    log(state, `Händelse: ${card.title} — ${p.name} måste välja.`);
    showCard(state, {
      playerId: p.id,
      kind: "event",
      cardId: card.id,
      title: card.title,
      text: card.text,
      artKey: card.artKey,
      choices: card.choices.map((c) => ({ id: c.id, label: c.label })),
    });
    return;
  }

  // Default: apply effects immediately
  const effectOut: EffectApplyOut = {};
  applyEffects({ state, player: p, effects: card.effects ?? [], rng, out: effectOut });
  log(state, `Händelse: ${card.title}`);
  showCard(state, {
    playerId: p.id,
    kind: "event",
    cardId: card.id,
    title: card.title,
    text:
      card.text +
      appendTextForGrantedItem(effectOut) +
      formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    artKey: artKeyForGrantedItem(effectOut, card.artKey) ?? card.artKey,
    grantedItemId: effectOut.grantedItemId,
  });
}

export function handleCardOption(params: {
  state: GameState;
  player: Player;
  pending: Extract<Pending, { type: "card" }>;
  choiceId: string;
  rng: () => number;
  log: LogFn;
}): {
  handled: boolean;
  error?: string;
  /** Stäng kortet och (i engine) avancera tur om spelet pågår */
  completeCard?: boolean;
  startCombat?: Extract<Pending, { type: "combat" }>;
} {
  const { state, player: p, pending, choiceId, rng, log } = params;

  if (pending.kind === "combat" && pending.cardId === "monster:belgisk_munk") {
    const monster = MONSTERS.find((m) => m.id === "belgisk_munk");
    if (!monster) return { handled: true, error: "Ogiltigt monster" };
    if (choiceId === "sip_leave") {
      p.klunkar += 1;
      pushSipNotice(state, p.id, monster.name);
      log(state, `${p.name} tar en klunk. ${monster.name} försvinner.`);
      return { handled: true, completeCard: true };
    }
    if (choiceId === "fight") {
      log(state, `${p.name} väljer att slåss mot ${monster.name}.`);
      return { handled: true, startCombat: createMonsterCombatPending(state, p, monster) };
    }
    return { handled: true, error: "Ogiltigt val" };
  }

  // Special target cards: choiceId is a playerId
  if (pending.kind === "event" && (pending.cardId === "event_gift_sip" || pending.cardId === "event_friendly_offering")) {
    const target = state.players.find((x) => x.id === choiceId);
    if (!target) return { handled: true, error: "Ogiltigt mål" };
    const beforeTargetHp = target.hp;
    const beforeTargetSips = target.klunkar;
    if (pending.cardId === "event_gift_sip") {
      target.klunkar += 1;
      pushSipNotice(state, target.id, p.name);
      log(state, `${p.name} ger en klunk till ${target.name}.`);
    } else {
      target.klunkar += 1;
      pushSipNotice(state, target.id, p.name);
      target.hp = Math.min(target.maxHp, target.hp + 2);
      log(state, `${p.name} bjuder ${target.name} på en vänlig klunk (+2 HP).`);
    }
    state.pending = {
      ...pending,
      choices: undefined,
      text:
        `${pending.text}\nValt: ${target.name}` +
        formatTargetStatDeltas(target.name, beforeTargetHp, target.hp, beforeTargetSips, target.klunkar),
    };
    return { handled: true };
  }

  const def = getCard(pending.cardId);
  const choice = def.choices?.find((c) => c.id === choiceId);
  if (!choice) return { handled: true, error: "Ogiltigt val" };

  const beforeHp = p.hp;
  const beforeGold = p.gold;
  const beforeKlunk = p.klunkar;
  const effectOut: EffectApplyOut = {};
  applyEffects({ state, player: p, effects: choice.effects ?? [], rng, out: effectOut });
  log(state, `${p.name} väljer: ${choice.label}.`);

  state.pending = {
    ...pending,
    choices: undefined,
    artKey: artKeyForGrantedItem(effectOut, pending.artKey) ?? pending.artKey,
    grantedItemId: effectOut.grantedItemId ?? pending.grantedItemId,
    text:
      `${def.text}\nVal: ${choice.label}` +
      appendTextForGrantedItem(effectOut) +
      formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
  };
  return { handled: true };
}

export function handleCardConfirm(params: {
  state: GameState;
  pending: Extract<Pending, { type: "card" }>;
  rng: () => number;
  log: LogFn;
}): { handled: boolean; startCombat?: Extract<Pending, { type: "combat" }> } {
  const { state, pending, rng, log } = params;

  if (pending.kind === "combat" && pending.cardId.startsWith("monster:")) {
    const monsterId = pending.cardId.slice("monster:".length) as MonsterId;
    const monster = MONSTERS.find((m) => m.id === monsterId);
    const attacker = state.players.find((x) => x.id === pending.playerId);
    if (!attacker || !monster) return { handled: true };

    log(state, `${attacker.name} möter ${monster.name}.`);
    return { handled: true, startCombat: createMonsterCombatPending(state, attacker, monster) };
  }

  if (pending.kind === "combat" && pending.cardId === "boss_round_win") {
    const attacker = state.players.find((x) => x.id === pending.playerId);
    if (!attacker) return { handled: true };
    const start = createFinalBossCombatPending(state, attacker);
    if (!start) return { handled: true };
    log(state, `${attacker.name} går in i nästa runda mot slutbossen.`);
    return { handled: true, startCombat: start };
  }

  return { handled: false };
}

