export type RiskClientProfile = "exchange" | "dapp" | "custody";

export type RiskCaseStatus =
  | "open"
  | "in_review"
  | "resolved"
  | "false_positive";

export interface RiskScreenRequest {
  chain_id: string;
  address: string;
  client_profile?: RiskClientProfile;
  correlation_id?: string;
  options?: {
    max_latency_ms?: number;
    include_graph_hints?: boolean;
  };
}

export interface RiskScreenResponse {
  correlation_id: string;
  decision_id: string | null;
  chain_id: string;
  address: string;
  risk_score: number;
  severity: string;
  recommended_action: string;
  model_version: string;
  ruleset_version: string;
  computed_at: string;
  risk_reasons: Record<string, unknown>[];
  evidence: Record<string, unknown>;
  latency_ms: number;
  degraded: boolean;
}

export interface RiskCaseSummary {
  id: string;
  chain_id: string;
  address: string;
  status: string;
  analyst_label: string | null;
  latest_decision_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskCaseNote {
  id: string;
  author: string;
  body: string;
  created_at: string;
}

export interface RiskCaseDetail extends RiskCaseSummary {
  notes: RiskCaseNote[];
}

export interface RiskGraphMvp {
  nodes: { id: string; label: string; kind: string }[];
  edges: { source: string; target: string; kind: string }[];
  decision_id: string;
}
