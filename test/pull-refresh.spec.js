const assert = require('assert');
const { createPullRefresher, pullRefreshConfigFromEnv, DEFAULT_SETTLE_MS } = require('../src/pull-refresh');

const quietLogger = { info() {}, warn() {} };

function harness({ intervalMs = 1000, settleMs = 50, refresh } = {}) {
    let clock = 0;
    const sleeps = [];
    const calls = [];
    const refresher = createPullRefresher({
        intervalMs,
        settleMs,
        logger: quietLogger,
        now: () => clock,
        sleep: async (ms) => { sleeps.push(ms); },
        refresh: refresh || (async () => { calls.push(clock); return { status: 'success' }; }),
    });
    return { refresher, sleeps, calls, advance: (ms) => { clock += ms; } };
}

describe('pull-refresh', () => {
    describe('pullRefreshConfigFromEnv', () => {
        it('is disabled by default with the default settle time', () => {
            assert.deepStrictEqual(pullRefreshConfigFromEnv({}), { intervalMs: 0, settleMs: DEFAULT_SETTLE_MS });
        });

        it('reads interval and settle in milliseconds', () => {
            assert.deepStrictEqual(
                pullRefreshConfigFromEnv({ ONSTAR_PULL_REFRESH_INTERVAL: '7200000', ONSTAR_PULL_REFRESH_SETTLE: '5000' }),
                { intervalMs: 7200000, settleMs: 5000 },
            );
        });

        it('falls back on invalid or negative values', () => {
            assert.deepStrictEqual(
                pullRefreshConfigFromEnv({ ONSTAR_PULL_REFRESH_INTERVAL: 'abc', ONSTAR_PULL_REFRESH_SETTLE: '-1' }),
                { intervalMs: 0, settleMs: DEFAULT_SETTLE_MS },
            );
        });
    });

    describe('createPullRefresher', () => {
        it('does nothing when disabled', async () => {
            const h = harness({ intervalMs: 0 });
            assert.strictEqual(h.refresher.enabled, false);
            assert.strictEqual(await h.refresher.maybeRefresh(), false);
            assert.strictEqual(h.calls.length, 0);
        });

        it('refreshes on the first poll and waits the settle time', async () => {
            const h = harness();
            assert.strictEqual(await h.refresher.maybeRefresh(), true);
            assert.deepStrictEqual(h.calls, [0]);
            assert.deepStrictEqual(h.sleeps, [50]);
        });

        it('skips polls inside the interval and refreshes again after it', async () => {
            const h = harness({ intervalMs: 1000 });
            await h.refresher.maybeRefresh();
            h.advance(999);
            assert.strictEqual(await h.refresher.maybeRefresh(), false);
            h.advance(1);
            assert.strictEqual(await h.refresher.maybeRefresh(), true);
            assert.deepStrictEqual(h.calls, [0, 1000]);
        });

        it('does not throw on failure, skips the settle wait, and still honours the interval', async () => {
            let attempts = 0;
            const h = harness({
                intervalMs: 1000,
                refresh: async () => { attempts++; throw new Error('boom'); },
            });
            assert.strictEqual(await h.refresher.maybeRefresh(), false);
            assert.deepStrictEqual(h.sleeps, []);
            h.advance(500);
            await h.refresher.maybeRefresh();
            assert.strictEqual(attempts, 1);
        });

        it('skips the wait when settle is 0', async () => {
            const h = harness({ settleMs: 0 });
            await h.refresher.maybeRefresh();
            assert.deepStrictEqual(h.sleeps, []);
        });
    });
});
