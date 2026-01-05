from models import db, Intervention, Equipment
from sqlalchemy import or_
from datetime import datetime

class InterventionService:
    """
    Service class for managing Intervention data.
    Handles creation, updates, deletion, and advanced filtering for maintenance logs.
    """

    # --- BUSINESS RULE CONSTANTS ---
    # Define IDs here for code readability and maintainability
    OUTCOME_RESOLVED = 1
    OUTCOME_MONITORING = 2
    OUTCOME_PENDING = 3

    STATUS_WORKING = 1
    STATUS_UNDER_REPAIR = 2

    @staticmethod
    def get_intervention_by_id(intervention_id):
        """
        Retrieves a single intervention by ID.

        Args:
            intervention_id (int): The unique identifier.

        Returns:
            Intervention: The Intervention object or None.
        """
        return Intervention.query.get(intervention_id)

    @staticmethod
    def create_intervention(data):
        """
        Creates a new intervention record.
        Handles string-to-date conversion for the 'date' field.
        Automatically updates the parent Equipment status based on the outcome.

        Args:
            data (dict): Dictionary containing keys:
                         - description (str)
                         - date (str): Format YYYY-MM-DD
                         - duration_minutes (int)
                         - technician_id (int)
                         - equipment_id (int)
                         - outcome_id (int)

        Returns:
            Intervention: The newly created SQLAlchemy object.
        """
        # Date parsing logic
        date_val = datetime.utcnow().date()
        if data.get('date'):
            try:
                date_val = datetime.strptime(data.get('date'), '%Y-%m-%d').date()
            except ValueError:
                pass

        intervention = Intervention(
            description=data.get('description'),
            date=date_val,
            duration_minutes=int(data.get('duration_minutes', 0)) if data.get('duration_minutes') else 0,
            
            # Foreign Keys (Mapped from your model)
            user_id=int(data.get('technician_id')) if data.get('technician_id') else None,
            equipment_id=int(data.get('equipment_id')) if data.get('equipment_id') else None,
            outcome_id=int(data.get('outcome_id')) if data.get('outcome_id') else None
        )

        db.session.add(intervention)

        # --- AUTOMATIC STATUS UPDATE LOGIC ---
        # Before committing, update the parent Equipment status based on the outcome
        if intervention.equipment_id and intervention.outcome_id:
            InterventionService._update_equipment_status(intervention.equipment_id, intervention.outcome_id)

        db.session.commit()
        return intervention

    @staticmethod
    def update_intervention(intervention_id, data):
        """
        Updates an existing intervention record.
        Automatically syncs the equipment status if the outcome changes.

        Args:
            intervention_id (int): The ID of the intervention to update.
            data (dict): Dictionary containing fields to update.

        Returns:
            Intervention: The updated object.
            None: If the intervention ID is not found.
        """
        intervention = Intervention.query.get(intervention_id)
        if not intervention:
            return None

        if 'description' in data: intervention.description = data['description']
        if 'duration_minutes' in data: intervention.duration_minutes = int(data['duration_minutes'])
        
        if 'date' in data and data['date']:
            try:
                intervention.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            except ValueError:
                pass

        if 'technician_id' in data: intervention.user_id = int(data['technician_id'])
        if 'equipment_id' in data: intervention.equipment_id = int(data['equipment_id'])
        
        # Check for outcome_id update to apply status logic
        new_outcome_id = None
        if 'outcome_id' in data: 
            new_outcome_id = int(data['outcome_id'])
            intervention.outcome_id = new_outcome_id

        # --- AUTOMATIC STATUS UPDATE LOGIC ---
        # Use the new outcome if present, otherwise use the existing one
        outcome_to_check = new_outcome_id if new_outcome_id else intervention.outcome_id
        
        if intervention.equipment_id and outcome_to_check:
             InterventionService._update_equipment_status(intervention.equipment_id, outcome_to_check)

        db.session.commit()
        return intervention

    @staticmethod
    def delete_intervention(intervention_id):
        """
        Deletes an intervention record.

        Args:
            intervention_id (int): The ID to delete.

        Returns:
            bool: True if deleted, False if not found.
        """
        intervention = Intervention.query.get(intervention_id)
        if not intervention:
            return False

        db.session.delete(intervention)
        db.session.commit()
        return True

    @staticmethod
    def get_interventions_by_equipment(equipment_id):
        """
        Retrieves all interventions associated with a specific equipment ID.
        Used for displaying history in the Equipment Details view.
        
        Args:
            equipment_id (int): The ID of the equipment.

        Returns:
            List[Intervention]: List of interventions ordered by date (newest first).
        """
        # Usa 'equipment_id' perché nel tuo models.py la colonna si chiama così.
        return Intervention.query.filter_by(equipment_id=equipment_id)\
                        .order_by(Intervention.date.desc()).all()

    @staticmethod
    def _build_filter_query(search_query=None, user_id=None, equipment_id=None, outcome_id=None, date=None):
        """
        Helper method to build the SQLAlchemy query with dynamic filters.
        Avoids code duplication between pagination and export logic.

        Args:
            search_query (str): Text search in the description.
            user_id (int): Filter by Technician ID.
            equipment_id (int): Filter by Equipment ID.
            outcome_id (int): Filter by Outcome ID.
            date (str): Filter by exact date.

        Returns:
            Query: A Flask-SQLAlchemy Query object with filters applied.
        """
        query = Intervention.query

        if search_query:
            query = query.filter(Intervention.description.contains(search_query))

        if user_id:
            query = query.filter_by(user_id=user_id)

        if equipment_id:
            query = query.filter_by(equipment_id=equipment_id)

        if outcome_id:
            query = query.filter_by(outcome_id=outcome_id)

        if date:
            query = query.filter(Intervention.date == date)
            
        return query

    
    @staticmethod
    def get_paginated_interventions(page=1, per_page=10, search_query=None, user_id=None, equipment_id=None, outcome_id=None, date=None):
        """
        Retrieves a paginated list of interventions based on multiple optional filters.
        """
        query = InterventionService._build_filter_query(search_query, user_id, equipment_id, outcome_id, date)
        
        # Order by newest first
        query = query.order_by(Intervention.date.desc())

        return query.paginate(page=page, per_page=per_page, error_out=False)


    @staticmethod
    def get_filtered_interventions_for_export(search_query=None, user_id=None, equipment_id=None, outcome_id=None, date=None):
        """
        Retrieves all matching interventions (non-paginated) for file export (Excel/CSV).
        
        Returns:
            List[Intervention]: List of all matching Intervention objects.
        """
        query = InterventionService._build_filter_query(search_query, user_id, equipment_id, outcome_id, date)
        
        # Order by newest first
        query = query.order_by(Intervention.date.desc())
        
        return query.all()

    @staticmethod
    def get_tech_activity(user_id, page=1, per_page=10):
        """
        Retrieves recent interventions for a specific user.
        Uses the existing pagination logic which already handles sorting by date.
        """
        # We must use keyword arguments to target the specific parameters
        return InterventionService.get_paginated_interventions(
            page=page, 
            per_page=per_page, 
            user_id=user_id
        )

    # --- PRIVATE HELPERS ---
    @staticmethod
    def _update_equipment_status(equipment_id, outcome_id):
        """
        Private helper to apply business rules:
        - If Outcome is Resolved -> Status becomes Working
        - If Outcome is Pending -> Status becomes Under Repair (optional logic)
        
        Args:
            equipment_id (int): ID of the equipment to update.
            outcome_id (int): ID of the intervention outcome.
        """
        equipment = Equipment.query.get(equipment_id)
        if not equipment:
            return

        # RULE 1: If the issue is resolved, the equipment must be working
        if outcome_id == InterventionService.OUTCOME_RESOLVED:
            equipment.status_id = InterventionService.STATUS_WORKING
            
        # RULE 2 (Optional): If the intervention is pending (e.g. waiting for parts), or monitoring
        # the equipment switches to "Under Repair"
        elif outcome_id == InterventionService.OUTCOME_PENDING | outcome_id == Intervention.Service.OUTCOME_MONITORING:
            equipment.status_id = InterventionService.STATUS_UNDER_REPAIR

        