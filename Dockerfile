FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
    && npx playwright install --with-deps chromium \
    && npm prune --omit=dev

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
