# syntax=docker/dockerfile:1
# Production images for the API and the web app, built from the whole workspace.
# Build: docker compose -f compose.prod.yaml build (see docs/deploiement.md)

FROM node:24.21.0-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    npm_config_verify_deps_before_run=false \
    PATH=/pnpm:$PATH
# Optional extra CA for builds behind a TLS-inspecting proxy:
#   docker build --secret id=extra_ca,src=/path/to/ca.pem ...
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=$([ -f /run/secrets/extra_ca ] && echo /run/secrets/extra_ca) \
    npm install --global pnpm@12.10.1
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/content/package.json packages/content/
COPY packages/db/package.json packages/db/
COPY packages/evals/package.json packages/evals/
COPY packages/examiner/package.json packages/examiner/
COPY packages/llm/package.json packages/llm/
COPY packages/shared/package.json packages/shared/
# Scripts are skipped: no .env file or git hooks belong in an image.
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=$([ -f /run/secrets/extra_ca ] && echo /run/secrets/extra_ca) \
    pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN --mount=type=secret,id=extra_ca,required=false \
    export NODE_EXTRA_CA_CERTS=$([ -f /run/secrets/extra_ca ] && echo /run/secrets/extra_ca); \
    rm -f .env && pnpm --filter @kompri/db generate
# next.config validates API_URL at build time; the runtime value comes from compose.
ARG API_URL=http://api:3001
RUN API_URL=$API_URL pnpm --filter @kompri/web build

FROM build AS api
ENV NODE_ENV=production API_HOST=0.0.0.0 API_PORT=3001
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/health || exit 1
WORKDIR /app/apps/api
CMD ["node", "--import", "tsx", "src/main.ts"]

FROM build AS web
ENV NODE_ENV=production
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1
WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
