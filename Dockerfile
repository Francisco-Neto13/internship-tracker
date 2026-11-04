# One image for the application and for the production tools (migration, bucket, first
# administrator), which need the TypeScript sources and tsx. The build needs no database.
FROM node:24-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
# No lifecycle scripts: the only one is the git hook setup, and native packages are prebuilt
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build && chown -R node:node .next

ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
