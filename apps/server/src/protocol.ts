import { z } from "zod";
import { CONFIG_NUMERIC } from "@bv/game-core";

export const clientHelloSchema = z.object({
  type: z.literal("hello"),
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
  action: z.unknown(),
});

export type ClientActionEnvelope = z.infer<typeof clientActionSchema>;

export const clientMessageSchema = z.discriminatedUnion("type", [
  clientHelloSchema,
  clientActionSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export type ServerMessage =
  | { type: "helloAck"; playerId: string; roomCode: string }
  | { type: "state"; state: unknown }
  | { type: "error"; message: string };
