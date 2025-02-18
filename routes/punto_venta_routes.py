from flask import Blueprint, render_template, request, session, redirect, url_for, jsonify, flash
from backend.productos_web import obtener_productos, actualizar_producto, buscar_productos
from api.api_wc import wcapi
import requests
from requests.exceptions import Timeout
from db.cliente_db import crear_cliente, obtener_cliente_por_dni
from db.models import Cliente  # Ensure to import Cliente
from db.conexion_db import db  # Import db here
import logging
import json  # Import json module for debugging
from datetime import datetime

# Configura el logging al nivel INFO
logging.basicConfig(level=logging.INFO)

punto_venta_bp = Blueprint('punto_venta', __name__)

@punto_venta_bp.route('/')  # Main route of the blueprint
def punto_venta():
    if 'usuario' not in session:
        return redirect(url_for('auth.home'))  # Redirect to login if no session

    pagina = request.args.get('pagina', 1, type=int)
    productos = obtener_productos(pagina=pagina)

    if isinstance(productos, str) and "Error" in productos:  # Handle API error
        return render_template("punto_venta.html", error=productos)

    return render_template("punto_venta.html", productos=productos)

@punto_venta_bp.route('/registrar_venta', methods=['POST'])  # Ensure this line is present
def registrar_venta():
    try:
        if 'usuario' not in session:
            return jsonify({"error": "No autorizado"}), 401  # No autorizado

        data = request.get_json()
        if not data or 'items' not in data:
            return jsonify({"error": "Datos de venta inválidos"}), 400

        cliente = data.get('cliente')  # Obtener el objeto cliente

        # Generar el ticket ANTES de enviar el pedido a WooCommerce
        ticket_content = generar_ticket(data, cliente)

        try:
            # Crear el pedido en WooCommerce
            order_data = {
                "payment_method": "cod",  # Método de pago (ej. contra reembolso) - Ajusta según sea necesario
                "payment_method_title": "Efectivo", # Título del método de pago
                "set_paid": True, # Marcar como pagado si el pago se realiza en el punto de venta
                "line_items": [],  # Inicializa la lista de artículos
                "fee_lines": [],  # Inicializa la lista de cargos
                "note": "",  # Inicializa las notas del pedido
                "meta_data": []
            }

            if cliente:  # Si hay información del cliente
                order_data["billing"] = {
                    "first_name": cliente.get('nombre', ''),
                    "last_name": "",  # O el apellido si lo tienes
                    "address_1": cliente.get('direccion', ''),
                    "email": cliente.get('correo') or "cliente@ddr.com.ar",  # Use the email or a default value
                    "phone": cliente.get('telefono', '')
                    # ... otros campos de facturación según sea necesario
                }

                order_data["meta_data"].append({
                    "key": "_cliente_id",
                    "value": cliente.get('id')
                })

            for item in data['items']:
                product_id = item['id']
                quantity = item['quantity']
                custom_price = item.get('custom_price')  # El precio ahora viene del frontend
                serial_numbers = item.get('serial_numbers', [])  # Obtener la lista de números de serie (puede estar vacía)

                line_item = {"product_id": product_id, "quantity": quantity}
                if custom_price is not None:  # Si el precio se modificó en el frontend
                    line_item["price"] = str(custom_price)  # Agregar el precio personalizado al line_item

                order_data["line_items"].append(line_item)

                # Agregar números de serie a las notas del pedido
                if serial_numbers:
                    for i, sn in enumerate(serial_numbers):
                        if sn:  # Solo agregar si el número de serie no está vacío
                            order_data["note"] += f"{item['name']} (Unidad {i+1}) SN: {sn}\n"

                # Lógica de ajuste de precio (modificada para usar custom_price)
                if custom_price is not None:
                    original_price = float(wcapi.get(f"products/{product_id}").json()["price"])
                    price_difference = custom_price - original_price
                    if price_difference != 0:
                        order_data["fee_lines"].append({
                            "name": "Ajuste de precio",
                            "total": str(price_difference * quantity),
                        })

            logging.info("Order Data: %s", order_data)  # Log the order data

            print("Order data antes de enviarlo a WooCommerce:")
            print(json.dumps(order_data, indent=4))  # Print order_data formatted

            try:
                order = wcapi.post("orders", order_data)  # Elimina el timeout aquí
                print("Respuesta de WooCommerce:")
                print(order.text)  # Print WooCommerce response
                order.raise_for_status()  # Lanza excepción para códigos de estado HTTP >= 400

                order_json = order.json()
                logging.info("Order Response: %s", order_json)  # Log the order response

                if "id" in order_json:
                    # Actualizar stock (opcional, si WooCommerce no lo gestiona automáticamente)
                    for item in data['items']:
                        try:  # Maneja errores de actualización de stock individualmente
                            actualizar_producto(item['id'], stock=item.get('new_stock'))  # Usa item.get('new_stock')
                        except Exception as e:
                            print(f"Error actualizando stock del producto {item['id']}: {e}")
                            # Considera registrar este error en un log, pero no interrumpas el proceso de venta

                    order_id = order_json["id"]
                    ticket_content = ticket_content.replace("Orden #", f"Orden # {order_id}")

                    return jsonify({"message": "Venta registrada correctamente", "order_id": order_id, "ticket": ticket_content}), 201  # Incluye el ticket

                else:
                    return jsonify({"error": "Error al crear el pedido (sin ID)"}), 500

            except Timeout:
                # Si hay un timeout, pero la venta se procesó localmente, permite generar el ticket.
                return jsonify({"message": "Venta procesada localmente, pero hubo un timeout al comunicarse con la tienda online. Verifica el estado del pedido manualmente.", "timeout": True, "ticket": ticket_content}), 201  # Código 201 para indicar éxito local

            except requests.exceptions.RequestException as e:
                logging.error("Request Exception: %s", e)  # Log the request exception
                return jsonify({"message": "Venta procesada localmente", "ticket": ticket_content, "timeout": True}), 201

        except Exception as e:
            logging.error("Exception: %s", e)  # Log the exception
            return jsonify({"error": str(e)}), 500
    except Exception as e:
        logging.error("Exception: %s", e)  # Log the exception
        return jsonify({"error": str(e)}), 500

