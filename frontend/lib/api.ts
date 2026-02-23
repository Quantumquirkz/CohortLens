import type {
  HealthResponse,
  UsageResponse,
  PredictRequest,
  PredictResponse,
  ExplainParams,
  ExplainResponse,
  SegmentResponse,
  RecommendationRequest,
  RecommendationResponse,
  DriftResponse,
  SaveBaselineResponse,
  ReportRequest,
  ReportResponse,
  AuditParams,
  AuditResponse,
  ConsentRequest,
  ConsentRegisterResponse,
  ConsentResponse,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function apiHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { detail?: string | { msg?: string }[] };
    let message = `Request failed (${res.status})`;
    if (typeof body.detail === "string") message = body.detail;
    else if (Array.isArray(body.detail)) message = body.detail.map((d) => (d && typeof d === "object" && "msg" in d ? d.msg : String(d))).join(", ") || message;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function postToken(username: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE_URL}/api/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (res.status === 401) {
    const errBody = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(errBody.detail || "Invalid username or password.");
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(errBody.detail || `Request failed (${res.status})`);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/health`);
  return handleResponse<HealthResponse>(res);
}

export async function getUsage(): Promise<UsageResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/usage`, {
    headers: apiHeaders(),
  });
  return handleResponse<UsageResponse>(res);
}

export async function postPredict(
  body: PredictRequest
): Promise<PredictResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/predict-spending`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<PredictResponse>(res);
}

export async function getExplain(
  params: ExplainParams
): Promise<ExplainResponse> {
  const sp = new URLSearchParams();
  sp.set("age", String(params.age));
  sp.set("annual_income", String(params.annual_income));
  sp.set("work_experience", String(params.work_experience));
  sp.set("family_size", String(params.family_size));
  if (params.profession) sp.set("profession", params.profession);
  const res = await fetch(
    `${BASE_URL}/api/v1/predict-spending/explain?${sp.toString()}`,
    { headers: apiHeaders() }
  );
  return handleResponse<ExplainResponse>(res);
}

export async function postSegment(
  body: Record<string, number | string>[]
): Promise<SegmentResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/segment`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<SegmentResponse>(res);
}

export async function postRecommendations(
  body: RecommendationRequest
): Promise<RecommendationResponse> {
  const res = await fetch(
    `${BASE_URL}/api/v1/recommendations/natural`,
    {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(body),
    }
  );
  return handleResponse<RecommendationResponse>(res);
}

export async function getDrift(): Promise<DriftResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/drift`, {
    headers: apiHeaders(),
  });
  return handleResponse<DriftResponse>(res);
}

export async function postSaveBaseline(): Promise<SaveBaselineResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/drift/save-baseline`, {
    method: "POST",
    headers: apiHeaders(),
  });
  return handleResponse<SaveBaselineResponse>(res);
}

export async function postReport(
  body: ReportRequest
): Promise<ReportResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/reports/generate`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<ReportResponse>(res);
}

export async function getAudit(
  params: AuditParams
): Promise<AuditResponse> {
  const sp = new URLSearchParams();
  if (params.table_name) sp.set("table_name", params.table_name);
  if (params.record_id) sp.set("record_id", params.record_id);
  if (params.limit) sp.set("limit", String(params.limit));
  const res = await fetch(
    `${BASE_URL}/api/v1/audit-log?${sp.toString()}`,
    { headers: apiHeaders() }
  );
  return handleResponse<AuditResponse>(res);
}

export async function postConsent(
  body: ConsentRequest
): Promise<ConsentRegisterResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/consent/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<ConsentRegisterResponse>(res);
}

export async function getConsent(
  customerId: string,
  consentType?: string
): Promise<ConsentResponse> {
  const sp = new URLSearchParams();
  if (consentType) sp.set("consent_type", consentType);
  const res = await fetch(
    `${BASE_URL}/api/v1/consent/${customerId}?${sp.toString()}`
  );
  return handleResponse<ConsentResponse>(res);
}
