import type { CardDef, EffectApplyOut } from "./types.js";
import { applyEffects } from "./effects.js";
import { getCard } from "./db.js";
import { appendTextForGrantedItem, artKeyForGrantedItem } from "./grantedItemText.js";
import { mergePenaltySipQueue, pushSipNotice } from "../sipNotice.js";
import { formatSelfStatDeltas, formatTargetStatDeltas } from "../statDeltaText.js";
import type {
  CombatLoseSummary,
  CombatWinSummary,
  EquipmentSlot,
  GameState,
  Pending,
  PenaltySipQueueEntry,
  Player,
} from "../types.js";
import { grantKlunkWithXp } from "../klunkGrant.js";
import { recordPantSpent } from "../sessionStats.js";
import { beginCombatReactionsPhase } from "../combatReactionAutopass.js";
import { combatReactorsFor } from "../combatReactors.js";
import { rollDie } from "../rng.js";
import {
  finalBossCardTagline,
  isStandardMonsterId,
  monsterNeedBonusForBoardLevel,
  MONSTERS,
  monstersEligibleForRandomEncounter,
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
  equipmentReplaceOffer?: { slot: EquipmentSlot; catalogId?: string; newName: string };
  queuedPenaltySipNotices?: PenaltySipQueueEntry[];
}) => void;

function penaltySipEntriesForKlunks(recipientId: string, klunkDelta: number | undefined, fromPlayerName: string): PenaltySipQueueEntry[] {
  const n = klunkDelta ?? 0;
  if (n <= 0) return [];
  return [{ recipientId, klunkCount: n, fromPlayerName }];
}

/** Endast specialregler — standard styrka/vinst/förlust visas i UI med ikoner. */
function formatMonsterText(m: { rulesText: string }): string {
  return m.rulesText.trim();
}

function pickMonsterForLevel(rng: () => number, levelIndex: number): MonsterDef {
  const { team, normal } = monstersEligibleForRandomEncounter(levelIndex);
  const teamChance = levelIndex <= 0 ? 0.04 : levelIndex === 1 ? 0.09 : 0.14;
  if (team.length > 0 && rng() < teamChance) {
    return team[Math.floor(rng() * team.length)]!;
  }
  return normal[Math.floor(rng() * normal.length)]!;
}

function startLevelDifficultyNeedMod(
  difficulty: "lattol" | "folkol" | "starkol" | "imperial",
  levelIndex: number,
): number {
  if (levelIndex !== 0) return 0;
  switch (difficulty) {
    case "lattol":
      return -1;
    case "starkol":
      return 1;
    case "imperial":
      return 2;
    case "folkol":
    default:
      return 0;
  }
}

/** Slutboss-ruta: använder {@link GameState.finalBossMonsterId}; alltid individuell strid (ingen team battle). */
export function createFinalBossCombatPending(
  state: GameState,
  attacker: Player,
  opts?: { skipEnemyIntro?: boolean; log?: LogFn },
): Extract<Pending, { type: "combat" }> | null {
  const id = state.finalBossMonsterId;
  if (!id) return null;
  const monster = MONSTERS.find((m) => m.id === id);
  if (!monster) return null;
  const soloMonster: MonsterDef = { ...monster, teamBattleRequired: false, teamBattleBonusGold: 0 };
  const base = createMonsterCombatPending(state, attacker, soloMonster);
  const tag = finalBossCardTagline(id);
  const pending: Extract<Pending, { type: "combat" }> = {
    ...base,
    enemyIntroText: tag ?? base.enemyIntroText,
  };
  if (opts?.skipEnemyIntro) {
    beginCombatReactionsPhase(state, pending);
    if (opts.log && (pending.reactors?.length ?? 0) > 0) {
      opts.log(state, `Strid: andra kan spela föremål innan slaget.`);
    }
  }
  return pending;
}

/** Samma styrka/skada/vinst som {@link createMonsterCombatPending} — för monsterkort-modal (t.ex. Demonkrigare). */
export function monsterEncounterCardPreviewFromState(
  state: GameState,
  attacker: Player,
  monster: MonsterDef,
): {
  need: number;
  baseDamage: number;
  rewardGold: number;
  rewardItems: number;
  rewardXp: number;
} {
  const difficultyMod = startLevelDifficultyNeedMod(state.config.difficulty, attacker.levelIndex);
  const need = monster.strength + monsterNeedBonusForBoardLevel(attacker.levelIndex) + difficultyMod;
  const floorXpMultiplier = 1 + Math.max(0, attacker.levelIndex) * 0.5;
  const rewardXp = Math.max(1, Math.round(monster.rewardXp * floorXpMultiplier));
  const baseDamage =
    monster.baseDamage + (isStandardMonsterId(monster.id) ? monsterNeedBonusForBoardLevel(attacker.levelIndex) : 0);
  return {
    need,
    baseDamage,
    rewardGold: monster.rewardGold,
    rewardItems: monster.rewardItems,
    rewardXp,
  };
}

