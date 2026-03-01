# Patchright Version Management

This document explains how OnStar2MQTT manages patchright versions for Docker compatibility.

## Problem

OnStar2MQTT depends on `onstarjs2` which uses `patchright` (a patched Playwright) for browser automation. Different versions of patchright install different versions of Chromium, which can cause Docker build failures when the expected browser executable path doesn't exist.

## Solution

The solution is simple and effective:

### NPM Override - Primary Solution

**What**: Force a specific patchright version using npm overrides in package.json.

**Implementation**:

```json
{
  "overrides": {
    "patchright": "^1.52.5"
  }
}
```

**Why**: This ensures all dependencies use the patchright version that onstarjs2 expects, regardless of what version npm would normally install.

### GitHub Actions Workflow - Maintenance Automation

**What**: Automatically update the patchright override when onstarjs2 updates.

**How**:

- A GitHub Actions workflow (`.github/workflows/sync-patchright.yml`) triggers on PRs from Renovate or Dependabot that change `package.json`
- It checks if `onstarjs2` was updated, then runs `npm run sync-patchright`
- The sync script queries npm registry for onstarjs2's patchright dependency
- Commits the updated override back to the PR branch

> **Note**: Previously, Renovate's `postUpgradeTasks` was used for this, but the Mend Renovate hosted app does not support custom post-upgrade commands (requires `allowedCommands` at the host level). The GitHub Actions workflow approach is more reliable and works with both Renovate and Dependabot.
>
> Original `renovate.json` block (removed March 2026):
>
> ```json
> {
>   "matchPackageNames": ["onstarjs2"],
>   "postUpgradeTasks": {
>     "commands": ["npm run sync-patchright"],
>     "fileFilters": ["package.json"],
>     "executionMode": "update"
>   },
>   "addLabels": ["patchright-sync", "onstarjs2-dependency"]
> }
> ```

## Manual Command

If you ever need to manually sync the patchright version:

```bash
npm run sync-patchright
```

## How It Works

The sync script:

1. Queries npm registry for the current onstarjs2 version
2. Extracts the patchright dependency from onstarjs2
3. Updates package.json overrides to match
4. Reports what changed

## Why This Approach

- **Simple**: One override in package.json solves the core problem
- **Automatic**: Renovate handles updates when onstarjs2 changes
- **Non-intrusive**: No CI failures, no git hooks, no daily noise
- **Reliable**: Works consistently across all environments

## Verification

After any changes, verify Docker builds work:

```bash
docker build -t onstar2mqtt-test .
docker run --rm --entrypoint="" onstar2mqtt-test ls -la /root/.cache/ms-playwright/
# Should show: chromium-1169/ (or whatever version onstarjs2 expects)
```
