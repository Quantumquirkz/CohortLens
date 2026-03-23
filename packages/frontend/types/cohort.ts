/** Mirrors packages/backend-ai/app/schemas/cohort.py */

export type CohortCenter = Record<string, number>;

export interface Cohort {
  id: number;
  size: number;
  center: CohortCenter;
  users?: unknown;
}

export interface CohortDiscoverRequest {
  protocol: string;
  start_block: number;
  end_block: number;
  num_clusters: number;
  features?: string[];
}

export interface CohortResponse {
  cohorts: Cohort[];
  total_users: number;
  oracle_request_id?: number | null;
  oracle_tx_hash?: string | null;
}
