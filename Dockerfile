FROM node:20-alpine as base

FROM base AS install
COPY package*.json /workspace/develop/
RUN cd /workspace/develop && npm install
COPY package*.json /workspace/production/
RUN cd /workspace/production && npm install --omit=dev

FROM base AS build
WORKDIR /workspace/develop
COPY --from=install /workspace/develop/node_modules node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS release
WORKDIR /usr/src/app
COPY --from=install /workspace/production/node_modules node_modules
COPY --from=install /workspace/production/package.json .
COPY --from=build /workspace/develop/dist dist

# run the app
USER node
EXPOSE 3000/tcp
ENTRYPOINT [ "node", "dist/app.js" ]
