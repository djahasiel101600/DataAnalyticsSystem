FROM node:22-alpine AS frontend-build

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_GOOGLE_API_KEY=""
ARG VITE_GOOGLE_APP_ID=""
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_API_KEY=${VITE_GOOGLE_API_KEY}
ENV VITE_GOOGLE_APP_ID=${VITE_GOOGLE_APP_ID}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY --from=frontend-build /build/frontend/dist/ /app/frontend/dist/

RUN groupadd --system app \
    && useradd --system --gid app --home-dir /home/app --create-home app \
    && cd /app/backend \
    && DJANGO_DEBUG=0 DJANGO_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')" \
       python manage.py collectstatic --noinput

WORKDIR /app/backend
USER app

EXPOSE 8090

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8090", "--workers", "2", "--timeout", "120"]
