# Multi-stage production build
FROM node:20-alpine AS builder
WORKDIR /app
# Install dependencies for building
COPY package*.json ./
RUN npm install
# Copy source
COPY . .
# Build
RUN npx tsc --outDir dist

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# ONLY production dependencies
RUN npm install --omit=dev
# Copy built files
COPY --from=builder /app/dist ./dist

# Railway/Render specific
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.js"]
