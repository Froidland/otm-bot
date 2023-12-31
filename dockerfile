FROM node:20-alpine

WORKDIR /home/node/otm-bot

COPY package.json .

COPY pnpm-lock.yaml .

RUN npm install -g pnpm

RUN pnpm install

COPY . .

RUN npx prisma generate

CMD ["npm", "run", "start:prod"]
