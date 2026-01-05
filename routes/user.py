from models import Roles
from flask import Blueprint, request, jsonify
from services.user_service import UserService
from flask_login import login_required, current_user
from utils.security import public_route

user_bp = Blueprint('user', __name__, url_prefix='/api/users')

# --- API Routes (JSON) ---

@user_bp.route('/technicians', methods=['GET'])
def get_all_technicians():
    """
    API to fetch all users with the 'Technician' role.
    
    Returns:
        Response: JSON list of technician objects.
    """
    technicians_data = UserService.get_all_technicians()

    return jsonify(technicians_list)

@user_bp.route('/create', methods=['POST'])
def create_user():
    """
    Handles the creation of a new user.
    Security: This endpoint is restricted to Administrators only.
    
    Args (JSON Payload):
        username, password, role, first_name, last_name, email, phone.

    Returns:
        Response: 
            - 201: User created successfully.
            - 403: Forbidden if current user is not Admin.
            - 400/500: Validation or Server error.
    """

    # Authorization (Role Based Access Control)
    # We explicitly check the role of the user making the request.
    # 'current_user' is a proxy provided by Flask-Login representing the logged-in user.
    if current_user.role != Roles.ADMIN:
        # HTTP 403 Forbidden: You are logged in, but you don't have permission.
        return jsonify({'error': 'Access Denied: Only Administrators can create users.'}), 403

    # --- Proceed with Business Logic ---
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON payload'}), 400

    try:
        new_user = UserService.create_user(data)
        
        return jsonify({
            'message': 'User created successfully', 
            'user': new_user.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    except Exception as e:
        print(f"[CRITICAL] User Creation Failed: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500




@user_bp.route('/login', methods=['POST'])
@public_route
def login_api():
    """
    Handles User Authentication.
    Architectural Note: This route delegates ALL business logic to UserService.
    It only handles the HTTP layer (request parsing and response formatting).
    
    Args (JSON Payload):
        username (str): The user's identifier.
        password (str): The user's password.

    Returns:
        Response:
            - 200: Login successful, returns User object and redirect path.
            - 401: Unauthorized (Invalid credentials).
            - 400: Bad Request.
    """

    # --- 1. HTTP Layer Validation ---
    # Only check if we received data at all. 
    # Detailed validation (missing fields) belongs to the Service layer.
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid or missing JSON payload'}), 400

    try:
        # --- 2. Delegate to Service ---
        # The Service will raise ValueError if fields are missing or creds are wrong.
        user = UserService.login(data)
        
        # --- 3. Success Response ---
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'redirect': '/'
        }), 200

    except ValueError as e:
        # --- 4. Handle Business Errors ---
        # Catch errors from Service (e.g., "Missing username", "Invalid password")
        # Map them to HTTP 401 Unauthorized.
        return jsonify({'error': str(e)}), 401

    except Exception as e:
        # --- 5. Handle System Errors ---
        print(f"[LOGIN ERROR] {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

@user_bp.route('/logout', methods=['POST'])
@public_route
@login_required
def logout_api():
    """
    API Endpoint: User Logout.
    Delegates session cleanup to the AuthService (UserService).
    
    Returns:
        Response: HTTP 200 Success message.
    """

    # 1. Delegate to Service
    UserService.logout()

    # 2. Return Success
    return jsonify({'message': 'Logged out successfully'}), 200


@user_bp.route('/me', methods=['GET'])
def get_current_user_status():
    """
    API Endpoint: Session Verification ('Who am I?').
    Allows the Client-Side application to determine the current authentication state
    without reloading the page. Essential for rendering the correct Navbar elements.

    Returns:
        Response: 
            - JSON { authenticated: True, user: {...} } if logged in.
            - JSON { authenticated: False } if guest.
    """

    # --- 1. Session Proxy Check ---
    # 'current_user' is a thread-safe proxy provided by Flask-Login.
    # .is_authenticated checks if a valid session cookie exists and belongs to an active user.
    # It returns True for logged-in users, False for anonymous/guest users.
    if current_user.is_authenticated:
        
        # --- 2. Authenticated State Response ---
        # The user is logged in. We return 'authenticated': True.
        # We also serialize the user object (using .to_dict()) and send it to the client.
        # This allows the frontend to display personalized data (e.g., "Hello, Mario") 
        # without making a second database query.
        return jsonify({
            'authenticated': True,
            'user': current_user.to_dict()
        }), 200

    else:
        # --- 3. Anonymous State Response ---
        # The user is a guest (not logged in).
        # We explicitly return 'authenticated': False.
        # NOTE: We return HTTP 200 (OK) instead of 401 (Unauthorized) because 
        # being "not logged in" is a valid state for this check, not an error condition.
        return jsonify({
            'authenticated': False
        }), 200


@user_bp.route('/items', methods=['GET'])
@login_required
def list_items():
    """
    Retrieves a paginated list of users based on filter parameters.
    Security: Admin Only.

    Query Params:
        page (int): Current page.
        search (str): Search term.
        role (str): Filter by role.

    Returns:
        Response: JSON object containing paginated user items.
    """

    if current_user.role != Roles.ADMIN:
        return jsonify({'error': 'Access Denied: Admin privileges required.'}), 403

    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    role = request.args.get('role', '') # Role is a string in the User model
    view_users_detailsid = request.args.get('user_id','')
    pagination = UserService.get_all_users_page(
        page=page, 
        per_page=5, # Matching equipment pagination size
        search_query=search, 
        role=role
    )

    response_data = {
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'items': [item.to_dict() for item in pagination.items]
    }

    return jsonify(response_data)

@user_bp.route('/items/<int:id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def manage_single_resource(id):
    """
    Manages a specific user identified by ID.
    
    Args:
        id (int): The ID of the user to manage.

    Args (JSON Payload for PUT):
        first_name, last_name, email, role, etc.

    Returns:
        Response:
            - GET: JSON object of the user.
            - PUT: JSON object of the updated user.
            - DELETE: JSON confirmation message.
            - Error: 403 if unauthorized, 404 if not found.
    """

    # --- Authorization Check (RBAC) ---
    # Security Rule: Only Admins can modify/delete other users.
    # Exception: Users can modify their own profile (if business logic allows).
    if request.method in ['PUT', 'DELETE'] and current_user.role != Roles.ADMIN:
        # If the logged-in user is NOT an admin AND is trying to modify someone else
        if str(current_user.user_id) != str(id):
            return jsonify({'error': 'Unauthorized: Insufficient permissions'}), 403

    # --- GET: Retrieve User ---
    if request.method == 'GET':
        user = UserService.get_user_by_id(id)
        
        if user is None:
            return jsonify({'error': 'Resource not found'}), 404
        
        return jsonify({
            'user': user.to_dict()
            # Note: We do not include sensitive data like password_hash here.
        })

    # --- PUT: Update User ---
    elif request.method == 'PUT':
        input_data = request.get_json()
        
        if not input_data:
            return jsonify({'error': 'Missing or invalid JSON payload'}), 400

        try:
            # We delegate the update logic to the Service Layer.
            # The service handles the "Last Admin" safety check.
            updated_user = UserService.update_user(id, input_data)
        
            if updated_user is None:
                return jsonify({'error': 'Update failed: User ID not found'}), 404
            
            return jsonify({
                'message': 'User profile updated successfully',
                'user': updated_user.to_dict()
            })

        except ValueError as e:
            # Catch business logic violations (e.g., "Cannot demote the last Administrator")
            # We return HTTP 400 so the frontend can display the specific error message.
            return jsonify({'error': str(e)}), 400

    # --- DELETE: Remove User ---
    elif request.method == 'DELETE':
        try:
            # We delegate the delete logic to the Service Layer.
            # The service handles the "Last Admin" safety check.
            success = UserService.delete_user(id)
            
            if not success:
                return jsonify({'error': 'Delete failed: User ID not found'}), 404
                
            return jsonify({'message': 'User permanently deleted'}), 200

        except ValueError as e:
            # Catch business logic violations (e.g., "Cannot delete the last Administrator")
            # We return HTTP 400 so the frontend can display the specific error message.
            return jsonify({'error': str(e)}), 400