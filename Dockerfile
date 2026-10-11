FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY --from=frontend /build/dist /app/dist
RUN mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production PUBLIC_MODE=true HOST=0.0.0.0 PORT=3001 SERVE_FRONTEND=true DATABASE_PATH=/data/breaktrail.sqlite
EXPOSE 3001
CMD ["npm","start"]
