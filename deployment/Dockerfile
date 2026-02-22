FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt setup.py ./
COPY src/ ./src/
COPY config/ ./config/
RUN pip install --no-cache-dir -e .
EXPOSE 8000
CMD ["cohortlens", "serve", "--host", "0.0.0.0", "--port", "8000"]
