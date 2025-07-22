#!/usr/bin/env python3
"""
System validation script for GGUF model training environment.
Checks hardware requirements, Python version, GPU availability, and system resources.
"""

import json
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import psutil


class SystemValidator:
    def __init__(self):
        self.results = {
            "system_info": {},
            "requirements": {},
            "recommendations": [],
            "warnings": [],
            "errors": []
        }

    def check_python_version(self) -> bool:
        """Check if Python version is compatible (3.9-3.11)"""
        version = sys.version_info
        self.results["system_info"]["python_version"] = f"{version.major}.{version.minor}.{version.micro}"

        if version.major == 3 and 9 <= version.minor <= 11:
            self.results["requirements"]["python_compatible"] = True
            return True
        else:
            self.results["requirements"]["python_compatible"] = False
            self.results["errors"].append(
                f"Python {version.major}.{version.minor} not supported. Requires Python 3.9-3.11"
            )
            return False

    def check_system_memory(self) -> bool:
        """Check system RAM (≥32GB recommended)"""
        memory_gb = psutil.virtual_memory().total / (1024**3)
        self.results["system_info"]["ram_gb"] = round(memory_gb, 2)

        if memory_gb >= 32:
            self.results["requirements"]["memory_sufficient"] = True
            return True
        elif memory_gb >= 16:
            self.results["requirements"]["memory_sufficient"] = True
            self.results["warnings"].append(
                f"System has {memory_gb:.1f}GB RAM. 32GB+ recommended for optimal training performance"
            )
            return True
        else:
            self.results["requirements"]["memory_sufficient"] = False
            self.results["errors"].append(
                f"Insufficient RAM: {memory_gb:.1f}GB. Minimum 16GB required, 32GB+ recommended"
            )
            return False

    def check_disk_space(self) -> bool:
        """Check available disk space (≥50GB required)"""
        disk_usage = shutil.disk_usage(".")
        free_gb = disk_usage.free / (1024**3)
        self.results["system_info"]["disk_free_gb"] = round(free_gb, 2)

        if free_gb >= 50:
            self.results["requirements"]["disk_space_sufficient"] = True
            return True
        else:
            self.results["requirements"]["disk_space_sufficient"] = False
            self.results["errors"].append(
                f"Insufficient disk space: {free_gb:.1f}GB free. Minimum 50GB required"
            )
            return False

    def check_gpu_availability(self) -> Tuple[bool, Optional[str]]:
        """Check GPU availability and type (CUDA/MPS)"""
        gpu_info = {"available": False, "type": None, "memory_gb": 0}

        # Check for NVIDIA GPU (CUDA)
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                memory_mb = int(result.stdout.strip())
                memory_gb = memory_mb / 1024
                gpu_info.update({
                    "available": True,
                    "type": "CUDA",
                    "memory_gb": round(memory_gb, 2)
                })
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError, ValueError):
            pass

        # Check for Apple Silicon (MPS) on macOS
        if platform.system() == "Darwin":
            try:
                result = subprocess.run(
                    ["system_profiler", "SPDisplaysDataType"],
                    capture_output=True, text=True, timeout=10
                )
                if "Apple" in result.stdout and ("M1" in result.stdout or "M2" in result.stdout or "M3" in result.stdout):
                    # Apple Silicon GPUs don't have discrete memory, use system RAM
                    gpu_info.update({
                        "available": True,
                        "type": "MPS",
                        "memory_gb": self.results["system_info"]["ram_gb"]  # Unified memory
                    })
            except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
                pass

        self.results["system_info"]["gpu"] = gpu_info

        if gpu_info["available"]:
            if gpu_info["memory_gb"] >= 16:
                self.results["requirements"]["gpu_memory_sufficient"] = True
                return True, gpu_info["type"]
            else:
                self.results["requirements"]["gpu_memory_sufficient"] = False
                self.results["warnings"].append(
                    f"GPU has {gpu_info['memory_gb']:.1f}GB memory. 16GB+ recommended for training"
                )
                return True, gpu_info["type"]
        else:
            self.results["requirements"]["gpu_memory_sufficient"] = False
            self.results["warnings"].append(
                "No GPU detected. Training will use CPU (significantly slower)"
            )
            return False, None

    def check_system_platform(self) -> bool:
        """Check system platform and architecture"""
        system_info = {
            "platform": platform.system(),
            "architecture": platform.machine(),
            "processor": platform.processor()
        }
        self.results["system_info"]["platform"] = system_info

        # All major platforms supported
        if system_info["platform"] in ["Darwin", "Linux", "Windows"]:
            self.results["requirements"]["platform_supported"] = True
            return True
        else:
            self.results["requirements"]["platform_supported"] = False
            self.results["errors"].append(f"Unsupported platform: {system_info['platform']}")
            return False

    def generate_recommendations(self):
        """Generate system-specific recommendations"""
        recommendations = []

        # GPU recommendations
        gpu_info = self.results["system_info"].get("gpu", {})
        if not gpu_info.get("available"):
            recommendations.append("Consider using a system with GPU acceleration for faster training")
        elif gpu_info.get("memory_gb", 0) < 16:
            recommendations.append("Consider upgrading GPU memory to 16GB+ for optimal training performance")

        # Memory recommendations
        ram_gb = self.results["system_info"].get("ram_gb", 0)
        if ram_gb < 32:
            recommendations.append("Consider upgrading system RAM to 32GB+ for optimal training performance")

        # Platform-specific recommendations
        platform_info = self.results["system_info"].get("platform", {})
        if platform_info.get("platform") == "Darwin":
            recommendations.append("macOS detected: Ensure Xcode Command Line Tools are installed")
            if gpu_info.get("type") == "MPS":
                recommendations.append("Apple Silicon detected: MPS acceleration will be used for training")
        elif platform_info.get("platform") == "Linux":
            recommendations.append("Linux detected: Ensure CUDA drivers are properly installed if using NVIDIA GPU")

        self.results["recommendations"] = recommendations

    def run_validation(self) -> Dict:
        """Run complete system validation"""
        print("🔍 Running system validation for GGUF model training...")
        print("=" * 60)

        # Run all checks
        checks = [
            ("Python Version", self.check_python_version),
            ("System Memory", self.check_system_memory),
            ("Disk Space", self.check_disk_space),
            ("GPU Availability", lambda: self.check_gpu_availability()[0]),
            ("Platform Support", self.check_system_platform)
        ]

        passed = 0
        total = len(checks)

        for name, check_func in checks:
            try:
                result = check_func()
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"{name:<20} {status}")
                if result:
                    passed += 1
            except Exception as e:
                print(f"{name:<20} ❌ ERROR: {str(e)}")
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
        print("\n📊 System Information:")
        print("-" * 30)

        # System info
        for key, value in self.results["system_info"].items():
            if isinstance(value, dict):
                print(f"{key.replace('_', ' ').title()}:")
                for sub_key, sub_value in value.items():
                    print(f"  {sub_key.replace('_', ' ').title()}: {sub_value}")
            else:
                print(f"{key.replace('_', ' ').title()}: {value}")

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

    def save_results(self, output_path: str = "system_validation_results.json"):
        """Save validation results to JSON file"""
        with open(output_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\n💾 Results saved to: {output_path}")

def main():
    """Main validation function"""
    validator = SystemValidator()
    results = validator.run_validation()

    # Save results
    output_dir = Path("ai-training/validation")
    output_dir.mkdir(parents=True, exist_ok=True)
    validator.save_results(str(output_dir / "system_validation_results.json"))

    # Exit with appropriate code
    has_errors = len(results["errors"]) > 0
    critical_failures = any(
        not results["requirements"].get(req, False)
        for req in ["python_compatible", "platform_supported", "disk_space_sufficient"]
    )

    if has_errors or critical_failures:
        print("\n❌ System validation failed. Please address the errors above before proceeding.")
        sys.exit(1)
    else:
        print("\n✅ System validation passed! Ready to proceed with training setup.")
        sys.exit(0)

if __name__ == "__main__":
    main()
