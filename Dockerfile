# ─────────────────────────────────────────────
# Stage 1: Build frontend (Vite → static files)
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN chmod -R +x node_modules/.bin && npm run build


# ─────────────────────────────────────────────
# Stage 2: Backend dependencies only
# ─────────────────────────────────────────────
FROM node:20-alpine AS backend-deps

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --ignore-scripts --omit=dev


# ─────────────────────────────────────────────
# Stage 3: Final image — nginx + node
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

# Install nginx + supervisor (to run both nginx and node)
RUN apk add --no-cache nginx supervisor

# Copy backend
WORKDIR /app/backend
COPY backend/ ./
COPY --from=backend-deps /app/backend/node_modules ./node_modules

# Copy built frontend to nginx web root
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy supervisor config
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
