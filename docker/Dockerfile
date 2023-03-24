FROM node:16.3.0-alpine
RUN apk add --no-cache curl
RUN apk add --no-cache git
WORKDIR /usr/subgraph
COPY . .
CMD [ "yarn" ]