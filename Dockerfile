# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
COPY server ./server
COPY migration ./migration
COPY scripts ./scripts
COPY ["Data Pemudik Final Banget.csv", "./"]
COPY wait-for-db.sh ./wait-for-db.sh
RUN sed -i 's/\r$//' ./wait-for-db.sh && chmod +x ./wait-for-db.sh

# Create non-root user
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080
CMD ["./wait-for-db.sh", "postgres", "node", "server/index.js"]
