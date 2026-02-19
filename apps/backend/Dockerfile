# Multi-stage production build (Debian Slim for binary compatibility)
FROM node:20-slim AS builder
WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY . .
RUN npx tsc --outDir dist

# Production stage
FROM node:20-slim
WORKDIR /app

# Install runtime dependencies for mongo-memory-server if needed
RUN apt-get update && apt-get install -y \
    libcurl4 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.js"]
