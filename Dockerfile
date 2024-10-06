# Use the full Node.js image instead of slim
FROM node:18.17.0

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies, including @grpc/grpc-js and @google-cloud/vision
RUN npm install --production && \
    npm install @grpc/grpc-js@latest @google-cloud/vision@latest tsx

# Copy the rest of the application
COPY . .

# Install poppler-utils for PDF processing
RUN apt-get update && apt-get install -y poppler-utils

# Expose port 3000
EXPOSE 8080

# Set the startup command to use tsx for running the TypeScript file
CMD ["npx", "tsx", "index.ts"]
