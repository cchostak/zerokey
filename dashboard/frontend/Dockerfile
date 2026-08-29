FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
# Ensure public/ exists even when the source tree has no static assets;
# Next.js only creates it during build when files are present.
RUN mkdir -p public
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
# public/ may be empty — copy the whole directory so the runner image
# always has the directory present (required by Next.js standalone server).
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]
