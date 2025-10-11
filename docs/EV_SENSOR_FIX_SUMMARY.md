# EV Sensor Fix Summary for API v3

## Problem
EV sensors were showing "Unknown" in Home Assistant due to API v3 returning different data formats compared to API v1.

## Root Causes Identified

### 1. Sensor Name Format Change
- **API v1**: Used spaces in sensor names (e.g., `EV PLUG STATE`)
- **API v3**: Uses underscores in sensor names (e.g., `EV_PLUG_STATE`)
- **Impact**: Sensors weren't being recognized as binary_sensors, so string values weren't being converted to boolean

### 2. EV_PLUG_STATE Value Change
- **API v1**: `"unplugged"` / `"plugged"`
- **API v3**: `"Disconnect"` / `"Connect"`
- **Impact**: String comparison failed, sensor always returned false

### 3. EV_CHARGE_STATE Value Change
- **API v1**: `"not_charging"` / `"charging"`
- **API v3**: `"UNCONNECTED"` / `"CHARGING"`
- **Impact**: String comparison failed, sensor always returned false

### 4. CHARGE_VOLTAGE "Unavailable" String
- **API v3**: Returns string `"Unavailable"` when vehicle is not charging
- **Previous behavior**: Tried to convert to number, resulting in NaN or showing as 0
- **Impact**: Sensor showed "Unknown" or incorrect value in Home Assistant

## Changes Made

### 1. Updated `determineSensorType()` Function
Added underscore variants for all binary sensor names to support both API v1 and v3:
```javascript
case 'EV CHARGE STATE':
case 'EV_CHARGE_STATE':
case 'EV PLUG STATE':
case 'EV_PLUG_STATE':
// ... and 16 other binary sensor variants
```

### 2. Updated Binary Sensor Value Conversion
Enhanced conversion logic to handle both API versions:
```javascript
case 'EV_PLUG_STATE':
    const lowerValue = e.value.toLowerCase();
    // Handles: "Disconnect"/"Connect" (v3) and "unplugged"/"plugged" (v1)
    value = lowerValue === 'connect' || lowerValue === 'connected' || lowerValue === 'plugged';
```

### 3. Added "Unavailable" String Handling
```javascript
else if (typeof e.value === 'string' && e.value.toLowerCase() === 'unavailable') {
    // API v3 returns "Unavailable" string for some sensors when not charging
    value = null;
}
```

### 4. Enhanced Null Handling
Improved null/undefined handling to show sensors as "Unavailable" in HA instead of false/0:
```javascript
if (e.value === null || e.value === undefined) {
    value = null;
}
```

### 5. Added Comprehensive Tests
Added 3 new test cases covering:
- EV_PLUG_STATE with API v3 values ("Disconnect", "Connect", "connected", null)
- EV_CHARGE_STATE with API v3 values ("UNCONNECTED", "CHARGING", null)
- "Unavailable" string handling (case-insensitive, converts to null, numeric values still work)

## Test Results

### Before Fix
- 265 tests passing
- EV sensors showed "Unknown" in Home Assistant

### After Fix
- **268 tests passing** (3 new tests added)
- All EV sensors working correctly with API v3 data
- Backward compatibility with API v1 maintained
- ICE vehicle functionality unchanged

## Verified Sensors

Using real API v3 EV diagnostic data (`diagnostic-sample-v3-ev-1.json`):

| Sensor | Raw Value | Processed Value | Status |
|--------|-----------|-----------------|--------|
| CHARGE_VOLTAGE | "Unavailable" | null | ✓ Shows as "Unavailable" in HA |
| EV_PLUG_STATE | "Disconnect" | false | ✓ Correctly shows unplugged |
| EV_CHARGE_STATE | "UNCONNECTED" | false | ✓ Correctly shows not charging |
| CHARGE_STATE | "70" | 70 | ✓ Battery percentage |
| EV_RANGE | "317.98" | 317.98 | ✓ Electric range in KM |
| AMBIENT_AIR_TEMPERATURE | "17.5" | 17.5 | ✓ Temperature in Celsius |

## Backward Compatibility

All changes maintain full backward compatibility:
- API v1 sensor names with spaces still work
- API v1 string values still work
- All existing tests pass
- No breaking changes for ICE vehicles

## Files Modified

1. **src/mqtt.js**
   - `determineSensorType()`: Added underscore variants
   - `getStatePayload()`: Enhanced binary sensor conversion
   - `getStatePayload()`: Added "Unavailable" string handling
   - `getConfigMapping()`: Updated comments

2. **test/mqtt.spec.js**
   - Added 3 new test cases for API v3 EV sensors

## Branch Information

- Branch: `fix-ev-sensors-for-v3-api`
- Commits: 1 commit with all fixes
- Ready for: Pull request and testing with live EV vehicle
