/**
 * BLE Scanner Dashboard - Statistics Router
 * 
 * Handles all statistical analysis and data processing for the BLE scanner data.
 * Provides endpoints for various types of analysis including device activity,
 * environmental analysis, device classification, and network load.
 * 
 * Created: 14/Apr/2025
 * Last Updated: 14/Apr/2025
 */

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection setup
const dbPath = path.resolve(__dirname, 'ble_scans.db');
console.log('Attempting to connect to database at:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database');
    }
});

// Device Activity Endpoints
router.get('/api/device-activity/heatmap', (req, res) => {
    const query = `
        SELECT 
            strftime('%w', timestamp) as day_of_week,
            strftime('%H', timestamp) as hour,
            COUNT(DISTINCT fingerprint) as device_count
        FROM scans 
        GROUP BY day_of_week, hour
        ORDER BY day_of_week, hour
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const heatmapData = rows.map(row => ({
            x: parseInt(row.hour),
            y: parseInt(row.day_of_week),
            devices: row.device_count
        }));

        res.json({ heatmapData });
    });
});

router.get('/api/device-activity/presence', (req, res) => {
    const query = `
        WITH device_presence AS (
            SELECT 
                fingerprint,
                strftime('%Y-%m-%d', timestamp) as date,
                COUNT(*) as daily_appearances,
                COUNT(DISTINCT strftime('%H', timestamp)) as active_hours
            FROM scans 
            GROUP BY fingerprint, date
        )
        SELECT 
            date,
            COUNT(DISTINCT fingerprint) as unique_devices,
            AVG(daily_appearances) as avg_appearances,
            AVG(active_hours) as avg_active_hours
        FROM device_presence
        GROUP BY date
        ORDER BY date
        LIMIT 30
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            dates: rows.map(row => row.date),
            uniqueDevices: rows.map(row => row.unique_devices),
            avgAppearances: rows.map(row => row.avg_appearances),
            avgActiveHours: rows.map(row => row.avg_active_hours)
        });
    });
});

// Add this endpoint to your stats.js file after the heatmap endpoint
router.get('/api/device-activity/dwell-time', (req, res) => {
    const query = `
        WITH device_times AS (
            SELECT 
                fingerprint,
                (julianday(MAX(timestamp)) - julianday(MIN(timestamp))) * 24 * 60 as dwell_minutes
            FROM scans 
            GROUP BY fingerprint
            HAVING dwell_minutes > 0
        )
        SELECT 
            CASE 
                WHEN dwell_minutes <= 5 THEN '0-5'
                WHEN dwell_minutes <= 15 THEN '6-15'
                WHEN dwell_minutes <= 30 THEN '16-30'
                WHEN dwell_minutes <= 60 THEN '31-60'
                ELSE '60+'
            END as time_range,
            COUNT(*) as device_count
        FROM device_times
        GROUP BY time_range
        ORDER BY MIN(dwell_minutes)
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log('Dwell time data:', rows); // Debug log

        res.json({
            labels: rows.map(row => row.time_range),
            values: rows.map(row => row.device_count)
        });
    });
});

// Device Types Endpoints
router.get('/api/device-types/details', (req, res) => {
    const query = `
        WITH device_stats AS (
            SELECT 
                fingerprint,
                COUNT(*) as appearance_count,
                COUNT(DISTINCT strftime('%Y-%m-%d', timestamp)) as days_active,
                COUNT(DISTINCT strftime('%H', timestamp)) as total_hours,
                AVG(rssi) as avg_rssi,
                MIN(rssi) as min_rssi,
                MAX(rssi) as max_rssi,
                GROUP_CONCAT(DISTINCT service_uuids) as services,
                manufacturer_data
            FROM scans 
            GROUP BY fingerprint
        )
        SELECT 
            fingerprint,
            CASE 
                WHEN days_active >= 7 AND appearance_count >= 100 THEN 'Permanent'
                WHEN days_active >= 3 THEN 'Regular'
                WHEN appearance_count >= 50 THEN 'Frequent'
                ELSE 'Occasional'
            END as category,
            manufacturer_data as manufacturer,
            services,
            json_object(
                'avg_rssi', round(avg_rssi, 1),
                'min_rssi', min_rssi,
                'max_rssi', max_rssi
            ) as signal_stats,
            json_object(
                'days_active', days_active,
                'total_hours', total_hours
            ) as presence_stats
        FROM device_stats
        ORDER BY days_active DESC, appearance_count DESC
        LIMIT 50
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error getting device type details:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        console.log(`Found ${rows.length} device type details`);
        res.json({ devices: rows });
    });
});

