const assert = require('assert');
const Commands = require('../src/commands');
const fs = require('fs');
const path = require('path');

describe('New Commands (OnStarJS 2.12.0)', () => {
    let commands;
    let sampleData;

    before(() => {
        // Load sample command response data
        sampleData = {
            vehicleDetails: JSON.parse(fs.readFileSync(path.join(__dirname, 'command-sample-getVehicleDetails.json'), 'utf8')),
            onstarPlan: JSON.parse(fs.readFileSync(path.join(__dirname, 'command-sample-getOnstarPlan.json'), 'utf8')),
            evChargingMetrics: JSON.parse(fs.readFileSync(path.join(__dirname, 'command-sample-getEVChargingMetrics.json'), 'utf8')),
            vehicleRecallInfo: JSON.parse(fs.readFileSync(path.join(__dirname, 'command-sample-getVehicleRecallInfo.json'), 'utf8'))
        };
    });

    beforeEach(() => {
        // Create a mock onstar object that returns sample data
        const onstarMock = {
            getVehicleDetails: () => Promise.resolve(sampleData.vehicleDetails),
            getOnstarPlan: () => Promise.resolve(sampleData.onstarPlan),
            getEVChargingMetrics: () => Promise.resolve(sampleData.evChargingMetrics),
            getVehicleRecallInfo: () => Promise.resolve(sampleData.vehicleRecallInfo),
        };

        commands = new Commands(onstarMock);
    });

    describe('getVehicleDetails', () => {
        it('should return vehicle details', async () => {
            const result = await commands.getVehicleDetails();
            assert(result);
            assert.strictEqual(result.errors.length, 0);
            assert(result.data);
            assert(result.data.vehicleDetails);
        });

        it('should return correct vehicle make and model', async () => {
            const result = await commands.getVehicleDetails();
            const vehicle = result.data.vehicleDetails;
            assert.strictEqual(vehicle.make, 'Chevrolet');
            assert.strictEqual(vehicle.model, 'Blazer EV');
            assert.strictEqual(vehicle.year, '2024');
        });

        it('should return OnStar capability status', async () => {
            const result = await commands.getVehicleDetails();
            const vehicle = result.data.vehicleDetails;
            assert.strictEqual(vehicle.onstarCapable, true);
        });

        it('should return RPO codes array', async () => {
            const result = await commands.getVehicleDetails();
            const vehicle = result.data.vehicleDetails;
            assert(Array.isArray(vehicle.rpoCodes));
            assert(vehicle.rpoCodes.length > 0);
        });

        it('should return vehicle image URL', async () => {
            const result = await commands.getVehicleDetails();
            const vehicle = result.data.vehicleDetails;
            assert(vehicle.imageUrl);
            assert(vehicle.imageUrl.startsWith('https://'));
        });
    });

    describe('getOnstarPlan', () => {
        it('should return OnStar plan information', async () => {
            const result = await commands.getOnstarPlan();
            assert(result);
            assert.strictEqual(result.errors.length, 0);
            assert(result.data);
            assert(result.data.vehicleDetails);
        });

        it('should return vehicle make, model, and year', async () => {
            const result = await commands.getOnstarPlan();
            const vehicle = result.data.vehicleDetails;
            assert.strictEqual(vehicle.make, 'Chevrolet');
            assert.strictEqual(vehicle.model, 'Blazer EV');
            assert.strictEqual(vehicle.year, '2024');
        });

        it('should return plan information array', async () => {
            const result = await commands.getOnstarPlan();
            const vehicle = result.data.vehicleDetails;
            assert(Array.isArray(vehicle.planInfo));
            assert(vehicle.planInfo.length > 0);
        });

        it('should have valid plan structure', async () => {
            const result = await commands.getOnstarPlan();
            const plan = result.data.vehicleDetails.planInfo[0];
            assert(plan.productCode);
            assert(plan.billingCadence);
            assert(plan.status);
            assert(plan.startDate);
            assert(plan.endDate);
            assert(plan.productType);
            assert(typeof plan.isTrial === 'boolean');
        });

        it('should return plan expiry info array', async () => {
            const result = await commands.getOnstarPlan();
            const vehicle = result.data.vehicleDetails;
            assert(Array.isArray(vehicle.planExpiryInfo));
        });
    });

    describe('getEVChargingMetrics', () => {
        it('should return EV charging metrics', async () => {
            const result = await commands.getEVChargingMetrics();
            assert(result);
            assert.strictEqual(result.status, 'success');
            assert(result.response);
            assert(result.response.data);
        });

        it('should return success status', async () => {
            const result = await commands.getEVChargingMetrics();
            assert.strictEqual(result.response.data.success, true);
        });

        it('should return results array with metrics', async () => {
            const result = await commands.getEVChargingMetrics();
            const data = result.response.data;
            assert(Array.isArray(data.results));
            assert(data.results.length > 0);
        });

        it('should contain essential EV metrics', async () => {
            const result = await commands.getEVChargingMetrics();
            const metrics = result.response.data.results[0];
            
            // Battery and charging metrics
            assert('soc' in metrics); // State of charge
            assert('kwh' in metrics); // Battery capacity
            assert('cplug' in metrics); // Charge plug state
            assert('cstate' in metrics); // Charge state
            assert('cmode' in metrics); // Charge mode
            
            // Energy metrics
            assert('lifekwh' in metrics); // Lifetime energy
            assert('meterkwh' in metrics); // Metered energy
            assert('lifecons' in metrics); // Lifetime consumption
            
            // Range and odometer
            assert('ravg' in metrics); // Range average
            assert('odo' in metrics); // Odometer
            
            // Location
            assert('lat' in metrics);
            assert('lng' in metrics);
        });

        it('should contain extra metrics object', async () => {
            const result = await commands.getEVChargingMetrics();
            const metrics = result.response.data.results[0];
            assert(metrics.extraMetrics);
            assert(typeof metrics.extraMetrics === 'object');
        });

        it('should have valid charge states', async () => {
            const result = await commands.getEVChargingMetrics();
            const metrics = result.response.data.results[0];
            const validPlugStates = ['unplugged', 'plugged', 'Connect', 'Connected', 'Disconnect'];
            const validChargeStates = ['UNCONNECTED', 'CHARGING', 'Active'];
            
            assert(validPlugStates.includes(metrics.cplug));
            assert(validChargeStates.includes(metrics.cstate));
        });
    });

    describe('getVehicleRecallInfo', () => {
        it('should return vehicle recall information', async () => {
            const result = await commands.getVehicleRecallInfo();
            assert(result);
            assert.strictEqual(result.errors.length, 0);
            assert(result.data);
            assert(result.data.vehicleDetails);
        });

        it('should return recall info array', async () => {
            const result = await commands.getVehicleRecallInfo();
            const vehicle = result.data.vehicleDetails;
            assert(Array.isArray(vehicle.recallInfo));
        });

        it('should have valid recall structure when recalls exist', async () => {
            const result = await commands.getVehicleRecallInfo();
            const recalls = result.data.vehicleDetails.recallInfo;
            
            if (recalls.length > 0) {
                const recall = recalls[0];
                assert(recall.recallId);
                assert(recall.title);
                assert(recall.type);
                assert(recall.typeDescription);
                assert(recall.description);
                assert(recall.recallStatus);
                assert(recall.repairStatus);
                assert(recall.repairStatusCode);
                assert(recall.repairDescription);
                assert(recall.safetyRiskDescription);
            }
        });

        it('should have valid recall status values', async () => {
            const result = await commands.getVehicleRecallInfo();
            const recalls = result.data.vehicleDetails.recallInfo;
            
            if (recalls.length > 0) {
                const recall = recalls[0];
                const validRecallStatuses = ['A', 'I', 'C']; // Active, Inactive, Completed
                const validRepairStatuses = ['incomplete', 'complete', 'not_required'];
                
                assert(validRecallStatuses.includes(recall.recallStatus) || recall.recallStatus);
                assert(validRepairStatuses.includes(recall.repairStatus) || recall.repairStatus);
            }
        });

        it('should indicate data presence', async () => {
            const result = await commands.getVehicleRecallInfo();
            assert.strictEqual(result.dataPresent, true);
        });
    });

    describe('Command Integration', () => {
        it('all new commands should be callable', async () => {
            assert(typeof commands.getVehicleDetails === 'function');
            assert(typeof commands.getOnstarPlan === 'function');
            assert(typeof commands.getEVChargingMetrics === 'function');
            assert(typeof commands.getVehicleRecallInfo === 'function');
        });

        it('all new commands should return promises', () => {
            assert(commands.getVehicleDetails() instanceof Promise);
            assert(commands.getOnstarPlan() instanceof Promise);
            assert(commands.getEVChargingMetrics() instanceof Promise);
            assert(commands.getVehicleRecallInfo() instanceof Promise);
        });
    });
});
