# Beta Requirements for AI D&D Expo

## ⚠️ IMPORTANT: This app requires BETA software

This application uses Apple Intelligence features that are currently in beta. Full functionality requires beta versions of iOS and development tools.

## iOS Requirements

### Device Compatibility
- **iPhone 15 Pro or iPhone 15 Pro Max** (Required for Apple Intelligence)
- **iPad Pro with M4 chip** (Required for Apple Intelligence)
- **Mac with M1 chip or later** (Required for Apple Intelligence)

### iOS Version
- **iOS 26 Beta or later** (Currently in Developer Beta)
- **iPadOS 26 Beta or later** (Currently in Developer Beta)
- **macOS 26 Beta or later** (Currently in Developer Beta)

## Development Requirements

### Xcode
- **Xcode 16.0 Beta or later** (Available from Apple Developer Portal)
- **iOS 26 Beta SDK** (Included with Xcode 16 Beta)
- **React Native New Architecture** (Required for Apple Intelligence)

### Apple Developer Account
- **Paid Apple Developer Account** required for:
  - Access to beta software
  - Apple Intelligence APIs
  - Device testing with beta iOS

## Apple Intelligence Features

### What Requires Apple Intelligence
- **Local AI Model**: `@react-native-ai/apple` foundationModels
- **On-device Processing**: All Apple Intelligence features
- **Privacy-first AI**: Local inference without cloud dependency

### Fallback Behavior
- **When Apple Intelligence unavailable**: App falls back to Cactus Compute AI
- **When both unavailable**: App uses rule-based responses
- **Graceful degradation**: Core D&D functionality remains available

## Setup Instructions

### 1. Install Beta Software
1. **Join Apple Developer Program** (if not already a member)
2. **Download Xcode 16 Beta** from Apple Developer Portal
3. **Install iOS 26 Beta** on compatible device
4. **Enable Apple Intelligence** in Settings > Apple Intelligence & Siri

### 2. Enable Apple Intelligence
1. Open **Settings** on your device
2. Go to **Apple Intelligence & Siri**
3. Turn on **Apple Intelligence**
4. Follow the setup prompts

### 3. Development Setup
1. **Install Xcode 16 Beta**
2. **Accept license agreements**
3. **Install additional components** when prompted
4. **Set up iOS Simulator** with iOS 18.1 Beta

### 4. Project Configuration
1. **Enable New Architecture** in app.json (required for Apple Intelligence)
2. **Clean and rebuild** iOS project
3. **Test on device** with iOS 18.1 Beta

## Known Limitations

### Beta Software Limitations
- **Stability**: Beta software may be unstable
- **Performance**: May be slower than release versions
- **Battery life**: Beta versions may impact battery life
- **App Store**: Cannot submit to App Store until iOS 18.1 is released

### Apple Intelligence Limitations
- **Device specific**: Only works on Apple Intelligence-capable devices
- **Language**: Initially English only
- **Availability**: May not be available in all regions
- **Processing**: Requires on-device processing power

## Troubleshooting

### Apple Intelligence Not Available
- **Check device compatibility**: Must be iPhone 15 Pro/Max, iPad Pro M4, or Mac M1+
- **Check iOS version**: Must be iOS 26 Beta or later
- **Check region**: Apple Intelligence may not be available in all regions
- **Check settings**: Ensure Apple Intelligence is enabled in Settings

### Build Errors
- **Clean project**: Remove ios/build, ios/Pods, ios/Podfile.lock
- **Reinstall pods**: `cd ios && pod install`
- **Check Xcode version**: Must be Xcode 16 Beta or later
- **Check iOS SDK**: Must have iOS 26 Beta SDK

### Runtime Errors
- **Module not found**: Ensure New Architecture is enabled
- **Apple Intelligence unavailable**: App should fall back to Cactus Compute
- **Network issues**: Check API keys and network connectivity

## Production Considerations

### When iOS 26 Releases
- **Update requirements**: Change from beta to release versions
- **App Store submission**: Can submit to App Store after iOS 26 release
- **Remove beta warnings**: Update documentation and user-facing messages

### User Communication
- **Clear messaging**: Inform users about beta requirements
- **Fallback explanation**: Explain alternative AI providers
- **Device compatibility**: Clearly state device requirements

## Resources

- [Apple Developer Beta Software](https://developer.apple.com/beta-software/)
- [Apple Intelligence Documentation](https://developer.apple.com/apple-intelligence/)
- [iOS 26 Beta Release Notes](https://developer.apple.com/documentation/ios-ipados-release-notes)
- [Xcode 16 Beta Release Notes](https://developer.apple.com/documentation/xcode-release-notes)

---

**Last Updated**: July 2024
**Next Review**: When iOS 26 releases publicly