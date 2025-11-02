# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* frontend/pnpm-lock.yaml* frontend/yarn.lock* ./frontend/ 2>/dev/null || true
RUN cd frontend && npm ci || (cd frontend && npm install)
COPY frontend ./frontend
RUN cd frontend && npm run build

# Stage 2: Build backend runtime
FROM node:20-alpine AS backend
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./ 2>/dev/null || true
RUN npm ci || npm install
COPY backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
ENV PORT=4000
EXPOSE 4000
CMD ["node", "backend/server.js"]


