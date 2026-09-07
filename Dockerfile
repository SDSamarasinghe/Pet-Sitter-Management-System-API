# Multi-stage build for TypeScript Node.js API
FROM node:22-alpine AS builder

WORKDIR /app

# Build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code (see .dockerignore - node_modules, dist and .env are excluded)
COPY . .

# Build TypeScript -> dist/main.js
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Needed to compile native modules against Alpine during the install below
RUN apk add --no-cache python3 make g++

# Copy package files first
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Start the application
CMD ["node", "dist/main.js"]
