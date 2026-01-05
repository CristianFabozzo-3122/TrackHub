/*
 * CreateUserManager
 * -----------------
 * Handles the logic for creating a new system user.
 * Collects form data, builds the JSON payload, and calls the API.
 */
class CreateUserManager {
    constructor() {
        this.createApiUrl = '/api/users/create';
        
        // DOM Cache: Centralized reference to HTML elements
        this.dom = {
            form: document.getElementById('create-user-form'),
            username: document.getElementById('input-username'),
            password: document.getElementById('input-password'),
            firstName: document.getElementById('input-firstname'),
            lastName: document.getElementById('input-lastname'),
            email: document.getElementById('input-email'),
            phone: document.getElementById('input-phone'),
            role: document.getElementById('select-role')
        };
    }

    /**
     * Initializes the manager by binding the form submission event.
     * * Input: None
     * Returns: void
     */
    init() {
        if (this.dom.form) {
            this.dom.form.addEventListener('submit', (e) => {
                e.preventDefault(); // Stop page reload
                this.saveData();    // Trigger Async Save
            });
        }
    }

    /**
     * Collects form data, constructs the payload, and sends a POST request.
     * Note: Password hashing is handled by the server.
     * * Input: None
     * Returns: Promise<void>
     */
    async saveData() {
        // Construct Payload
        // Note: Password is sent as plain text over HTTPS. 
        // Hashing happens on the SERVER (Service Layer), never on the client.
        const payload = {
            username: this.dom.username.value.trim(),
            password: this.dom.password.value, 
            first_name: this.dom.firstName.value.trim(),
            last_name: this.dom.lastName.value.trim(),
            email: this.dom.email.value.trim(),
            phone: this.dom.phone.value.trim(),
            role: this.dom.role.value
        };

        try {
            const response = await fetch(this.createApiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Success: Redirect to dashboard or user list
                alert("User created successfully!");
                window.location.href = '/users'; 
            } else {
                // Failure: Parse error message from backend (e.g. "Username taken")
                const errData = await response.json();
                alert(`Error: ${errData.error || 'Failed to create user'}`);
            }

        } catch (error) {
            console.error("Network/Server Error:", error);
            alert("Server connection error. Please try again.");
        }
    }
}

// Instantiate on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    new CreateUserManager().init();
});