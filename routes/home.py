from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from services.home_service import HomeService 

home_bp = Blueprint('home', __name__, url_prefix='/api/home')

"""
Home API Controller.
Exposes specialized endpoints for the Dashboard widgets.
Uses 'current_user' to enforce security context, avoiding reliance on frontend parameters.
"""

@home_bp.route('/summary', methods=['GET'])
@login_required
def get_dashboard_summary():
    """ 
    Returns KPI data. 
    Mainly used for Admin charts or initial stats.
    """
    if current_user.role == 'admin':
        return jsonify(HomeService.get_admin_stats())
    # Technician dashboard uses separate endpoints (activity/priority)
    return jsonify({}) 

@home_bp.route('/activity', methods=['GET'])
@login_required
def get_my_activity():
    """
    Returns paginated interventions for the LOGGED-IN user.
    Frontend does NOT need to pass user_id via query params.
    
    Query Params:
        page (int): Current page number.
        per_page (int): Items per page.
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 5, type=int)

    # SECURE: Use current_user.user_id from Flask-Login session
    pagination = HomeService.get_technician_activity(current_user.user_id, page, per_page)

    return jsonify({
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'items': [item.to_dict() for item in pagination.items]
    })

@home_bp.route('/priority', methods=['GET'])
@login_required
def get_priority_list():
    """
    Returns paginated list of equipment requiring attention (e.g. Broken).
    Configuration of what constitutes 'Broken' is handled in the Service layer.
    
    Query Params:
        page (int): Current page number.
        per_page (int): Items per page.
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 5, type=int)

    # LOGIC: The service knows which ID is "Broken"
    pagination = HomeService.get_priority_list(page, per_page)

    return jsonify({
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'items': [item.to_dict() for item in pagination.items]
    })