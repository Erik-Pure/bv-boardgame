export type AnalyticsRange = "7d" | "30d" | "week" | "month";

export type GameEndedOutcome = "winner" | "draw" | "aborted" | "abandoned";

export interface GameStartedEvent {
  id: string;
  type: "game_started";
  at: number;
  roomCode: string;
  matchId: string;
  playerCount: number;
  playerNames: string[];
  hostUserId?: string;
}

export interface GameEndedEvent {
  id: string;
  type: "game_ended";
  at: number;
  roomCode: string;
  matchId: string;
  playerCount: number;
  playerNames: string[];
  outcome: GameEndedOutcome;
  durationMs?: number;
}

export type AnalyticsEvent = GameStartedEvent | GameEndedEvent;

export interface AnalyticsAggregate {
  range: AnalyticsRange;
  rangeStartAt: number;
  rangeEndAt: number;
  gamesStarted: number;
  gamesEnded: number;
  gamesAbandoned: number;
  playerParticipations: number;
  uniquePlayerNames: number;
  averageDurationMs: number | null;
}

export interface LiveAnalyticsSnapshot {
  liveRooms: number;
  livePlaying: number;
  livePlayers: number;
}

export interface AnalyticsResponse {
  ok: true;
  aggregate: AnalyticsAggregate;
  live: LiveAnalyticsSnapshot;
  recentEvents: AnalyticsEvent[];
}
