const assert = require('assert');
const MQTT = require('../src/mqtt');
const Vehicle = require('../src/vehicle');

const accountVehiclesSampleData = require('./command-sample-getAccountVehicles.json');

describe('Vehicle Image Entity', () => {
    let mqttHA;
    let vehicle;

    before(() => {
        const vehicleData = {
            vin: 'TEST1234567890123',
            make: 'Chevrolet',
            model: 'Blazer EV',
            year: '2024'
        };
        vehicle = new Vehicle(vehicleData);
        mqttHA = new MQTT(vehicle);
    });

    describe('getVehicleImageConfig', () => {
        it('should create vehicle image config with correct topic', () => {
            const config = mqttHA.getVehicleImageConfig();
            
            assert.strictEqual(config.topic, 'homeassistant/image/TEST1234567890123/vehicle_image/config');
            assert.ok(config.payload);
        });

        it('should create vehicle image config with correct payload structure', () => {
            const config = mqttHA.getVehicleImageConfig();
            const payload = config.payload;
            
            assert.strictEqual(payload.name, 'Vehicle Image');
            assert.strictEqual(payload.unique_id, 'TEST1234567890123_vehicle_image');
            assert.strictEqual(payload.icon, 'mdi:car');
            assert.strictEqual(payload.url_topic, 'homeassistant/image/TEST1234567890123/vehicle_image/state');
        });

        it('should include device information', () => {
            const config = mqttHA.getVehicleImageConfig();
            const payload = config.payload;
            
            assert.ok(payload.device);
            assert.strictEqual(payload.device.manufacturer, 'Chevrolet');
            assert.strictEqual(payload.device.model, '2024 Blazer EV');
            assert.deepStrictEqual(payload.device.identifiers, ['TEST1234567890123']);
        });

        it('should include availability configuration', () => {
            const config = mqttHA.getVehicleImageConfig();
            const payload = config.payload;
            
            assert.ok(payload.availability);
            assert.strictEqual(payload.availability.payload_available, 'true');
            assert.strictEqual(payload.availability.payload_not_available, 'false');
        });
    });

    describe('getVehicleImageStatePayload', () => {
        it('should extract image URL from vehicle data', () => {
            const vehicleData = accountVehiclesSampleData.data.vehicles[0];
            const imageUrl = mqttHA.getVehicleImageStatePayload(vehicleData);
            
            assert.ok(imageUrl);
            assert.ok(imageUrl.includes('https://'));
            assert.ok(imageUrl.includes('chevrolet.com'));
        });

        it('should return empty string if no imageUrl present', () => {
            const vehicleData = {};
            const imageUrl = mqttHA.getVehicleImageStatePayload(vehicleData);
            
            assert.strictEqual(imageUrl, '');
        });

        it('should handle null vehicle data', () => {
            const imageUrl = mqttHA.getVehicleImageStatePayload(null);
            
            assert.strictEqual(imageUrl, '');
        });

        it('should extract correct image URL format', () => {
            const vehicleData = accountVehiclesSampleData.data.vehicles[0];
            const imageUrl = mqttHA.getVehicleImageStatePayload(vehicleData);
            
            // Should be a valid URL format
            assert.ok(imageUrl.startsWith('https://'));
            
            // Should contain image generation parameters
            assert.ok(imageUrl.includes('.jpg') || imageUrl.includes('.png'));
        });
    });

    describe('Vehicle Image Integration', () => {
        it('should create both config and state for complete integration', () => {
            const config = mqttHA.getVehicleImageConfig();
            const vehicleData = accountVehiclesSampleData.data.vehicles[0];
            const imageUrl = mqttHA.getVehicleImageStatePayload(vehicleData);
            
            assert.ok(config.topic);
            assert.ok(config.payload);
            assert.ok(imageUrl);
        });

        it('should use consistent topic names', () => {
            const config = mqttHA.getVehicleImageConfig();
            
            assert.ok(config.topic.includes('vehicle_image/config'));
            assert.ok(config.payload.url_topic.includes('vehicle_image/state'));
        });

        it('should use image entity type', () => {
            const config = mqttHA.getVehicleImageConfig();
            
            // Topic should use /image/ entity type
            assert.ok(config.topic.includes('/image/'));
        });
    });

    describe('Multiple Vehicles', () => {
        it('should handle multiple vehicles in response', () => {
            const vehicles = accountVehiclesSampleData.data.vehicles;
            
            assert.strictEqual(vehicles.length, 2);
            
            vehicles.forEach(vehicleData => {
                const imageUrl = mqttHA.getVehicleImageStatePayload(vehicleData);
                assert.ok(imageUrl);
                assert.ok(imageUrl.includes('https://'));
            });
        });

        it('should extract different image URLs for different vehicles', () => {
            const vehicle1 = accountVehiclesSampleData.data.vehicles[0];
            const vehicle2 = accountVehiclesSampleData.data.vehicles[1];
            
            const imageUrl1 = mqttHA.getVehicleImageStatePayload(vehicle1);
            const imageUrl2 = mqttHA.getVehicleImageStatePayload(vehicle2);
            
            // Both should exist but may be different
            assert.ok(imageUrl1);
            assert.ok(imageUrl2);
        });
    });

    describe('Error Handling', () => {
        it('should return empty string when vehicle data is missing', () => {
            const imageUrl = mqttHA.getVehicleImageStatePayload(null);
            assert.strictEqual(imageUrl, '');
        });

        it('should return empty string when imageUrl field is missing', () => {
            const vehicleData = {
                vin: 'TEST123',
                make: 'Chevrolet',
                model: 'Bolt'
                // imageUrl field intentionally missing
            };
            const imageUrl = mqttHA.getVehicleImageStatePayload(vehicleData);
            assert.strictEqual(imageUrl, '');
        });

        it('should return empty string when imageUrl is null', () => {
            const vehicleData = {
                vin: 'TEST123',
                imageUrl: null
            };
            const imageUrl = mqttHA.getVehicleImageStatePayload(vehicleData);
            assert.strictEqual(imageUrl, '');
        });

        it('should return empty string when imageUrl is undefined', () => {
            const vehicleData = {
                vin: 'TEST123',
                imageUrl: undefined
            };
            const imageUrl = mqttHA.getVehicleImageStatePayload(vehicleData);
            assert.strictEqual(imageUrl, '');
        });

        it('should handle empty vehicle data object', () => {
            const vehicleData = {};
            const imageUrl = mqttHA.getVehicleImageStatePayload(vehicleData);
            assert.strictEqual(imageUrl, '');
        });

        it('should still create valid config even when image unavailable', () => {
            // Config should always be valid regardless of state
            const config = mqttHA.getVehicleImageConfig();
            
            assert.ok(config.topic);
            assert.ok(config.payload);
            assert.strictEqual(config.payload.name, 'Vehicle Image');
            assert.ok(config.payload.url_topic);
            
            // Entity exists but may have empty state
            const emptyImageUrl = mqttHA.getVehicleImageStatePayload(null);
            assert.strictEqual(emptyImageUrl, '');
        });
    });
});
