from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import requests

# URL del servicio PHP
API_URL = "http://ddr.com.ar/pyposcon/pypos.php"

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///facturatuweb.db'  # Update with your database URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

def verificar_inicio_sesion(usuario, clave):
    """Verifica las credenciales del usuario y obtiene su rol."""
    payload = {
        "accion": "verificar",
        "usuario": usuario,
        "clave": clave
    }
    try:
        response = requests.post(API_URL, json=payload)
        if response.status_code == 200:
            datos = response.json()
            if datos.get("exito"):
                print("Inicio de sesión exitoso:", datos)
                return {"exito": True, "rol": datos.get("rol")}
            else:
                print("Error en credenciales:", datos.get("mensaje"))
        else:
            print("Error en la solicitud HTTP:", response.status_code)
    except Exception as e:
        print("Error al conectar con el servidor:", e)
    return False

def obtener_usuarios():
    """Obtiene la lista de usuarios desde el servidor."""
    payload = {"accion": "obtener_usuarios"}
    try:
        response = requests.post(API_URL, json=payload)
        if response.status_code == 200:
            datos = response.json()
            if datos["exito"]:
                print("Usuarios obtenidos exitosamente:")
                for usuario in datos["usuarios"]:
                    print(usuario)
            else:
                print("Error:", datos["mensaje"])
        else:
            print("Error en la solicitud:", response.status_code)
    except Exception as e:
        print("Error al conectar con el servidor:", e)

# Ejemplo de uso
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    # Verificar inicio de sesión
    usuario = input("Usuario: ")
    clave = input("Clave: ")
    resultado = verificar_inicio_sesion(usuario, clave)
    if resultado:
        print("Bienvenido, puedes acceder a la aplicación. Rol:", resultado["rol"])

    # Obtener lista de usuarios (opcional)
    # print("\nLista de usuarios:")
    # obtener_usuarios()
