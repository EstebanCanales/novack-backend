FROM node:20.10.0-alpine3.18

WORKDIR /usr/src/app

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

# Expose the port the app runs on
EXPOSE 4000

# Start the application
CMD ["pnpm", "run", "start:prod"]
