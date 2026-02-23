# CodeCrafters United - CohortLens

<p align="center">
  <img src="https://github.com/Jhuomar-Barria/CodeCrafters-United/assets/124087234/47b596cc-1d13-48e3-a037-25b02a846265" alt="CodeCrafters United">
</p>

A modular CRM analytics platform for customer segmentation, spending prediction, and actionable insights. Transform customer data into decisions with reproducible pipelines, REST APIs, and executive reports.

> **Note:** This project was previously known as **CRM Navigator**. Project stewardship is now under [Jhuomar Boskoll Quintero](https://www.linkedin.com/in/jhuomar/).

## Installation

### Prerequisites

- Python 3.9+
- Node 18+ and pnpm (for the frontend)
- pip

### Step by step

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jhuomar-Barria/CodeCrafters-United.git
   cd CodeCrafters-United
   ```

2. **Virtual environment and install API (backend)**
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r apps/api/requirements.txt
   pip install -e apps/api
   ```

3. **Frontend (optional)**
   ```bash
   pnpm install
   pnpm --filter @cohortlens/web dev
   ```
   The web app lives in `apps/web/`; frontend implementation is done separately.

4. **Data**
   - Download [Customers Dataset](https://www.kaggle.com/datasets/datascientistanna/customers-dataset)
   - Place `Customers.csv` in `data/raw/`

5. **Environment variables**
   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```

## Quick Start

```bash
cohortlens run
```

Loads data, segments customers, trains the predictor, and generates the report. Or run the API: `cd apps/api && uvicorn main:app --reload`.

## Usage

### CLI

```bash
cohortlens run                    # Full pipeline
cohortlens segment --data-path data/raw/Customers.csv
cohortlens predict
cohortlens report --output reports/executive_report.html
cohortlens serve                  # Start REST API
streamlit run scripts/dashboard.py  # Start dashboard
```

### Python API

```python
from cohort_lens.data import load_customers, clean_customers
from cohort_lens.features import fit_segments, train_predictor

df = load_customers()
df = clean_customers(df)
df_segmented, model, scaler = fit_segments(df, n_clusters=6)
```

## Project structure

Monorepo: frontend in `apps/web/` (Next.js 14+, Vercel) and backend in `apps/api/` (FastAPI).

```
├── apps/
│   ├── web/          # Next.js 14+ (frontend; implementation separate)
│   └── api/          # FastAPI + cohort_lens package
├── packages/         # ui, config, types (shared)
├── config/
├── scripts/
├── tests/unit/
├── deployment/
└── docs/
```

## Documentation

- [What is CohortLens (product and SaaS)](docs/product.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Backend step by step](docs/backend.md) – entry points, config, data, segmentation, prediction, API, auth, usage, pipeline

## Team - CodeCrafters United

| Role | Name | Profession |
|------|------|------------|
| Backend | Cesar Prens | Software Developer and Cybersecurity Technician |
| Backend | Emily Morales | Computer and Systems Engineering |
| Backend | Jhuomar Barría | Computer and Systems Engineering |
| Design | Ana Zárate | Industrial Engineering and Medicine |
| Design | Victoria Vargas | Management Information Systems Engineering |

## License

MIT License. See [LICENSE](LICENSE).
