#FROM node:22-alpine
#FROM node:22-bullseye-slim
FROM node:25-bookworm-slim

# Install tini for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev --no-fund --legacy-peer-deps \
 && npm cache clean --force \
 && npx patchright install chromium --with-deps \
 && rm -rf /root/.npm /tmp/* /var/tmp/* /var/lib/apt/lists/*

COPY src ./src
COPY --chmod=755 docker-entrypoint.sh ./

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
