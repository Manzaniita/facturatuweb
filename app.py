from flask import Flask
from routes import auth_routes, punto_venta_routes  # Import blueprints
from db.conexion_db import db  # Import the database object
import os

app = Flask(__name__, static_folder='static')
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'clave_predeterminada_insegura')

# Initialize SQLAlchemy
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///facturatuweb.db'  # Update with your database URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def register_routes(app):  # Define the register_routes function
    app.register_blueprint(auth_routes.auth_bp)  # Sin url_prefix
    app.register_blueprint(punto_venta_routes.punto_venta_bp, url_prefix='/punto_venta')  # Register punto_venta_bp

# Register routes
register_routes(app)

# Create database tables
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  # Enable debug mode
