# Authentication Setup Guide

This guide walks you through setting up Google OAuth and Apple Sign-In for the Better Auth implementation.

## Prerequisites

- A Google Cloud Console account (for Google OAuth)
- An Apple Developer account (for Apple Sign-In)
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

## Apple Sign-In Setup

### Step 1: Create a Services ID

1. Go to the [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Click the **+** button to create a new Services ID
3. Enter a description (e.g., "AI D&D Sign In")
4. Enter a unique identifier (e.g., `com.yourcompany.aidnd`)
5. Click **Continue** and then **Register**

### Step 2: Configure Sign In with Apple

1. Select the Services ID you just created
2. Check **Sign In with Apple**
3. Click **Configure**
4. Select your primary App ID
5. Add your domain and return URLs:
   - For local development: `http://localhost:8787/api/auth/callback/apple`
   - For production: `https://your-domain.com/api/auth/callback/apple`
6. Click **Save**

### Step 3: Create a Key

1. Go to [Keys](https://developer.apple.com/account/resources/authkeys/list) in the Apple Developer Portal
2. Click the **+** button to create a new key
3. Give it a name (e.g., "AI D&D Sign In Key")
4. Check **Sign In with Apple**
5. Click **Configure** and select your primary App ID
6. Click **Save**, then **Continue**, then **Register**
7. **Download the `.p8` key file** (you can only download it once!)
8. Note the **Key ID** shown on the page

### Step 4: Get Your Team ID

1. Go to [Membership](https://developer.apple.com/account/#/membership/) in the Apple Developer Portal
2. Find your **Team ID** (it's a 10-character string)

### Step 5: Generate Client Secret

Apple requires a JWT (JSON Web Token) as the client secret. You can generate this using:

1. The Better Auth documentation's recommended tool: [https://bal.so/apple-gen-secret](https://bal.so/apple-gen-secret)
2. Or use a script/library to generate it programmatically

You'll need:
- **Service ID** (from Step 1)
- **Team ID** (from Step 4)
- **Key ID** (from Step 3)
- **Private Key** (the `.p8` file content from Step 3)

The generated JWT is your `APPLE_CLIENT_SECRET`.

### Step 6: Add Credentials to Environment

Add the credentials to your `workers/.dev.vars` file:

```env
APPLE_CLIENT_ID=your-service-id-here
APPLE_CLIENT_SECRET=your-generated-jwt-here
```

**Note:** The `APPLE_CLIENT_SECRET` is a JWT token, not the raw `.p8` file. Better Auth handles the JWT generation internally, but you may need to provide the raw key depending on the library version.

For production, add these as secrets in Cloudflare Workers:
```bash
wrangler secret put APPLE_CLIENT_ID
wrangler secret put APPLE_CLIENT_SECRET
```

## Verification

After adding the credentials:

1. Restart your Cloudflare Workers dev server (`wrangler dev`)
2. Test the authentication flows:
   - Magic link should work without additional setup
   - Google sign-in should redirect to Google's consent screen
   - Apple sign-in should redirect to Apple's sign-in screen

## Troubleshooting

### Google OAuth Issues

- **"redirect_uri_mismatch"**: Make sure the redirect URI in Google Console exactly matches `http://localhost:8787/api/auth/callback/google` (including the protocol and port)
- **"invalid_client"**: Verify your Client ID and Secret are correct
- **OAuth consent screen**: Make sure you've completed the consent screen setup and added test users if needed

### Apple Sign-In Issues

- **"invalid_client"**: Verify your Service ID, Team ID, and Key ID are correct
- **"invalid_grant"**: The JWT client secret may have expired (they expire after a certain time). You may need to regenerate it
- **Redirect URI mismatch**: Ensure the return URL in Apple Developer Portal matches your callback URL exactly

## Production Considerations

1. **HTTPS Required**: Both Google and Apple require HTTPS in production. Make sure your production domain has a valid SSL certificate.

2. **Domain Verification**: Apple may require domain verification. Follow Apple's instructions if prompted.

3. **Environment Variables**: Never commit `.dev.vars` to version control. Use Cloudflare Workers secrets for production.

4. **Callback URLs**: Update the callback URLs in both Google and Apple configurations to use your production domain.

