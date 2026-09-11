# Builder stage: install dependencies and prepare source for downstream stages.
FROM node:24-alpine AS builder
WORKDIR /app
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm clean-install
COPY dashboard/ ./

# Dev stage: run Vite dev server from builder dependencies.
FROM builder AS dev
EXPOSE 5173
CMD ["sh", "-c", "[ -x node_modules/.bin/vite ] || npm ci; npm run dev -- --host 0.0.0.0 --port 5173"]

# Build stage: compile production-ready frontend assets.
FROM builder AS build
ARG APP_VERSION=0.0.0-unknown
RUN echo "${APP_VERSION}" > .app-version
RUN npm run build

# Service stage: serve compiled static assets with nginx.
FROM nginx:1.27-alpine AS service
ARG APP_VERSION=0.0.0-unknown
# Set sensible defaults so standalone image can run without Compose.
# These can be overridden at docker run time via -e flag.
ENV SIMDB_SERVER_URL=/scenarios/api \
    API_HOST=host.docker.internal \
    API_PORT=5000 \
    SERVER_CONF=server-http.conf
LABEL org.opencontainers.image.title="SimDB Dashboard" \
      org.opencontainers.image.description="Web frontend for the SimDB simulation management tool" \
      org.opencontainers.image.source="https://github.com/iterorganization/SimDB-Dashboard" \
      org.opencontainers.image.licenses="LGPL-3.0-only" \
      org.opencontainers.image.version="${APP_VERSION}" \
      io.simdb.component="dashboard"
COPY docker/nginx/templates/ /etc/nginx/templates/
COPY docker/nginx/entrypoint/ /docker-entrypoint.d/
COPY docker/nginx/tls/ /etc/nginx/tls/
RUN chmod +x /docker-entrypoint.d/*.sh
# App expects itself at urlpath /dashboard
COPY --from=build /app/dist /usr/share/nginx/html/dashboard
# NOTE: nginx base image already exposes port 80:
EXPOSE 80
# HTTPS service at port 443 (only utilized when SERVER_CONF=server-https.conf)
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
