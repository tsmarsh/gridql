FROM node:21.5-alpine

WORKDIR /app

EXPOSE 3033

COPY . .

RUN yarn install --production

CMD ["npm", "start"]