// Add this endpoint to your stats.js file
router.get('/api/device-types/behaviour', (req, res) => {
    const query = `
        WITH device_stats AS (
            SELECT 
                fingerprint,
                COUNT(*) as appearance_count,
                AVG(rssi) as avg_rssi,
                COUNT(DISTINCT strftime('%Y-%m-%d', timestamp)) as days_active,
                MAX(timestamp) as last_seen,
                MIN(timestamp) as first_seen,
                COUNT(DISTINCT strftime('%H', timestamp)) as active_hours
            FROM scans 
            GROUP BY fingerprint
            HAVING appearance_count > 10
        )
        SELECT 
            CASE 
                WHEN days_active >= 7 AND appearance_count >= 100 THEN 'Permanent'
                WHEN days_active >= 3 THEN 'Regular'
                WHEN appearance_count >= 50 THEN 'Frequent'
                ELSE 'Occasional'
            END as device_type,
            COUNT(*) as count,
            AVG(appearance_count) as avg_appearances,
            AVG(active_hours) as avg_active_hours
        FROM device_stats
        GROUP BY device_type
        ORDER BY 
            CASE device_type
                WHEN 'Permanent' THEN 1
                WHEN 'Regular' THEN 2
                WHEN 'Frequent' THEN 3
                WHEN 'Occasional' THEN 4
            END
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error getting device behaviour data:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        console.log('Device behaviour data:', rows);

        // Process the data for the pie chart
        const processedData = {
            labels: rows.map(row => row.device_type),
            values: rows.map(row => row.count),
            metadata: rows.map(row => ({
                avgAppearances: Math.round(row.avg_appearances),
                avgActiveHours: Math.round(row.avg_active_hours)
            }))
        };

        res.json(processedData);
    });
});

// Network Stats Endpoints
router.get('/api/network/peak-usage', (req, res) => {
    const query = `
        SELECT 
            strftime('%Y-%m-%d %H:%M', timestamp) as minute_block,
            COUNT(*) as scan_count,
            COUNT(DISTINCT fingerprint) as unique_devices,
            AVG(rssi) as avg_signal
        FROM scans 
        GROUP BY minute_block
        ORDER BY scan_count DESC
        LIMIT 100
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            timeLabels: rows.map(row => row.minute_block),
            scanCounts: rows.map(row => row.scan_count),
            deviceCounts: rows.map(row => row.unique_devices),
            signalStrengths: rows.map(row => row.avg_signal)
        });
    });
});

