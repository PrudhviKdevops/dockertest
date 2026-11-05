FROM node:22-alpine

WORKDIR /prudhvi

COPY package*.json ./

RUN npm install

EXPOSE 3000


COPY . .

CMD ["node","server.js"]

