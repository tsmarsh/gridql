# Use the official Node.js image as the base
FROM node:20-buster as builder

WORKDIR /build

COPY . .

RUN yarn install

WORKDIR /build/docker/gridql

RUN yarn install


FROM node:20-alpine

WORKDIR /app

VOLUME config

# Expose the port that the application listens on
EXPOSE 3000

COPY --from=builder /build/docker/gridql .


# Start the application
CMD ["npm", "start"]