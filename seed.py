from app import app, db
from models import User, EquipmentType, EquipmentStatus, Location, Equipment, Intervention, InterventionOutcome, Roles
from werkzeug.security import generate_password_hash
from datetime import date

"""
Database Seeding Script.
This script initializes the application context, resets the database schema,
and populates tables with initial mock data for testing or production setup.
It is intended to be run directly from the terminal (e.g., `python seed.py`).
"""

# FLASK CONTEXT SETUP
# Since this script runs from the terminal (not via a web request),
# we must manually push the application context to access 'db' and config.
with app.app_context():
    print("Initializing School Management System (ID Mode)...")
    
    """
    Step 1: Schema Reset.
    WARNING: This operation deletes all existing data.
    db.drop_all() - Removes all tables defined in models.
    db.create_all() - Recreates tables according to the current schema.
    """
    db.drop_all()
    db.create_all()
    print("Database cleaned and ready.")

    """
    Step 2: Population of Lookup Tables (Dictionaries).
    Creates static reference data for:
    - Equipment Statuses (e.g., Working, Broken)
    - Equipment Types (e.g., PC, Printer)
    - Intervention Outcomes (e.g., Resolved)
    - Locations (e.g., Lab 1, Office)
    """
    
    # Statuses
    s_ok = EquipmentStatus(description="Working")
    s_rep = EquipmentStatus(description="Under Repair")
    s_obs = EquipmentStatus(description="Obsolete/To Dispose")
    
    # Types
    t_pc = EquipmentType(description="Desktop PC")
    t_nb = EquipmentType(description="Notebook")
    t_lim = EquipmentType(description="Interactive Whiteboard / Touch Monitor")
    t_prt = EquipmentType(description="Network Printer")

    # Outcomes
    out_ok = InterventionOutcome(description='Resolved')
    out_mon = InterventionOutcome(description='Monitoring')
    out_nok = InterventionOutcome(description='Pending')

    # Locations
    u_reg = Location(name="Registrar Office", floor="Ground", building="Building A")
    u_lab1 = Location(name="Computer Lab 1", floor="First", building="Building A")
    u_cl3b = Location(name="Classroom 3B", floor="Second", building="Building B")
    u_princ = Location(name="Principal Office", floor="Ground", building="Building A")

    # Transaction Commit
    # We commit now to let the Database generate the Primary Keys (IDs).
    # These IDs are required immediately in the next steps for linking Foreign Keys.
    db.session.add_all([
        s_ok, s_rep, s_obs, 
        t_pc, t_nb, t_lim, t_prt, 
        out_ok, out_mon, out_nok,
        u_reg, u_lab1, u_cl3b, u_princ
    ])
    db.session.commit()

    """
    Step 3: User Account Creation.
    Initializes default administrative and technical accounts.
    Implements security best practices by hashing passwords before storage.
    """
    
    admin = User(
        username="admin",
        password_hash=generate_password_hash("admin123"), # Security: Never store plain text passwords
        role=Roles.ADMIN,
        first_name="Cristian", last_name="Fabozzo", email="dsga@school.it"
    )

    tech = User(
        username="tech",
        password_hash=generate_password_hash("tech123"),
        role=Roles.TECHNICIAN,
        first_name="Giuseppe", last_name="Santoro", email="technical.assistant@school.it"
    )

    db.session.add_all([admin, tech])
    db.session.commit()

    """
    Step 4: Equipment Inventory Initialization.
    Creates specific assets linking them to the previously created lookup tables.
    Uses Foreign Keys (IDs) generated in Step 1 to establish relationships.
    """
    
    pc_reg_01 = Equipment(
        name="PC-REG-01",
        description="Dell Optiplex - Protocol Station",
        # Accessing the IDs generated after the previous commit
        type_id=t_pc.type_id,          
        status_id=s_ok.status_id,        
        location_id=u_reg.location_id 
    )

    pc_lab_15 = Equipment(
        name="PC-LAB1-15",
        description="HP ProDesk - Windows fails to load",
        type_id=t_pc.type_id,
        status_id=s_rep.status_id,
        location_id=u_lab1.location_id
    )

    lim_3b = Equipment(
        name="IWB-3B",
        description="SmartBoard 75 inch",
        type_id=t_lim.type_id,
        status_id=s_ok.status_id,
        location_id=u_cl3b.location_id
    )

    prt_princ = Equipment(
        name="PRT-PRINCIPAL",
        description="Old LaserJet - Damaged rollers",
        type_id=t_prt.type_id,
        status_id=s_obs.status_id,
        location_id=u_princ.location_id
    )

    db.session.add_all([pc_reg_01, pc_lab_15, lim_3b, prt_princ])
    db.session.commit()

    """
    Step 5: Maintenance History (Interventions).
    Logs past repair or maintenance activities linked to specific equipment and technicians.
    Links Outcome, Equipment, and User entities.
    """
    
    
    int_1 = Intervention(
        date=date(2025, 11, 10),
        description="Formatting and Windows 10 re-installation",
        duration_minutes=90,
        outcome_id=out_ok.outcome_id,
        equipment_id=pc_lab_15.equipment_id,
        user_id=tech.user_id
    )

    
    
    int_2 = Intervention(
        date=date(2025, 11, 12), 
        description="Black Toner Replacement",
        duration_minutes=10,
        outcome_id=out_ok.outcome_id,
        equipment_id=prt_princ.equipment_id,
        user_id=tech.user_id
    )

    db.session.add_all([int_1, int_2])
    db.session.commit()

    print("SCHOOL DATA LOADED SUCCESSFULLY!")