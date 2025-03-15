# Stage 1: Build the React app using Node
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json package-lock.json ./

RUN npm ci

# Copy the rest of the client code and build the app
COPY ./ ./

RUN npm run build

# Stage 2: Serve the built app with NGINX
FROM nginx:stable-alpine as production

# copy nginx configuration in side conf.d folder
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy the build output from the dist folder into the Nginx html directory
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Run NGINX in the foreground
CMD ["nginx", "-g", "daemon off;"]