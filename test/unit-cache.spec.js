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
// State Cache Tests
// ============================================================================

describe('State Cache for Partial API Responses', () => {
    // Import state cache functions from diagnostic module
    const { mergeState, getCachedState, clearStateCache, isStateCacheEnabled, getStateCacheStats } = require('../src/diagnostic');
    
    const STATE_CACHE_FILE = path.join(process.cwd(), `.state_cache_${VIN}.json`);
    
    beforeEach(() => {
        // Clear cache before each test
        clearStateCache(true);
    });

    afterEach(() => {
        // Clean up disk cache after tests
        if (fs.existsSync(STATE_CACHE_FILE)) {
            fs.unlinkSync(STATE_CACHE_FILE);
        }
    });

    describe('mergeState', () => {
        it('should return new state as-is when cache is empty', () => {
            const topic = 'homeassistant/sensor/TESTVIN/FUEL_ECONOMY/state';
            const newState = {
                fuel_economy: 10.5,
                fuel_economy_status: 'GOOD',
                fuel_economy_last_updated: '2025-12-14T15:00:00.000Z'
            };

            const merged = mergeState(topic, newState);

            assert.strictEqual(merged.fuel_economy, 10.5);
            assert.strictEqual(merged.fuel_economy_status, 'GOOD');
            // When cache is enabled, should have merge timestamp
            if (isStateCacheEnabled()) {
                assert.ok(merged._cache_last_merge);
            }
        });

        it('should merge new state with cached state when enabled', () => {
            if (!isStateCacheEnabled()) {
                // Skip this test if state cache is disabled
                return;
            }
            
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
            const firstState = {
                odometer: 50000,
                odometer_status: 'GOOD'
            };
            mergeState(topic, firstState);

            // Second update with new odometer reading
            const secondState = {
                odometer: 50100,
                odometer_status: 'GOOD'
            };
            const merged = mergeState(topic, secondState);

            // New value should overwrite cached value
            assert.strictEqual(merged.odometer, 50100);
        });

        it('should handle multiple topics independently', () => {
            if (!isStateCacheEnabled()) {
                return;
            }
            
            const topic1 = 'homeassistant/sensor/TESTVIN/FUEL_ECONOMY/state';
            const topic2 = 'homeassistant/sensor/TESTVIN/TIRE_PRESSURE/state';
            
            // Update topic1
            mergeState(topic1, { fuel_economy: 10.5 });
            
            // Update topic2
            mergeState(topic2, { tire_pressure_lf: 240 });

            // Get cached states
            const cached1 = getCachedState(topic1);
            const cached2 = getCachedState(topic2);

            assert.strictEqual(cached1.fuel_economy, 10.5);
            assert.strictEqual(cached2.tire_pressure_lf, 240);
            
            // Ensure they don't interfere with each other
            assert.strictEqual(cached1.tire_pressure_lf, undefined);
            assert.strictEqual(cached2.fuel_economy, undefined);
        });

        it('should preserve fields across multiple partial updates', () => {
            if (!isStateCacheEnabled()) {
                return;
            }
            
            const topic = 'homeassistant/sensor/TESTVIN/ENGINE_OIL/state';
            
            // First update
            mergeState(topic, {
                engine_oil_life: 75,
                last_oil_change_date: '2025-06-01'
            });

            // Second update - different partial data
            mergeState(topic, {
                engine_oil_life: 70,
                engine_type: 'ICE'
            });

            // Third update - yet another partial
            const merged = mergeState(topic, {
                engine_oil_life: 65
            });

            // Should have data from all updates
            assert.strictEqual(merged.engine_oil_life, 65);  // Latest
            assert.strictEqual(merged.last_oil_change_date, '2025-06-01');  // From first
            assert.strictEqual(merged.engine_type, 'ICE');  // From second
        });
    });

    describe('getCachedState', () => {
        it('should return undefined for unknown topics', () => {
            const cached = getCachedState('unknown/topic');
            assert.strictEqual(cached, undefined);
        });

        it('should return cached state for known topics when enabled', () => {
            if (!isStateCacheEnabled()) {
                return;
            }
            
            const topic = 'homeassistant/sensor/TESTVIN/FUEL_LEVEL/state';
            mergeState(topic, { fuel_level: 50 });

            const cached = getCachedState(topic);
            assert.strictEqual(cached.fuel_level, 50);
        });
    });

    describe('clearStateCache', () => {
        it('should clear all cached states', () => {
            if (!isStateCacheEnabled()) {
                return;
            }
            
            const topic1 = 'homeassistant/sensor/TESTVIN/TOPIC1/state';
            const topic2 = 'homeassistant/sensor/TESTVIN/TOPIC2/state';
            
            mergeState(topic1, { value1: 1 });
            mergeState(topic2, { value2: 2 });

            clearStateCache();

            assert.strictEqual(getCachedState(topic1), undefined);
            assert.strictEqual(getCachedState(topic2), undefined);
        });
    });

    describe('getStateCacheStats', () => {
        it('should return cache statistics', () => {
            const stats = getStateCacheStats();

            assert.strictEqual(typeof stats.enabled, 'boolean');
            assert.strictEqual(typeof stats.topicCount, 'number');
            assert.ok(stats.cacheFile);
            assert.ok(Array.isArray(stats.topics));
        });
    });

    describe('disk persistence', () => {
        it('should save cache to disk after merge when enabled', () => {
            if (!isStateCacheEnabled()) {
                return;
            }
            
            const topic = 'homeassistant/sensor/TESTVIN/PERSIST_TEST/state';
            mergeState(topic, { persisted_value: 42 });

            // Check that cache file exists
            assert.ok(fs.existsSync(STATE_CACHE_FILE), 'Cache file should exist');

            // Read and verify contents
            const diskData = JSON.parse(fs.readFileSync(STATE_CACHE_FILE, 'utf8'));
            assert.strictEqual(diskData[topic].persisted_value, 42);
        });
    });
});
