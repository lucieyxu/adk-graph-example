FROM ghcr.io/astral-sh/uv:python3.13-alpine
ARG ENV
ENV ENV=$ENV
WORKDIR /app
COPY . .
WORKDIR /app/jobs/py-example
RUN uv sync

# RUN via gunicorn for prod and staging
CMD ["uv", "run", "src/main.py"]