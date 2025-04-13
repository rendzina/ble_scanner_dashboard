/**
 * BLE Scanner Dashboard - Main Server Application
 * 
 * This is the main entry point for the BLE Scanner Dashboard application.
 * It sets up the Express server, database connections, and routes.
 * 
 * Features:
 * - Express server configuration
 * - SQLite database connection
 * - Static file serving
 * - API endpoints for dashboard data
 * - Integration with stats router
 * 
 * Dependencies:
 * - express: Web application framework
 * - sqlite3: Database driver
 * - path: File path operations
 * 
 * Created: 14/Apr/2025
 * Last Updated: 14/Apr/2025
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 8080;
const host = '0.0.0.0';

// Import stats router
const statsRouter = require('./stats');
console.log('Imported stats router');

// Database connection
////////////////////////////////////////////////////////////
// CHANGE THIS PATH TO THE PATH OF YOUR DATABASE FILE
// e.g. /home/pi/ble_scanner/ble_scans.db
////////////////////////////////////////////////////////////
const dbPath = path.resolve(__dirname, 'ble_scans.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database');
        // Test query to verify data access
        db.get('SELECT COUNT(*) as count FROM scans', [], (err, row) => {
            if (err) {
                console.error('Error testing database access:', err);
            } else {
                console.log('Database test query result:', row);
            }
        });
    }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Mount the stats router
app.use('/', statsRouter);
console.log('Mounted stats router');

// Add a test endpoint directly in index.js
app.get('/api/index-test', (req, res) => {
    console.log('Index test endpoint called');
    res.json({ message: 'Index routes working' });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Endpoints
app.get('/api/stats/overview', (req, res) => {
    console.log('Received request for overview stats');
    const queries = {
        totalScans: 'SELECT COUNT(*) as count FROM scans',
        uniqueDevices: 'SELECT COUNT(DISTINCT fingerprint) as count FROM scans',
        timeRange: 'SELECT MIN(timestamp) as first_scan, MAX(timestamp) as last_scan FROM scans'
    };

    const results = {};
    let completed = 0;
    let hasError = false;

    Object.entries(queries).forEach(([key, query]) => {
        console.log(`Executing query for ${key}:`, query);
        db.get(query, [], (err, row) => {
            if (err) {
                console.error(`Error executing ${key} query:`, err);
                hasError = true;
                results[key] = null;
            } else {
                console.log(`Query result for ${key}:`, row);
                results[key] = row;
            }
            completed++;
            if (completed === Object.keys(queries).length) {
                console.log('Sending overview response:', results);
                if (hasError) {
                    res.status(500).json({ error: 'Some queries failed', results });
                } else {
                    res.json(results);
                }
            }
        });
    });
});

app.get('/api/stats/hourly', (req, res) => {
    console.log('Received request for hourly stats');
    const query = `
        SELECT strftime('%H', timestamp) as hour, COUNT(*) as count 
        FROM scans 
        GROUP BY hour 
        ORDER BY hour
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error getting hourly stats:', err);
            res.status(500).json({ error: 'Database error', details: err.message });
        } else {
            console.log('Hourly stats result:', rows);
            res.json(rows);
        }
    });
});

app.get('/api/stats/rssi', (req, res) => {
    console.log('Received request for RSSI stats');
    const query = `
        SELECT fingerprint, AVG(rssi) as avg_rssi, MIN(rssi) as min_rssi, MAX(rssi) as max_rssi 
        FROM scans 
        GROUP BY fingerprint 
        ORDER BY avg_rssi DESC
        LIMIT 20
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error getting RSSI stats:', err);
            res.status(500).json({ error: 'Database error', details: err.message });
        } else {
            console.log('RSSI stats result:', rows);
            res.json(rows);
        }
    });
});

app.get('/api/stats/devices', (req, res) => {
    console.log('Received request for device stats');
    const query = `
        SELECT fingerprint, MIN(timestamp) as first_seen, MAX(timestamp) as last_seen, COUNT(*) as reading_count 
        FROM scans 
        GROUP BY fingerprint 
        ORDER BY first_seen DESC
        LIMIT 50
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error getting device stats:', err);
            res.status(500).json({ error: 'Database error', details: err.message });
        } else {
            console.log('Device stats result:', rows);
            res.json(rows);
        }
    });
});

// Start server
app.listen(port, host, () => {
    console.log(`Dashboard server running at http://${host}:${port}`);
    console.log('Available endpoints:');
    console.log('- /api/device-types/details');
    console.log('- /api/test');
    console.log('- /api/index-test');
}); 