# Authentication Setup Guide

This guide walks you through setting up Google OAuth for web and Apple Sign-In for iOS. Apple Sign-In is required for App Store review whenever other third-party providers are offered on iOS.

## Prerequisites

- A Google Cloud Console account (for Google OAuth)
- Access to your Cloudflare Workers environment variables

## Google OAuth Setup

### Step 1: Create OAuth 2.0 Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required app information
   - Add your email as a test user (for development)
   - Save and continue through the scopes and test users screens

### Step 2: Configure OAuth Client

1. Select **Web application** as the application type
2. Give it a name (e.g., "AI D&D App")
3. Add authorized redirect URIs:
   - For local development: `http://localhost:8787/api/auth/callback/google`
   - For production: `https://your-domain.com/api/auth/callback/google`
4. Click **Create**
5. Copy the **Client ID** and **Client Secret**

### Step 3: Add Credentials to Environment

Add the credentials to your `workers/.dev.vars` file:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

For production, add these as secrets in Cloudflare Workers:
```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

## Apple Sign-In (iOS only)

Even though the in-app login surface is web-based, Apple requires that the "Sign in with Apple" option be offered on iOS. Complete the following steps:

1. Create a Services ID in the [Apple Developer portal](https://developer.apple.com/account/resources/identifiers/list/serviceId) for web authentication (e.g., `com.example.aidnd.auth`).
2. Configure the Services ID for Sign in with Apple and add the callback URLs:
   - Local: `http://localhost:8787/api/auth/callback/apple`
   - Production: `https://your-domain.com/api/auth/callback/apple`
3. Generate a private key (.p8) for Sign in with Apple and note the Key ID and Team ID.
4. Create a JWT client secret using the Service ID, Team ID, Key ID, and private key. (You can use [Apple’s documentation](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens) or third-party helpers.)
5. Add the credentials to `workers/.dev.vars`:

```env
APPLE_CLIENT_ID=com.example.aidnd.auth
APPLE_CLIENT_SECRET=your-generated-jwt
```

6. In production, store the secrets in Cloudflare:

```bash
wrangler secret put APPLE_CLIENT_ID
wrangler secret put APPLE_CLIENT_SECRET
```

## Verification

After adding the credentials:

1. Restart your Cloudflare Workers dev server (`wrangler dev`)
2. Test the authentication flows:
   - Google sign-in should redirect to Google's consent screen
   - On an iOS device or simulator, the Sign in with Apple button should appear and complete successfully

## Troubleshooting

### Google OAuth Issues

- **"redirect_uri_mismatch"**: Make sure the redirect URI in Google Console exactly matches `http://localhost:8787/api/auth/callback/google` (including the protocol and port)
- **"invalid_client"**: Verify your Client ID and Secret are correct
- **OAuth consent screen**: Make sure you've completed the consent screen setup and added test users if needed

## Production Considerations

1. **HTTPS Required**: Google requires HTTPS in production. Make sure your production domain has a valid SSL certificate.

2. **Environment Variables**: Never commit `.dev.vars` to version control. Use Cloudflare Workers secrets for production.

3. **Callback URLs**: Update the callback URLs in Google configuration to use your production domain.

