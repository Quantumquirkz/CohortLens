/** List and detail for lenses (models) from the API. */
export type LensPublic = {
  id: number;
  owner: string;
  name: string;
  description: string;
  model_hash: string;
  hf_repo_id?: string | null;
  price_per_query_wei: number;
  model_format: string;
  model_type: string;
  active: boolean;
};

export type PredictResponse = {
  lens_id: number;
  result: Record<string, unknown>;
  task_id?: string | null;
  async_mode: boolean;
};

export type PredictTaskStatus = {
  task_id: string;
  state: string;
  result: Record<string, unknown> | null;
};
