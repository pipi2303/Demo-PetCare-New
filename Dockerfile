FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --frozen-lockfile 2>/dev/null || npm install

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
