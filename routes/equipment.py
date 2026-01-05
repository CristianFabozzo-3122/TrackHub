from flask import Blueprint, request, jsonify, Response, send_file
from services import InterventionService, EquipmentService, ExportService

equipment_bp = Blueprint('equipment', __name__, url_prefix='/api/equipment')

"""
Equipment API Controller.
Handles CRUD (Create, Read, Update, Delete) operations for Equipment items.
Communicates with the Service Layer to process data and returns JSON.
"""

@equipment_bp.route('/items', methods=['GET'])
def list_items():
    """
    Retrieves a paginated list of equipment based on filter parameters.
    
    Query Params:
        page (int): Current page number (default 1).
        search (str): Search term for name or description.
        status (int): Filter by status ID.
        location (int): Filter by location ID.
        type (int): Filter by type ID.
        
    Returns:
        Response: JSON object containing paginated items and metadata (total pages, current page).
    """
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    status_id = request.args.get('status', type=int)
    location_id = request.args.get('location', type=int)
    type_id = request.args.get('type', type=int)

    pagination = EquipmentService.get_all_equipment_page(
        page=page, 
        per_page=5,
        search_query=search, 
        status_id=status_id, 
        location_id=location_id,
        type_id=type_id
    )

    response_data = {
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'items': [item.to_dict() for item in pagination.items]
    }

    return jsonify(response_data)

@equipment_bp.route('/item', methods=['POST'])
def create_item():
    """
    Creates a new equipment item in the database.
    
    Args (JSON Payload):
        name (str): The name/tag of the device.
        description (str): Description of the device.
        type_id (int): ID of the equipment type.
        status_id (int): ID of the equipment status.
        location_id (int): ID of the location.
        
    Returns:
        Response: JSON object with the created item (HTTP 201) or error (HTTP 400).
    """
    input_data = request.get_json()
    
    if not input_data:
        return jsonify({'error': 'Missing or invalid JSON payload'}), 400

    new_item = EquipmentService.create_equipment(input_data)

    return jsonify({
        'message': 'Device registered successfully',
        'item': new_item.to_dict()
    }), 201
    #this syntax is tuple packing

@equipment_bp.route('/items/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def manage_single_resource(id):
    """
    Manages a specific equipment item identified by ID.
    
    Args:
        id (int): The ID of the equipment.

    Args (JSON Payload for PUT):
        name, description, status_id, etc. (Fields to update).

    Returns:
        Response:
            - GET: JSON containing equipment details AND its intervention history.
            - PUT: JSON with updated equipment data.
            - DELETE: JSON confirmation of deletion.
    """
    if request.method == 'GET':
        item = EquipmentService.get_equipment_by_id(id)
        
        if item is None:
            return jsonify({'error': 'Resource not found'}), 404
        
        # We also fetch the history for this item
        interventions = InterventionService.get_interventions_by_equipment(id)

        return jsonify({
            'equipment': item.to_dict(),
            'interventions': [i.to_dict() for i in interventions]
        })

    elif request.method == 'PUT':
        input_data = request.get_json()
        
        if not input_data:
            return jsonify({'error': 'Missing data'}), 400

        updated_item = EquipmentService.update_equipment(id, input_data)
        
        if updated_item is None:
            return jsonify({'error': 'Update failed: ID not found'}), 404
            
        return jsonify({
            'message': 'Update completed',
            'item': updated_item.to_dict()
        })

    elif request.method == 'DELETE':
        success = EquipmentService.delete_equipment(id)
        
        if not success:
            return jsonify({'error': 'Delete failed: ID not found'}), 404
            
        return jsonify({'message': 'Resource permanently deleted'}), 200

@equipment_bp.route('/export', methods=['GET'])
def export_items():
    """
    Exports the filtered list of equipment using the Generic Export Service.
    
    Query Params:
        search, status, location, type (Same filters as the list view).

    Returns:
        Response: A binary file stream (application/vnd.openxmlformats...) prompting a download.
    """
    # 1. Retrieve filters from query parameters
    search = request.args.get('search', '')
    status_id = request.args.get('status', type=int)
    location_id = request.args.get('location', type=int)
    type_id = request.args.get('type', type=int)

    # 2. Fetch filtered data from the Service layer (Raw Objects)
    items = EquipmentService.get_filtered_equipment_for_export(
        search_query=search, 
        status_id=status_id, 
        location_id=location_id,
        type_id=type_id
    )

    # 3. Prepare Data for the Generic Service
    # Define column headers
    headers = ['ID', 'Name', 'Description', 'Type', 'Location', 'Status']

    # Transform objects into a list of lists (Raw Data)
    rows = []
    for item in items:
        rows.append([
            item.equipment_id,
            item.name,
            item.description,
            item.type.description if item.type else 'N/A',       # Handle potential Null relationships
            item.location.name if item.location else 'N/A',
            item.status.description if item.status else 'N/A'
        ])

    # 4. Call the Generic Export Service
    # Pass the headers and the raw rows. The service handles the Excel generation.
    file_stream = ExportService.generate_excel(headers, rows, sheet_title="Equipment List")

    # 5. Return the file to the browser for download
    return send_file(
        file_stream,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='equipment_export.xlsx'
    )