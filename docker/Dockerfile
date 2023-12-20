FROM node:16-alpine3.17
RUN apk add --no-cache curl
RUN apk add --no-cache git
WORKDIR /usr/subgraph
COPY . .
CMD [ "yarn" ]