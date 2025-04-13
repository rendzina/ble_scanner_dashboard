/**
 * BLE Scanner Dashboard - Environmental Analysis
 * 
 * Analyses and visualises environmental factors affecting BLE signals,
 * including signal propagation and interference patterns.
 * 
 * Charts:
 * - Signal Propagation Analysis: Shows signal strength vs. distance
 * - Interference Patterns: Shows signal quality over time
 * - Path Loss Analysis: Shows signal degradation patterns
 * - Environmental Impact: Shows external factors affecting signals
 * 
 * Features:
 * - Signal strength mapping
 * - Interference detection
 * - Path loss calculations
 * - Environmental correlation analysis
 * 
 * API Endpoints Used:
 * - /api/environment/propagation
 * - /api/environment/interference
 * 
 * Dependencies:
 * - Chart.js: Chart rendering
 * - Bootstrap: UI components
 * 
 * Created: 14/Apr/2025
 * Last Updated: 14/Apr/2025
 */

// Environmental Analysis
document.addEventListener('DOMContentLoaded', function() {
    // Fetch and display signal propagation analysis
    fetch('/api/environment/propagation')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('propagationChart').getContext('2d');
            new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Signal Path Loss',
                        data: data.pathLossData,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Signal Path Loss vs Distance'
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true,
                                text: 'Path Loss (dB)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Estimated Distance (m)'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error loading propagation data:', error));

    // Fetch and display interference patterns
    fetch('/api/environment/interference')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('interferenceChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.timeLabels,
                    datasets: [{
                        label: 'Average RSSI',
                        data: data.rssiValues,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Signal Interference Over Time'
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true,
                                text: 'Average RSSI (dBm)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error loading interference data:', error));
}); 