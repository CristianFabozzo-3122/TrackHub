/*
 * HomeTechManager
 * -----------
 * Controls the Technician Dashboard view.
 * Uses dedicated '/api/home' endpoints for context-aware data fetching.
 * Handles Pagination for Activity and Priority lists.
 */
class HomeTechManager {
    constructor() {
        // Pagination State
        this.activityPage = 1;
        this.activityPerPage = 5;
        this.priorityPage = 1;
        this.priorityPerPage = 5;

        // API Endpoints
        // We use the specialized Home API for data fetching (Secure & Context-aware)
        this.apiHomeUrl = '/api/home';
        
        // We use the generic APIs only for the Export CSV feature
        this.apiInterventionsUrl = '/api/interventions';
        this.apiEquipmentUrl = '/api/equipment';

        // DOM Elements mapping
        this.dom = {
            // Activity Section
            activityTable: document.getElementById('activityTableBody'),
            activityPaginationContainer: document.getElementById('pagination-activity-container'),
            activityPaginationList: document.getElementById('pagination-activity-list'),
            activityPaginationInfo: document.getElementById('pagination-activity-info'),
            btnExportActivity: document.getElementById('btn-export-activity'),

            // Priority Section
            priorityTable: document.getElementById('priorityTableBody'),
            priorityPaginationContainer: document.getElementById('pagination-priority-container'),
            priorityPaginationList: document.getElementById('pagination-priority-list'),
            priorityPaginationInfo: document.getElementById('pagination-priority-info'),
            btnExportPriority: document.getElementById('btn-export-priority'),
            
            // Container (Used only to grab User ID for EXPORT purposes)
            container: document.getElementById('dashboard-container')
        };
        
        // Retrieve current user ID from the DOM (injected by server template)
        // Needed ONLY for the Export button logic
        this.currentUserId = this.dom.container ? this.dom.container.dataset.userId : null;
    }

    /**
     * Initializes the manager.
     * Triggers data loading for both dashboard sections.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        this.loadActivity();
        this.loadPriorityList();

        // Bind Export Events
        if (this.dom.btnExportActivity) {
            this.dom.btnExportActivity.addEventListener('click', () => this.exportActivityCsv());
        }
        if (this.dom.btnExportPriority) {
            this.dom.btnExportPriority.addEventListener('click', () => this.exportPriorityCsv());
        }
    }

    // --- SECTION 1: MY ACTIVITY ---

    /**
     * Fetches paginated interventions via Home API.
     * The Backend automatically filters by the logged-in user.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadActivity() {
        const params = new URLSearchParams({
            page: this.activityPage,
            per_page: this.activityPerPage
        });

        try {
            // Call the specialized route: /api/home/activity
            const response = await fetch(`${this.apiHomeUrl}/activity?${params}`);
            
            if (!response.ok) throw new Error("API Error");
            
            const data = await response.json();

            this.renderActivityTable(data.items);
            this.renderPagination(
                data, 
                this.dom.activityPaginationList, 
                this.dom.activityPaginationInfo,
                this.dom.activityPaginationContainer,
                (p) => {
                    this.activityPage = p;
                    this.loadActivity();
                }
            );

        } catch (error) {
            console.error("Error loading activity:", error);
            this.dom.activityTable.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Connection Error</td></tr>`;
        }
    }

    /**
     * Renders table rows for the Activity section.
     * * Input: items (Array)
     * Returns: void
     */
    renderActivityTable(items) {
        this.dom.activityTable.innerHTML = '';

        if (!items || items.length === 0) {
            this.dom.activityTable.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No recent activity</td></tr>`;
            return;
        }

        const rows = items.map(item => {
            const date = item.date ? new Date(item.date).toLocaleDateString('it-IT') : '--';
            const equipName = item.equipment_name || 'Unknown';
            
            return `
                <tr>
                    <td>${date}</td>
                    <td><span class="fw-bold text-dark">${equipName}</span></td>
                    <td>${this.getOutcomeBadge(item.outcome_description)}</td>
                    <td class="text-end pe-4">
                        <a href="/interventions/details/${item.intervention_id}" class="btn btn-sm btn-light rounded-circle">
                            <i class="bi bi-chevron-right"></i>
                        </a>
                    </td>
                </tr>`;
        }).join('');

        this.dom.activityTable.innerHTML = rows;
    }

    // --- SECTION 2: PRIORITY LIST ---

    /**
     * Fetches paginated priority items via Home API.
     * The Backend automatically applies the "Broken/Obsolete" filter.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadPriorityList() {
        const params = new URLSearchParams({
            page: this.priorityPage,
            per_page: this.priorityPerPage
        });

        try {
            // Call the specialized route: /api/home/priority
            const response = await fetch(`${this.apiHomeUrl}/priority?${params}`);
            
            if (!response.ok) throw new Error("API Error");

            const data = await response.json();

            this.renderPriorityTable(data.items);
            this.renderPagination(
                data, 
                this.dom.priorityPaginationList, 
                this.dom.priorityPaginationInfo,
                this.dom.priorityPaginationContainer,
                (p) => {
                    this.priorityPage = p;
                    this.loadPriorityList();
                }
            );

        } catch (error) {
            console.error("Error loading priority list:", error);
            this.dom.priorityTable.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Connection Error</td></tr>`;
        }
    }

