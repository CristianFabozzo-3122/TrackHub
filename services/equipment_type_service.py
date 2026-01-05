from models import EquipmentType

class EquipmentTypeService:
    """
    Service class for managing Equipment Types (Lookup Table).
    """
    
    @staticmethod
    def get_all_types():
        """
        Retrieves all available equipment categories.
        Used for populating select dropdowns in forms.
        
        Returns:
            List[EquipmentType]: List of all type objects.
        """
        return EquipmentType.query.all()