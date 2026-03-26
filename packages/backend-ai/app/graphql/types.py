from __future__ import annotations

import strawberry


@strawberry.type
class ModelType:
    id: int
    owner: str
    name: str
    description: str
    model_hash: str
    hf_repo_id: str | None
    price_per_query_wei: int
    model_format: str
    model_type: str
    active: bool


@strawberry.type
class ModelConnectionType:
    items: list[ModelType]
    total: int
    has_next_page: bool
    page: int
    page_size: int


@strawberry.type
class HomeStatusType:
    api_status: str
    models_count: int
    chain_count: int
    default_chain: str
    warnings: list[str]


@strawberry.type
class DashboardSummaryType:
    protocol: str
    chain: str
    start_block: int
    end_block: int
    total_users: int
    total_volume: float
    avg_gas: float
    tx_count: int
    warnings: list[str]


@strawberry.type
class PredictionTaskStatusType:
    task_id: str
    state: str
    result_json: str | None

