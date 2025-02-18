from db.models import Cliente
from db.conexion_db import db

def crear_cliente(nombre, dni, telefono, correo, direccion, tipo_cliente):
    cliente = Cliente(nombre=nombre, dni=dni, telefono=telefono, correo=correo, direccion=direccion, tipo_cliente=tipo_cliente)
    db.session.add(cliente)
    db.session.commit()
    return cliente

def obtener_cliente_por_dni(dni):
    return Cliente.query.filter(Cliente.dni == dni).first()
