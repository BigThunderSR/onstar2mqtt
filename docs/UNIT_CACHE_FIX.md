# v3 API Unit Stability Fix

## Overview

This document describes the unit caching solution implemented to handle intermittent OnStar v3 API instability where diagnostic element units sometimes return as null or missing.

**TL;DR**: The application now automatically caches and persists sensor units to disk, maintaining stability across API failures and application restarts. No user action required.

## Problem

The OnStar v3 API has an intermittent issue where some diagnostic elements return `null` or missing units (`uom` field) between data refreshes. This causes Home Assistant errors like:

```text
The unit of 'Vehicle Lifetime Fuel Economy' (sensor.vehicle_lifetime_fuel_econ)
changed to '' which can't be converted to the previously stored unit, 'km/L'.
```

When a sensor's unit changes from a valid value (e.g., 'km/L') to empty/null, Home Assistant cannot reconcile this with its historical data, resulting in errors and potential loss of statistics.

## Root Cause

The v3 API response for diagnostic elements sometimes includes:

- `"uom": "KM/L"` (valid unit)
- `"uom": null` (null unit)
- `"uom": "N/A"` (placeholder)
- Missing `uom` field entirely

This instability occurs unpredictably, even for the same vehicle and sensor between consecutive API calls. The inconsistency appears to be a backend issue with the OnStar v3 API.

## Solution

Implemented a **unit caching mechanism** in `src/diagnostic.js` that:

1. **Caches valid units**: When a diagnostic element has a valid unit (not null, undefined, or 'N/A'), the unit is cached using the element name as the key.

2. **Uses cached units as fallback**: When the API returns a null/undefined/missing unit, the code checks the cache and uses the last known valid unit.

3. **Allows legitimate updates**: If the API returns a different valid unit (e.g., unit format changes), the cache is updated with the new value.

4. **Excludes invalid values**: Units like 'N/A' are never cached since they're placeholders, not real units.

### Code Changes

**File: `src/diagnostic.js`**

```javascript
// Added at module level
const unitCache = new Map();

// Modified DiagnosticElement constructor
constructor(ele) {
    this._name = ele.name;
    this._message = ele.message;
    let unitValue = ele.uom || ele.unit;

    // WORKAROUND: v3 API sometimes returns null units intermittently
    const cacheKey = ele.name;
    if (!unitValue || unitValue === 'null' || unitValue === 'N/A') {
        const cachedUnit = unitCache.get(cacheKey);
        if (cachedUnit) {
            logger.info(`Using cached unit for ${ele.name}: ${cachedUnit}`);
            unitValue = cachedUnit;
        }
    } else {
        // Cache valid units for future use
        if (unitValue !== 'N/A') {
            unitCache.set(cacheKey, unitValue);
            logger.debug(`Cached unit for ${ele.name}: ${unitValue}`);
        }
    }

    this.measurement = new Measurement(ele.value, unitValue);
    // ... rest of constructor
}
```

### Cache Persistence

The unit cache is **persisted to disk** in `.unit_cache_<VIN>.json` to survive application restarts:

- **Automatic saving**: Cache is saved immediately after any change
- **Automatic loading**: Cache is loaded from disk when the application starts
- **Location**: `.unit_cache_<VIN>.json` in configurable directory (VIN from ONSTAR_VIN environment variable)
- **Directory priority**: UNIT_CACHE_DIR → TOKEN_LOCATION → process.cwd()
- **HA Add-on**: Automatically uses TOKEN_LOCATION, keeping cache with tokens
- **Format**: JSON file mapping sensor names to units
- **Multi-vehicle support**: Each VIN gets its own cache file to avoid collisions

This ensures that even if the application restarts during a period when the API is returning null units, the cached units are immediately available to prevent errors.

### New Functions

Added utility functions for debugging and testing:

- `getUnitCacheStats()` - Returns cache size and all cached units
- `clearUnitCache(deleteDiskCache)` - Clears the cache (optionally deletes disk file)
- `loadCacheFromDisk()` - Loads cache from disk (called automatically on startup)
- `saveCacheToDisk()` - Saves cache to disk (called automatically)

### Testing

Created comprehensive test suite in `test/unit-cache.spec.js` covering:

- Unit caching on first encounter
- Cache usage when API returns null
- Cache usage when API returns undefined
- Handling of N/A units (not cached)
- Mixed valid and null units in same response
- Legitimate unit changes (cache updates)
- Cache clearing
- Cache statistics
- **Cache persistence to disk**
- **Cache loading from disk on restart**

All 10 tests pass, and all existing diagnostic tests (23 tests) continue to pass.

## Benefits

1. **Stability**: Sensors maintain consistent units across polling cycles, even when the API is unstable
2. **Survives restarts**: Cached units persist across application restarts, protecting against API instability even during initial startup
3. **No data loss**: Home Assistant statistics remain valid with consistent units
4. **Transparent**: Works automatically without configuration changes
5. **Flexible**: Allows legitimate unit changes if the API format evolves
6. **Observable**: Logs when cached units are used for debugging

## Behavior

### First API Call with Valid Unit

```json
{
  "name": "LIFETIME_FUEL_ECONOMY",
  "value": "10.85",
  "uom": "KM/L"
}
```

→ Unit cached: `LIFETIME_FUEL_ECONOMY` → `KM/L`

→ Sensor created with unit `km/L` (normalized)

### Subsequent API Call with Null Unit

```json
{
  "name": "LIFETIME_FUEL_ECONOMY",
  "value": "10.92",
  "uom": null
}
```

→ Cache lookup finds `KM/L`

