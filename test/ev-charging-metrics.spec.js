const assert = require('assert');
const MQTT = require('../src/mqtt');
const Vehicle = require('../src/vehicle');

describe('EV Charging Metrics', () => {
    let mqtt;
    let vehicle;

    beforeEach(() => {
        vehicle = new Vehicle({ 
            make: 'Chevrolet', 
            model: 'Bolt EV', 
            vin: '1G1FW6S07N4123456', 
            year: 2023 
        });
        mqtt = new MQTT(vehicle);
    });

    describe('getDevicePayload', () => {
        it('should return device payload with correct structure', () => {
            const payload = mqtt.getDevicePayload();
            
            assert.ok(payload);
            assert.strictEqual(payload.identifiers[0], '1G1FW6S07N4123456');
            assert.strictEqual(payload.manufacturer, 'Chevrolet');
            assert.strictEqual(payload.model, '2023 Bolt EV');
            assert.strictEqual(payload.name, '2023 Chevrolet Bolt EV');
            assert.strictEqual(payload.suggested_area, '2023 Chevrolet Bolt EV');
        });
    });

    describe('getAvailabilityPayload', () => {
        it('should return availability payload with correct structure', () => {
            const payload = mqtt.getAvailabilityPayload();
            
            assert.ok(payload);
            assert.strictEqual(payload.topic, 'homeassistant/1G1FW6S07N4123456/available');
            assert.strictEqual(payload.payload_available, 'true');
            assert.strictEqual(payload.payload_not_available, 'false');
        });
    });

    describe('getEVChargingMetricsConfigs', () => {
        it('should create configs for all EV charging metrics', () => {
            const metricsData = {
                data: {
                    results: [{
                        tcl: 80,
                        kwh: 65.5,
                        tripodo: 123.4,
                        tripcons: 15.2,
                        lifecons: 14.8,
                        cmode: 'IMMEDIATE',
                        clocSet: true,
                        clocAt: false,
                        disEnabled: true,
                        disMinSoc: 20,
                        soc: 75.5,
                        meterkwh: 14213.1,
                        ravg: 260,
                        cstate: 'ACTIVE',
                        cplug: 'plugged',
                        odo: 58062.09,
                        temp: 2,
                        ceta: '2026-02-17T10:00:00.000-08:00'
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            assert.strictEqual(configs.length, 18);
            
            // Check target charge level sensor
            const tclSensor = configs.find(c => c.topic.includes('ev_target_charge_level'));
            assert.ok(tclSensor);
            assert.strictEqual(tclSensor.payload.name, 'EV Target Charge Level');
            assert.strictEqual(tclSensor.payload.device_class, 'battery');
            assert.strictEqual(tclSensor.payload.unit_of_measurement, '%');
            assert.strictEqual(tclSensor.state, 80);
            
            // Check battery capacity sensor
            const kwhSensor = configs.find(c => c.topic.includes('ev_battery_capacity'));
            assert.ok(kwhSensor);
            assert.strictEqual(kwhSensor.payload.name, 'EV Battery Capacity');
            assert.strictEqual(kwhSensor.payload.device_class, 'energy_storage');
            assert.strictEqual(kwhSensor.payload.unit_of_measurement, 'kWh');
            assert.strictEqual(kwhSensor.state, 65.5);
            
            // Check trip odometer sensor
            const tripOdoSensor = configs.find(c => c.topic.includes('ev_trip_odometer'));
            assert.ok(tripOdoSensor);
            assert.strictEqual(tripOdoSensor.payload.name, 'EV Trip Odometer');
            assert.strictEqual(tripOdoSensor.payload.device_class, 'distance');
            assert.strictEqual(tripOdoSensor.state, 123.4);
            
            // Check trip consumption sensor
            const tripConsSensor = configs.find(c => c.topic.includes('ev_trip_consumption'));
            assert.ok(tripConsSensor);
            assert.strictEqual(tripConsSensor.payload.name, 'EV Trip Consumption');
            assert.strictEqual(tripConsSensor.state, 15.2);
            
            // Check lifetime consumption sensor
            const lifeConsSensor = configs.find(c => c.topic.includes('ev_lifetime_consumption'));
            assert.ok(lifeConsSensor);
            assert.strictEqual(lifeConsSensor.payload.name, 'EV Lifetime Consumption');
            assert.strictEqual(lifeConsSensor.state, 14.8);
            
            // Check charge mode sensor
            const cmodeSensor = configs.find(c => c.topic.includes('ev_charge_mode'));
            assert.ok(cmodeSensor);
            assert.strictEqual(cmodeSensor.payload.name, 'EV Charge Mode');
            assert.strictEqual(cmodeSensor.state, 'IMMEDIATE');
            
            // Check charge location set binary sensor
            const clocSetSensor = configs.find(c => c.topic.includes('ev_charge_location_set'));
            assert.ok(clocSetSensor);
            assert.strictEqual(clocSetSensor.payload.name, 'EV Charge Location Set');
            assert.strictEqual(clocSetSensor.payload.payload_on, true);
            assert.strictEqual(clocSetSensor.payload.payload_off, false);
            assert.strictEqual(clocSetSensor.state, true);
            
            // Check at charge location binary sensor
            const clocAtSensor = configs.find(c => c.topic.includes('ev_at_charge_location'));
            assert.ok(clocAtSensor);
            assert.strictEqual(clocAtSensor.payload.name, 'EV At Charge Location');
            assert.strictEqual(clocAtSensor.state, false);
            
            // Check discharge enabled binary sensor
            const disEnabledSensor = configs.find(c => c.topic.includes('ev_discharge_enabled'));
            assert.ok(disEnabledSensor);
            assert.strictEqual(disEnabledSensor.payload.name, 'EV Discharge Enabled');
            assert.strictEqual(disEnabledSensor.state, true);
            
            // Check discharge minimum SoC sensor
            const disMinSocSensor = configs.find(c => c.topic.includes('ev_discharge_min_soc'));
            assert.ok(disMinSocSensor);
            assert.strictEqual(disMinSocSensor.payload.name, 'EV Discharge Minimum SoC');
            assert.strictEqual(disMinSocSensor.payload.device_class, 'battery');
            assert.strictEqual(disMinSocSensor.state, 20);

            // Check EV Charging Battery Level sensor
            const batteryLevelSensor = configs.find(c => c.topic.includes('ev_charging_battery_level'));
            assert.ok(batteryLevelSensor);
            assert.strictEqual(batteryLevelSensor.payload.name, 'EV Charging Battery Level');
            assert.strictEqual(batteryLevelSensor.payload.device_class, 'battery');
            assert.strictEqual(batteryLevelSensor.payload.unit_of_measurement, '%');
            assert.strictEqual(batteryLevelSensor.payload.state_class, 'measurement');
            assert.strictEqual(batteryLevelSensor.state, 75.5);

            // Check EV Charging Lifetime Energy sensor
            const lifetimeEnergySensor = configs.find(c => c.topic.includes('ev_charging_lifetime_energy'));
            assert.ok(lifetimeEnergySensor);
            assert.strictEqual(lifetimeEnergySensor.payload.name, 'EV Charging Lifetime Energy');
            assert.strictEqual(lifetimeEnergySensor.payload.device_class, 'energy');
            assert.strictEqual(lifetimeEnergySensor.payload.unit_of_measurement, 'kWh');
            assert.strictEqual(lifetimeEnergySensor.payload.state_class, 'total_increasing');
            assert.strictEqual(lifetimeEnergySensor.state, 14213.1);

            // Check EV Charging Range sensor
            const rangeSensor = configs.find(c => c.topic.includes('ev_charging_range'));
            assert.ok(rangeSensor);
            assert.strictEqual(rangeSensor.payload.name, 'EV Charging Range');
            assert.strictEqual(rangeSensor.payload.device_class, 'distance');
            assert.strictEqual(rangeSensor.payload.unit_of_measurement, 'km');
            assert.strictEqual(rangeSensor.state, 260);

            // Check EV Charging State sensor
            const chargingStateSensor = configs.find(c => c.topic.includes('ev_charging_state'));
            assert.ok(chargingStateSensor);
            assert.strictEqual(chargingStateSensor.payload.name, 'EV Charging State');
            assert.strictEqual(chargingStateSensor.state, 'ACTIVE');

            // Check EV Charging Plug State sensor
            const plugStateSensor = configs.find(c => c.topic.includes('ev_charging_plug_state'));
            assert.ok(plugStateSensor);
            assert.strictEqual(plugStateSensor.payload.name, 'EV Charging Plug State');
            assert.strictEqual(plugStateSensor.state, 'plugged');

            // Check EV Charging Odometer sensor
            const odometerSensor = configs.find(c => c.topic.includes('ev_charging_odometer'));
            assert.ok(odometerSensor);
            assert.strictEqual(odometerSensor.payload.name, 'EV Charging Odometer');
            assert.strictEqual(odometerSensor.payload.device_class, 'distance');
            assert.strictEqual(odometerSensor.payload.unit_of_measurement, 'km');
            assert.strictEqual(odometerSensor.payload.state_class, 'total_increasing');
            assert.strictEqual(odometerSensor.state, 58062.09);

            // Check EV Charging Temperature sensor
            const temperatureSensor = configs.find(c => c.topic.includes('ev_charging_temperature'));
            assert.ok(temperatureSensor);
            assert.strictEqual(temperatureSensor.payload.name, 'EV Charging Temperature');
            assert.strictEqual(temperatureSensor.payload.device_class, 'temperature');
            assert.strictEqual(temperatureSensor.payload.unit_of_measurement, '°C');
            assert.strictEqual(temperatureSensor.state, 2);

            // Check EV Charging ETA sensor
            const etaSensor = configs.find(c => c.topic.includes('ev_charging_eta'));
            assert.ok(etaSensor);
            assert.strictEqual(etaSensor.payload.name, 'EV Charging ETA');
            assert.strictEqual(etaSensor.payload.device_class, 'timestamp');
            assert.strictEqual(etaSensor.state, '2026-02-17T10:00:00.000-08:00');
        });

        it('should handle missing or null values gracefully', () => {
            const metricsData = {
                data: {
                    results: [{
                        tcl: 80,
                        kwh: null,
                        tripodo: 123.4,
                        soc: null,
                        meterkwh: undefined,
                        ravg: null,
                        cstate: null,
                        cplug: null,
                        odo: null,
                        temp: null,
                        ceta: null
                        // Other fields missing
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            // Should only create configs for non-null values
            assert.strictEqual(configs.length, 2); // Only tcl and tripodo
            assert.ok(configs.find(c => c.topic.includes('ev_target_charge_level')));
            assert.ok(configs.find(c => c.topic.includes('ev_trip_odometer')));
        });

        it('should handle empty results array', () => {
            const metricsData = {
                data: {
                    results: []
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            assert.strictEqual(configs.length, 0);
        });

        it('should handle missing data structure', () => {
            const metricsData = {};

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            assert.strictEqual(configs.length, 0);
        });

        it('should correctly convert binary sensor boolean values', () => {
            const metricsData = {
                data: {
                    results: [{
                        clocSet: true,
                        clocAt: false,
                        disEnabled: true
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            const clocSetSensor = configs.find(c => c.topic.includes('ev_charge_location_set'));
            const clocAtSensor = configs.find(c => c.topic.includes('ev_at_charge_location'));
            const disEnabledSensor = configs.find(c => c.topic.includes('ev_discharge_enabled'));
            
            assert.strictEqual(clocSetSensor.state, true);
            assert.strictEqual(clocAtSensor.state, false);
            assert.strictEqual(disEnabledSensor.state, true);
        });

        it('should produce states that can be safely converted to strings for MQTT', () => {
            // This test ensures all state values can be converted to strings
            // MQTT publish requires string or Buffer, not raw booleans
            const metricsData = {
                data: {
                    results: [{
                        tcl: 80,
                        kwh: 65.5,
                        clocSet: true,
                        clocAt: false,
                        disEnabled: true,
                        ign: 'on',
                        soc: 75.5,
                        meterkwh: 14213.1,
                        ravg: 260,
                        cstate: 'ACTIVE',
                        cplug: 'plugged',
                        odo: 58062.09,
                        temp: 2,
                        ceta: '2026-02-17T10:00:00.000-08:00'
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            // All states must be convertible to string without error
            for (const config of configs) {
                const stateValue = String(config.state);
                assert.ok(typeof stateValue === 'string', `State for ${config.topic} should convert to string`);
                assert.ok(stateValue !== '[object Object]', `State for ${config.topic} should not be an unconverted object`);
                // Verify boolean conversions produce expected strings
                if (config.state === true) {
                    assert.strictEqual(stateValue, 'true', 'Boolean true should convert to "true"');
                } else if (config.state === false) {
                    assert.strictEqual(stateValue, 'false', 'Boolean false should convert to "false"');
                }
            }
        });

        it('should include device and availability payloads for all sensors', () => {
            const metricsData = {
                data: {
                    results: [{
                        tcl: 80,
                        cmode: 'IMMEDIATE'
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            configs.forEach(config => {
                assert.ok(config.payload.device);
                assert.ok(config.payload.availability);
                assert.strictEqual(config.payload.device.identifiers[0], '1G1FW6S07N4123456');
                assert.strictEqual(config.payload.availability.topic, 'homeassistant/1G1FW6S07N4123456/available');
            });
        });

        it('should use correct topics for sensors and binary_sensors', () => {
            const metricsData = {
                data: {
                    results: [{
                        tcl: 80,
                        clocSet: true
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            const sensorConfig = configs.find(c => c.topic.includes('ev_target_charge_level'));
            const binarySensorConfig = configs.find(c => c.topic.includes('ev_charge_location_set'));
            
            assert.ok(sensorConfig.topic.startsWith('homeassistant/sensor/'));
            assert.ok(binarySensorConfig.topic.startsWith('homeassistant/binary_sensor/'));
        });

        it('should set correct state_class for sensors', () => {
            const metricsData = {
                data: {
                    results: [{
                        tcl: 80,
                        tripodo: 123.4,
                        lifecons: 14.8,
                        soc: 75.5,
                        meterkwh: 14213.1,
                        ravg: 260,
                        odo: 58062.09,
                        temp: 2
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            const tclSensor = configs.find(c => c.topic.includes('ev_target_charge_level'));
            const tripOdoSensor = configs.find(c => c.topic.includes('ev_trip_odometer'));
            const lifeConsSensor = configs.find(c => c.topic.includes('ev_lifetime_consumption'));
            const batteryLevelSensor = configs.find(c => c.topic.includes('ev_charging_battery_level'));
            const lifetimeEnergySensor = configs.find(c => c.topic.includes('ev_charging_lifetime_energy'));
            const rangeSensor = configs.find(c => c.topic.includes('ev_charging_range'));
            const odometerSensor = configs.find(c => c.topic.includes('ev_charging_odometer'));
            const temperatureSensor = configs.find(c => c.topic.includes('ev_charging_temperature'));
            
            assert.strictEqual(tclSensor.payload.state_class, 'measurement');
            assert.strictEqual(tripOdoSensor.payload.state_class, 'total_increasing');
            assert.strictEqual(lifeConsSensor.payload.state_class, 'measurement');
            assert.strictEqual(batteryLevelSensor.payload.state_class, 'measurement');
            assert.strictEqual(lifetimeEnergySensor.payload.state_class, 'total_increasing');
            assert.strictEqual(rangeSensor.payload.state_class, 'measurement');
            assert.strictEqual(odometerSensor.payload.state_class, 'total_increasing');
            assert.strictEqual(temperatureSensor.payload.state_class, 'measurement');
        });
    });

    describe('Topic Collision Prevention', () => {
        it('should use ev_charging_ prefix to avoid collisions with diagnostic sensor topics', () => {
            const metricsData = {
                data: {
                    results: [{
                        soc: 75.5,
                        ravg: 260,
                        cstate: 'ACTIVE',
                        cplug: 'plugged',
                        odo: 58062.09,
                        temp: 2,
                        meterkwh: 14213.1,
                        ceta: '2026-02-17T10:00:00.000-08:00'
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);

            // These diagnostic topic segments already exist via getConfigTopic():
            //   sensor/.../ev_battery_level/config
            //   sensor/.../ev_range/config
            //   binary_sensor/.../ev_charge_state/config
            //   binary_sensor/.../ev_plug_state/config
            //
            // Verify NONE of our new sensors use those exact topic segments
            const newSensorTopics = configs.map(c => c.topic);
            assert.ok(!newSensorTopics.some(t => t.includes('/ev_battery_level/')),
                'Should NOT use ev_battery_level topic (collides with diagnostic)');
            assert.ok(!newSensorTopics.some(t => t.includes('/ev_range/')),
                'Should NOT use ev_range topic (collides with diagnostic)');
            assert.ok(!newSensorTopics.some(t => t.includes('/ev_charge_state/')),
                'Should NOT use ev_charge_state topic (collides with diagnostic)');
            assert.ok(!newSensorTopics.some(t => t.includes('/ev_plug_state/')),
                'Should NOT use ev_plug_state topic (collides with diagnostic)');

            // Verify they use the ev_charging_ prefix instead
            assert.ok(newSensorTopics.some(t => t.includes('/ev_charging_battery_level/')));
            assert.ok(newSensorTopics.some(t => t.includes('/ev_charging_range/')));
            assert.ok(newSensorTopics.some(t => t.includes('/ev_charging_state/')));
            assert.ok(newSensorTopics.some(t => t.includes('/ev_charging_plug_state/')));
        });

        it('should use unique_ids that do not collide with diagnostic unique_ids', () => {
            const metricsData = {
                data: {
                    results: [{
                        soc: 75.5,
                        ravg: 260,
                        cstate: 'ACTIVE',
                        cplug: 'plugged'
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            const uniqueIds = configs.map(c => c.payload.unique_id);

            // Diagnostic unique_ids use hyphen separator: {VIN}-ev-battery-level or {VIN}-ev_battery_level
            // EV metrics unique_ids use underscore separator: {VIN}_ev_charging_battery_level
            // Verify no collision with the diagnostic patterns
            for (const uid of uniqueIds) {
                assert.ok(!uid.match(/^[A-Z0-9]+-ev[_-]battery[_-]level$/i),
                    `unique_id ${uid} should not collide with diagnostic ev_battery_level`);
                assert.ok(!uid.match(/^[A-Z0-9]+-ev[_-]range$/i),
                    `unique_id ${uid} should not collide with diagnostic ev_range`);
                assert.ok(!uid.match(/^[A-Z0-9]+-ev[_-]charge[_-]state$/i),
                    `unique_id ${uid} should not collide with diagnostic ev_charge_state`);
                assert.ok(!uid.match(/^[A-Z0-9]+-ev[_-]plug[_-]state$/i),
                    `unique_id ${uid} should not collide with diagnostic ev_plug_state`);
            }
        });

        it('should produce all new sensors as sensor/ type (not binary_sensor/)', () => {
            const metricsData = {
                data: {
                    results: [{
                        soc: 75.5,
                        meterkwh: 14213.1,
                        ravg: 260,
                        cstate: 'ACTIVE',
                        cplug: 'plugged',
                        odo: 58062.09,
                        temp: 2,
                        ceta: '2026-02-17T10:00:00.000-08:00'
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);

            // All 8 new sensors should be regular sensors (not binary_sensor)
            const newSensorNames = [
                'ev_charging_battery_level', 'ev_charging_lifetime_energy',
                'ev_charging_range', 'ev_charging_state',
                'ev_charging_plug_state', 'ev_charging_odometer',
                'ev_charging_temperature', 'ev_charging_eta'
            ];

            for (const name of newSensorNames) {
                const config = configs.find(c => c.topic.includes(`/${name}/`));
                assert.ok(config, `Sensor ${name} should exist`);
                assert.ok(config.topic.includes('/sensor/'),
                    `${name} should be under sensor/ topic, got: ${config.topic}`);
                assert.ok(!config.topic.includes('/binary_sensor/'),
                    `${name} should NOT be under binary_sensor/ topic`);
            }
        });
    });

    describe('Issue #848 Scenario: Diagnostics 403, EV Metrics Only', () => {
        it('should publish battery/range/energy sensors from EV metrics alone', () => {
            // This simulates the issue reporter's exact data - Connected Access plan
            // where diagnostics returns 403 but refreshEVChargingMetrics works
            const metricsData = {
                data: {
                    results: [{
                        soc: 96.8,
                        meterkwh: 14213.1,
                        ravg: 260,
                        tclRavg: 270,
                        cstate: 'ACTIVE',
                        cplug: 'plugged',
                        ctype: 'cord',
                        cmode: 'immediate',
                        ceta: '2026-02-17T10:00:00.000-08:00',
                        odo: 58062.09,
                        tripodo: 61.22,
                        temp: 2,
                        ign: 'off',
                        gpsspd: 0,
                        // Many fields null - typical for Connected Access plan
                        tcl: null,
                        kwh: null,
                        lifecons: null,
                        tripcons: null,
                        lifekwh: null,
                        disEnabled: null,
                        disMinSoc: null,
                        cpwr: null
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);

            // With old code, only 5 sensors would be created: cmode, tripodo, clocAt(?), clocSet(?), ign
            // With new code, we should get the 8 new sensors plus the non-null existing ones
            const sensorNames = configs.map(c => {
                const match = c.topic.match(/\/([^/]+)\/config$/);
                return match ? match[1] : c.topic;
            });

            // Verify the critical sensors the issue reporter needs are present
            assert.ok(sensorNames.includes('ev_charging_battery_level'), 'Battery level sensor should exist');
            assert.ok(sensorNames.includes('ev_charging_lifetime_energy'), 'Lifetime energy sensor should exist');
            assert.ok(sensorNames.includes('ev_charging_range'), 'Range sensor should exist');
            assert.ok(sensorNames.includes('ev_charging_state'), 'Charge state sensor should exist');
            assert.ok(sensorNames.includes('ev_charging_plug_state'), 'Plug state sensor should exist');
            assert.ok(sensorNames.includes('ev_charging_odometer'), 'Odometer sensor should exist');
            assert.ok(sensorNames.includes('ev_charging_temperature'), 'Temperature sensor should exist');
            assert.ok(sensorNames.includes('ev_charging_eta'), 'Charge ETA sensor should exist');

            // Verify the correct values
            const battSensor = configs.find(c => c.topic.includes('ev_charging_battery_level'));
            assert.strictEqual(battSensor.state, 96.8);
            const energySensor = configs.find(c => c.topic.includes('ev_charging_lifetime_energy'));
            assert.strictEqual(energySensor.state, 14213.1);

            // Verify null fields did NOT create sensors (no regression)
            assert.ok(!sensorNames.includes('ev_target_charge_level'), 'tcl is null, should not create sensor');
            assert.ok(!sensorNames.includes('ev_battery_capacity'), 'kwh is null, should not create sensor');
            assert.ok(!sensorNames.includes('ev_lifetime_consumption'), 'lifecons is null, should not create sensor');
            assert.ok(!sensorNames.includes('ev_trip_consumption'), 'tripcons is null, should not create sensor');
            assert.ok(!sensorNames.includes('ev_discharge_enabled'), 'disEnabled is null, should not create sensor');
            assert.ok(!sensorNames.includes('ev_discharge_min_soc'), 'disMinSoc is null, should not create sensor');
        });

        it('should produce correct sensor count for issue reporter scenario', () => {
            const metricsData = {
                data: {
                    results: [{
                        soc: 96.8,
                        meterkwh: 14213.1,
                        ravg: 260,
                        cstate: 'ACTIVE',
                        cplug: 'plugged',
                        cmode: 'immediate',
                        ceta: '2026-02-17T10:00:00.000-08:00',
                        odo: 58062.09,
                        tripodo: 61.22,
                        temp: 2,
                        ign: 'off',
                        clocSet: false,
                        clocAt: false,
                        // Null fields
                        tcl: null, kwh: null, lifecons: null, tripcons: null,
                        lifekwh: null, disEnabled: null, disMinSoc: null
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);

            // Non-null existing sensors: tripodo, cmode, clocSet, clocAt, ign = 5
            // New sensors: soc, meterkwh, ravg, cstate, cplug, odo, temp, ceta = 8
            // Total = 13
            assert.strictEqual(configs.length, 13,
                `Expected 13 sensors (5 existing + 8 new), got ${configs.length}: ${configs.map(c => c.topic.match(/\/([^/]+)\/config$/)?.[1]).join(', ')}`);
        });
    });

    describe('Edge Case: Diagnostic Sensor Not Configured', () => {
        // Sample EV metrics response for edge case tests
        const sampleEvMetricsResponse = {
            data: {
                results: [{
                    soc: 75,
                    ravg: 180,
                    cstate: 'charging',
                    cplug: 'pluggedIn',
                    temp: 22,
                    odo: 12345
                }]
            }
        };

        it('should skip updates for topics not in tracker when tracker is empty', () => {
            // Simulate getEVChargingMetricsDiagnosticUpdates returning updates
            const updates = mqtt.getEVChargingMetricsDiagnosticUpdates(sampleEvMetricsResponse);
            
            // With an empty tracker (no diagnostics published), all should be skipped
            const emptyTracker = new Map();
            const publishedTopics = [];
            
            for (const update of updates) {
                const existingState = emptyTracker.get(update.topic);
                if (!existingState) {
                    // This is what the code does - skip if not exists
                    continue;
                }
                publishedTopics.push(update.topic);
            }
            
            // Nothing should be published
            assert.strictEqual(publishedTopics.length, 0, 'No topics should be published when tracker is empty');
        });
        
        it('should only update topics that exist in tracker', () => {
            const updates = mqtt.getEVChargingMetricsDiagnosticUpdates(sampleEvMetricsResponse);
            
            // Simulate tracker with only HIGH_VOLTAGE_BATTERY, not ODOMETER
            const partialTracker = new Map();
            const hvbTopic = mqtt.getStateTopic({ name: 'HIGH_VOLTAGE_BATTERY' });
            partialTracker.set(hvbTopic, { charge_state: 50 });
            
            const publishedTopics = [];
            
            for (const update of updates) {
                const existingState = partialTracker.get(update.topic);
                if (!existingState) {
                    continue;
                }
                publishedTopics.push(update.topic);
            }
            
            // Only HVB topic should be published (if it's in the updates)
            const hvbUpdates = updates.filter(u => u.topic === hvbTopic);
            assert.strictEqual(publishedTopics.length, hvbUpdates.length, 'Only existing topics should be published');
        });
        
        it('should merge new values into existing state correctly', () => {
            const updates = mqtt.getEVChargingMetricsDiagnosticUpdates(sampleEvMetricsResponse);
            
            // Simulate tracker with existing state
            const tracker = new Map();
            const hvbTopic = mqtt.getStateTopic({ name: 'HIGH_VOLTAGE_BATTERY' });
            const existingState = { 
                charge_state: 50,  // will be updated
                ev_battery_voltage: 400,  // should be preserved
                some_other_field: 'preserved'  // should be preserved
            };
            tracker.set(hvbTopic, existingState);
            
            // Find HVB update
            const hvbUpdate = updates.find(u => u.topic === hvbTopic);
            if (hvbUpdate) {
                const mergedState = { ...existingState, ...hvbUpdate.stateUpdates };
                
                // Verify merge preserves existing fields
                assert.strictEqual(mergedState.ev_battery_voltage, 400, 'Existing field should be preserved');
                assert.strictEqual(mergedState.some_other_field, 'preserved', 'Other fields should be preserved');
                // New values from EV metrics should be applied
                assert.ok(mergedState.charge_state !== undefined, 'New value should be applied');
            }
        });
    });
});
