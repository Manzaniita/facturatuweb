from woocommerce import API
import requests
from requests.exceptions import Timeout

wcapi = API(
    url="https://ddr.com.ar",
    consumer_key="ck_c36369f3e453ef7e86a43e328fdec09db647ad36",
    consumer_secret="cs_a89b1576ff250249bb69f7cc6a536144537ca6d6",
    version="wc/v3",
    timeout=20  # Añade un timeout aquí. Ajusta el valor según tus necesidades
)

def test_connection():
    try:
        response = wcapi.get("products")
        if response.status_code == 200:
            return "Conexión web exitosa"
        else:
            return f"Error en la conexión: {response.status_code}"
    except Exception as e:
        return f"Error en la conexión: {e}"