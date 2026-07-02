// Load environment variables from .env (local dev / server) before anything
// else reads process.env. Safe no-op if the file is missing — falls through
// to OS-level env vars (e.g. those set by the hosting platform).
require('dotenv').config();

/**
 * LOCAL_MODE — the master "everything local" switch.
 *
 * Set LOCAL_MODE=true in .env and the app forces local Mongo + local Redis
 * regardless of any other URL settings. Set it to false (or remove it) and
 * the remote services are used. One toggle, both back-ends. On deployed
 * hosts (Railway etc.) leave it unset so the platform-provided MONGODB_URI /
 * REDIS_URL take effect.
 */
const LOCAL_MODE = String(process.env.LOCAL_MODE || '').toLowerCase() === 'true';

function resolveMongoUri() {
    if (LOCAL_MODE) return process.env.MONGODB_URI_LOCAL || 'mongodb://127.0.0.1:27017/gymWars';
    if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
    return process.env.MONGODB_URI_LOCAL || 'mongodb://127.0.0.1:27017/gymWars';
}

function resolveRedisUrl() {
    if (LOCAL_MODE) return process.env.REDIS_URL_LOCAL || 'redis://127.0.0.1:6379';
    if (process.env.REDIS_URL) return process.env.REDIS_URL;
    return process.env.REDIS_URL_LOCAL || 'redis://127.0.0.1:6379';
}

const mongoUri = resolveMongoUri();
const redisUrl = resolveRedisUrl();

// Mask passwords for logging.
const maskUrl = (u) => u.replace(/\/\/([^:/@]+):[^@]+@/, '//$1:***@');

const usingRemoteMongo = mongoUri.startsWith('mongodb+srv://');
const usingRemoteRedis = !redisUrl.includes('127.0.0.1') && !redisUrl.includes('localhost');

console.log(`[config] Mode: ${LOCAL_MODE ? 'LOCAL_MODE (forced local)' : 'normal'}`);
console.log(`[config] Mongo: ${usingRemoteMongo ? 'REMOTE' : 'LOCAL'} → ${maskUrl(mongoUri)}`);
console.log(`[config] Redis: ${usingRemoteRedis ? 'REMOTE' : 'LOCAL'} → ${maskUrl(redisUrl)}`);

module.exports = {
    port: process.env.PORT || 4101,
    localMode: LOCAL_MODE,
    database: {
        url: mongoUri,
        options: {},
    },
    redis: {
        url: redisUrl,
    },
    jwtSecret: process.env.JWT_SECRET || 'gymwars_dev_secret_change_in_prod',
    jwtExpiresIn: '30d',
};
