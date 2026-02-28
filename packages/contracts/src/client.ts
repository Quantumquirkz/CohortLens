import {
  healthResponseSchema,
  predictRequestSchema,
  predictResponseSchema,
  recommendationRequestSchema,
  recommendationResponseSchema,
  segmentRequestSchema,
  segmentResponseSchema,
  tokenResponseSchema,
  usageResponseSchema,
} from "./schemas.js";
import type {
  PredictRequest,
  PredictResponse,
  RecommendationRequest,
  RecommendationResponse,
  SegmentRequest,
  SegmentResponse,
  TokenResponse,
} from "./schemas.js";

export type ApiClientOptions = {
  baseUrl: string;
  getToken?: () => Promise<string | null> | string | null;
};

export class CohortLensApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: ApiClientOptions["getToken"];

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getToken = options.getToken;
  }

  private async request<T>(path: string, init: RequestInit, schema: { parse: (x: unknown) => T }): Promise<T> {
    const token = this.getToken ? await this.getToken() : null;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = typeof data?.message === "string" ? data.message : `HTTP ${res.status}`;
      throw new Error(detail);
    }
    return schema.parse(data);
  }

  async token(username: string, password: string): Promise<TokenResponse> {
    const res = await fetch(`${this.baseUrl}/api/v2/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data?.message === "string" ? data.message : `HTTP ${res.status}`);
    }
    return tokenResponseSchema.parse(data);
  }

  health() {
    return this.request("/api/v2/health", { method: "GET" }, healthResponseSchema);
  }

  usage() {
    return this.request("/api/v2/usage", { method: "GET" }, usageResponseSchema);
  }

  predict(body: PredictRequest): Promise<PredictResponse> {
    predictRequestSchema.parse(body);
    return this.request(
      "/api/v2/predict-spending",
      { method: "POST", body: JSON.stringify(body) },
      predictResponseSchema,
    );
  }

  segment(body: SegmentRequest): Promise<SegmentResponse> {
    segmentRequestSchema.parse(body);
    return this.request("/api/v2/segment", { method: "POST", body: JSON.stringify(body) }, segmentResponseSchema);
  }

  recommendations(body: RecommendationRequest): Promise<RecommendationResponse> {
    recommendationRequestSchema.parse(body);
    return this.request(
      "/api/v2/recommendations/natural",
      { method: "POST", body: JSON.stringify(body) },
      recommendationResponseSchema,
    );
  }
}
