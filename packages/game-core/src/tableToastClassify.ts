import type { TableToastCategory } from "./eventTableOutcomes.js";

export type TableToastIcon = "klunk" | "pant" | "hp" | "attack";

/** Ikoner i ordning: klunk → pant → hp (en rad per toast). */
export function tableToastIconKinds(message: string, category: TableToastCategory): TableToastIcon[] {
  const m = message.toLowerCase();
  if (category === "vaska") {
    return ["attack"];
  }
  if (category === "reward") {
    if (m.includes("skatt") || m.includes("treasure")) return ["attack"];
    return ["pant"];
  }
  let klunk = false;
  let pant = false;
  let hp = false;
  if (category === "sip") {
    klunk = true;
  } else {
    if (
      m.includes("straffklunk") ||
      m.includes("penalty sip") ||
      m.includes("+1 klunk") ||
      m.includes("+1 sip") ||
      (m.includes("klunk") && (m.includes("ger ") || m.includes("får ") || m.includes("gets "))) ||
      (m.includes("sip") && (m.includes("gets ") || m.includes("gives ") || m.includes("ger ")))
    ) {
      klunk = true;
    }
    if (
      m.includes(" pant") ||
      m.includes(" cans") ||
      m.includes("pant från") ||
      m.includes("cans from") ||
      m.includes("pant i") ||
      m.includes("pant.") ||
      m.includes("cans.") ||
      /\d+\s+pant\b/.test(m) ||
      /\d+\s+cans\b/.test(m)
    ) {
      pant = true;
    }
    if (m.includes("skada") || m.includes("damage")) {
      hp = true;
    }
    if (!klunk && !pant && !hp) {
      pant = true;
    }
  }
  const out: TableToastIcon[] = [];
  if (klunk) out.push("klunk");
  if (pant) out.push("pant");
  if (hp) out.push("hp");
  return out;
}

export function isMonsterEncounterSkipToast(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes("undviker batchmötet")) return true;
  if (m.includes("avoids the batch encounter")) return true;
  if (m.includes("mutar sig ur batchmötet") || m.includes("mutar sig ur")) return true;
  if (m.includes("bribed out of the batch encounter") || m.includes("bribed out")) return true;
  if (m.includes("skippar den dåliga batchen")) return true;
  if (m.includes("skips the bad batch")) return true;
  if (m.includes("plays sink it")) return true;
  if (m.includes("skippar monstr") || m.includes("skippar monstret")) return true;
  if (m.includes("played vaska") && m.includes("skip")) return true;
  if (m.includes("vaska") && m.includes("skippar")) return true;
  if (m.includes("paid") && m.includes("to skip")) return true;
  if (m.includes("betalar") && m.includes("pant") && m.includes("undviker skadan")) return true;
  if (m.includes("paid") && m.includes("cans") && m.includes("avoid")) return true;
  return false;
}

function isSipToast(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("straffklunk") ||
    m.includes("penalty sip") ||
    m.includes("reduces penalty sip") ||
    m.includes("mildrar straffklunken") ||
    (m.includes(" klunk") && (m.includes("ger ") || m.includes("dricker") || m.includes("får "))) ||
    (m.includes(" sip") &&
      (m.includes("gets ") || m.includes("gives ") || m.includes("ger ") || m.includes("drinks ")))
  );
}

function isPvpLootToast(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes("tar skada") || m.includes("takes damage") || m.includes("tar också skada")) {
    return false;
  }
  return (
    m.includes("efter duellen") ||
    m.includes("after the duel") ||
    m.includes(" i pvp") ||
    m.includes(" in pvp") ||
    m.includes("cans from") ||
    m.includes("pant från") ||
    m.includes(" takes ") ||
    m.includes(" tar ") ||
    m.includes(" took ") ||
    m.includes(" tog ") ||
    (m.includes("gave ") && m.includes("cans to")) ||
    (m.includes("ger ") && m.includes("pant till"))
  );
}

export function classifyTableToastMessage(message: string): TableToastCategory | null {
  const m = message.toLowerCase();
  if (isMonsterEncounterSkipToast(m)) {
    return "vaska";
  }
  if (isSipToast(m)) return "sip";
  if (isPvpLootToast(m)) return "pvp";
  return null;
}
