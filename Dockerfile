# SecureShare Backend Dockerfile for Render / Cloud Deployments
FROM node:20

WORKDIR /app

# Copy root files
COPY package*.json ./

# Copy backend directory
COPY backend/ ./backend/

# Install dependencies inside backend directory
WORKDIR /app/backend
RUN npm install --production

# Expose backend port (Render injects $PORT automatically)
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
