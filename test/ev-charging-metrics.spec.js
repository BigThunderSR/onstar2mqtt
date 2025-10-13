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
                        disMinSoc: 20
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            assert.strictEqual(configs.length, 10);
            
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
        });

        it('should handle missing or null values gracefully', () => {
            const metricsData = {
                data: {
                    results: [{
                        tcl: 80,
                        kwh: null,
                        tripodo: 123.4,
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
                        lifecons: 14.8
                    }]
                }
            };

            const configs = mqtt.getEVChargingMetricsConfigs(metricsData);
            
            const tclSensor = configs.find(c => c.topic.includes('ev_target_charge_level'));
            const tripOdoSensor = configs.find(c => c.topic.includes('ev_trip_odometer'));
            const lifeConsSensor = configs.find(c => c.topic.includes('ev_lifetime_consumption'));
            
            assert.strictEqual(tclSensor.payload.state_class, 'measurement');
            assert.strictEqual(tripOdoSensor.payload.state_class, 'total_increasing');
            assert.strictEqual(lifeConsSensor.payload.state_class, 'measurement');
        });
    });
});
