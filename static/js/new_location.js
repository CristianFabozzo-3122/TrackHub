/**
 * CreateLocationManager
 * -------------------
 * Manages the "New Location" form view.
 * Handles data collection, validation, and API submission.
 */
class CreateLocationManager {
    constructor() {
        this.createApiUrl = '/api/locations/item';
        this.dom = {
            form: document.getElementById('location-form'),
            btnSave: document.getElementById('save-btn'),
            name: document.getElementById('name'),
            building: document.getElementById('building'),
            floor: document.getElementById('floor')
            
        };
    }

    /**
     * Initializes the manager by binding the submit event.
     * * Input: None
     * Returns: void
     */
    init() {
        if (!this.dom.form) return;

        // Bind the submit event to the handler
        this.dom.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveData();
        });
    }

    /**
     * Collects form data and sends a POST request to create a new location.
     * * Input: None
     * Returns: Promise<void>
     */
    async saveData() {
        // JSON Payload Construction
        const payload = {
            name: this.dom.name.value.trim(),
            building: this.dom.building.value.trim(),
            floor: this.dom.floor.value.trim()
        };

        try {
            // Send POST request
            const response = await fetch(this.createApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            // Check response status immediately
            if (response.ok) {
                // Success: parse data and redirect
                const data = await response.json();
                alert("Location created successfully!");
                window.location.href = '/locations'; 
            } else {
                // Server Error: parse specific error message
                const errData = await response.json();
                alert(`Error creating location: ${errData.error || 'Invalid data'}`);
            }

        } catch (error) {
            // Network or Parsing Error
            console.error("Submission error:", error);
            alert("Server connection error.");
        }
    }

};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CreateLocationManager().init();
});