FROM node:20-alpine
RUN apk add --no-cache curl
RUN apk add --no-cache git
WORKDIR /usr/subgraph
COPY . .
COPY ./tests/e2e/setup-scripts /usr/subgraph/setup-scripts
CMD [ "yarn" ]

