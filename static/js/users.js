/*
 * UserManager
 * ----------------
 * Controls the main User List view.
 * Handles Pagination, Filtering, and Search logic.
 * Mirrors the architecture of EquipmentManager.
 */
class UserManager {
    constructor() {
        // Initialization of state variables
        this.currentPage = 1;
        this.itemsPerPage = 5;
        this.apiBaseUrl = '/api/users'; // Points to the user blueprint
        
        // DOM Elements Mapping
        this.dom = {
            tableBody: document.getElementById('users-table-body'),
            pagination: document.getElementById('pagination-controls'),
            info: document.getElementById('pagination-info'),
            form: document.getElementById('filter-form'),
            searchInput: document.getElementById('search-input'),
            selectRole: document.getElementById('filter-role')
        };
    }

    /**
     * Initializes the manager by loading items and binding search events.
     * * Input: None
     * Returns: Promise<void>
     */
    async init() {
        // Initial load of items
        this.loadItems();

        // Event Listener for the Search/Filter form
        this.dom.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.resetAndSearch(); 
        });
    }

    /**
     * Resets pagination to the first page and triggers a new search.
     * * Input: None
     * Returns: void
     */
    resetAndSearch() {
        this.currentPage = 1; // Reset to page 1 on new search
        this.loadItems();     // Fetch data with new filters
    }

    /**
     * Asynchronously fetches the paginated user list based on active filters.
     * * Input: None
     * Returns: Promise<void>
     */
    async loadItems() {
        // Construct Query Parameters
        const params = new URLSearchParams({
            page: this.currentPage,
            search: this.dom.searchInput.value,
            role: this.dom.selectRole.value
        });

        try {
            // Fetch data from Python API
            const response = await fetch(`${this.apiBaseUrl}/items?${params}`);
            const data = await response.json();

            // Check for API errors (e.g., unauthorized)
            if (response.status !== 200) {
                 console.error("API Error:", data.error);
                 return;
            }

            // Render UI
            this.renderTable(data.items);
            this.renderPagination(data);

        } catch (error) {
            console.error("Error loading users:", error);
            this.dom.tableBody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Connection Error</td></tr>`;
        }
    }

    /**
     * Renders the user table rows into the DOM.
     * * Input: items (Array) - The list of user objects.
     * Returns: void
     */
    renderTable(items) {
        this.dom.tableBody.innerHTML = '';

        // Handle Empty State
        if (!items || items.length === 0) { 
            this.dom.tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No results found</td></tr>`;
            return;
        }

        // Generate HTML for each user row
        const rowsHTML = items.map(item => {
            const roleBadge = this.getRoleBadge(item.role);
            const initial = item.first_name ? item.first_name.charAt(0).toUpperCase() : '?';
            
            return `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div>
                            <span class="fw-bold text-dark">${item.first_name} ${item.last_name}</span>
                            <div class="small text-muted">@${item.username}</div>
                        </div>
                    </div>
                </td>
                <td>${roleBadge}</td>
                <td>
                    <div class="d-flex flex-column small">
                        <span><i class="bi bi-envelope me-1 text-muted"></i> ${item.email || 'N/A'}</span>
                        <span><i class="bi bi-telephone me-1 text-muted"></i> ${item.phone || 'N/A'}</span>
                    </div>
                </td>
                <td class="text-end pe-4">
                    <a href="/users/details/${item.user_id}" class="btn btn-sm btn-light text-secondary rounded-circle" title="View Details">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </td>
            </tr>`;
        }).join('');

        this.dom.tableBody.innerHTML = rowsHTML;
    }

    /**
     * Renders the pagination controls (Previous/Next buttons).
     * * Input: data (Object) - Pagination metadata (pages, total, etc.).
     * Returns: void
     */
    renderPagination(data) {
        this.dom.info.textContent = `Page ${data.current_page} of ${data.pages} (Total ${data.total})`;
        this.dom.pagination.innerHTML = '';

        if (data.pages <= 1) return;

        // Previous Button
        const prevBtn = this.createPageButton('Previous', data.current_page > 1, () => {
            this.currentPage--;
            this.loadItems();
        });
        
        // Next Button
        const nextBtn = this.createPageButton('Next', data.current_page < data.pages, () => {
            this.currentPage++;
            this.loadItems();
        });

        this.dom.pagination.appendChild(prevBtn);
        this.dom.pagination.appendChild(nextBtn);
    }

    /**
     * Helper to create a pagination button list item.
     * * Input:
     * - text (String): Button label.
     * - isEnabled (Boolean): Whether the button is clickable.
     * - onClick (Function): Callback function.
     * Returns: HTMLElement (LI)
     */
    createPageButton(text, isEnabled, onClick) {
        const li = document.createElement('li');
        li.className = `page-item ${!isEnabled ? 'disabled' : ''}`;
        const button = document.createElement('button');
        button.className = 'page-link';
        button.textContent = text;
        if (isEnabled) button.onclick = onClick;
        li.appendChild(button);
        return li;
    }

    /**
     * Helper to return the appropriate HTML badge for a user role.
     * * Input: role (String) - The user's role.
     * Returns: String - HTML string for the badge.
     */
    getRoleBadge(role) {
        if (!role) return '<span class="badge bg-secondary">Unknown</span>';
        
        // Case-insensitive check
        const r = role.toLowerCase();
        
        if (r === 'admin') {
            return '<span class="badge bg-primary"><i class="bi bi-shield-lock"></i> Admin</span>';
        } else if (r === 'technician') {
            return '<span class="badge bg-info text-dark"><i class="bi bi-tools"></i> Technician</span>';
        }
        
        return `<span class="badge bg-light text-dark border">${role}</span>`;
    }
}

// Instantiate and Run on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    new UserManager().init();
});