FROM node:16.3.0-alpine
RUN apk add --no-cache bash
WORKDIR /usr/seed
COPY . .
RUN ["yarn"]
RUN ["yarn", "generate:typechain"]
CMD ["./setup-scripts/wait-for-it.sh", "-h", "hardhat", "-p", "8545", "--", "yarn", "start"]