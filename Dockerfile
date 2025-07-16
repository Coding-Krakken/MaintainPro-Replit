FROM node:20-alpine

# Install necessary packages for native dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clear npm cache and install dependencies (including dev dependencies for build)
RUN npm cache clean --force
RUN npm ci --verbose

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port 8080 (Railway's default internal port)
EXPOSE 8080

# Railway will set the PORT environment variable dynamically
# The application will bind to whatever port Railway specifies

# Start the application
CMD ["npm", "start"]
