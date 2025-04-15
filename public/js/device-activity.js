/**
 * BLE Scanner Dashboard - Device Activity Analysis
 * 
 * Visualises device activity patterns including temporal analysis,
 * dwell time distribution, and presence patterns.
 * 
 * Charts:
 * - Daily Activity Heatmap: Shows device activity by day and hour
 * - Dwell Time Distribution: Shows how long devices typically remain
 * - Device Presence Patterns: Shows consistency of device appearances
 * 
 * API Endpoints Used:
 * - /api/device-activity/heatmap
 * - /api/device-activity/dwell-time
 * - /api/device-activity/presence
 * 
 * Created: 14/Apr/2025
 * Last Updated: 14/Apr/2025
 */

// Device Activity Analysis
document.addEventListener('DOMContentLoaded', function() {
    // Add error handling and logging
    console.log('Loading device activity data...');
    
    // Fetch and display activity heatmap
    fetch('/api/device-activity/heatmap')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Heatmap data received:', data);
            const ctx = document.getElementById('activityHeatmap').getContext('2d');
            
            // Process data for scatter plot
            const processedData = data.heatmapData.map(point => ({
                x: point.x,
                y: point.y,
                r: Math.sqrt(point.devices) * 5, // Size based on device count
                devices: point.devices
            }));

            new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        data: processedData,
                        backgroundColor: (context) => {
                            const value = context.raw.devices;
                            const alpha = Math.min(0.2 + (value / 20), 0.8); // Adjust opacity based on device count
                            return `rgba(54, 162, 235, ${alpha})`;
                        },
                        pointRadius: (context) => context.raw.r,
                        pointHoverRadius: (context) => context.raw.r + 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 20,
                            right: 20,
                            bottom: 30,
                            left: 20
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Device Activity by Day and Hour',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const hour = context.raw.x;
                                    const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][context.raw.y];
                                    return [
                                        `Day: ${day}`,
                                        `Hour: ${hour}:00`,
                                        `Devices: ${context.raw.devices}`
                                    ];
                                }
                            }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            min: -0.5,
                            max: 6.5,
                            ticks: {
                                callback: function(value) {
                                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                    return days[value] || '';
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            min: -0.5,
                            max: 23.5,
                            ticks: {
                                callback: function(value) {
                                    return `${value}:00`;
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading heatmap data:', error);
            const canvas = document.getElementById('activityHeatmap');
            const container = canvas.parentElement;
            container.innerHTML = `<div class="alert alert-danger">Error loading heatmap data: ${error.message}</div>`;
        });

    // Add some CSS to ensure the chart container has a proper height
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.style.height = '400px';
    }

    // Fetch and display dwell time distribution
    fetch('/api/device-activity/dwell-time')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('dwellTimeChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Number of Devices',
                        data: data.values,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Device Dwell Time Distribution'
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
                                text: 'Dwell Time (minutes)'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error loading dwell time data:', error));

    // Fetch and display device presence patterns
    fetch('/api/device-activity/presence')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Presence data received:', data);
            const ctx = document.getElementById('presenceChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.dates,
                    datasets: [
                        {
                            label: 'Unique Devices',
                            data: data.uniqueDevices,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            yAxisID: 'y',
                            fill: true
                        },
                        {
                            label: 'Avg Active Hours',
                            data: data.avgActiveHours,
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
                            text: 'Device Presence Over Time'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.raw;
                                    if (context.datasetIndex === 0) {
                                        return `${label}: ${value} devices`;
                                    } else {
                                        return `${label}: ${value.toFixed(1)} hours`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Unique Devices'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Average Active Hours'
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
            console.error('Error loading presence data:', error);
            const canvas = document.getElementById('presenceChart');
            const container = canvas.parentElement;
            container.innerHTML = `<div class="alert alert-danger">Error loading presence data: ${error.message}</div>`;
        });
}); 