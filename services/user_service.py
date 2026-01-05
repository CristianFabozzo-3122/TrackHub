from flask_login import login_user, logout_user
from models import db, User, Roles

class UserService:
    """
    Service class for managing User accounts and authentication.
    Handles business logic for creation, login, updates, and deletion.
    """

    @staticmethod
    def get_all_users_page(page=1, per_page=10, search_query=None, role=None):
        """
        Retrieves a paginated list of users with optional filters.
        
        Args:
            page (int): Current page number.
            per_page (int): Items per page.
            search_query (str): Search term for username, email, or full name.
            role (str): Filter by user role.
            
        Returns:
            Pagination: SQLAlchemy Pagination object.
        """
        query = User.query

        if search_query:
            search = f"%{search_query}%"
            query = query.filter(
                (User.username.ilike(search)) |
                (User.first_name.ilike(search)) |
                (User.last_name.ilike(search)) |
                (User.email.ilike(search))
            )
        
        if role:
            query = query.filter_by(role=role)

        return query.paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def create_user(data):
        """
        Creates a new User entity.
        """
        existing_user = User.query.filter_by(username=data.get('username')).first()
        if existing_user:
            raise ValueError(f"Username '{data.get('username')}' is already taken.")

        new_user = User(
            username=data.get('username'),
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            role=data.get('role', Roles.TECHNICIAN)
        )

        raw_password = data.get('password')
        if not raw_password:
            raise ValueError("Password is mandatory for new user creation.")
        
        new_user.set_password(raw_password)

        db.session.add(new_user)
        db.session.commit()
        
        return new_user

    @staticmethod
    def get_all_technicians():
        """
        Retrieves all users with Technician role.
        """
        query = User.query.filter_by(role=Roles.TECHNICIAN)
        return query.all()

    @staticmethod
    def login(data):
        """
        Orchestrates user login.
        """
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            raise ValueError("Both username and password are required.")

        user = User.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            raise ValueError("Invalid username or password.")

        login_user(user)
        return user

    @staticmethod
    def logout():
        logout_user()

    @staticmethod
    def get_user_by_id(user_id):
        return User.query.get(user_id)

    @staticmethod
    def update_user(user_id, data):
        """
        Updates an existing user record with strict role validation.
        
        Args:
            user_id (int): ID of the user to update.
            data (dict): Dictionary containing update fields.
            
        Raises:
            ValueError: If validation rules (Last Admin or Tech->Admin) are violated.
            
        Returns:
            User: The updated object.
        """
        user = User.query.get(user_id)
        if not user:
            return None
        
        # --- 1. SAFETY CHECK: LAST ADMIN DEMOTION ---
        # Prevent the system from being left without administrators.
        if user.role == Roles.ADMIN and 'role' in data:
            new_role = data['role']
            if new_role != Roles.ADMIN:
                admin_count = User.query.filter_by(role=Roles.ADMIN).count()
                if admin_count <= 1:
                    raise ValueError("Cannot change role: This is the only Administrator left.")

        # --- 2. STRICT RULE: TECHNICIAN PROMOTION DENIED ---
        # A Technician cannot be promoted to Admin to ensure architectural consistency.
        if user.role == Roles.TECHNICIAN and 'role' in data:
            if data['role'] == Roles.ADMIN:
                raise ValueError("Operation Forbidden: A Technician cannot be promoted to Administrator.")

        # Proceed with updates
        if 'first_name' in data: user.first_name = data['first_name']
        if 'last_name' in data: user.last_name = data['last_name']
        if 'email' in data: user.email = data['email']
        if 'phone' in data: user.phone = data['phone']
        
        # Apply role change only if checks passed
        if 'role' in data: user.role = data['role']
        
        db.session.commit()
        return user

    @staticmethod
    def delete_user(user_id):
        """
        Deletes a user record.
        """
        user = User.query.get(user_id)
        if not user:
            return False

        # --- SAFETY CHECK: LAST ADMIN DELETION ---
        if user.role == Roles.ADMIN:
            admin_count = User.query.filter_by(role=Roles.ADMIN).count()
            if admin_count <= 1:
                raise ValueError("Cannot delete user: This is the only Administrator left in the system.")

        db.session.delete(user)
        db.session.commit()
        return True