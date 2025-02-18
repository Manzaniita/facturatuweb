from db.conexion_db import db  # Importa tu objeto db de SQLAlchemy

class Cliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), nullable=False)
    dni = db.Column(db.String(20), unique=True, nullable=False)  # Clave única
    telefono = db.Column(db.String(50))
    correo = db.Column(db.String(255))
    direccion = db.Column(db.String(255))
    tipo_cliente = db.Column(db.String(50), nullable=False)  # consumidor final, responsable inscripto, monotributista

    def __repr__(self):
        return f'<Cliente {self.nombre}>'

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'dni': self.dni,
            'telefono': self.telefono,
            'correo': self.correo,
            'direccion': self.direccion,
            'tipo_cliente': self.tipo_cliente
        }
