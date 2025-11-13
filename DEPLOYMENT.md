# Deployment Guide

This document outlines the deployment process for the AI D&D Platform.

## 🚀 Overview

The project uses **Expo Application Services (EAS)** for building and deploying the app, with **GitHub Actions** for automated CI/CD workflows.

### Deployment Environments

- **Development**: Local development builds and testing
- **Staging**: Internal testing and QA environment
- **Production**: Live app store releases

## 🔧 Setup Requirements

### Prerequisites

1. **EAS CLI Installation**

   ```bash
   npm install -g eas-cli
   ```

2. **Expo Account**
   - Create account at [expo.dev](https://expo.dev)
   - Run `eas login` to authenticate

3. **Environment Variables**
   - Copy `.env.example` to `.env` and configure
   - Set up GitHub Secrets for CI/CD (see below)

### GitHub Secrets Configuration

Add these secrets to your GitHub repository:

1. **EXPO_TOKEN**: Personal access token from Expo
   - Generate at: https://expo.dev/accounts/[account]/settings/access-tokens
   - Add to GitHub: Settings > Secrets and variables > Actions

2. **Apple Developer Account** (for iOS builds)
   - Apple ID and Team ID
   - Configure in `eas.json`

3. **Google Play Console** (for Android builds)
   - Service account key
   - Configure in `eas.json`

## 🏗️ Build Profiles

### Development Profile

- **Purpose**: Local development and testing
- **Distribution**: Internal only
- **Development Client**: Enabled
- **Command**: `eas build --profile development`

### Staging Profile

- **Purpose**: Internal testing and QA
- **Distribution**: Internal testers
- **Updates**: Enabled via `staging` branch
- **Command**: `eas build --profile staging`

### Production Profile

- **Purpose**: App store releases
- **Distribution**: App stores
- **Updates**: Enabled via `production` branch
- **Command**: `eas build --profile production`

## 🔄 CI/CD Workflow

### Automated Workflows

1. **Pull Request**:
   - Run tests and linting
   - Build development version
   - No deployment

2. **Push to `develop` branch**:
   - Run tests
   - Publish staging update
   - Build staging version

3. **Push to `main` branch**:
   - Run tests
   - Publish production update
   - Build production version
   - Ready for app store submission

### Manual Workflows

Use the deployment script for manual deployments:

```bash
# Deploy to development
./scripts/deploy.sh deploy development

# Deploy to staging
./scripts/deploy.sh deploy staging

# Deploy to production
./scripts/deploy.sh deploy production

# Submit to app stores
./scripts/deploy.sh submit production
```

## 📱 Platform-Specific Builds

### iOS Builds

- Requires Apple Developer account
- Code signing handled by EAS
- TestFlight for staging distribution

### Android Builds

- Google Play Console integration
- Internal testing track for staging
- Production track for releases

### Web Builds

- Automatic deployment to Expo hosting
- CDN distribution
- PWA capabilities

## 🔄 Over-the-Air Updates

### EAS Update

- Instant updates for JavaScript/TypeScript changes
- No app store review required
- Automatic rollback on errors

### Update Channels

- `staging`: Updates for staging builds
- `production`: Updates for production builds

### Publishing Updates

```bash
# Staging update
eas update --branch staging --message "Feature update"

# Production update
eas update --branch production --message "Bug fix"
```

## 🔐 Environment Configuration

### Environment Files

- `.env.development`: Development configuration
- `.env.staging`: Staging configuration
- `.env.production`: Production configuration

### Environment Variables

- `EXPO_PUBLIC_*`: Client-side variables
- Server-side secrets managed securely
- Feature flags for gradual rollouts

## 🧪 Testing Strategy

### Pre-deployment Testing

1. **Unit Tests**: Automated via Jest
2. **Type Checking**: TypeScript compilation
3. **Linting**: ESLint validation
4. **Integration Tests**: API and component testing

### Post-deployment Testing

1. **Smoke Tests**: Basic functionality
2. **Regression Tests**: Critical user flows
3. **Performance Tests**: Load and response times
4. **Device Tests**: Multiple devices and OS versions

## 📊 Monitoring & Analytics

### Build Monitoring

- EAS Build dashboard
- GitHub Actions logs
- Slack/Discord notifications

### App Performance

- Crash reporting (Sentry)
- Performance metrics
- User analytics

## 🚨 Emergency Procedures

### Rollback Process

1. **Immediate**: Publish previous working update
2. **Critical**: Revert to previous app store version
3. **Communication**: Notify team and users

### Hotfix Deployment

1. Create hotfix branch from main
2. Make minimal necessary changes
3. Fast-track through CI/CD
4. Monitor deployment closely

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check EAS Build logs
   - Verify environment variables
   - Ensure all dependencies are listed

2. **Update Failures**
   - Check compatibility with build
   - Verify branch configuration
   - Test locally first

3. **App Store Rejections**
   - Review App Store guidelines
   - Check app metadata
   - Ensure proper permissions

### Debug Commands

```bash
# Check build status
eas build:list

# View update history
eas update:list

# Check project configuration
eas config

# View build logs
eas build:view [BUILD_ID]
```

## 📋 Deployment Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Build profiles tested
- [ ] App store metadata updated
- [ ] Release notes prepared

### During Deployment

- [ ] Monitor build progress
- [ ] Check for errors/warnings
- [ ] Verify successful completion
- [ ] Test deployment in staging

### Post-deployment

- [ ] Verify app functionality
- [ ] Monitor crash reports
- [ ] Check performance metrics
- [ ] Gather user feedback

## 🤝 Team Workflow

### Roles & Responsibilities

- **Developers**: Feature development and testing
- **QA**: Staging environment testing
- **DevOps**: CI/CD maintenance and monitoring
- **Product**: Production deployment approval

### Communication

- Deployment notifications in team chat
- Status updates in project management
- Incident reports for failures

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

_Last updated: [Date]_ | _Next review: [Date]_
