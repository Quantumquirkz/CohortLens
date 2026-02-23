"""RAG (Retrieval-Augmented Generation) for natural language recommendations.

CohortLens uses Groq as the LLM provider for all AI-powered features.
"""

import os
from typing import Optional

from cohort_lens.utils.config_reader import get_config
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def get_natural_recommendation(
    query: str,
    context: Optional[dict] = None,
) -> str:
    """
    Generate a natural language recommendation using RAG with Groq.
    If GROQ_API_KEY is not set, returns a rule-based fallback.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return _fallback_recommendation(query, context)
    return _recommend_groq(query, context, api_key)


def _fallback_recommendation(query: str, context: Optional[dict]) -> str:
    """Rule-based fallback when Groq is not configured (no GROQ_API_KEY)."""
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


def _recommend_groq(query: str, context: Optional[dict], api_key: str) -> str:
    """Use Groq as the LLM for RAG-based recommendations."""
    try:
        from groq import Groq

        cfg = get_config()
        ai_cfg = cfg.get("ai", {})
        model = os.environ.get("GROQ_MODEL") or ai_cfg.get("model", "llama-3.3-70b-versatile")
        max_tokens = ai_cfg.get("max_tokens", 150)
        temperature = ai_cfg.get("temperature", 0.3)

        client = Groq(api_key=api_key)
        ctx = str(context or "")
        prompt = (
            f"You are a CRM assistant. The user asks: {query}\n"
            f"CRM context (segments, metrics): {ctx}\n"
            "Reply in 2-3 sentences with a practical recommendation."
        )
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.warning("Groq RAG failed: %s", e)
        return _fallback_recommendation(query, context)
