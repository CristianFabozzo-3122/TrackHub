/*
 * CreateInterventionManager
 * -------------------------
 * Manages the "New Intervention" form.
 * Handles fetching dropdown options, pre-filling data from URL parameters, 
 * and submitting the intervention data.
 */
class CreateInterventionManager {
    constructor() {
        // API Endpoints
        this.createApiUrl = '/api/interventions/item';
        this.optionsApiUrl = '/api/options';

        // DOM Elements Cache
        this.dom = {
            form: document.getElementById('create-intervention-form'),
            
            // Dropdowns
            selectTechnician: document.getElementById('select-technician'),
            selectEquipment: document.getElementById('select-equipment'),
            selectOutcome: document.getElementById('select-outcome'),
            
            // Inputs
            inputDate: document.getElementById('input-date'),
            inputDesc: document.getElementById('input-description')
        };
    }

    /**
     * Initializes the manager.
     * Loads options, checks URL parameters, sets default values, and binds events.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        // 1. Load Select Options. We MUST wait (await) for this to finish
        // before we can select the correct equipment from the URL.
        await this.loadOptions();

        // 2. Check URL for ?equipment_id=X and pre-select it
        this.checkUrlParameters();

        // 3. Set default date
        this.setDefaultDate();

        // 4. Bind Event Listeners
        if (this.dom.form) {
            this.dom.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveData(); 
            });
        }
    }

    /**
     * Checks the URL query parameters for an 'equipment_id' and pre-selects 
     * the corresponding option in the dropdown if present.
     * * Input: None
     * Returns: void
     */
    checkUrlParameters() {
        // Parse the query string (e.g., ?equipment_id=5)
        const urlParams = new URLSearchParams(window.location.search);
        const equipmentId = urlParams.get('equipment_id'); 
        
        // If an ID exists in the URL and the dropdown exists
        if (equipmentId && this.dom.selectEquipment) {
            // This works only because we awaited loadOptions() in init()
            this.dom.selectEquipment.value = equipmentId;
        }
    }

    /**
     * Sets the default value of the date input to the current date.
     * * Input: None
     * Returns: void
     */
    setDefaultDate() {
        if (this.dom.inputDate) {
            this.dom.inputDate.valueAsDate = new Date();
        }
    }

    /**
     * Asynchronously fetches options (Technicians, Equipment, Outcomes) from the API.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadOptions() {
        try {
            const response = await fetch(this.optionsApiUrl);
            if (!response.ok) throw new Error("Error loading options");
            
            const data = await response.json();

            // Populate Technicians (Formatting Name)
            const formattedTechs = data.technicians.map(t => ({
                value: t.user_id, 
                label: `${t.first_name} ${t.last_name}`
            }));
            this.fillSelect(this.dom.selectTechnician, formattedTechs, 'value', 'label', 'Select technician...');

            // Populate Equipment
            this.fillSelect(this.dom.selectEquipment, data.equipments, 'equipment_id', 'name', 'Select device...');

            // Populate Outcomes
            this.fillSelect(this.dom.selectOutcome, data.outcomes, 'outcome_id', 'description', 'Select outcome...');

        } catch (error) {
            console.error(error);
            alert("Unable to load dropdown options. Please reload the page.");
        }
    }

    /**
     * Helper to populate a select dropdown.
     * * Input:
     * - selectElement (HTMLElement): Target select.
     * - items (Array): Data items.
     * - valueKey (String): Property for option value.
     * - textKey (String): Property for option label.
     * - placeholder (String): Default text.
     * Returns: void
     */
    fillSelect(selectElement, items, valueKey, textKey, placeholder) {
        if (!selectElement) return;

        selectElement.innerHTML = `<option value="" selected disabled>${placeholder}</option>`;
        
        items.forEach(item => {
            const option = document.createElement('option');
            const val = item[valueKey] !== undefined ? item[valueKey] : item.id;
            option.value = val;
            option.textContent = item[textKey];
            selectElement.appendChild(option);
        });
    }

    /**
     * Collects form data and sends a POST request to create the intervention.
     * * Input: None
     * Returns: Promise<void>
     */
    async saveData() {
        const payload = {
            technician_id: parseInt(this.dom.selectTechnician.value),
            equipment_id: parseInt(this.dom.selectEquipment.value),
            outcome_id: parseInt(this.dom.selectOutcome.value),
            date: this.dom.inputDate.value,
            description: this.dom.inputDesc.value
        };

        try {
            const response = await fetch(this.createApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Intervention registered successfully!");
                // Redirect back to the equipment detail if we came from there, 
                // OR to the general intervention list. 
                // For simplicity, let's go to the interventions list:
                window.location.href = '/interventions'; 
            } else {
                const errData = await response.json();
                alert(`Error creating intervention: ${errData.error || 'Invalid data'}`);
            }

        } catch (error) {
            console.error("Save error:", error);
            alert("Server connection error.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CreateInterventionManager().init();
});