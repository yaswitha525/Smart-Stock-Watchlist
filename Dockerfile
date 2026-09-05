# ==============================================================================
# STAGE 1: Build Client Static Assets (React + TypeScript + Tailwind)
# ==============================================================================
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci --strict-ssl=false

COPY client/ ./
RUN npm run build

# ==============================================================================
# STAGE 2: Build Backend Server (TypeScript -> JavaScript)
# ==============================================================================
FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm ci --strict-ssl=false

COPY tsconfig.json ./
COPY src/ ./src/
RUN npx prisma generate
RUN npx tsc

# ==============================================================================
# STAGE 3: Production Runtime Image
# ==============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for docker healthcheck
RUN apk add --no-cache curl

COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm ci --only=production --strict-ssl=false
RUN npx prisma generate

# Copy compiled backend code & static client assets
COPY --from=backend-builder /app/dist ./dist
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
