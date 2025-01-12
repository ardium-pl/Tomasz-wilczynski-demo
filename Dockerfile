# Use the full Node.js image instead of slim
FROM node:18.17.0

# Set the working directory for the backend
WORKDIR /app/server

# Copy backend package.json and package-lock.json
COPY server/package*.json ./

# Install backend dependencies
RUN npm install --production && \
    npm install @grpc/grpc-js@latest @google-cloud/vision@latest tsx

# Copy the backend source code
COPY server ./

# Install poppler-utils for PDF processing
RUN apt-get update && apt-get install -y poppler-utils

# Set the working directory for the frontend
WORKDIR /app/client

# Copy frontend package.json and package-lock.json
COPY client/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the frontend source code
COPY client ./

# Build the Angular application
RUN npm run build -- --output-path=dist

# Move back to the root working directory to start the app
WORKDIR /app

# Expose the necessary ports
EXPOSE 8080 4200

# Set up the startup command to run both the backend and serve the frontend
CMD ["sh", "-c", "npx tsx backend/index.ts & npx http-server frontend/dist -p 4200"]
