FROM node:16.3.0-alpine
WORKDIR /usr/hardhat
COPY . .
RUN ["yarn"]
CMD ["yarn", "hardhat", "node"]