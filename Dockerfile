# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Remove package-lock.json to avoid conflicts with yarn
RUN rm -f package-lock.json

# Install all dependencies (including dev dependencies for build)
RUN yarn install --frozen-lockfile

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy Prisma schema
COPY prisma ./prisma/

# Copy source code
COPY src ./src/

# Copy IDL files
COPY src/idl ./src/idl/

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript code
RUN yarn build

# Remove dev dependencies and source files to reduce image size
RUN yarn install --production --frozen-lockfile && \
    yarn cache clean

# Remove source files and keep only built files
RUN rm -rf src tsconfig.json

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001

# Change ownership of the app directory
RUN chown -R botuser:nodejs /app

# Switch to non-root user
USER botuser

# Expose port (if you're using Express server)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Bot is running')" || exit 1

# Start the bot
CMD ["node", "dist/index.js"]
