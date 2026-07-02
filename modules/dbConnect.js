const mongoose = require('mongoose');
const config = require('../config');

/**
 * Connects to MongoDB using the URI resolved in config (LOCAL_MODE-aware).
 */
async function connectDB() {
    try {
        await mongoose.connect(config.database.url, config.database.options);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

module.exports = connectDB;
