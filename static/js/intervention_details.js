/**
 * InterventionDetailsManager
 * --------------------------
 * Controls the Intervention Details view.
 * Handles data loading, rendering of specific intervention details, and delete actions.
 */
class InterventionDetailsManager {
    constructor() {
        this.itemId = null;
        this.apiBaseUrl = '/api/interventions';

        this.dom = {
            mainContent: document.getElementById('main-content'),
            actionButtons: document.getElementById('action-buttons'),
            headerId: document.getElementById('detail-id'),

            // Technician
            techName: document.getElementById('tech-name'),
            techId: document.getElementById('tech-id'),
            techInitials: document.getElementById('tech-initials'),

            // Equipment
            equipLink: document.getElementById('equip-link'),
            equipModel: document.getElementById('equip-model'),
            equipLocation: document.getElementById('equip-location'),
            equipSerial: document.getElementById('equip-serial'),
            equipIconContainer: document.getElementById('equip-icon-container'),

            // Details
            date: document.getElementById('detail-date'),
            duration: document.getElementById('detail-duration'),
            description: document.getElementById('detail-description'),
            statusBadgeContainer: document.getElementById('status-badge-container'),
            statusCard: document.getElementById('status-card'),

            // Actions
            editLink: document.getElementById('btn-edit-link'),
            modalDeleteId: document.getElementById('modal-delete-id'),
            btnConfirmDelete: document.getElementById('btn-confirm-delete')
        };
    }

    /**
     * Initializes the manager.
     * Extracts the ID from the URL, binds events, and starts data loading.
     * * Input: None
     * Returns: void
     */
    init() {
        this.itemId = window.location.pathname.split('/').pop();
        if (!this.itemId) return;

        this.updateHeader();
        this.bindEvents();
        this.loadItem();
    }

    /**
     * Attaches event listeners to DOM elements.
     * * Input: None
     * Returns: void
     */
    bindEvents() {
        this.dom.btnConfirmDelete.addEventListener(
            'click',
            () => this.deleteItem()
        );
    }

    /**
     * Updates the static header elements with the ID extracted from the URL.
     * * Input: None
     * Returns: void
     */
    updateHeader() {
        this.dom.headerId.innerText = this.itemId;
        this.dom.modalDeleteId.innerText = this.itemId;
        this.dom.editLink.href = `/interventions/edit/${this.itemId}`;
    }

    /**
     * Asynchronously fetches the intervention details from the API.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadItem() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/items/${this.itemId}`);
            if (!response.ok) throw new Error('API Error');

            const json = await response.json();
            const item = json.data || json.intervention || json;

            this.renderItem(item);

            this.dom.mainContent.classList.remove('d-none');
            this.dom.actionButtons.classList.remove('d-none');

        } catch (error) {
            console.error('Error loading intervention:', error);
        }
    }

    /**
     * Orchestrates the rendering of the various sections of the view.
     * * Input: item (Object) - The intervention data object.
     * Returns: void
     */
    renderItem(item) {
        this.renderTechnician(item);
        this.renderEquipment(item);
        this.renderDetails(item);
        this.renderStatus(item.outcome_description || 'Pending');
    }

    /**
     * Updates the DOM elements related to the Technician.
     * * Input: item (Object) - The intervention data object.
     * Returns: void
     */
    renderTechnician(item) {
        const name = item.technician_name || 'Unknown';

        this.dom.techName.innerText = name;
        this.dom.techId.innerText = item.user_id || '--';
        this.dom.techInitials.innerText = this.getInitials(name);
    }

    /**
     * Updates the DOM elements related to the Equipment.
     * * Input: item (Object) - The intervention data object.
     * Returns: void
     */
    renderEquipment(item) {
        this.dom.equipLink.innerText = item.equipment_name || 'Unknown Device';
        this.dom.equipLink.href = `/equipment/details/${item.equipment_id}`;

        this.dom.equipModel.innerText = 'Check equipment for details';

        const name = (item.equipment_name || '').toLowerCase();
        let icon = 'bi-hdd-network';
        if (name.includes('printer')) icon = 'bi-printer';
        else if (name.includes('pc') || name.includes('laptop')) icon = 'bi-laptop';

        this.dom.equipIconContainer.innerHTML = `<i class="bi ${icon}"></i>`;
    }

    /**
     * Updates the core details (date, duration, description).
     * * Input: item (Object) - The intervention data object.
     * Returns: void
     */
    renderDetails(item) {
        if (item.date) {
            this.dom.date.innerText = new Date(item.date).toLocaleDateString('it-IT');
        }

        this.dom.duration.innerText = item.duration_minutes || 0;

        const desc = item.description || 'No description.';
        this.dom.description.innerHTML = desc.replace(/\n/g, '<br>');
    }

    /**
     * Renders the status badge and updates card styling based on the outcome.
     * * Input: outcome (String) - The description of the outcome (e.g., 'Resolved').
     * Returns: void
     */
    renderStatus(outcome) {
        let badgeClass = 'bg-warning text-dark';
        let borderClass = 'border-warning';
        let icon = 'bi-exclamation-circle';

        if (outcome === 'Resolved' || outcome === 'Risolto') {
            badgeClass = 'bg-success';
            borderClass = 'border-success';
            icon = 'bi-check-circle';
        }

        this.dom.statusCard.classList.remove(
            'border-warning',
            'border-success'
        );
        this.dom.statusCard.classList.add(borderClass);

        this.dom.statusBadgeContainer.innerHTML = `
            <span class="badge ${badgeClass} fs-6">
                <i class="bi ${icon}"></i> ${outcome}
            </span>
        `;
    }

    /**
     * Helper function to generate initials from a name.
     * * Input: name (String) - The full name.
     * Returns: String - Two uppercase letters representing initials.
     */
    getInitials(name) {
        if (!name) return '??';
        const parts = name.split(' ');
        return parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    }

    /**
     * Asynchronously sends a DELETE request to remove the intervention.
     * Handles UI feedback (alerts) and redirection.
     * * Input: None
     * Returns: Promise<void>
     */
    async deleteItem() {
        const modalEl = document.getElementById('deleteModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        try {
            const response = await fetch(
                `${this.apiBaseUrl}/items/${this.itemId}`,
                { method: 'DELETE' }
            );

            if (response.ok) {
                alert("Intervention deleted successfully!");
                window.location.href = '/interventions';
            } else {
                alert('Error deleting item.');
            }
        } catch (error) {
            console.error(error);
            alert('Connection error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InterventionDetailsManager().init();
});