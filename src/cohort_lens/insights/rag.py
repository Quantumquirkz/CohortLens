"""RAG (Retrieval-Augmented Generation) for natural language recommendations."""

import os
from typing import Optional

from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def get_natural_recommendation(
    query: str,
    context: Optional[dict] = None,
) -> str:
    """
    Generate a natural language recommendation using RAG.
    Uses OpenAI/Anthropic if API key is set; otherwise returns rule-based fallback.
    """
    openai_key = os.environ.get("OPENAI_API_KEY")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    if openai_key:
        return _recommend_openai(query, context, openai_key)
    if anthropic_key:
        return _recommend_anthropic(query, context, anthropic_key)
    return _fallback_recommendation(query, context)


def _fallback_recommendation(query: str, context: Optional[dict]) -> str:
    """Rule-based fallback when no LLM is configured."""
    q = query.lower()
    if "segment" in q or "cluster" in q:
        return (
            "Segmentación: Los clientes se agrupan por edad, ingresos y puntuación de gasto. "
            "Use el endpoint /api/v1/segment para clasificar clientes en lotes."
        )
    if "predict" in q or "gasto" in q or "spending" in q:
        return (
            "Predicción de gasto: Use POST /api/v1/predict-spending con edad, ingresos, "
            "experiencia laboral, tamaño familiar y profesión para obtener una predicción."
        )
    if "recomend" in q or "recommend" in q:
        return (
            "Recomendaciones: Consulte los segmentos de ahorro con compute_savings_metrics. "
            "Los clientes de alto gasto se benefician de programas de lealtad; "
            "los de alto ingreso, de upselling premium."
        )
    return (
        "CohortLens ofrece segmentación de clientes, predicción de gasto e insights. "
        "Pregunte por segmentación, predicción o recomendaciones para más detalles."
    )


def _recommend_openai(query: str, context: Optional[dict], api_key: str) -> str:
    """Use OpenAI for RAG-based recommendation."""
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        ctx = str(context or "")
        prompt = (
            f"Eres un asistente de CRM. El usuario pregunta: {query}\n"
            f"Contexto del CRM (segmentos, métricas): {ctx}\n"
            "Responde en 2-3 frases con una recomendación práctica."
        )
        resp = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.warning("OpenAI RAG failed: %s", e)
        return _fallback_recommendation(query, context)


def _recommend_anthropic(query: str, context: Optional[dict], api_key: str) -> str:
    """Use Anthropic for RAG-based recommendation."""
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        ctx = str(context or "")
        msg = client.messages.create(
            model=os.environ.get("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
            max_tokens=150,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Eres un asistente de CRM. Pregunta: {query}\n"
                        f"Contexto: {ctx}\n"
                        "Responde en 2-3 frases con una recomendación práctica."
                    ),
                }
            ],
        )
        return msg.content[0].text.strip()
    except Exception as e:
        logger.warning("Anthropic RAG failed: %s", e)
        return _fallback_recommendation(query, context)
