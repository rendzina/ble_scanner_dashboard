/**
 * BLE Scanner Dashboard - Device Classification
 * 
 * Analyses and visualises device types and classifications based on
 * behaviour patterns and manufacturer data.
 * 
 * Charts:
 * - Device Categories: Pie chart of device behaviour patterns
 * - Manufacturer Distribution: Distribution of device manufacturers
 * 
 * Features:
 * - Device classification by behaviour
 * - Manufacturer analysis
 * - Detailed device information table
 * 
 * Created: 14/Apr/2025
 * Last Updated: 14/Apr/2025
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Loading device classification data...');

    // Fetch and display device categories
    fetch('/api/device-types/behaviour')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Device categories data received:', data);
            const ctx = document.getElementById('deviceCategoriesChart').getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(75, 192, 192, 0.8)',
                            'rgba(255, 206, 86, 0.8)',
                            'rgba(255, 99, 132, 0.8)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 10,
                            bottom: 10
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'right',
                            align: 'center'
                        },
                        title: {
                            display: true,
                            text: 'Device Categories by Behaviour'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading device categories:', error);
            const canvas = document.getElementById('deviceCategoriesChart');
            const container = canvas.parentElement;
            container.innerHTML = `<div class="alert alert-danger">Error loading device categories: ${error.message}</div>`;
        });

    // Fetch and display manufacturer distribution
    fetch('/api/device-types/manufacturers')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Manufacturer data received:', data);
            const ctx = document.getElementById('manufacturerChart').getContext('2d');
            
            // Process manufacturer data
            const manufacturers = data.manufacturers.slice(0, 10); // Top 10 manufacturers
            const chartData = {
                labels: manufacturers.map(m => m.manufacturer_data || 'Unknown'),
                datasets: [{
                    label: 'Device Count',
                    data: manufacturers.map(m => m.device_count),
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderWidth: 1
                }]
            };

            new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Top Manufacturers by Device Count'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Devices'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Manufacturer'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading manufacturer data:', error);
            const canvas = document.getElementById('manufacturerChart');
            const container = canvas.parentElement;
            container.innerHTML = `<div class="alert alert-danger">Error loading manufacturer data: ${error.message}</div>`;
        });

    // Load detailed device classification list
    fetch('/api/device-types/details')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Device details received:', data);
            const tbody = document.getElementById('deviceClassificationList');
            tbody.innerHTML = '';

            if (!data.devices || data.devices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No device details found</td></tr>';
                return;
            }

            data.devices.forEach(device => {
                const signalStats = JSON.parse(device.signal_stats);
                const presenceStats = JSON.parse(device.presence_stats);
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${device.fingerprint || 'Unknown'}</td>
                    <td>${device.category || 'Unknown'}</td>
                    <td>${device.manufacturer || 'Unknown'}</td>
                    <td>${formatServices(device.services)}</td>
                    <td>${formatSignalPattern(signalStats)}</td>
                    <td>${formatPresencePattern(presenceStats)}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading device classification details:', error);
            document.getElementById('deviceClassificationList').innerHTML = 
                `<tr><td colspan="6" class="text-center text-danger">
                    Error loading device details: ${error.message}
                </td></tr>`;
        });

    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Utility functions for formatting
function formatServices(services) {
    if (!services) return 'None';
    return services.split(',').map(s => s.trim()).join(', ');
}

function formatSignalPattern(stats) {
    if (!stats) return 'N/A';
    return `Avg: ${stats.avg_rssi.toFixed(1)} dBm<br>Range: ${stats.min_rssi} to ${stats.max_rssi} dBm`;
}

function formatPresencePattern(stats) {
    if (!stats) return 'N/A';
    return `${stats.days_active} days<br>${stats.total_hours} hours total`;
} 