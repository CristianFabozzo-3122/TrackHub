/*
 * EditEquipmentManager
 * --------------------
 * Manages the "Edit Equipment" form.
 * 1. Loads dropdown options (Types, Status, Location).
 * 2. Fetches existing data for the specific item.
 * 3. Pre-fills the form inputs.
 * 4. Submits updates via PUT request.
 */
class EditEquipmentManager {
    constructor() {
        // Extract ID from URL (e.g. /equipment/edit/15 -> 15)
        this.itemId = window.location.pathname.split('/').pop();
        
        this.apiItemUrl = `/api/equipment/items/${this.itemId}`;
        this.optionsApiUrl = '/api/options';

        // DOM Elements Cache
        this.dom = {
            form: document.getElementById('edit-form'),
            inputName: document.getElementById('input-name'),
            selectType: document.getElementById('select-type'),
            selectStatus: document.getElementById('select-status'),
            selectLocation: document.getElementById('select-location'),
            inputDesc: document.getElementById('input-description'),
            cancelBtn: document.getElementById('btn-cancel')
        };
    }

    /**
     * Initializes the manager.
     * Validates the ID, loads options and data, and binds events.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        if (!this.itemId) {
            alert("Invalid Item ID");
            window.location.href = '/equipment';
            return;
        }

        // 1. Load Dropdown Options first
        await this.loadOptions();
        
        // 2. Load Item Data and fill form
        await this.loadItemData();

        // 3. Attach Events
        this.dom.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveChanges();
        });

        if (this.dom.cancelBtn) {
            this.dom.cancelBtn.addEventListener('click', () => {
                window.history.back();
            });
        }
    }

    /**
     * Asynchronously fetches dictionaries for dropdowns from the options API.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadOptions() {
        try {
            const response = await fetch(this.optionsApiUrl);
            if (!response.ok) throw new Error("Error loading options");
            const data = await response.json();

            this.fillSelect(this.dom.selectType, data.types, 'type_id', 'description', 'Select type...');
            this.fillSelect(this.dom.selectStatus, data.statuses, 'status_id', 'description', 'Select status...');
            this.fillSelect(this.dom.selectLocation, data.locations, 'location_id', 'name', 'Select location...');
        } catch (error) {
            console.error(error);
            alert("Error loading form options.");
        }
    }

    /**
     * Helper to populate a select element with a placeholder.
     * * Input:
     * - selectElement (HTMLElement): Target select.
     * - items (Array): Data items.
     * - valueKey (String): Property for value.
     * - textKey (String): Property for display text.
     * - placeholder (String): Default disabled option text.
     * Returns: void
     */
    fillSelect(selectElement, items, valueKey, textKey, placeholder) {
        selectElement.innerHTML = `<option value="" disabled>${placeholder}</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            let label = item[textKey];
            if (valueKey === 'location_id' && item.building) {
                label += ` (${item.building})`;
            }
            option.textContent = label;
            selectElement.appendChild(option);
        });
    }

    /**
     * Asynchronously fetches the current data of the equipment and populates form inputs.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadItemData() {
        try {
            const response = await fetch(this.apiItemUrl);
            if (!response.ok) throw new Error("Error loading item data");
            
            const jsonResponse = await response.json();
           // Wrapper handling: could be { equipment: {...} } or the object itself
            const item = jsonResponse.equipment || jsonResponse;

            // Pre-fill inputs
            this.dom.inputName.value = item.name || '';
            this.dom.inputDesc.value = item.description || '';
            
            // Pre-select dropdowns (using IDs from the flat JSON model)
            this.dom.selectType.value = item.type_id;
            this.dom.selectStatus.value = item.status_id;
            this.dom.selectLocation.value = item.location_id;

        } catch (error) {
            console.error(error);
            alert("Error loading equipment details.");
        }
    }

    /**
     * Asynchronously sends the PUT request to update the item with form data.
     * * Input: None
     * Returns: Promise<void>
     */
    async saveChanges() {
        const payload = {
            name: this.dom.inputName.value,
            description: this.dom.inputDesc.value,
            type_id: parseInt(this.dom.selectType.value),
            status_id: parseInt(this.dom.selectStatus.value),
            location_id: parseInt(this.dom.selectLocation.value)
        };

        try {
            const response = await fetch(this.apiItemUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Equipment updated successfully!");
                window.location.href = `/equipment/details/${this.itemId}`; // return to object's detail page
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
    new EditEquipmentManager().init();
});