# OnStarJS 2.12.0 New Commands Integration Summary

## Overview

Successfully integrated 4 new commands from OnStarJS 2.12.0 into the OnStar2MQTT application. All commands are now available as auto-created MQTT buttons in Home Assistant.

## Changes Made

### 1. Commands Module (`src/commands.js`)

Added 4 new command methods:

```javascript
async getVehicleDetails() {
    return this.onstar.getVehicleDetails();
}

async getOnstarPlan() {
    return this.onstar.getOnstarPlan();
}

async getEVChargingMetrics() {
    return this.onstar.getEVChargingMetrics();
}

async getVehicleRecallInfo() {
    return this.onstar.getVehicleRecallInfo();
}
```

### 2. MQTT Button Definitions (`src/mqtt.js`)

Added 4 new button configurations to `CONSTANTS.BUTTONS`:

```javascript
GetVehicleDetails: {
    Name: 'getVehicleDetails',
    Icon: 'mdi:car-info',
},
GetOnstarPlan: {
    Name: 'getOnstarPlan',
    Icon: 'mdi:calendar-check',
},
GetEVChargingMetrics: {
    Name: 'getEVChargingMetrics',
    Icon: 'mdi:ev-station',
},
GetVehicleRecallInfo: {
    Name: 'getVehicleRecallInfo',
    Icon: 'mdi:alert-octagon',
},
```

### 3. Test Suite Updates

#### Updated test/commands.spec.js

- Added 4 new command methods to the mock OnStar object
- Added 4 new test cases for the new commands
- All tests passing (296 total tests)

#### Created test/commands-new.spec.js

- Comprehensive test suite for all 4 new commands
- Uses actual sample data from provided JSON files
- 22 new detailed tests covering:
  - Command response structure validation
  - Data type validation
  - Required field validation
  - Value range validation
  - Integration testing

### 4. Documentation (`HA-MQTT.md`)

Updated the Available Buttons list to include:

- Get Vehicle Details (new in OnStarJS 2.12.0)
- Get OnStar Plan (new in OnStarJS 2.12.0)
- Get EV Charging Metrics (new in OnStarJS 2.12.0)
- Get Vehicle Recall Info (new in OnStarJS 2.12.0)

## New Command Details

### 1. getVehicleDetails

**Purpose:** Retrieves comprehensive vehicle information

**Returns:**

- VIN, make, model, year
- OnStar capability status
- RPO codes array
- Vehicle image URL
- Full vehicle configuration details

**Sample Data:** `test/command-sample-getVehicleDetails.json` (1846 lines)

### 2. getOnstarPlan

**Purpose:** Retrieves OnStar subscription plan information

**Returns:**

- Vehicle make, model, year
- Active plan information (product codes, billing cadence, status)
- Plan start/end dates
- Trial status
- Product types (DATA, ONSTAR, etc.)
- Plan expiry information

**Sample Data:** `test/command-sample-getOnstarPlan.json` (190 lines)

### 3. getEVChargingMetrics

**Purpose:** Retrieves comprehensive EV charging and battery metrics

**Returns:**

- Battery state of charge (SOC)
- Charge plug state and charge state
- Charge mode and settings
- Lifetime energy used
- Metered energy consumption
- Range average
- Odometer reading
- Location data (lat/lng)
- Trip consumption metrics
- Extra metrics (battery preconditioning, charge priority, etc.)

**Sample Data:** `test/command-sample-getEVChargingMetrics.json` (48 lines)

**Note:** This command provides real-time EV metrics that complement the standard diagnostics data.

### 4. getVehicleRecallInfo

**Purpose:** Retrieves active vehicle recall information

**Returns:**

- Recall ID and title
- Recall type and description
- Type description (e.g., "Product Safety Recall")
- Recall status (Active, Inactive, Completed)
- Repair status (incomplete, complete, not_required)
- Repair status code
- Repair description
- Safety risk description
- Completion date (if applicable)

**Sample Data:** `test/command-sample-getVehicleRecallInfo.json` (24 lines)

**Note:** Critical for vehicle safety - allows monitoring of active recalls and repair status.

## Test Results

All tests passing successfully:

```text
296 passing (189ms)
```

Breakdown:

- 22 new command-specific tests (commands-new.spec.js)
- 4 updated integration tests (commands.spec.js)
- 270 existing tests (all passing)

## Usage in Home Assistant

### Enabling the New Buttons

1. Navigate to **Settings → Devices & Services → MQTT**
2. Find your vehicle device
3. Scroll to the **Controls** section
4. Enable the desired new buttons:
   - `button.<vehicle>_get_vehicle_details`
   - `button.<vehicle>_get_onstar_plan`
   - `button.<vehicle>_get_ev_charging_metrics`
   - `button.<vehicle>_get_vehicle_recall_info`

### Using via MQTT Commands

You can also trigger these commands via MQTT:

```yaml
# Get Vehicle Details
service: mqtt.publish
data:
  topic: homeassistant/YOUR_VIN/command
  payload: '{"command": "getVehicleDetails"}'

# Get OnStar Plan
service: mqtt.publish
data:
  topic: homeassistant/YOUR_VIN/command
  payload: '{"command": "getOnstarPlan"}'

# Get EV Charging Metrics
service: mqtt.publish
data:
  topic: homeassistant/YOUR_VIN/command
  payload: '{"command": "getEVChargingMetrics"}'

# Get Vehicle Recall Info
service: mqtt.publish
data:
  topic: homeassistant/YOUR_VIN/command
  payload: '{"command": "getVehicleRecallInfo"}'
```

## Files Modified

1. `src/commands.js` - Added 4 new command methods
2. `src/mqtt.js` - Added 4 new button definitions
3. `test/commands.spec.js` - Updated mock and added basic tests
4. `test/commands-new.spec.js` - Created comprehensive test suite (NEW FILE)
5. `HA-MQTT.md` - Updated button list documentation

## Files Used (Sample Data)

1. `test/command-sample-getVehicleDetails.json`
2. `test/command-sample-getOnstarPlan.json`
3. `test/command-sample-getEVChargingMetrics.json`
4. `test/command-sample-getVehicleRecallInfo.json`

## Validation

✅ All 296 tests passing
✅ No linting errors
✅ Button validation passing (validateButtonNames)
✅ Command names match between commands.js and MQTT buttons
✅ Sample data validated against test suite
✅ Documentation updated

## Notes

- All buttons are disabled by default (as per existing safety policy)
- Commands require active OnStar account and compatible vehicle
- EV-specific commands (getEVChargingMetrics) require an EV vehicle
- Recall information availability depends on NHTSA database
- All commands respect OnStar API rate limiting

## Compatibility

- OnStarJS: 2.12.0+
- Node.js: As per package.json requirements
- Home Assistant: MQTT integration required
- Vehicle: OnStar-capable vehicles (US/Canada)
