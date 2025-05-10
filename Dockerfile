FROM node:20.10.0-alpine3.18 as builder

WORKDIR /usr/src/app

# Install dependencies for bcrypt and other native modules
RUN apk add --no-cache python3 make g++ gcc git

COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Final stage
FROM node:20.10.0-alpine3.18

WORKDIR /usr/src/app

# Install dependencies for bcrypt
RUN apk add --no-cache python3 make g++ gcc

COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install only production dependencies and rebuild bcrypt specifically
RUN npm install -g pnpm
RUN pnpm install --prod
RUN cd node_modules/bcrypt && npm rebuild bcrypt --build-from-source

# Expose the port the app runs on
EXPOSE 4000

# Start the application
CMD ["node", "dist/main.js"]
