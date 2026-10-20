FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# npm ci instead of npm install: installs exactly what package-lock.json
# pins (reproducible build) and fails fast if package.json/lock ever drift
# apart, instead of silently resolving new versions on every build.
RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

# Run as the unprivileged "node" user that node:*-alpine ships with, instead
# of root. The app never writes to /app at runtime (backups/sessions live
# in Postgres / in-memory, not on the local filesystem), so read-only
# ownership of the built output is enough.
RUN mkdir -p /app/backups
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "start"]
