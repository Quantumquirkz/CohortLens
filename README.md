# CodeCrafters United - CohortLens

<p align="center">
  <img src="https://github.com/Jhuomar-Barria/CodeCrafters-United/assets/124087234/47b596cc-1d13-48e3-a037-25b02a846265" alt="CodeCrafters United">
</p>

A modular CRM analytics platform for customer segmentation, spending prediction, and actionable insights. Transform customer data into decisions with reproducible pipelines, REST APIs, and executive reports.

## Installation

### Prerequisites

- Python 3.9 or higher
- pip

### Step-by-step

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jhuomar-Barria/CodeCrafters-United.git
   cd CodeCrafters-United
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -e .
   pip install -r requirements.txt
   ```

4. **Place dataset**
   - Download [Customers Dataset](https://www.kaggle.com/datasets/datascientistanna/customers-dataset) from Kaggle
   - Save `Customers.csv` in `data/raw/`

5. **Optional: configure environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

## Quick Start

```bash
cohortlens run
```

This loads data, segments customers, trains a spending predictor, and generates an executive report.

## Usage

### CLI

```bash
cohortlens run                    # Full pipeline
cohortlens segment --data-path data/raw/Customers.csv
cohortlens predict
cohortlens report --output reports/executive_report.html
cohortlens serve                  # Start REST API
streamlit run src/scripts/dashboard.py  # Start dashboard
```

### Python API

```python
from cohort_lens.data import load_customers, clean_customers
from cohort_lens.features import fit_segments, train_predictor

df = load_customers()
df = clean_customers(df)
df_segmented, model, scaler = fit_segments(df, n_clusters=6)
```

## Project Structure

```
├── config/config.yaml
├── data/raw/              # Place Customers.csv here
├── data/processed/
├── src/cohort_lens/     # Main package
├── src/scripts/           # Dashboard
├── src/tests/
├── reports/
├── docs/
└── deployment/
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Plan history](docs/history/PLAN1.md)

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
