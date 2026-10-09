FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache docker-cli
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY db ./db
COPY scripts ./scripts
COPY worker ./worker
CMD ["npm", "run", "worker:start"]
