import { z } from "zod";
import { CONFIG_NUMERIC } from "@bv/game-core";

export const CURRENT_PROTOCOL_VERSION = 1;
export const MIN_SUPPORTED_CLIENT_PROTOCOL = 1;

export const clientHelloSchema = z.object({
  type: z.literal("hello"),
  protocolVersion: z.number().int().positive().optional(),
  authToken: z.string().min(1).max(256).optional(),
  roomCode: z.string().min(2).max(12),
  playerName: z.string().min(1).max(24),
  as: z.enum(["table", "controller"]),
  playerId: z.string().uuid().optional(),
  config: z
    .object({
      turnSeconds: z.number().int().min(CONFIG_NUMERIC.turnSeconds.min).max(CONFIG_NUMERIC.turnSeconds.max).optional(),
      reactionSeconds: z
        .number()
        .int()
        .min(CONFIG_NUMERIC.reactionSeconds.min)
        .max(CONFIG_NUMERIC.reactionSeconds.max)
        .optional(),
      gameMode: z.enum(["bossKill"]).optional(),
      difficulty: z.enum(["lattol", "folkol", "starkol", "imperial"]).optional(),
      hardcore: z.boolean().optional(),
      boardSize: z.enum(["default", "large", "xlarge"]).optional(),
      levelCount: z.number().int().min(1).max(5).optional(),
      maxHp: z.number().int().min(CONFIG_NUMERIC.maxHp.min).max(CONFIG_NUMERIC.maxHp.max).optional(),
      startPant: z.number().int().min(CONFIG_NUMERIC.startPant.min).max(CONFIG_NUMERIC.startPant.max).optional(),
      wakeLockBeforeStart: z.boolean().optional(),
      disabledCardIds: z.array(z.string().min(1)).optional(),
      cardCover: z.string().min(1).max(64).optional(),
    })
    .optional(),
});

export type ClientHello = z.infer<typeof clientHelloSchema>;

export const clientActionSchema = z.object({
  type: z.literal("action"),
  actionId: z.string().min(1).max(64).optional(),
  action: z.unknown(),
});

export type ClientActionEnvelope = z.infer<typeof clientActionSchema>;

export const clientRequestStateSnapshotSchema = z.object({
  type: z.literal("requestStateSnapshot"),
});

export type ClientRequestStateSnapshot = z.infer<typeof clientRequestStateSnapshotSchema>;

export const clientMessageSchema = z.discriminatedUnion("type", [
  clientHelloSchema,
  clientActionSchema,
  clientRequestStateSnapshotSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export type ServerMessage =
  | { type: "helloAck"; playerId: string; roomCode: string; protocolVersion?: number }
  | { type: "state"; state: unknown; seq?: number }
  | { type: "stateDelta"; seq: number; patch: unknown }
  | { type: "error"; message: string };
