#FROM node:22-alpine
#FROM node:22-bullseye-slim
FROM node:24-bookworm-slim

# Install tini for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

RUN mkdir /app
WORKDIR /app

COPY ["package.json", "/app/"]
COPY ["package-lock.json", "/app/"]
RUN npm -v
RUN npm update -g --no-fund
RUN npm -v
RUN npm ci --omit=dev --no-fund --legacy-peer-deps
RUN npx patchright install chromium --with-deps

COPY ["src", "/app/src"]
COPY ["docker-entrypoint.sh", "/app/"]
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
