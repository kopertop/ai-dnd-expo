#!/bin/bash

# AI D&D Platform Deployment Script
# This script handles deployment to different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not installed."
        exit 1
    fi
    
    if ! command -v eas &> /dev/null; then
        print_error "EAS CLI is required but not installed. Install with: npm install -g eas-cli"
        exit 1
    fi
    
    print_info "All dependencies are installed."
}

# Function to setup environment
setup_environment() {
    local env=$1
    print_info "Setting up environment for: $env"
    
    # Copy environment-specific config
    if [ -f ".env.$env" ]; then
        cp ".env.$env" ".env"
        print_info "Environment configuration loaded from .env.$env"
    else
        print_warn "No .env.$env file found. Using default configuration."
    fi
}

# Function to run tests
run_tests() {
    print_info "Running tests..."
    
    # Type checking
    print_info "Running TypeScript type check..."
    npx tsc --noEmit
    
    # Linting
    print_info "Running ESLint..."
    npm run lint
    
    # Unit tests (if they exist)
    if [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
        print_info "Running unit tests..."
        npm test
    else
        print_warn "No test configuration found. Skipping unit tests."
    fi
    
    print_info "All tests passed!"
}

# Function to build the app
build_app() {
    local platform=$1
    local profile=$2
    
    print_info "Building app for platform: $platform, profile: $profile"
    
    if [ "$platform" = "all" ]; then
        eas build --platform all --profile "$profile" --non-interactive
    else
        eas build --platform "$platform" --profile "$profile" --non-interactive
    fi
}

# Function to publish updates
publish_update() {
    local branch=$1
    local message=$2
    
    print_info "Publishing update to branch: $branch"
    eas update --branch "$branch" --message "$message"
}

# Function to submit to app stores
submit_to_stores() {
    local profile=$1
    
    print_info "Submitting to app stores with profile: $profile"
    eas submit --platform all --profile "$profile" --non-interactive
}

# Main deployment function
deploy() {
    local environment=$1
    local platform=${2:-all}
    local skip_tests=${3:-false}
    
    print_info "Starting deployment to $environment environment..."
    
    # Check dependencies
    check_dependencies
    
    # Setup environment
    setup_environment "$environment"
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm ci
    
    # Run tests unless skipped
    if [ "$skip_tests" != "true" ]; then
        run_tests
    else
        print_warn "Skipping tests (--skip-tests flag used)"
    fi
    
    # Get commit message for update
    local commit_message=$(git log -1 --pretty=%s)
    local update_message="Deploy to $environment: $commit_message"
    
    case $environment in
        development)
            build_app "$platform" "development"
            ;;
        staging)
            build_app "$platform" "staging"
            ;;
        production)
            build_app "$platform" "production"
            print_info "Production deployment completed!"
            print_info "To submit to app stores, run: $0 submit production"
            ;;
        *)
            print_error "Unknown environment: $environment"
            print_error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
    
    print_info "Deployment to $environment completed successfully!"
}

# Function to handle app store submission
submit() {
    local environment=$1
    
    if [ "$environment" != "staging" ] && [ "$environment" != "production" ]; then
        print_error "Can only submit staging or production builds"
        exit 1
    fi
    
    print_info "Submitting $environment build to app stores..."
    submit_to_stores "$environment"
    print_info "Submission completed!"
}

# Function to show help
show_help() {
    echo "AI D&D Platform Deployment Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  deploy <env> [platform] [--skip-tests]  Deploy to environment"
    echo "  submit <env>                           Submit to app stores"
    echo "  help                                   Show this help message"
    echo ""
    echo "Environments:"
    echo "  development  - Development builds"
    echo "  staging      - Staging builds and updates"
    echo "  production   - Production builds and updates"
    echo ""
    echo "Platforms:"
    echo "  all (default) - Build for all platforms"
    echo "  ios          - Build for iOS only"
    echo "  android      - Build for Android only"
    echo ""
    echo "Examples:"
    echo "  $0 deploy development"
    echo "  $0 deploy staging ios"
    echo "  $0 deploy production all --skip-tests"
    echo "  $0 submit production"
}

# Main script logic
case $1 in
    deploy)
        if [ -z "$2" ]; then
            print_error "Environment is required for deploy command"
            show_help
            exit 1
        fi
        
        skip_tests=false
        if [ "$4" = "--skip-tests" ] || [ "$3" = "--skip-tests" ]; then
            skip_tests=true
        fi
        
        deploy "$2" "$3" "$skip_tests"
        ;;
    submit)
        if [ -z "$2" ]; then
            print_error "Environment is required for submit command"
            show_help
            exit 1
        fi
        submit "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac