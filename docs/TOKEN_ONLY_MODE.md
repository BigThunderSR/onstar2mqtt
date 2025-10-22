# Token-Only Authentication Mode

## Overview

This guide explains how to use **Token-Only Mode** to bypass browser automation and avoid Akamai Bot Manager detection.

### Why Token-Only Mode?

GM's OnStar login page uses **Akamai Bot Manager** which detects and blocks automated browsers (Puppeteer/Playwright/Patchright). Signs of bot detection include:

- Page loads but never reaches `networkidle` state
- Timeouts during authentication
- `_abck` and `bm_sz` cookies present
- Manual browser login works fine, but automated login fails

**Token-Only Mode** solves this by:
- Skipping browser automation entirely
- Using manually-obtained authentication tokens
- Only requiring token refresh periodically (tokens last ~1-4 hours typically)

## Quick Start

### 1. Configure Environment

Add to your `.env` file:

```bash
# Enable token-only mode
ONSTAR_AUTH_MODE=token-only

# Required: Set token storage location
TOKEN_LOCATION=/app/tokens   # For Docker
# or
TOKEN_LOCATION=./tokens       # For local Node.js

# Still required for token refresh (when tokens expire)
ONSTAR_VIN=your_vin
ONSTAR_USERNAME=your_username
ONSTAR_PASSWORD=your_password
ONSTAR_TOTP=your_totp_secret
ONSTAR_PIN=your_pin
```

### 2. Obtain Initial Tokens

You have two options:

#### Option A: One-Time Browser Authentication

Run the container/application ONCE in auto mode to generate tokens:

```bash
# Temporarily set to auto mode
ONSTAR_AUTH_MODE=auto npm start
```

This will attempt browser automation once. If successful, tokens will be saved to `TOKEN_LOCATION`.

After tokens are saved, switch back to `token-only` mode:

```bash
ONSTAR_AUTH_MODE=token-only npm start
```

#### Option B: Manual Token Extraction (Recommended)

If browser automation fails due to bot detection, manually extract tokens:

1. **Login via real browser**:
   - Open Chrome/Firefox
   - Navigate to: https://my.chevrolet.com/ (or your GM brand)
   - Login with your OnStar credentials
   - Complete 2FA/TOTP if prompted

2. **Extract tokens**:
   - Open Browser DevTools (F12)
   - Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
   - Click "Local Storage" or "Session Storage"
   - Look for OnStar/GM related entries
   - Find the JWT token (looks like `eyJ...`)

3. **Create token file**:

   Create `TOKEN_LOCATION/gm-token.json` with the following structure:

   ```json
   {
     "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
     "token_type": "Bearer",
     "expires_in": 3600,
     "scope": "openid profile",
     "onstar_account_info": {
       "country_code": "US",
       "account_no": "your_account_number"
     },
     "user_info": {
       "RemoteUserId": "your_user_id",
       "country": "US"
     },
     "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
     "expiration": 1234567890,
     "upgraded": true
   }
   ```

   **Finding the token in browser**:
   - Look in Network tab for requests to `api.gm.com` or `onstar.com`
   - Check request headers for `Authorization: Bearer <token>`
   - Or inspect localStorage for stored tokens

### 3. Verify Token Status

Use the token checker utility:

```bash
npm run token:status
```

Or in Docker:

```bash
docker exec -it onstar2mqtt npm run token:status
```

This will show:
- Token location
- Token existence
- Token validity (expiration)
- Time remaining

### 4. Run in Token-Only Mode

Once tokens are in place:

```bash
# Set environment
ONSTAR_AUTH_MODE=token-only

# Start the application
npm start
```

The application will:
1. Load tokens from `TOKEN_LOCATION`
2. Validate tokens are not expired
3. Skip all browser automation
4. Use tokens for API calls
5. Run indefinitely (until tokens expire)

## Authentication Modes

Configure via `ONSTAR_AUTH_MODE`:

| Mode | Description | Use Case |
|------|-------------|----------|
| `auto` (default) | Automatic browser auth when needed | When bot detection is not an issue |
| `token-only` | Never use browser, only load tokens | **Recommended** - Avoid bot detection |
| `manual` | Manual token refresh prompts | Advanced users |

