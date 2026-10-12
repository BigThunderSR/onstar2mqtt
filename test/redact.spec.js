const assert = require('assert');
const {
    buildSecrets,
    redact,
    redactString,
    setSecrets,
    isEnabled,
    redactIfEnabled,
    redactAlways,
    redactFormat,
} = require('../src/redact');

describe('redact', () => {
    const onstarConfig = {
        vin: '1G1FW6S07N4123456',
        deviceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        username: 'driver@example.com',
        password: 'sup3rSecretPass',
        onStarTOTP: 'JBSWY3DPEHPK3PXP',
        onStarPin: '1234',
    };
    const mqttConfig = { username: 'mqttuser', password: 'mqttSecret1' };

    afterEach(() => {
        delete process.env.LOG_REDACT;
        setSecrets([]);
    });

    describe('buildSecrets', () => {
        it('includes long secrets and excludes short ones (e.g. PIN)', () => {
            const secrets = buildSecrets(onstarConfig, mqttConfig);
            const values = secrets.map(s => s.value);
            assert.ok(values.includes('1G1FW6S07N4123456'));
            assert.ok(values.includes('sup3rSecretPass'));
            assert.ok(values.includes('JBSWY3DPEHPK3PXP'));
            assert.ok(values.includes('mqttSecret1'));
            // 4-digit PIN is too short for value-replacement
            assert.ok(!values.includes('1234'));
        });

        it('sorts by descending length to avoid partial overlaps', () => {
            const secrets = buildSecrets(onstarConfig, mqttConfig);
            for (let i = 1; i < secrets.length; i++) {
                assert.ok(secrets[i - 1].value.length >= secrets[i].value.length);
            }
        });

        it('ignores missing/empty values', () => {
            const secrets = buildSecrets({ vin: '', password: undefined }, {});
            assert.strictEqual(secrets.length, 0);
        });
    });

    describe('redactString', () => {
        const secrets = buildSecrets(onstarConfig, mqttConfig);

        it('replaces known secret values with placeholders', () => {
            const out = redactString('vin=1G1FW6S07N4123456 pass=sup3rSecretPass', secrets);
            assert.ok(out.includes('<VIN>'));
            assert.ok(out.includes('<PASSWORD>'));
            assert.ok(!out.includes('1G1FW6S07N4123456'));
            assert.ok(!out.includes('sup3rSecretPass'));
        });

        it('scrubs email addresses and stray VIN patterns', () => {
            const out = redactString('contact foo@bar.com about 1HGCM82633A004352', []);
            assert.ok(out.includes('<EMAIL>'));
            assert.ok(out.includes('<VIN>'));
        });

        it('keeps a VIN-bearing topic readable', () => {
            const out = redactString('homeassistant/sensor/1G1FW6S07N4123456/state', secrets);
            assert.strictEqual(out, 'homeassistant/sensor/<VIN>/state');
        });

        it('redacts the VIN even when lowercased (e.g. HA unique_id)', () => {
            const out = redactString('unique_id: 1g1fw6s07n4123456-odo_read', secrets);
            assert.ok(out.includes('<VIN>'));
            assert.ok(!out.toLowerCase().includes('1g1fw6s07n4123456'));
        });

        it('redacts a VIN embedded in a cache filename (underscore-adjacent, no secrets)', () => {
            const out = redactString('Loaded cache (/app/data/.unit_cache_1G1FW6S07N4123456.json)', []);
            assert.ok(out.includes('<VIN>'));
            assert.ok(!out.includes('1G1FW6S07N4123456'));
        });
    });

    describe('redact (deep)', () => {
        const secrets = buildSecrets(onstarConfig, mqttConfig);

        it('masks sensitive keys regardless of value', () => {
            const out = redact({ vehicleId: 'GUID-123', onstarAccountNumber: '999', keep: 'ok' }, secrets);
            assert.strictEqual(out.vehicleId, '<REDACTED>');
            assert.strictEqual(out.onstarAccountNumber, '<REDACTED>');
            assert.strictEqual(out.keep, 'ok');
        });

        it('masks location coordinates by key', () => {
            const out = redact({ latitude: 42.1, longitude: -71.2 }, secrets);
            assert.strictEqual(out.latitude, '<REDACTED>');
            assert.strictEqual(out.longitude, '<REDACTED>');
        });

        it('masks geohash and squishVin by key', () => {
            const out = redact({ geohash: 'u4pruyd', squishVin: '1G1FW6SKU', keep: 'ok' }, secrets);
            assert.strictEqual(out.geohash, '<REDACTED>');
            assert.strictEqual(out.squishVin, '<REDACTED>');
            assert.strictEqual(out.keep, 'ok');
        });

        it('recurses into nested objects and arrays', () => {
            const out = redact({ a: [{ password: 'x', vin: '1G1FW6S07N4123456' }] }, secrets);
            assert.strictEqual(out.a[0].password, '<REDACTED>');
            assert.strictEqual(out.a[0].vin, '<REDACTED>');
        });

        it('replaces known secret values inside non-sensitive string fields', () => {
            const out = redact({ note: 'device aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee online' }, secrets);
            assert.ok(out.note.includes('<DEVICEID>'));
        });

        it('does not mutate the original object', () => {
            const input = { password: 'secret', nested: { vin: '1G1FW6S07N4123456' } };
            redact(input, secrets);
            assert.strictEqual(input.password, 'secret');
            assert.strictEqual(input.nested.vin, '1G1FW6S07N4123456');
        });

        it('handles circular references', () => {
            const input = { a: 1 };
            input.self = input;
            const out = redact(input, secrets);
            assert.strictEqual(out.self, '[Circular]');
        });
    });

    describe('isEnabled / redactIfEnabled', () => {
        it('is disabled by default and passes values through untouched', () => {
            assert.strictEqual(isEnabled(), false);
            const value = { password: 'secret' };
            assert.strictEqual(redactIfEnabled(value), value);
        });

        it('redacts when LOG_REDACT=true', () => {
            process.env.LOG_REDACT = 'true';
            setSecrets(buildSecrets(onstarConfig, mqttConfig));
            assert.strictEqual(isEnabled(), true);
            const out = redactIfEnabled({ password: 'secret', vin: '1G1FW6S07N4123456' });
            assert.strictEqual(out.password, '<REDACTED>');
            assert.strictEqual(out.vin, '<REDACTED>');
        });
    });

    describe('redactAlways', () => {
        it('redacts regardless of LOG_REDACT (used by the forced button dump)', () => {
            setSecrets(buildSecrets(onstarConfig, mqttConfig));
            assert.strictEqual(isEnabled(), false);
            const out = redactAlways({ password: 'secret', vin: '1G1FW6S07N4123456', ok: 'keep' });
            assert.strictEqual(out.password, '<REDACTED>');
            assert.strictEqual(out.vin, '<REDACTED>');
            assert.strictEqual(out.ok, 'keep');
        });
    });

    describe('redactFormat', () => {
        it('passes info through unchanged when disabled', () => {
            const fmt = redactFormat();
            const out = fmt.transform({ level: 'info', message: 'vin 1G1FW6S07N4123456' });
            assert.strictEqual(out.message, 'vin 1G1FW6S07N4123456');
        });

        it('redacts message and metadata when enabled', () => {
            process.env.LOG_REDACT = 'true';
            setSecrets(buildSecrets(onstarConfig, mqttConfig));
            const fmt = redactFormat();
            const out = fmt.transform({
                level: 'info',
                message: 'config vin=1G1FW6S07N4123456',
                meta: { password: 'sup3rSecretPass', ok: 'keep' },
            });
            assert.ok(out.message.includes('<VIN>'));
            assert.strictEqual(out.meta.password, '<REDACTED>');
            assert.strictEqual(out.meta.ok, 'keep');
        });
    });
});
