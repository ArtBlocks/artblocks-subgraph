FROM cypress/browsers:node-16.18.1-chrome-107.0.5304.121-1-ff-107.0-edge-100.0.1185.29-1
WORKDIR /usr/runner
COPY . .
RUN ["yarn"]
ENTRYPOINT ["yarn", "run", "cypress", "run", "--browser", "chrome", "--headless", "--config", "baseUrl=http://localhost:3000"]