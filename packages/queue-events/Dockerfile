FROM node:21-bookworm as builder

WORKDIR /build

COPY . .

RUN yarn install

FROM builder as queue-events

WORKDIR /build/docker/queue-events

RUN yarn install

FROM node:21-alpine

WORKDIR /app

RUN mkdir -p config

COPY --from=queue-events /build/docker/queue-events .

# Start the application
CMD ["node", "index"]