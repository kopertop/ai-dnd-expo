#!/bin/bash
set -e  # Exit on any error

echo "🐉 D&D Model Training with Unsloth & Gemma3N"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to ai-training directory
cd "$(dirname "$0")"
echo "📂 Working directory: $(pwd)"

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}🔧 Creating virtual environment...${NC}"
    python3.11 -m venv venv
fi

# Activate virtual environment
echo -e "${BLUE}🔌 Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "${BLUE}📦 Upgrading pip...${NC}"
pip install --upgrade pip

# Install dependencies (avoiding xformers compilation issues on Apple Silicon)
echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Install PyTorch first
echo -e "${YELLOW}Installing PyTorch...${NC}"
pip install --upgrade torch torchvision torchaudio

# Install transformers and core ML libraries
echo -e "${YELLOW}Installing core ML libraries...${NC}"
pip install --upgrade transformers
pip install --upgrade datasets
pip install --upgrade accelerate
pip install --upgrade peft
pip install --upgrade trl
pip install --upgrade huggingface_hub

# Install training libraries (using native HuggingFace instead of Unsloth)
echo -e "${YELLOW}Installing HuggingFace training libraries...${NC}"
echo -e "${BLUE}Using native HuggingFace libraries for reliable cross-platform training...${NC}"

# Install core training dependencies
pip install --upgrade torch transformers datasets accelerate peft trl
pip install --upgrade bitsandbytes

echo -e "${GREEN}✅ HuggingFace libraries installed!${NC}"

# Install huggingface-cli if not available
if ! command -v huggingface-cli &> /dev/null; then
    echo -e "${BLUE}📦 Installing huggingface-cli...${NC}"
    pip install --upgrade huggingface_hub[cli]
fi

echo -e "${GREEN}✅ All dependencies installed!${NC}"

# Check system info
echo -e "${BLUE}🖥️  System Information:${NC}"
python3.11 -c "
import torch
import platform
print(f'Python: {platform.python_version()}')
print(f'PyTorch: {torch.__version__}')
print(f'Platform: {platform.system()} {platform.machine()}')
if torch.cuda.is_available():
    print(f'CUDA: {torch.cuda.get_device_name()}')
elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
    print('GPU: Apple Silicon (MPS)')
else:
    print('GPU: None (CPU only)')
"

# Download model using huggingface-cli
echo -e "${BLUE}📥 Downloading training model...${NC}"
MODEL_NAME="microsoft/DialoGPT-medium"
CACHE_DIR="./models"

# Create models directory
mkdir -p $CACHE_DIR

# Download model (this will use HF cache by default)
echo -e "${YELLOW}Downloading $MODEL_NAME...${NC}"
huggingface-cli download $MODEL_NAME --cache-dir $CACHE_DIR || {
    echo -e "${YELLOW}⚠️  Model download failed, training will download during execution${NC}"
}

echo -e "${GREEN}✅ Model download completed!${NC}"

# Run training
echo -e "${BLUE}🏋️‍♂️ Starting training...${NC}"
echo -e "${BLUE}Using native HuggingFace transformers for reliable training...${NC}"
python3.11 train_dnd_model.py

echo -e "${GREEN}🎉 Training completed successfully!${NC}"
echo -e "${GREEN}Your D&D model is ready for CactusAI integration!${NC}"
