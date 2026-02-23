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
            "Segmentation: Customers are grouped by age, income and spending score. "
            "Use the /api/v1/segment endpoint to classify customers in batches."
        )
    if "predict" in q or "spending" in q:
        return (
            "Spending prediction: Use POST /api/v1/predict-spending with age, income, "
            "work experience, family size and profession to get a prediction."
        )
    if "recomend" in q or "recommend" in q:
        return (
            "Recommendations: Check savings segments with compute_savings_metrics. "
            "High-spending customers benefit from loyalty programs; "
            "high-income ones from premium upselling."
        )
    return (
        "CohortLens provides customer segmentation, spending prediction and insights. "
        "Ask about segmentation, prediction or recommendations for more details."
    )


def _recommend_openai(query: str, context: Optional[dict], api_key: str) -> str:
    """Use OpenAI for RAG-based recommendation."""
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        ctx = str(context or "")
        prompt = (
            f"You are a CRM assistant. The user asks: {query}\n"
            f"CRM context (segments, metrics): {ctx}\n"
            "Reply in 2-3 sentences with a practical recommendation."
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
                        f"You are a CRM assistant. Question: {query}\n"
                        f"Context: {ctx}\n"
                        "Reply in 2-3 sentences with a practical recommendation."
                    ),
                }
            ],
        )
        return msg.content[0].text.strip()
    except Exception as e:
        logger.warning("Anthropic RAG failed: %s", e)
        return _fallback_recommendation(query, context)
