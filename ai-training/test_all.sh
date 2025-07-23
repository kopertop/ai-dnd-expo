#!/bin/bash
set -e  # Exit on any error

echo "🧪 Complete Model Testing Suite"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to ai-training directory
cd "$(dirname "$0")"
echo "📂 Working directory: $(pwd)"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo -e "${BLUE}🔌 Activating virtual environment...${NC}"
    source venv/bin/activate
else
    echo -e "${YELLOW}⚠️  No virtual environment found, using system Python${NC}"
fi

echo -e "${BLUE}Starting comprehensive model testing...${NC}"
echo ""

# Test 1: Validate trained model
echo -e "${BLUE}📋 Step 1: Validating trained model...${NC}"
if python3 validate_trained_model.py; then
    echo -e "${GREEN}✅ Trained model validation: PASSED${NC}"
    VALIDATION_PASSED=true
else
    echo -e "${RED}❌ Trained model validation: FAILED${NC}"
    VALIDATION_PASSED=false
fi
echo ""

# Test 2: Test CactusTTS integration
echo -e "${BLUE}🔗 Step 2: Testing CactusTTS integration...${NC}"
if python3 test_cactus_integration.py; then
    echo -e "${GREEN}✅ CactusTTS integration: PASSED${NC}"
    INTEGRATION_PASSED=true
else
    echo -e "${RED}❌ CactusTTS integration: FAILED${NC}"
    INTEGRATION_PASSED=false
fi
echo ""

# Test 3: Test deployed model (if exists)
echo -e "${BLUE}🚀 Step 3: Testing deployed model...${NC}"
if [ -d "../assets/models/custom-dnd-trained-model" ]; then
    if python3 test_deployed_model.py; then
        echo -e "${GREEN}✅ Deployed model testing: PASSED${NC}"
        DEPLOYED_PASSED=true
    else
        echo -e "${RED}❌ Deployed model testing: FAILED${NC}"
        DEPLOYED_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠️  No deployed model found, skipping deployment test${NC}"
    echo -e "${BLUE}Run 'npm run train:deploy' to deploy the model first${NC}"
    DEPLOYED_PASSED="skipped"
fi
echo ""

# Summary
echo "=" * 60
echo -e "${BLUE}🎯 Testing Summary${NC}"
echo "=" * 60

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "✅ Trained Model Validation: ${GREEN}PASSED${NC}"
else
    echo -e "❌ Trained Model Validation: ${RED}FAILED${NC}"
fi

if [ "$INTEGRATION_PASSED" = true ]; then
    echo -e "✅ CactusTTS Integration: ${GREEN}PASSED${NC}"
else
    echo -e "❌ CactusTTS Integration: ${RED}FAILED${NC}"
fi

if [ "$DEPLOYED_PASSED" = true ]; then
    echo -e "✅ Deployed Model Testing: ${GREEN}PASSED${NC}"
elif [ "$DEPLOYED_PASSED" = "skipped" ]; then
    echo -e "⚠️  Deployed Model Testing: ${YELLOW}SKIPPED${NC}"
else
    echo -e "❌ Deployed Model Testing: ${RED}FAILED${NC}"
fi

echo ""

# Overall result
if [ "$VALIDATION_PASSED" = true ] && [ "$INTEGRATION_PASSED" = true ] && ([ "$DEPLOYED_PASSED" = true ] || [ "$DEPLOYED_PASSED" = "skipped" ]); then
    echo -e "${GREEN}🎉 Overall Result: ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}Your D&D model is ready for use!${NC}"

    if [ "$DEPLOYED_PASSED" = "skipped" ]; then
        echo ""
        echo -e "${BLUE}💡 Next Steps:${NC}"
        echo -e "   1. Run: ${YELLOW}npm run train:deploy${NC}"
        echo -e "   2. Run: ${YELLOW}npm run train:test${NC}"
        echo -e "   3. Integrate with your CactusTTS system"
    fi

    exit 0
else
    echo -e "${RED}💥 Overall Result: SOME TESTS FAILED${NC}"
    echo -e "${RED}Check the output above for details${NC}"
    exit 1
fi
