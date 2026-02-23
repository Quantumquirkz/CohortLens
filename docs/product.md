# What is CohortLens

CohortLens is a **customer analytics SaaS platform**: segmentation, spending prediction, and actionable recommendations. Built for teams that want to understand and act on their customer base without running their own data infrastructure.

## What it does

1. **Segments customers**  
   Groups by behavior (income, spending, age, etc.) with clustering (KMeans, GMM, DBSCAN). Segments are used for campaigns and strategy.

2. **Predicts spending**  
   Estimates spending or score per customer. Includes explanations (SHAP) to see which factors matter most.

3. **Recommends actions**  
   Savings metrics per customer and recommendations per segment. Optionally natural-language recommendations (RAG with LLM).

4. **Reports**  
   Executive reports in HTML or PDF (charts, segments, metrics).

## How it works as a SaaS

- **Login** with username/password (JWT). Each account can be multi-tenant (multiple teams/companies).
- **Dashboard** to view segments, predictions, and reports.
- **API** to integrate with other systems: segment, predict, and get recommendations via REST or GraphQL.
- **Plans** (basic / professional / enterprise) with API call and customer limits; billing can be managed with Stripe.
- **Data** from CSV or Neon (PostgreSQL); results can be stored and audited.

## Who it is for

Marketing, product, or business teams that need to:
- Understand how their customers behave.
- Predict spending or value.
- Automate reports and recommendations.
- Expose analytics via API with usage and plan controls.

In short: **customer analytics ready to use as a service**, with a frontend (dashboard), API, and subscription model.
