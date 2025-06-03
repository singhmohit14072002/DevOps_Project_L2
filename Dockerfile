FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Create a .env file if it doesn't exist
RUN touch .env

EXPOSE 3001

CMD ["node", "server.js"] 