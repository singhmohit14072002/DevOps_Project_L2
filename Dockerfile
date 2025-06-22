# Use an official Node.js 20 image based on Alpine Linux for a small image size
FROM node:20-alpine

# Set the working directory inside the container to 
WORKDIR /app

# Update npm to the latest version to patch security vulnerabilities
RUN npm install -g npm@latest

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install all project dependencies listed in package.json
RUN npm install

# Copy the entire project directory contents into the container
COPY . .

# Create an empty .env file if it doesn't already exist
# (Useful if your app expects a .env file but it's not included)
RUN touch .env

# Expose port 3001 to allow traffic to reach your application
EXPOSE 3001

# Define the command to run your application
CMD ["node", "server.js"]
