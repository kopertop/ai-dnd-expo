#!/bin/bash
set -e  # Exit on any error

echo "🧪 D&D Model Validation"
echo "======================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to ai-training directory
cd "$(dirname "$0")"
echo "📂 Working directory: $(pwd)"

# Check if trained model exists
if [ ! -d "trained_models/dnd_model" ]; then
    echo -e "${RED}❌ No trained model found!${NC}"
    echo -e "${YELLOW}Run 'npm run train' first to train a model${NC}"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo -e "${BLUE}🔌 Activating virtual environment...${NC}"
    source venv/bin/activate
else
    echo -e "${YELLOW}⚠️  No virtual environment found, using system Python${NC}"
fi

# Install validation dependencies if needed
echo -e "${BLUE}📦 Checking validation dependencies...${NC}"
python3 -c "import torch, transformers, peft" 2>/dev/null || {
    echo -e "${YELLOW}Installing missing dependencies...${NC}"
    pip install torch transformers peft
}

# Run validation
echo -e "${BLUE}🚀 Starting model validation...${NC}"
python3 validate_trained_model.py

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Validation completed successfully!${NC}"
else
    echo -e "${RED}❌ Validation failed or needs improvement${NC}"
    exit 1
fi
