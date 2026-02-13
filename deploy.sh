#!/bin/bash

# Configuration
NETWORK="testnet"

# Path to the program directory
PROGRAM_DIR="program"

if [ -f .env ]; then
    echo "📄 Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: .env file not found. Ensure PRIVATE_KEY is set in your shell."
fi

echo "🚀 Starting deployment of ShadowVote..."

# 1. Navigate to the program directory
if [ -d "$PROGRAM_DIR" ]; then
    cd "$PROGRAM_DIR"
else
    echo "❌ Error: Directory '$PROGRAM_DIR' not found."
    exit 1
fi

# 2. Build the Leo contract
echo "🛠 Building the contract..."
leo build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# 3. Deploy to the network
echo "🌐 Deploying to $NETWORK network..."
leo deploy --network testnet --endpoint https://api.explorer.provable.com/v2 --broadcast --save "./deploy_tx" --print || {
    echo -e "${RED}❌ Failed to deploy"
    exit 1
}

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed. Please check your private key, network connection, and credit balance."
    exit 1
fi

TOKEN_CONTRACT="shadow_vote_v2.aleo"
ADMIN_ADDRESS="aleo14y3wnsmr9ph4422qqgcnze6dvm7k8g89prm4lv23qs9w5emah59swp0kfd"
INITIAL_ROOT="0field" # Or the specific starting root field value

echo "🎬 Initializing the contract..."
leo execute initialize "$TOKEN_CONTRACT" "$ADMIN_ADDRESS" "$INITIAL_ROOT" \
    --network testnet \
    --endpoint https://api.explorer.provable.com/v2 \
    --broadcast || {
    echo -e "${RED}❌ Failed to initialize contract${NC}"
    exit 1
}