## Token Management

### Token Lifecycle

1. **Initial Authentication**: Get tokens (browser or manual)
2. **Token Storage**: Saved to `TOKEN_LOCATION/gm-token.json`
3. **Token Usage**: Application loads and uses tokens
4. **Token Expiration**: Tokens typically last 1-4 hours
5. **Token Refresh**: Must re-authenticate when expired

### When Tokens Expire

When tokens expire, you have two options:

#### Option 1: Automatic Refresh (if browser automation works)

Temporarily switch to `auto` mode:

```bash
ONSTAR_AUTH_MODE=auto npm start
```

The application will re-authenticate via browser and update tokens.

#### Option 2: Manual Refresh (recommended)

Re-extract tokens manually using the browser method above, then restart.

### Token Security

**Important Security Notes**:

1. **Protect token files**: Contains your authentication credentials
2. **Set proper permissions**:
   ```bash
   chmod 600 TOKEN_LOCATION/gm-token.json
   ```
3. **Do not commit**: Add `tokens/` to `.gitignore`
4. **Rotate regularly**: Tokens expire, but rotate them proactively
5. **Use Docker volumes**: Persist tokens across container restarts

## Troubleshooting

### "Token file not found"

**Error**: `GM token file not found at: /path/to/gm-token.json`

**Solution**:
1. Verify `TOKEN_LOCATION` is set correctly
2. Verify token file exists at the expected path
3. Check file permissions (must be readable)
4. Try manual token extraction (see above)

### "Token expired or invalid"

**Error**: `Token expired or expiring soon`

**Solution**:
1. Extract new tokens manually (browser method)
2. Or temporarily use `auto` mode to refresh
3. Check system clock is accurate

### "Token missing required fields"

**Error**: `Token missing required fields (access_token, expiration)`

**Solution**:
1. Verify token file format matches the JSON structure above
2. Ensure all required fields are present
3. Re-extract token from browser

### Application still attempts browser automation

**Issue**: Browser starts despite `token-only` mode

**Solution**:
1. Verify `.env` has `ONSTAR_AUTH_MODE=token-only`
2. Restart the application completely
3. Check logs for mode confirmation

## Advanced: Token Refresh Script

For automated token refresh without browser (requires external auth):

```bash
#!/bin/bash
# refresh-tokens.sh
# Manually refresh tokens using curl (requires valid credentials)

# This is a placeholder - actual implementation requires
# replicating the GM auth flow via curl/API calls
# which may also trigger bot detection

echo "Manual token refresh not yet implemented"
echo "Please use browser method or auto mode"
```

## Docker Compose Example

```yaml
version: '3.8'
services:
  onstar2mqtt:
    image: onstar2mqtt:latest
    environment:
      - ONSTAR_AUTH_MODE=token-only
      - TOKEN_LOCATION=/app/tokens
      - ONSTAR_VIN=your_vin
      - ONSTAR_USERNAME=your_username
      - ONSTAR_PASSWORD=your_password
      - ONSTAR_TOTP=your_totp_secret
      - ONSTAR_PIN=your_pin
      # ... other vars
    volumes:
      - ./tokens:/app/tokens:rw
    restart: unless-stopped
```

## FAQ

**Q: How long do tokens last?**
A: Typically 1-4 hours, but varies. Check with `npm run token:status`.

**Q: Can I automate token refresh?**
A: Not easily - GM's auth requires browser interaction or risks bot detection. Manual refresh is recommended.

**Q: What if I run multiple containers?**
A: Share the same token volume across containers, but be aware of rate limits.

**Q: Do I still need username/password in token-only mode?**
A: Yes, they're shown in config but not used unless tokens expire and you switch to auto mode.

**Q: Is this method officially supported by GM?**
A: No. Use at your own risk. This is a workaround for bot detection issues.

## References

- [Akamai Bot Manager Documentation](https://www.akamai.com/products/bot-manager)
- [JWT Token Structure](https://jwt.io/)
- [OnStarJS Library](https://github.com/BigThunderSR/OnStarJS)
