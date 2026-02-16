# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage — lightweight Nginx
FROM nginx:alpine
COPY --from=build /app/dist /var/www/kyara
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/conf.d/security-headers.conf
RUN chown -R nginx:nginx /var/www/kyara && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid
EXPOSE 80
USER nginx
CMD ["nginx", "-g", "daemon off;"]
