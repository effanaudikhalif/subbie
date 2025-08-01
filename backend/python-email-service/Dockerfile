FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port
EXPOSE 10000

# Set environment variables
ENV EMAIL_SERVICE_HOST=0.0.0.0
ENV EMAIL_SERVICE_PORT=10000

# Run the application
CMD ["python", "main.py"] 