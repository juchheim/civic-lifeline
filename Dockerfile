FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy all source code first
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the project
RUN pnpm build

# Set working directory to web app
WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
