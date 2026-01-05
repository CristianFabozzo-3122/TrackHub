/*
 * UserDetailManager
 * ---------------------
 * Controls the User Details view.
 * Handles loading user profile info.
 * CONDITIONALLY loads intervention history ONLY if the user is a Technician.
 */
class UserDetailManager {
    constructor() {
        this.itemId = null;
        
        this.apiUserUrl = '/api/users';
        this.apiInterventionsUrl = '/api/interventions';

        this.currentPage = 1;
        this.itemsPerPage = 5; 

        this.dom = {
            // Layout Columns
            profileCol: document.getElementById('profile-col'),
            historyCol: document.getElementById('history-col'),

            // Header
            name: document.getElementById('detail-name'),
            idSpan: document.getElementById('detail-id'),

            // Profile Details
            roleContainer: document.getElementById('detail-role-container'),
            email: document.getElementById('detail-email'),
            phone: document.getElementById('detail-phone'),
            
            // Interventions Section
            tbody: document.getElementById('interventions-body'),
            emptyState: document.getElementById('empty-interventions'),
            loadingState: document.getElementById('loading-interventions'),
            paginationContainer: document.getElementById('pagination-container'),
            paginationControls: document.getElementById('pagination-controls'),
            paginationInfo: document.getElementById('pagination-info'),

            // Actions
            actionButtons: document.getElementById('action-buttons'),
            editLink: document.getElementById('btn-edit-link'),
            modalName: document.getElementById('modal-delete-name'),
            deleteBtn: document.getElementById('btn-confirm-delete')
        };
    }

    /**
     * Initializes the manager.
     * Extracts ID from URL, updates headers, binds events, and loads data.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        this.itemId = window.location.pathname.split('/').pop();
        if (!this.itemId) return;

        this.updateHeader();
        this.bindEvents();
        
        // 1. Load User Profile AND decide layout based on role
        await this.loadUserDetails();
    }

    /**
     * Binds event listeners to DOM elements.
     * * Input: None
     * Returns: void
     */
    bindEvents() {
        if (this.dom.deleteBtn) {
            this.dom.deleteBtn.addEventListener('click', () => this.deleteItem());
        }
    }

    /**
     * Updates the static header elements with the user ID.
     * * Input: None
     * Returns: void
     */
    updateHeader() {
        this.dom.idSpan.innerText = this.itemId;
        this.dom.editLink.href = `/users/edit/${this.itemId}`;
    }

    // --- SECTION 1: USER PROFILE & LOGIC ---

    /**
     * Asynchronously fetches user details and determines the view layout.
     * If the user is a technician, it loads the intervention history.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadUserDetails() {
        try {
            const response = await fetch(`${this.apiUserUrl}/items/${this.itemId}`);
            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            const user = data.user || data; 

            this.renderUser(user);
            
            // LOGIC CHECK: Is this user a Technician?
            // If yes, load history. If no, hide the history column.
            const role = (user.role || '').toLowerCase();
            
            if (role === 'technician') {
                // It makes sense to show history
                this.loadInterventionHistory();
            } else {
                // It's an Admin or other role -> Hide history and center profile
                this.handleNonTechnicianView();
            }

            this.dom.actionButtons.classList.remove('d-none');

        } catch (error) {
            console.error('Error loading user:', error);
            this.dom.name.innerText = 'Error loading data';
            this.dom.name.classList.add('text-danger');
        }
    }

    /**
     * Adjusts the layout for non-technician users (e.g., Admins) by hiding the history column.
     * * Input: None
     * Returns: void
     */
    handleNonTechnicianView() {
        // Hide the right column
        if (this.dom.historyCol) {
            this.dom.historyCol.classList.add('d-none');
        }

        // Adjust the left column to be centered and wider
        if (this.dom.profileCol) {
            this.dom.profileCol.classList.remove('col-md-4');
            // Use Bootstrap grid to center: 6 columns wide, offset by 3
            this.dom.profileCol.classList.add('col-md-6', 'offset-md-3');
        }
    }

    /**
     * Renders user profile information into the DOM.
     * * Input: user (Object) - The user data object.
     * Returns: void
     */
    renderUser(user) {
        const fullName = `${user.first_name} ${user.last_name}`;
        
        this.dom.name.innerText = fullName;
        if(this.dom.modalName) this.dom.modalName.innerText = fullName;
        
        this.dom.email.innerText = user.email || 'N/A';
        this.dom.phone.innerText = user.phone || 'N/A';

        this.renderRole(user.role);
    }

    /**
     * Renders the role badge with appropriate styling.
     * * Input: role (String) - The user's role.
     * Returns: void
     */
    renderRole(role) {
        let badgeClass = 'bg-secondary';
        let icon = 'bi-person';
        const r = (role || '').toLowerCase();
        
        if (r === 'admin') {
            badgeClass = 'bg-primary';
            icon = 'bi-shield-lock';
        } else if (r === 'technician') {
            badgeClass = 'bg-info text-dark';
            icon = 'bi-tools';
        }

        this.dom.roleContainer.innerHTML = `
            <span class="badge ${badgeClass} p-2 mt-1 w-100">
                <i class="bi ${icon} me-1"></i> ${role || 'Unknown'}
            </span>
        `;
    }

