# Requirements Document

## Introduction

Deprecated: We no longer train or ship GGUF models. The platform uses Apple on-device foundational models via `@react-native-ai/apple` with the `ai` SDK.

## Requirements

### Requirement 1 (CRITICAL)

Removed (replaced by on-device Apple provider).

#### Acceptance Criteria

1. WHEN running `pnpm run train` THEN the system SHALL automatically parse all training data from the ai-training directory
2. WHEN executing the training command THEN the system SHALL automatically download and install all required dependencies without user intervention
3. WHEN training begins THEN the system SHALL automatically train a new LLM based on Gemma3n with D&D-specific data from the training scenarios
4. WHEN training completes THEN the system SHALL generate a GGUF file that can be directly used in the CactusTTS system
5. WHEN the model is ready THEN the system SHALL provide the correct modelPath and mmprojPath values for seamless integration with cactus.ts
6. WHEN dependencies are missing THEN the system SHALL automatically detect, download, and install them including Python packages, model dependencies, and training frameworks
7. WHEN training data is updated THEN the system SHALL detect changes and retrain only necessary components to optimize training time
8. WHEN the command fails THEN the system SHALL provide clear error messages with specific recovery instructions and troubleshooting steps
9. WHEN training is successful THEN the system SHALL automatically validate the generated model works with the existing Cactus integration and D&D tool calling format
10. WHEN the process completes THEN the system SHALL output the exact modelPath and mmprojPath configuration needed for cactus.ts integration
11. WHEN the training process runs THEN the system SHALL provide real-time progress updates and estimated completion times
12. WHEN the GGUF model is generated THEN the system SHALL ensure it is compatible with the existing CactusTTS infrastructure and local-dm-agent.ts implementation

### Requirement 2

**User Story:** As a developer, I want to set up a training environment for GGUF models in a Jupyter notebook on macOS, so that I can fine-tune existing models with D&D-specific data.

#### Acceptance Criteria

1. WHEN the training environment is initialized THEN the system SHALL run entirely within a Jupyter notebook on macOS
2. WHEN setting up the notebook THEN the system SHALL provide clear installation instructions for all dependencies
3. WHEN the training environment is initialized THEN the system SHALL create an isolated `ai-training` directory with all necessary dependencies
4. WHEN setting up the environment THEN the system SHALL support Python-based training tools and libraries
5. WHEN configuring the base model THEN the system SHALL support loading existing models like Gemma-3 or Qwen variants
6. IF the base model is incompatible THEN the system SHALL provide clear error messages and suggested alternatives
7. WHEN the environment is ready THEN the system SHALL validate all dependencies and provide a status report
8. WHEN running on macOS THEN the system SHALL support local training without requiring external cloud services
9. WHEN GPU acceleration is available THEN the system SHALL automatically detect and utilize Metal Performance Shaders capabilities
10. WHEN running without GPU THEN the system SHALL fall back to CPU-based training with reasonable performance

### Requirement 2

**User Story:** As a developer, I want to define training data structure with system prompts and tool calls, so that the model learns D&D-specific interactions and mechanics.

#### Acceptance Criteria

1. WHEN creating training data THEN the system SHALL support structured format with system prompt, role, scene, and character list
2. WHEN defining tool calls THEN the system SHALL use the format `[toolcall: argument]` (e.g., `[roll: perception]`, `[health: player, -1]`)
3. WHEN structuring conversations THEN the system SHALL include context about game state, character information, and available actions
4. WHEN validating training data THEN the system SHALL ensure proper formatting and completeness of required fields
5. WHEN processing tool calls THEN the system SHALL validate tool names and argument formats against supported game mechanics

### Requirement 3

**User Story:** As a developer, I want to manage training datasets with different D&D scenarios, so that the model can handle diverse gameplay situations.

#### Acceptance Criteria

1. WHEN organizing training data THEN the system SHALL support multiple dataset categories (combat, roleplay, exploration, etc.)
2. WHEN adding new scenarios THEN the system SHALL validate data format and tool call syntax
3. WHEN managing datasets THEN the system SHALL provide utilities for data validation, cleaning, and preprocessing
4. WHEN preparing training batches THEN the system SHALL support data augmentation and balancing techniques
5. WHEN versioning datasets THEN the system SHALL track changes and maintain dataset integrity

