const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Token Manager - Handles manual token loading and validation
 * Supports token-only mode to bypass browser automation
 */
class TokenManager {
    constructor(tokenLocation) {
        this.tokenLocation = tokenLocation || '';
        this.gmTokenPath = null;
        this.msTokenPath = null;

        if (this.tokenLocation) {
            // Same paths used by onstarjs2
            this.gmTokenPath = path.join(this.tokenLocation, 'gm-token.json');
            this.msTokenPath = path.join(this.tokenLocation, 'ms-token.json');
        }
    }

    /**
     * Load GM API token from disk
     * @returns {Object|null} Token object or null if not found
     */
    loadGMToken() {
        if (!this.gmTokenPath) {
            logger.error('Token location not configured. Set TOKEN_LOCATION environment variable.');
            return null;
        }

        if (!fs.existsSync(this.gmTokenPath)) {
            logger.error(`GM token file not found at: ${this.gmTokenPath}`);
            logger.error('Please run authentication first or manually place token file.');
            return null;
        }

        try {
            const tokenData = fs.readFileSync(this.gmTokenPath, 'utf8');
            const token = JSON.parse(tokenData);
            logger.debug('GM token loaded successfully');
            return token;
        } catch (e) {
            logger.error(`Failed to load GM token: ${e.message}`);
            return null;
        }
    }

    /**
     * Load Microsoft token from disk
     * @returns {Object|null} Token object or null if not found
     */
    loadMSToken() {
        if (!this.msTokenPath) {
            return null;
        }

        if (!fs.existsSync(this.msTokenPath)) {
            logger.debug('MS token file not found (this may be normal)');
            return null;
        }

        try {
            const tokenData = fs.readFileSync(this.msTokenPath, 'utf8');
            const token = JSON.parse(tokenData);
            logger.debug('MS token loaded successfully');
            return token;
        } catch (e) {
            logger.warn(`Failed to load MS token: ${e.message}`);
            return null;
        }
    }

    /**
     * Validate if a GM token is still valid (not expired)
     * @param {Object} token - GM API token
     * @returns {boolean} True if valid, false otherwise
     */
    isTokenValid(token) {
        if (!token) {
            return false;
        }

        // Check required fields
        if (!token.access_token || !token.expiration) {
            logger.error('Token missing required fields (access_token, expiration)');
            return false;
        }

        // Check expiration (with 5 minute buffer)
        const now = Math.floor(Date.now() / 1000);
        const expirationBuffer = 5 * 60; // 5 minutes

        if (token.expiration <= (now + expirationBuffer)) {
            const expiryDate = new Date(token.expiration * 1000);
            logger.error(`Token expired or expiring soon (expiry: ${expiryDate.toISOString()})`);
            return false;
        }

        logger.info(`Token valid until: ${new Date(token.expiration * 1000).toISOString()}`);
        return true;
    }

    /**
     * Get remaining token lifetime in seconds
     * @param {Object} token - GM API token
     * @returns {number} Seconds until expiration, or 0 if expired
     */
    getTokenLifetime(token) {
        if (!token || !token.expiration) {
            return 0;
        }

        const now = Math.floor(Date.now() / 1000);
        const remaining = token.expiration - now;
        return Math.max(0, remaining);
    }

    /**
     * Format token lifetime as human-readable string
     * @param {number} seconds - Lifetime in seconds
     * @returns {string} Formatted string
     */
    formatLifetime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    /**
     * Check if token directory exists and is writable
     * @returns {boolean} True if valid, false otherwise
     */
    isTokenLocationValid() {
        if (!this.tokenLocation) {
            logger.error('TOKEN_LOCATION not configured');
            return false;
        }

        // Check if directory exists
        if (!fs.existsSync(this.tokenLocation)) {
            try {
                fs.mkdirSync(this.tokenLocation, { recursive: true });
                logger.info(`Created token directory: ${this.tokenLocation}`);
                return true;
            } catch (e) {
                logger.error(`Failed to create token directory: ${e.message}`);
                return false;
            }
        }

        // Check if writable
        try {
            fs.accessSync(this.tokenLocation, fs.constants.W_OK);
            return true;
        } catch (e) {
            logger.error(`Token directory not writable: ${this.tokenLocation}`);
            return false;
        }
    }

    /**
     * Get token status information
     * @returns {Object} Status object with token information
     */
    getTokenStatus() {
        const gmToken = this.loadGMToken();
        const msToken = this.loadMSToken();

        const status = {
            gmToken: {
                exists: !!gmToken,
                valid: this.isTokenValid(gmToken),
                lifetime: gmToken ? this.getTokenLifetime(gmToken) : 0,
                lifetimeFormatted: gmToken ? this.formatLifetime(this.getTokenLifetime(gmToken)) : 'N/A'
            },
            msToken: {
                exists: !!msToken
            },
            tokenLocation: this.tokenLocation,
            locationValid: this.isTokenLocationValid()
        };

        return status;
    }

    /**
     * Print token status to logger
     */
    printTokenStatus() {
        const status = this.getTokenStatus();

        logger.info('=== TOKEN STATUS ===');
        logger.info(`Token Location: ${status.tokenLocation || 'Not configured'}`);
        logger.info(`Location Valid: ${status.locationValid ? 'Yes' : 'No'}`);
        logger.info('');
        logger.info('GM Token:');
        logger.info(`  Exists: ${status.gmToken.exists ? 'Yes' : 'No'}`);
        if (status.gmToken.exists) {
            logger.info(`  Valid: ${status.gmToken.valid ? 'Yes' : 'No (expired or invalid)'}`);
            logger.info(`  Lifetime: ${status.gmToken.lifetimeFormatted}`);
        }
        logger.info('');
        logger.info('MS Token:');
        logger.info(`  Exists: ${status.msToken.exists ? 'Yes' : 'No (optional)'}`);
        logger.info('====================');
    }
}

module.exports = TokenManager;
