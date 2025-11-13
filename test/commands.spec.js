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
            flashLights: () => Promise.resolve(),
            stopLights: () => Promise.resolve(),
            lockDoor: () => Promise.resolve(),
            unlockDoor: () => Promise.resolve(),
            lockTrunk: () => Promise.resolve(),
            unlockTrunk: () => Promise.resolve(),
            setChargeLevelTarget: () => Promise.resolve(),
            stopCharging: () => Promise.resolve(),
            chargeOverride: () => Promise.resolve(),
            cancelChargeOverride: () => Promise.resolve(),
            getChargingProfile: () => Promise.resolve(),
            setChargingProfile: () => Promise.resolve(),
            location: () => Promise.resolve(),
            diagnostics: () => Promise.resolve(),
            enginerpm: () => Promise.resolve(),
            getVehicleDetails: () => Promise.resolve(),
            getOnstarPlan: () => Promise.resolve(),
            getEVChargingMetrics: () => Promise.resolve(),
            refreshEVChargingMetrics: () => Promise.resolve(),
            getVehicleRecallInfo: () => Promise.resolve(),
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

    it('should call flashLights method', async () => {
        const result = await commands.flashLights({});
        assert.strictEqual(result, undefined);
    });

    it('should call stopLights method', async () => {
        const result = await commands.stopLights();
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

    it('should call setChargeLevelTarget method', async () => {
        const result = await commands.setChargeLevelTarget(80, {});
        assert.strictEqual(result, undefined);
    });

    it('should call stopCharging method', async () => {
        const result = await commands.stopCharging({});
        assert.strictEqual(result, undefined);
    });

    it('should call chargeOverride method (deprecated)', async () => {
        const result = await commands.chargeOverride({});
        assert.strictEqual(result, undefined);
    });

    it('should call cancelChargeOverride method (deprecated)', async () => {
        const result = await commands.cancelChargeOverride({});
        assert.strictEqual(result, undefined);
    });

    it('should call getChargingProfile method (deprecated)', async () => {
        const result = await commands.getChargingProfile();
        assert.strictEqual(result, undefined);
    });

    it('should call setChargingProfile method (deprecated)', async () => {
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

    it('should call getVehicleDetails method', async () => {
        const result = await commands.getVehicleDetails();
        assert.strictEqual(result, undefined);
    });

    it('should call getOnstarPlan method', async () => {
        const result = await commands.getOnstarPlan();
        assert.strictEqual(result, undefined);
    });

    it('should call getEVChargingMetrics method', async () => {
        const result = await commands.getEVChargingMetrics();
        assert.strictEqual(result, undefined);
    });

    it('should call refreshEVChargingMetrics method', async () => {
        const result = await commands.refreshEVChargingMetrics();
        assert.strictEqual(result, undefined);
    });

    it('should call getVehicleRecallInfo method', async () => {
        const result = await commands.getVehicleRecallInfo();
        assert.strictEqual(result, undefined);
    });
});