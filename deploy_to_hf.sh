#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment to Hugging Face Space: zakisheriff/inverse-server"

# Remove existing deploy folder if it exists
if [ -d "hf_deploy" ]; then
    echo "Cleaning up previous deployment folder..."
    rm -rf hf_deploy
fi

# 1. Clone the Hugging Face Space
echo "📦 Cloning Hugging Face repository..."
git clone https://huggingface.co/spaces/zakisheriff/inverse-server hf_deploy

# 2. Copy server files (EXCLUDING node_modules)
echo "📂 Copying server files..."
# Use rsync to exclude node_modules and .git, but include hidden files like .gitignore
rsync -av --progress server/ hf_deploy/ --exclude node_modules --exclude .git --exclude .DS_Store

# 3. Deploy
cd hf_deploy

# Ensure .gitignore exists and includes node_modules
if [ ! -f .gitignore ]; then
    echo "node_modules" > .gitignore
else
    # Append if not present
    if ! grep -q "node_modules" .gitignore; then
        echo "node_modules" >> .gitignore
    fi
fi



echo "✅ Files prepared."

# Check for HF_TOKEN in environment
if [ -z "$HF_TOKEN" ]; then
    echo "----------------------------------------------------------------"
    echo "🔐 AUTHENTICATION REQUIRED"
    echo "Please paste your Hugging Face 'WRITE' Access Token now."
    echo "   (Input will be hidden)"
    echo "----------------------------------------------------------------"
    read -s -p "Token: " HF_TOKEN
    echo ""
fi

if [ -z "$HF_TOKEN" ]; then
    echo "❌ Error: Token cannot be empty."
    exit 1
fi

echo "🚀 Pushing to Hugging Face..."

# Set remote with token
git remote set-url origin https://zakisheriff:$HF_TOKEN@huggingface.co/spaces/zakisheriff/inverse-server

git add .
git commit -m "Deploying server updates" || echo "No changes to commit"

# Push
git push origin main

echo "🎉 Deployment pushed! Check your Space status here: https://huggingface.co/spaces/zakisheriff/inverse-server"

# Clean up
cd ..
rm -rf hf_deploy
echo "🧹 Cleanup complete."
