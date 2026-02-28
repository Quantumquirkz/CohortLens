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

export const predictRequestSchema = z.object({
  age: z.number().int().min(18).max(100),
  annual_income: z.number().positive(),
  work_experience: z.number().int().min(0).max(80),
  family_size: z.number().int().min(1).max(20),
  profession: z.string().min(1).default("Other"),
});

export const predictResponseSchema = z.object({
  predicted_spending: z.number().min(0).max(100),
  confidence: z.enum(["low", "medium", "high"]),
  rule_version: z.string(),
});

export const segmentRowSchema = z.object({
  CustomerID: z.string().optional(),
  Age: z.number().int().min(18).max(100),
  "Annual Income ($)": z.number().positive(),
  "Spending Score (1-100)": z.number().min(0).max(100),
});

export const segmentRequestSchema = z.array(segmentRowSchema).min(1).max(10000);

export const segmentResponseSchema = z.object({
  clusters: z.array(z.number().int()),
  rule_version: z.string(),
});

export const recommendationRequestSchema = z.object({
  query: z.string().min(3).max(1000),
});

export const recommendationResponseSchema = z.object({
  recommendation: z.string(),
  source: z.enum(["groq", "rule_based"]),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type UsageResponse = z.infer<typeof usageResponseSchema>;
export type TokenRequest = z.infer<typeof tokenRequestSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type PredictRequest = z.infer<typeof predictRequestSchema>;
export type PredictResponse = z.infer<typeof predictResponseSchema>;
export type SegmentRow = z.infer<typeof segmentRowSchema>;
export type SegmentRequest = z.infer<typeof segmentRequestSchema>;
export type SegmentResponse = z.infer<typeof segmentResponseSchema>;
export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
