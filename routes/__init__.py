from flask import Flask
from routes.auth_routes import auth_bp
from routes.punto_venta_routes import punto_venta_bp

def register_routes(app: Flask):
    app.register_blueprint(auth_bp)
    app.register_blueprint(punto_venta_bp)