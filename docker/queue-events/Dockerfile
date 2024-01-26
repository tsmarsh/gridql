FROM node:21-bookworm as builder

WORKDIR /build

COPY . .

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn  yarn install

FROM builder as queue-events

WORKDIR /build/docker/queue-events

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn  yarn install

FROM node:21-alpine

WORKDIR /app

RUN mkdir -p builder

COPY --from=queue-events /build/docker/queue-events .

# Start the application
CMD ["node", "index"]