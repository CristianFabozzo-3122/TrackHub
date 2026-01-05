from models import db, Equipment, Intervention, EquipmentStatus, User, Roles
from sqlalchemy import func
from services.equipment_service import EquipmentService
from services.intervention_service import InterventionService

class HomeService:
    """
    Service class for aggregating data for the Dashboard (Home).
    Handles logic for specific Dashboard tables (Activity & Priority).
    """

    # --- CONFIGURATION ---
    # ID for the "Obsolete/Broken" status used in the Priority List logic.
    # Usually: 1=Working, 2=Under Repair, 3=Broken/Obsolete
    ID_BROKEN_STATUS = 3 

    @staticmethod
    def get_admin_stats():
        """
        Retrieves statistics for the Admin dashboard.
        Prepares data for Chart.js visualization.

        Returns:
            dict: Data structure containing KPIs, Status Distribution, and Tech Performance.
        """
        # 1. KPI Cards (Single Numbers)
        total_equipment = Equipment.query.count()
        total_interventions = Intervention.query.count()
        total_technicians = User.query.filter_by(role=Roles.TECHNICIAN).count()

        # 2. CHART 1 DATA: Equipment Status Distribution (Pie Chart)
        # Query: Group by Status Description and Count
        status_query = (
            db.session.query(EquipmentStatus.description, func.count(Equipment.equipment_id))
            .join(Equipment, EquipmentStatus.status_id == Equipment.status_id)
            .group_by(EquipmentStatus.description)
            .all()
        )
        
        # Format: labels=['Working', 'Broken'], values=[50, 5]
        status_labels = [row[0] for row in status_query]
        status_values = [row[1] for row in status_query]

        # 3. CHART 2 DATA: Technician Performance (Bar Chart)
        # Query: Group by User (Technician) and Count Interventions
        tech_query = (
            db.session.query(User.last_name, func.count(Intervention.intervention_id))
            .join(Intervention, User.user_id == Intervention.user_id)
            .filter(User.role == Roles.TECHNICIAN)
            .group_by(User.user_id)
            .order_by(func.count(Intervention.intervention_id).desc())
            .limit(5) # Top 5 technicians
            .all()
        )

        tech_labels = [row[0] for row in tech_query]
        tech_values = [row[1] for row in tech_query]

        return {
            "role": "admin",
            "kpi": {
                "total_assets": total_equipment,
                "total_interventions": total_interventions,
                "total_technicians": total_technicians
            },
            "charts": {
                "status_dist": {
                    "labels": status_labels,
                    "data": status_values
                },
                "tech_perf": {
                    "labels": tech_labels,
                    "data": tech_values
                }
            }
        }

    @staticmethod
    def get_technician_activity(user_id, page=1, per_page=5):
        """
        Retrieves the paginated list of interventions for a specific technician.
        Used for the 'My Activity' table in the dashboard.
        
        Args:
            user_id (int): The ID of the logged-in user.
            page (int): Current page.
            per_page (int): Items per page.
            
        Returns:
            Pagination: SQLAlchemy Pagination object.
        """
        # Reuse logic from InterventionService
        return InterventionService.get_tech_activity(
            user_id=user_id, 
            page=page, 
            per_page=per_page
        )

    @staticmethod
    def get_priority_list(page=1, per_page=5):
        """
        Retrieves the paginated list of 'Broken/Obsolete' equipment.
        Used for the 'Priority List' table.
        The status ID is encapsulated here, avoiding frontend dependency.
        
        Args:
            page (int): Current page.
            per_page (int): Items per page.
            
        Returns:
            Pagination: SQLAlchemy Pagination object.
        """
        # Reuse logic from EquipmentService, hardcoding the status ID
        return EquipmentService.get_priority_list(
            status_id=HomeService.ID_BROKEN_STATUS, 
            page=page, 
            per_page=per_page
        )