// ===== API Response Types =====

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  neon_db: string;
  ipfs: string;
}

export interface UsageResponse {
  tenant_id: string;
  current_month_calls: number | string;
}

export interface PredictRequest {
  age: number;
  annual_income: number;
  work_experience: number;
  family_size: number;
  profession?: string;
}

export interface PredictResponse {
  predicted_spending: number;
  confidence: string;
}

export interface ExplainParams {
  age: number;
  annual_income: number;
  work_experience: number;
  family_size: number;
  profession?: string;
}

export interface ExplainResponse {
  feature_importance: Record<string, number>;
}

export interface SegmentRequest {
  data: Record<string, number | string>[];
}

export interface SegmentResponse {
  clusters: number[];
}

export interface RecommendationRequest {
  query: string;
}

export interface RecommendationResponse {
  recommendation: string;
}

export interface DriftFeature {
  psi: number;
  ks_statistic?: number;
  ks_p_value: number;
  drift_detected: boolean;
  current_mean: number;
  baseline_mean: number;
  mean_shift?: number;
}

export interface DriftResponse {
  drift_detected: boolean;
  alerts?: string[];
  features?: Record<string, DriftFeature>;
  message?: string;
}

export interface SaveBaselineResponse {
  status: string;
  baseline_path?: string;
}

export interface ReportRequest {
  metrics: string[];
  figures: string[];
  format: string;
  upload_to_ipfs: boolean;
}

export interface ReportResponse {
  status: string;
  report_id: string;
  output_path: string;
  format: string;
}

export interface AuditParams {
  table_name?: string;
  record_id?: string;
  limit?: number;
}

export interface AuditEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

export interface AuditResponse {
  entries: AuditEntry[];
  count: number;
}

export interface ConsentRequest {
  customer_id: string;
  consent_type: string;
  granted: boolean;
}

export interface ConsentRecord {
  consent_type: string;
  granted: boolean;
  created_at?: string;
}

export interface ConsentResponse {
  consents: ConsentRecord[];
}

export interface ConsentRegisterResponse {
  success: boolean;
}

// ===== Local storage types =====

export interface PredictionHistoryItem {
  inputs: PredictRequest;
  result: PredictResponse;
  timestamp: number;
}

export interface RecommendationHistoryItem {
  query: string;
  recommendation: string;
}
