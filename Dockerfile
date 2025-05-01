FROM node:18

# Install Ghostscript for PDF compression
RUN apt-get update && apt-get install -y ghostscript

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN npm install

# Expose port and start server
EXPOSE 3000
CMD ["npm", "start"]


