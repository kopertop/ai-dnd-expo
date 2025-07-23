#!/usr/bin/env python3
"""
Incremental Training Support
Automatically detects updated training data and performs incremental training
"""

import hashlib
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class IncrementalTrainingManager:
    """Manages incremental training and model versioning."""

    def __init__(self, data_dir: str = "./data", models_dir: str = "./trained_models"):
        self.data_dir = Path(data_dir)
        self.models_dir = Path(models_dir)
        self.metadata_file = self.models_dir / "training_metadata.json"
        self.backup_dir = self.models_dir / "backups"

        # Ensure directories exist
        self.models_dir.mkdir(exist_ok=True)
        self.backup_dir.mkdir(exist_ok=True)

    def get_data_hash(self) -> str:
        """Calculate hash of all training data files."""
        print("🔍 Calculating training data hash...")

        hasher = hashlib.sha256()

        # Get all markdown files in scenarios directory
        scenario_files = []
        if (self.data_dir / "scenarios").exists():
            for scenario_file in sorted((self.data_dir / "scenarios").rglob("*.md")):
                scenario_files.append(scenario_file)

        # Hash file contents
        for file_path in scenario_files:
            try:
                with open(file_path, 'rb') as f:
                    hasher.update(f.read())
                hasher.update(str(file_path).encode())
            except Exception as e:
                print(f"⚠️  Warning: Could not hash {file_path}: {e}")

        data_hash = hasher.hexdigest()
        print(f"📊 Data hash: {data_hash[:16]}...")
        return data_hash

    def load_metadata(self) -> Dict:
        """Load training metadata."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️  Warning: Could not load metadata: {e}")

        return {
            "last_training_date": None,
            "last_data_hash": None,
            "model_versions": [],
            "current_version": None
        }

    def save_metadata(self, metadata: Dict):
        """Save training metadata."""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            print(f"💾 Metadata saved to {self.metadata_file}")
        except Exception as e:
            print(f"❌ Failed to save metadata: {e}")

    def check_for_updates(self) -> Tuple[bool, str]:
        """Check if training data has been updated."""
        print("🔍 Checking for training data updates...")

        current_hash = self.get_data_hash()
        metadata = self.load_metadata()
        last_hash = metadata.get("last_data_hash")

        if last_hash is None:
            print("📝 No previous training detected - full training required")
            return True, "initial_training"

        if current_hash != last_hash:
            print("🔄 Training data has changed - incremental training required")
            return True, "incremental_training"

        print("✅ Training data unchanged - no training needed")
        return False, "no_changes"

    def create_model_backup(self, model_path: Path, version: str) -> Path:
        """Create backup of existing model before training."""
        print(f"💾 Creating backup of model version {version}...")

        if not model_path.exists():
            print("⚠️  No existing model to backup")
            return None

        backup_path = self.backup_dir / f"model_v{version}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        try:
            if model_path.is_dir():
                shutil.copytree(model_path, backup_path)
            else:
                shutil.copy2(model_path, backup_path)

            print(f"✅ Backup created at {backup_path}")
            return backup_path

        except Exception as e:
            print(f"❌ Failed to create backup: {e}")
            return None

    def get_next_version(self, metadata: Dict) -> str:
        """Get next version number."""
        versions = metadata.get("model_versions", [])
        if not versions:
            return "1.0.0"

        # Parse latest version and increment
        try:
            latest = versions[-1]["version"]
            major, minor, patch = map(int, latest.split('.'))
            return f"{major}.{minor}.{patch + 1}"
        except:
            return f"1.0.{len(versions)}"

    def perform_incremental_training(self, base_model_path: Path, training_type: str) -> bool:
        """Perform incremental training on existing model."""
        print(f"🚀 Starting {training_type}...")

        try:
            # Import training modules
            from train_dnd_model_v2 import DNDModelTrainer

            # Initialize trainer with incremental settings
            trainer = DNDModelTrainer()

            if training_type == "incremental_training":
                print("🔄 Performing incremental training on existing model...")
                # Load existing model as base
                trainer.base_model_path = str(base_model_path)
                trainer.incremental_mode = True
                trainer.learning_rate = 1e-6  # Lower learning rate for incremental
                trainer.max_steps = 20  # Fewer steps for incremental
            else:
                print("🆕 Performing initial training...")
                trainer.incremental_mode = False

            # Run training
            success = trainer.train()

            if success:
                print("✅ Training completed successfully!")
                return True
            else:
                print("❌ Training failed!")
                return False

        except Exception as e:
            print(f"❌ Training error: {e}")
            return False

    def rollback_to_backup(self, backup_path: Path, model_path: Path) -> bool:
        """Rollback to previous model version if training fails."""
        print(f"🔄 Rolling back to backup: {backup_path}")

        try:
            # Remove failed model
            if model_path.exists():
                if model_path.is_dir():
                    shutil.rmtree(model_path)
                else:
                    model_path.unlink()

            # Restore backup
            if backup_path.is_dir():
                shutil.copytree(backup_path, model_path)
            else:
                shutil.copy2(backup_path, model_path)

            print("✅ Rollback completed successfully!")
            return True

        except Exception as e:
            print(f"❌ Rollback failed: {e}")
            return False

    def update_version_info(self, metadata: Dict, version: str, training_type: str, success: bool):
        """Update version information in metadata."""
        version_info = {
            "version": version,
            "date": datetime.now().isoformat(),
            "training_type": training_type,
            "data_hash": self.get_data_hash(),
            "success": success
        }

        metadata["model_versions"].append(version_info)
        if success:
            metadata["current_version"] = version
            metadata["last_training_date"] = version_info["date"]
            metadata["last_data_hash"] = version_info["data_hash"]

    def run_incremental_training(self) -> bool:
        """Main function to run incremental training workflow."""
        print("🔄 Starting Incremental Training Workflow")
        print("=" * 50)

        # Check for updates
        needs_training, training_type = self.check_for_updates()

        if not needs_training:
            print("✅ No training needed - data unchanged")
            return True

        # Load metadata
        metadata = self.load_metadata()

        # Get version info
        version = self.get_next_version(metadata)
        model_path = self.models_dir / "dnd_model"

        print(f"📦 Training version: {version}")
        print(f"🎯 Training type: {training_type}")

        # Create backup if model exists
        backup_path = None
        if model_path.exists() and training_type == "incremental_training":
            current_version = metadata.get("current_version", "unknown")
            backup_path = self.create_model_backup(model_path, current_version)

        # Perform training
        success = self.perform_incremental_training(model_path, training_type)

        # Handle results
        if success:
            print(f"✅ Training version {version} completed successfully!")
            self.update_version_info(metadata, version, training_type, True)
        else:
            print(f"❌ Training version {version} failed!")
            self.update_version_info(metadata, version, training_type, False)

            # Rollback if we have a backup
            if backup_path and backup_path.exists():
                self.rollback_to_backup(backup_path, model_path)

        # Save metadata
        self.save_metadata(metadata)

        print("\n" + "=" * 60)
        if success:
            print("🎉 INCREMENTAL TRAINING COMPLETED!")
            print(f"📦 Model Version: {version}")
            print(f"📁 Model Path: {model_path}")
        else:
            print("💥 INCREMENTAL TRAINING FAILED!")
            if backup_path:
                print("🔄 Rolled back to previous version")
        print("=" * 60)

        return success

    def list_versions(self):
        """List all model versions."""
        metadata = self.load_metadata()
        versions = metadata.get("model_versions", [])

        print("\n📦 Model Version History")
        print("=" * 40)

        if not versions:
            print("No versions found")
            return

        for version_info in versions:
            status = "✅" if version_info["success"] else "❌"
            current = "🎯" if version_info["version"] == metadata.get("current_version") else "  "
            print(f"{current} {status} v{version_info['version']} - {version_info['date'][:19]} - {version_info['training_type']}")

    def cleanup_old_backups(self, keep_count: int = 5):
        """Clean up old backup files, keeping only the most recent ones."""
        print(f"🧹 Cleaning up old backups (keeping {keep_count} most recent)...")

        try:
            backups = sorted(self.backup_dir.glob("model_v*"), key=lambda x: x.stat().st_mtime, reverse=True)

            for backup in backups[keep_count:]:
                if backup.is_dir():
                    shutil.rmtree(backup)
                else:
                    backup.unlink()
                print(f"🗑️  Removed old backup: {backup.name}")

            print(f"✅ Cleanup completed - {len(backups[keep_count:])} backups removed")

        except Exception as e:
            print(f"⚠️  Cleanup warning: {e}")


def main():
    """Main function for command-line usage."""
    import argparse

    parser = argparse.ArgumentParser(description="Incremental Training Manager")
    parser.add_argument("--check", action="store_true", help="Check for updates without training")
    parser.add_argument("--train", action="store_true", help="Run incremental training")
    parser.add_argument("--versions", action="store_true", help="List model versions")
    parser.add_argument("--cleanup", action="store_true", help="Clean up old backups")
    parser.add_argument("--data-dir", default="./data", help="Training data directory")
    parser.add_argument("--models-dir", default="./trained_models", help="Models directory")

    args = parser.parse_args()

    manager = IncrementalTrainingManager(args.data_dir, args.models_dir)

    if args.check:
        needs_training, training_type = manager.check_for_updates()
        print(f"Training needed: {needs_training} ({training_type})")

    elif args.train:
        success = manager.run_incremental_training()
        exit(0 if success else 1)

    elif args.versions:
        manager.list_versions()

    elif args.cleanup:
        manager.cleanup_old_backups()

    else:
        print("Use --help for usage information")


if __name__ == "__main__":
    main()
