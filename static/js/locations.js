/**
 * LocationsManager
 * ----------------
 * Manages the Locations Dashboard view.
 * Handles fetching statistics, rendering cards, and managing actions (Edit/Delete).
 */
class LocationsManager {
    constructor() {
        // Endpoint to get location stats
        this.apiStatsUrl = '/api/locations/stats';
        // Base endpoint for single item operations (Delete)
        this.apiItemUrl = '/api/locations/items';
        
        this.dom = {
            grid: document.getElementById('locations-grid'),
        };
    }

    /**
     * Entry point for the class.
     * Starts fetching data immediately upon initialization.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        await this.loadItems();
    }

    /**
     * Asynchronously fetches location statistics from the API.
     * Handles API errors and updates the UI accordingly.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadItems() {
        try {
            const response = await fetch(this.apiStatsUrl);
            
            if (!response.ok) throw new Error("API Error");

            const items = await response.json();
            
            // Pass the raw data to the renderer
            this.renderGrid(items);

        } catch (error) {
            console.error('Error loading locations:', error);
            
            this.dom.grid.innerHTML = `
                <div class="col-12 text-center text-danger py-5">
                    <p class="mt-2">Connection Error.</p>
                </div>
            `;
        }
    }

    /**
     * Renders the grid of location cards based on the fetched data.
     * Binds event listeners to dynamic elements (Delete buttons).
     * * Input: items (Array) - List of location objects containing stats.
     * Returns: void
     */
    renderGrid(items) {
        // Clear previous content
        this.dom.grid.innerHTML = '';

        // Generate HTML
        const cardsHTML = items.map(loc => this.createCardHtml(loc)).join('');
        this.dom.grid.innerHTML = cardsHTML;

        // Attach Event Listeners to Delete Buttons
        // We use querySelectorAll AFTER the HTML is injected
        const deleteButtons = this.dom.grid.querySelectorAll('.btn-delete');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // Retrieve ID from the data-id attribute
                const id = e.currentTarget.dataset.id; 
                this.deleteItem(id);
            });
        });
    }

    /**
     * Generates the HTML string for a single location card.
     * Includes Edit (link) and Delete (button) actions.
     * * Input: loc (Object) - The location data object.
     * Returns: String - HTML representation of the card.
     */
    createCardHtml(loc) {
        const isEmpty = loc.item_count === 0;
        
        const badgeClass = isEmpty ? 'bg-light text-muted border' : 'bg-secondary';
        const btnClass = isEmpty ? 'btn-outline-secondary disabled' : 'btn-outline-primary';
        const btnText = isEmpty ? 'Empty' : 'Show items';
        
        const linkUrl = isEmpty ? '#' : `/equipment?location_id=${loc.location_id}`;

        return `
        <div class="col-md-4 col-lg-3">
            <div class="card h-100 shadow-sm border-0 hover-effect">
                <div class="card-body">
                    
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge ${badgeClass} rounded-pill">
                            ${loc.item_count} items
                        </span>

                        <div class="d-flex gap-2">
                            <a href="/locations/edit/${loc.location_id}" class="text-warning" title="Edit Location">
                                <i class="bi bi-pencil-square"></i>
                            </a>
                            <a href="#" class="text-danger btn-delete" data-id="${loc.location_id}" title="Delete Location">
                                <i class="bi bi-trash"></i>
                            </a>
                        </div>
                    </div>
                    
                    <h5 class="card-title mb-1 fw-bold text-truncate" title="${loc.name}">
                        ${loc.name}
                    </h5>
                    <p class="card-text text-muted small">
                        ${loc.building || 'Main Building'} - ${loc.floor || 'G'}
                    </p>
                </div>

                <div class="card-footer bg-white border-top-0 d-grid pb-3">
                    <a href="${linkUrl}" class="btn btn-sm ${btnClass}">
                        ${btnText}
                    </a>
                </div>
            </div>
        </div>`;
    }

    /**
     * Asynchronously deletes a location.
     * Requests confirmation before proceeding.
     * * Input: id (String/Number) - The ID of the location to delete.
     * Returns: Promise<void>
     */
    async deleteItem(id) {
        if (!confirm("Are you sure you want to delete this location? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await fetch(`${this.apiItemUrl}/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Refresh the grid to show updated data
                await this.loadItems();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error || 'Could not delete item'}`);
            }
        } catch (error) {
            console.error(error);
            alert("Server connection error during deletion.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LocationsManager().init();
});