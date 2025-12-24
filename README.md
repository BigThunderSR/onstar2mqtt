# onstar2mqtt ![Dynamic YAML Badge](https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2FBigThunderSR%2Fonstar2mqtt%2Frefs%2Fheads%2Fmain%2Fpackage.json&query=%24.version&label=Ver) ![Supports aarch64 Architecture][aarch64-shield] ![Supports amd64 Architecture][amd64-shield]

![No Support for armhf Architecture][armhf-shield]
![No Support for armv7 Architecture][armv7-shield]
![No Support for i386 Architecture][i386-shield]

[![ci](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/ci.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/ci.yml)
[![CodeQL](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/codeql-analysis.yml)
[![release](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/release.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/release.yml)

<!-- [![Notarize Assets with CAS](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas_notarize.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas_notarize.yml)
[![Authenticate Assets with CAS](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas_authenticate.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas_authenticate.yml)
[![Notarize and Authenticate Docker Image BOM with CAS](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas-docker-notarize-authenticate.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas-docker-notarize-authenticate.yml) -->

A service that utilizes the [OnStarJS](https://github.com/BigThunderSR/OnStarJS) library to expose OnStar data to MQTT topics. Please note that only US and Canadian OnStar accounts are known to work with this integration.

~~The functionality is mostly focused around EVs (specifically the Bolt EV), however PRs for other vehicle types are certainly welcome.~~

There is no affiliation with this project and GM, Chevrolet nor OnStar. In fact, it would be nice if they'd even respond to development requests so we wouldn't have to reverse engineer their API.

## Requirements

- **Active OnStar Subscription:** You must have an active and valid OnStar plan that includes the features you want to use. Different OnStar plan tiers provide access to different features:
  - **Remote commands** (start, lock, unlock, etc.) require a plan that includes Remote Access
  - **Vehicle diagnostics** (fuel level, tire pressure, oil life, etc.) require a plan that includes Vehicle Diagnostics
- **Supported Region:** Only US and Canadian OnStar accounts are known to work with this integration
- **Valid Credentials:** OnStar username, password, PIN, and TOTP key (see setup instructions below)

## What's New in v2.x

**Important Update:** This version includes OnStar API v3 changes that may affect some sensors.

- As this is a major change, some issues may occur. Please report any problems you encounter by opening an issue on GitHub.
- Most new sensors have been added. Any remaining sensors will be added in future updates. Current ETA is by the end of December 2025.

**New Features:**

- **OnStar API v3 Support** - Updated to OnStarJS 2.14.0+ with full API v3 compatibility
- **Enhanced Reliability** - Improved handling of OnStar API field naming variations
- **Unit Stability Fix** - Automatic caching of sensor units to handle API instability where units intermittently return as null, preventing Home Assistant unit conversion errors
- **State Cache (Optional)** - Enable `ONSTAR_STATE_CACHE=true` to merge partial API responses with cached data, preventing Home Assistant template warnings when the API returns incomplete data on refresh cycles. **Note:** On first run with an empty cache, you may still see template warnings until the cache builds up over a few refresh cycles.
- **New EV Commands** - Added refreshEVChargingMetrics for live charging data, setChargeLevelTarget, stopCharging, and comprehensive EV metrics

**What This Means for You:**

- Some sensors that worked with older OnStar API versions may no longer be available or may have different names
- Sensor entity IDs and names may change in Home Assistant
- You may need to update Home Assistant automations/dashboards that reference changed sensors
- Review your dashboards for any broken sensor references after upgrading

### Important: Manual Sensor Cleanup Required

After upgrading to v2.0.0, you will need to **manually remove deprecated sensors** from both your MQTT broker and Home Assistant:

#### Step 1: Delete Retained MQTT Topics from Broker

First, delete the related retained MQTT topics from your MQTT broker to prevent deprecated sensors from being recreated. **Both config and state topics must be removed:**

- **Using MQTT Explorer or similar tool:**

  - Connect to your MQTT broker
  - Navigate to `homeassistant/sensor/YOUR_VIN/` and `homeassistant/binary_sensor/YOUR_VIN/`
  - For each deprecated sensor, delete **both**:
    - Config topic: `homeassistant/sensor/YOUR_VIN/deprecated_sensor/config`
    - State topic: `homeassistant/sensor/YOUR_VIN/deprecated_sensor/state`

- **Using mosquitto_pub command:**

  ```bash
  # Delete config topic
  mosquitto_pub -h YOUR_MQTT_HOST -u YOUR_MQTT_USER -P YOUR_MQTT_PASS -t "homeassistant/sensor/YOUR_VIN/deprecated_sensor/config" -n -r

  # Delete state topic
  mosquitto_pub -h YOUR_MQTT_HOST -u YOUR_MQTT_USER -P YOUR_MQTT_PASS -t "homeassistant/sensor/YOUR_VIN/deprecated_sensor/state" -n -r
  ```

  (Replace `deprecated_sensor` with each deprecated sensor name, `-n` sends empty payload, `-r` sets retained flag)

#### Step 2: Remove Sensors from Home Assistant

1. **Navigate to Settings → Devices & Services → MQTT**
2. **Find your vehicle device** in the list
3. **Review all sensors** and look for any that show as "Unavailable" or "Unknown"
4. **Delete deprecated sensors** by clicking on each sensor and selecting "Delete"

#### Step 3: Restart Home Assistant

1. **Restart Home Assistant** to ensure all changes take effect

**Why This Cleanup is Necessary:**

- MQTT discovery creates new sensors but doesn't automatically remove old ones
- Deprecated sensors from API v2 may conflict with new API v3 sensors
- Old sensors will remain as "ghost" entities until manually removed
- Retained MQTT topics will cause deleted sensors to be recreated on restart unless also deleted from the broker

**Recommendation:** Test in a sandbox/test environment first if possible, or be prepared to update your Home Assistant configurations after upgrading.

For technical details, see [docs/API_MIGRATION_CHANGES.md](docs/API_MIGRATION_CHANGES.md)

## Running

Collect the following minimum information:

1. [Generate](https://www.uuidgenerator.net/version4) a v4 uuid for the device ID
1. OnStar login: username, password, PIN, [TOTP Key (Please click link for instructions)](https://github.com/BigThunderSR/OnStarJS?tab=readme-ov-file#new-requirement-as-of-2024-11-19)
1. Your vehicle's VIN which is easily found in the monthly OnStar diagnostic emails, in your OnStar account or in the official OnStar apps
1. MQTT server information: hostname, username, password
   1. If using TLS, define `MQTT_PORT` and `MQTT_TLS="true"`
   1. **NEW! - Provide MQTT topic (`MQTT_ONSTAR_POLLING_STATUS_TOPIC`) for Onstar Data Polling Status to monitor success/failure when OnStar is polled for data**
      - `MQTT_ONSTAR_POLLING_STATUS_TOPIC/lastpollsuccessful` - `true` or `false` depending on status of last poll
      - `MQTT_ONSTAR_POLLING_STATUS_TOPIC/state` - Polling Status and Detailed Error Messages in JSON
      - **NEW! - Automatic creation of pollingStatusTopic starting at v1.11.0**
        - No longer need to specify `MQTT_ONSTAR_POLLING_STATUS_TOPIC` as this is now created automatically
        - Format is `homeassistant/YOUR_CAR_VIN/polling_status/`
        - If it is explicitly specified, will use the specified value, so does not break backwards compatibility

Supply these values to the ENV vars below. The default data refresh interval is 30 minutes and can be overridden with `ONSTAR_REFRESH` with values in milliseconds.

**Recall Checking:** Vehicle recall information is automatically checked on startup and every 7 days by default. This can be configured with `ONSTAR_RECALL_REFRESH` (in milliseconds). Recalls can also be checked manually via the "Get Vehicle Recall Info" button in Home Assistant.

**Vehicle Image:** Your vehicle's photo from the manufacturer is automatically downloaded, cached, and published to Home Assistant as an image entity on application startup. The image is base64-encoded for offline viewing and persists even if the manufacturer's URL changes.

**EV Charging Metrics:** For electric vehicles, detailed charging metrics are available on-demand via the "Get EV Charging Metrics" (cached data) or "Refresh EV Charging Metrics" (live data) buttons in Home Assistant. These create 10 specialized sensors including target charge level, battery capacity, trip consumption, charge mode, charge location status, and discharge settings. See [HA-MQTT.md](HA-MQTT.md) for full sensor details.

### Home Assistant configuration templates

MQTT auto discovery is enabled. For further integrations and screenshots see [HA-MQTT.md](HA-MQTT.md).

## Feature Updates of Note

### Dynamic Polling Frequency via MQTT

**NEW** - Ability to dynamically change polling frequency using MQTT

- Uses the value from `ONSTAR_REFRESH` on initial startup
- Change the value dynamically by publishing the new refresh value in milliseconds (ms) as an `INT` to: `homeassistant/YOUR_CAR_VIN/refresh_interval`
- Added new retained topic of `homeassistant/YOUR_CAR_VIN/refresh_interval_current_val` to monitor current refresh value set via MQTT

### Command Response Status via MQTT

**NEW** - Command Response Status is now published to MQTT topics!

- Topic format: `MQTT_PREFIX/YOUR_CAR_VIN/command/{commandName}/state`
  - Note: Unless defined, default `MQTT_PREFIX=homeassistant`

### Sensor-Specific Messages as Attributes

**NEW** - Sensor specific messages are now published to MQTT as sensor attributes which are visible in HA

### Long-Term Statistics Support

**NEW** - Most non-binary sensors have a state_class assigned to allow collection of long-term statistics in HA

### Manual Diagnostic Refresh Command

**NEW** - Manual diagnostic refresh command ~~and manual engine RPM refresh command~~ is working

### Password Masking in Logs

**NEW** - OnStar password/pin and MQTT password are masked by default in the console log output. To see these values in the console log output, set `--env LOG_LEVEL=debug`

### MQTTS/TLS Security Options

**NEW** - New env options for securing connectivity for MQTTS using TLS

- `MQTT_REJECT_UNAUTHORIZED` (Default: `"true"`, set to `"false"` only for testing.)
- `MQTT_CA_FILE`
- `MQTT_CERT_FILE`
- `MQTT_KEY_FILE`

### Device Tracker Auto-Discovery

**NEW** - Auto discovery for device_tracker has been enabled starting at v1.12.0

- The device_tracker auto discovery config is published to: `homeassistant/device_tracker/YOUR_CAR_VIN/config` and the GPS coordinates are still read from the original topic automatically at: `homeassistant/device_tracker/YOUR_CAR_VIN/getlocation/state`
- Also added GPS based speed and direction to the device_tracker attributes

### Commands with Options via MQTT

**NEW** - Ability to send commands with options using MQTT now works

- Send commands to the command topic in the format:
  - `{"command": "diagnostics"}` (API v3 returns all diagnostic data - no filtering options available)
  - ~~`{"command": "setChargingProfile","options": {"chargeMode": "RATE_BASED","rateType": "OFFPEAK"}}`~~ (deprecated - use `setChargeLevelTarget` instead)
  - `{"command": "setChargeLevelTarget","options": 80}` (set target charge level to 80%)
  - `{"command": "stopCharging"}` (stop active charging session)
  - ~~`{"command": "alert","options": {"action": "Flash"}}`~~ (deprecated - use `flashLights` instead)
  - `{"command": "flashLights"}`
  - `{"command": "stopLights"}`
  - `{"command": "refreshEVChargingMetrics"}` (get live charging data)

### MQTT Button Auto-Discovery

**NEW** - MQTT Button Auto-Discovery for HA Added Starting at v1.14.0

- **⚠️ IMPORTANT DISCLAIMER:** Buttons are added **disabled by default** because it's easy to accidentally press the wrong button and trigger an action at an inopportune time. **Enable at your own risk and you assume all responsibility for your actions.**
- All available buttons for all vehicles are included for now, so only enable the buttons you need and/or work for your vehicle.
- **How to Enable Buttons in Home Assistant:**
  1. Go to `Settings` → `Devices & Services` → `MQTT`
  2. Find your vehicle device and click on it
  3. Scroll to the **Controls** section where buttons are listed (they will show as "Disabled")
  4. Click on each button you want to enable
  5. Click the settings/gear icon (⚙️) and toggle "Enabled" to ON
  6. Click "Update"
- See [HA-MQTT.md](HA-MQTT.md) for detailed instructions and available button list

### Command Status Sensors Auto-Discovery

**NEW** - MQTT Auto-Discovery for Command Status Sensors for HA Added Starting at v1.15.0

- Command Status and Timestamp from last command run are published to MQTT auto-discovery topics and are grouped in a MQTT device grouping for all command status sensors for the same vehicle.

### Polling Status Sensors Auto-Discovery

**NEW** - MQTT Auto-Discovery for Polling Status Sensors for HA Added Starting at v1.16.0

- Polling Status, Timestamp, Error Code (if applicable), Success T/F Sensor from last polling cycle and Polling Refresh Interval Time Sensor are published to MQTT auto-discovery topics and are grouped in a MQTT device grouping for all command status sensors for the same vehicle.

### Sensor Status Message Sensors Auto-Discovery

**NEW** - MQTT Auto-Discovery for Sensor Status Message Sensors for HA Added Starting at v1.17.0

- At this point, pretty much every available sensor, button and status is published to MQTT auto-discovery topics
- Set `MQTT_LIST_ALL_SENSORS_TOGETHER="true"` to group all the sensors under one MQTT device starting at v1.17.0. Default is `"false"`.

### Advanced Diagnostics Sensors (API v3)

**NEW** - Advanced Diagnostics Sensors from OnStar API v3 Added

- 7 diagnostic system sensors with full subsystem details: Engine & Transmission (11 subsystems), Antilock Braking (3), StabiliTrak (1), Air Bag (4), Emissions (2), OnStar (3), Electric Lamp (1)
- Each sensor includes system status, color-coded status indicators, diagnostic trouble codes (DTCs), and detailed descriptions
- Individual subsystem attributes for granular monitoring (e.g., displacement_on_demand_subsystem, fuel_management_subsystem)
- Quick issue detection with subsystems_with_issues array
- Published to topic: `homeassistant/{VIN}/adv_diag/state`

## Helpful Usage Notes

- The OnStar API has rate limiting, so they will block excessive requests over a short period of time.
  - Reducing the polling timeout to less than 30 minutes/1800000 ms is likely to get you rate limited (Error 429).
- The OnStar API can be very temperamental, so you may see numerous errors every now and then where you cannot get any data from your vehicle. These tend to be very sporadic and usually go away on their own.
  - A common example of this is: "Request Failed with status 504 - Gateway Timeout"
- After your engine is turned off, the vehicle will respond to about 4 - 5 requests before going into a type of hibernation mode and will not respond to requests or commands until the engine is started up again. If your engine has been off for a while, you may still not be able to get any data from the vehicle or run commands even if it is your first attempt at trying to pull data from your vehicle after the engine was turned off.
  - **Note:** You will see an error of _"Unable to establish packet session to the vehicle"_ when this occurs.

### Docker

[Docker Hub](https://hub.docker.com/r/bigthundersr/onstar2mqtt)

```shell
docker run \
  --env ONSTAR_DEVICEID= \
  --env ONSTAR_VIN= \
  --env ONSTAR_USERNAME= \
  --env ONSTAR_PASSWORD= \
  --env ONSTAR_TOTP= \
  --env ONSTAR_PIN= \
  --env TOKEN_LOCATION=/app/tokens \
  --env MQTT_HOST= \
  --env MQTT_USERNAME \
  --env MQTT_PASSWORD \
  --env MQTT_ONSTAR_POLLING_STATUS_TOPIC \
  -v ~/onstar2mqtt-tokens:/app/tokens \
  -v ~/onstar2mqtt-data:/app/data \
  --env UNIT_CACHE_DIR=/app/data \
  --env ONSTAR_STATE_CACHE=true \
  bigthundersr/onstar2mqtt:latest
```

**Recommendation:** Use a specific version tag (e.g., `bigthundersr/onstar2mqtt:2.5.0`) instead of `:latest`. The `:latest` tag updates frequently and may change your setup unexpectedly.

**NOTE:**

- TOKEN_LOCATION is optional, but STRONGLY RECOMMENDED and allows you to save/read tokens from persistent storage
- UNIT_CACHE_DIR volume mount is optional but recommended for persistent unit caching across container restarts (prevents unit conversion errors during API instability)
- If UNIT_CACHE_DIR is not set, cache files will use TOKEN_LOCATION automatically
- ONSTAR_STATE_CACHE is optional (default: false) - enable to merge partial API responses with cached data, preventing Home Assistant template warnings. The cache builds up over a few refresh cycles, so you may still see warnings initially after enabling.

[GitHub Container Registry](https://github.com/BigThunderSR/onstar2mqtt/pkgs/container/onstar2mqtt)

```shell
docker run \
  --env ONSTAR_DEVICEID= \
  --env ONSTAR_VIN= \
  --env ONSTAR_USERNAME= \
  --env ONSTAR_PASSWORD= \
  --env ONSTAR_TOTP= \
  --env ONSTAR_PIN= \
  --env TOKEN_LOCATION=/app/tokens \
  --env MQTT_HOST= \
  --env MQTT_USERNAME \
  --env MQTT_PASSWORD \
  --env MQTT_ONSTAR_POLLING_STATUS_TOPIC \
  -v ~/onstar2mqtt-tokens:/app/tokens \
  -v ~/onstar2mqtt-data:/app/data \
  --env UNIT_CACHE_DIR=/app/data \
  --env ONSTAR_STATE_CACHE=true \
  ghcr.io/bigthundersr/onstar2mqtt:latest
```

### docker-compose

[Docker Hub](https://hub.docker.com/r/bigthundersr/onstar2mqtt)

```yaml
onstar2mqtt:
  container_name: onstar2mqtt
  image: bigthundersr/onstar2mqtt
  restart: unless-stopped
  env_file:
    - /srv/containers/secrets/onstar2mqtt.env
  environment:
    - ONSTAR_DEVICEID=
    - ONSTAR_VIN=
    - MQTT_HOST=
    - UNIT_CACHE_DIR=/app/data
    - ONSTAR_STATE_CACHE=true
  volumes:
    - ~/onstar2mqtt-tokens:/app/tokens
    - ~/onstar2mqtt-data:/app/data
```

[GitHub Container Registry](https://github.com/BigThunderSR/onstar2mqtt/pkgs/container/onstar2mqtt)

```yaml
onstar2mqtt:
  container_name: onstar2mqtt
  image: ghcr.io/bigthundersr/onstar2mqtt
  restart: unless-stopped
  env_file:
    - /srv/containers/secrets/onstar2mqtt.env
  environment:
    - ONSTAR_DEVICEID=
    - ONSTAR_VIN=
    - MQTT_HOST=
    - UNIT_CACHE_DIR=/app/data
    - ONSTAR_STATE_CACHE=true
  volumes:
    - ~/onstar2mqtt-tokens:/app/tokens
    - ~/onstar2mqtt-data:/app/data
```

onstar2mqtt.env:

```shell
ONSTAR_USERNAME=
ONSTAR_PASSWORD=
ONSTAR_TOTP=
ONSTAR_PIN=
TOKEN_LOCATION=/app/tokens  # (NOTE: This is optional and allows you to save/read tokens from persistent storage)
UNIT_CACHE_DIR=/app/data  # (NOTE: This is optional but recommended for persistent unit caching across container restarts)
ONSTAR_STATE_CACHE=true  # (NOTE: Optional - merges partial API responses with cached data to prevent HA template warnings)
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_ONSTAR_POLLING_STATUS_TOPIC=

```

### Running Multiple Vehicles

To monitor multiple vehicles from the same OnStar account, run multiple containers with different VINs. Each container operates independently and publishes to separate MQTT topics (keyed by VIN), so they won't interfere with each other.

**Note:** Use either [Docker Hub](https://hub.docker.com/r/bigthundersr/onstar2mqtt) or [GitHub Container Registry](https://github.com/BigThunderSR/onstar2mqtt/pkgs/container/onstar2mqtt) for the image.

**Recommendation:** Use a specific version tag (e.g., `bigthundersr/onstar2mqtt:2.5.0`) instead of `:latest`. The `:latest` tag updates frequently and may change your setup unexpectedly.

```yaml
version: '3'
services:
  # First vehicle
  onstar2mqtt-vehicle1:
    container_name: onstar2mqtt-vehicle1
    image: bigthundersr/onstar2mqtt:latest  # Or use: ghcr.io/bigthundersr/onstar2mqtt:latest
    restart: unless-stopped
    env_file:
      - /srv/containers/secrets/onstar2mqtt.env
    environment:
      - ONSTAR_DEVICEID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # Generate unique UUID
      - ONSTAR_VIN=YOUR_FIRST_VIN_HERE  # Replace with your actual VIN
      - MQTT_HOST=
      - UNIT_CACHE_DIR=/app/data
      - ONSTAR_STATE_CACHE=true
    volumes:
      - ~/onstar2mqtt-vehicle1-tokens:/app/tokens
      - ~/onstar2mqtt-vehicle1-data:/app/data

  # Second vehicle
  onstar2mqtt-vehicle2:
    container_name: onstar2mqtt-vehicle2
    image: bigthundersr/onstar2mqtt:latest  # Or use: ghcr.io/bigthundersr/onstar2mqtt:latest
    restart: unless-stopped
    env_file:
      - /srv/containers/secrets/onstar2mqtt.env
    environment:
      - ONSTAR_DEVICEID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy  # Generate unique UUID
      - ONSTAR_VIN=YOUR_SECOND_VIN_HERE  # Replace with your actual VIN
      - MQTT_HOST=
      - UNIT_CACHE_DIR=/app/data
      - ONSTAR_STATE_CACHE=true
    volumes:
      - ~/onstar2mqtt-vehicle2-tokens:/app/tokens
      - ~/onstar2mqtt-vehicle2-data:/app/data

  # Add more vehicles as needed following the same pattern
```

**Important:**

- Generate unique UUIDs for each `ONSTAR_DEVICEID` ([generator](https://www.uuidgenerator.net/version4))
- Replace `YOUR_FIRST_VIN_HERE` and `YOUR_SECOND_VIN_HERE` with your actual VINs
- Use separate volume mounts for each vehicle to prevent token/cache conflicts
- All vehicles share the same credentials from the env_file
- Each vehicle appears as a separate device in Home Assistant

**To run:** `docker-compose up -d`

### Node.js

It's a typical node.js application, define the same environment values as described in the docker sections and run with:
`npm run start`. Currently, this is tested with Node.js 18.x, 20.x and 22.x.

## Development

### Running with npm

`npm run start`

### Testing

`npm run test`

### Coverage

`npm run coverage`

### Releases

`npm version [major|minor|patch] -m "Version %s" && git push --follow-tags`

Publish the release on GitHub to trigger a release build (i.e. update 'latest' docker tag).

## If you would like to run this as a Home Assistant add-on

[https://github.com/BigThunderSR/homeassistant-addons-onstar2mqtt](https://github.com/BigThunderSR/homeassistant-addons-onstar2mqtt)

## My other related project which provides additional capabilities through Node-RED

[https://github.com/BigThunderSR/node-red-contrib-onstar2](https://github.com/BigThunderSR/node-red-contrib-onstar2)

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-no-red.svg
[armv7-shield]: https://img.shields.io/badge/armv7-no-red.svg
[i386-shield]: https://img.shields.io/badge/i386-no-red.svg
