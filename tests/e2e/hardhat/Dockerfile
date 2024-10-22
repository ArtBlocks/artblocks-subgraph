FROM node:18-alpine
RUN ["apk", "add", "--no-cache", "curl"]
WORKDIR /usr/hardhat
COPY . .
RUN ["yarn"]
CMD ["yarn", "hardhat", "node"]