import { API_BASE_URL } from "./api";

const RISK_KEY = process.env.NEXT_PUBLIC_RISK_API_KEY ?? "";

export function riskHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (RISK_KEY) {
    h["X-Risk-Api-Key"] = RISK_KEY;
  }
  return h;
}

export function riskCasesUrl(params?: {
  status?: string;
  chain_id?: string;
}): string {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.chain_id) q.set("chain_id", params.chain_id);
  const s = q.toString();
  return `${API_BASE_URL}/api/v1/risk/cases${s ? `?${s}` : ""}`;
}

export function riskCaseUrl(caseId: string): string {
  return `${API_BASE_URL}/api/v1/risk/cases/${caseId}`;
}

export function riskCaseGraphUrl(caseId: string): string {
  return `${API_BASE_URL}/api/v1/risk/cases/${caseId}/graph-mvp`;
}

export function riskScreenUrl(): string {
  return `${API_BASE_URL}/api/v1/risk/screen`;
}
