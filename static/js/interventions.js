/**
 * InterventionsManager
 * --------------------
 * Controls the Interventions List view.
 * Handles Pagination, Filtering, and Search logic.
 */
class InterventionsManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 5;

        this.apiBaseUrl = '/api/interventions';

        this.dom = {
            tableBody: document.getElementById('interventionsTableBody'),
            pagination: document.getElementById('paginationList'),
            paginationContainer: document.getElementById('paginationContainer'),
            paginationInfo: document.getElementById('paginationInfo'),
            btnExport: document.getElementById('btn-export'),
            form: document.getElementById('filtersForm'),
            searchInput: document.getElementById('searchInput'),
            dateFilter: document.getElementById('dateFilter'),
            technicianFilter: document.getElementById('technicianFilter'),
            equipmentFilter: document.getElementById('equipmentFilter'),
            outcomeFilter: document.getElementById('outcomeFilter'),
            activeFiltersIndicator: document.getElementById('activeFiltersIndicator')
        };
    }

    /**
     * Initializes the manager.
     * Loads filter options, initial data items, and binds the form submit event.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        await this.loadOptions();
        this.loadItems();
        
        
        if (this.dom.form) {
            this.dom.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.resetAndSearch(); 
            });
        }

        if (this.dom.btnExport) {
            this.dom.btnExport.addEventListener('click', () => {
                this.exportCsv();
        });
    }
    }

    /* Add this new method to the class */
    /**
     * Triggers the CSV download using the current filter values.
     * * Input: None
     * Returns: void
     */
    exportCsv() {
        // 1. Gather current filter values
        const params = new URLSearchParams({
            search: this.dom.searchInput.value,
            user_id: this.dom.technicianFilter.value,
            equipment: this.dom.equipmentFilter.value,
            outcome: this.dom.outcomeFilter.value,
            date: this.dom.dateFilter.value
        });

        // 2. Redirect browser to the export endpoint
        // This triggers the browser's native file download behavior
        window.location.href = `${this.apiBaseUrl}/export?${params.toString()}`;
    }

    /**
     * Resets pagination to page 1 and reloads items based on current filters.
     * * Input: None
     * Returns: void
     */
    resetAndSearch() {
        this.currentPage = 1;
        this.loadItems();
    }

    /**
     * Asynchronously fetches available options (technicians, equipment, outcomes)
     * from the API to populate the filter dropdowns.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadOptions() {
        try {
            const response = await fetch('/api/options');

            const data = await response.json();

            const formattedTechs = data.technicians.map(t => ({
                value: t.user_id,
                label: `${t.first_name} ${t.last_name}`
            }));

            this.populateSelect(this.dom.technicianFilter, formattedTechs, 'user_id', 'label');
            this.populateSelect(this.dom.equipmentFilter, data.equipments, 'equipment_id', 'name');
            this.populateSelect(this.dom.outcomeFilter, data.outcomes, 'outcome_id', 'description')

        } catch (error) {
            console.error('Error loading options:', error);
        }
    }

    /**
     * Helper to populate a <select> element with options.
     * * Input:
     * - select (HTMLElement): The select element to populate.
     * - items (Array): Array of data objects.
     * - valueKey (String): Key to use for the option value.
     * - textKey (String): Key to use for the option display text.
     * Returns: void
     */
    populateSelect(select, items, valueKey, textKey) {
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey];
            select.appendChild(option);
        });
    }


    /**
     * Asynchronously fetches paginated intervention items from the API based on
     * current filter inputs and pagination state.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadItems() {
        const params = new URLSearchParams({
            page: this.currentPage,
            per_page: this.itemsPerPage,
            search: this.dom.searchInput.value,
            user_id: this.dom.technicianFilter.value,
            equipment: this.dom.equipmentFilter.value,
            outcome: this.dom.outcomeFilter.value,
            date: this.dom.dateFilter.value
        });

        try {
            const response = await fetch(`${this.apiBaseUrl}/items?${params}`);
            const data = await response.json();

            this.renderTable(data.items);
            this.renderPagination(data);
        } catch (error) {
            console.error('Error loading interventions:', error);
            this.dom.tableBody.innerHTML = `
                <tr><td colspan="6" class="text-center text-danger">Connection Error</td></tr>
            `;
        }
    }


    /**
     * Renders the table rows for the intervention list.
     * * Input: items (Array) - List of intervention objects.
     * Returns: void
     */
    renderTable(items) {
        this.dom.tableBody.innerHTML = '';


        if (!items || items.length === 0) { 
            this.dom.tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No results found</td></tr>`;
            return;
        }

        if (!items || items.length === 0) {
            this.dom.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5 text-muted">
                        No interventions found
                    </td>
                </tr>`;
            return;
        }

        items.forEach(item => {
            const date = new Date(item.date).toLocaleDateString('it-IT');
            const tech = item.technician_name || 'Unknown';
            const equip = item.equipment_name || 'Unknown Device';

            const row = `
                <tr>
                    <td class="ps-4 text-muted small">${item.intervention_id}</td>
                    <td>${date}</td>
                    <td>
                        <a href="/equipment/items/${item.equipment_id}" class="fw-bold text-dark text-decoration-none">
                            ${equip}
                        </a>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            ${tech}
                        </div>
                    </td>
                    <td>${this.getOutcomeBadge(item.outcome_description)}</td>
                    <td class="text-end pe-4">
                        <a href="/interventions/details/${item.intervention_id}"
                           class="btn btn-sm btn-light rounded-circle">
                            <i class="bi bi-chevron-right"></i>
                        </a>
                    </td>
                </tr>`;
            this.dom.tableBody.insertAdjacentHTML('beforeend', row);
        });
    }

    /**
     * Generates HTML for the outcome badge based on status.
     * * Input: outcome (String) - The outcome description.
     * Returns: String - HTML string for the badge.
     */
    getOutcomeBadge(outcome) {
        if (!outcome) {
            return `<span class="badge bg-warning">Pending</span>`;
        }
        if (outcome === 'Resolved') {
            return `<span class="badge bg-success"><i class="bi bi-check-lg"></i> ${outcome}</span>`;
        }
        return `<span class="badge bg-secondary">${outcome}</span>`;
    }

    /**
     * Renders the pagination controls (Previous/Next buttons) and info text.
     * * Input: data (Object) - Pagination metadata (current_page, pages, total).
     * Returns: void
     */
    renderPagination(data) {
        this.dom.pagination.innerHTML = '';
        this.dom.paginationContainer.classList.toggle('d-none', data.pages <= 1);

        this.dom.paginationInfo.textContent =
            `Page ${data.current_page} of ${data.pages} (Total ${data.total})`;

        if (data.pages <= 1) return;

        const prev = this.createPageButton('Previous', data.current_page > 1, () => {
            this.currentPage--;
            this.loadItems();
        });

        const next = this.createPageButton('Next', data.current_page < data.pages, () => {
            this.currentPage++;
            this.loadItems();
        });

        this.dom.pagination.append(prev, next);
    }

    /**
     * Helper to create a pagination list item button.
     * * Input: 
     * - text (String): Button label.
     * - enabled (Boolean): Whether the button is clickable.
     * - action (Function): Callback function on click.
     * Returns: HTMLElement (LI)
     */
    createPageButton(text, enabled, action) {
        const li = document.createElement('li');
        li.className = `page-item ${!enabled ? 'disabled' : ''}`;
        const btn = document.createElement('button');
        btn.className = 'page-link';
        btn.textContent = text;
        if (enabled) btn.onclick = action;
        li.appendChild(btn);
        return li;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InterventionsManager().init();
});