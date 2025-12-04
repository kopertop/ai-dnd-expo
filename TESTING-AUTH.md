# Testing Authentication Flow

## Prerequisites

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up Google OAuth:**
   - Create a Google OAuth 2.0 client ID in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Add authorized redirect URIs:
     - Web: `http://localhost:8081/auth`
     - iOS: `ai-dnd://auth` (if testing on iOS)
   - Create a `.env` file in the project root:
     ```env
     EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
     EXPO_PUBLIC_API_BASE_URL=http://localhost:8787
     EXPO_PUBLIC_AUTH_REDIRECT_URI_WEB=http://localhost:8081/auth
     ```

3. **Set up Cloudflare D1 Database:**
   ```bash
   # Create new database (if needed)
   wrangler d1 create ai-dnd-db
   # Update database_id in wrangler.toml with the new ID
   
   # Apply migrations to local database
   bun run db:migrate:dev
   ```

## Running Development Servers

### Option 1: Run Both Together (Recommended)

Use the unified start script:
```bash
bun run start:full
```

This will:
- Start the Cloudflare Worker API on `http://localhost:8787` (in background)
- Start the Expo dev server (foreground)
- Press `w` in the Expo terminal to open in web browser, or scan QR code for mobile

### Option 2: Run Separately

**Terminal 1 - API Server:**
```bash
bun run dev
```
This starts the Cloudflare Worker API on `http://localhost:8787`

**Terminal 2 - Expo Frontend:**
```bash
bun run start
```
Then press `w` to open in web browser, or scan QR code for mobile.

## Testing the Authentication Flow

### 1. **Initial State Check**
- Open the app (web: `http://localhost:8081` or mobile)
- You should be redirected to `/login` if not authenticated
- The login screen should show:
  - "Sign in with Google" button
  - "Sign in with Apple" button (iOS only)

### 2. **Google Sign-In (Web)**
1. Click "Sign in with Google"
2. You'll be redirected to Google's OAuth consent screen
3. After authorizing, you'll be redirected back to the app
4. The app should:
   - Automatically register a device token
   - Store the session in SecureStore (or localStorage on web)
   - Redirect to the home page (`/`)
   - Show your user info in the top-right corner

### 3. **Apple Sign-In (iOS only)**
1. Click "Sign in with Apple"
2. Use Face ID/Touch ID or Apple ID password
3. The app should:
   - Process the Apple identity token
   - Register a device token
   - Store the session
   - Redirect to home

### 4. **Device Token Authentication (Auto-login)**
1. After signing in once, close the app completely
2. Reopen the app
3. The app should:
   - Automatically detect the stored device token
   - Authenticate using `Device <token>` header
   - Skip the login screen and go directly to home
   - No OAuth flow needed

### 5. **API Authentication Verification**

**Check API logs:**
- The API server console should show:
  - `getUser` logs when authentication happens
  - Device token registration logs
  - User lookup logs

**Test API endpoints manually:**
```bash
# Get your device token from SecureStore/localStorage
# Then test the /api/me endpoint:
curl -H "Authorization: Device YOUR_DEVICE_TOKEN" http://localhost:8787/api/me

# Or with OAuth token:
curl -H "Authorization: Bearer YOUR_OAUTH_TOKEN google" http://localhost:8787/api/me
```

### 6. **Sign Out**
1. Click the user avatar in the top-right
2. Click "Sign out"
3. The app should:
   - Clear the session
   - Clear the device token
   - Redirect back to `/login`

### 7. **Error Scenarios**

**Test invalid token:**
- Try accessing `/api/games/me` without Authorization header
- Should return `401 Unauthorized`

**Test expired device token:**
- Manually expire a device token in the database
- Try to authenticate
- Should fall back to OAuth or prompt for re-login

## Debugging

### Check Auth Service State
Add this to any component:
```typescript
import { authService } from '@/services/auth-service';

// In component:
useEffect(() => {
  authService.getSession().then(session => {
    console.log('Current session:', session);
  });
  authService.getUser().then(user => {
    console.log('Current user:', user);
  });
}, []);
```

### Check API Logs
The Wrangler dev server will show:
- Authentication attempts
- Token validation results
- Database queries
- User creation/updates

### Check Browser Console (Web)
- Look for auth service logs
- Check for CORS errors
- Verify API requests include Authorization headers

### Check Network Tab
- Verify `/api/me` requests include `Authorization: Device <token>` or `Authorization: Bearer <token> <provider>`
- Check response status codes (200 = success, 401 = unauthorized)

## Common Issues

1. **"Google Sign-In not working"**
   - Check `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set
   - Verify redirect URI matches Google Console settings
   - Check browser console for OAuth errors

2. **"Device token not persisting"**
   - Check SecureStore is working (native) or localStorage (web)
   - Verify device token registration API call succeeded
   - Check API logs for device token registration errors

3. **"401 Unauthorized on API calls"**
   - Verify Authorization header is being sent
   - Check token format is correct
   - Verify user exists in database after OAuth

4. **"Database errors"**
   - Run migrations: `bun run db:migrate:dev`
   - Check `wrangler.toml` has correct database_id
   - Verify database binding name is `DATABASE` (not `DB`)

## Next Steps After Testing

Once authentication is working:
1. Test creating a game (requires auth)
2. Test joining a game
3. Test character creation
4. Test all protected API endpoints

