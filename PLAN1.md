# Plan1: estrategia de mejora para CRM Navigator

## Resumen
Este plan propone una ruta clara para llevar el proyecto a un nivel
reproducible, mantenible y orientado a resultados. El enfoque es:
1) ordenar la base del proyecto, 2) modularizar el codigo, 3) mejorar
el analisis y los modelos, y 4) transformar los hallazgos en entregables
accionables.

## Diagnostico rapido (estado actual)
- Scripts lineales sin funciones reutilizables.
- Carga de datos repetida con rutas sueltas.
- No hay estructura de carpetas para data, reportes o codigo.
- Falta de instrucciones de instalacion y ejecucion.
- Sin validacion de datos, pruebas o trazabilidad de modelos.

## Objetivos
1. Reproducibilidad: correr el pipeline desde cero con un solo comando.
2. Calidad: validar datos de entrada y documentar supuestos.
3. Escalabilidad: separar EDA, features, modelado y reporting.
4. Accion: convertir resultados en recomendaciones medibles.

## Estrategia general
- Estandarizar estructura y configuracion.
- Convertir scripts en modulos con funciones claras.
- Centralizar la carga y limpieza de datos.
- Medir y registrar metricas clave.
- Documentar hallazgos y decisiones.

## Plan1 (iteracion inicial)
### Fase 0: Base del proyecto (1-2 dias)
- Crear estructura de carpetas:
  - data/raw, data/processed
  - src/crm_navigator
  - notebooks
  - reports/figures
- Definir un archivo `requirements.txt` para dependencias.
- Crear `config.yaml` con rutas y parametros (seed, columnas, etc.).
- Agregar guia de instalacion y ejecucion en README.

### Fase 1: Modularizacion (3-5 dias)
- Crear `src/crm_navigator/data.py` con:
  - `load_customers(path)`
  - `clean_customers(df)` (nulos, duplicados, tipos)
- Crear `src/crm_navigator/features.py` para features comunes.
- Crear `src/crm_navigator/visuals.py` con graficos reutilizables.
- Convertir scripts actuales a modulos que llamen estas funciones.

### Fase 2: Modelado y evaluacion (3-5 dias)
- Baseline de segmentacion con KMeans (k optimo con silhouette).
- Baseline de regresion con CV y metricas (MSE, MAE, R2).
- Guardar resultados en `reports/` y `reports/figures/`.

### Fase 3: Reporting y accion (2-4 dias)
- Reporte ejecutivo con:
  - perfiles por segmento
  - drivers del gasto
  - recomendaciones por segmento
- Checklist de accion para marketing/ventas.

## Entregables del Plan1
- README actualizado con instrucciones.
- Estructura estandar de carpetas.
- Modulos base en `src/` y scripts de pipeline.
- Reportes reproducibles con metricas.

## Criterios de exito
- Pipeline corre sin errores con un comando.
- Resultados reproducibles (seed fijo y config central).
- Reportes claros para decisiones de negocio.

## Proximos pasos inmediatos (48h)
- [ ] Definir estructura de carpetas.
- [ ] Agregar requirements.txt.
- [ ] Documentar ruta de datos y ejecucion.
- [ ] Empezar a modularizar carga/limpieza.
