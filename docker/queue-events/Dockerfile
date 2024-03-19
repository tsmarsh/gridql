FROM node:21-alpine

WORKDIR /app

COPY . .

RUN yarn install --production

# Start the application
CMD ["node", "index"]