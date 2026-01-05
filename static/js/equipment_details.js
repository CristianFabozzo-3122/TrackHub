/*
 * EquipmentDetailManager
 * ---------------------
 * Controls the Equipment Details view.
 * Handles loading equipment info AND paginated intervention history.
 */
class EquipmentDetailManager {
    constructor() {
        this.itemId = null;
        
        // API Endpoints
        this.apiEquipmentUrl = '/api/equipment';
        this.apiInterventionsUrl = '/api/interventions';

        // Pagination State
        this.currentPage = 1;
        this.itemsPerPage = 5; 

        this.dom = {
            // Header
            name: document.getElementById('detail-name'),
            idSpan: document.getElementById('detail-id'),
            iconContainer: document.getElementById('detail-icon-container'),

            // Info Details
            type: document.getElementById('detail-type'),
            locationName: document.getElementById('detail-location-name'),
            locationInfo: document.getElementById('detail-location-info'),
            statusContainer: document.getElementById('detail-status-container'),
            desc: document.getElementById('detail-desc'),

            // Interventions Section
            tbody: document.getElementById('interventions-body'),
            emptyState: document.getElementById('empty-interventions'),
            loadingState: document.getElementById('loading-interventions'),
            
            // Pagination Section (Card Footer)
            paginationContainer: document.getElementById('pagination-container'),
            paginationControls: document.getElementById('pagination-controls'),
            paginationInfo: document.getElementById('pagination-info'),

            // Actions & Buttons
            actionButtons: document.getElementById('action-buttons'),
            editLink: document.getElementById('btn-edit-link'),
            newInterventionBtn: document.getElementById('btn-new-intervention'),
            btnExportHistory: document.getElementById('btn-export-history'),
            modalName: document.getElementById('modal-delete-name'),
            deleteBtn: document.getElementById('btn-confirm-delete')
        };
    }

    /**
     * Initializes the manager.
     * Loads the equipment ID from URL, updates headers, binds events,
     * and triggers data loading (Equipment details + Intervention history).
     * * Input: None
     * Returns: void
     */
    init() {
        this.itemId = window.location.pathname.split('/').pop();
        if (!this.itemId) return;

        this.updateHeader();
        this.bindEvents();
        
        // 1. Load Equipment Details
        this.loadEquipmentDetails();
        
        // 2. Load Intervention History (Paginated)
        this.loadInterventionHistory();
    }

    /**
     * Attaches event listeners (e.g., delete button).
     * * Input: None
     * Returns: void
     */
    bindEvents() {
        if (this.dom.deleteBtn) {
            this.dom.deleteBtn.addEventListener('click', () => this.deleteItem());
        }

        if (this.dom.btnExportHistory) {
            this.dom.btnExportHistory.addEventListener('click', () => {
                this.exportHistory();
            });
        }
    }

    /* Add this new method to the class */
    /**
     * Triggers the Excel download for this specific equipment's history.
     * Reuses the existing Intervention Export endpoint by passing the equipment ID.
     * * Input: None
     * Returns: void
     */
    exportHistory() {
        if (!this.itemId) return;

        // We reuse the existing /api/interventions/export route.
        // By passing 'equipment={id}', the backend automatically filters the list.
        const exportUrl = `/api/interventions/export?equipment=${this.itemId}`;

        // Trigger download
        window.location.href = exportUrl;
    }


    /**
     * Updates the header section with the equipment ID and sets links.
     * * Input: None
     * Returns: void
     */
    updateHeader() {
        this.dom.idSpan.innerText = this.itemId;
        this.dom.editLink.href = `/equipment/edit/${this.itemId}`;
        
        if (this.dom.newInterventionBtn) {
            this.dom.newInterventionBtn.href = `/interventions/new?equipment_id=${this.itemId}`;
        }
    }

    // --- SECTION 1: EQUIPMENT DETAILS ---

    /**
     * Asynchronously fetches and renders the main equipment details.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadEquipmentDetails() {
        try {
            const response = await fetch(`${this.apiEquipmentUrl}/items/${this.itemId}`);
            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            const item = data.equipment || data; 

            this.renderEquipment(item);
            this.dom.actionButtons.classList.remove('d-none');

        } catch (error) {
            console.error('Error loading equipment:', error);
            this.dom.name.innerText = 'Error loading data';
            this.dom.name.classList.add('text-danger');
        }
    }

    /**
     * Renders the equipment data into the DOM.
     * * Input: item (Object) - The equipment data object.
     * Returns: void
     */
    renderEquipment(item) {
        this.dom.name.innerText = item.name;
        if(this.dom.modalName) this.dom.modalName.innerText = item.name;
        
        this.dom.type.innerText = item.type_description || '--';
        this.dom.locationName.innerText = item.location_name || '--';
        this.dom.locationInfo.innerText = `${item.building || ''} ${item.floor ? '- ' + item.floor : ''}`;
        this.dom.desc.innerText = item.description || 'No additional notes specified.';

        this.renderIcon(item.type_description);
        this.renderStatus(item.status_description);
    }

    /**
     * Updates the icon container based on equipment type.
     * * Input: type (String) - Equipment type description.
     * Returns: void
     */
    renderIcon(type) {
        let icon = 'bi-hdd-network';
        const t = (type || '').toLowerCase();
        
        if (t.includes('printer')) icon = 'bi-printer';
        else if (t.includes('whiteboard')) icon = 'bi-easel';
        else if (t.includes('pc') || t.includes('laptop')) icon = 'bi-laptop';

        this.dom.iconContainer.innerHTML = `<i class="bi ${icon} display-1 text-secondary"></i>`;
    }

