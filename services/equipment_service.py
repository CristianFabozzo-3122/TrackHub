from models import db, Equipment, Intervention

class EquipmentService:
    """
    Service class for managing Equipment data.
    Encapsulates business logic for querying, creating, updating, and deleting assets.
    """
    
    @staticmethod
    def get_all_equipment():
        """
        Retrieves all equipment records from the database.
        Primarily used for populating dropdown lists or non-paginated views.
        
        Returns:
            List[Equipment]: A list of all Equipment objects.
        """

        query = Equipment.query
        return query.all()

    @staticmethod
    def get_equipment_by_id(equipment_id):
        """
        Retrieves a single equipment item by its Primary Key.

        Args:
            equipment_id (int): The unique identifier of the equipment.

        Returns:
            Equipment: The Equipment object if found, otherwise None.
        """
        return Equipment.query.get(equipment_id)

    @staticmethod
    def create_equipment(data):
        """
        Creates a new equipment record in the database.
        
        Args:
            data (dict): Dictionary containing the following keys:
                         - name (str): The name of the equipment.
                         - description (str): Details about the equipment.
                         - type_id (int/str): The ID of the equipment type.
                         - status_id (int/str): The ID of the equipment status.
                         - location_id (int/str): The ID of the location.
            
        Returns:
            Equipment: The newly created and persisted SQLAlchemy object.
        """
        equipment = Equipment(
            name=data.get('name'),
            description=data.get('description'),
            type_id=int(data.get('type_id')),
            status_id=int(data.get('status_id')),
            location_id=int(data.get('location_id'))
        )
        
        db.session.add(equipment)
        db.session.commit()
        return equipment

    @staticmethod
    def update_equipment(equipment_id, data):
        """
        Updates an existing equipment record.
        
        Args:
            equipment_id (int): The ID of the item to update.
            data (dict): Dictionary containing the fields to update (partial updates allowed).
            
        Returns:
            Equipment: The updated object if found.
            None: If the equipment_id does not exist.
        """
        equipment = Equipment.query.get(equipment_id)
        if not equipment:
            return None
        
        if 'name' in data: equipment.name = data['name']
        if 'description' in data: equipment.description = data['description']
        if 'type_id' in data: equipment.type_id = int(data['type_id'])
        if 'status_id' in data: equipment.status_id = int(data['status_id'])
        if 'location_id' in data: equipment.location_id = int(data['location_id'])
        
        db.session.commit()
        return equipment

    @staticmethod
    def delete_equipment(equipment_id):
        """
        Deletes an equipment record.
        Performs a Software-level Cascade Delete on associated Interventions 
        to prevent Foreign Key constraint errors.
        
        Args:
            equipment_id (int): The ID of the item to delete.

        Returns:
            bool: True if deleted successfully, False if the ID was not found.
        """
        equipment = Equipment.query.get(equipment_id)
        if not equipment:
            return False

        # Manually delete related interventions first (Software-level Cascade)
        interventions = Intervention.query.filter_by(equipment_id=equipment_id).all()
        for intervention in interventions:
            db.session.delete(intervention)
            
        db.session.delete(equipment)
        db.session.commit()
        return True

    @staticmethod
    def _build_filter_query(search_query=None, status_id=None, location_id=None, type_id=None):
        """
        Helper method to build the SQLAlchemy query with dynamic filters.
        Avoids code duplication between pagination and export logic.

        Args:
            search_query (str, optional): Text to search in name or description.
            status_id (int, optional): Filter by status ID.
            location_id (int, optional): Filter by location ID.
            type_id (int, optional): Filter by type ID.

        Returns:
            Query: A Flask-SQLAlchemy Query object with filters applied.
        """
        query = Equipment.query

        if search_query:
            query = query.filter(Equipment.name.contains(search_query) | 
                                 Equipment.description.contains(search_query))
        
        if status_id:
            query = query.filter_by(status_id=status_id)
            
        if location_id:
            query = query.filter_by(location_id=location_id)

        if type_id:
            query = query.filter_by(type_id=type_id)
            
        return query

    @staticmethod
    def get_all_equipment_page(page=1, per_page=5, search_query=None, status_id=None, location_id=None, type_id=None):
        """
        Retrieves a paginated list of equipment based on filters.

        Args:
            page (int): Current page number.
            per_page (int): Number of items per page.
            search_query (str): Text search term.
            status_id (int): Filter by status.
            location_id (int): Filter by location.
            type_id (int): Filter by type.

        Returns:
            Pagination: SQLAlchemy Pagination object containing items and metadata.
        """
        query = EquipmentService._build_filter_query(search_query, status_id, location_id, type_id)
        return query.paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def get_filtered_equipment_for_export(search_query=None, status_id=None, location_id=None, type_id=None):
        """
        Retrieves all matching equipment (non-paginated) for file export (Excel/CSV).
        
        Args:
            search_query (str): Text search term.
            status_id (int): Filter by status.
            location_id (int): Filter by location.
            type_id (int): Filter by type.

        Returns:
            List[Equipment]: List of all matching Equipment objects.
        """
        query = EquipmentService._build_filter_query(search_query, status_id, location_id, type_id)
        return query.all()

    @staticmethod
    def get_priority_list(status_id, page=1, per_page=10):
        """
        Retrieves a paginated list of equipment filtered by a specific priority status (e.g., Broken).
        Acts as a semantic wrapper around the standard pagination method.

        Args:
            status_id (int): The ID of the critical status (e.g., Broken).
            page (int): Current page.
            per_page (int): Items per page.

        Returns:
            Pagination: SQLAlchemy Pagination object containing the critical items.
        """
        # We simply reuse the existing pagination logic passing the specific status_id
        return EquipmentService.get_all_equipment_page(
            page=page,
            per_page=per_page,
            status_id=status_id
        )