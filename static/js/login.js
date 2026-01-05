/*
 * LoginManager
 * ------------
 * Manages the "User Login" form.
 * 1. Collects username and password.
 * 2. Submits data via POST request.
 * 3. Handles redirection on success or alerts on failure.
 */
class LoginManager {
    constructor() {
        // API Endpoint defined in routes/user.py
        this.apiLoginUrl = '/api/users/login';

        // DOM Elements Cache
        this.dom = {
            form: document.getElementById('login-form'),
            inputUsername: document.getElementById('input-username'),
            inputPassword: document.getElementById('input-password'),
            submitBtn: document.querySelector('button[type="submit"]')
        };
    }

    /**
     * Initializes the manager by attaching the submit listener to the form.
     * * Input: None
     * Returns: void
     */
    init() {
        // Attach Events
        if (this.dom.form) {
            this.dom.form.addEventListener('submit', (e) => {
                e.preventDefault(); // Stop page reload
                this.performLogin();
            });
        }
    }

    /**
     * Asynchronously sends the POST request to authenticate the user.
     * Handles success (redirection) and failure (alert) scenarios.
     * * Input: None
     * Returns: Promise<void>
     */
    async performLogin() {
        // Visual feedback: Disable button during request

        const payload = {
            username: this.dom.inputUsername.value.trim(),
            password: this.dom.inputPassword.value
        };

        try {
            const response = await fetch(this.apiLoginUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                // Success Scenario
                alert("Login successful!");
                // Redirect to the URL provided by backend or default to equipment list
                window.location.href = data.redirect || '/equipment'; 
            } else {
                // Error Scenario
                const err = await response.json();
                alert(`Login failed: ${err.error || 'Invalid credentials'}`);
                // Reset password field for UX
                this.dom.inputPassword.value = '';
                this.dom.inputPassword.focus();
            }

        } catch (error) {
            console.error(error);
            alert("Server connection error. Please try again.");
        }
    }

}

document.addEventListener('DOMContentLoaded', () => {
    new LoginManager().init();
});