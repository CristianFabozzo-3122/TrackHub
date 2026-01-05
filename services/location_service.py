from models import db, Location, Equipment
from sqlalchemy import func

class LocationService:
    """
    Service class for managing Location data.
    Encapsulates logic for creating and retrieving location information.
    """

    @staticmethod
    def get_all_locations():
        """
        Returns all locations ordered alphabetically by name.
        Used for simple dropdown lists.

        Returns:
            List[Location]: List of location objects.
        """
        return Location.query.order_by(Location.name.asc()).all()

    @staticmethod
    def get_locations_with_stats():
        """
        Retrieves all locations along with the count of equipment items in each.
        Used for the Locations Dashboard (Card View).
        
        Returns:
            List[dict]: A list of dictionaries, where each dict contains:
                        - All Location model fields (via to_dict())
                        - 'item_count' (int): The number of equipment items in that location.
        """
        # SQL equivalent: 
        # SELECT location.*, COUNT(equipment.equipment_id) 
        # FROM location LEFT JOIN equipment ON ... GROUP BY location.id
        
        results = db.session.query(Location, func.count(Equipment.equipment_id).label('count'))\
            .outerjoin(Equipment, Location.location_id == Equipment.location_id)\
            .group_by(Location.location_id)\
            .order_by(Location.name.asc())\
            .all()

        # Merge the count into the location dictionary
        data = []
        for loc, count in results:
            loc_dict = loc.to_dict()
            loc_dict['item_count'] = count
            data.append(loc_dict)
            
        return data

    @staticmethod
    def get_location_by_id(location_id):
        """
        Retrieves a single location by its ID.

        Args:
            location_id (int): The unique identifier of the location.

        Returns:
            Location: The Location object or None.
        """
        return Location.query.get(location_id)

    @staticmethod
    def create_location(data):
        """
        Creates a new Location record in the database.
        
        Args:
            data (dict): Dictionary containing keys:
                         - name (str): The name of the location.
                         - building (str): The building name.
                         - floor (str): The floor number/name.
            
        Returns:
            Location: The newly created and persisted SQLAlchemy object.
        """
        # Instantiate the model with data from the controller
        location = Location(
            name=data.get('name'),
            building=data.get('building'),
            floor=data.get('floor')
        )
        
        # Persist to database
        db.session.add(location)
        db.session.commit()
        
        return location

    @staticmethod
    def update_location(location_id, data):
        """
        Updates an existing location record.
        
        Args:
            location_id (int): The ID of the location to update.
            data (dict): Dictionary containing the fields to update (partial updates allowed).
            
        Returns:
            Location: The updated object if found.
            None: If the location_id does not exist.
        """
        location = Location.query.get(location_id)
        if not location:
            return None
        
        # Update fields if they exist in the payload
        if 'name' in data: location.name = data['name']
        if 'building' in data: location.building = data['building']
        if 'floor' in data: location.floor = data['floor']
        if 'department' in data: location.department = data['department']
        
        db.session.commit()
        return location

    @staticmethod
    def delete_location(location_id):
        """
        Deletes a location record.
        
        Args:
            location_id (int): The ID of the location to delete.

        Returns:
            bool: True if deleted successfully, False if the ID was not found.
        """
        location = Location.query.get(location_id)
        if not location:
            return False

        db.session.delete(location)
        db.session.commit()
        return True