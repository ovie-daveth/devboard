import { z } from "zod";

export const createLogSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]),
  service: z.string().min(3),
  message: z.string().min(3),

  timestamp: z.coerce.date().optional(),

  environment: z.enum(["local", "development", "staging", "production"]).default("development"),

  traceId: z.string().optional(),
  spanId: z.string().optional(),
  requestId: z.string().optional(),

  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateLogInput = z.infer<typeof createLogSchema>;