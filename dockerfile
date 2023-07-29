FROM node:20-alpine

WORKDIR /home/node/PanchoBot

COPY package.json .

COPY pnpm-lock.yaml .

RUN npm install -g pnpm

RUN pnpm install

COPY . .

RUN pnpx prisma generate

CMD ["pnpm", "run", "start"]
