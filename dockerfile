# ──────────────────────────────────────────────
# Stage 1: Install dependencies
# ──────────────────────────────────────────────
FROM node:25-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ──────────────────────────────────────────────
# Stage 2: Build the application
# ──────────────────────────────────────────────
FROM node:25-alpine AS builder
WORKDIR /app

# Set dummy DATABASE_URL for build time (not used for actual DB connections)
# This is required for Prisma client generation and Next.js build
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/buildtime?schema=public"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# ──────────────────────────────────────────────
# Stage 3: Production runner
# ──────────────────────────────────────────────
FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]

