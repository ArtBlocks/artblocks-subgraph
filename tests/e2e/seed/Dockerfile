FROM node:16.3.0-alpine
RUN apk add --no-cache bash
WORKDIR /usr/seed
COPY . .
RUN ["yarn"]
RUN ["yarn", "generate:typechain"]
CMD ["yarn", "start"]