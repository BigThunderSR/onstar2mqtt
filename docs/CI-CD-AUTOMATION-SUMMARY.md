# Patchright Management for OnStar2MQTT

## Quick Summary

OnStar2MQTT now has simple, effective patchright version management that prevents Docker build failures.

## What's Automated

### NPM Override - Primary Solution

**What**: Package.json override forces the correct patchright version.

**How**:

```json
{
  "overrides": {
    "patchright": "^1.52.5"
  }
}
```

This ensures Docker builds always get the Chromium version that onstarjs2 expects.

### Renovate Integration - Maintenance

**What**: Automatically updates patchright override when onstarjs2 updates.

**How**:

- Runs `npm run sync-patchright` during onstarjs2 updates
- Includes the updated override in the same Renovate PR
- Labeled with `patchright-sync` and `onstarjs2-dependency`

## Benefits

- Prevents Docker build failures from browser path mismatches
- Simple solution - just one override in package.json
- Automatic maintenance when dependencies actually change
- No CI failures, git hooks, or development friction
- Works consistently across all environments

## Manual Command

If you ever need to manually sync:

```bash
npm run sync-patchright
```

## Testing

Docker builds should work consistently:

```bash
docker build -t onstar2mqtt .
docker run --rm --entrypoint="" onstar2mqtt ls -la /root/.cache/ms-playwright/
# Should show: chromium-1169/ (or whatever onstarjs2 expects)
```

This approach provides reliable patchright compatibility with minimal complexity.
