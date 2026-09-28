FROM node:24-alpine

RUN apk add --no-cache libc6-compat curl
RUN npm install --global npm@11.17.0
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
