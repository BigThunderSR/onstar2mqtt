#!/usr/bin/env node

/**
 * Token Status Checker
 *
 * Checks the status of OnStar authentication tokens
 * Usage: npm run token:status
 */

require('dotenv').config();
const TokenManager = require('../src/tokenManager');
const logger = require('../src/logger');

const tokenLocation = process.env.TOKEN_LOCATION || '';

if (!tokenLocation) {
    logger.error('ERROR: TOKEN_LOCATION environment variable not set');
    logger.error('Please set TOKEN_LOCATION in your .env file');
    logger.error('Example: TOKEN_LOCATION=./tokens');
    process.exit(1);
}

logger.info('OnStar Token Status Checker');
logger.info('============================\n');

const tokenManager = new TokenManager(tokenLocation);
const status = tokenManager.getTokenStatus();

// Print detailed status
tokenManager.printTokenStatus();

// Exit codes
if (!status.locationValid) {
    logger.error('\n❌ Token location is not valid or not writable');
    process.exit(2);
}

if (!status.gmToken.exists) {
    logger.error('\n❌ GM token does not exist');
    logger.error('Please obtain tokens first. See docs/TOKEN_ONLY_MODE.md');
    process.exit(3);
}

if (!status.gmToken.valid) {
    logger.error('\n❌ GM token exists but is expired or invalid');
    logger.error('Please refresh your tokens. See docs/TOKEN_ONLY_MODE.md');
    process.exit(4);
}

logger.info('\n✅ All checks passed! Tokens are valid and ready to use.');
logger.info(`Token will expire in: ${status.gmToken.lifetimeFormatted}`);

// Warn if expiring soon (< 30 minutes)
if (status.gmToken.lifetime < 30 * 60) {
    logger.warn('\n⚠️  WARNING: Token will expire soon!');
    logger.warn('Consider refreshing tokens before running the application.');
}

process.exit(0);
