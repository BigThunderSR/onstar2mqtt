const assert = require('assert');
const Commands = require('../src/commands');

describe('Commands', () => {
    let commands;

    beforeEach(() => {
        // Create a mock onstar object
        const onstarMock = {
            getAccountVehicles: () => Promise.resolve(),
            start: () => Promise.resolve(),
            cancelStart: () => Promise.resolve(),
            alert: () => Promise.resolve(),
            cancelAlert: () => Promise.resolve(),
            lockDoor: () => Promise.resolve(),
            unlockDoor: () => Promise.resolve(),
            lockTrunk: () => Promise.resolve(),
            unlockTrunk: () => Promise.resolve(),
            chargeOverride: () => Promise.resolve(),
            cancelChargeOverride: () => Promise.resolve(),
            getChargingProfile: () => Promise.resolve(),
            setChargingProfile: () => Promise.resolve(),
            location: () => Promise.resolve(),
            diagnostics: () => Promise.resolve(),
            enginerpm: () => Promise.resolve(),
        };

        commands = new Commands(onstarMock);
    });

    it('should return an array of function names', () => {
        const functionNames = Commands.getFunctionNames();
        assert(Array.isArray(functionNames));
        assert(functionNames.length > 0);
        functionNames.forEach(name => {
            assert(typeof commands[name] === 'function');
        });
    });

    it('should call getAccountVehicles method', async () => {
        const result = await commands.getAccountVehicles();
        assert.strictEqual(result, undefined);
    });

    it('should call startVehicle method', async () => {
        const result = await commands.startVehicle();
        assert.strictEqual(result, undefined);
    });

    it('should call cancelStartVehicle method', async () => {
        const result = await commands.cancelStartVehicle();
        assert.strictEqual(result, undefined);
    });

    it('should call alert method', async () => {
        const result = await commands.alert({});
        assert.strictEqual(result, undefined);
    });

    it('should call alertFlash method', async () => {
        const result = await commands.alertFlash({});
        assert.strictEqual(result, undefined);
    });

    it('should call alertHonk method', async () => {
        const result = await commands.alertHonk({});
        assert.strictEqual(result, undefined);
    });

    it('should call cancelAlert method', async () => {
        const result = await commands.cancelAlert();
        assert.strictEqual(result, undefined);
    });

    it('should call lockDoor method', async () => {
        const result = await commands.lockDoor({});
        assert.strictEqual(result, undefined);
    });

    it('should call unlockDoor method', async () => {
        const result = await commands.unlockDoor({});
        assert.strictEqual(result, undefined);
    });

    it('should call lockTrunk method', async () => {
        const result = await commands.lockTrunk({});
        assert.strictEqual(result, undefined);
    });

    it('should call unlockTrunk method', async () => {
        const result = await commands.unlockTrunk({});
        assert.strictEqual(result, undefined);
    });

    it('should call chargeOverride method', async () => {
        const result = await commands.chargeOverride({});
        assert.strictEqual(result, undefined);
    });

    it('should call cancelChargeOverride method', async () => {
        const result = await commands.cancelChargeOverride({});
        assert.strictEqual(result, undefined);
    });

    it('should call getChargingProfile method', async () => {
        const result = await commands.getChargingProfile();
        assert.strictEqual(result, undefined);
    });

    it('should call setChargingProfile method', async () => {
        const result = await commands.setChargingProfile({});
        assert.strictEqual(result, undefined);
    });

    it('should call getLocation method', async () => {
        const result = await commands.getLocation();
        assert.strictEqual(result, undefined);
    });

    it('should call diagnostics method', async () => {
        const result = await commands.diagnostics({});
        assert.strictEqual(result, undefined);
    });

    // it('should call enginerpm method', async () => {
    //     const result = await commands.enginerpm({});
    //     assert.strictEqual(result, undefined);
    // });
});