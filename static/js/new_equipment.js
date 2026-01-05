/*
 * CreateEquipmentManager
 * ----------------------
 * Manages the "New Equipment" form logic.
 * Handles fetching dropdown options from the server and submitting form data.
 */
class CreateEquipmentManager {
    constructor() {
        this.createApiUrl = '/api/equipment/item';
        this.optionsApiUrl = '/api/options';

        // DOM Elements Cache
        this.dom = {
            form: document.getElementById('create-form'),
            inputName: document.getElementById('input-name'),
            selectType: document.getElementById('select-type'),
            selectStatus: document.getElementById('select-status'),
            selectLocation: document.getElementById('select-location'),
            inputDesc: document.getElementById('input-description')
        };
    }

    /**
     * Initializes the manager.
     * Loads options and binds the form submission event.
     * * Input: None
     * Returns: void
     */
    init() {
        // Load Select Options on startup
        this.loadOptions();

        // Event Listener: Form Submission
        this.dom.form.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevents standard browser reload
            this.saveData();    // Triggers AJAX/Fetch logic
        });
    }

    /**
     * Asynchronously fetches dictionaries (Types, Statuses, Locations) from the backend
     * to populate the <select> dropdowns dynamically.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadOptions() {
        try {
            const response = await fetch(this.optionsApiUrl);
            if (!response.ok) throw new Error("Error loading options");
            
            const data = await response.json();

            // Reusing a helper function to populate multiple select elements
            this.fillSelect(this.dom.selectType, data.types, 'type_id', 'description', 'Select type...');
            this.fillSelect(this.dom.selectStatus, data.statuses, 'status_id', 'description', 'Select status...');
            this.fillSelect(this.dom.selectLocation, data.locations, 'location_id', 'name', 'Select location...');

        } catch (error) {
            console.error(error);
            alert("Unable to load dropdown options. Please reload the page.");
        }
    }

    /**
     * Helper method to populate a <select> element with <option> tags.
     * * Input:
     * - selectElement (HTMLElement): The select element to populate.
     * - items (Array): The list of data objects.
     * - valueKey (String): The property name to use for the option value.
     * - textKey (String): The property name to use for the option label.
     * - placeholder (String): The default disabled placeholder text.
     * Returns: void
     */
    fillSelect(selectElement, items, valueKey, textKey, placeholder) {
        selectElement.innerHTML = `<option value="" selected disabled>${placeholder}</option>`;
        
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
     * Collects form data, serializes it to JSON, and sends a POST request to create the equipment.
     * * Input: None
     * Returns: Promise<void>
     */
    async saveData() {
        // JSON Payload Construction
        const payload = {
            name: this.dom.inputName.value,
            description: this.dom.inputDesc.value,
            type_id: parseInt(this.dom.selectType.value),
            status_id: parseInt(this.dom.selectStatus.value),
            location_id: parseInt(this.dom.selectLocation.value)
        };

        try {
            // Fetch configuration for POST request
            const response = await fetch(this.createApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' // Essential for Flask to parse request.get_json()
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // const data = await response.json();
                alert("Device registered successfully!");
                window.location.href = '/equipment'; 
            } else {
                const errData = await response.json();
                alert(`Error creating device: ${errData.error || 'Invalid data'}`);
            }

        } catch (error) {
            console.error("Save error:", error);
            alert("Server connection error.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CreateEquipmentManager().init();
});