// Add this endpoint to your stats.js file
router.get('/api/environment/propagation', (req, res) => {
    const query = `
        SELECT 
            fingerprint,
            rssi,
            tx_power_level,
            (tx_power_level - rssi) as path_loss
        FROM scans 
        WHERE tx_power_level IS NOT NULL
        ORDER BY timestamp
        LIMIT 1000
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Calculate distance using the path loss model
        const pathLossData = rows.map(row => {
            // Simple distance estimation using the log-distance path loss model
            // Distance = 10^((txPower - rssi)/(10 * n))
            // where n is the path loss exponent (typically 2-4)
            const n = 2.5; // Average path loss exponent for indoor environments
            const distance = Math.pow(10, (row.tx_power_level - row.rssi) / (10 * n));

            return {
                x: distance,  // Estimated distance in meters
                y: row.path_loss,  // Path loss in dB
                rssi: row.rssi,
                txPower: row.tx_power_level,
                fingerprint: row.fingerprint
            };
        });

        console.log(`Processed ${pathLossData.length} propagation data points`);
        res.json({ pathLossData });
    });
});

// Add this endpoint to your stats.js file
router.get('/api/environment/interference', (req, res) => {
    const query = `
        SELECT 
            strftime('%Y-%m-%d %H:00', timestamp) as hour_block,
            AVG(rssi) as avg_rssi,
            COUNT(DISTINCT fingerprint) as device_count,
            MIN(rssi) as min_rssi,
            MAX(rssi) as max_rssi,
            COUNT(*) as total_readings
        FROM scans 
        GROUP BY hour_block
        ORDER BY hour_block
        LIMIT 168  -- One week of hourly data
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log(`Processing interference data for ${rows.length} time blocks`);

        // Calculate signal variance and interference metrics
        const processedData = rows.map(row => ({
            timeBlock: row.hour_block,
            avgRssi: parseFloat(row.avg_rssi.toFixed(1)),
            deviceCount: row.device_count,
            signalRange: row.max_rssi - row.min_rssi,
            readingDensity: row.total_readings / row.device_count,
            interferenceScore: calculateInterferenceScore(
                row.avg_rssi,
                row.min_rssi,
                row.max_rssi,
                row.device_count,
                row.total_readings
            )
        }));

        res.json({
            timeLabels: processedData.map(d => d.timeBlock),
            rssiValues: processedData.map(d => d.avgRssi),
            deviceCounts: processedData.map(d => d.deviceCount),
            interferenceScores: processedData.map(d => d.interferenceScore),
            signalRanges: processedData.map(d => d.signalRange)
        });
    });
});

// Helper function to calculate distance (you can add this near other utility functions)
function calculateDistance(rssi, txPower) {
    const n = 2.5; // Average path loss exponent for indoor environments
    return Math.pow(10, (txPower - rssi) / (10 * n));
}

// Helper function to calculate interference score
function calculateInterferenceScore(avgRssi, minRssi, maxRssi, deviceCount, totalReadings) {
    // Normalize RSSI range to 0-1 scale (typical BLE RSSI range: -100 to 0)
    const normalizedAvgRssi = Math.abs(avgRssi) / 100;
    const signalSpread = (maxRssi - minRssi) / 100;
    
    // Device density factor (more devices = more potential interference)
    const deviceDensity = Math.min(deviceCount / 10, 1); // Normalize to max of 1
    
    // Reading density factor (more readings per device might indicate interference)
    const readingDensity = Math.min((totalReadings / deviceCount) / 100, 1);
    
    // Combine factors with weights
    const interferenceScore = (
        (normalizedAvgRssi * 0.3) +
        (signalSpread * 0.3) +
        (deviceDensity * 0.2) +
        (readingDensity * 0.2)
    );
    
    // Return score from 0-100
    return Math.round(interferenceScore * 100);
}

