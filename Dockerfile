# --------------------------------------------
# 1️⃣ Build stage – compile the Vite app
# --------------------------------------------
FROM node:20.12-alpine AS builder

WORKDIR /app

# Install git – required for dependencies that use github: URLs
RUN apk add --no-cache git

# Copy only the dependency descriptors first
COPY package.json ./

# Install all dependencies (dev + prod – needed for the Vite build)
RUN npm install

# Copy the rest of your source code
COPY . .

# Build the static assets
RUN npm run build

# --------------------------------------------
# 2️⃣ Runtime stage – serve with Nginx
# --------------------------------------------
FROM nginx:1.27-alpine

# Remove the default configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy a custom Nginx config that listens on 3000
COPY nginx.conf /etc/nginx/conf.d/

# Copy the built files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose the port that Traefik will forward to
EXPOSE 3000

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
