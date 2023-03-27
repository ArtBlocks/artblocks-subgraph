FROM node:16.10.0-alpine
WORKDIR /usr/runner
COPY . .
RUN ["yarn"]
CMD ["yarn", "test"]