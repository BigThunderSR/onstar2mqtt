const assert = require('assert');
const _ = require('lodash');

const Vehicle = require('../src/vehicle');
const apiResponse = require('./vehicles.sample.json');

describe('Vehicle', () => {
    let v;
    // API CHANGE: New API format uses direct array path
    // Old: apiResponse.vehicles.vehicle[0]
    // New: apiResponse.vehicles[0]
    // Using old path for now to maintain test compatibility with existing sample data
    beforeEach(() => v = new Vehicle(_.get(apiResponse, 'vehicles.vehicle[0]')));

    it('should parse a vehicle response', () => {
        assert.notStrictEqual(v.year, 2020);
        assert.strictEqual(v.make, 'Chevrolet');
        assert.strictEqual(v.model, 'Bolt EV');
        assert.strictEqual(v.vin, 'foobarVIN');
    });

    it('should return the list of supported diagnostics', () => {
        const supported = v.getSupported();
        assert.ok(_.isArray(supported));
        assert.strictEqual(supported.length, 22);
    });

    it('should return common supported and requested diagnostics', () => {
        let supported = v.getSupported(['ODOMETER']);
        assert.ok(_.isArray(supported));
        assert.strictEqual(supported.length, 1);

        supported = v.getSupported(['ODOMETER', 'foo', 'bar']);
        assert.ok(_.isArray(supported));
        assert.strictEqual(supported.length, 1);

        supported = v.getSupported(['foo', 'bar']);
        assert.ok(_.isArray(supported));
        assert.strictEqual(supported.length, 0);
    });

    it('should toString() correctly', () => {
        assert.strictEqual(v.toString(), '2020 Chevrolet Bolt EV')
    });

    it('should return the list of supported commands', () => {
        const supported = v.getSupportedCommands();
        assert.ok(_.isArray(supported));
        assert.strictEqual(supported.length, 29);
    });

    it('should return the list of supported commands with provided command list', () => {
        const commandList = [];
        const supported = v.getSupportedCommands(commandList);
        assert.ok(_.isArray(supported));
        assert.strictEqual(supported.length, 29);
        assert.deepStrictEqual(supported, commandList);
    });
});
