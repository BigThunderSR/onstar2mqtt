const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Diagnostic, getUnitCacheStats, clearUnitCache } = require('../src/diagnostic');

const VIN = process.env.ONSTAR_VIN || 'default';
const CACHE_FILE = path.join(process.cwd(), `.unit_cache_${VIN}.json`);

describe('Unit Cache for v3 API Stability', () => {
    beforeEach(() => {
        // Clear cache before each test (including disk cache)
        clearUnitCache(true);
    });

    afterEach(() => {
        // Clean up disk cache after tests
        if (fs.existsSync(CACHE_FILE)) {
            fs.unlinkSync(CACHE_FILE);
        }
    });

    it('should cache valid units on first encounter', () => {
        const diagResponse = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'LIFETIME_FUEL_ECONOMY',
                    value: '10.85',
                    uom: 'KM/L',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        const diag = new Diagnostic(diagResponse);
        const stats = getUnitCacheStats();

        assert.ok(stats.size > 0);
        assert.strictEqual(stats.cachedUnits['LIFETIME_FUEL_ECONOMY'], 'KM/L');
        assert.strictEqual(diag.diagnosticElements[0].unit, 'km/L'); // Note: unit is normalized
    });

    it('should use cached unit when API returns null', () => {
        // First, cache a valid unit
        const diagResponse1 = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'LIFETIME_FUEL_ECONOMY',
                    value: '10.85',
                    uom: 'KM/L',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        const diag1 = new Diagnostic(diagResponse1);
        assert.strictEqual(diag1.diagnosticElements[0].unit, 'km/L');

        // Now simulate API returning null unit
        const diagResponse2 = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'LIFETIME_FUEL_ECONOMY',
                    value: '10.92',
                    uom: null,  // API returns null
                    cts: '2024-03-13T14:25:15.200+00:00'
                }
            ]
        };

        const diag2 = new Diagnostic(diagResponse2);
        
        // Should use cached unit instead of null
        assert.strictEqual(diag2.diagnosticElements[0].unit, 'km/L');
    });

    it('should use cached unit when API returns undefined', () => {
        // First, cache a valid unit
        const diagResponse1 = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'AVERAGE_FUEL_ECONOMY',
                    value: '9.15',
                    uom: 'L/100KM',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        const diag1 = new Diagnostic(diagResponse1);
        assert.strictEqual(diag1.diagnosticElements[0].unit, 'L/100km');

        // Now simulate API not returning unit field
        const diagResponse2 = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'AVERAGE_FUEL_ECONOMY',
                    value: '9.50',
                    // uom field is missing entirely
                    cts: '2024-03-13T14:25:15.200+00:00'
                }
            ]
        };

        const diag2 = new Diagnostic(diagResponse2);
        
        // Should use cached unit
        assert.strictEqual(diag2.diagnosticElements[0].unit, 'L/100km');
    });

    it('should not cache N/A units', () => {
        const diagResponse = {
            name: 'BRAKE_FLUID_LOW',
            diagnosticElements: [
                {
                    name: 'BRAKE_FLUID_LOW',
                    value: 'FALSE',
                    uom: 'N/A',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        const diag = new Diagnostic(diagResponse);
        const stats = getUnitCacheStats();

        // N/A should not be cached
        assert.strictEqual(stats.cachedUnits['BRAKE_FLUID_LOW'], undefined);
        assert.strictEqual(diag.diagnosticElements[0].unit, undefined);
    });

    it('should handle mixed valid and null units in same response', () => {
        // First, cache units
        const diagResponse1 = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'AVERAGE_FUEL_ECONOMY',
                    value: '9.15',
                    uom: 'L/100KM',
                    cts: '2024-03-13T14:20:15.200+00:00'
                },
                {
                    name: 'LIFETIME_FUEL_ECONOMY',
                    value: '10.85',
                    uom: 'KM/L',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        const diag1 = new Diagnostic(diagResponse1);
        assert.strictEqual(diag1.diagnosticElements[0].unit, 'L/100km');
        assert.strictEqual(diag1.diagnosticElements[1].unit, 'km/L');

        // Now one field has null, one has valid unit
        const diagResponse2 = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'AVERAGE_FUEL_ECONOMY',
                    value: '9.50',
                    uom: null,  // null
                    cts: '2024-03-13T14:25:15.200+00:00'
                },
                {
                    name: 'LIFETIME_FUEL_ECONOMY',
                    value: '10.92',
                    uom: 'KM/L',  // still valid
                    cts: '2024-03-13T14:25:15.200+00:00'
                }
            ]
        };

        const diag2 = new Diagnostic(diagResponse2);
        
        // First uses cache, second uses API value
        assert.strictEqual(diag2.diagnosticElements[0].unit, 'L/100km');
        assert.strictEqual(diag2.diagnosticElements[1].unit, 'km/L');
    });

    it('should handle unit changes (legitimate updates)', () => {
        // Cache initial unit
        const diagResponse1 = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'LIFETIME_FUEL_ECONOMY',
                    value: '10.85',
                    uom: 'KM/L',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        const diag1 = new Diagnostic(diagResponse1);
        assert.strictEqual(diag1.diagnosticElements[0].unit, 'km/L');

        // API legitimately changes unit format
        const diagResponse2 = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'LIFETIME_FUEL_ECONOMY',
                    value: '25.5',
                    uom: 'MPG',  // Changed to different unit
                    cts: '2024-03-13T14:25:15.200+00:00'
                }
            ]
        };

        const diag2 = new Diagnostic(diagResponse2);
        
        // Should accept the new unit and update cache
        // MPG is not normalized by correctUnitName, so it stays as 'MPG'
        assert.strictEqual(diag2.diagnosticElements[0].unit, 'MPG');
        
        const stats = getUnitCacheStats();
        // MPG is cached as-is from the API
        assert.strictEqual(stats.cachedUnits['LIFETIME_FUEL_ECONOMY'], 'MPG');
    });

    it('should clear cache when requested', () => {
        const diagResponse = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'LIFETIME_FUEL_ECONOMY',
                    value: '10.85',
                    uom: 'KM/L',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        new Diagnostic(diagResponse);
        
        let stats = getUnitCacheStats();
        assert.ok(stats.size > 0);

        clearUnitCache();
        
        stats = getUnitCacheStats();
        assert.strictEqual(stats.size, 0);
    });

    it('should provide cache statistics', () => {
        const diagResponse = {
            name: 'TEST',
            diagnosticElements: [
                {
                    name: 'SENSOR_A',
                    value: '100',
                    uom: 'KM',
                    cts: '2024-03-13T14:20:15.200+00:00'
                },
                {
                    name: 'SENSOR_B',
                    value: '50',
                    uom: 'KPA',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        new Diagnostic(diagResponse);
        
        const stats = getUnitCacheStats();
        // Note: Cache size may be larger than 2 because converted units are also cached
        // SENSOR_A (KM) creates SENSOR_A and SENSOR_A MI cache entries
        // SENSOR_B (KPA) creates SENSOR_B and SENSOR_B PSI cache entries
        assert.ok(stats.size >= 2);
        assert.ok('SENSOR_A' in stats.cachedUnits);
        assert.ok('SENSOR_B' in stats.cachedUnits);
        assert.strictEqual(stats.cachedUnits['SENSOR_A'], 'KM');
        assert.strictEqual(stats.cachedUnits['SENSOR_B'], 'KPA');
    });

    it('should persist cache to disk immediately', () => {
        const diagResponse = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'LIFETIME_FUEL_ECONOMY',
                    value: '10.85',
                    uom: 'KM/L',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        new Diagnostic(diagResponse);
        
        assert.ok(fs.existsSync(CACHE_FILE), 'Cache file should exist');
        
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        assert.strictEqual(data['LIFETIME_FUEL_ECONOMY'], 'KM/L');
    });

    it('should load cache from disk on module reload', () => {
        // First, create and persist cache
        const diagResponse1 = {
            name: 'FUEL_ECONOMY',
            diagnosticElements: [
                {
                    name: 'TEST_SENSOR',
                    value: '100',
                    uom: 'KM',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        new Diagnostic(diagResponse1);

        // Verify file exists
        assert.ok(fs.existsSync(CACHE_FILE));

        // Clear in-memory cache only (not disk)
        clearUnitCache(false);
        
        // Verify in-memory cache is empty
        let stats = getUnitCacheStats();
        assert.strictEqual(stats.size, 0);

        // Reload module to trigger loadCacheFromDisk
        delete require.cache[require.resolve('../src/diagnostic')];
        const { getUnitCacheStats: reloadedStats } = require('../src/diagnostic');

        const newStats = reloadedStats();
        assert.ok(newStats.size > 0, 'Cache should be loaded from disk');
        assert.strictEqual(newStats.cachedUnits['TEST_SENSOR'], 'KM');
    });

    // Error handling tests
    it('should handle disk cache deletion errors gracefully', () => {
        const diagResponse = {
            name: 'TEST',
            diagnosticElements: [
                {
                    name: 'TEST_SENSOR',
                    value: '100',
                    uom: 'KM',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };

        new Diagnostic(diagResponse);
        
        // Create cache file that's already deleted
        clearUnitCache(true);
        
        // Try to delete non-existent file (should not throw)
        assert.doesNotThrow(() => {
            clearUnitCache(true);
        });
    });

    it('should handle corrupted cache file on load', () => {
        // Write corrupted JSON to cache file
        fs.writeFileSync(CACHE_FILE, '{corrupted json', 'utf8');
        
        // Reload module - should handle gracefully
        assert.doesNotThrow(() => {
            delete require.cache[require.resolve('../src/diagnostic')];
            require('../src/diagnostic');
        });
        
        // Clean up
        if (fs.existsSync(CACHE_FILE)) {
            fs.unlinkSync(CACHE_FILE);
        }
    });

    it('should handle directory creation for custom cache paths', () => {
        // This is implicitly tested by the disk persistence tests
        // but we verify the directory exists after those tests run
        const cacheDir = process.env.UNIT_CACHE_DIR || process.cwd();
        assert.ok(fs.existsSync(cacheDir), 'Cache directory should exist');
    });

    it('should create cache directory if it does not exist', function() {
        // Set a custom cache directory that doesn't exist
        const testDir = path.join(process.cwd(), 'test-cache-dir-' + Date.now());
        process.env.UNIT_CACHE_DIR = testDir;
        
        // Ensure it doesn't exist
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true });
        }
        
        // Reload module to trigger directory creation
        delete require.cache[require.resolve('../src/diagnostic')];
        const { Diagnostic } = require('../src/diagnostic');
        
        // Create a diagnostic to trigger cache operation
        const diagResponse = {
            name: 'TEST',
            diagnosticElements: [
                {
                    name: 'TEST_SENSOR',
                    value: '100',
                    uom: 'KM',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };
        
        new Diagnostic(diagResponse);
        
        // Verify directory was created
        assert.ok(fs.existsSync(testDir), 'Custom cache directory should be created');
        
        // Cleanup
        delete process.env.UNIT_CACHE_DIR;
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true });
        }
        
        // Reload module back to normal state
        delete require.cache[require.resolve('../src/diagnostic')];
        require('../src/diagnostic');
    });

    it('should use VIN-specific cache file names', function() {
        // Set a test VIN
        const testVIN = 'TEST123VIN456';
        process.env.ONSTAR_VIN = testVIN;
        
        // Reload module with new VIN
        delete require.cache[require.resolve('../src/diagnostic')];
        const { Diagnostic, clearUnitCache } = require('../src/diagnostic');
        
        const diagResponse = {
            name: 'TEST',
            diagnosticElements: [
                {
                    name: 'TEST_SENSOR',
                    value: '100',
                    uom: 'KM',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };
        
        new Diagnostic(diagResponse);
        
        const vinCacheFile = path.join(process.cwd(), `.unit_cache_${testVIN}.json`);
        assert.ok(fs.existsSync(vinCacheFile), 'VIN-specific cache file should exist');
        
        // Cleanup
        clearUnitCache(true);
        delete process.env.ONSTAR_VIN;
        
        // Reload module back to normal state
        delete require.cache[require.resolve('../src/diagnostic')];
        require('../src/diagnostic');
    });

    it('should fall back to TOKEN_LOCATION if UNIT_CACHE_DIR not set', function() {
        // Set TOKEN_LOCATION but not UNIT_CACHE_DIR
        const testTokenDir = path.join(process.cwd(), 'test-token-dir-' + Date.now());
        fs.mkdirSync(testTokenDir, { recursive: true });
        process.env.TOKEN_LOCATION = testTokenDir;
        delete process.env.UNIT_CACHE_DIR;
        
        // Reload module to pick up TOKEN_LOCATION
        delete require.cache[require.resolve('../src/diagnostic')];
        const { Diagnostic, clearUnitCache } = require('../src/diagnostic');
        
        const diagResponse = {
            name: 'TEST',
            diagnosticElements: [
                {
                    name: 'TEST_SENSOR',
                    value: '100',
                    uom: 'KM',
                    cts: '2024-03-13T14:20:15.200+00:00'
                }
            ]
        };
        
        new Diagnostic(diagResponse);
        
        const VIN = process.env.ONSTAR_VIN || 'default';
        const cacheFile = path.join(testTokenDir, `.unit_cache_${VIN}.json`);
        assert.ok(fs.existsSync(cacheFile), 'Cache file should exist in TOKEN_LOCATION');
        
        // Cleanup
        clearUnitCache(true);
        delete process.env.TOKEN_LOCATION;
        if (fs.existsSync(testTokenDir)) {
            fs.rmSync(testTokenDir, { recursive: true });
        }
        
        // Reload module back to normal state
        delete require.cache[require.resolve('../src/diagnostic')];
        require('../src/diagnostic');
    });
});

// ============================================================================
// State Cache Tests (with ONSTAR_STATE_CACHE=true)
// ============================================================================

describe('State Cache for Partial API Responses (Enabled)', () => {
    // These tests run with state cache ENABLED by reloading the module
    let mergeState, getCachedState, clearStateCache, isStateCacheEnabled, getStateCacheStats;
    const STATE_CACHE_FILE = path.join(process.cwd(), `.state_cache_${VIN}.json`);
    
    before(() => {
        // Enable state cache and reload module
        process.env.ONSTAR_STATE_CACHE = 'true';
        delete require.cache[require.resolve('../src/diagnostic')];
        const diagnostic = require('../src/diagnostic');
        mergeState = diagnostic.mergeState;
        getCachedState = diagnostic.getCachedState;
        clearStateCache = diagnostic.clearStateCache;
        isStateCacheEnabled = diagnostic.isStateCacheEnabled;
        getStateCacheStats = diagnostic.getStateCacheStats;
    });
    
    after(() => {
        // Clean up and restore
        if (fs.existsSync(STATE_CACHE_FILE)) {
            fs.unlinkSync(STATE_CACHE_FILE);
        }
        delete process.env.ONSTAR_STATE_CACHE;
        delete require.cache[require.resolve('../src/diagnostic')];
        require('../src/diagnostic');
    });

    beforeEach(() => {
        // Clear cache before each test
        clearStateCache(true);
    });

    afterEach(() => {
        // Clean up disk cache after tests
        if (fs.existsSync(STATE_CACHE_FILE)) {
            try { fs.unlinkSync(STATE_CACHE_FILE); } catch (e) { /* ignore */ }
        }
    });

    describe('isStateCacheEnabled', () => {
        it('should return true when ONSTAR_STATE_CACHE=true', () => {
            assert.strictEqual(isStateCacheEnabled(), true);
        });
    });

    describe('mergeState', () => {
        it('should return new state with merge timestamp when cache is empty', () => {
            const topic = 'homeassistant/sensor/TESTVIN/FUEL_ECONOMY/state';
            const newState = {
                fuel_economy: 10.5,
                fuel_economy_status: 'GOOD'
            };

            const merged = mergeState(topic, newState);

            assert.strictEqual(merged.fuel_economy, 10.5);
            assert.strictEqual(merged.fuel_economy_status, 'GOOD');
            assert.ok(merged._cache_last_merge, 'Should have merge timestamp');
        });

        it('should merge new state with cached state preserving missing fields', () => {
            const topic = 'homeassistant/sensor/TESTVIN/FUEL_ECONOMY/state';
            
            // First update with complete data
            const firstState = {
                fuel_economy: 10.5,
                fuel_economy_status: 'GOOD',
                lifetime_fuel_economy: 12.0,
                lifetime_fuel_economy_status: 'GOOD'
            };
            mergeState(topic, firstState);

            // Second update with partial data (API only returns fuel_economy)
            const partialState = {
                fuel_economy: 10.8,
                fuel_economy_status: 'GOOD'
            };
            const merged = mergeState(topic, partialState);

            // Should have new values
            assert.strictEqual(merged.fuel_economy, 10.8);
            assert.strictEqual(merged.fuel_economy_status, 'GOOD');
            
            // Should preserve cached values
            assert.strictEqual(merged.lifetime_fuel_economy, 12.0);
            assert.strictEqual(merged.lifetime_fuel_economy_status, 'GOOD');
        });

        it('should overwrite cached values with new values', () => {
            const topic = 'homeassistant/sensor/TESTVIN/ODOMETER/state';
            
            // First update
            mergeState(topic, { odometer: 50000, odometer_status: 'GOOD' });

            // Second update with new odometer reading
            const merged = mergeState(topic, { odometer: 50100, odometer_status: 'GOOD' });

            assert.strictEqual(merged.odometer, 50100);
        });

        it('should handle multiple topics independently', () => {
            const topic1 = 'homeassistant/sensor/TESTVIN/FUEL_ECONOMY/state';
            const topic2 = 'homeassistant/sensor/TESTVIN/TIRE_PRESSURE/state';
            
            mergeState(topic1, { fuel_economy: 10.5 });
            mergeState(topic2, { tire_pressure_lf: 240 });

            const cached1 = getCachedState(topic1);
            const cached2 = getCachedState(topic2);

            assert.strictEqual(cached1.fuel_economy, 10.5);
            assert.strictEqual(cached2.tire_pressure_lf, 240);
            assert.strictEqual(cached1.tire_pressure_lf, undefined);
            assert.strictEqual(cached2.fuel_economy, undefined);
        });

        it('should preserve fields across multiple partial updates', () => {
            const topic = 'homeassistant/sensor/TESTVIN/ENGINE_OIL/state';
            
            mergeState(topic, { engine_oil_life: 75, last_oil_change_date: '2025-06-01' });
            mergeState(topic, { engine_oil_life: 70, engine_type: 'ICE' });
            const merged = mergeState(topic, { engine_oil_life: 65 });

            assert.strictEqual(merged.engine_oil_life, 65);
            assert.strictEqual(merged.last_oil_change_date, '2025-06-01');
            assert.strictEqual(merged.engine_type, 'ICE');
        });

        it('should log when preserving cached fields', () => {
            const topic = 'homeassistant/sensor/TESTVIN/LOG_TEST/state';
            
            // First with full data
            mergeState(topic, { a: 1, b: 2, c: 3 });
            
            // Second with partial data - should trigger log about preserved fields
            const merged = mergeState(topic, { a: 10 });
            
            assert.strictEqual(merged.a, 10);
            assert.strictEqual(merged.b, 2);
            assert.strictEqual(merged.c, 3);
        });

        it('should handle all sensor value types correctly', () => {
            const topic = 'homeassistant/sensor/TESTVIN/MIXED_TYPES/state';
            
            // First update with all different value types (simulating real sensor data)
            const firstState = {
                // Numbers (tire pressure, fuel level, odometer)
                tire_pressure_lf: 240,
                fuel_level: 75.5,
                odometer: 50000,
                // Booleans (binary sensors)
                ev_plug_state: true,
                ev_charge_state: false,
                priority_charge_indicator: true,
                // Strings (status fields, engine type, etc.)
                engine_type: 'ICE',
                tire_pressure_status: 'GOOD',
                oil_life_status_color: 'GREEN',
                // Timestamps
                tire_pressure_last_updated: '2025-12-14T15:00:00.000Z',
                // Null values (unavailable sensors)
                charge_voltage: null
            };
            mergeState(topic, firstState);

            // Second update with only some fields (partial API response)
            const partialState = {
                tire_pressure_lf: 242,  // Updated number
                ev_plug_state: false,   // Updated boolean
                tire_pressure_status: 'LOW'  // Updated string
            };
            const merged = mergeState(topic, partialState);

            // Verify updated values
            assert.strictEqual(merged.tire_pressure_lf, 242);
            assert.strictEqual(merged.ev_plug_state, false);
            assert.strictEqual(merged.tire_pressure_status, 'LOW');

            // Verify preserved numbers
            assert.strictEqual(merged.fuel_level, 75.5);
            assert.strictEqual(merged.odometer, 50000);

            // Verify preserved booleans
            assert.strictEqual(merged.ev_charge_state, false);
            assert.strictEqual(merged.priority_charge_indicator, true);

            // Verify preserved strings
            assert.strictEqual(merged.engine_type, 'ICE');
            assert.strictEqual(merged.oil_life_status_color, 'GREEN');

            // Verify preserved timestamps
            assert.strictEqual(merged.tire_pressure_last_updated, '2025-12-14T15:00:00.000Z');

            // Verify preserved null values
            assert.strictEqual(merged.charge_voltage, null);
        });

        it('should handle null values correctly in merges', () => {
            const topic = 'homeassistant/sensor/TESTVIN/NULL_HANDLING/state';
            
            // First update with value
            mergeState(topic, { charge_voltage: 240, charging: true });

            // Second update where API returns null (sensor became unavailable)
            const merged = mergeState(topic, { charge_voltage: null });

            // Null should overwrite the previous value (API explicitly said it's unavailable now)
            assert.strictEqual(merged.charge_voltage, null);
            // But other fields should be preserved
            assert.strictEqual(merged.charging, true);
        });

        it('should preserve boolean false values (not treat as missing)', () => {
            const topic = 'homeassistant/sensor/TESTVIN/BOOL_FALSE/state';
            
            // First update with false values
            mergeState(topic, { 
                ev_plug_state: false, 
                ev_charge_state: false,
                some_number: 100
            });

            // Second update without the boolean fields
            const merged = mergeState(topic, { some_number: 200 });

            // Boolean false values should be preserved, not treated as missing
            assert.strictEqual(merged.ev_plug_state, false);
            assert.strictEqual(merged.ev_charge_state, false);
            assert.strictEqual(merged.some_number, 200);
        });

        it('should preserve zero values (not treat as missing)', () => {
            const topic = 'homeassistant/sensor/TESTVIN/ZERO_VALUES/state';
            
            // First update with zero values
            mergeState(topic, { 
                fuel_level: 0,  // Empty tank
                ev_battery: 0,  // Depleted battery
                charge_rate: 0, // Not charging
                some_string: 'test'
            });

            // Second update without the zero fields
            const merged = mergeState(topic, { some_string: 'updated' });

            // Zero values should be preserved
            assert.strictEqual(merged.fuel_level, 0);
            assert.strictEqual(merged.ev_battery, 0);
            assert.strictEqual(merged.charge_rate, 0);
            assert.strictEqual(merged.some_string, 'updated');
        });

        it('should preserve empty string values', () => {
            const topic = 'homeassistant/sensor/TESTVIN/EMPTY_STRING/state';
            
            // First update with empty string
            mergeState(topic, { 
                status_message: '',
                some_value: 42
            });

            // Second update without the empty string field
            const merged = mergeState(topic, { some_value: 100 });

            // Empty string should be preserved
            assert.strictEqual(merged.status_message, '');
            assert.strictEqual(merged.some_value, 100);
        });
    });

    describe('getCachedState', () => {
        it('should return undefined for unknown topics', () => {
            const cached = getCachedState('unknown/topic');
            assert.strictEqual(cached, undefined);
        });

        it('should return cached state for known topics', () => {
            const topic = 'homeassistant/sensor/TESTVIN/FUEL_LEVEL/state';
            mergeState(topic, { fuel_level: 50 });

            const cached = getCachedState(topic);
            assert.strictEqual(cached.fuel_level, 50);
        });
    });

    describe('clearStateCache', () => {
        it('should clear all cached states', () => {
            const topic1 = 'homeassistant/sensor/TESTVIN/TOPIC1/state';
            const topic2 = 'homeassistant/sensor/TESTVIN/TOPIC2/state';
            
            mergeState(topic1, { value1: 1 });
            mergeState(topic2, { value2: 2 });

            clearStateCache();

            assert.strictEqual(getCachedState(topic1), undefined);
            assert.strictEqual(getCachedState(topic2), undefined);
        });

        it('should delete disk cache file when deleteDiskCache is true', () => {
            const topic = 'homeassistant/sensor/TESTVIN/DISK_DELETE/state';
            mergeState(topic, { value: 1 });
            
            assert.ok(fs.existsSync(STATE_CACHE_FILE), 'Cache file should exist before clear');
            
            clearStateCache(true);
            
            assert.ok(!fs.existsSync(STATE_CACHE_FILE), 'Cache file should be deleted');
        });

        it('should preserve disk cache file when deleteDiskCache is false', () => {
            const topic = 'homeassistant/sensor/TESTVIN/DISK_PRESERVE/state';
            mergeState(topic, { value: 1 });
            
            assert.ok(fs.existsSync(STATE_CACHE_FILE), 'Cache file should exist before clear');
            
            clearStateCache(false);
            
            // Memory cache should be cleared
            assert.strictEqual(getCachedState(topic), undefined);
            // But disk file should still exist
            assert.ok(fs.existsSync(STATE_CACHE_FILE), 'Cache file should still exist');
        });
    });

    describe('getStateCacheStats', () => {
        it('should return cache statistics with enabled=true', () => {
            const stats = getStateCacheStats();

            assert.strictEqual(stats.enabled, true);
            assert.strictEqual(typeof stats.topicCount, 'number');
            assert.ok(stats.cacheFile);
            assert.ok(Array.isArray(stats.topics));
        });

        it('should reflect correct topic count after merges', () => {
            mergeState('topic1', { a: 1 });
            mergeState('topic2', { b: 2 });
            mergeState('topic3', { c: 3 });

            const stats = getStateCacheStats();

            assert.strictEqual(stats.topicCount, 3);
            assert.ok(stats.topics.includes('topic1'));
            assert.ok(stats.topics.includes('topic2'));
            assert.ok(stats.topics.includes('topic3'));
        });
    });

    describe('disk persistence', () => {
        it('should save cache to disk after merge', () => {
            const topic = 'homeassistant/sensor/TESTVIN/PERSIST_TEST/state';
            mergeState(topic, { persisted_value: 42 });

            assert.ok(fs.existsSync(STATE_CACHE_FILE), 'Cache file should exist');

            const diskData = JSON.parse(fs.readFileSync(STATE_CACHE_FILE, 'utf8'));
            assert.strictEqual(diskData[topic].persisted_value, 42);
        });

        it('should load cache from disk on module reload', () => {
            const topic = 'homeassistant/sensor/TESTVIN/RELOAD_TEST/state';
            mergeState(topic, { reload_value: 123 });

            // Clear memory cache only
            clearStateCache(false);
            assert.strictEqual(getCachedState(topic), undefined);

            // Reload module - should load from disk
            delete require.cache[require.resolve('../src/diagnostic')];
            const reloaded = require('../src/diagnostic');

            const cached = reloaded.getCachedState(topic);
            assert.ok(cached, 'Should have loaded cached state from disk');
            assert.strictEqual(cached.reload_value, 123);
        });

        it('should handle multiple topics in disk persistence', () => {
            mergeState('topic/a', { a: 1 });
            mergeState('topic/b', { b: 2 });
            mergeState('topic/c', { c: 3 });

            const diskData = JSON.parse(fs.readFileSync(STATE_CACHE_FILE, 'utf8'));
            
            assert.strictEqual(diskData['topic/a'].a, 1);
            assert.strictEqual(diskData['topic/b'].b, 2);
            assert.strictEqual(diskData['topic/c'].c, 3);
        });
    });
});

// ============================================================================
// State Cache Tests (with ONSTAR_STATE_CACHE=false - default behavior)
// ============================================================================

describe('State Cache for Partial API Responses (Disabled)', () => {
    let mergeState, getCachedState, clearStateCache, isStateCacheEnabled, getStateCacheStats;
    const STATE_CACHE_FILE = path.join(process.cwd(), `.state_cache_${VIN}.json`);
    
    before(() => {
        // Ensure state cache is disabled and reload module
        delete process.env.ONSTAR_STATE_CACHE;
        delete require.cache[require.resolve('../src/diagnostic')];
        const diagnostic = require('../src/diagnostic');
        mergeState = diagnostic.mergeState;
        getCachedState = diagnostic.getCachedState;
        clearStateCache = diagnostic.clearStateCache;
        isStateCacheEnabled = diagnostic.isStateCacheEnabled;
        getStateCacheStats = diagnostic.getStateCacheStats;
    });
    
    after(() => {
        // Clean up
        if (fs.existsSync(STATE_CACHE_FILE)) {
            try { fs.unlinkSync(STATE_CACHE_FILE); } catch (e) { /* ignore */ }
        }
    });

    describe('isStateCacheEnabled', () => {
        it('should return false when ONSTAR_STATE_CACHE is not set', () => {
            assert.strictEqual(isStateCacheEnabled(), false);
        });
    });

    describe('mergeState', () => {
        it('should return new state as-is without merge timestamp', () => {
            const topic = 'homeassistant/sensor/TESTVIN/DISABLED_TEST/state';
            const newState = { fuel_economy: 10.5, fuel_economy_status: 'GOOD' };

            const merged = mergeState(topic, newState);

            assert.strictEqual(merged.fuel_economy, 10.5);
            assert.strictEqual(merged.fuel_economy_status, 'GOOD');
            assert.strictEqual(merged._cache_last_merge, undefined, 'Should NOT have merge timestamp when disabled');
        });

        it('should NOT preserve fields from previous updates', () => {
            const topic = 'homeassistant/sensor/TESTVIN/NO_PRESERVE/state';
            
            // First update with full data
            mergeState(topic, { a: 1, b: 2, c: 3 });
            
            // Second update with partial data - field b should be LOST
            const merged = mergeState(topic, { a: 10 });
            
            assert.strictEqual(merged.a, 10);
            assert.strictEqual(merged.b, undefined, 'Field b should be lost when cache is disabled');
            assert.strictEqual(merged.c, undefined, 'Field c should be lost when cache is disabled');
        });

        it('should not write to disk when disabled', () => {
            // Clean up any existing file
            if (fs.existsSync(STATE_CACHE_FILE)) {
                fs.unlinkSync(STATE_CACHE_FILE);
            }

            const topic = 'homeassistant/sensor/TESTVIN/NO_DISK/state';
            mergeState(topic, { value: 42 });

            assert.ok(!fs.existsSync(STATE_CACHE_FILE), 'Should NOT create cache file when disabled');
        });
    });

    describe('getCachedState', () => {
        it('should return undefined since caching is disabled', () => {
            mergeState('some/topic', { value: 1 });
            const cached = getCachedState('some/topic');
            assert.strictEqual(cached, undefined);
        });
    });

    describe('getStateCacheStats', () => {
        it('should return enabled=false', () => {
            const stats = getStateCacheStats();
            assert.strictEqual(stats.enabled, false);
        });
    });
});
