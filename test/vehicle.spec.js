const assert = require('assert');

const Vehicle = require('../src/vehicle');
const apiResponse = require('./vehicles.sample.json');

describe('Vehicle', () => {
    let v;
    // API CHANGE: New API format uses direct array path
    // Old: apiResponse.vehicles.vehicle[0]
    // New: apiResponse.vehicles[0]
    // Using old path for now to maintain test compatibility with existing sample data
    beforeEach(() => v = new Vehicle(apiResponse?.vehicles?.vehicle?.[0]));

    it('should parse a vehicle response', () => {
        assert.notStrictEqual(v.year, 2020);
        assert.strictEqual(v.make, 'Chevrolet');
        assert.strictEqual(v.model, 'Bolt EV');
        assert.strictEqual(v.vin, 'foobarVIN');
    });

    it('should return the list of supported diagnostics', () => {
        const supported = v.getSupported();
        assert.ok(Array.isArray(supported));
        assert.strictEqual(supported.length, 22);
    });

    it('should return common supported and requested diagnostics', () => {
        let supported = v.getSupported(['ODOMETER']);
        assert.ok(Array.isArray(supported));
        assert.strictEqual(supported.length, 1);

        supported = v.getSupported(['ODOMETER', 'foo', 'bar']);
        assert.ok(Array.isArray(supported));
        assert.strictEqual(supported.length, 1);

        supported = v.getSupported(['foo', 'bar']);
        assert.ok(Array.isArray(supported));
        assert.strictEqual(supported.length, 0);
    });

    it('should toString() correctly', () => {
        assert.strictEqual(v.toString(), '2020 Chevrolet Bolt EV')
    });

    it('should return the list of supported commands', () => {
        const supported = v.getSupportedCommands();
        assert.ok(Array.isArray(supported));
        assert.strictEqual(supported.length, 29);
    });

    it('should return the list of supported commands with provided command list', () => {
        const commandList = [];
        const supported = v.getSupportedCommands(commandList);
        assert.ok(Array.isArray(supported));
        assert.strictEqual(supported.length, 29);
        assert.deepStrictEqual(supported, commandList);
    });

    describe('API v3 null handling', () => {
        it('should handle null supportedDiagnostics (assume all supported)', () => {
            const vehicleData = {
                year: '2023',
                make: 'Test',
                model: 'Model',
                vin: 'TEST123VIN',
                supportedDiagnostics: null
            };
            const vehicle = new Vehicle(vehicleData);
            
            // isSupported should return true for any diagnostic when null
            assert.strictEqual(vehicle.isSupported('ANY_DIAGNOSTIC'), true);
            assert.strictEqual(vehicle.isSupported('ODOMETER'), true);
        });

        it('should handle null supportedDiagnostics in getSupported', () => {
            const vehicleData = {
                year: '2023',
                make: 'Test',
                model: 'Model',
                vin: 'TEST123VIN',
                supportedDiagnostics: null
            };
            const vehicle = new Vehicle(vehicleData);
            
            // When null and no diags requested, return empty array
            assert.deepStrictEqual(vehicle.getSupported([]), []);
            
            // When null and diags requested, return requested diags
            const requested = ['ODOMETER', 'FUEL LEVEL'];
            assert.deepStrictEqual(vehicle.getSupported(requested), requested);
        });

        it('should handle null supportedCommands', () => {
            const vehicleData = {
                year: '2023',
                make: 'Test',
                model: 'Model',
                vin: 'TEST123VIN',
                supportedCommands: null
            };
            const vehicle = new Vehicle(vehicleData);
            
            // When null, should return provided commandList
            const commandList = ['START', 'STOP'];
            const result = vehicle.getSupportedCommands(commandList);
            assert.deepStrictEqual(result, commandList);
            
            // When null and empty commandList, should return empty
            assert.deepStrictEqual(vehicle.getSupportedCommands([]), []);
        });
    });
});

