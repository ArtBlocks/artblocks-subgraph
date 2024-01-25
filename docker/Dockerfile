FROM node:16-alpine3.17
RUN apk add --no-cache curl
RUN apk add --no-cache git
WORKDIR /usr/subgraph
COPY . .
COPY ./tests/e2e/setup-scripts /usr/subgraph/setup-scripts
CMD [ "yarn" ]

