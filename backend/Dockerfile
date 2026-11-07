FROM node:20-alpine
WORKDIR /app

# Copy dependency files first so Docker can cache the install step
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend code
COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]