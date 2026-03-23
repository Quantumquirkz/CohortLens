import { API_BASE_URL } from "./api";

export function modelsListUrl(syncChain = false): string {
  const q = syncChain ? "?sync_chain=true" : "";
  return `${API_BASE_URL}/api/v1/models${q}`;
}

export function modelPredictUrl(
  modelId: number,
  options?: { asyncMode?: boolean },
): string {
  const params = new URLSearchParams();
  if (options?.asyncMode) {
    params.set("async_mode", "true");
  }
  const q = params.toString();
  return `${API_BASE_URL}/api/v1/models/${modelId}/predict${q ? `?${q}` : ""}`;
}

export function predictionStatusUrl(taskId: string): string {
  return `${API_BASE_URL}/api/v1/models/predictions/${taskId}`;
}

export function authNonceUrl(): string {
  return `${API_BASE_URL}/api/v1/auth/nonce`;
}
