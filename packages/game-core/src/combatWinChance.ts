/**
 * Beräknar ungefärlig vinstchans (%) före monstertärning — samma regler som motorn:
 * solo-etta = kritisk miss (om ej Fyrklöver), lag/ölkompis kräver båda ettor;
 * total = die(+dubbel) + flatBonus, vinst vid total ≥ need.
 */

export type CombatRollerOddsInput = {
  /** Utrustning + attackMods + nextCombatModifier + ev. vald sip-vapenbonus. */
  flatBonus: number;
  attackDiceDoubled?: boolean;
  ignoreCritFailOnOne?: boolean;
  /** Redan slagen eller tvingad tärning (1–6). */
  fixedDie?: number;
};

function dieFaces(fixedDie: number | undefined): number[] {
  if (typeof fixedDie === "number" && fixedDie >= 1 && fixedDie <= 6 && Number.isInteger(fixedDie)) {
    return [fixedDie];
  }
  return [1, 2, 3, 4, 5, 6];
}

function dieContribution(die: number, doubled: boolean | undefined): number {
  return doubled ? die * 2 : die;
}

function isCritFail(
  assist: boolean,
  attackerDie: number,
  broDie: number | undefined,
  attackerIgnores: boolean,
  broIgnores: boolean,
): boolean {
  if (assist) {
    if (attackerIgnores || broIgnores) return false;
    return attackerDie === 1 && broDie === 1;
  }
  if (attackerIgnores) return false;
  return attackerDie === 1;
}

/**
 * Andel vinnande utfall (0–100), avrundat.
 * Med assist räknas 6×6 (eller färre om någon tärning är låst).
 */
export function monsterCombatWinChancePercent(args: {
  need: number;
  attacker: CombatRollerOddsInput;
  assist?: CombatRollerOddsInput | null;
}): number {
  const need = args.need;
  const a = args.attacker;
  const b = args.assist ?? null;
  const aFaces = dieFaces(a.fixedDie);
  const bFaces = b ? dieFaces(b.fixedDie) : [0];

  let wins = 0;
  let total = 0;

  for (const aDie of aFaces) {
    for (const bDie of bFaces) {
      total += 1;
      const assistActive = !!b;
      const crit = isCritFail(
        assistActive,
        aDie,
        assistActive ? bDie : undefined,
        a.ignoreCritFailOnOne === true,
        b?.ignoreCritFailOnOne === true,
      );
      if (crit) continue;
      const aTotal = dieContribution(aDie, a.attackDiceDoubled) + a.flatBonus;
      const bTotal = assistActive
        ? dieContribution(bDie, b!.attackDiceDoubled) + b!.flatBonus
        : 0;
      if (aTotal + bTotal >= need) wins += 1;
    }
  }

  if (total <= 0) return 0;
  return Math.round((100 * wins) / total);
}
