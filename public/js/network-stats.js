/**
 * BLE Scanner Dashboard - Network Load Analysis
 * 
 * Analyses and visualises network load patterns including peak usage,
 * channel utilisation, and transmission rates.
 * 
 * Charts:
 * - Peak Usage Periods: Shows times of highest network activity
 * - Channel Utilization: Shows network channel usage patterns
 * - Device Transmission Rates: Shows average transmissions per device
 * 
 * Data Processing:
 * - Time-based analysis
 * - Load level calculations
 * - Statistical summaries
 * 
 * Created: 14/Apr/2025
 * Last Updated: 14/Apr/2025
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Loading network statistics...');

    // Fetch and display peak usage data
    fetch('/api/network/peak-usage')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Peak usage data received:', data);
            const ctx = document.getElementById('peakUsageChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.timeLabels,
                    datasets: [
                        {
                            label: 'Scan Count',
                            data: data.scanCounts,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            yAxisID: 'y',
                            fill: true
                        },
                        {
                            label: 'Unique Devices',
                            data: data.deviceCounts,
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.1)',
                            yAxisID: 'y1',
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Network Activity Over Time'
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Scan Count'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Unique Devices'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading peak usage data:', error);
            const canvas = document.getElementById('peakUsageChart');
            const container = canvas.parentElement;
            container.innerHTML = `<div class="alert alert-danger">Error loading peak usage data: ${error.message}</div>`;
        });

    // Fetch and display channel utilization
    fetch('/api/network/channel-utilisation')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Channel utilization data received:', data);
            const ctx = document.getElementById('channelUtilizationChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.timeLabels,
                    datasets: [{
                        label: 'Active Devices',
                        data: data.activeDevices,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Channel Utilisation Over Time'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Utilisation %'
                            }
                        }
                    }
                }
            });

            // Create transmission rates chart
            const ctx2 = document.getElementById('transmissionRatesChart').getContext('2d');
            new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: data.timeLabels,
                    datasets: [{
                        label: 'Transmissions per Device',
                        data: data.transmissionsPerDevice,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Average Transmissions per Device'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Transmissions/Device'
                            }
                        }
                    }
                }
            });

            // Update the network load summary table
            updateNetworkLoadTable(data);
        })
        .catch(error => {
            console.error('Error loading channel utilization data:', error);
            ['channelUtilizationChart', 'transmissionRatesChart'].forEach(id => {
                const canvas = document.getElementById(id);
                const container = canvas.parentElement;
                container.innerHTML = `<div class="alert alert-danger">Error loading chart data: ${error.message}</div>`;
            });
        });

    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

function updateNetworkLoadTable(data) {
    const tbody = document.getElementById('networkLoadList');
    tbody.innerHTML = '';

    // Get the last 24 entries (assuming hourly data)
    const recentData = {
        timeLabels: data.timeLabels.slice(-24),
        activeDevices: data.activeDevices.slice(-24),
        transmissionCounts: data.transmissionCounts.slice(-24),
        transmissionsPerDevice: data.transmissionsPerDevice.slice(-24)
    };

    console.log('Sample time label:', recentData.timeLabels[0]); // Debug log

    recentData.timeLabels.forEach((time, index) => {
        const formattedTime = formatDateTime(time);
        console.log(`Converting ${time} to ${formattedTime}`); // Debug log
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td>${recentData.activeDevices[index]}</td>
            <td>${recentData.transmissionCounts[index]}</td>
            <td>${recentData.transmissionsPerDevice[index].toFixed(2)}</td>
            <td>${calculateLoadLevel(recentData.transmissionsPerDevice[index])}</td>
        `;
        tbody.appendChild(row);
    });
}

function formatDateTime(dateTimeStr) {
    try {
        // First check if we need to add seconds to the date string
        if (dateTimeStr.length <= 16) {
            dateTimeStr += ':00';
        }
        
        // Parse the date string
        const date = new Date(dateTimeStr.replace(' ', 'T'));
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date string received:', dateTimeStr);
            return 'Invalid Date';
        }

        // Format using UK date format
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // Use 24-hour format
        });
    } catch (error) {
        console.error('Error formatting date:', error, 'for date string:', dateTimeStr);
        return 'Date Error';
    }
}

function calculateLoadLevel(transmissionsPerDevice) {
    if (transmissionsPerDevice > 10) return 'High';
    if (transmissionsPerDevice > 5) return 'Medium';
    return 'Low';
} 