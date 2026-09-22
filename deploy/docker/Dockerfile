# 第一階段：build。有完整 Node.js 環境跟原始碼，但這個階段蓋完就拆掉，不會留在最終 image 裡。
FROM node:lts-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run docs:build

# 第二階段：實際會跑起來對外服務的 image。只有 nginx + build 產出的靜態檔案，沒有 Node.js、沒有原始碼。
FROM nginx:alpine
COPY --from=build /app/docs/.vitepress/dist /usr/share/nginx/html
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
