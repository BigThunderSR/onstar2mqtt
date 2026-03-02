# OnStarJS 2.16.0 New Commands Integration Summary

## Overview

Successfully integrated **2 new commands** from OnStarJS 2.16.0 into the OnStar2MQTT application. Both new commands are available as auto-created MQTT buttons in Home Assistant.

Additionally, this release includes important upstream changes to the existing `getOnstarPlan` command (see [Upstream Caveats](#upstream-caveats-onstarjs-2160) below).

## New Commands

### 1. getWarrantyInfo

**Purpose:** Retrieves vehicle warranty information including warranty types (powertrain, bumper-to-bumper, corrosion, emissions, etc.), coverage dates, mileage limits, and current status.

**Parameters:**

- `vin` (String, optional): Vehicle VIN. Defaults to configured VIN.

**Returns:**

- Array of warranty objects, each containing:
  - `typeDescription` — Type of warranty (e.g., "Bumper to Bumper", "Powertrain", "Corrosion")
  - `startDate` / `expirationDate` — Coverage period
  - `startMileage` / `endMileage` / `mileageUnit` — Mileage coverage range and unit
  - `status` — Status string: `APPLICABLE` (active) or `EXPIRED`

**MQTT Button:**

- **Name:** Get Warranty Info
- **Icon:** `mdi:shield-check`
- **Entity:** `button.<vehicle_name>_command_getwarrantyinfo`

**Sensor Created:**

- **Entity:** `sensor.<vehicle_name>_warranty_info`
- **State:** Count string (e.g., `3 Applicable`)
- **Log Output:** Dynamic field-by-field enumeration via `logResponseData()` (adapts automatically to API changes)

**MQTT Command:**

```yaml
service: mqtt.publish
data:
  topic: homeassistant/YOUR_VIN/command
  payload: '{"command": "getWarrantyInfo"}'
```

### 2. getSxmSubscriptionInfo

**Purpose:** Retrieves SiriusXM satellite radio subscription information including radio device ID, 360L device status, channel account details, and active subscriptions.

**Parameters:**

- `vin` (String, optional): Vehicle VIN. Defaults to configured VIN.

**Returns:**

- `radioId` — SiriusXM radio device ID
- `is360Device` — Whether the device supports SXM 360L
- `channelAccountInfo` — Account/package object (contains `radioId`, `marketType`, `packageName`, `expiryDate`, `phoneNumber`, `message`)
- `subscriptions` — Array of subscription objects:
  - `subscriptionName` — Name of the subscription package
  - `packageId` — Package identifier
  - `marketType` — Status: `SUBSCRIBED` (active) or other values
  - `startDate` / `endDate` — Subscription period
  - `services` — Array of service name strings

**MQTT Button:**

- **Name:** Get SXM Subscription Info
- **Icon:** `mdi:radio`
- **Entity:** `button.<vehicle_name>_command_getsxmsubscriptioninfo`

**Sensor Created:**

- **Entity:** `sensor.<vehicle_name>_sxm_subscription`
- **State:** Count string (e.g., `2 Subscribed`) or `None`
- **Log Output:** Dynamic field-by-field enumeration via `logResponseData()` (adapts automatically to API changes)

**MQTT Command:**

```yaml
service: mqtt.publish
data:
  topic: homeassistant/YOUR_VIN/command
  payload: '{"command": "getSxmSubscriptionInfo"}'
```

## Upstream Caveats (OnStarJS 2.16.0)

The following upstream changes in OnStarJS 2.16.0 affect the existing `getOnstarPlan` command:

### ⚠️ Changes to getOnstarPlan in v2.16.0

1. **Fixed `offers` field names** — The `offers` sub-fields have been corrected to match the current API schema (`productCode`, `offerName`, `associatedOfferingCode`, `retailPrice`, `billingCadence`, `productRank`). The previous sub-fields (`offerId`, `expirationDate`, `category`) no longer exist in the API.

2. **Partial error tolerance** — Previously, any GraphQL error in the response caused the method to throw. Now, if `vehicleDetails` data is present alongside errors (e.g., shared accounts where offers fail), the method returns the partial data with a warning instead of throwing.

3. **New fields added** — `onstarInfo`, `activePlans`, and `orders` are now included in the response. These are additive and non-breaking.

**Impact on OnStar2MQTT:** The `getOnstarPlan` handler uses the shared `logResponseData()` helper which dynamically enumerates all API response fields via `Object.entries()`. No code changes were required for these upstream changes — new/removed fields are logged automatically.

**Impact on Users:**

- If you have automations that reference specific `offers` sub-fields (e.g., `offerId`, `expirationDate`, `category`), you will need to update them to use the new field names (`productCode`, `offerName`, `associatedOfferingCode`, `retailPrice`, `billingCadence`, `productRank`).
- Shared account users who previously saw errors from `getOnstarPlan` should now receive partial data successfully.
- New fields (`onstarInfo`, `activePlans`, `orders`) will automatically appear in sensor attributes.

## Changes Made

### 1. Commands Module (`src/commands.js`)

Added 2 new command methods:

```javascript
async getWarrantyInfo() {
    return this.onstar.getWarrantyInfo();
}

async getSxmSubscriptionInfo() {
    return this.onstar.getSxmSubscriptionInfo();
}
```

### 2. MQTT Button Definitions (`src/mqtt.js`)

Added 2 new button configurations to `CONSTANTS.BUTTONS`:

```javascript
GetWarrantyInfo: {
    Name: 'getWarrantyInfo',
    Icon: 'mdi:shield-check',
},
GetSxmSubscriptionInfo: {
    Name: 'getSxmSubscriptionInfo',
    Icon: 'mdi:radio',
},
```

### 3. Command Handlers (`src/index.js`)

Added 2 new command handlers with dynamic logging via the shared `logResponseData()` helper:

- **getWarrantyInfo handler** — Publishes warranty data to MQTT, counts applicable/expired warranties dynamically. Logs all `vehicleDetails` fields at info level; `warrantyInfo` array items enumerated individually.
- **getSxmSubscriptionInfo handler** — Publishes SXM subscription data to MQTT, counts active subscriptions dynamically. Logs all `sxmSubscriptionInfo` fields at info level; `subscriptions` array items enumerated individually.

Both handlers use `logResponseData()` which iterates `Object.entries()` at runtime — new/removed API fields are logged automatically without code changes. Large nested objects and arrays show key/item counts at info level with full detail at debug level.

### 4. Test Suite Updates

#### Updated `test/commands.spec.js`

- Added `getWarrantyInfo` and `getSxmSubscriptionInfo` to the mock OnStar object
- Added 2 new test cases for the new commands

#### Updated `test/commands-new.spec.js`

- Added 22 new detailed tests covering:
  - Warranty command response structure validation
  - Warranty data type validation (dates, mileage, status)
  - Warranty status filtering (APPLICABLE vs EXPIRED)
  - SXM command response structure validation
  - SXM subscription data validation
  - SXM market type filtering (SUBSCRIBED)

### 5. Test Fixtures (New Files)

- `test/command-sample-getWarrantyInfo.json` — Synthetic warranty data (4 warranties: 3 applicable, 1 expired)
- `test/command-sample-getSxmSubscriptionInfo.json` — Synthetic SXM data (2 subscriptions, both subscribed)

## Test Results

All tests passing successfully:

```text
457 passing
```

## Usage in Home Assistant

### Enabling the New Buttons

1. Navigate to **Settings → Devices & Services → MQTT**
2. Find your vehicle device
3. Scroll to the **Controls** section
4. Enable the desired new buttons:
   - `button.<vehicle>_command_getwarrantyinfo`
   - `button.<vehicle>_command_getsxmsubscriptioninfo`

### Using via MQTT Commands

```yaml
# Get Warranty Info
service: mqtt.publish
data:
  topic: homeassistant/YOUR_VIN/command
  payload: '{"command": "getWarrantyInfo"}'

# Get SXM Subscription Info
service: mqtt.publish
data:
  topic: homeassistant/YOUR_VIN/command
  payload: '{"command": "getSxmSubscriptionInfo"}'
```

## Files Modified

1. `src/commands.js` — Added 2 new command methods
2. `src/mqtt.js` — Added 2 new button definitions
3. `src/index.js` — Added 2 new command handlers with dynamic logging
4. `test/commands.spec.js` — Updated mock and added basic tests
5. `test/commands-new.spec.js` — Added 22 new detailed tests

## Files Created

1. `test/command-sample-getWarrantyInfo.json` — Synthetic warranty test data
2. `test/command-sample-getSxmSubscriptionInfo.json` — Synthetic SXM test data

## Compatibility

- **OnStarJS:** 2.16.0+
- **Node.js:** 18.x, 20.x, 22.x
- **Home Assistant:** MQTT integration required
- **Vehicle:** OnStar-capable vehicles (US/Canada)

## Notes

- All buttons are disabled by default (as per existing safety policy)
- Commands require active OnStar account and compatible vehicle
- SXM subscription info requires SiriusXM-equipped vehicle
- Warranty data reflects manufacturer warranty records
- All handlers use dynamic logging that adapts to API changes
- All test data is synthetic — no PII was committed
