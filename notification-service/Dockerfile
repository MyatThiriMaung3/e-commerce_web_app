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
RUN npm install --only=production

# --- Production Stage ---
FROM base AS production
WORKDIR /usr/src/app

# Copy environment variables config - adjust if needed
# COPY .env .

# Copy dependency node_modules first (from deps stage)
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (adjust if different)
EXPOSE 3004

# Define the command to run your app
CMD ["node", "server.js"] 