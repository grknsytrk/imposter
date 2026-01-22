FROM node:20-slim AS builder

WORKDIR /app

# Install all workspace deps (needed to build TypeScript)
COPY . .
RUN npm ci

# Build shared first so runtime module exists, then build server
RUN npm run build -w @imposter/shared
RUN npm run build -w server


FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Only install production dependencies
COPY package.json package-lock.json turbo.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev

# Copy build artifacts
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/server/dist apps/server/dist

EXPOSE 7860
CMD ["node", "apps/server/dist/index.js"]

