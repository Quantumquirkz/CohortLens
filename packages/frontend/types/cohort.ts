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
  /** Logical chain (e.g. polygon, ethereum); must exist in backend CHAINS_JSON */
  chain?: string;
  start_block: number;
  end_block: number;
  num_clusters: number;
  features?: string[];
  /** User-paid requestPrediction tx when backend REQUIRE_LENS_PAYMENT_FOR_DISCOVER */
  payment_tx_hash?: string | null;
  payment_requester?: string | null;
}

export interface CohortResponse {
  cohorts: Cohort[];
  total_users: number;
  oracle_request_id?: number | null;
  oracle_tx_hash?: string | null;
}
