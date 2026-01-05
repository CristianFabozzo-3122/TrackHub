from models import db, InterventionOutcome

class InterventionOutcomeService:
    """
    Service class for managing Intervention's Outcome (Lookup Table).
    """
    @staticmethod
    def get_all_outcome():
        """
        Retrieves all available outcomes for interventions.
        Used for populating select dropdowns in forms.
        
        Returns:
            List[InterventionOutcome]: List of all outcome objects.
        """
        return InterventionOutcome.query.all()