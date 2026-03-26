export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function cohortDiscoverUrl(): string {
  return `${API_BASE_URL}/api/v1/cohorts/discover`;
}

export function healthUrl(): string {
  return `${API_BASE_URL}/health`;
}
