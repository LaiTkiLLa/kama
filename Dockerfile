FROM node:21-alpine

WORKDIR /app

# Копируем package.json и package-lock.json в рабочую директорию
COPY package*.json ./

RUN npm install -g npm@10.3.0

# Устанавливаем зависимости
RUN npm install

#Копируем все в рабочую директорию
COPY . .

RUN npm run build

CMD ["npm", "run", "start:prod"]