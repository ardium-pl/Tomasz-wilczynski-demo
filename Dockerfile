# Use the full Node.js image instead of slim
FROM node:18.19.0

# Set the working directory
# WORKDIR /app

# Copy the root package.json and lock files
COPY package.json ./

# Install root dependencies
RUN npm install -g pnpm && pnpm install

# Copy the entire project directory
COPY . .

# Install poppler-utils for PDF processing
RUN apt-get update && apt-get install -y poppler-utils
RUN pnpm install @grpc/grpc-js@latest @google-cloud/vision@latest tsx 
RUN pnpm add -g @angular/cli
# Build the application

# Use Railway-provided NODE_ENV or default to production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Conditionally run the build command based on the NODE_ENV
RUN if [ "$NODE_ENV" = "production" ]; then pnpm run build; else pnpm run build:dev; fi


# Expose the necessary ports
EXPOSE 8080 

# Set up the startup command
CMD ["pnpm", "start"]
