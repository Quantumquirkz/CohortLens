"""GraphQL read-only endpoint mounted on /graphql."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, Request
from graphql import parse
from strawberry.fastapi import GraphQLRouter

from app.core.config import settings
from app.db.session import SessionLocal
from app.graphql.schema import schema


def _estimate_depth(query: str) -> int:
    doc = parse(query)
    max_depth = 0

    def walk(selection_set: Any, depth: int) -> None:
        nonlocal max_depth
        max_depth = max(max_depth, depth)
        if not selection_set:
            return
        for sel in selection_set.selections:
            child = getattr(sel, "selection_set", None)
            if child:
                walk(child, depth + 1)

    for definition in doc.definitions:
        ss = getattr(definition, "selection_set", None)
        if ss:
            walk(ss, 1)
    return max_depth


def _count_aliases(query: str) -> int:
    doc = parse(query)
    aliases = 0
    for definition in doc.definitions:
        ss = getattr(definition, "selection_set", None)
        if not ss:
            continue
        stack = [ss]
        while stack:
            node = stack.pop()
            for sel in node.selections:
                if getattr(sel, "alias", None) is not None:
                    aliases += 1
                child = getattr(sel, "selection_set", None)
                if child:
                    stack.append(child)
    return aliases


async def guarded_context(request: Request):
    if not settings.GRAPHQL_ENABLED:
        raise HTTPException(status_code=404, detail="GraphQL is disabled")

    payload = await request.json()
    query = payload.get("query") if isinstance(payload, dict) else ""
    if isinstance(query, str) and query.strip():
        if not settings.GRAPHQL_INTROSPECTION and ("__schema" in query or "__type" in query):
            raise HTTPException(status_code=400, detail="GraphQL introspection is disabled")
        try:
            depth = _estimate_depth(query)
            aliases = _count_aliases(query)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=f"Invalid GraphQL query: {e}") from e
        if depth > settings.GRAPHQL_MAX_DEPTH:
            raise HTTPException(
                status_code=400,
                detail=f"GraphQL depth limit exceeded ({depth}>{settings.GRAPHQL_MAX_DEPTH})",
            )
        if aliases > settings.GRAPHQL_MAX_ALIASES:
            raise HTTPException(
                status_code=400,
                detail=f"GraphQL alias limit exceeded ({aliases}>{settings.GRAPHQL_MAX_ALIASES})",
            )

    db = SessionLocal()
    try:
        yield {"db": db}
    finally:
        db.close()


router = GraphQLRouter(
    schema,
    path="/graphql",
    context_getter=Depends(guarded_context),
    graphiql=settings.GRAPHQL_INTROSPECTION,
    allow_queries_via_get=False,
)

