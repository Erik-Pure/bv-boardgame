import { z } from "zod";

export const clientHelloSchema = z.object({
  type: z.literal("hello"),
  roomCode: z.string().min(2).max(12),
  playerName: z.string().min(1).max(24),
  as: z.enum(["table", "controller"]),
  playerId: z.string().uuid().optional(),
  config: z
    .object({
      turnSeconds: z.number().int().min(10).max(600).optional(),
      gameMode: z.enum(["bossKill"]).optional(),
      difficulty: z.enum(["lattol", "folkol", "starkol", "imperial"]).optional(),
      hardcore: z.boolean().optional(),
      boardSize: z.enum(["default", "large", "xlarge"]).optional(),
      levelCount: z.number().int().min(1).max(5).optional(),
      maxHp: z.number().int().min(6).max(30).optional(),
      startPant: z.number().int().min(0).max(50).optional(),
      wakeLockBeforeStart: z.boolean().optional(),
      disabledCardIds: z.array(z.string().min(1)).optional(),
      cardCover: z.enum(["default", "alt1", "alt2"]).optional(),
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