// Add this endpoint to your stats.js file
router.get('/api/device-types/manufacturers', (req, res) => {
    const query = `
        WITH manufacturer_stats AS (
            SELECT 
                manufacturer_data,
                COUNT(DISTINCT fingerprint) as device_count,
                AVG(rssi) as avg_signal_strength,
                GROUP_CONCAT(DISTINCT service_uuids) as services,
                COUNT(*) as total_appearances,
                COUNT(DISTINCT strftime('%Y-%m-%d', timestamp)) as days_seen
            FROM scans 
            WHERE manufacturer_data IS NOT NULL
            GROUP BY manufacturer_data
        )
        SELECT 
            COALESCE(manufacturer_data, 'Unknown') as manufacturer_data,
            device_count,
            round(avg_signal_strength, 1) as avg_signal_strength,
            services,
            total_appearances,
            days_seen,
            round(CAST(total_appearances AS FLOAT) / device_count, 1) as appearances_per_device
        FROM manufacturer_stats
        ORDER BY device_count DESC, avg_signal_strength DESC
        LIMIT 20
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error getting manufacturer data:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        console.log(`Found ${rows.length} manufacturer records`);

        // Process the manufacturer data
        const processedData = {
            manufacturers: rows.map(row => ({
                manufacturer: row.manufacturer_data,
                deviceCount: row.device_count,
                avgSignalStrength: row.avg_signal_strength,
                services: row.services ? row.services.split(',') : [],
                totalAppearances: row.total_appearances,
                daysActive: row.days_seen,
                appearancesPerDevice: row.appearances_per_device
            }))
        };

        // Add summary statistics
        processedData.summary = {
            totalManufacturers: rows.length,
            totalDevices: rows.reduce((sum, row) => sum + row.device_count, 0),
            averageSignalStrength: rows.reduce((sum, row) => sum + row.avg_signal_strength, 0) / rows.length,
            mostCommonServices: getMostCommonServices(rows)
        };

        res.json(processedData);
    });
});

// Helper function to find most common services
function getMostCommonServices(rows) {
    const serviceCount = {};
    rows.forEach(row => {
        if (row.services) {
            row.services.split(',').forEach(service => {
                service = service.trim();
                serviceCount[service] = (serviceCount[service] || 0) + 1;
            });
        }
    });

    // Convert to array and sort by count
    return Object.entries(serviceCount)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Return top 5 services
}

// Add this endpoint to your stats.js file
router.get('/api/network/channel-utilisation', (req, res) => {
    const query = `
        WITH hourly_stats AS (
            SELECT 
                strftime('%Y-%m-%d %H', timestamp) as hour_block,
                COUNT(*) as transmission_count,
                COUNT(DISTINCT fingerprint) as active_devices,
                AVG(rssi) as avg_signal_strength,
                COUNT(DISTINCT service_uuids) as unique_services
            FROM scans 
            GROUP BY hour_block
            ORDER BY hour_block
            LIMIT 168  -- One week of hourly data
        )
        SELECT 
            hour_block,
            transmission_count,
            active_devices,
            CAST(transmission_count AS FLOAT) / active_devices as transmissions_per_device,
            avg_signal_strength,
            unique_services,
            CAST(transmission_count AS FLOAT) / (60 * active_devices) as channel_load_factor
        FROM hourly_stats
        WHERE active_devices > 0
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error getting channel utilisation data:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        console.log(`Processing channel utilisation data for ${rows.length} time blocks`);

        // Process the data
        const processedData = {
            timeLabels: rows.map(row => row.hour_block),
            transmissionCounts: rows.map(row => row.transmission_count),
            activeDevices: rows.map(row => row.active_devices),
            transmissionsPerDevice: rows.map(row => parseFloat(row.transmissions_per_device.toFixed(2))),
            channelLoadFactors: rows.map(row => parseFloat(row.channel_load_factor.toFixed(3))),
            signalStrengths: rows.map(row => parseFloat(row.avg_signal_strength.toFixed(1))),
            uniqueServices: rows.map(row => row.unique_services)
        };

        // Add utilisation metrics
        processedData.metrics = {
            averageChannelLoad: calculateAverageChannelLoad(rows),
            peakUtilisation: calculatePeakUtilisation(rows),
            deviceDensity: calculateDeviceDensity(rows),
            timeBlocks: rows.length
        };

        res.json(processedData);
    });
});

// Helper functions for channel utilisation calculations
function calculateAverageChannelLoad(rows) {
    const sum = rows.reduce((acc, row) => acc + row.channel_load_factor, 0);
    return parseFloat((sum / rows.length).toFixed(3));
}

function calculatePeakUtilisation(rows) {
    const peak = rows.reduce((max, row) => {
        return Math.max(max, row.transmission_count / row.active_devices);
    }, 0);
    return parseFloat(peak.toFixed(2));
}

function calculateDeviceDensity(rows) {
    const avgDevices = rows.reduce((sum, row) => sum + row.active_devices, 0) / rows.length;
    return Math.round(avgDevices);
}

// Error Handling Middleware
router.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Cleanup on process exit
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

module.exports = router; 