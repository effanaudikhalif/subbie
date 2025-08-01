#!/bin/bash

# Exit on any error
set -e

echo "Starting Subbie Email Service..."

# Check if all required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "Error: NEXT_PUBLIC_SUPABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "Error: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set"
    exit 1
fi

if [ -z "$SMTP_PASSWORD" ]; then
    echo "Error: SMTP_PASSWORD environment variable is not set"
    exit 1
fi

echo "Environment variables verified ✓"

# Start the application
python main.py 