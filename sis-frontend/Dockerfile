# ==========================================
# Stage 1: Build the React application
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

# npm ci (not npm install) for reproducible builds: installs exactly what's
# in package-lock.json and fails loudly if the lockfile is out of sync,
# rather than silently resolving new versions the way `npm install` can.
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build
# Outputs to dist/ — confirmed via vite.config.ts (no build.outDir override).
# Note: this runs `tsc -b` before `vite build` (see package.json) — a type
# error anywhere in the source will fail the build right here. Run
# `npm run build` locally first if this step ever fails unexpectedly.

# ==========================================
# Stage 2: Serve with Nginx
# ==========================================
FROM nginx:alpine

# Copies straight over the default config at the same path — no need to
# rm it first, COPY to an existing path just replaces the file.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Compiled React output from Stage 1, into Nginx's web root.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx:alpine's own base image already defines an ENTRYPOINT/CMD that
# runs `nginx -g daemon off;` — no CMD needed here.