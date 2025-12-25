# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# Install netcat để check database connection
RUN apt-get update && apt-get install -y netcat-traditional && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY . .
# Nếu bạn dùng Prisma, mở dòng sau:
# RUN npx prisma generate
RUN npm run build

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
