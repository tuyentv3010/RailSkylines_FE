# ===== Build stage =====
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
# next build tự đọc .env.production (có sẵn trong context) → nhúng NEXT_PUBLIC_*
RUN npm run build

# ===== Run stage =====
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/messages ./messages
EXPOSE 3000
CMD ["npm", "start"]
