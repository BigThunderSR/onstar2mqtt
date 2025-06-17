#FROM node:22-alpine
#FROM node:22-bullseye-slim
FROM node:24-bookworm-slim

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

ENTRYPOINT ["npm", "run", "start"]
