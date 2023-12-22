FROM node:21-buster as builder

WORKDIR /build

COPY . .

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn  yarn install

FROM builder as gridql-builder

WORKDIR /build/docker/gridql

RUN yarn install

FROM node:21-alpine

WORKDIR /app

VOLUME config

# Expose the port that the application listens on
EXPOSE 3000

COPY --from=gridql-builder /build/docker/gridql .


# Start the application
CMD ["npm", "start"]