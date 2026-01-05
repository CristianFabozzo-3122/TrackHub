from flask import Blueprint, request, jsonify, send_file
from services import InterventionService, ExportService

# Define Blueprint with URL prefix to keep routes clean
interventions_bp = Blueprint('interventions', __name__, url_prefix='/api/interventions')

"""
Intervention API Controller.
Handles CRUD (Create, Read, Update, Delete) operations for technical interventions.
Communicates with the Service Layer to process data and returns JSON.
"""

@interventions_bp.route('/items', methods=['GET'])
def list_interventions():
    """
    Retrieves a paginated list of interventions based on filter parameters.
    
    Query Params:
        page (int): Current page number (default 1).
        search (str): Search term for description or notes.
        technician (int): Filter by technician (user) ID.
        equipment (int): Filter by equipment ID.
        outcome (int): Filter by outcome ID.
        date (str): Filter by date (YYYY-MM-DD).
        
    Returns:
        Response: JSON object containing paginated items and metadata.
    """
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    user_id = request.args.get('user_id', type=int)
    equipment_id = request.args.get('equipment', type=int)
    outcome_id = request.args.get('outcome', type=int)
    date_filter = request.args.get('date', '')

    pagination = InterventionService.get_paginated_interventions(
        page=page, 
        per_page=5, 
        search_query=search, 
        user_id=user_id,
        equipment_id=equipment_id,
        outcome_id=outcome_id,
        date=date_filter
    )

    response_data = {
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'items': [item.to_dict() for item in pagination.items]
    }

    return jsonify(response_data)

@interventions_bp.route('/item', methods=['POST'])
def create_intervention():
    """
    Creates a new intervention record.
    
    Args (JSON Payload):
        description (str): Description of the work done.
        date (str): Date of intervention (YYYY-MM-DD).
        technician_id (int): ID of the user performing the task.
        equipment_id (int): ID of the equipment.
        outcome_id (int): ID of the intervention outcome.
        
    Returns:
        Response: JSON object with the created item (HTTP 201) or error message (HTTP 400).
    """
    input_data = request.get_json()
    
    if not input_data:
        return jsonify({'error': 'Missing or invalid JSON payload'}), 400

    new_intervention = InterventionService.create_intervention(input_data)

    return jsonify({
        'message': 'Intervention registered successfully',
        'item': new_intervention.to_dict()
    }), 201

@interventions_bp.route('/items/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def manage_single_intervention(id):
    """
    Manages a specific intervention identified by ID.
    
    Args:
        id (int): The ID of the intervention to manage.
        
    Args (JSON Payload for PUT):
        description, date, outcome_id, etc. (Partial or full update).

    Returns:
        Response: 
            - GET: JSON object of the intervention.
            - PUT: JSON object of the updated intervention.
            - DELETE: JSON confirmation message.
            - Error: JSON error message with HTTP 404 if not found.
    """
    if request.method == 'GET':
        intervention = InterventionService.get_intervention_by_id(id)
        
        
        if intervention is None:
            return jsonify({'error': 'Resource not found'}), 404
        
        return jsonify({
            'intervention': intervention.to_dict()
        })

    elif request.method == 'PUT':
        input_data = request.get_json()
        
        if not input_data:
            return jsonify({'error': 'Missing data'}), 400

        updated_intervention = InterventionService.update_intervention(id, input_data)
        
        if updated_intervention is None:
            return jsonify({'error': 'Update failed: ID not found'}), 404
            
        return jsonify({
            'message': 'Update completed',
            'item': updated_intervention.to_dict()
        })

    elif request.method == 'DELETE':
        success = InterventionService.delete_intervention(id)
        
        if not success:
            return jsonify({'error': 'Delete failed: ID not found'}), 404
            
        return jsonify({'message': 'Resource permanently deleted'}), 200


@interventions_bp.route('/export', methods=['GET'])
def export_items():
    """
    Exports the filtered list of interventions using the Generic Export Service.
    
    Query Params:
        search, user_id, equipment, outcome, date.

    Returns:
        Response: A binary file stream prompting a download.
    """
    # 1. Retrieve filters
    search = request.args.get('search', '')
    user_id = request.args.get('user_id', type=int)
    equipment_id = request.args.get('equipment', type=int)
    outcome_id = request.args.get('outcome', type=int)
    date_filter = request.args.get('date', '')

    # 2. Fetch raw objects from DB (via InterventionService)
    items = InterventionService.get_filtered_interventions_for_export(
        search_query=search, 
        user_id=user_id,
        equipment_id=equipment_id,
        outcome_id=outcome_id,
        date=date_filter
    )

    # 3. Prepare Data for the Generic Service
    # Define headers
    headers = ['ID', 'Date', 'Description', 'Equipment', 'Technician', 'Outcome', 'Duration (min)']
    
    # Transform objects into a list of lists (Raw Data)
    rows = []
    for item in items:
        # Resolve names safely
        tech_name = f"{item.technician.first_name} {item.technician.last_name}" if item.technician else "N/A"
        equip_name = item.equipment.name if item.equipment else "N/A"
        outcome_desc = item.outcome.description if item.outcome else "Pending"

        rows.append([
            item.intervention_id,
            item.date,
            item.description,
            equip_name,
            tech_name,
            outcome_desc,
            item.duration_minutes
        ])

    # 4. Call the Generic Export Service
    # Pass the headers and the raw rows. The service handles the Excel magic.
    file_stream = ExportService.generate_excel(headers, rows, sheet_title="Interventions")

    # 5. Return the file
    return send_file(
        file_stream,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='interventions_export.xlsx'
    )
    