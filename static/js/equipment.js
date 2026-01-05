/*
 * EquipmentManager
 * ----------------
 * Controls the main Equipment List view.
 * Handles Pagination, Filtering, Search logic, and CSV Export.
 */
class EquipmentManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 5;
        this.apiBaseUrl = '/api/equipment';
        
        this.dom = {
            tableBody: document.getElementById('equipment-table-body'),
            pagination: document.getElementById('pagination-controls'),
            info: document.getElementById('pagination-info'),
            form: document.getElementById('filter-form'),
            btnExport: document.getElementById('btn-export'),
            searchInput: document.getElementById('search-input'),
            selectType: document.getElementById('filter-type'),
            selectLocation: document.getElementById('filter-location'),
            selectStatus: document.getElementById('filter-status')
        };
    }

    /**
     * Initializes the manager.
     * Loads options, checks for URL parameters (e.g., location filter), and loads initial items.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        // Wait for options to load so the <select> elements are populated
        await this.loadOptions(); 
        
        this.checkUrlParameters();

        
        this.loadItems();

        this.dom.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.resetAndSearch(); 
        });

        if (this.dom.btnExport) {
            this.dom.btnExport.addEventListener('click', () => {
                this.exportCsv();
            });
        }
    }


    /**
     * Resets the pagination to the first page and reloads items with current filters.
     * * Input: None
     * Returns: void
     */
    resetAndSearch() {
        this.currentPage = 1; //Reset pagination
        this.loadItems();     //Use filters on load page
    }

    /**
     * Inspects the browser URL for query parameters (specifically 'location_id')
     * and sets the corresponding dropdown filter if present.
     * * Input: None
     * Returns: void
     */
    checkUrlParameters() {
        // Parse the query string from the browser URL (e.g., ?location_id=5)
        const urlParams = new URLSearchParams(window.location.search);
        const locationId = urlParams.get('location_id'); 
        
        // If an ID exists in the URL and the dropdown is available
        if (locationId && this.dom.selectLocation) {
            // Programmatically set the dropdown value
            this.dom.selectLocation.value = locationId;
        }
    }

    /**
     * Asynchronously fetches aggregated options (types, locations, statuses) for dropdowns.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadOptions() {
        try {
            const response = await fetch('/api/options');
            const data = await response.json();


            this.populateSelect(this.dom.selectType, data.types, 'type_id', 'description');
            this.populateSelect(this.dom.selectLocation, data.locations, 'location_id', 'name');
            this.populateSelect(this.dom.selectStatus, data.statuses, 'status_id', 'description');

            

        } catch (error) {
            console.error("Error loading options:", error);
        }
    }


    /**
     * Helper to populate a <select> element.
     * * Input:
     * - select (HTMLElement): The select element.
     * - items (Array): List of items.
     * - valueKey (String): Property for option value.
     * - textKey (String): Property for option text.
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
     * Asynchronously fetches the paginated equipment list based on active filters.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadItems() {
        const params = new URLSearchParams({
            page: this.currentPage,
            search: this.dom.searchInput.value,
            type: this.dom.selectType.value,
            location: this.dom.selectLocation.value,
            status: this.dom.selectStatus.value
        });

        try {
            const response = await fetch(`${this.apiBaseUrl}/items?${params}`);
            const data = await response.json();

            this.renderTable(data.items);
            this.renderPagination(data);
        } catch (error) {
            console.error("Error loading equipment:", error);
            this.dom.tableBody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Connection Error</td></tr>`;
        }
    }

    /**
     * Renders the equipment table rows.
     * * Input: items (Array) - List of equipment objects.
     * Returns: void
     */
    renderTable(items) {
        this.dom.tableBody.innerHTML = '';

        if (!items || items.length === 0) { 
            this.dom.tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No results found</td></tr>`;
            return;
        }

        const rowsHTML = items.map(item => {
            const badgeClass = this.getBadgeClass(item.status_description);
            const icon = this.getIconClass(item.type_description);
            
            return `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div class="me-3 text-secondary fs-4">${icon}</div>
                        <div>
                            <span class="fw-bold text-dark">${item.name}</span>
                            <div class="small text-muted">${item.type_description || 'Unknown Type'}</div>
                        </div>
                    </div>
                </td>
                <td><span class="fw-medium">${item.location_name || 'Unassigned'}</span></td>
                <td><span class="badge ${badgeClass}">${item.status_description || 'Unknown'}</span></td>
                <td class="text-end pe-4">
                    <a href="/equipment/details/${item.equipment_id}" class="btn btn-sm btn-light text-secondary rounded-circle" title="View Details">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </td>
            </tr>`;
        }).join('');

        this.dom.tableBody.innerHTML = rowsHTML;
    }

    /**
     * Renders the pagination controls.
     * * Input: data (Object) - Pagination metadata.
     * Returns: void
     */
    renderPagination(data) {
        this.dom.info.textContent = `Page ${data.current_page} of ${data.pages} (Total ${data.total})`;
        this.dom.pagination.innerHTML = '';

        if (data.pages <= 1) return;

        const prevBtn = this.createPageButton('Previous', data.current_page > 1, () => {
            this.currentPage--;
            this.loadItems();
        });
        
        const nextBtn = this.createPageButton('Next', data.current_page < data.pages, () => {
            this.currentPage++;
            this.loadItems();
        });

        this.dom.pagination.appendChild(prevBtn);
        this.dom.pagination.appendChild(nextBtn);
    }

    /**
     * Helper to create a pagination button.
     * * Input: 
     * - text (String): Label.
     * - isEnabled (Boolean): State.
     * - onClick (Function): Event handler.
     * Returns: HTMLElement (LI)
     */
    createPageButton(text, isEnabled, onClick) {
        const li = document.createElement('li');
        li.className = `page-item ${!isEnabled ? 'disabled' : ''}`;
        const button = document.createElement('button');
        button.className = 'page-link';
        button.textContent = text;
        if (isEnabled) button.onclick = onClick;
        li.appendChild(button);
        return li;
    }

    /**
     * Determines the CSS class for the status badge based on status description.
     * * Input: status (String).
     * Returns: String - CSS class names.
     */
    getBadgeClass(status) {
        if (!status) return 'bg-secondary';
        if (status === 'Working') return 'bg-success';
        if (status === 'Under Repair') return 'bg-warning text-dark';
        if (status === 'Broken' || status === 'Obsolete') return 'bg-danger';
        return 'bg-secondary';
    }

    /**
     * Determines the icon HTML based on the equipment type.
     * * Input: type (String).
     * Returns: String - HTML string for the icon.
     */
    getIconClass(type) {
        if (!type) return '<i class="bi bi-box"></i>';
        if (type.includes('Printer')) return '<i class="bi bi-printer"></i>';
        if (type.includes('PC') || type.includes('Notebook') || type.includes('Laptop')) return '<i class="bi bi-laptop"></i>';
        if (type.includes('Whiteboard')) return '<i class="bi bi-easel"></i>';
        return '<i class="bi bi-hdd-network"></i>';
    }

    /**
     * Triggers the CSV download using the current filter values.
     * * Input: None
     * Returns: void
     */
    exportCsv() {
        // 1. Gather current filter values
        const params = new URLSearchParams({
            search: this.dom.searchInput.value,
            type: this.dom.selectType.value,
            location: this.dom.selectLocation.value,
            status: this.dom.selectStatus.value
        });

        // 2. Redirect browser to the export endpoint
        // This triggers the browser's native file download behavior
        window.location.href = `${this.apiBaseUrl}/export?${params.toString()}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EquipmentManager().init();
});