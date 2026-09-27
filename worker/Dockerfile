FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src ./src
COPY db ./db
COPY scripts ./scripts
COPY worker ./worker
CMD ["npm", "run", "worker:start"]