export function createMonsterCombatPending(
  state: GameState,
  attacker: Player,
  monster: MonsterDef,
): Extract<Pending, { type: "combat" }> {
  const teamBattleRequired = !!monster.teamBattleRequired;
  const reactors = teamBattleRequired ? [] : combatReactorsFor(state, attacker.id);
  const preview = monsterEncounterCardPreviewFromState(state, attacker, monster);
  return {
    type: "combat",
    attackerId: attacker.id,
    levelIndex: attacker.levelIndex,
    tileIndex: attacker.tileIndex,
    monsterId: monster.id,
    enemyName: monster.name,
    need: preview.need,
    needMod: 0,
    baseDamage: preview.baseDamage,
    lossSipsOnLose: monster.lossSipsOnLose,
    phase: teamBattleRequired ? "chooseTeammate" : "enemyIntro",
    attackMods: {},
    teamBattleRequired,
    teamBattleBonusGold: monster.teamBattleBonusGold ?? 0,
    rewardGold: preview.rewardGold,
    rewardItems: preview.rewardItems,
    rewardXp: preview.rewardXp,
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
        { id: "sip_leave", label: "Ta en klunk och betala 5 pant (den försvinner)" },
        { id: "fight", label: "Slåss" },
      ],
    });
    return;
  }
  if (monster.id === "demonkrigare") {
    if (player.gold >= 10) {
      showCard(state, {
        playerId: player.id,
        kind: "combat",
        cardId: `monster:${monster.id}`,
        title: monster.name,
        text: formatMonsterText(monster),
        artKey: monster.artKey,
        choices: [
          { id: "pay_skip", label: "Betala 10 pant och undvik striden" },
          { id: "fight", label: "Slåss" },
        ],
      });
      return;
    }
    state.pending = createMonsterCombatPending(state, player, monster);
    log(state, `${player.name} möter ${monster.name}.`);
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
  if (card.id === "event_baksmallebonus") {
    const healed = p.klunkar >= 5 ? 3 : 1;
    p.hp = Math.min(p.maxHp, p.hp + healed);
    log(state, `Händelse: ${card.title}`);
    showCard(state, {
      playerId: p.id,
      kind: "event",
      cardId: card.id,
      title: card.title,
      text: `${card.text}${formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar)}`,
      artKey: card.artKey,
    });
    return;
  }
  if (card.id === "event_burkbonanza") {
    const gained = Math.max(0, Math.min(15, p.klunkar));
    p.gold += gained;
    log(state, `Händelse: ${card.title}`);
    showCard(state, {
      playerId: p.id,
      kind: "event",
      cardId: card.id,
      title: card.title,
      text: `${card.text}${formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar)}`,
      artKey: card.artKey,
    });
    return;
  }
  if (card.id === "event_apocalypse") {
    for (const pl of state.players) {
      grantKlunkWithXp(state, pl, 1, { penaltyStraff: true });
    }
    log(state, `Händelse: ${card.title}`);
    const from = `${p.name} (${card.title})`;
    showCard(state, {
      playerId: p.id,
      kind: "event",
      cardId: card.id,
      title: card.title,
      text: card.text,
      artKey: card.artKey,
      queuedPenaltySipNotices: state.players.map((pl) => ({
        recipientId: pl.id,
        klunkCount: 1,
        fromPlayerName: from,
      })),
    });
    return;
  }
  if (card.id === "event_round_on_me") {
    for (const pl of state.players) pl.hp = Math.min(pl.maxHp, pl.hp + 1);
    const others = state.players.filter((x) => x.id !== p.id);
    for (const other of others) other.gold += 1;
    p.gold = Math.max(0, p.gold - others.length);
    log(state, `Händelse: ${card.title}`);
    showCard(state, {
      playerId: p.id,
      kind: "event",
      cardId: card.id,
      title: card.title,
      text: `${card.text}${formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar)}`,
      artKey: card.artKey,
    });
    return;
  }
  if (card.id === "event_loser_wins") {
    grantKlunkWithXp(state, p, 2, { penaltyStraff: true });
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
      queuedPenaltySipNotices: penaltySipEntriesForKlunks(p.id, p.klunkar - beforeKlunk, card.title),
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
  if (card.id === "event_syndabock") {
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
  applyEffects({ state, player: p, effects: card.effects ?? [], rng, out: effectOut, ignoreArmorOnDamage: true });
  const grantedText = appendTextForGrantedItem(effectOut);
  const shouldReplaceBodyWithGrantedText = card.id === "event_find_item_random" && grantedText.length > 0;
  log(state, `Händelse: ${card.title}`);
  showCard(state, {
    playerId: p.id,
    kind: "event",
    cardId: card.id,
    title: card.title,
    text:
      (shouldReplaceBodyWithGrantedText ? grantedText.trimStart() : card.text + grantedText) +
      formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    artKey: artKeyForGrantedItem(effectOut, card.artKey) ?? card.artKey,
    grantedItemId: effectOut.grantedItemId,
    equipmentReplaceOffer: effectOut.equipmentReplaceOffer,
    queuedPenaltySipNotices: penaltySipEntriesForKlunks(p.id, effectOut.klunkar, card.title),
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
  const beforeHp = p.hp;
  const beforeGold = p.gold;
  const beforeKlunk = p.klunkar;

  if (pending.kind === "combat" && pending.cardId === "monster:belgisk_munk") {
    const monster = MONSTERS.find((m) => m.id === "belgisk_munk");
    if (!monster) return { handled: true, error: "Ogiltigt monster" };
    if (choiceId === "sip_leave") {
      if (p.gold < 5) return { handled: true, error: "Du behöver 5 pant för att hedra den belgiska munken." };
      p.gold -= 5;
      recordPantSpent(state, p.id, 5);
      grantKlunkWithXp(state, p, 1, { penaltyStraff: false });
      pushSipNotice(state, p.id, monster.name);
      log(state, `${p.name} tar en klunk och betalar 5 pant i ${monster.name}s ära. ${monster.name} försvinner.`);
      return { handled: true, completeCard: true };
    }
    if (choiceId === "fight") {
      log(state, `${p.name} väljer att slåss mot ${monster.name}.`);
      return { handled: true, startCombat: createMonsterCombatPending(state, p, monster) };
    }
    return { handled: true, error: "Ogiltigt val" };
  }
  if (pending.kind === "combat" && pending.cardId === "monster:demonkrigare") {
    const monster = MONSTERS.find((m) => m.id === "demonkrigare");
    if (!monster) return { handled: true, error: "Ogiltigt monster" };
    if (choiceId === "pay_skip") {
      if (p.gold < 10) return { handled: true, error: "Du behöver 10 pant för att undvika striden." };
      p.gold -= 10;
      recordPantSpent(state, p.id, 10);
      log(state, `${p.name} betalar 10 pant och undviker striden mot ${monster.name}.`);
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
      grantKlunkWithXp(state, target, 1, { penaltyStraff: true });
      log(state, `${p.name} ger en klunk till ${target.name}.`);
    } else {
      grantKlunkWithXp(state, target, 1, { penaltyStraff: true });
      target.hp = Math.min(target.maxHp, target.hp + 2);
      log(state, `${p.name} bjuder ${target.name} på en vänlig klunk (+2 HP).`);
    }
    state.pending = {
      ...pending,
      choices: undefined,
      queuedPenaltySipNotices: mergePenaltySipQueue(pending.queuedPenaltySipNotices, [
        { recipientId: target.id, klunkCount: 1, fromPlayerName: p.name },
      ]),
      text:
        `${pending.text}\nValt: ${target.name}` +
        formatTargetStatDeltas(target.name, beforeTargetHp, target.hp, beforeTargetSips, target.klunkar),
    };
    return { handled: true };
  }
  if (pending.kind === "event" && pending.cardId === "event_syndabock") {
    const target = state.players.find((x) => x.id === choiceId);
    if (!target) return { handled: true, error: "Ogiltigt mål" };
    const beforeTargetHp = target.hp;
    const beforeTargetSips = target.klunkar;
    const beforeSelfSips = p.klunkar;
    applyEffects({
      state,
      player: target,
      effects: [{ type: "damage", amount: 1, source: "syndabock" }],
      rng,
      ignoreArmorOnDamage: true,
    });
    grantKlunkWithXp(state, p, 1, { penaltyStraff: true });
    state.pending = {
      ...pending,
      choices: undefined,
      queuedPenaltySipNotices: mergePenaltySipQueue(pending.queuedPenaltySipNotices, [
        { recipientId: p.id, klunkCount: 1, fromPlayerName: pending.title },
      ]),
      text:
        `${pending.text}\nValt: ${target.name}` +
        formatTargetStatDeltas(target.name, beforeTargetHp, target.hp, beforeTargetSips, target.klunkar) +
        (beforeSelfSips !== p.klunkar ? `\nDina klunkar: ${beforeSelfSips} → ${p.klunkar}.` : ""),
    };
    log(state, `${p.name} pekar ut ${target.name} som syndabock.`);
    return { handled: true };
  }
  if (pending.kind === "event" && pending.cardId === "event_rotasoptunna" && choiceId === "roll") {
    const die = rollDie(rng, 6);
    const gained = die * 2;
    p.gold += gained;
    state.pending = {
      ...pending,
      choices: undefined,
      text:
        `${pending.text}\nTärning: ${die} → +${gained} pant.` +
        formatSelfStatDeltas(p.gold - gained, p.gold, p.hp, p.hp, p.klunkar, p.klunkar),
    };
    log(state, `${p.name} slog ${die} på ${pending.cardId}.`);
    return { handled: true };
  }
  if (pending.kind === "event" && pending.cardId === "event_fastnatipant" && choiceId === "roll") {
    const die = rollDie(rng, 6);
    const delta = die <= 2 ? -5 : die <= 4 ? -10 : 10;
    const beforeGold = p.gold;
    p.gold = Math.max(0, p.gold + delta);
    state.pending = {
      ...pending,
      choices: undefined,
      text: `${pending.text}\nTärning: ${die}.` + formatSelfStatDeltas(beforeGold, p.gold, p.hp, p.hp, p.klunkar, p.klunkar),
    };
    log(state, `${p.name} slog ${die} på ${pending.cardId}.`);
    return { handled: true };
  }
  if (pending.kind === "event" && pending.cardId === "event_happyhour" && choiceId === "roll") {
    const die = rollDie(rng, 6);
    if (die === 1) {
      for (const pl of state.players) if (pl.id !== p.id) pl.gold += 1;
    } else if (die <= 5) {
      p.gold += 2;
    } else {
      for (const pl of state.players) pl.hp = Math.min(pl.maxHp, pl.hp + 1);
    }
    state.pending = {
      ...pending,
      choices: undefined,
      text:
        `${pending.text}\nTärning: ${die}.` +
        formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    };
    log(state, `${p.name} slog ${die} på ${pending.cardId}.`);
    return { handled: true };
  }
  if (pending.kind === "event" && pending.cardId === "event_dubbelinget") {
    if (choiceId === "roll") {
      const die = rollDie(rng, 6);
      const beforeGold = p.gold;
      if (die <= 3) {
        const loss = Math.min(12, Math.max(0, p.gold));
        p.gold -= loss;
        if (loss > 0) recordPantSpent(state, p.id, loss);
      } else p.gold += 12;
      state.pending = {
        ...pending,
        choices: undefined,
        text:
          `${pending.text}\nTärning: ${die}.` +
          formatSelfStatDeltas(beforeGold, p.gold, p.hp, p.hp, p.klunkar, p.klunkar),
      };
      log(state, `${p.name} slog ${die} på ${pending.cardId}.`);
      return { handled: true };
    }
  }
  if (pending.kind === "event" && pending.cardId === "event_snurraflaskan" && choiceId === "roll") {
    const die = rollDie(rng, 6);
    const effectOut: EffectApplyOut = {};
    if (die === 1) applyEffects({ state, player: p, effects: [{ type: "damage", amount: 2, source: "snurraflaskan" }], rng, out: effectOut, ignoreArmorOnDamage: true });
    else if (die <= 3) applyEffects({ state, player: p, effects: [{ type: "klunkar", amount: 1 }], rng, out: effectOut });
    else if (die <= 5) applyEffects({ state, player: p, effects: [{ type: "gold", amount: 3 }], rng, out: effectOut });
    else applyEffects({ state, player: p, effects: [{ type: "randomItem" }], rng, out: effectOut });
    state.pending = {
      ...pending,
      choices: undefined,
      artKey: artKeyForGrantedItem(effectOut, pending.artKey) ?? pending.artKey,
      grantedItemId: effectOut.grantedItemId ?? pending.grantedItemId,
      equipmentReplaceOffer: effectOut.equipmentReplaceOffer ?? pending.equipmentReplaceOffer,
      queuedPenaltySipNotices: mergePenaltySipQueue(
        pending.queuedPenaltySipNotices,
        penaltySipEntriesForKlunks(p.id, effectOut.klunkar, pending.title),
      ),
      text:
        `${pending.text}\nTärning: ${die}.` +
        appendTextForGrantedItem(effectOut) +
        formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    };
    log(state, `${p.name} slog ${die} på ${pending.cardId}.`);
    return { handled: true };
  }
  if (pending.kind === "event" && pending.cardId === "event_fastnatikylen" && choiceId === "roll") {
    const die = rollDie(rng, 6);
    if (die <= 2) {
      p.skippedTurns = Math.max(0, p.skippedTurns) + 1;
      p.skipTurnReasons ??= [];
      p.skipTurnReasons.push("normal");
    } else if (die >= 4) {
      p.gold += 5;
    }
    state.pending = {
      ...pending,
      choices: undefined,
      text:
        `${pending.text}\nTärning: ${die}.` +
        formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    };
    log(state, `${p.name} slog ${die} på ${pending.cardId}.`);
    return { handled: true };
  }
  if (pending.kind === "event" && pending.cardId === "event_fummel" && choiceId === "roll") {
    const die = rollDie(rng, 6);
    let droppedText = "\nInget tappades.";
    if (die >= 5) {
      const occupied = (["weapon", "armor", "helmet", "accessory"] as const).filter((slot) => !!p.equipment[slot]);
      if (occupied.length > 0) {
        const slot = occupied[Math.floor(rng() * occupied.length)] as EquipmentSlot;
        const piece = p.equipment[slot];
        p.equipment[slot] = undefined as any;
        droppedText = `\nDu tappade ${piece?.name ?? "en utrustning"} (${slot}).`;
      } else {
        droppedText = "\nDu hade ingen utrustning att tappa.";
      }
    }
    state.pending = {
      ...pending,
      choices: undefined,
      text:
        `${pending.text}\nTärning: ${die}.` +
        droppedText +
        formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    };
    log(state, `${p.name} slog ${die} på ${pending.cardId}.`);
    return { handled: true };
  }
  if (pending.kind === "event" && pending.cardId === "event_pantad" && choiceId === "roll") {
    const die = rollDie(rng, 6);
    let transfer = 0;
    let poorest: Player | null = null;
    if (die >= 5) {
      const candidates = state.players.filter((x) => x.id !== p.id);
      for (const pl of candidates) {
        if (!poorest || pl.gold < poorest.gold) poorest = pl;
      }
      if (poorest) {
        transfer = Math.floor(p.gold / 2);
        p.gold -= transfer;
        poorest.gold += transfer;
      }
    }
    state.pending = {
      ...pending,
      choices: undefined,
      text:
        `${pending.text}\nTärning: ${die}.` +
        (die >= 5 && poorest
          ? `\n${poorest.name} var fattigast och fick ${transfer} pant.`
          : "\nIngen pant överfördes.") +
        formatSelfStatDeltas(beforeGold, p.gold, beforeHp, p.hp, beforeKlunk, p.klunkar),
    };
    log(state, `${p.name} slog ${die} på ${pending.cardId}.`);
    return { handled: true };
  }

  const def = getCard(pending.cardId);
  const choice = def.choices?.find((c) => c.id === choiceId);
  if (!choice) return { handled: true, error: "Ogiltigt val" };

  const effectOut: EffectApplyOut = {};
  applyEffects({
    state,
    player: p,
    effects: choice.effects ?? [],
    rng,
    out: effectOut,
    ignoreArmorOnDamage: pending.kind === "event",
  });
  log(state, `${p.name} väljer: ${choice.label}.`);

  state.pending = {
    ...pending,
    choices: undefined,
    artKey: artKeyForGrantedItem(effectOut, pending.artKey) ?? pending.artKey,
    grantedItemId: effectOut.grantedItemId ?? pending.grantedItemId,
    equipmentReplaceOffer: effectOut.equipmentReplaceOffer ?? pending.equipmentReplaceOffer,
    queuedPenaltySipNotices: mergePenaltySipQueue(
      pending.queuedPenaltySipNotices,
      penaltySipEntriesForKlunks(p.id, effectOut.klunkar, pending.title),
    ),
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
    const start = createFinalBossCombatPending(state, attacker, { skipEnemyIntro: true, log });
    if (!start) return { handled: true };
    log(state, `${attacker.name} går in i nästa runda mot slutbossen.`);
    return { handled: true, startCombat: start };
  }

  return { handled: false };
}

