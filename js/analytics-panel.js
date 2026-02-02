/**
 * Analytics Panel Controller - Manages the board analytics UI
 * Handles chart initialization, date range selection, and data updates.
 * 
 * Requirements: 5.2, 5.4, 6.3, 6.4, 7.4
 */

import analyticsService from './analytics-service.js';
import { AnalyticsLineChart, AnalyticsBarChart, CumulativeFlowChart, CHART_THEME } from './analytics-charts.js';

class AnalyticsPanel {
    constructor() {
        this.boardId = null;
        this.dateRange = this.getDefaultDateRange();
        this.charts = {};
        this.container = null;
        this.isOpen = false;
    }

    /**
     * Initialize the panel within a container
     * @param {string} containerId - Container to inject panel into (optional)
     */
    async init(containerId = 'app-modals') {
        const response = await fetch('views/analytics-panel.html');
        const html = await response.text();

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        this.container = wrapper.firstElementChild;
        document.body.appendChild(this.container);

        this.setupEventListeners();
        this.initCharts();
    }

    /**
     * Get default date range (last 30 days)
     */
    getDefaultDateRange() {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    }

    /**
     * Set up UI event listeners
     */
    setupEventListeners() {
        this.container.querySelector('#close-analytics-btn').onclick = () => this.close();

        this.container.querySelectorAll('.btn-preset').forEach(btn => {
            btn.onclick = (e) => {
                const range = e.target.dataset.range;
                this.handlePresetChange(range, e.target);
            };
        });

        this.container.querySelector('#apply-custom-range-btn').onclick = () => this.applyCustomRange();
    }

    /**
     * Initialize chart wrapper instances
     */
    initCharts() {
        this.charts.completionTrend = new AnalyticsLineChart('completion-trend-chart');
        this.charts.priorityBreakdown = new AnalyticsBarChart('priority-breakdown-chart');
        this.charts.cycleTimeTrend = new AnalyticsLineChart('cycle-time-trend-chart');
        this.charts.columnTime = new AnalyticsBarChart('column-time-chart');
        this.charts.cumulativeFlow = new CumulativeFlowChart('cumulative-flow-chart');
        this.charts.throughput = new AnalyticsLineChart('throughput-chart');
        this.charts.burnup = new AnalyticsLineChart('burnup-chart');
    }

    /**
     * Open the panel for a specific board
     * @param {string} boardId 
     */
    async open(boardId) {
        this.boardId = boardId;
        this.isOpen = true;
        this.container.style.display = 'flex';
        document.body.classList.add('analytics-panel-open');
        await this.refresh();
    }

    /**
     * Close the panel
     */
    close() {
        this.isOpen = false;
        this.container.style.display = 'none';
        document.body.classList.remove('analytics-panel-open');
    }

    /**
     * Handle preset selection (7d, 30d, etc.)
     */
    handlePresetChange(days, button) {
        this.container.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        button.classList.add('active');

        const customRange = this.container.querySelector('#custom-date-range');
        if (days === 'custom') {
            customRange.style.display = 'flex';
            return;
        }

        customRange.style.display = 'none';
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - parseInt(days));

        this.dateRange = {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
        this.refresh();
    }

    /**
     * Apply custom date range from inputs
     */
    applyCustomRange() {
        const start = this.container.querySelector('#analytics-start-date').value;
        const end = this.container.querySelector('#analytics-end-date').value;

        if (start && end) {
            this.dateRange = { startDate: start, endDate: end };
            this.refresh();
        }
    }

