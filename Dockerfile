# Use the full Node.js image instead of slim
FROM node:18.19.0

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy and install root dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy package.json & lock files for client & server
COPY client/package.json client/pnpm-lock.yaml ./client/
COPY server/package.json server/pnpm-lock.yaml ./server/

# Install dependencies for client
WORKDIR /app/client
RUN pnpm install --frozen-lockfile

# Install dependencies for server
WORKDIR /app/server
RUN pnpm install --frozen-lockfile

# Copy the entire project directory **after installing dependencies**
WORKDIR /app
COPY . .

# Install poppler-utils for PDF processing
RUN apt-get update && apt-get install -y poppler-utils

# Use Railway-provided NODE_ENV or default to production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build based on NODE_ENV
RUN if [ "$NODE_ENV" = "production" ]; then pnpm run build; else pnpm run build:dev; fi

# Expose the necessary ports
EXPOSE 8080 

# Start the application
CMD ["pnpm", "start"]
