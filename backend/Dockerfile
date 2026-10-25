# ---- deps compartidas por dev y build ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

# ---- dev: codigo montado como volumen (ver docker-compose.yml), hot-reload ----
FROM base AS dev
CMD ["npm", "run", "start:dev"]

# ---- build: compila a dist/ para la imagen de produccion ----
FROM base AS build
COPY src ./src
RUN npm run build

# ---- produccion: solo deps de runtime + dist compilado ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
