from flask import Blueprint, render_template, request, session, redirect, url_for
from db.conexion_db import verificar_inicio_sesion

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/")
def home():
    return render_template("login.html")

@auth_bp.route("/login", methods=["POST"])
def login():
    usuario = request.form['username']
    clave = request.form['password']
    try:
        resultado = verificar_inicio_sesion(usuario, clave)
        if resultado:
            session['usuario'] = usuario
            session['rol'] = resultado['rol']
            if resultado['rol'] == 'cajero':
                return redirect(url_for('punto_venta.punto_venta'))  # Redirect to punto de venta if cashier
            return redirect(url_for('auth.index'))  # Redirect to index if admin

    except Exception as e:
        return render_template("login.html", error=f"Error inesperado: {e}")
    return render_template("login.html", error="Usuario o contraseña incorrectos")

@auth_bp.route("/index")
def index():
    return render_template("index.html")

@auth_bp.route("/logout", methods=["GET"])
def logout():
    session.clear()
    return redirect(url_for('auth.home'))

@auth_bp.route("/admin-panel")
def admin_panel():
    if 'usuario' in session and session.get('rol') == 'admin':
        return render_template("admin.html")
    return redirect(url_for('auth.home'))