→ Log: `Using cached unit for LIFETIME_FUEL_ECONOMY: KM/L (API returned: null)`

→ Sensor maintains unit `km/L` (from cache)

→ **No Home Assistant error!**

## Logging

When the cache is loaded from disk on startup:

```text
info: Loaded 42 cached units from disk
```

When the cache is used, you'll see log entries like:

```text
info: Using cached unit for LIFETIME_FUEL_ECONOMY: KM/L (API returned: null)
```

When units are cached (debug level):

```text
debug: Cached unit for LIFETIME_FUEL_ECONOMY: KM/L
debug: Saved 42 cached units to disk
```

## Handling First-Run Edge Cases

**Problem solved**: With cache persistence, the "first encounter returns null" problem is mitigated:

1. **After first successful run**: Units are cached to disk
2. **Application restart during API instability**: Cached units are loaded immediately
3. **First API call returns null**: Cached unit from disk is used ✅
4. **No Home Assistant error even on restart!**

The only remaining edge case is the **very first run ever** when:

- No cache file exists yet
- First API call returns null
- Sensor created without unit (will correct itself on next poll)

Given the API's instability, this disk persistence is critical for production reliability.

## Limitations

1. **First-run edge case**: On the very first run when no cache exists and the API returns null units, sensors may not have units initially. They will correct themselves on the next successful API call.

2. **Per-name caching**: The cache uses the diagnostic element name as the key. If the same sensor name is used with different units in different contexts (unlikely), there could be conflicts.

## Testing in Production

To verify the fix is working:

1. Monitor logs for "Using cached unit" messages
2. Check for "Loaded X cached units from disk" on startup
3. Check Home Assistant for absence of unit conversion errors
4. Verify sensor statistics remain continuous
5. Confirm sensors maintain correct units across polling cycles
6. Verify `.unit_cache_<VIN>.json` file exists and contains data

## Docker Deployment

For Docker users, **a volume mount is required** to persist the cache across container recreations.

### Docker Run

```bash
docker run -d \
  --name onstar2mqtt \
  -v /path/on/host:/app/data \
  -e UNIT_CACHE_DIR=/app/data \
  -e ONSTAR_VIN=YOUR_VIN \
  -e ONSTAR_USERNAME=YOUR_USERNAME \
  -e ONSTAR_PASSWORD=YOUR_PASSWORD \
  -e MQTT_HOST=mqtt_broker \
  your-image:latest
```

### Docker Compose

```yaml
version: "3.8"

services:
  onstar2mqtt:
    image: your-image:latest
    container_name: onstar2mqtt
    environment:
      - UNIT_CACHE_DIR=/app/data
      - ONSTAR_VIN=YOUR_VIN
      - ONSTAR_USERNAME=YOUR_USERNAME
      - ONSTAR_PASSWORD=YOUR_PASSWORD
      - MQTT_HOST=mqtt_broker
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### Environment Variable

| Variable         | Description                                                               | Default                                              | Example       |
| ---------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- | ------------- |
| `UNIT_CACHE_DIR` | Directory to store cache file                                             | Falls back to `TOKEN_LOCATION`, then `process.cwd()` | `/app/data`   |
| `TOKEN_LOCATION` | Token storage directory (also used for cache if `UNIT_CACHE_DIR` not set) | `process.cwd()`                                      | `/app/tokens` |

The cache file `.unit_cache_<VIN>.json` will be created in the specified directory, where `<VIN>` is replaced with your vehicle's VIN from the `ONSTAR_VIN` environment variable.

**Note for HA Add-on users:** If you don't set `UNIT_CACHE_DIR`, the cache will automatically be stored in your `TOKEN_LOCATION` directory alongside your authentication tokens, ensuring persistence across container restarts.### Verification

After container starts, check the logs:

```bash
docker logs onstar2mqtt | grep "Loaded.*cached units"
```

You should see:

```text
info: Loaded 42 cached units from disk (/app/data/.unit_cache_<VIN>.json)
```

Check the cache file exists:

```bash
docker exec onstar2mqtt ls -la /app/data/.unit_cache_*.json
```

### Troubleshooting Docker Persistence

**Cache not persisting across container restarts?**

1. Verify volume mount: `docker inspect onstar2mqtt | grep Mounts -A 10`
2. Check environment variable: `docker exec onstar2mqtt printenv UNIT_CACHE_DIR`
3. Verify file permissions on host directory
4. Check logs for "Failed to save unit cache" errors

## User Guide

### What do I need to do?

**Nothing!** The fix works automatically. Your sensors will maintain consistent units even when the API has issues.

### What will I see in logs?

When the cache is loaded on startup:

```text
info: Loaded 42 cached units from disk
```

When the cache helps during API instability:

```text
info: Using cached unit for LIFETIME_FUEL_ECONOMY: KM/L (API returned: null)
```

This is **normal and expected** - it means the workaround is protecting your sensor data.

### Will this fix lost historical data?

No, this fix prevents **future** unit conversion errors. It cannot restore historical data that was already affected. However:

- Going forward, your sensors will remain stable
- New statistics will be recorded correctly
- No more unit conversion warnings

To clean up past errors in Home Assistant:

1. Go to Developer Tools → Statistics
2. Find affected sensors
3. Fix unit mismatches using the "Fix issue" button

### Does this affect performance?

No. The cache is lightweight, uses minimal memory, and saves to disk immediately using synchronous writes (similar to how authentication tokens are saved).

## Related Files

- `src/diagnostic.js` - Main implementation
- `test/unit-cache.spec.js` - Test suite (10 tests)
- `docs/UNIT_CACHE_FIX.md` - This document
