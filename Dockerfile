# Multi-stage build for TypeScript Node.js API
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files first
COPY --from=builder /app/package*.json ./

# Install production dependencies (this will compile native modules for Alpine)
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8000

# Start the application
CMD ["node", "dist/main.js"]
