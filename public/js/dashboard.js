/**
 * BLE Scanner Dashboard - Main Dashboard JavaScript
 * 
 * Handles the main dashboard functionality including real-time updates,
 * chart rendering, and data display.
 * 
 * Features:
 * - Real-time data updates
 * - Interactive charts
 * - Device list management
 * - Error handling and notifications
 * 
 * Charts:
 * - Hourly Activity
 * - RSSI Distribution
 * - Device Statistics
 * 
 * Dependencies:
 * - Chart.js: Chart rendering
 * - Bootstrap: UI components
 * 
 * Created: 14/Apr/2025
 * Last Updated: 14/Apr/2025
 */

// Global chart configurations
const chartConfig = {
    // ... configuration details ...
};

// Calculate estimated distance from RSSI
function calculateDistance(rssi, txPower = -59, n = 2.7) {
    return Math.pow(10, (txPower - rssi) / (10 * n));
}

// Format distance for display
function formatDistance(distance) {
    if (distance < 1) {
        return `${(distance * 100).toFixed(1)} cm`;
    }
    return `${distance.toFixed(1)} m`;
}

// Format date to UK style
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Fetch and display overview statistics
async function loadOverview() {
    try {
        console.log('Fetching overview data...');
        const response = await fetch('/api/stats/overview');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Overview data received:', data);
        
        document.getElementById('totalScans').textContent = data.totalScans?.count?.toLocaleString() || '0';
        document.getElementById('uniqueDevices').textContent = data.uniqueDevices?.count?.toLocaleString() || '0';
        
        if (data.timeRange?.first_scan && data.timeRange?.last_scan) {
            const firstScan = new Date(data.timeRange.first_scan);
            const lastScan = new Date(data.timeRange.last_scan);
            document.getElementById('timeRange').textContent = 
                `${formatDate(firstScan)} to ${formatDate(lastScan)}`;
        } else {
            document.getElementById('timeRange').textContent = 'No data available';
        }
    } catch (error) {
        console.error('Error loading overview:', error);
        document.getElementById('totalScans').textContent = 'Error';
        document.getElementById('uniqueDevices').textContent = 'Error';
        document.getElementById('timeRange').textContent = 'Error loading data';
    }
}

// Create hourly activity chart
async function createHourlyChart() {
    try {
        console.log('Fetching hourly data...');
        const response = await fetch('/api/stats/hourly');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Hourly data received:', data);
        
        const ctx = document.getElementById('hourlyChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => `${item.hour}:00`),
                datasets: [{
                    label: 'Number of Scans',
                    data: data.map(item => item.count),
                    backgroundColor: 'rgba(13, 110, 253, 0.5)',
                    borderColor: 'rgba(13, 110, 253, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Scans'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Hour of Day'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating hourly chart:', error);
        document.getElementById('hourlyChart').parentElement.innerHTML = 
            '<div class="alert alert-danger">Error loading hourly data</div>';
    }
}

// Create RSSI distribution chart
async function createRSSIChart() {
    try {
        console.log('Fetching RSSI data...');
        const response = await fetch('/api/stats/rssi');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('RSSI data received:', data);

        // Add estimated distances to the data
        data.forEach(item => {
            item.estimated_distance = calculateDistance(item.avg_rssi);
        });
        
        const ctx = document.getElementById('rssiChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => `${item.fingerprint.substring(0, 8)}\n(~${formatDistance(item.estimated_distance)})`),
                datasets: [{
                    label: 'Average RSSI (dBm)',
                    data: data.map(item => item.avg_rssi),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Signal Strength (dBm)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Device Fingerprint (with estimated distance)'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const item = data[context.dataIndex];
                                return [
                                    `RSSI: ${item.avg_rssi.toFixed(1)} dBm`,
                                    `Est. Distance: ${formatDistance(item.estimated_distance)}`,
                                    `Range: ${item.min_rssi} to ${item.max_rssi} dBm`
                                ];
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating RSSI chart:', error);
        document.getElementById('rssiChart').parentElement.innerHTML = 
            '<div class="alert alert-danger">Error loading RSSI data</div>';
    }
}

// Load and display device list
async function loadDeviceList() {
    try {
        console.log('Fetching device list...');
        const response = await fetch('/api/stats/devices');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Device list received:', data);
        
        const tbody = document.getElementById('deviceList');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No devices found</td></tr>';
            return;
        }
        
        data.forEach(device => {
            if (!device.avg_rssi) {
                console.warn('Device missing avg_rssi:', device);
                device.avg_rssi = -100; // Default value if missing
            }
            const estimatedDistance = calculateDistance(device.avg_rssi);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${device.fingerprint || 'Unknown'}</td>
                <td>${device.first_seen ? formatDate(device.first_seen) : 'N/A'}</td>
                <td>${device.last_seen ? formatDate(device.last_seen) : 'N/A'}</td>
                <td>${device.reading_count || 0}</td>
                <td>${device.avg_rssi.toFixed(1)} dBm</td>
                <td>${formatDistance(estimatedDistance)}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading device list:', error);
        const errorMessage = error.toString();
        document.getElementById('deviceList').innerHTML = 
            `<tr><td colspan="6" class="text-center">Error loading device list: ${errorMessage}</td></tr>`;
            
        // Show error toast
        const errorToast = document.getElementById('errorToast');
        const errorToastBody = document.getElementById('errorToastBody');
        if (errorToast && errorToastBody) {
            errorToastBody.textContent = `Failed to load device list: ${errorMessage}`;
            const toast = new bootstrap.Toast(errorToast);
            toast.show();
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');
    loadOverview();
    createHourlyChart();
    createRSSIChart();
    loadDeviceList();
    
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
    
    // Refresh data every 5 minutes
    setInterval(() => {
        loadOverview();
        loadDeviceList();
    }, 300000);
});

// Update status messages and labels
function updateStatus(data) {
    document.getElementById('optimisationStatus').textContent = data.status;
    document.getElementById('utilisationLevel').textContent = data.level;
} 