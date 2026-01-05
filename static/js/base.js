/**
 * AuthManager
 * -----------
 * Responsible for synchronizing the client-side UI with the server-side authentication state.
 * Since the application uses Client-Side Rendering logic for the navbar, this class
 * determines whether to show "Login" or "User Menu/Logout" upon page load.
 */
class AuthManager {
    constructor() {
        // API Endpoints defined in routes/user.py
        // 'me': GET request to check session cookie validity
        // 'logout': POST request to clear the session
        this.apiStatusUrl = '/api/users/me';
        this.apiLogoutUrl = '/api/users/logout';
        
        // Cache DOM elements to improve performance (avoids querying the DOM repeatedly).
        // These IDs must match the HTML structure in base.html.
        this.dom = {
            loginItem: document.getElementById('nav-login-item'),       // The "Login" nav link
            userItem: document.getElementById('nav-user-item'),         // The Dropdown menu (hidden by default)
            usernameDisplay: document.getElementById('nav-username-display'), // Span/Link to show current username
            logoutBtn: document.getElementById('logout-btn'),            // The actual "Logout" button inside dropdown
            usersItem: document.getElementById('nav-users-item') //The link for Users page (show if we are logged as Admin)
        };
    }

    /**
     * Entry point for the class.
     * 1. Immediately checks if the user is logged in.
     * 2. Sets up event listeners for user actions (Logout).
     * * Input: None
     * Returns: void
     */
    init() {
        this.checkAuthStatus();
        this.bindLogout();
    }

    /**
     * Asynchronous Identity Verification.
     * Fetches the current session status from the backend to determine UI state.
     * * Input: None
     * Returns: Promise<void>
     */
    async checkAuthStatus() {
        try {
            // Await the network response from the 'Who am I' endpoint
            const response = await fetch(this.apiStatusUrl);
            const data = await response.json();

            // Logical Branching based on API response
            // The backend returns { authenticated: true, user: {...} } if session exists
            if (data.authenticated) {
                this.showLoggedIn(data.user);
            } else {
                this.showLoggedOut();
            }
        } catch (error) {
            // Error Handling / Fail-safe
            // If the API fails (500 error, network down), default to "Logged Out" view
            // to prevent the UI from getting stuck in an undefined state.
            console.error("Auth check failed:", error);
            this.showLoggedOut(); 
        }
    }

    /**
     * UI State Transition: Authenticated.
     * Swaps the "Login" link for the "User Menu".
     * * Input: user (Object) - The user object returned by the API (contains username, role, etc.).
     * Returns: void
     */
    showLoggedIn(user) {
        // Hide the public "Login" link
        if (this.dom.loginItem) this.dom.loginItem.classList.add('d-none');
        
        // Reveal the authenticated "User Menu"
        if (this.dom.userItem) {
            this.dom.userItem.classList.remove('d-none');
            
            // Dynamic Content Injection:
            // Updates the DOM to display the specific username of the logged-in tech/admin.
            this.dom.usernameDisplay.innerHTML = `<i class="bi bi-person-circle"></i> ${user.username}`;
        }

        if (this.dom.usersItem && user.role === 'admin') {
            this.dom.usersItem.classList.remove('d-none');
        }
    }

    /**
     * UI State Transition: Guest / Anonymous.
     * Ensures the "Login" link is visible and the "User Menu" is hidden.
     * * Input: None
     * Returns: void
     */
    showLoggedOut() {
        // Reveal the public "Login" link
        if (this.dom.loginItem) this.dom.loginItem.classList.remove('d-none');
        
        // Hide the authenticated "User Menu"
        if (this.dom.userItem) this.dom.userItem.classList.add('d-none');
    }

    /**
     * Event Binding.
     * Attaches the click handler to the logout button.
     * We use JS handling instead of a standard HTML href to enforce a POST request.
     * * Input: None
     * Returns: void
     */
    bindLogout() {
        if (this.dom.logoutBtn) {
            this.dom.logoutBtn.addEventListener('click', async (e) => {
                // Prevent Default: Stops the <a> tag from performing a standard GET navigation
                e.preventDefault();
                
                // Trigger the async logout logic
                await this.performLogout();
            });
        }
    }

    /**
     * Logout Execution.
     * Sends a POST request to tell Flask-Login to clear the session cookies.
     * * Input: None
     * Returns: Promise<void>
     */
    async performLogout() {
        try {
            // Method: POST is required for state-changing actions (security best practice)
            const response = await fetch(this.apiLogoutUrl, { method: 'POST' });
            
            if (response.ok) {
                // Success Flow:
                // Redirect the user to the login page to confirm session termination.
                window.location.href = '/login'; 
            } else {
                // Failure Flow:
                // Alert the user if the server rejected the request.
                alert("Error during logout process.");
            }
        } catch (error) {
            console.error("Network error during logout:", error);
        }
    }
}

// Initialization on DOM Ready
// Ensures HTML elements exist before the script tries to access them.
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager().init();
});