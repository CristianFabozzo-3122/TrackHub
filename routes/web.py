from flask import Blueprint, render_template, jsonify, abort
from flask_login import login_required, current_user
from services import EquipmentStatusService, EquipmentTypeService, LocationService, UserService, EquipmentService, InterventionOutcomeService, LocationService
from utils.security import public_route
from models import Roles

web_bp = Blueprint('web', __name__)

"""
Web Routes Controller.
Handles the serving of HTML templates (pages) and basic options for dropdowns.
This acts as the 'View' controller in the MVC pattern.
"""

@web_bp.route('/')
@login_required
def dashboard():
    """
    Dispatcher route.
    Renders homeAdmin.html for Admins.
    Renders homeTech.html for Technicians.
    """
    if current_user.role == Roles.ADMIN:
        return render_template('homeAdmin.html')
    else:
        return render_template('homeTech.html')

# Equipment api

@web_bp.route('/equipment')
def view_equipment():
    """
    Renders the main equipment list page.

    Returns:
        Response: Rendered HTML template 'equipment.html'.
    """
    return render_template('equipment.html')

@web_bp.route('/equipment/new')
def view_new_equipment():
    """
    Renders the form page to create a new device.

    Returns:
        Response: Rendered HTML template 'new_device.html'.
    """
    return render_template('new_device.html') 

@web_bp.route('/equipment/details/<int:id>')
def view_equipment_details(id):
    """
    Renders the details page for a specific device.
    The ID is passed in the URL but processed by the client-side JS.

    Args:
        id (int): The equipment ID.

    Returns:
        Response: Rendered HTML template 'equipment_details.html'.
    """
    return render_template('equipment_details.html')

@web_bp.route('/equipment/edit/<int:id>')
def view_edit_equipment(id):
    """
    Renders the edit form for a specific device.

    Args:
        id (int): The equipment ID.

    Returns:
        Response: Rendered HTML template 'edit_equipment.html'.
    """
    return render_template('edit_equipment.html')


# Interventions api

@web_bp.route('/interventions')
def view_interventions():
    """
    Renders the main interventions list page.

    Returns:
        Response: Rendered HTML template 'interventions.html'.
    """
    return render_template('interventions.html')

@web_bp.route('/interventions/details/<int:id>')
def view_interventions_details(id):
    """
    Renders the details page for a specific intervention.

    Args:
        id (int): The intervention ID.

    Returns:
        Response: Rendered HTML template 'interventions_details.html'.
    """
    return render_template('interventions_details.html')

@web_bp.route('/interventions/edit/<int:id>')
def view_edit_intervention(id):
    """
    Renders the edit form for a specific intervention.

    Args:
        id (int): The intervention ID.

    Returns:
        Response: Rendered HTML template 'edit_intervention.html'.
    """
    return render_template('edit_intervention.html')

@web_bp.route('/interventions/new')
def view_new_intervention():
    """
    Renders the form to create a new intervention.

    Returns:
        Response: Rendered HTML template 'new_intervention.html'.
    """
    return render_template('new_intervention.html')

@web_bp.route('/locations')
def view_location():
    """
    Renders the locations management page.

    Returns:
        Response: Rendered HTML template 'locations.html'.
    """
    return render_template('locations.html')

@web_bp.route('/locations/new')
def view_new_location():
    """
    Renders the form to create a new location.

    Returns:
        Response: Rendered HTML template 'new_location.html'.
    """
    return render_template('new_location.html')

@web_bp.route('/locations/edit/<int:id>')
def view_edit_location(id):
    """
    Renders the form to edit an old location.

    Returns:
        Response: Rendered HTML template 'edit_location.html'.
    """
    return render_template('edit_location.html')


# USERS SECTION

@web_bp.route('/users')

def view_users():
    """
    Renders the user management page.
    Security: ADMIN ONLY.

    Returns:
        Response: Rendered HTML template 'users.html' or 403 error.
    """
    # Check Role: If not Admin, return HTTP 403 (Forbidden)
    if current_user.role != Roles.ADMIN:
        abort(403) 
       

    return render_template('users.html')

@web_bp.route('/users/details/<int:id>')

def view_users_details(id):
    """
    Renders the specific user details page.
    Security: ADMIN ONLY.

    Args:
        id (int): The user ID.

    Returns:
        Response: Rendered HTML template 'user_details.html' or 403 error.
    """
    # Check Role: If not Admin, return HTTP 403 (Forbidden)
    if current_user.role != Roles.ADMIN:
        abort(403) 

    return render_template('user_details.html')


@web_bp.route('/users/new')
@login_required
def view_new_user():
    """
    Renders the form to create a new user.
    Security: ADMIN ONLY.

    Returns:
        Response: Rendered HTML template 'new_user.html' or 403 error.
    """
    if current_user.role != Roles.ADMIN:
        abort(403)
    return render_template('new_user.html')

@web_bp.route('/users/edit/<int:id>')
@login_required
def view_edit_user(id):
    """
    Renders the form to edit an existing user.
    Security: ADMIN ONLY.

    Args:
        id (int): The user ID.

    Returns:
        Response: Rendered HTML template 'edit_user.html' or 403 error.
    """
    if current_user.role != 'admin':
        Roles.ADMIN
        

    return render_template('edit_user.html')

@web_bp.route('/login')
@public_route
def view_login_form():
    """
    Renders the login form page.

    Returns:
        Response: Rendered HTML template 'login.html'.
    """
    return render_template('login.html')



# Generic API

@web_bp.app_errorhandler(404)
def page_not_found(e):
    """
    Global Handler for 404 errors.
    Triggers whenever a user tries to access a route that doesn't exist.
    
    Args:
        e: The exception object.

    Returns:
        tuple: Rendered 'error_page404.html' and HTTP status code 404.
    """
    # Note: We pass '404' as the second return value to set the HTTP Status Code correctly.
    # The 'e' parameter contains the exception details, though we rarely show them to the user.
    return render_template('error_page404.html'), 404


@web_bp.route('/api/options', methods=['GET'])
def get_options():
    """
    API Endpoint to fetch aggregated dropdown options (Statuses, Types, Locations, etc.).
    Used to populate HTML <select> elements on the frontend via a single request.
    
    Returns:
        Response: JSON object containing lists of all auxiliary entities.
    """
    return jsonify({
        'statuses': [s.to_dict() for s in EquipmentStatusService.get_all_statuses()],
        'types': [t.to_dict() for t in EquipmentTypeService.get_all_types()],
        'locations': [l.to_dict() for l in LocationService.get_all_locations()],
        'technicians': [tec.to_dict() for tec in UserService.get_all_technicians()],
        'equipments': [e.to_dict() for e in EquipmentService.get_all_equipment()],
        'outcomes': [o.to_dict() for o in InterventionOutcomeService.get_all_outcome()]
    })