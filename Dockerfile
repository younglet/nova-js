# Dockerfile — nova-js docs site
# 用法：在 nova-frontend 根目录跑 docker compose up -d
# 单独跑：cd nova-js && docker build -t novajs-docs -f Dockerfile ..
#       容器内 dist 在 /app/docs/.vitepress/dist，由 nginx 容器挂载

FROM node:20-alpine AS build
WORKDIR /app

# 装依赖（cache 友好）
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# 跑 build
COPY . .
RUN npm run build && npm run docs:build

# ──── runtime: 让外部 nginx 挂载 dist ────
# 不打包成镜像，只留 build stage；docker-compose 用 volumes 挂出来
