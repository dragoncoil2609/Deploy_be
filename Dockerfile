FROM node:20
WORKDIR /app

# Install netcat để check database connection
RUN apt-get update && apt-get install -y netcat-traditional && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY . .

# Build application
RUN npm run build

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000
CMD ["/app/entrypoint.sh"]
