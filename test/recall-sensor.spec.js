const assert = require('assert');
const MQTT = require('../src/mqtt');
const Vehicle = require('../src/vehicle');

const recallSampleData = require('./command-sample-getVehicleRecallInfo.json');

describe('Vehicle Recall Sensor', () => {
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

    describe('getVehicleRecallConfig', () => {
        it('should create recall sensor config with correct topic', () => {
            const config = mqttHA.getVehicleRecallConfig();
            
            assert.strictEqual(config.topic, 'homeassistant/sensor/TEST1234567890123/vehicle_recalls/config');
            assert.ok(config.payload);
        });

        it('should create recall sensor config with correct payload structure', () => {
            const config = mqttHA.getVehicleRecallConfig();
            const payload = config.payload;
            
            assert.strictEqual(payload.name, 'Vehicle Recalls');
            assert.strictEqual(payload.unique_id, 'TEST1234567890123_vehicle_recalls');
            assert.strictEqual(payload.icon, 'mdi:alert-octagon');
            assert.strictEqual(payload.state_topic, 'homeassistant/sensor/TEST1234567890123/vehicle_recalls/state');
        });

        it('should include device information', () => {
            const config = mqttHA.getVehicleRecallConfig();
            const payload = config.payload;
            
            assert.ok(payload.device);
            assert.strictEqual(payload.device.manufacturer, 'Chevrolet');
            assert.strictEqual(payload.device.model, '2024 Blazer EV');
            assert.deepStrictEqual(payload.device.identifiers, ['TEST1234567890123']);
        });

        it('should include availability configuration', () => {
            const config = mqttHA.getVehicleRecallConfig();
            const payload = config.payload;
            
            assert.ok(payload.availability);
            assert.strictEqual(payload.availability.payload_available, 'true');
            assert.strictEqual(payload.availability.payload_not_available, 'false');
        });

        it('should include json_attributes configuration', () => {
            const config = mqttHA.getVehicleRecallConfig();
            const payload = config.payload;
            
            assert.ok(payload.json_attributes_topic);
            assert.ok(payload.json_attributes_template);
            assert.strictEqual(payload.json_attributes_template, '{{ value_json.attributes | tojson }}');
        });

        it('should use unrepaired_active_recall_count as main sensor value', () => {
            const config = mqttHA.getVehicleRecallConfig();
            const payload = config.payload;
            
            assert.strictEqual(payload.value_template, '{{ value_json.unrepaired_active_recall_count }}');
        });
    });

    describe('getVehicleRecallStatePayload', () => {
        it('should parse recall data correctly', () => {
            const state = mqttHA.getVehicleRecallStatePayload(recallSampleData);
            
            assert.strictEqual(state.recall_count, 1);
            assert.strictEqual(state.active_recalls_count, 1);
            assert.strictEqual(state.incomplete_repairs_count, 1);
            assert.strictEqual(state.unrepaired_active_recall_count, 1);
        });

        it('should include attributes object', () => {
            const state = mqttHA.getVehicleRecallStatePayload(recallSampleData);
            
            assert.ok(state.attributes);
            assert.strictEqual(state.attributes.has_active_recalls, true);
            assert.strictEqual(state.attributes.has_unrepaired_active_recalls, true);
            assert.ok(state.attributes.last_updated);
            assert.ok(Array.isArray(state.attributes.recalls));
        });

        it('should include all recall details in attributes', () => {
            const state = mqttHA.getVehicleRecallStatePayload(recallSampleData);
            const recall = state.attributes.recalls[0];
            
            assert.strictEqual(recall.recall_id, 'N252503010');
            assert.strictEqual(recall.title, 'Unintended Parking Brake Engagement');
            assert.strictEqual(recall.type, 'Product Safety Recall');
            assert.ok(recall.description);
            assert.strictEqual(recall.recall_status, 'A');
            assert.strictEqual(recall.repair_status, 'incomplete');
            assert.ok(recall.repair_description);
            assert.ok(recall.safety_risk);
        });

        it('should handle empty recall data', () => {
            const emptyData = {
                data: {
                    vehicleDetails: {
                        recallInfo: []
                    }
                }
            };
            
            const state = mqttHA.getVehicleRecallStatePayload(emptyData);
            
            assert.strictEqual(state.recall_count, 0);
            assert.strictEqual(state.active_recalls_count, 0);
            assert.strictEqual(state.incomplete_repairs_count, 0);
            assert.strictEqual(state.unrepaired_active_recall_count, 0);
            assert.strictEqual(state.attributes.has_active_recalls, false);
            assert.strictEqual(state.attributes.has_unrepaired_active_recalls, false);
            assert.strictEqual(state.attributes.recalls.length, 0);
        });

        it('should handle missing recall data gracefully', () => {
            const invalidData = { data: {} };
            
            const state = mqttHA.getVehicleRecallStatePayload(invalidData);
            
            assert.strictEqual(state.recall_count, 0);
            assert.strictEqual(state.active_recalls_count, 0);
            assert.strictEqual(state.incomplete_repairs_count, 0);
            assert.strictEqual(state.unrepaired_active_recall_count, 0);
        });

        it('should filter active recalls correctly', () => {
            const multiRecallData = {
                data: {
                    vehicleDetails: {
                        recallInfo: [
                            {
                                recallId: 'R001',
                                title: 'Active Recall',
                                typeDescription: 'Safety',
                                recallStatus: 'A',
                                repairStatus: 'incomplete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: null
                            },
                            {
                                recallId: 'R002',
                                title: 'Inactive Recall',
                                typeDescription: 'Safety',
                                recallStatus: 'I',
                                repairStatus: 'complete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: '2024-01-01'
                            }
                        ]
                    }
                }
            };
            
            const state = mqttHA.getVehicleRecallStatePayload(multiRecallData);
            
            assert.strictEqual(state.recall_count, 2);
            assert.strictEqual(state.active_recalls_count, 1);
        });

        it('should count incomplete repairs correctly', () => {
            const multiRecallData = {
                data: {
                    vehicleDetails: {
                        recallInfo: [
                            {
                                recallId: 'R001',
                                title: 'Incomplete Repair',
                                typeDescription: 'Safety',
                                recallStatus: 'A',
                                repairStatus: 'incomplete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: null
                            },
                            {
                                recallId: 'R002',
                                title: 'Complete Repair',
                                typeDescription: 'Safety',
                                recallStatus: 'A',
                                repairStatus: 'complete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: '2024-01-01'
                            }
                        ]
                    }
                }
            };
            
            const state = mqttHA.getVehicleRecallStatePayload(multiRecallData);
            
            assert.strictEqual(state.recall_count, 2);
            assert.strictEqual(state.incomplete_repairs_count, 1);
        });

        it('should include timestamp in attributes', () => {
            const state = mqttHA.getVehicleRecallStatePayload(recallSampleData);
            
            assert.ok(state.attributes.last_updated);
            const timestamp = new Date(state.attributes.last_updated);
            assert.ok(timestamp instanceof Date);
            assert.ok(!isNaN(timestamp.getTime()));
        });

        it('should count unrepaired active recalls correctly', () => {
            const multiRecallData = {
                data: {
                    vehicleDetails: {
                        recallInfo: [
                            {
                                recallId: 'R001',
                                title: 'Active and Unrepaired',
                                typeDescription: 'Safety',
                                recallStatus: 'A',
                                repairStatus: 'incomplete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: null
                            },
                            {
                                recallId: 'R002',
                                title: 'Active but Repaired',
                                typeDescription: 'Safety',
                                recallStatus: 'A',
                                repairStatus: 'complete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: '2024-01-01'
                            },
                            {
                                recallId: 'R003',
                                title: 'Inactive and Unrepaired',
                                typeDescription: 'Safety',
                                recallStatus: 'I',
                                repairStatus: 'incomplete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: null
                            }
                        ]
                    }
                }
            };
            
            const state = mqttHA.getVehicleRecallStatePayload(multiRecallData);
            
            // Total recalls: 3
            assert.strictEqual(state.recall_count, 3);
            // Active recalls: R001 (A + incomplete), R002 (A + complete) = 2
            assert.strictEqual(state.active_recalls_count, 2);
            // Incomplete repairs: R001 (A + incomplete), R003 (I + incomplete) = 2
            assert.strictEqual(state.incomplete_repairs_count, 2);
            // Unrepaired AND active: only R001 (A + incomplete) = 1
            assert.strictEqual(state.unrepaired_active_recall_count, 1);
            assert.strictEqual(state.attributes.has_unrepaired_active_recalls, true);
        });

        it('should include expired unrepaired recalls in count', () => {
            const multiRecallData = {
                data: {
                    vehicleDetails: {
                        recallInfo: [
                            {
                                recallId: 'R001',
                                title: 'Active and Unrepaired',
                                typeDescription: 'Safety',
                                recallStatus: 'A',
                                repairStatus: 'incomplete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: null
                            },
                            {
                                recallId: 'R002',
                                title: 'Expired and Unrepaired',
                                typeDescription: 'Safety',
                                recallStatus: 'E',
                                repairStatus: 'incomplete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: null
                            },
                            {
                                recallId: 'R003',
                                title: 'Expired but Repaired',
                                typeDescription: 'Safety',
                                recallStatus: 'E',
                                repairStatus: 'complete',
                                description: 'Test',
                                repairDescription: 'Test',
                                safetyRiskDescription: 'Test',
                                completedDate: '2024-01-01'
                            }
                        ]
                    }
                }
            };
            
            const state = mqttHA.getVehicleRecallStatePayload(multiRecallData);
            
            // Total recalls: 3
            assert.strictEqual(state.recall_count, 3);
            // Active recalls: only R001 (status A) = 1
            assert.strictEqual(state.active_recalls_count, 1);
            // Incomplete repairs: R001 (A + incomplete), R002 (E + incomplete) = 2
            assert.strictEqual(state.incomplete_repairs_count, 2);
            // Unrepaired AND (active OR expired): R001 (A + incomplete), R002 (E + incomplete) = 2
            assert.strictEqual(state.unrepaired_active_recall_count, 2);
            assert.strictEqual(state.attributes.has_unrepaired_active_recalls, true);
        });
    });

    describe('Recall Sensor Integration', () => {
        it('should create both config and state for complete integration', () => {
            const config = mqttHA.getVehicleRecallConfig();
            const state = mqttHA.getVehicleRecallStatePayload(recallSampleData);
            
            assert.ok(config.topic);
            assert.ok(config.payload);
            assert.ok(state.recall_count !== undefined);
            assert.ok(state.attributes);
        });

        it('should use consistent topic names', () => {
            const config = mqttHA.getVehicleRecallConfig();
            
            assert.ok(config.topic.includes('vehicle_recalls/config'));
            assert.ok(config.payload.state_topic.includes('vehicle_recalls/state'));
            assert.ok(config.payload.json_attributes_topic.includes('vehicle_recalls/state'));
        });
    });
});
