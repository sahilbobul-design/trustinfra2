# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
# Build TypeScript
RUN npm install -g ts-node typescript
COPY tsconfig.json ./
RUN npx tsc --outDir dist || true
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000
CMD ["node", "dist/index.js"]
