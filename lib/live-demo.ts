import { z } from "zod";
export const liveDemoSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not-run"), message: z.string() }),
  z.object({
    status: z.literal("completed"),
    completedAt: z.iso.datetime(),
    provider: z.literal("AssemblyAI"),
    audio: z.object({
      path: z.literal("/audio/integration-check.wav"),
      durationSeconds: z.number().positive().max(10),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      sourceUrl: z.literal("https://assembly.ai/wildfires.mp3"),
      description: z.string(),
    }),
    text: z.string().min(1).max(10000),
    words: z
      .array(
        z.object({
          text: z.string().max(200),
          start: z.number().nonnegative(),
          end: z.number().nonnegative(),
          confidence: z.number().min(0).max(1),
        }),
      )
      .min(1)
      .max(500),
    speechModelUsed: z.string().nullable(),
    audioDurationSeconds: z.number().nonnegative().nullable(),
    latencyMs: z.number().nonnegative(),
    requests: z
      .array(
        z.object({
          stage: z.enum(["upload", "submit", "poll"]),
          method: z.enum(["GET", "POST"]),
          path: z.enum(["/v2/upload", "/v2/transcript", "/v2/transcript/{id}"]),
          httpStatus: z.number().int().min(100).max(599),
          latencyMs: z.number().nonnegative(),
        }),
      )
      .min(2)
      .max(32),
    billing: z.object({
      mode: z.literal("free-credits-only"),
      maxOutOfPocketUsd: z.literal(0),
      creditsDebitedUsd: z.number().nonnegative().nullable(),
      basis: z.string(),
    }),
  }),
]);
export type LiveDemo = z.infer<typeof liveDemoSchema>;
