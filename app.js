/**
 * BLE Scanner Dashboard - Express Application Configuration
 * 
 * This file configures the Express application and middleware setup.
 * It serves as the application configuration layer, separate from the
 * main server entry point (index.js).
 * 
 * Features:
 * - Express middleware configuration
 * - Static file serving setup
 * - Error handling middleware
 * - Route integration
 * - Security configurations
 * 
 * Middleware Used:
 * - express.static: Serves static files
 * - express.json: Parses JSON payloads
 * - statsRouter: Handles statistical analysis routes
 * 
 * Dependencies:
 * - express: Web application framework
 * - path: File path operations
 * - stats.js: Statistical analysis router
 * 
 * Environment:
 * - PORT: Default 3000 (configurable via env)
 * - NODE_ENV: Development/Production
 * 
 * Created: 14/Apr/2025
 * Last Updated: 14/Apr/2025
 */

const express = require('express');
const path = require('path');
const statsRouter = require('./stats');

const app = express();

// Serve static files from the public directory
app.use(express.static('public'));

// Use the stats router for API endpoints
app.use('/', statsRouter);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 