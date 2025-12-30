# Stage 1: Base
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Stage 2: Dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --include=dev --legacy-peer-deps

# Stage 3: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 4: Production
FROM nginxinc/nginx-unprivileged:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx unprivileged listens on 8080 by default
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
