from flask import Flask, send_from_directory, request
from flask_login import LoginManager, current_user
from models import db
from routes.web import web_bp
from routes.equipment import equipment_bp
from routes.intervention import interventions_bp
from routes.location import locations_bp
from routes.user import user_bp
from routes.home import home_bp
from models import User
import os 

"""
Main Application Entry Point.
This file initializes the Flask application, configures the database connection,
registers blueprints (routes), and sets up the application context.
"""

app = Flask(__name__)

# Database Configuration
# Using SQLite for development simplicity.
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///trackhub.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Security Key for sessions (keep secret in production)
app.secret_key = '57214cf02b0e9557b7a207242ee6c91af31709a655deed627ec409743a2358f5'

# Flask-Login Configuration
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'web.view_login_form' # if not logged



@app.before_request
def global_security_check():
    """
    Global firewall: blocks every route by default
    unless explicitly marked as public.
    """

    # 1. Allow static files
    if request.endpoint and request.endpoint.startswith('static'):
        return

    print(f">>> Accessing Endpoint: {request.endpoint}")

    # 2. Get the view function associated with the endpoint
    view_func = app.view_functions.get(request.endpoint)

    # If route is explicitly marked as public, allow it
    if view_func and getattr(view_func, 'is_public', False):
        return

    # 3. Authentication check
    if not current_user.is_authenticated:
        return app.login_manager.unauthorized()

@login_manager.user_loader
def load_user(user_id):
    """
    Callback function used by Flask-Login to reload the user object from the user ID stored in the session.

    Args:
        user_id (str): The unique identifier of the user (from session).

    Returns:
        User: The User object associated with the ID, or None if not found.
    """
    return User.query.get(int(user_id))

# Initialize extensions
db.init_app(app)


# Register Blueprints
# web_bp: Handles HTML/Frontend routes
# equipment_bp: Handles API/JSON routes
app.register_blueprint(web_bp)
app.register_blueprint(equipment_bp)
app.register_blueprint(interventions_bp)
app.register_blueprint(locations_bp)
app.register_blueprint(user_bp)
app.register_blueprint(home_bp)



@app.route('/service-worker.js')
def service_worker():
    """
    Serves the Service Worker file for PWA (Progressive Web App) capabilities.
    Allows the app to work offline or be installed on devices.

    Returns:
        Response: The service-worker.js file served from the static directory.
    """
   
    response = send_from_directory('static/js', 'service-worker.js')
    response.headers['Cache-Control'] = 'no-cache' 
    return response

# Database Verification on Startup
with app.app_context():
    db.create_all()
    print("Database verified/created successfully")

if __name__ == '__main__':
    # host='0.0.0.0' is required for Docker.
    # Without it, the site runs in the container but isn't displayed.
    app.run(host='0.0.0.0', port=5000, debug=True)