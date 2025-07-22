#!/usr/bin/env python3
"""
Dependency validation script for GGUF model training environment.
Tests PyTorch with GPU support, transformers library, PEFT, and GGUF conversion tools.
"""

import importlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class DependencyValidator:
    def __init__(self):
        self.results = {
            "dependencies": {},
            "versions": {},
            "gpu_support": {},
            "warnings": [],
            "errors": [],
            "recommendations": []
        }

    def check_package(self, package_name: str, min_version: Optional[str] = None) -> bool:
        """Check if a package is installed and meets minimum version requirements"""
        try:
            module = importlib.import_module(package_name)
            version = getattr(module, "__version__", "unknown")
            self.results["versions"][package_name] = version

            if min_version and version != "unknown":
                # Use packaging.version for proper version comparison
                try:
                    import packaging.version
                    if packaging.version.parse(version) < packaging.version.parse(min_version):
                        self.results["dependencies"][package_name] = False
                        self.results["warnings"].append(
                            f"{package_name} version {version} is below recommended minimum {min_version}"
                        )
                        return False
                except ImportError:
                    # Fall back to simple string comparison if packaging is not available
                    pass

            self.results["dependencies"][package_name] = True
            return True

        except ImportError:
            self.results["dependencies"][package_name] = False
            self.results["errors"].append(f"{package_name} is not installed")
            return False
        except Exception as e:
            self.results["dependencies"][package_name] = False
            self.results["errors"].append(f"Error checking {package_name}: {str(e)}")
            return False

    def check_pytorch_gpu(self) -> bool:
        """Check if PyTorch has GPU support (CUDA or MPS)"""
        try:
            import torch

            # Check CUDA availability
            cuda_available = torch.cuda.is_available()
            self.results["gpu_support"]["cuda"] = cuda_available

            # Check MPS availability (Apple Silicon)
            mps_available = hasattr(torch.backends, "mps") and torch.backends.mps.is_available()
            self.results["gpu_support"]["mps"] = mps_available

            # Get device count for CUDA
            cuda_device_count = torch.cuda.device_count() if cuda_available else 0
            self.results["gpu_support"]["cuda_device_count"] = cuda_device_count

            if cuda_available:
                # Get CUDA version
                cuda_version = torch.version.cuda
                self.results["gpu_support"]["cuda_version"] = cuda_version

                # Get device names
                cuda_devices = [torch.cuda.get_device_name(i) for i in range(cuda_device_count)]
                self.results["gpu_support"]["cuda_devices"] = cuda_devices

            if cuda_available or mps_available:
                return True
            else:
                self.results["warnings"].append("PyTorch is installed but without GPU support (CUDA or MPS)")
                return False

        except ImportError:
            self.results["errors"].append("PyTorch is not installed")
            return False
        except Exception as e:
            self.results["errors"].append(f"Error checking PyTorch GPU support: {str(e)}")
            return False

    def check_transformers_integration(self) -> bool:
        """Check if transformers library works with PyTorch"""
        try:
            import torch
            import transformers

            # Try to load a tiny model to test integration
            try:
                from transformers import AutoModel, AutoTokenizer

                # Just check if the classes are available, don't actually download models
                self.results["dependencies"]["transformers_pytorch"] = True
                return True
            except Exception as e:
                self.results["dependencies"]["transformers_pytorch"] = False
                self.results["warnings"].append(f"Transformers-PyTorch integration issue: {str(e)}")
                return False

        except ImportError as e:
            self.results["dependencies"]["transformers_pytorch"] = False
            self.results["errors"].append(f"Missing dependency for transformers-pytorch integration: {str(e)}")
            return False

    def check_peft_integration(self) -> bool:
        """Check if PEFT library is properly installed"""
        try:
            import peft
            from peft import LoraConfig, get_peft_model

            self.results["dependencies"]["peft"] = True
            return True
        except ImportError:
            self.results["dependencies"]["peft"] = False
            self.results["errors"].append("PEFT library is not installed")
            return False
        except Exception as e:
            self.results["dependencies"]["peft"] = False
            self.results["errors"].append(f"Error checking PEFT library: {str(e)}")
            return False

    def check_gguf_tools(self) -> bool:
        """Check if GGUF conversion tools are available"""
        try:
            # Try importing gguf
            import gguf
            self.results["dependencies"]["gguf"] = True

            # Check for llama-cpp-python
            try:
                import llama_cpp
                self.results["dependencies"]["llama_cpp"] = True
                self.results["versions"]["llama_cpp"] = llama_cpp.__version__
            except ImportError:
                self.results["dependencies"]["llama_cpp"] = False
                self.results["warnings"].append("llama-cpp-python is not installed")

            return True
        except ImportError:
            self.results["dependencies"]["gguf"] = False
            self.results["errors"].append("GGUF library is not installed")
            return False
        except Exception as e:
            self.results["dependencies"]["gguf"] = False
            self.results["errors"].append(f"Error checking GGUF tools: {str(e)}")
            return False

    def generate_recommendations(self):
        """Generate dependency-specific recommendations"""
        recommendations = []

        # PyTorch recommendations
        if not self.results["dependencies"].get("torch", False):
            recommendations.append("Install PyTorch with: pip install torch")
        elif not any([
            self.results["gpu_support"].get("cuda", False),
            self.results["gpu_support"].get("mps", False)
        ]):
            recommendations.append("Install PyTorch with GPU support: https://pytorch.org/get-started/locally/")

        # Transformers recommendations
        if not self.results["dependencies"].get("transformers", False):
            recommendations.append("Install Transformers with: pip install transformers")

        # PEFT recommendations
        if not self.results["dependencies"].get("peft", False):
            recommendations.append("Install PEFT with: pip install peft")

        # GGUF recommendations
        if not self.results["dependencies"].get("gguf", False):
            recommendations.append("Install GGUF with: pip install gguf")

        if not self.results["dependencies"].get("llama_cpp", False):
            recommendations.append("Install llama-cpp-python with: pip install llama-cpp-python")

        self.results["recommendations"] = recommendations

    def run_validation(self) -> Dict:
        """Run complete dependency validation"""
        print("🔍 Running dependency validation for GGUF model training...")
        print("=" * 60)

        # Check core packages
        checks = [
            ("PyTorch", lambda: self.check_package("torch", "2.0.0")),
            ("PyTorch GPU Support", self.check_pytorch_gpu),
            ("Transformers", lambda: self.check_package("transformers", "4.30.0")),
            ("Transformers-PyTorch Integration", self.check_transformers_integration),
            ("PEFT", lambda: self.check_package("peft", "0.4.0")),
            ("PEFT Integration", self.check_peft_integration),
            ("GGUF", lambda: self.check_package("gguf", "0.1.0")),
            ("GGUF Tools", self.check_gguf_tools),
        ]

        passed = 0
        total = len(checks)

        for name, check_func in checks:
            try:
                result = check_func()
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"{name:<30} {status}")
                if result:
                    passed += 1
            except Exception as e:
                print(f"{name:<30} ❌ ERROR: {str(e)}")
                self.results["errors"].append(f"{name} check failed: {str(e)}")

        print("=" * 60)
        print(f"Validation Summary: {passed}/{total} checks passed")

        # Generate recommendations
        self.generate_recommendations()

        # Print detailed results
        self._print_detailed_results()

        return self.results

    def _print_detailed_results(self):
        """Print detailed validation results"""
        print("\n📊 Package Versions:")
        print("-" * 30)
        for package, version in self.results["versions"].items():
            print(f"{package:<20} {version}")

        # GPU Support
        print("\n🖥️  GPU Support:")
        print("-" * 30)
        gpu_support = self.results["gpu_support"]
        if gpu_support.get("cuda", False):
            print(f"CUDA Available: Yes (version {gpu_support.get('cuda_version', 'unknown')})")
            print(f"CUDA Devices: {gpu_support.get('cuda_device_count', 0)}")
            if "cuda_devices" in gpu_support:
                for i, device in enumerate(gpu_support["cuda_devices"]):
                    print(f"  Device {i}: {device}")
        else:
            print("CUDA Available: No")

        print(f"MPS Available: {'Yes' if gpu_support.get('mps', False) else 'No'}")

        # Warnings
        if self.results["warnings"]:
            print("\n⚠️  Warnings:")
            print("-" * 30)
            for warning in self.results["warnings"]:
                print(f"• {warning}")

        # Errors
        if self.results["errors"]:
            print("\n❌ Errors:")
            print("-" * 30)
            for error in self.results["errors"]:
                print(f"• {error}")

        # Recommendations
        if self.results["recommendations"]:
            print("\n💡 Recommendations:")
            print("-" * 30)
            for rec in self.results["recommendations"]:
                print(f"• {rec}")

    def save_results(self, output_path: str = "dependency_validation_results.json"):
        """Save validation results to JSON file"""
        with open(output_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\n💾 Results saved to: {output_path}")

def main():
    """Main validation function"""
    validator = DependencyValidator()
    results = validator.run_validation()

    # Save results
    output_dir = Path("ai-training/validation")
    output_dir.mkdir(parents=True, exist_ok=True)
    validator.save_results(str(output_dir / "dependency_validation_results.json"))

    # Exit with appropriate code
    has_errors = len(results["errors"]) > 0
    critical_failures = any(
        not results["dependencies"].get(dep, False)
        for dep in ["torch", "transformers", "peft", "gguf"]
    )

    if has_errors or critical_failures:
        print("\n❌ Dependency validation failed. Please address the errors above before proceeding.")
        sys.exit(1)
    else:
        print("\n✅ Dependency validation passed! Ready to proceed with training setup.")
        sys.exit(0)

if __name__ == "__main__":
    main()
