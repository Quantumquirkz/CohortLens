import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.string(),
  service: z.literal("cohortlens"),
  version: z.string(),
  neon_db: z.string(),
  timestamp: z.string(),
});

export const usageResponseSchema = z.object({
  tenant_id: z.string(),
  month_key: z.string(),
  current_month_calls: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});

export const tokenRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("bearer"),
  expires_in: z.number().int().positive(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type UsageResponse = z.infer<typeof usageResponseSchema>;
export type TokenRequest = z.infer<typeof tokenRequestSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
