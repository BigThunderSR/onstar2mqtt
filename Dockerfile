FROM node:20-alpine

RUN mkdir /app
WORKDIR /app

COPY ["package.json", "/app/"]
COPY ["package-lock.json", "/app/"]
RUN npm -v
RUN npm update -g --no-fund
RUN npm -v
RUN npm ci --omit=dev --no-fund --legacy-peer-deps

COPY ["src", "/app/src"]

ENTRYPOINT ["npm", "run", "start"]
