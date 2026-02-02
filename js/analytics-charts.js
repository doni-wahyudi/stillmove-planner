/**
 * Analytics Charts - Wrapper classes for Chart.js visualizations
 * Provides theme-aware configurations and reusable chart components
 * 
 * Requirements: 7.3, 7.5
 */

/**
 * Common chart options and theme-aware colors
 */
const CHART_THEME = {
    colors: {
        primary: '#6366f1', // Indigo 500
        secondary: '#10b981', // Emerald 500
        danger: '#ef4444', // Red 500
        warning: '#f59e0b', // Amber 500
        info: '#3b82f6', // Blue 500
        gray: '#94a3b8', // Slate 400
        priority: {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#10b981',
            none: '#94a3b8'
        }
    },
    getThemeColors: () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        return {
            text: isDark ? '#f1f5f9' : '#1e293b',
            grid: isDark ? 'rgba(241, 245, 249, 0.1)' : 'rgba(30, 41, 59, 0.1)',
            background: isDark ? '#1e293b' : '#ffffff'
        };
    }
};

class BaseAnalyticsChart {
    constructor(canvasId, options = {}) {
        this.canvasId = canvasId;
        this.options = options;
        this.chart = null;
        this.colors = CHART_THEME.getThemeColors();
    }

    /**
     * Common options for all analytics charts
     */
    getCommonOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: this.colors.text,
                        font: { family: "'Quicksand', sans-serif", weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 10,
                    bodyFont: { family: "'Poppins', sans-serif" }
                }
            },
            scales: {
                x: {
                    grid: { color: this.colors.grid },
                    ticks: { color: this.colors.text }
                },
                y: {
                    grid: { color: this.colors.grid },
                    ticks: { color: this.colors.text }
                }
            }
        };
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    updateData(newData) {
        if (this.chart) {
            this.chart.data = newData;
            this.chart.update();
        }
    }
}

/**
 * Line Chart wrapper for trends (Cycle Time, WIP, etc.)
 */
export class AnalyticsLineChart extends BaseAnalyticsChart {
    render(labels, datasets) {
        this.destroy();
        const ctx = document.getElementById(this.canvasId).getContext('2d');

        this.chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                ...this.getCommonOptions(),
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    ...this.getCommonOptions().scales,
                    y: {
                        ...this.getCommonOptions().scales.y,
                        beginAtZero: true
                    }
                }
            }
        });
        return this.chart;
    }
}

/**
 * Bar Chart wrapper for metrics (Completion, Priority)
 */
export class AnalyticsBarChart extends BaseAnalyticsChart {
    render(labels, datasets) {
        this.destroy();
        const ctx = document.getElementById(this.canvasId).getContext('2d');

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                ...this.getCommonOptions(),
                scales: {
                    ...this.getCommonOptions().scales,
                    y: {
                        ...this.getCommonOptions().scales.y,
                        beginAtZero: true
                    }
                }
            }
        });
        return this.chart;
    }
}

/**
 * Area/Cumulative Flow Chart wrapper
 */
export class CumulativeFlowChart extends BaseAnalyticsChart {
    render(labels, datasets) {
        this.destroy();
        const ctx = document.getElementById(this.canvasId).getContext('2d');

        this.chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                ...this.getCommonOptions(),
                elements: {
                    line: { fill: true }
                },
                scales: {
                    x: this.getCommonOptions().scales.x,
                    y: {
                        ...this.getCommonOptions().scales.y,
                        stacked: true,
                        beginAtZero: true
                    }
                },
                plugins: {
                    ...this.getCommonOptions().plugins,
                    filler: { propagate: true }
                }
            }
        });
        return this.chart;
    }
}

// Export theme for use in other components
export { CHART_THEME };
