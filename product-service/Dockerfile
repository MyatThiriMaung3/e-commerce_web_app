FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# CMD sh -c "node seed.js && node server.js"
CMD ["sh", "-c", "npm run seed && npm start"]