'use strict';

/**
 * Optional "pull to refresh" before the periodic diagnostics poll.
 *
 * The diagnostics poll reads GM's stored vehicle health snapshot
 * (/api/v1/vh/vehiclehealth/v1/healthstatus). It does not ask the vehicle for
 * new data. Some vehicles have stopped having that snapshot refreshed from
 * routine vehicle uploads, so every poll returns the same values for days.
 * The myChevrolet app's pull-to-refresh (refreshEVChargingMetrics with
 * refreshTrigger=pull_to_refresh, onstarjs2 >= 2.16.8) makes GM refresh the
 * snapshot within seconds.
 *
 * When ONSTAR_PULL_REFRESH_INTERVAL is set (milliseconds, 0 = disabled, the
 * default), the poll loop sends that refresh at most once per interval and
 * waits ONSTAR_PULL_REFRESH_SETTLE (milliseconds, default 20000) before
 * reading diagnostics. Each refresh wakes the vehicle, so keep the interval
 * well above the poll interval. The refresh endpoint is EV-only.
 */

const DEFAULT_SETTLE_MS = 20000;

function parseMs(value, fallback) {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function pullRefreshConfigFromEnv(env = process.env) {
    return {
        intervalMs: parseMs(env.ONSTAR_PULL_REFRESH_INTERVAL, 0),
        settleMs: parseMs(env.ONSTAR_PULL_REFRESH_SETTLE, DEFAULT_SETTLE_MS),
    };
}

/**
 * @param {object} opts
 * @param {number} opts.intervalMs  minimum time between refreshes; 0 disables
 * @param {number} opts.settleMs    wait after a refresh before diagnostics are read
 * @param {() => Promise<any>} opts.refresh  sends the refresh (commands.refreshEVChargingMetrics)
 * @param {object} opts.logger
 * @param {() => number} [opts.now]
 * @param {(ms: number) => Promise<void>} [opts.sleep]
 * @returns {{ enabled: boolean, maybeRefresh: () => Promise<boolean> }}
 */
function createPullRefresher({ intervalMs, settleMs, refresh, logger, now = Date.now, sleep }) {
    const wait = sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const enabled = intervalMs > 0;
    let lastAttempt = null;

    async function maybeRefresh() {
        if (!enabled) return false;
        const t = now();
        if (lastAttempt !== null && t - lastAttempt < intervalMs) return false;
        // Count failures as attempts too, so a failing endpoint is not hit on every poll.
        lastAttempt = t;
        try {
            logger.info('Pull refresh: requesting fresh vehicle data before diagnostics');
            const result = await refresh();
            logger.info('Pull refresh: completed', { status: result && result.status });
        } catch (error) {
            logger.warn('Pull refresh failed; reading diagnostics anyway', {
                error: (error && error.message) || String(error),
            });
            return false;
        }
        if (settleMs > 0) await wait(settleMs);
        return true;
    }

    return { enabled, maybeRefresh };
}

module.exports = { createPullRefresher, pullRefreshConfigFromEnv, DEFAULT_SETTLE_MS };
