FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci && npm install -D vite

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
