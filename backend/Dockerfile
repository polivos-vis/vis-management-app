FROM node:20-alpine3.17

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma

COPY prisma ./data
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
