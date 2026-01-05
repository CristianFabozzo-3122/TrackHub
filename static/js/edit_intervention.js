/*
 * EditInterventionManager
 * -----------------------
 * Manages the "Edit Intervention" form.
 * Uses the centralized /api/options endpoint to populate dropdowns efficiently.
 */
class EditInterventionManager {
    constructor() {
        this.itemId = window.location.pathname.split('/').pop();
        
        this.apiItemUrl = `/api/interventions/items/${this.itemId}`;
        
        this.optionsApiUrl = '/api/options'; 

        this.dom = {
            displayId: document.getElementById('display-id'),
            form: document.getElementById('edit-form'),
            inputDate: document.getElementById('input-date'),
            inputDuration: document.getElementById('input-duration'),
            selectEquipment: document.getElementById('select-equipment'),
            selectTechnician: document.getElementById('select-technician'),
            selectOutcome: document.getElementById('select-outcome'),
            inputDesc: document.getElementById('input-description'),
            cancelBtn: document.getElementById('btn-cancel')
        };
    }

    /**
     * Initializes the manager.
     * Validates ID, loads consolidated options, loads specific intervention data, and binds events.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        if (!this.itemId || isNaN(this.itemId)) {
            alert("Invalid Intervention ID");
            window.location.href = '/interventions';
            return;
        }

        this.dom.displayId.innerText = this.itemId;

        // 1. Load ALL Options in one single HTTP request
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

    /*
     * Asynchronously fetches the aggregated dictionaries (equipment, technicians, outcomes)
     * from the centralized /api/options endpoint.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadOptions() {
        try {
            const response = await fetch(this.optionsApiUrl);
            if (!response.ok) throw new Error("Error loading options");
            
            const data = await response.json();

            // Populate Dropdowns using the data keys from your Python web.py
            
            // 1. Equipment (using 'equipments' key from python)
            this.fillSelect(this.dom.selectEquipment, data.equipments, 'equipment_id', 'name', 'Select Equipment...');
            
            // 2. Technicians (using 'technicians' key from python)
            // Note: Check if your python to_dict uses 'user_id' or 'id'. Adjusted to 'user_id' based on previous models.
            this.fillSelect(this.dom.selectTechnician, data.technicians, 'user_id', 'username', 'Select Technician...');

            // 3. Outcomes (using 'outcomes' key)
            this.fillSelect(this.dom.selectOutcome, data.outcomes, 'outcome_id', 'description', 'Select Outcome...');

        } catch (error) {
            console.error("Error loading options:", error);
            alert("Error loading dropdown lists. Please reload.");
        }
    }

    /**
     * Helper to populate a select dropdown.
     * * Input:
     * - selectElement (HTMLElement): Target select.
     * - items (Array): Data items.
     * - valueKey (String): Key for value.
     * - textKey (String): Key for text.
     * - placeholder (String): Default text.
     * Returns: void
     */
    fillSelect(selectElement, items, valueKey, textKey, placeholder) {
        selectElement.innerHTML = `<option value="" disabled>${placeholder}</option>`;
        
        if (!items) return; // Safety check

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            
            // Optional: formatting for technician names if available
            let label = item[textKey];
            if (valueKey === 'user_id' && item.first_name) {
                label = `${item.first_name} ${item.last_name} (${item.username})`;
            }

            option.textContent = label;
            selectElement.appendChild(option);
        });
    }

    /*
     * Asynchronously fetches the current data of the intervention to pre-fill inputs.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadItemData() {
        try {
            const response = await fetch(this.apiItemUrl);
            if (!response.ok) throw new Error("Error loading item data");
            
            const jsonResponse = await response.json();
            const item = jsonResponse.data || jsonResponse.intervention || jsonResponse;

            // Pre-fill inputs
            if (item.date) {
                this.dom.inputDate.value = item.date.split('T')[0];
            }
            this.dom.inputDuration.value = item.duration_minutes || 0;
            this.dom.inputDesc.value = item.description || '';
            
            // Pre-select dropdowns
            // These assignments work automatically if the <option> values match these IDs
            if(item.user_id) this.dom.selectTechnician.value = item.user_id;
            if(item.equipment_id) this.dom.selectEquipment.value = item.equipment_id;
            if(item.outcome_id) this.dom.selectOutcome.value = item.outcome_id;

        } catch (error) {
            console.error(error);
            alert("Error loading intervention details.");
        }
    }

    /**
     * Asynchronously sends the PUT request to update the intervention data.
     * * Input: None
     * Returns: Promise<void>
     */
    async saveChanges() {
        const payload = {
            date: this.dom.inputDate.value,
            duration_minutes: parseInt(this.dom.inputDuration.value),
            description: this.dom.inputDesc.value,
            technician_id: parseInt(this.dom.selectTechnician.value),
            equipment_id: parseInt(this.dom.selectEquipment.value),
            outcome_id: parseInt(this.dom.selectOutcome.value)
        };

        try {
            const response = await fetch(this.apiItemUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Intervention updated successfully!");
                window.location.href = `/interventions/details/${this.itemId}`;
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
    new EditInterventionManager().init();
});