    /**
     * Fetch data and update all charts
     */
    async refresh() {
        if (!this.boardId) return;

        // Show loading state (could add spinner here)
        try {
            const data = await analyticsService.getBoardAnalytics(this.boardId, this.dateRange);
            this.updateUI(data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            // Handle error state
        }
    }

    /**
     * Update UI elements and charts with new data
     * @param {BoardAnalytics} data 
     */
    updateUI(data) {
        // Update Health Indicators
        this.updateHealthCards(data.health);

        // Update Summary Stats
        document.getElementById('total-completed-val').textContent = data.completion.totalCompleted;
        document.getElementById('completion-rate-val').textContent = Math.round(data.completion.completionRate);
        document.getElementById('avg-cycle-time-val').textContent = (data.cycleTime.avgCycleTimeMs / (1000 * 60 * 60 * 24)).toFixed(1);

        // Render Charts
        this.renderCompletionCharts(data.completion);
        this.renderCycleTimeCharts(data.cycleTime);
        this.renderThroughputCharts(data.throughput);
    }

    updateHealthCards(health) {
        const overdue = this.container.querySelector('#health-overdue');
        const stale = this.container.querySelector('#health-stale');
        const wip = this.container.querySelector('#health-wip');

        overdue.querySelector('.count').textContent = health.overdueCount;
        stale.querySelector('.count').textContent = health.staleCount;
        wip.querySelector('.count').textContent = health.wipViolationCount;

        overdue.className = `health-card ${health.overdueCount > 0 ? 'danger' : 'success'}`;
        stale.className = `health-card ${health.staleCount > 0 ? 'warning' : 'success'}`;
        wip.className = `health-card ${health.wipViolationCount > 0 ? 'danger' : 'success'}`;
    }

    renderCompletionCharts(completion) {
        this.charts.completionTrend.render(
            completion.dailyCompletions.map(d => d.date),
            [{
                label: 'Completions',
                data: completion.dailyCompletions.map(d => d.count),
                borderColor: CHART_THEME.colors.primary,
                backgroundColor: CHART_THEME.colors.primary + '33',
                fill: true,
                tension: 0.4
            }]
        );

        this.charts.priorityBreakdown.render(
            ['High', 'Medium', 'Low', 'None'],
            [{
                label: 'Cards',
                data: [
                    completion.byPriority.high,
                    completion.byPriority.medium,
                    completion.byPriority.low,
                    completion.byPriority.none
                ],
                backgroundColor: [
                    CHART_THEME.colors.priority.high,
                    CHART_THEME.colors.priority.medium,
                    CHART_THEME.colors.priority.low,
                    CHART_THEME.colors.priority.none
                ]
            }]
        );
    }

    renderCycleTimeCharts(cycleTime) {
        this.charts.cycleTimeTrend.render(
            cycleTime.trends.map(d => d.date),
            [{
                label: 'Cycle Time (Days)',
                data: cycleTime.trends.map(d => (d.avgTimeMs / (1000 * 60 * 60 * 24)).toFixed(1)),
                borderColor: CHART_THEME.colors.secondary,
                tension: 0.4
            }]
        );

        this.charts.columnTime.render(
            cycleTime.columnTimes.map(ct => ct.columnTitle),
            [{
                label: 'Avg Days',
                data: cycleTime.columnTimes.map(ct => (ct.avgTimeMs / (1000 * 60 * 60 * 24)).toFixed(1)),
                backgroundColor: cycleTime.columnTimes.map(ct =>
                    cycleTime.bottleneckColumnIds.includes(ct.columnId) ? CHART_THEME.colors.danger : CHART_THEME.colors.info
                )
            }]
        );
    }

    renderThroughputCharts(throughput) {
        // Cumulative Flow
        const cfdDatasets = Object.keys(throughput.cumulativeFlow[0].columns).map((colId, index) => {
            const colors = Object.values(CHART_THEME.colors);
            return {
                label: throughput.columnMap[colId] || colId,
                data: throughput.cumulativeFlow.map(d => d.columns[colId]),
                backgroundColor: colors[index % colors.length] + '88',
                borderColor: colors[index % colors.length],
                fill: true
            };
        });
        this.charts.cumulativeFlow.render(
            throughput.cumulativeFlow.map(d => d.date),
            cfdDatasets
        );

        // Throughput (Created vs Completed)
        this.charts.throughput.render(
            throughput.createdVsCompleted.map(d => d.date),
            [
                {
                    label: 'Created',
                    data: throughput.createdVsCompleted.map(d => d.created),
                    borderColor: CHART_THEME.colors.info,
                    borderDash: [5, 5]
                },
                {
                    label: 'Completed',
                    data: throughput.createdVsCompleted.map(d => d.completed),
                    borderColor: CHART_THEME.colors.secondary
                }
            ]
        );

        // Burnup
        this.charts.burnup.render(
            throughput.burnup.map(d => d.date),
            [
                {
                    label: 'Total Scope',
                    data: throughput.burnup.map(d => d.total),
                    borderColor: CHART_THEME.colors.gray,
                    borderDash: [2, 2]
                },
                {
                    label: 'Completed',
                    data: throughput.burnup.map(d => d.completed),
                    borderColor: CHART_THEME.colors.secondary,
                    backgroundColor: CHART_THEME.colors.secondary + '22',
                    fill: true
                }
            ]
        );
    }
}

const analyticsPanel = new AnalyticsPanel();
export default analyticsPanel;
