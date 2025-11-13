#!/bin/bash
set -e  # Exit on any error

echo "🚀 Model Deployment to Assets"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to ai-training directory
cd "$(dirname "$0")"
echo "📂 Working directory: $(pwd)"

# Check if converted model exists
if [ ! -d "trained_models/gguf/model" ]; then
    echo -e "${RED}❌ No converted model found!${NC}"
    echo -e "${YELLOW}Run model conversion first:${NC}"
    echo -e "${BLUE}  python3 simple_gguf_convert.py${NC}"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo -e "${BLUE}🔌 Activating virtual environment...${NC}"
    source venv/bin/activate
else
    echo -e "${YELLOW}⚠️  No virtual environment found, using system Python${NC}"
fi

# Run deployment
echo -e "${BLUE}🚀 Starting model deployment...${NC}"
python3 deploy_model.py "$@"

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "${GREEN}Your model is ready for CactusTTS integration!${NC}"
    echo -e "${BLUE}Check assets/models/ for the deployed model${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
