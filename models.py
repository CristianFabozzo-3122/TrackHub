from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class EquipmentType(db.Model):
    """
    Represents the category or type of a piece of equipment (e.g., PC, Printer, Projector).
    Acts as a lookup table for the main Equipment entity.
    """
    __tablename__ = 'equipment_type'
    type_id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(100), nullable=False)
    
    equipment_items = db.relationship('Equipment', backref='type', lazy=True)

    def to_dict(self):
        """
        Serializes the EquipmentType object into a dictionary format.
        
        Returns:
            dict: A dictionary containing the type ID and its description.
        """
        return {
            'type_id': self.type_id,
            'description': self.description
        }

class EquipmentStatus(db.Model):
    """
    Represents the operational status of the equipment (e.g., Working, Broken, In Repair).
    Used to track the lifecycle state of assets.
    """
    __tablename__ = 'equipment_status'
    status_id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(50), nullable=False)
    equipment_items = db.relationship('Equipment', backref='status', lazy=True)

    def to_dict(self):
        """
        Serializes the EquipmentStatus object into a dictionary format.

        Returns:
            dict: A dictionary containing the status ID and its description.
        """
        return {
            'status_id': self.status_id,
            'description': self.description
        }

class Location(db.Model):
    """
    Represents a physical location within the organization where equipment can be stored.
    Includes details about building, floor, and specific room/department.
    """
    __tablename__ = 'location'
    location_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    building = db.Column(db.String(20))
    floor = db.Column(db.String(4))
    department = db.Column(db.String(20))
    equipment_items = db.relationship('Equipment', backref='location', lazy=True)

    def to_dict(self):
        """
        Serializes the Location object into a dictionary format.

        Returns:
            dict: A dictionary containing location details (name, building, floor, department).
        """
        return {
            'location_id': self.location_id,
            'name': self.name,
            'building': self.building,
            'floor': self.floor,
            'department': self.department
        }

class InterventionOutcome(db.Model):
    """
    Represents the final result of a maintenance intervention (e.g., Resolved, Pending, Unsolvable).
    """
    __tablename__ = 'intervention_outcome'
    outcome_id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(50), nullable=False)
    interventions = db.relationship('Intervention', backref='outcome', lazy=True)

    def to_dict(self):
        """
        Serializes the InterventionOutcome object into a dictionary format.

        Returns:
            dict: A dictionary containing the outcome ID and its description.
        """
        return {
            'outcome_id': self.outcome_id,
            'description': self.description
        }

class Roles:
    """
    Constants defining the available user roles within the application.
    """
    ADMIN = "admin"
    TECHNICIAN = "technician"

class User(UserMixin, db.Model):
    """
    Represents an application user, which can be a technician or an administrator.
    Stores authentication details and personal information.

    SECURITY NOTE: 
    Never store the 'password' directly. Only store 'password_hash'.
    The application logic interacts with set_password() and check_password().
    """
    __tablename__ = 'user'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False) 
    password_hash = db.Column(db.String(128), nullable=False)
    
    role = db.Column(db.String(15), default=Roles.TECHNICIAN)
    first_name = db.Column(db.String(15), nullable=False)
    last_name = db.Column(db.String(15), nullable=False)
    email = db.Column(db.String(100))
    phone = db.Column(db.String(13))
    
    # Relationships
    interventions = db.relationship('Intervention', backref='technician', lazy=True)

    def set_password(self, password):
        """
        Generates a salted hash for the provided password.
        
        Args:
            password (str): The plain text password to hash.
            
        Returns:
            None: Sets the self.password_hash attribute.
        """
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """
        Verifies input password against the stored hash.

        Args:
            password (str): The plain text password to verify.

        Returns:
            bool: True if the password matches the hash, False otherwise.
        """
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """
        DTO (Data Transfer Object) for API responses.
        CRITICAL: Explicitly excludes 'password_hash' to prevent leaking security credentials.
        
        Returns:
            dict: Safe dictionary representation of the user.
        """
        return {
            'user_id': self.user_id,
            'username': self.username,
            'role': self.role,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'phone': self.phone
        }

    def get_id(self):
        """
        Overrides the Flask-Login UserMixin method to return the unique identifier.
        
        Returns:
            str: The user ID converted to string.
        """
        return str(self.user_id) 

class Equipment(db.Model):
    """
    Represents a specific physical asset or device in the inventory.
    Links to Type, Status, and Location entities via Foreign Keys.
    """
    __tablename__ = 'equipment'
    equipment_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    type_id = db.Column(db.Integer, db.ForeignKey('equipment_type.type_id'), nullable=False)
    status_id = db.Column(db.Integer, db.ForeignKey('equipment_status.status_id'), nullable=False)
    
    # an item can exists without a location
    location_id = db.Column(db.Integer, db.ForeignKey('location.location_id'), nullable=True)
    
    interventions = db.relationship('Intervention', backref='equipment', lazy=True)

    def to_dict(self):
        """
        Serializes the Equipment object into a dictionary format.
        It flattens the relationship structure by including descriptions of 
        related entities (Type, Status, Location) directly in the response.

        Returns:
            dict: A dictionary containing equipment details and related textual descriptions.
        """
        return {
            'equipment_id': self.equipment_id,
            'name': self.name,
            'description': self.description,
            'type_id': self.type_id,
            'status_id': self.status_id,
            'location_id': self.location_id,
            'type_description': self.type.description if self.type else "N/A",
            'status_description': self.status.description if self.status else "N/A",
            'location_name': self.location.name if self.location else "N/A"
        }

class Intervention(db.Model):
    """
    Represents a maintenance log or repair event associated with a piece of equipment.
    Tracks the technician, the date, the duration, and the outcome of the work.
    """
    __tablename__ = 'intervention'
    intervention_id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False) 
    description = db.Column(db.Text, nullable=False)
    duration_minutes = db.Column(db.Integer)
    
    equipment_id = db.Column(db.Integer, db.ForeignKey('equipment.equipment_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=True)
    outcome_id = db.Column(db.Integer, db.ForeignKey('intervention_outcome.outcome_id'))

    def to_dict(self):
        """
        Serializes the Intervention object into a dictionary format.
        Handles Date object conversion to ISO format string.
        Resolves Foreign Keys to human-readable names for the Frontend.

        Returns:
            dict: A dictionary containing intervention details, formatted dates, and related entity names.
        """
        return {
            'intervention_id': self.intervention_id,
            'date': self.date.isoformat() if self.date else None,
            'description': self.description,
            'duration_minutes': self.duration_minutes,
            'equipment_id': self.equipment_id,
            'equipment_name': self.equipment.name if self.equipment else "Unknown",
            'user_id': self.user_id,
            'technician_name': f"{self.technician.first_name} {self.technician.last_name}" if self.technician else "Unknown",
            'outcome_id': self.outcome_id,
            'outcome_description': self.outcome.description if self.outcome else "Pending"
        }