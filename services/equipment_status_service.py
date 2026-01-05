from models import EquipmentStatus

class EquipmentStatusService:
    """
    Service class for managing Equipment Statuses (Lookup Table).
    """

    @staticmethod
    def get_all_statuses():
        """
        Retrieves all available operational statuses.
        Used for populating select dropdowns in forms.
        
        Returns:
            List[EquipmentStatus]: List of all status objects (e.g., Working, Broken).
        """
        return EquipmentStatus.query.all()