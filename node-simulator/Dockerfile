FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p /app/chunks
EXPOSE 6001
CMD ["node", "server.js"]
