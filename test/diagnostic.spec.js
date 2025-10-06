const assert = require('assert');
const _ = require('lodash');

const { Diagnostic, DiagnosticElement } = require('../src/diagnostic');
const apiResponse = require('./diagnostic.sample.json');

describe('Diagnostics', () => {
    let d;

    describe('Diagnostic', () => {
        // API CHANGE: Test uses old API format path for backward compatibility
        // Old: commandResponse.body.diagnosticResponse[0] with diagnosticElement field
        // New: diagnostics[0] with diagnosticElements field
        // The Diagnostic class now supports both formats
        beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[0]')));

        it('should parse a diagnostic response', () => {
            assert.strictEqual(d.name, 'AMBIENT AIR TEMPERATURE');
            assert.strictEqual(d.diagnosticElements.length, 2);
        });

        it('should toString() correctly', () => {
            const output = d.toString().trimEnd();
            const lines = output.split(/\r\n|\r|\n/);
            assert.strictEqual(lines.length, 3);
            assert.strictEqual(lines[0], 'AMBIENT AIR TEMPERATURE:');
        });

        it('should handle diagnostic response with no valid elements', () => {
            const diagResponse = {
                name: 'TEST',
                // API CHANGE: Using old API field name 'diagnosticElement' for test
                // New API uses 'diagnosticElements' (plural) and 'uom' instead of 'unit'
                // Diagnostic class now supports both formats
                diagnosticElement: [
                    { value: 123 }, // Missing unit
                    { unit: 'test' }, // Missing value
                    {} // Missing both
                ]
            };
            const diagnostic = new Diagnostic(diagResponse);
            assert.strictEqual(diagnostic.diagnosticElements.length, 0);
            assert.strictEqual(diagnostic.hasElements(), false);
        });
    });

    describe('DiagnosticElement', () => {
        beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[8]')));
        it('should parse a diagnostic element', () => {
            assert.strictEqual(d.name, 'TIRE PRESSURE');
            assert.ok(_.isArray(d.diagnosticElements));
            assert.strictEqual(d.diagnosticElements.length, 12);
        });

        it('should toString() correctly', () => {
            const output = d.toString().trimEnd();
            const lines = output.split(/\r\n|\r|\n/);
            assert.strictEqual(lines.length, 13);
            assert.strictEqual(lines[0], 'TIRE PRESSURE:');
            assert.strictEqual(lines[1], '  TIRE PRESSURE LF: 240.0kPa');
        });

        it('should strip non-alpha chars', () => {
            assert.strictEqual(DiagnosticElement.convertName('TEMP', '°F'), 'TEMP F');
        });
    });
});
