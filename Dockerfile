# syntax=docker/dockerfile:1
# Dockerfile cho BanCo (Next.js + custom server Socket.IO chạy bằng tsx).
# Dùng cho Coolify: chọn Build Pack = Dockerfile.

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1) Cài toàn bộ dependencies (gồm dev) để build
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build Next.js (.next)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Cài chỉ dependencies production (đã có tsx vì là runtime)
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 4) Image chạy
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# Chạy bằng user không phải root
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY server.ts tsconfig.json next.config.js package.json ./
COPY src ./src

USER nextjs
EXPOSE 3000
CMD ["node_modules/.bin/tsx", "server.ts"]
