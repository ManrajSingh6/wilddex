# # Base Image
# FROM node:20-alpine

# # Set working directory in container
# WORKDIR /app

# # Copy packages
# COPY package*.json .

# # Install dependencies
# RUN npm install

# # Copy all files
# COPY . .

# CMD ["npm", "run", "dev"]


# Stage 1: Build the React app using Node
FROM node:20-alpine AS builder
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
# Copy the rest of the client code and build the app
COPY . .
RUN npm run build

# Stage 2: Serve the built app with NGINX
FROM nginx:alpine
# Copy the built files to NGINX's default directory
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy your custom nginx.conf into the container
COPY nginx.conf /etc/nginx/nginx.conf
# Expose port 80
EXPOSE 80
# Run NGINX in the foreground
CMD ["nginx", "-g", "daemon off;"]