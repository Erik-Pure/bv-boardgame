import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { playerPant, type EquipmentSlot, type GameState } from "@bv/game-core";
import { type StatFlash } from "./playInventoryUi";
import { findMe } from "./playSessionHelpers";

const STAT_FLASH_MS = 1300;

const EQUIP_SLOTS: EquipmentSlot[] = ["weapon", "armor", "helmet", "accessory"];

const emptyEquipFlash = (): Record<EquipmentSlot, StatFlash> => ({
  weapon: null,
  armor: null,
  helmet: null,
  accessory: null,
});

const emptyEquipFlashKey = (): Record<EquipmentSlot, number> => ({
  weapon: 0,
  armor: 0,
  helmet: 0,
  accessory: 0,
});

export function usePlayStatFlash(options: {
  state: GameState | null;
  myId: string | null;
  blocksStatFlashOverlay: boolean;
}) {
  const { state, myId, blocksStatFlashOverlay } = options;

  const prevHpRef = useRef<number | undefined>(undefined);
  const prevGoldRef = useRef<number | undefined>(undefined);
  const prevKlunkRef = useRef<number | undefined>(undefined);
  const suppressNextHpFlashRef = useRef(false);

  const [hpFlash, setHpFlash] = useState<StatFlash>(null);
  const [pantFlash, setPantFlash] = useState<StatFlash>(null);
  const [klunkFlash, setKlunkFlash] = useState<StatFlash>(null);
  const [hpFlashKey, setHpFlashKey] = useState(0);
  const [pantFlashKey, setPantFlashKey] = useState(0);
  const [klunkFlashKey, setKlunkFlashKey] = useState(0);

  const prevEquipNamesRef = useRef<Partial<Record<EquipmentSlot, string>>>({});
  const prevInvCountsRef = useRef<Record<string, number>>({});
  const lootPrimedRef = useRef(false);
  const pendingLootFlashRef = useRef<{
    equip: Partial<Record<EquipmentSlot, true>>;
    items: Record<string, true>;
  }>({ equip: {}, items: {} });

  const [equipFlash, setEquipFlash] = useState<Record<EquipmentSlot, StatFlash>>(() => emptyEquipFlash());
  const [equipFlashKey, setEquipFlashKey] = useState<Record<EquipmentSlot, number>>(() => emptyEquipFlashKey());
  const [itemFlash, setItemFlash] = useState<Record<string, StatFlash>>({});
  const [itemFlashKey, setItemFlashKey] = useState<Record<string, number>>({});

  useEffect(() => {
    prevHpRef.current = undefined;
    prevGoldRef.current = undefined;
    prevKlunkRef.current = undefined;
    setHpFlash(null);
    setPantFlash(null);
    setKlunkFlash(null);
    prevEquipNamesRef.current = {};
    prevInvCountsRef.current = {};
    lootPrimedRef.current = false;
    pendingLootFlashRef.current = { equip: {}, items: {} };
    setEquipFlash(emptyEquipFlash());
    setEquipFlashKey(emptyEquipFlashKey());
    setItemFlash({});
    setItemFlashKey({});
  }, [myId]);

  useEffect(() => {
    const self = findMe(state, myId);
    if (!self) {
      prevHpRef.current = undefined;
      return;
    }
    const prev = prevHpRef.current;
    const next = self.hp;
    prevHpRef.current = next;
    if (prev === undefined) return;
    if (prev === next) return;
    if (suppressNextHpFlashRef.current) {
      suppressNextHpFlashRef.current = false;
      return;
    }
    const dir: StatFlash = next < prev ? "down" : "up";
    if (blocksStatFlashOverlay) return;
    setHpFlash(dir);
    setHpFlashKey((k) => k + 1);
    const t = window.setTimeout(() => setHpFlash(null), STAT_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [state, myId, blocksStatFlashOverlay]);

  useEffect(() => {
    const self = findMe(state, myId);
    if (!self) {
      prevGoldRef.current = undefined;
      return;
    }
    const prev = prevGoldRef.current;
    const next = playerPant(self);
    prevGoldRef.current = next;
    if (prev === undefined) return;
    if (prev === next) return;
    const dir: StatFlash = next < prev ? "down" : "up";
    if (blocksStatFlashOverlay) return;
    setPantFlash(dir);
    setPantFlashKey((k) => k + 1);
    const t = window.setTimeout(() => setPantFlash(null), STAT_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [state, myId, blocksStatFlashOverlay]);

  useEffect(() => {
    const self = findMe(state, myId);
    if (!self) {
      prevKlunkRef.current = undefined;
      return;
    }
    const prev = prevKlunkRef.current;
    const next = self.klunkar;
    prevKlunkRef.current = next;
    if (prev === undefined) return;
    if (prev === next) return;
    const dir: StatFlash = next < prev ? "down" : "up";
    if (blocksStatFlashOverlay) return;
    setKlunkFlash(dir);
    setKlunkFlashKey((k) => k + 1);
    const t = window.setTimeout(() => setKlunkFlash(null), STAT_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [state, myId, blocksStatFlashOverlay]);

  useEffect(() => {
    const self = findMe(state, myId);
    if (!self) {
      prevEquipNamesRef.current = {};
      prevInvCountsRef.current = {};
      lootPrimedRef.current = false;
      return;
    }

    const counts: Record<string, number> = {};
    for (const it of self.inventory ?? []) {
      const k = String(it.itemId);
      counts[k] = (counts[k] ?? 0) + 1;
    }

    if (!lootPrimedRef.current) {
      lootPrimedRef.current = true;
      for (const slot of EQUIP_SLOTS) {
        prevEquipNamesRef.current[slot] = self.equipment[slot]?.name ?? "";
      }
      prevInvCountsRef.current = { ...counts };
      return;
    }

    const timers: ReturnType<typeof window.setTimeout>[] = [];

    const flashEquipUp = (slot: EquipmentSlot) => {
      if (blocksStatFlashOverlay) {
        pendingLootFlashRef.current.equip[slot] = true;
        return;
      }
      delete pendingLootFlashRef.current.equip[slot];
      setEquipFlash((e) => ({ ...e, [slot]: "up" }));
      setEquipFlashKey((e) => ({ ...e, [slot]: (e[slot] ?? 0) + 1 }));
      timers.push(window.setTimeout(() => setEquipFlash((e) => ({ ...e, [slot]: null })), STAT_FLASH_MS));
    };

    const flashItemUp = (itemId: string) => {
      if (blocksStatFlashOverlay) {
        pendingLootFlashRef.current.items[itemId] = true;
        return;
      }
      delete pendingLootFlashRef.current.items[itemId];
      setItemFlash((m) => ({ ...m, [itemId]: "up" }));
      setItemFlashKey((m) => ({ ...m, [itemId]: (m[itemId] ?? 0) + 1 }));
      timers.push(
        window.setTimeout(() => {
          setItemFlash((m) => {
            const n = { ...m };
            delete n[itemId];
            return n;
          });
        }, STAT_FLASH_MS),
      );
    };

    for (const slot of EQUIP_SLOTS) {
      const name = self.equipment[slot]?.name ?? "";
      const prevName = prevEquipNamesRef.current[slot] ?? "";
      if (name === prevName) continue;
      prevEquipNamesRef.current[slot] = name;
      if (name) flashEquipUp(slot);
    }

    for (const [itemId, n] of Object.entries(counts)) {
      const p = prevInvCountsRef.current[itemId] ?? 0;
      if (n > p) flashItemUp(itemId);
    }
    prevInvCountsRef.current = { ...counts };

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [state, myId, blocksStatFlashOverlay]);

  useEffect(() => {
    if (blocksStatFlashOverlay) return;
    const q = pendingLootFlashRef.current;
    const timers: ReturnType<typeof window.setTimeout>[] = [];
    for (const slot of EQUIP_SLOTS) {
      if (!q.equip[slot]) continue;
      delete q.equip[slot];
      setEquipFlash((e) => ({ ...e, [slot]: "up" }));
      setEquipFlashKey((e) => ({ ...e, [slot]: (e[slot] ?? 0) + 1 }));
      timers.push(window.setTimeout(() => setEquipFlash((e) => ({ ...e, [slot]: null })), STAT_FLASH_MS));
    }
    const pendingItemIds = Object.keys(q.items);
    for (const itemId of pendingItemIds) {
      if (!q.items[itemId]) continue;
      delete q.items[itemId];
      setItemFlash((m) => ({ ...m, [itemId]: "up" }));
      setItemFlashKey((m) => ({ ...m, [itemId]: (m[itemId] ?? 0) + 1 }));
      timers.push(
        window.setTimeout(() => {
          setItemFlash((m) => {
            const n = { ...m };
            delete n[itemId];
            return n;
          });
        }, STAT_FLASH_MS),
      );
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [blocksStatFlashOverlay]);

  return {
    hpFlash,
    hpFlashKey,
    pantFlash,
    pantFlashKey,
    klunkFlash,
    klunkFlashKey,
    equipFlash,
    equipFlashKey,
    itemFlash,
    itemFlashKey,
    suppressNextHpFlashRef: suppressNextHpFlashRef as MutableRefObject<boolean>,
  };
}
