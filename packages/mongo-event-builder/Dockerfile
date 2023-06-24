# Use the official Node.js image as the base
FROM node:20-alpine

WORKDIR /app

RUN mkdir -p config
VOLUME config/environment

COPY package.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code to the working directory
COPY lib ./
COPY index.js ./

# Expose the port that the application listens on
EXPOSE 3000

# Start the application
CMD ["node", "index"]