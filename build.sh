#!/bin/bash

echo "=== Starting build process ==="

# Build React app
echo "Building React app..."
cd client
npm install
npm run build

# Show what was built
echo "React build contents:"
ls -la build/

# Copy to root static folder
echo "Copying files..."
cd ..
rm -rf static
mkdir -p static
cp -r client/build/* static/

# Show what was copied
echo "Static folder contents:"
ls -la static/

# Install Python deps
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "=== Build complete ==="