def generar_ticket(data, cliente):
    # Datos del negocio (reemplaza con tus datos)
    nombre_negocio = "Tu Negocio"
    direccion_negocio = "Dirección del Negocio"
    telefono_negocio = "Teléfono del Negocio"

    # Fecha y hora
    fecha_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Contenido del ticket
    ticket = f"""
    {nombre_negocio}
    {direccion_negocio}
    {telefono_negocio}

    Orden #
    Fecha: {fecha_hora}

    Cliente: {cliente.get('nombre', 'Invitado') if cliente else 'Invitado'}
    DNI: {cliente.get('dni', '') if cliente else ''}
    Teléfono: {cliente.get('telefono', '') if cliente else ''}

    Productos:
    """

    total = 0
    for item in data['items']:
        precio_unitario = item.get('custom_price') or wcapi.get(f"products/{item['id']}").json().get('price', 0)
        subtotal = float(precio_unitario) * item['quantity']
        total += subtotal

        ticket += f"- {item['name']} x {item['quantity']} (${precio_unitario:.2f} c/u): ${subtotal:.2f}\n"

        serial_numbers = item.get('serial_numbers', [])
        if serial_numbers:
            for sn in serial_numbers:
                if sn:  # Agrega solo los valores no vacíos.
                    ticket += f"  SN: {sn}\n"
    ticket += f"\nTotal: ${total:.2f}\n"
    ticket += "===============================\n"
    ticket += "Gracias por su compra!\n"

    return ticket

@punto_venta_bp.route('/buscar')
def buscar():
    termino = request.args.get('termino')
    if not termino:
        return jsonify([])  # Return an empty list if no search term is provided
    productos = buscar_productos(termino)

    if isinstance(productos, str):  # Handle errors
        return jsonify({'error': productos}), 500

    return jsonify(productos)

@punto_venta_bp.route('/guardar_cliente', methods=['POST', 'PUT'])
def guardar_cliente():
    try:
        data = request.get_json()
        if not data or 'nombre' not in data:
            return jsonify({'error': 'El nombre del cliente es obligatorio'}), 400

        nombre = data['nombre']
        dni = data.get('dni', '')
        telefono = data.get('telefono', '')
        correo = data.get('correo', '')
        direccion = data.get('direccion', '')
        tipo_cliente = data.get('tipo_cliente', 'consumidor_final')

        if telefono and not correo:
            correo = f"{telefono}@gmail.com"
        elif not correo:
            correo = "cliente@example.com"

        cliente_data = {
            "first_name": nombre,
            "last_name": "",
            "email": correo,
            "meta_data": []
        }
        if dni:
            cliente_data["meta_data"].append({
                "key": "_cliente_documento",
                "value": dni
            })

        cliente_existente = obtener_cliente_por_dni(dni)
        if cliente_existente:
            # Logic to update existing client
            cliente_existente.nombre = nombre
            cliente_existente.telefono = telefono
            cliente_existente.correo = correo
            cliente_existente.direccion = direccion
            cliente_existente.tipo_cliente = tipo_cliente
            db.session.commit()
            return jsonify({'message': 'Cliente actualizado correctamente', 'cliente': cliente_existente.to_dict()}), 200
        else:
            cliente = crear_cliente(nombre, dni, telefono, correo, direccion, tipo_cliente)
            return jsonify({'message': 'Cliente creado correctamente', 'cliente': cliente.to_dict()}), 201

    except Exception as e:
        logging.error(f"Error al guardar el cliente: {e}")
        return jsonify({'error': 'Error al guardar el cliente'}), 500

@punto_venta_bp.route('/buscar_cliente')
def buscar_cliente():
    dni = request.args.get('dni')
    if not dni:
        return jsonify({'error': 'DNI no proporcionado'}), 400

    cliente = obtener_cliente_por_dni(dni)
    if cliente:
        return jsonify({
            'id': cliente.id,
            'nombre': cliente.nombre,
            'dni': cliente.dni,
            'telefono': cliente.telefono,
            'correo': cliente.correo,
            'direccion': cliente.direccion,
            'tipo_cliente': cliente.tipo_cliente,
        })
    else:
        return jsonify(None), 404  # No encontrado

@punto_venta_bp.route('/guardar_cliente/<int:cliente_id>', methods=['PUT'])  # Ruta para actualizar
def actualizar_cliente(cliente_id):
    try:
        data = request.get_json()
        if not data or 'nombre' not in data or 'dni' not in data or 'tipo_cliente' not in data:
            return jsonify({'error': 'Datos de cliente incompletos'}), 400

        cliente = Cliente.query.get_or_404(cliente_id)

        cliente.nombre = data['nombre']
        cliente.dni = data['dni']
        cliente.telefono = data.get('telefono')  # Usa .get para opcionales
        cliente.correo = data.get('correo')
        cliente.direccion = data.get('direccion')
        cliente.tipo_cliente = data['tipo_cliente']
        
        db.session.commit()

        return jsonify({'message': 'Cliente actualizado correctamente', 'cliente': cliente.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
