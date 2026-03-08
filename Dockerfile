FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 7655

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "7655"]