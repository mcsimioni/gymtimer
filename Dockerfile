FROM node:18-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 5173

CMD ["node", "dist/index.js"]
