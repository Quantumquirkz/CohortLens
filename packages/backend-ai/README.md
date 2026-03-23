# CohortLens Backend AI

Servicio de análisis de cohortes con FastAPI y scikit-learn.

## Requisitos

- Python 3.11+
- Dependencias listadas en `requirements.txt`

## Desarrollo local

```bash
python -m venv venv
source venv/bin/activate  # o venv\Scripts\activate en Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Docker

```bash
docker build -t cohortlens-backend .
docker run -p 8000:8000 cohortlens-backend
```

O desde la raíz del monorepo:

```bash
docker compose up --build backend-ai
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Verificar estado |
| POST | `/api/v1/cohorts/discover` | Descubrir cohortes |

## Próximos pasos

- Integrar datos reales de blockchain vía subgraph
- Añadir autenticación y rate limiting
- Conectar con contratos inteligentes
