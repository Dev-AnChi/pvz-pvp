FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/build ./build
ENV PORT=4173
EXPOSE 4173
USER node
CMD ["node", "build/server.mjs"]
