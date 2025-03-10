# Base Image
FROM node:20-alpine

# Set working directory in container
WORKDIR /app

# Copy packages
COPY package*.json .

# Install dependencies
RUN npm install

# Copy all files
COPY . .

CMD ["npm", "run", "dev"]
