# Use an official Node.js runtime as a parent image (Choose a specific LTS version)
FROM node:18-alpine AS base

# Set the working directory in the container
WORKDIR /usr/src/app

# --- Dependencies Stage ---
FROM base AS deps
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install app dependencies
# Cache bust: $(date +%s)
RUN npm ci --only=production

# --- Build Stage (if you had build steps like TypeScript) ---
# FROM base AS build
# WORKDIR /usr/src/app
# COPY --from=deps /usr/src/app/node_modules ./node_modules
# COPY . .
# RUN npm run build # Example build command

# --- Production Stage ---
FROM base AS production
WORKDIR /usr/src/app

# Copy environment variables config - adjust if needed
# COPY .env .

# Copy dependency node_modules first (from deps stage)
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy the rest of the application code
COPY . .
# If you had a build stage, you'd copy from it instead:
# COPY --from=build /usr/src/app/dist ./dist
# COPY --from=build /usr/src/app/package*.json ./

# Make port available to the world outside this container (use the port from .env or default)
# We'll actually expose this in docker-compose.yml, but EXPOSE is good practice documentation
EXPOSE 5003

# Define the command to run your app
CMD ["node", "server.js"]
#CMD ["tail", "-f", "/dev/null"]