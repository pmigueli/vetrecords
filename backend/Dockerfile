FROM python:3.12-slim AS base

RUN useradd --create-home --shell /bin/bash appuser

FROM base AS builder

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

FROM base AS production

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /home/appuser

COPY ./app ./app

RUN mkdir -p data uploads && chown -R appuser:appuser /home/appuser

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
