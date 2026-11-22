FROM node:20-alpine
ENV HTTP_PROXY="" HTTPS_PROXY="" ALL_PROXY="" NO_PROXY="" \
    http_proxy="" https_proxy="" all_proxy="" no_proxy=""
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
RUN npm install --no-save --ignore-scripts typescript@5 @types/node@22
COPY tsconfig.json ./
COPY src ./src
RUN node_modules/.bin/tsc -p tsconfig.json
CMD ["node", "dist/index.js"]
