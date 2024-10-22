FROM node:18-alpine
RUN apk add --no-cache bash
WORKDIR /usr/seed
COPY . .
RUN ["yarn"]
RUN ["yarn", "generate:typechain"]
CMD ["yarn", "start"]