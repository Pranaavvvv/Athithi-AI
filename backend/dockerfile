FROM node:19

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5555

CMD ["npm","run","dev"]