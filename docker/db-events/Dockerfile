FROM node:21-buster as builder

WORKDIR /build

COPY . .

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn  yarn install

FROM builder as db-events

WORKDIR /build/docer/db-events

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn  yarn install

FROM node:21-alpine

WORKDIR /app

RUN mkdir -p config
VOLUME config

COPY --from=db-events /build/docker/db-events .

# Start the application
CMD ["node", "index"]