    /**
     * Renders table rows for the Priority section.
     * * Input: items (Array)
     * Returns: void
     */
    renderPriorityTable(items) {
        this.dom.priorityTable.innerHTML = '';

        if (!items || items.length === 0) {
            this.dom.priorityTable.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted text-success"><i class="bi bi-check-circle"></i> No critical items</td></tr>`;
            return;
        }

        const rows = items.map(item => {
            
            // passing the ID from current_id is not a good choice: it is a weak security level
            const fixUrl = `/interventions/new?equipment_id=${item.equipment_id}`;
            return `
                <tr>
                    <td class="ps-4 fw-bold">${item.name}</td>
                    <td>${item.location_name || '--'}</td>
                    <td><span class="badge bg-danger">${item.status_description}</span></td>
                    <td class="text-end pe-4">
                        <a href="${fixUrl}" class="btn btn-sm btn-warning" title="Fix Now">
                            <i class="bi bi-tools"></i> Fix
                        </a>
                    </td>
                </tr>`;
        }).join('');

        this.dom.priorityTable.innerHTML = rows;
    }

    // --- EXPORTS ---

    /**
     * Exports Activity list using the generic API.
     * We manually pass the user_id here just for the file generation.
     */
    exportActivityCsv() {
        if (this.currentUserId) {
            const params = new URLSearchParams({ user_id: this.currentUserId });
            window.location.href = `${this.apiInterventionsUrl}/export?${params.toString()}`;
        }
    }

    /**
     * Exports Priority list using the generic API.
     * We manually pass status=3 (Obsolete/Broken) here to match what the dashboard shows.
     */
    exportPriorityCsv() {
        const ID_BROKEN = 3; 
        const params = new URLSearchParams({ status: ID_BROKEN });
        window.location.href = `${this.apiEquipmentUrl}/export?${params.toString()}`;
    }

    // --- UTILS ---

    /**
     * Renders pagination controls.
     */
    renderPagination(data, listEl, infoEl, containerEl, callback) {
        listEl.innerHTML = '';
        containerEl.classList.toggle('d-none', data.pages <= 1);

        infoEl.textContent = `Page ${data.current_page} of ${data.pages}`;

        if (data.pages <= 1) return;

        const createBtn = (text, enabled, action) => {
            const li = document.createElement('li');
            li.className = `page-item ${!enabled ? 'disabled' : ''}`;
            const btn = document.createElement('button');
            btn.className = 'page-link';
            btn.textContent = text;
            if (enabled) btn.onclick = (e) => { e.preventDefault(); action(); };
            li.appendChild(btn);
            return li;
        };

        listEl.append(
            createBtn('Prev', data.current_page > 1, () => callback(data.current_page - 1)),
            createBtn('Next', data.current_page < data.pages, () => callback(data.current_page + 1))
        );
    }

    /**
     * Helper for outcome badge.
     */
    getOutcomeBadge(outcome) {
        if (outcome === 'Resolved') return `<span class="badge bg-success">Resolved</span>`;
        if (!outcome || outcome === 'Pending') return `<span class="badge bg-warning text-dark">Pending</span>`;
        return `<span class="badge bg-secondary">${outcome}</span>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HomeTechManager().init();
});