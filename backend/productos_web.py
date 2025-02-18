import sys
import os

# Agrega la raíz del proyecto al PATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.api_wc import wcapi

def obtener_productos(pagina=1, por_pagina=100, search=None):
    try:
        params = {"per_page": por_pagina, "page": pagina}
        if search:
            params["search"] = search
        response = wcapi.get("products", params=params)
        if response.status_code == 200:
            return response.json()
        return f"Error: {response.status_code}"
    except Exception as e:
        return f"Error: {e}"

def actualizar_producto(id_producto, precio=None, stock=None, precio_oferta=None):
    try:
        # Crea el payload con los campos relevantes
        data = {}
        if precio is not None:
            data['regular_price'] = str(precio)  # WooCommerce requiere precio como string
        if stock is not None:
            data['stock_quantity'] = stock
        if precio_oferta is not None:
            data['sale_price'] = str(precio_oferta)  # WooCommerce requiere precio como string
        
        # Enviar datos a la API para actualizar el producto
        response = wcapi.put(f"products/{id_producto}", data).json()
        
        if response.get('id'):
            return response  # Devolver el producto actualizado
        return f"Error: {response}"  # Devolver el mensaje de error de WooCommerce
    except Exception as e:
        return f"Error: {e}"  # Manejar cualquier excepción

def buscar_producto_por_sku(sku):
    if not sku:
        return "Error: SKU no especificado"
    
    try:
        params = {"sku": sku}
        response = wcapi.get("products", params=params)
        if response.status_code == 200:
            productos = response.json()
            if productos:
                return productos
            return "Error: No se encontraron productos con el SKU especificado"
        return f"Error: {response.status_code}"
    except Exception as e:
        return f"Error: {e}"

def buscar_productos(termino_busqueda):
    try:
        # 1. Intenta buscar por SKU primero
        productos_por_sku = wcapi.get("products", params={'sku': termino_busqueda}).json()

        # Corrección en la condición: Verificar si es una lista y no está vacía, o si es un diccionario que contiene la clave 'id'
        if (isinstance(productos_por_sku, list) and productos_por_sku) or (isinstance(productos_por_sku, dict) and 'id' in productos_por_sku):
            return productos_por_sku

        # 2. Si no se encuentra por SKU, busca por nombre, etiquetas y categorías
        params = {
            'search': termino_busqueda,
            'per_page': 100  # Adjust if you need more results per page
        }
        response = wcapi.get("products", params=params).json()

        # Search in tags and categories if no results found
        if not response or 'message' in response:
            productos_encontrados = []
            categorias = wcapi.get("products/categories", params={'search': termino_busqueda, 'per_page': 100}).json()

            if isinstance(categorias, list):
                for categoria in categorias:
                    try:
                        id_categoria = categoria.get('id')
                        if id_categoria:
                            productos_categoria = wcapi.get(f"products?category={id_categoria}").json()
                            if isinstance(productos_categoria, list):
                                productos_encontrados.extend(productos_categoria)
                    except Exception as e:
                        print(f"Error obteniendo productos de la categoría {categoria.get('name', 'desconocida')}: {e}")
        else:
            productos_encontrados = response

        return productos_encontrados

    except Exception as e:
        return f"Error en la búsqueda: {e}"
