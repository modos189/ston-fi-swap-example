# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create app user with explicit UID/GID
RUN addgroup -S -g 1001 app && \
    adduser -S -u 1001 -G app app

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership to app user
RUN chown -R app:app /app

# Switch to app user
USER app:app

# Set environment variables
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]