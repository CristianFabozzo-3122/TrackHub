/*
 * EditLocationManager
 * -------------------
 * Manages the "Edit Location" form.
 * 1. Fetches existing data for the specific location.
 * 2. Pre-fills the form inputs.
 * 3. Submits updates via PUT request to the API.
 */
class EditLocationManager {
    constructor() {
        // Extract ID from URL (e.g. /locations/edit/5 -> 5)
        this.itemId = window.location.pathname.split('/').pop();
        
        // API Endpoint Construction
        // Assumes a route structure: /api/locations/items/<id>
        this.apiItemUrl = `/api/locations/items/${this.itemId}`;

        // DOM Elements Cache
        this.dom = {
            form: document.getElementById('edit-form'),
            inputName: document.getElementById('input-name'),
            inputBuilding: document.getElementById('input-building'),
            inputFloor: document.getElementById('input-floor'),
            inputDepartment: document.getElementById('input-department'),
            cancelBtn: document.getElementById('btn-cancel')
        };
    }

    /**
     * Initializes the manager.
     * Validates the ID, loads data, and binds events.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        if (!this.itemId) {
            alert("Invalid Location ID");
            window.location.href = '/locations';
            return;
        }

        // 1. Load Location Data and fill form
        await this.loadItemData();

        // 2. Attach Events
        this.dom.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveChanges();
        });

        if (this.dom.cancelBtn) {
            this.dom.cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.back();
            });
        }
    }

    /**
     * Asynchronously fetches the current data of the location and populates form inputs.
     * Uses the Location model structure (name, building, floor, department).
     * * Input: None
     * Returns: Promise<void>
     */
    async loadItemData() {
        try {
            const response = await fetch(this.apiItemUrl);
            if (!response.ok) throw new Error("Error loading location data");
            
            const jsonResponse = await response.json();
            // Wrapper handling: check if wrapped in 'location' key or returned directly
            const item = jsonResponse.location || jsonResponse;

            // Pre-fill inputs
            this.dom.inputName.value = item.name || '';
            this.dom.inputBuilding.value = item.building || '';
            this.dom.inputFloor.value = item.floor || '';
            this.dom.inputDepartment.value = item.department || '';

        } catch (error) {
            console.error(error);
            alert("Error loading location details. The resource might not exist.");
            window.location.href = '/locations';
        }
    }

    /**
     * Asynchronously sends the PUT request to update the location.
     * * Input: None
     * Returns: Promise<void>
     */
    async saveChanges() {
        const payload = {
            name: this.dom.inputName.value,
            building: this.dom.inputBuilding.value,
            floor: this.dom.inputFloor.value,
            department: this.dom.inputDepartment.value
        };

        try {
            const response = await fetch(this.apiItemUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Location updated successfully!");
                // Redirect to location list or details page
                window.location.href = '/locations'; 
            } else {
                const err = await response.json();
                alert(`Update failed: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(error);
            alert("Server connection error.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EditLocationManager().init();
});