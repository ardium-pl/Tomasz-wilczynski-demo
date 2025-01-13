# Use the full Node.js image instead of slim
FROM node:18.19.0

# Set the working directory
WORKDIR /app

# Copy the root package.json and lock files
COPY package.json ./

# Install root dependencies
RUN npm install -g pnpm && pnpm install

# Copy the entire project directory
COPY . .

# Install poppler-utils for PDF processing
RUN apt-get update && apt-get install -y poppler-utils


RUN node -e "require('dotenv').config(); console.log(process.env)"

# Build the application
RUN pnpm run build

# Expose the necessary ports
EXPOSE 8080 

# Set up the startup command
CMD ["pnpm", "start"]
