const assert = require('assert');
const { normalizeError } = require('../src/error-utils');

/**
 * This test file verifies the error normalization logic used in src/index.js.
 * The normalizeError function handles different error formats from various sources:
 * - Axios errors (response.status)
 * - OpenID-client OPError (response.statusCode)
 * - Fallback parsing from error message
 */

describe('Error Normalization', () => {
    describe('normalizeError', () => {
        describe('Axios-style errors (response.status)', () => {
            it('should extract status from Axios error response', () => {
                const axiosError = new Error('Request failed with status code 401');
                axiosError.response = {
                    status: 401,
                    statusText: 'Unauthorized',
                    data: { message: 'Token expired' }
                };

                const result = normalizeError(axiosError);

                assert.strictEqual(result.response.status, 401);
                assert.strictEqual(result.response.statusText, 'Unauthorized');
                assert.deepStrictEqual(result.response.data, { message: 'Token expired' });
            });

            it('should extract 429 rate limit error from Axios', () => {
                const axiosError = new Error('Request failed with status code 429');
                axiosError.response = {
                    status: 429,
                    statusText: 'Too Many Requests',
                    headers: { 'retry-after': '60' }
                };

                const result = normalizeError(axiosError);

                assert.strictEqual(result.response.status, 429);
                assert.strictEqual(result.response.statusText, 'Too Many Requests');
                assert.deepStrictEqual(result.response.headers, { 'retry-after': '60' });
            });

            it('should extract 500 server error from Axios', () => {
                const axiosError = new Error('Request failed with status code 500');
                axiosError.response = {
                    status: 500,
                    statusText: 'Internal Server Error'
                };

                const result = normalizeError(axiosError);

                assert.strictEqual(result.response.status, 500);
                assert.strictEqual(result.response.statusText, 'Internal Server Error');
            });

            it('should include request info from Axios config', () => {
                const axiosError = new Error('Request failed');
                axiosError.response = { status: 400, statusText: 'Bad Request' };
                axiosError.config = {
                    method: 'POST',
                    url: 'https://api.gm.com/v1/command',
                    headers: { 'Authorization': 'Bearer token123' }
                };

                const result = normalizeError(axiosError);

                assert.strictEqual(result.request.method, 'POST');
                assert.strictEqual(result.request.url, 'https://api.gm.com/v1/command');
                assert.deepStrictEqual(result.request.headers, { 'Authorization': 'Bearer token123' });
            });
        });

        describe('OpenID-client errors (response.statusCode)', () => {
            it('should extract 429 status from OPError with statusCode', () => {
                const opError = new Error('expected 200 OK, got: 429 Too Many Requests');
                // OPError uses Object.defineProperty with enumerable: false
                Object.defineProperty(opError, 'response', {
                    value: { statusCode: 429, body: { error: 'rate_limited' } },
                    enumerable: false
                });

                const result = normalizeError(opError);

                assert.strictEqual(result.response.status, 429);
                assert.strictEqual(result.response.statusText, 'Unknown');
                assert.deepStrictEqual(result.response.data, { error: 'rate_limited' });
            });

            it('should extract 401 status from OPError with statusCode', () => {
                const opError = new Error('expected 200 OK, got: 401 Unauthorized');
                Object.defineProperty(opError, 'response', {
                    value: { statusCode: 401 },
                    enumerable: false
                });

                const result = normalizeError(opError);

                assert.strictEqual(result.response.status, 401);
            });

            it('should use statusMessage if available (Node.js http style)', () => {
                const opError = new Error('Auth failed');
                Object.defineProperty(opError, 'response', {
                    value: {
                        statusCode: 403,
                        statusMessage: 'Forbidden'
                    },
                    enumerable: false
                });

                const result = normalizeError(opError);

                assert.strictEqual(result.response.status, 403);
                assert.strictEqual(result.response.statusText, 'Forbidden');
            });

            it('should extract body as data from OPError', () => {
                const opError = new Error('Token refresh failed');
                Object.defineProperty(opError, 'response', {
                    value: {
                        statusCode: 400,
                        body: { error: 'invalid_grant', error_description: 'Refresh token expired' }
                    },
                    enumerable: false
                });

                const result = normalizeError(opError);

                assert.strictEqual(result.response.status, 400);
                assert.deepStrictEqual(result.response.data, {
                    error: 'invalid_grant',
                    error_description: 'Refresh token expired'
                });
            });

            it('should handle OPError with headers', () => {
                const opError = new Error('Request failed');
                Object.defineProperty(opError, 'response', {
                    value: {
                        statusCode: 503,
                        headers: { 'x-retry-after': '30' }
                    },
                    enumerable: false
                });

                const result = normalizeError(opError);

                assert.strictEqual(result.response.status, 503);
                assert.deepStrictEqual(result.response.headers, { 'x-retry-after': '30' });
            });
        });

        describe('Fallback parsing from error message', () => {
            it('should parse 429 from OpenID-style error message', () => {
                const error = new Error('expected 200 OK, got: 429 Too Many Requests');

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 429);
                assert.strictEqual(result.response.statusText, 'Too Many Requests');
            });

            it('should parse 503 from error message', () => {
                const error = new Error('expected 200 OK, got: 503 Service Unavailable');

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 503);
                assert.strictEqual(result.response.statusText, 'Service Unavailable');
            });

            it('should parse 401 from error message', () => {
                const error = new Error('expected 200 OK, got: 401 Unauthorized');

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 401);
                assert.strictEqual(result.response.statusText, 'Unauthorized');
            });

            it('should parse 400 from error message', () => {
                const error = new Error('expected 200 OK, got: 400 Bad Request');

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 400);
                assert.strictEqual(result.response.statusText, 'Bad Request');
            });

            it('should parse 500 from error message', () => {
                const error = new Error('expected 200 OK, got: 500 Internal Server Error');

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 500);
                assert.strictEqual(result.response.statusText, 'Internal Server Error');
            });

            it('should handle case insensitive "got:" prefix', () => {
                const error = new Error('expected 200 OK, GOT: 429 Too Many Requests');

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 429);
            });

            it('should handle extra whitespace in error message', () => {
                const error = new Error('expected 200 OK, got:  429  Too Many Requests');

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 429);
                assert.strictEqual(result.response.statusText, 'Too Many Requests');
            });
        });

        describe('Generic errors without status info', () => {
            it('should return basic info for generic error', () => {
                const error = new Error('Something went wrong');

                const result = normalizeError(error);

                assert.strictEqual(result.message, 'Something went wrong');
                assert.ok(result.stack);
                assert.strictEqual(result.response, undefined);
            });

            it('should preserve message and stack', () => {
                const error = new Error('Network error');

                const result = normalizeError(error);

                assert.strictEqual(result.message, 'Network error');
                assert.ok(result.stack.includes('Network error'));
            });

            it('should handle error with empty message', () => {
                const error = new Error('');

                const result = normalizeError(error);

                assert.strictEqual(result.message, '');
                assert.strictEqual(result.response, undefined);
            });
        });

        describe('Request info extraction', () => {
            it('should extract request info from e.request', () => {
                const error = new Error('Request failed');
                error.response = { status: 400, statusText: 'Bad Request' };
                error.request = {
                    method: 'GET',
                    url: 'https://api.example.com/data',
                    headers: { 'Accept': 'application/json' },
                    body: '{"test": true}',
                    contentType: 'application/json',
                    extraProperty: 'should be ignored'
                };

                const result = normalizeError(error);

                assert.strictEqual(result.request.method, 'GET');
                assert.strictEqual(result.request.url, 'https://api.example.com/data');
                assert.strictEqual(result.request.body, '{"test": true}');
                assert.strictEqual(result.request.contentType, 'application/json');
                assert.strictEqual(result.request.extraProperty, undefined);
            });

            it('should prefer config over request if both present', () => {
                const error = new Error('Request failed');
                error.response = { status: 400, statusText: 'Bad Request' };
                error.request = {
                    method: 'GET',
                    url: 'https://request.example.com'
                };
                error.config = {
                    method: 'POST',
                    url: 'https://config.example.com',
                    headers: { 'X-Custom': 'value' }
                };

                const result = normalizeError(error);

                // config should overwrite request
                assert.strictEqual(result.request.method, 'POST');
                assert.strictEqual(result.request.url, 'https://config.example.com');
            });
        });

        describe('Priority of status sources', () => {
            it('should prefer response.status over response.statusCode', () => {
                const error = new Error('Test error');
                error.response = {
                    status: 401,
                    statusText: 'From status',
                    statusCode: 500 // Should be ignored
                };

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 401);
                assert.strictEqual(result.response.statusText, 'From status');
            });

            it('should prefer response.statusCode over message parsing', () => {
                const error = new Error('expected 200 OK, got: 503 Service Unavailable');
                Object.defineProperty(error, 'response', {
                    value: { statusCode: 429 },
                    enumerable: false
                });

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 429);
            });
        });

        describe('Real-world error scenarios', () => {
            it('should handle GM API 429 rate limit via OpenID', () => {
                // Simulates the actual error from logs
                const error = new Error('expected 200 OK, got: 429 Too Many Requests');
                Object.defineProperty(error, 'response', {
                    value: {
                        statusCode: 429,
                        headers: { 'content-type': 'application/json' },
                        body: { error: 'rate_limit_exceeded' }
                    },
                    enumerable: false
                });

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 429);
                assert.strictEqual(result.message, 'expected 200 OK, got: 429 Too Many Requests');
                assert.deepStrictEqual(result.response.data, { error: 'rate_limit_exceeded' });
            });

            it('should handle OnStar API authentication failure', () => {
                const error = new Error('expected 200 OK, got: 401 Unauthorized');
                Object.defineProperty(error, 'response', {
                    value: {
                        statusCode: 401,
                        body: {
                            error: 'invalid_token',
                            error_description: 'The access token is expired'
                        }
                    },
                    enumerable: false
                });

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 401);
                assert.strictEqual(result.response.data.error, 'invalid_token');
            });

            it('should handle Axios command execution error', () => {
                const error = new Error('Request failed with status code 500');
                error.response = {
                    status: 500,
                    statusText: 'Internal Server Error',
                    data: { message: 'Vehicle not responding' },
                    headers: { 'x-request-id': 'abc123' }
                };
                error.config = {
                    method: 'POST',
                    url: 'https://api.gm.com/api/v1/account/vehicles/1234/commands/start',
                    headers: { 'Authorization': 'Bearer xxx' }
                };

                const result = normalizeError(error);

                assert.strictEqual(result.response.status, 500);
                assert.strictEqual(result.response.statusText, 'Internal Server Error');
                assert.strictEqual(result.response.data.message, 'Vehicle not responding');
                assert.strictEqual(result.request.method, 'POST');
                assert.ok(result.request.url.includes('commands/start'));
            });

            it('should produce valid JSON for MQTT publishing', () => {
                const error = new Error('expected 200 OK, got: 429 Too Many Requests');
                Object.defineProperty(error, 'response', {
                    value: { statusCode: 429 },
                    enumerable: false
                });

                const result = normalizeError(error);
                
                // Simulate what gets published to MQTT
                const mqttPayload = {
                    error: result,
                    completionTimestamp: new Date().toISOString()
                };

                // Should be serializable without circular reference issues
                const jsonString = JSON.stringify(mqttPayload);
                const parsed = JSON.parse(jsonString);

                assert.strictEqual(parsed.error.response.status, 429);
                assert.ok(parsed.completionTimestamp);
            });

            it('should provide status for HA sensor template extraction', () => {
                const error = new Error('expected 200 OK, got: 429 Too Many Requests');
                Object.defineProperty(error, 'response', {
                    value: { statusCode: 429 },
                    enumerable: false
                });

                const result = normalizeError(error);
                
                // Simulate the Jinja template: {{ value_json.error.response.status | int(0) }}
                const payload = { error: result };
                const statusFromTemplate = payload.error?.response?.status || 0;

                assert.strictEqual(statusFromTemplate, 429);
            });
        });

        describe('Exact error formats from HA addon logs', () => {
            /**
             * These tests use the exact error formats captured from real HA addon logs
             * to ensure we handle the actual errors users encounter.
             */

            it('should handle OPError from openid-client token refresh (from HA log 2025-11-28)', () => {
                // Exact error format from HA addon log:
                // OPError: expected 200 OK, got: 429 Too Many Requests
                //     at processResponse (/app/node_modules/openid-client/lib/helpers/process_response.js:41:11)
                //     at Client.grant (/app/node_modules/openid-client/lib/client.js:1381:22)
                //     at async Client.refresh (/app/node_modules/openid-client/lib/client.js:1125:22) {
                //   error: 'expected 200 OK, got: 429 Too Many Requests'
                // }
                
                const error = new Error('expected 200 OK, got: 429 Too Many Requests');
                error.name = 'OPError';
                // OPError has a custom 'error' property (not just message)
                error.error = 'expected 200 OK, got: 429 Too Many Requests';
                // OPError uses Object.defineProperty for response (non-enumerable)
                Object.defineProperty(error, 'response', {
                    value: {
                        statusCode: 429,
                        statusMessage: 'Too Many Requests'
                    },
                    enumerable: false,
                    configurable: true
                });
                // Simulate the stack trace pattern
                error.stack = `OPError: expected 200 OK, got: 429 Too Many Requests
    at processResponse (/app/node_modules/openid-client/lib/helpers/process_response.js:41:11)
    at Client.grant (/app/node_modules/openid-client/lib/client.js:1381:22)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async Client.refresh (/app/node_modules/openid-client/lib/client.js:1125:22)`;

                const result = normalizeError(error);

                // Verify the normalized error has the status code accessible
                assert.strictEqual(result.response.status, 429);
                assert.strictEqual(result.response.statusText, 'Too Many Requests');
                assert.strictEqual(result.message, 'expected 200 OK, got: 429 Too Many Requests');
                
                // Verify HA sensor template would work
                const mqttPayload = { error: result, completionTimestamp: new Date().toISOString() };
                const jsonString = JSON.stringify(mqttPayload);
                const parsed = JSON.parse(jsonString);
                
                // This is what the HA sensor template does: {{ value_json.error.response.status | int(0) }}
                assert.strictEqual(parsed.error.response.status, 429);
            });

            it('should handle RequestService error from onstarjs2 (from HA log 2025-11-28)', () => {
                // Error format from HA addon log:
                // Error: expected 200 OK, got: 429 Too Many Requests
                //     at RequestService.<anonymous> (/app/node_modules/onstarjs2/dist/index.cjs:4319:36)
                //     at Generator.throw (<anonymous>)
                //     at rejected (/app/node_modules/onstarjs2/dist/index.cjs:62:65)
                
                const error = new Error('expected 200 OK, got: 429 Too Many Requests');
                error.stack = `Error: expected 200 OK, got: 429 Too Many Requests
    at RequestService.<anonymous> (/app/node_modules/onstarjs2/dist/index.cjs:4319:36)
    at Generator.throw (<anonymous>)
    at rejected (/app/node_modules/onstarjs2/dist/index.cjs:62:65)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)`;

                const result = normalizeError(error);

                // Even without response object, should parse from message
                assert.strictEqual(result.response.status, 429);
                assert.strictEqual(result.response.statusText, 'Too Many Requests');
            });

            it('should fix the original issue: HA template error for missing response', () => {
                // Original issue: HA log showed
                // Template variable error: 'dict object' has no attribute 'response' 
                // when rendering '{{ value_json.error.response.status | int(0) }}'
                
                // This happened because the old code used _.pick which didn't extract
                // response.status from OPError (which has response.statusCode instead)
                
                const error = new Error('expected 200 OK, got: 429 Too Many Requests');
                Object.defineProperty(error, 'response', {
                    value: { statusCode: 429 },  // OPError uses statusCode, not status
                    enumerable: false
                });

                const result = normalizeError(error);

                // The fix: normalizeError should always produce response.status
                assert.ok(result.response, 'response object should exist');
                assert.ok(result.response.status !== undefined, 'response.status should be defined');
                assert.strictEqual(result.response.status, 429);
                
                // Verify the exact HA template would now work
                const payload = { error: result };
                // Simulate: {{ value_json.error.response.status | int(0) }}
                const templateResult = payload.error?.response?.status ?? 0;
                assert.strictEqual(templateResult, 429, 'HA template should extract 429');
            });

            it('should handle the polling status payload format', () => {
                // The actual MQTT payload format used in index.js:
                // client.publish(pollingStatusTopicState, JSON.stringify({
                //     ...errorPayload,
                //     "completionTimestamp": completionTimestamp
                // }), { retain: true })
                
                const error = new Error('expected 200 OK, got: 429 Too Many Requests');
                Object.defineProperty(error, 'response', {
                    value: { statusCode: 429 },
                    enumerable: false
                });

                const errorPayload = { error: normalizeError(error) };
                const completionTimestamp = '2025-11-28T11:37:05.000Z';
                
                const mqttMessage = JSON.stringify({
                    ...errorPayload,
                    completionTimestamp: completionTimestamp
                });
                
                const parsed = JSON.parse(mqttMessage);
                
                // Verify structure matches what HA expects
                assert.strictEqual(parsed.error.message, 'expected 200 OK, got: 429 Too Many Requests');
                assert.strictEqual(parsed.error.response.status, 429);
                assert.strictEqual(parsed.completionTimestamp, '2025-11-28T11:37:05.000Z');
                
                // Verify HA sensor templates work:
                // Polling Status Message: {{ value_json.error.message }}
                assert.strictEqual(parsed.error.message, 'expected 200 OK, got: 429 Too Many Requests');
                // Polling Status Code: {{ value_json.error.response.status | int(0) }}
                assert.strictEqual(parsed.error.response.status, 429);
                // Polling Status Timestamp: {{ value_json.completionTimestamp }}
                assert.strictEqual(parsed.completionTimestamp, '2025-11-28T11:37:05.000Z');
            });
        });
    });
});
