from __future__ import annotations

import strawberry
from strawberry.fastapi import BaseContext
from strawberry.types import Info

from app.db.session import SessionLocal

from .resolvers import (
    get_dashboard_summary,
    get_home_status,
    get_model,
    get_prediction_task,
    list_models,
)
from .types import (
    DashboardSummaryType,
    HomeStatusType,
    ModelConnectionType,
    ModelType,
    PredictionTaskStatusType,
)


@strawberry.type
class Query:
    @strawberry.field
    def models(
        self,
        info: Info[BaseContext, None],
        q: str | None = None,
        model_type: str | None = None,
        model_format: str | None = None,
        owner: str | None = None,
        active: bool | None = None,
        sort_by: str = "id",
        sort_dir: str = "asc",
        page: int = 1,
        page_size: int = 20,
    ) -> ModelConnectionType:
        db = info.context["db"]
        return list_models(
            db,
            q=q,
            model_type=model_type,
            model_format=model_format,
            owner=owner,
            active=active,
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            page_size=page_size,
        )

    @strawberry.field
    def model(self, info: Info[BaseContext, None], id: int) -> ModelType | None:
        db = info.context["db"]
        return get_model(db, id)

    @strawberry.field
    def home_status(self, info: Info[BaseContext, None]) -> HomeStatusType:
        db = info.context["db"]
        return get_home_status(db)

    @strawberry.field
    async def dashboard_summary(
        self,
        protocol: str,
        chain: str,
        start_block: int,
        end_block: int,
    ) -> DashboardSummaryType:
        return await get_dashboard_summary(
            protocol=protocol,
            chain=chain,
            start_block=start_block,
            end_block=end_block,
        )

    @strawberry.field
    def prediction_task(self, task_id: str) -> PredictionTaskStatusType:
        return get_prediction_task(task_id)


schema = strawberry.Schema(query=Query)


def get_context() -> dict[str, object]:
    db = SessionLocal()
    return {"db": db}