    // --- SECTION 2: PAGINATED ACTIVITY HISTORY (Technicians Only) ---

    /**
     * Asynchronously fetches paginated intervention history for the user (Technician).
     * * Input: None
     * Returns: Promise<void>
     */
    async loadInterventionHistory() {
        this.dom.tbody.innerHTML = '';
        this.dom.loadingState.classList.remove('d-none');
        this.dom.emptyState.classList.add('d-none');
        this.dom.paginationContainer.classList.add('d-none');

        const params = new URLSearchParams({
            page: this.currentPage,
            per_page: this.itemsPerPage,
            user_id: this.itemId 
        });

        try {
            const response = await fetch(`${this.apiInterventionsUrl}/items?${params}`);
            if (!response.ok) throw new Error("Error loading history");
            const data = await response.json();
            console.log(params.toString());
            this.dom.loadingState.classList.add('d-none');
            this.renderInterventionsTable(data.items);
            this.renderPagination(data);

        } catch (error) {
            console.error(error);
            this.dom.loadingState.classList.add('d-none');
            this.dom.tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading history</td></tr>`;
        }
    }

    /**
     * Renders the intervention history table rows.
     * * Input: items (Array) - List of intervention objects.
     * Returns: void
     */
    renderInterventionsTable(items) {
        if (!items || items.length === 0) {
            this.dom.emptyState.classList.remove('d-none');
            return;
        }

        const rowsHTML = items.map(item => {
            const date = item.date ? new Date(item.date).toLocaleDateString('it-IT') : '--';
            const detailLink = `/interventions/details/${item.intervention_id}`;

            let outcomeHtml = `<span class="badge bg-secondary">${item.outcome_description || 'Pending'}</span>`;
            if (item.outcome_description === 'Resolved') {
                outcomeHtml = `<span class="badge bg-success"><i class="bi bi-check-lg"></i> Resolved</span>`;
            } else if (item.outcome_description === 'Pending') {
                outcomeHtml = `<span class="badge bg-warning text-dark">Pending</span>`;
            }

            return `
                <tr style="cursor: pointer;" onclick="window.location.href='${detailLink}'">
                    <td class="text-nowrap">${date}</td>
                    <td class="fw-bold text-primary">${item.equipment_name || 'Unknown Device'}</td>
                    <td>
                        <div class="text-truncate" style="max-width: 200px;" title="${item.description}">
                            ${item.description || ''}
                        </div>
                    </td>
                    <td>${outcomeHtml}</td>
                </tr>
            `;
        }).join('');

        this.dom.tbody.innerHTML = rowsHTML;
    }

    /**
     * Renders the pagination controls.
     * * Input: data (Object) - Pagination metadata.
     * Returns: void
     */
    renderPagination(data) {
        if (data.total === 0) return;
        this.dom.paginationContainer.classList.remove('d-none');
        this.dom.paginationControls.innerHTML = '';
        this.dom.paginationInfo.textContent = `Page ${data.current_page} of ${data.pages} (Total: ${data.total})`;

        if (data.pages <= 1) return;

        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${data.current_page === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<button class="page-link"><i class="bi bi-chevron-left"></i></button>`;
        prevLi.onclick = (e) => {
            e.preventDefault();
            if (data.current_page > 1) {
                this.currentPage--;
                this.loadInterventionHistory();
            }
        };
        this.dom.paginationControls.appendChild(prevLi);

        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${data.current_page === data.pages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<button class="page-link"><i class="bi bi-chevron-right"></i></button>`;
        nextLi.onclick = (e) => {
            e.preventDefault();
            if (data.current_page < data.pages) {
                this.currentPage++;
                this.loadInterventionHistory();
            }
        };
        this.dom.paginationControls.appendChild(nextLi);
    }

    // --- SECTION 3: ACTIONS ---
    /**
     * Asynchronously sends a DELETE request to remove the user.
     * * Input: None
     * Returns: Promise<void>
     */
    async deleteItem() {
        // Hide the Bootstrap modal
        const modalEl = document.getElementById('deleteModal');
        if (window.bootstrap) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }

        try {
            const response = await fetch(`${this.apiUserUrl}/items/${this.itemId}`, { 
                method: 'DELETE' 
            });

            // Parse the JSON response
            const data = await response.json();

            if (response.ok) {
                alert("User deleted successfully!");
                window.location.href = '/users';
            } else {
                // HERE is the change:
                // We display the specific error message sent by the Python backend
                // e.g., "Cannot delete user: This is the only Administrator left..."
                alert(data.error || 'Error during deletion');
            }
        } catch (error) {
            console.error(error);
            alert('Connection error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UserDetailManager().init();
});