### Requirement 4

**User Story:** As a developer, I want to configure and execute model training, so that I can create custom GGUF models optimized for D&D gameplay.

#### Acceptance Criteria

1. WHEN configuring training THEN the system SHALL support hyperparameter tuning for learning rate, batch size, and epochs
2. WHEN starting training THEN the system SHALL provide progress monitoring and loss tracking
3. WHEN training completes THEN the system SHALL generate a GGUF format model file compatible with Cactus
4. WHEN training fails THEN the system SHALL provide detailed error logs and recovery suggestions
5. WHEN evaluating results THEN the system SHALL provide metrics on model performance and tool call accuracy

### Requirement 5

**User Story:** As a developer, I want to validate and test trained models, so that I can ensure they work correctly with the D&D platform before deployment.

#### Acceptance Criteria

1. WHEN testing trained models THEN the system SHALL provide a validation framework for D&D-specific scenarios
2. WHEN evaluating tool calls THEN the system SHALL verify correct parsing and execution of game mechanics
3. WHEN testing conversations THEN the system SHALL validate response quality and context awareness
4. WHEN comparing models THEN the system SHALL provide benchmarking tools against baseline models
5. WHEN validation passes THEN the system SHALL generate a compatibility report for Cactus integration

### Requirement 6

**User Story:** As a developer, I want to integrate trained models with the Cactus agent system, so that custom models can be used in the D&D platform.

#### Acceptance Criteria

1. WHEN exporting models THEN the system SHALL generate GGUF files compatible with the local Cactus infrastructure
2. WHEN integrating models THEN the system SHALL provide configuration templates for Cactus agent setup
3. WHEN deploying models THEN the system SHALL validate model loading and basic functionality
4. WHEN switching models THEN the system SHALL support hot-swapping between different trained models
5. WHEN monitoring performance THEN the system SHALL provide metrics on model inference speed and accuracy
6. WHEN generating models for mobile deployment THEN the system SHALL ensure model size stays under 2GB for iPhone compatibility
7. WHEN configuring memory limits THEN the system SHALL provide customizable size constraints with sensible defaults
8. WHEN optimizing for mobile THEN the system SHALL support quantization techniques to reduce model size while maintaining quality

### Requirement 7

**User Story:** As a developer, I want to maintain and update training infrastructure, so that I can continuously improve model quality and add new capabilities.

#### Acceptance Criteria

1. WHEN updating training data THEN the system SHALL support incremental training and model updates
2. WHEN adding new tools THEN the system SHALL provide framework for extending tool call vocabulary
3. WHEN optimizing performance THEN the system SHALL support model quantization and optimization techniques
4. WHEN backing up models THEN the system SHALL provide versioning and rollback capabilities
5. WHEN documenting changes THEN the system SHALL maintain training logs and model genealogy

### Requirement 8

**User Story:** As a developer, I want to provide simple markdown files as training data, so that I can easily create realistic D&D scenarios with proper system context and tool interactions.

#### Acceptance Criteria

1. WHEN creating training scenarios THEN the system SHALL support markdown files with structured format including SYSTEM, User, DM, and TOOLCALL sections
2. WHEN defining system context THEN the system SHALL parse Role, World, Location, and Party information from markdown headers
3. WHEN processing conversations THEN the system SHALL extract User messages, DM responses, and tool call interactions in sequence
4. WHEN handling tool calls THEN the system SHALL recognize `[roll: perception]` format in DM responses and corresponding `<TOOLCALL>perception: 15 + 10(skill) = *30*</TOOLCALL>` results
5. WHEN organizing scenarios THEN the system SHALL support folder structure for different scenario types (combat, roleplay, exploration, etc.)
6. WHEN validating markdown THEN the system SHALL ensure proper formatting of SYSTEM blocks, conversation flow, and tool call syntax
7. WHEN processing party information THEN the system SHALL extract character details including class, level, health, experience, and inventory
8. WHEN converting to training format THEN the system SHALL transform markdown scenarios into model-compatible training sequences
