FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files first for deterministic install, use npm ci
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy application source, set ownership to non-root user
COPY --chown=node:node . .

# Use non-root user provided by official image
USER node

# Bind to 0.0.0.0 via application; expose the inferred app port
EXPOSE 8000

ENV NODE_ENV=production

# Start the app (server listens on PORT or 8000)
CMD ["npm", "start"]
