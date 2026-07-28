FROM ghcr.io/astral-sh/uv:python3.13-alpine
ARG ENV
ENV ENV=$ENV
WORKDIR /app
COPY . .
WORKDIR /app/services/__template_py__
RUN uv sync

# RUN via gunicorn for prod and staging
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]