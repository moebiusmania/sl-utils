# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.4.4

FROM oven/bun:${BUN_VERSION}-debian AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build \
 && bun build dist/server/index.mjs \
      --target=bun \
      --outfile=dist/server/index.bundle.mjs

FROM oven/bun:${BUN_VERSION}-distroless AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOME=/tmp \
    TMPDIR=/tmp \
    TZ=UTC \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=0

COPY --from=build --chown=65532:65532 /app/dist/client ./dist/client
COPY --from=build --chown=65532:65532 /app/dist/server/index.bundle.mjs ./dist/server/index.bundle.mjs

USER 65532:65532
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/bun"]
CMD ["dist/server/index.bundle.mjs"]