    /**
     * Updates the status container based on status description.
     * * Input: status (String) - Status description (e.g., Working).
     * Returns: void
     */
    renderStatus(status) {
        let badgeClass = 'bg-warning text-dark';
        if (status === 'Working') badgeClass = 'bg-success text-white';
        else if (status?.includes('Repair') || status?.includes('Obsolete')) {
            badgeClass = 'bg-danger text-white';
        }

        this.dom.statusContainer.innerHTML = `
            <span class="badge ${badgeClass} p-2 mt-1 w-100">
                ${status || 'Unknown'}
            </span>
        `;
    }

    // --- SECTION 2: PAGINATED INTERVENTIONS HISTORY ---

    /**
     * Asynchronously fetches the paginated intervention history for this specific equipment.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadInterventionHistory() {
        // UI Reset
        this.dom.tbody.innerHTML = '';
        this.dom.loadingState.classList.remove('d-none');
        this.dom.emptyState.classList.add('d-none');
        this.dom.paginationContainer.classList.add('d-none');

        // Query Params: Filter by THIS equipment ID
        const params = new URLSearchParams({
            page: this.currentPage,
            per_page: this.itemsPerPage,
            equipment: this.itemId 
        });

        try {
            const response = await fetch(`${this.apiInterventionsUrl}/items?${params}`);
            if (!response.ok) throw new Error("Error loading history");

            const data = await response.json();

            this.dom.loadingState.classList.add('d-none');
            this.renderInterventionsTable(data.items);
            this.renderPagination(data);

        } catch (error) {
            console.error(error);
            this.dom.loadingState.classList.add('d-none');
            this.dom.tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading history</td></tr>`;
        }
    }

    /**
     * Renders the intervention history table rows.
     * * Input: items (Array) - List of intervention objects.
     * Returns: void
     */
    renderInterventionsTable(items) {
        if (!items || items.length === 0) {
            this.dom.emptyState.classList.remove('d-none');
            return;
        }

        const rowsHTML = items.map(item => {
            const date = item.date ? new Date(item.date).toLocaleDateString('it-IT') : '--';
            
            // Link to intervention details
            const detailLink = `/interventions/details/${item.intervention_id}`;

            let outcomeHtml = `<span class="badge bg-secondary">${item.outcome_description || 'Pending'}</span>`;
            if (item.outcome_description === 'Resolved') {
                outcomeHtml = `<span class="badge bg-success"><i class="bi bi-check-lg"></i> Resolved</span>`;
            } else if (item.outcome_description === 'Pending') {
                outcomeHtml = `<span class="badge bg-warning text-dark">Pending</span>`;
            }

            return `
                <tr style="cursor: pointer;" onclick="window.location.href='${detailLink}'">
                    <td class="text-nowrap">${date}</td>
                    <td>${item.technician_name || 'Unknown'}</td>
                    <td>
                        <div class="text-truncate" style="max-width: 200px;" title="${item.description}">
                            ${item.description || ''}
                        </div>
                    </td>
                    <td>${outcomeHtml}</td>
                </tr>
            `;
        }).join('');

        this.dom.tbody.innerHTML = rowsHTML;
    }

    /**
     * Renders pagination controls for the history section.
     * * Input: data (Object) - Pagination metadata.
     * Returns: void
     */
    renderPagination(data) {
        // Show pagination footer only if needed or generally to show counts
        if (data.total === 0) return;

        this.dom.paginationContainer.classList.remove('d-none');
        this.dom.paginationControls.innerHTML = '';
        
        // Update Info Text
        this.dom.paginationInfo.textContent = `Page ${data.current_page} of ${data.pages} (Total: ${data.total})`;

        if (data.pages <= 1) return;

        // Previous Button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${data.current_page === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<button class="page-link"><i class="bi bi-chevron-left"></i></button>`;
        prevLi.onclick = (e) => {
            e.preventDefault();
            if (data.current_page > 1) {
                this.currentPage--;
                this.loadInterventionHistory();
            }
        };
        this.dom.paginationControls.appendChild(prevLi);

        // Next Button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${data.current_page === data.pages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<button class="page-link"><i class="bi bi-chevron-right"></i></button>`;
        nextLi.onclick = (e) => {
            e.preventDefault();
            if (data.current_page < data.pages) {
                this.currentPage++;
                this.loadInterventionHistory();
            }
        };
        this.dom.paginationControls.appendChild(nextLi);
    }

    // --- SECTION 3: ACTIONS ---

    /**
     * Asynchronously deletes the equipment item.
     * Handles modal closing and redirection.
     * * Input: None
     * Returns: Promise<void>
     */
    async deleteItem() {
        // Modal handling logic...
        const modalEl = document.getElementById('deleteModal');
        if (window.bootstrap) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }

        try {
            const response = await fetch(`${this.apiEquipmentUrl}/items/${this.itemId}`, { 
                method: 'DELETE' 
            });

            if (response.ok) {
                alert("Equipment deleted successfully!");
                window.location.href = '/equipment';
            } else {
                alert('Error during deletion');
            }
        } catch (error) {
            console.error(error);
            alert('Connection error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EquipmentDetailManager().init();
});