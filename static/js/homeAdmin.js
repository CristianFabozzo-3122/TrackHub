/*
 * HomeAdminManager
 * ---------------------
 * Handles the logic for the Admin Dashboard.
 * Fetches KPI data and renders Chart.js visualizations.
 */
class HomeAdminManager {
    constructor() {
        this.apiSummaryUrl = '/api/home/summary';
        
        // DOM Elements for KPIs
        this.dom = {
            kpiAssets: document.getElementById('kpi-assets'),
            kpiInterventions: document.getElementById('kpi-interventions'),
            kpiTechs: document.getElementById('kpi-techs'),
            
            // Canvas Elements for Charts
            canvasStatus: document.getElementById('chartStatus'),
            canvasTechs: document.getElementById('chartTechs')
        };
    }

    /**
     * Initializes the dashboard.
     */
    async init() {
        try {
            await this.loadDashboardData();
        } catch (error) {
            console.error("Failed to load admin dashboard:", error);
        }
    }

    /**
     * Fetches data from the server and distributes it to render methods.
     */
    async loadDashboardData() {
        const response = await fetch(this.apiSummaryUrl);
        if (!response.ok) throw new Error("API Error");

        const data = await response.json();

        // 1. Render KPIs
        this.renderKPIs(data.kpi);

        // 2. Render Charts
        this.renderStatusChart(data.charts.status_dist);
        this.renderTechChart(data.charts.tech_perf);
    }

    /**
     * Updates the number cards.
     */
    renderKPIs(kpiData) {
        this.dom.kpiAssets.textContent = kpiData.total_assets;
        this.dom.kpiInterventions.textContent = kpiData.total_interventions;
        this.dom.kpiTechs.textContent = kpiData.total_technicians;
    }

    /**
     * Renders the Pie Chart for Equipment Status.
     */
    renderStatusChart(chartData) {
        new Chart(this.dom.canvasStatus, {
            type: 'doughnut', // or 'pie'
            data: {
                labels: chartData.labels, // e.g. ["Working", "Broken"]
                datasets: [{
                    data: chartData.data, // e.g. [50, 5]
                    backgroundColor: [
                        '#198754', // Green (Working)
                        '#dc3545', // Red (Broken)
                        '#ffc107', // Yellow (Repair)
                        '#6c757d'  // Grey (Other)
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    /**
     * Renders the Bar Chart for Technician Performance.
     */
    renderTechChart(chartData) {
        new Chart(this.dom.canvasTechs, {
            type: 'bar',
            data: {
                labels: chartData.labels, // e.g. ["Rossi", "Bianchi"]
                datasets: [{
                    label: 'Interventions Completed',
                    data: chartData.data, // e.g. [12, 8]
                    backgroundColor: '#0d6efd', // Bootstrap Primary Blue
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 } // Ensure integer steps
                    }
                }
            }
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new HomeAdminManager().init();
});