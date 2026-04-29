FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy source
COPY . .

# Accept build-time API URL (set via docker-compose build arg or .env)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Production: nginx ──────────────────────────────────────────────────────────
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verify nginx config is valid at image build time
RUN nginx -t

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
