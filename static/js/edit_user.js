/*
 * EditUserManager
 * ---------------
 * Manages the "Edit User" form.
 */
class EditUserManager {
    constructor() {
        this.userId = window.location.pathname.split('/').pop();
        this.apiItemUrl = `/api/users/items/${this.userId}`;

        this.dom = {
            form: document.getElementById('edit-form'),
            inputUsername: document.getElementById('input-username'),
            inputFirstName: document.getElementById('input-first-name'),
            inputLastName: document.getElementById('input-last-name'),
            inputEmail: document.getElementById('input-email'),
            inputPhone: document.getElementById('input-phone'),
            selectRole: document.getElementById('select-role'),
            roleWarning: document.getElementById('role-warning'), // Ensure this exists in HTML
            cancelBtn: document.getElementById('btn-cancel')
        };
    }

    async init() {
        if (!this.userId) {
            alert("Invalid User ID");
            window.location.href = '/users';
            return;
        }

        await this.loadUserData();

        this.dom.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveChanges();
        });
    }

    async loadUserData() {
        try {
            const response = await fetch(this.apiItemUrl);
            if (!response.ok) throw new Error("Error loading user data");
            
            const jsonResponse = await response.json();
            const user = jsonResponse.user || jsonResponse;

            // Pre-fill inputs
            this.dom.inputUsername.value = user.username || '';
            this.dom.inputFirstName.value = user.first_name || '';
            this.dom.inputLastName.value = user.last_name || '';
            this.dom.inputEmail.value = user.email || '';
            this.dom.inputPhone.value = user.phone || '';
            
            this.dom.selectRole.value = user.role;

            // --- STRICT UI LOCK ---
            // If the user is a Technician, lock the 'admin' option immediately.
            if (user.role === 'technician') {
                // Find the Admin option and disable it
                for (let i = 0; i < this.dom.selectRole.options.length; i++) {
                    if (this.dom.selectRole.options[i].value === 'admin') {
                        this.dom.selectRole.options[i].disabled = true;
                        this.dom.selectRole.options[i].text += " (Locked)";
                    }
                }
                
                // Display warning message
                if (this.dom.roleWarning) {
                    this.dom.roleWarning.textContent = "Role locked: Technicians cannot be promoted to Admin.";
                    this.dom.roleWarning.classList.remove('d-none');
                }
            }

        } catch (error) {
            console.error(error);
            alert("Error loading user details.");
            window.location.href = '/users';
        }
    }

    async saveChanges() {
        const payload = {
            first_name: this.dom.inputFirstName.value,
            last_name: this.dom.inputLastName.value,
            email: this.dom.inputEmail.value,
            phone: this.dom.inputPhone.value,
            role: this.dom.selectRole.value
        };

        try {
            const response = await fetch(this.apiItemUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("User profile updated successfully!");
                window.location.href = '/users';
            } else {
                const err = await response.json();
                // Show backend error (e.g., "Operation Forbidden")
                alert(`Update failed: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(error);
            alert("Server connection error.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EditUserManager().init();
});