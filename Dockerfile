# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.4.4

FROM oven/bun:${BUN_VERSION}-debian@sha256:93d5032fe06d163427822dc1598f420363759bb18155c9cc90eb1be05a64a19e AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build \
 && bun build dist/server/index.mjs \
      --target=bun \
      --outfile=dist/server/index.bundle.mjs

FROM oven/bun:${BUN_VERSION}-distroless@sha256:153a951ae40106e125898103e6e990ee0f38e6aee7f561029e26cf9fbed23470 AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOME=/tmp \
    TMPDIR=/tmp \
    TZ=UTC \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=0

COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/dist/server/index.bundle.mjs ./dist/server/index.bundle.mjs

USER 65532:65532
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/bun"]
CMD ["dist/server/index.bundle.mjs"]
