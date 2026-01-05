from flask import Blueprint, request, jsonify
from services.location_service import LocationService

locations_bp = Blueprint('locations', __name__, url_prefix='/api/locations')

# --- API Routes (JSON) ---

@locations_bp.route('/stats', methods=['GET'])
def get_locations_stats():
    """
    API to fetch locations including their equipment counts.
    Used for dashboard cards/statistics.

    Returns:
        Response: JSON list of location objects with stats.
    """
    locations_data = LocationService.get_locations_with_stats()
    return jsonify(locations_data)

@locations_bp.route('/item', methods=['POST'])
def create_item():
    """
    Creates a new location via API.
    
    Args (JSON Payload):
        name (str): Required. The name of the location.
        building (str): Optional. The building name.
        floor (str): Optional. The floor number/name.
        department (str): Optional. The department name.
        
    Returns:
        Response: 
            - 201 Created: The created location data.
            - 400 Bad Request: If 'name' is missing.
    """
    # Extract JSON payload from the request body
    input_data = request.get_json()
    
    # Basic validation: Name is usually mandatory
    if not input_data or not input_data.get('name'):
        return jsonify({'error': 'Location name is required'}), 400

    # Delegate creation logic to the Service Layer
    new_location = LocationService.create_location(input_data)

    # Return the serialized object and 201 status code
    return jsonify({
        'message': 'Location created successfully',
        'item': new_location.to_dict()
    }), 201

@locations_bp.route('/items/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def manage_single_location(id):
    """
    Manages a specific location identified by ID.
    
    Args:
        id (int): The ID of the location.

    Args (JSON Payload for PUT):
        name, building, floor, department (Fields to update).

    Returns:
        Response:
            - GET: JSON containing location details.
            - PUT: JSON with updated location data.
            - DELETE: JSON confirmation of deletion.
    """
    if request.method == 'GET':
        item = LocationService.get_location_by_id(id)
        
        if item is None:
            return jsonify({'error': 'Location not found'}), 404
        
        return jsonify({
            'location': item.to_dict()
        })

    elif request.method == 'PUT':
        input_data = request.get_json()
        
        if not input_data:
            return jsonify({'error': 'Missing data'}), 400

        updated_item = LocationService.update_location(id, input_data)
        
        if updated_item is None:
            return jsonify({'error': 'Update failed: ID not found'}), 404
            
        return jsonify({
            'message': 'Location updated successfully',
            'item': updated_item.to_dict()
        })

    elif request.method == 'DELETE':
        success = LocationService.delete_location(id)
        
        if not success:
            return jsonify({'error': 'Delete failed: ID not found'}), 404
            
        return jsonify({'message': 'Location permanently deleted'}), 200