import {
  resolveEventCardTableToasts,
  type EventTableToastSpec,
  type GameLocale,
  type TableToastCategory,
  type TableToastIcon,
} from "@bv/game-core";
import type { GameState, Player } from "@bv/game-core";
import type { StatIconKind } from "../components/StatIcon";

export type { TableToastCategory };

export type EventCardOutcomeToast = {
  text: string;
  category: TableToastCategory;
  iconKinds: StatIconKind[];
};

type PendingEventCard = Extract<NonNullable<GameState["pending"]>, { type: "card" }>;

function iconToStatKind(icon: TableToastIcon): StatIconKind {
  return icon;
}

export function eventCardOutcomeToasts(
  pending: PendingEventCard,
  playersById: Map<string, Player>,
  locale: GameLocale = "sv",
): EventCardOutcomeToast[] {
  const players = [...playersById.values()];
  const specs: EventTableToastSpec[] = resolveEventCardTableToasts(pending, players, locale);
  return specs.map((spec) => ({
    text: spec.text,
    category: spec.category,
    iconKinds: spec.icons.map(iconToStatKind),
  }));
}
