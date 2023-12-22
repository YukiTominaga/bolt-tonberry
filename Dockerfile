FROM oven/bun:1 as base
WORKDIR /workspace

FROM base AS install
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=install /workspace/node_modules node_modules
COPY . .
RUN bun run build.js

FROM node:20-alpine AS release
WORKDIR /usr/src/app
COPY --from=install /workspace/node_modules node_modules
COPY --from=build /workspace/dist/app.js .
COPY --from=build /workspace/package.json .

# run the app
USER node
EXPOSE 3000/tcp
ENTRYPOINT [ "node", "app.js" ]
