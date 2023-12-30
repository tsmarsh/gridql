FROM node:21.5-bookworm as builder

WORKDIR /build

COPY . .

#RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn  yarn install
RUN yarn install

FROM builder as gridql-builder

WORKDIR /build/docker/gridql

RUN yarn install

FROM node:21-alpine

WORKDIR /app

# Expose the port that the application listens on
EXPOSE 3000

COPY --from=gridql-builder /build/docker/gridql .


# Start the application
CMD ["npm", "start"]