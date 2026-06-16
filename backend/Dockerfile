FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p uploads/prescriptions storage/invoices

EXPOSE 5000

CMD ["npm", "start"]
