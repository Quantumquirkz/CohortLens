# CohortLens - Architecture

## Module Structure

| Module | Path | Description |
|--------|------|-------------|
| Loader | `data/loader.py` | Load CSV, validate schema with pandera |
| Preprocessor | `data/preprocessor.py` | Clean (drop nulls, duplicates), encode for prediction |
| Schemas | `data/schemas.py` | Pandera validation schemas |
| Segmentation | `features/segmentation.py` | KMeans, GMM, DBSCAN clustering |
| Prediction | `features/prediction.py` | LinearRegression, RandomForest with pipeline |
| Plots | `visualization/plots.py` | Reusable visualization functions |
| Reports | `visualization/reports.py` | HTML executive report generation |
| Analyzer | `insights/analyzer.py` | Descriptive stats, correlation matrix |
| Recommender | `insights/recommender.py` | Savings metrics, segment recommendations |
| Config | `utils/config_reader.py` | YAML config loader |
| Logger | `utils/logger.py` | Structured logging |
| Pipeline | `pipeline.py` | Orchestrates full analytics flow |
| CLI | `api/cli.py` | Click-based command-line interface |
| REST API | `api/rest_api.py` | FastAPI endpoints |

## Data Flow

```
Load (loader) -> Clean (preprocessor) -> Segment (segmentation)
                                    -> Predict (prediction)
                                    -> Analyze (analyzer)
                                    -> Recommend (recommender)
                                    -> Report (reports)
```

## Package Layout

```
src/cohort_lens/
├── api/           # CLI, REST API
├── data/          # Loader, preprocessor, schemas
├── features/      # Segmentation, prediction
├── insights/      # Analyzer, recommender
├── utils/         # Config, logger
├── visualization/ # Plots, reports
├── cli.py         # Entry point
└── pipeline.py    # Main pipeline
```
