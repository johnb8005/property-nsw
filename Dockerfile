FROM oven/bun:1

# Build arguments for versioning
ARG GIT_SHA
ARG GIT_VERSION

WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy database module and import script
COPY db.ts import-data.ts ./

# Copy data files and build database
COPY 2024.zip 2025.zip ./
RUN bun run import-data.ts ./2025.zip && \
    bun run import-data.ts ./2024.zip 2024 skip && \
    rm -f 2024.zip 2025.zip

# Copy source code
COPY index.ts frontend.tsx index.html leaflet.heat.d.ts ./

# Cloud Run uses PORT env variable (default 8080)
EXPOSE 8080
ENV PORT=8080

# Set production mode
ENV NODE_ENV=production

# Set environment variables for versioning
ENV GIT_SHA_ENV=$GIT_SHA
ENV GIT_VERSION_ENV=$GIT_VERSION

# Start the server
CMD ["bun", "run", "index.ts"]
