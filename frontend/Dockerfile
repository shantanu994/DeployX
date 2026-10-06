   # Stage 1: Build the React app
   FROM node:20 AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   # Stage 2: Serve the built files
   FROM node:20
   WORKDIR /app
   RUN npm install -g serve
   COPY --from=build /app/dist ./dist
   EXPOSE 3000
   CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]