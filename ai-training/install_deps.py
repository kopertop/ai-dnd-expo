#!/usr/bin/env python3
"""
Install dependencies for D&D model training
Usage: python install_deps.py
"""

import platform
import subprocess
import sys


def install_dependencies():
    """Install required packages for training."""
    print("📦 Installing D&D model training dependencies...")

    # Check if we're in a virtual environment
    in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    if not in_venv:
        print("⚠️  Warning: Not in a virtual environment.")
        print("💡 Consider running: python -m venv venv && source venv/bin/activate")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            return False

    # Install basic requirements first
    basic_packages = [
        "torch",
        "transformers>=4.30.0",
        "datasets",
        "accelerate",
        "peft",
        "trl",
        "sentencepiece",
        "protobuf"
    ]

    print("Installing basic packages...")
    for package in basic_packages:
        print(f"  Installing {package}...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", package
        ], capture_output=True, text=True)

        if result.returncode != 0:
            print(f"❌ Failed to install {package}")
            print(f"Error: {result.stderr}")
            return False

    # Install Unsloth based on platform
    if platform.machine() == 'arm64':  # Apple Silicon
        print("🍎 Installing Unsloth for Apple Silicon...")
        # Try different approaches for Apple Silicon
        unsloth_approaches = [
            ["unsloth"],  # Basic unsloth without extras
            ["unsloth", "--no-deps"],  # Without dependencies to avoid xformers issues
        ]

        unsloth_installed = False
        for approach in unsloth_approaches:
            print(f"  Trying: pip install {' '.join(approach)}")
            result = subprocess.run([
                sys.executable, "-m", "pip", "install"
            ] + approach, capture_output=True, text=True)

            if result.returncode == 0:
                unsloth_installed = True
                print("  ✅ Unsloth installed successfully")
                break
            else:
                print(f"  ⚠️  Approach failed: {result.stderr.split(chr(10))[0]}")

        if not unsloth_installed:
            print("  ⚠️  All Unsloth installation approaches failed")
            print("  💡 Training may still work with basic transformers")

    else:
        print("🐧 Installing Unsloth for Linux/Windows...")
        unsloth_packages = ["unsloth[colab-new]", "bitsandbytes"]

        for package in unsloth_packages:
            print(f"  Installing {package}...")
            result = subprocess.run([
                sys.executable, "-m", "pip", "install", package
            ], capture_output=True, text=True)

            if result.returncode != 0:
                print(f"⚠️  Warning: Failed to install {package}")
                print(f"Error: {result.stderr}")
                # Continue anyway - some packages might not be available on all platforms

    print("✅ Dependencies installation completed!")
    return True

def verify_installation():
    """Verify that key packages are installed correctly."""
    print("🔍 Verifying installation...")

    try:
        import torch
        print(f"✅ PyTorch {torch.__version__}")

        if torch.cuda.is_available():
            print(f"✅ CUDA available: {torch.cuda.get_device_name()}")
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            print("✅ Apple Silicon MPS available")
        else:
            print("⚠️  CPU only (training will be slower)")

    except ImportError:
        print("❌ PyTorch not found")
        return False

    try:
        import transformers
        print(f"✅ Transformers {transformers.__version__}")
    except ImportError:
        print("❌ Transformers not found")
        return False

    try:
        import datasets
        print(f"✅ Datasets available")
    except ImportError:
        print("❌ Datasets not found")
        return False

    try:
        import unsloth
        print(f"✅ Unsloth available")
    except ImportError:
        print("⚠️  Unsloth not found - training may not work")
        return False

    print("✅ All key dependencies verified!")
    return True

if __name__ == "__main__":
    print("🐉 D&D Model Training - Dependency Installation")
    print("=" * 50)

    if install_dependencies():
        if verify_installation():
            print("\n🎉 Ready to train! Run: python train_dnd_model.py")
        else:
            print("\n❌ Some dependencies missing. Check errors above.")
    else:
        print("\n❌ Installation failed. Check errors above.")
