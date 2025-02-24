document.addEventListener('DOMContentLoaded', () => {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    let cart = {}; // Declarar cart en el ámbito global
    let clienteSeleccionado = null;
    const clienteInfoDiv = document.getElementById('cliente-info');  // Obtener la referencia fuera del evento

    // Función para actualizar el carrito en el DOM (modificada)
    function updateCartDOM() {
        cartItems.innerHTML = ''; // Limpiar el carrito
        let total = 0;

        for (const productId in cart) {
            const item = cart[productId];
            const listItem = document.createElement('li');

            // Crear imagen del producto
            const productImage = document.createElement('img');
            productImage.src = item.image;
            productImage.alt = item.name;
            listItem.appendChild(productImage);

            const productInfoContainer = document.createElement('div');

            const productNameQuantity = document.createElement('span');
            productNameQuantity.textContent = `${item.name} x ${item.quantity} - `;
            productInfoContainer.appendChild(productNameQuantity);

            // Mostrar el precio calculado (sin input)
            const calculatedPriceSpan = document.createElement('span');
            calculatedPriceSpan.textContent = `$${(item.price * item.quantity).toFixed(2)}`;
            productInfoContainer.appendChild(calculatedPriceSpan);

            listItem.appendChild(productInfoContainer);

            // Botón para eliminar un producto del carrito
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Eliminar';
            removeButton.dataset.productId = productId;
            removeButton.addEventListener('click', removeCartItem);
            listItem.appendChild(removeButton);

            // Agregar botón "Editar"
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.dataset.productId = productId;
            editButton.addEventListener('click', openEditModal);
            listItem.appendChild(editButton);

            cartItems.appendChild(listItem);
            total += item.price * item.quantity;
        }

        cartTotal.textContent = `Total: $${calculateTotalCart().toFixed(2)}`;
    }

    // Función para actualizar el precio de un artículo en el carrito
    function updateCartItemPrice(event) {
        const productId = event.target.dataset.productId;
        const newPrice = parseFloat(event.target.value);

        if (newPrice >= 0 && cart[productId]) { // Validar precio no negativo
            cart[productId].price = newPrice;
            updateCartDOM(); // Actualizar el carrito en el DOM
        } else {
            alert('El precio debe ser un número no negativo.');
            event.target.value = cart[productId].price; // Restaurar el valor anterior
        }
    }

    // Función para agregar un producto al carrito
    function addProductToCart(productId, name, price, image, stock) { // Agregar stock como parámetro
        if (cart[productId]) {
            cart[productId].quantity++;
        } else {
            cart[productId] = { 
                name, 
                price, 
                quantity: 1, 
                image,
                stock: stock, // Almacenar el stock aquí
                serialNumbers: [] // Agregar esta línea
            };
        }
        updateCartDOM();
    }

    // Función para eliminar un producto del carrito
    function removeCartItem(event) {
        const productId = event.target.dataset.productId;
        if (cart[productId]) {
            if (cart[productId].quantity > 1) {
                cart[productId].quantity--;
            } else {
                delete cart[productId];
            }
            updateCartDOM();
        }
    }

    //Función para agregar un input de número de serie (NECESARIA para el modal)
    function addSerialNumberInput(event) {
        const productId = event.target.dataset.productId;
        const serialNumberInputContainer = event.target.closest('.serial-number-input-container');
        const item = cart[productId];

        if (!item.serialNumbers) {
            item.serialNumbers = ['']; // Iniciar con un campo vacío para la primera unidad
        } else {
            item.serialNumbers.push(''); // Agregar un nuevo campo vacío para cada unidad adicional
        }

        // Regenerar todos los inputs para reflejar los cambios (CORREGIDO)
        serialNumberInputContainer.innerHTML = ''; // Limpiar el contenedor

        item.serialNumbers.forEach((sn, i) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `SN ${i + 1}`;
            input.value = sn;
            input.dataset.productId = productId;
            input.dataset.serialIndex = i;
            input.addEventListener('change', updateSerialNumber);
            serialNumberInputContainer.appendChild(input);
        });
    }

    // Función para actualizar el número de serie (NECESARIA para el modal)
    function updateSerialNumber(event) {
        const productId = event.target.dataset.productId;
        const serialIndex = parseInt(event.target.dataset.serialIndex, 10); // Convertir a entero
        const newSerialNumber = event.target.value;

        if (cart[productId]) {
            if (!cart[productId].serialNumbers) {
                cart[productId].serialNumbers = [];
            }
            cart[productId].serialNumbers[serialIndex] = newSerialNumber;
        }
    }

    // Función para abrir el modal de edición (FIXED)
    function openEditModal(event) {
        const productId = event.target.dataset.productId;
        const item = cart[productId];

        // Mostrar el modal
        const editModal = document.getElementById('edit-modal');
        editModal.style.display = 'block';

        // Obtener elementos del modal DESPUÉS de mostrarlo
        const productName = editModal.querySelector('#edit-product-name');
        const productPrice = editModal.querySelector('#edit-product-price');
        const serialNumbersContainer = editModal.querySelector('#edit-serial-numbers');
        let productQuantity; // Declarar la variable

        // Rellenar el modal con los datos del producto
        productName.textContent = item.name;
        productPrice.value = item.price;

        // Input para la cantidad (FIXED)
        if (!productQuantity) {
            productQuantity = document.createElement('input');
            productQuantity.type = 'number';
            productQuantity.min = 1;
            productQuantity.id = 'edit-product-quantity';
            serialNumbersContainer.parentNode.insertBefore(productQuantity, serialNumbersContainer);
        }

        productQuantity = editModal.querySelector('#edit-product-quantity'); // Obtener el elemento AQUÍ
        productQuantity.value = item.quantity;

        // Event listener para actualizar la cantidad y los SN (FIXED)
        productQuantity.addEventListener('change', () => {
            updateQuantityAndSerials(productId, productQuantity, serialNumbersContainer);
        });

        generateSerialInputs(productId, item.quantity, serialNumbersContainer);

        // Agregar evento al botón "Guardar" del modal (modificado)
        const saveButton = document.getElementById('save-changes');
        saveButton.onclick = () => {
            // Actualizar el precio en el carrito
            item.price = parseFloat(productPrice.value);

            // Guardar los números de serie en el carrito
            item.serialNumbers = Array.from(serialNumbersContainer.querySelectorAll('input')).map(input => input.value);

            updateCartDOM();
            editModal.style.display = 'none';
        };

        // Agregar evento al botón "Cancelar" del modal
        document.getElementById('cancel-changes').onclick = () => {
            editModal.style.display = 'none';
        };
    }

    // Función para actualizar la cantidad y los números de serie (CORREGIDA)
    function updateQuantityAndSerials(productId, productQuantity, serialNumbersContainer) {
        const item = cart[productId];
        let newQuantity = parseInt(productQuantity.value);

        if (isNaN(newQuantity) || newQuantity < 1) {
            newQuantity = 1;
            productQuantity.value = 1;
        }

        // Ajustar la longitud del array de números de serie
        if (newQuantity > item.serialNumbers.length) {
            // Agregar nuevos campos vacíos si la cantidad aumenta
            for (let i = item.serialNumbers.length; i < newQuantity; i++) {
                item.serialNumbers.push('');
            }
        } else if (newQuantity < item.serialNumbers.length) {
            // Recortar el array si la cantidad disminuye
            item.serialNumbers.length = newQuantity;
        }

        item.quantity = newQuantity; // Actualizar la cantidad en el carrito
        generateSerialInputs(productId, newQuantity, serialNumbersContainer); // Regenerar los inputs
        updateCartDOM(); // Actualizar la vista del carrito
    }

    // Función para generar inputs de números de serie (CORREGIDA)
    function generateSerialInputs(productId, quantity, serialNumbersContainer) {
        const item = cart[productId];
        serialNumbersContainer.innerHTML = '';

        for (let i = 0; i < quantity; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `SN ${i + 1}`;
            input.value = item.serialNumbers[i] || ''; // Usar el valor existente o un string vacío
            input.dataset.productId = productId;
            input.dataset.serialIndex = i;
            input.addEventListener('input', updateSerialNumberInModal);
            serialNumbersContainer.appendChild(input);
        }
    }

    // Función para actualizar el número de serie en el modal (Simplificada)
    function updateSerialNumberInModal(event) {
        const productId = event.target.dataset.productId;
        const serialIndex = parseInt(event.target.dataset.serialIndex, 10);
        const newSerialNumber = event.target.value;
        cart[productId].serialNumbers[serialIndex] = newSerialNumber;
    }

    // Agregar evento click a los botones "Agregar al Carrito"
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productCard = button.closest('.product-card');
            const productId = productCard.dataset.productId;
            const productName = productCard.querySelector('.product-name').textContent;
            const productPrice = parseFloat(productCard.dataset.productPrice);
            const productImage = productCard.querySelector('img').src;
            const productStock = parseInt(productCard.querySelector('.product-stock').textContent.replace('Stock: ', ''));
            addProductToCart(productId, productName, productPrice, productImage, productStock); // Pasar el stock a addProductToCart
        });
    });

    const checkoutButton = document.getElementById('checkout-button');
    const saleModal = document.getElementById('sale-modal');
    const closeButton = document.getElementById('close-button');
    const paymentMethodSelect = document.getElementById('payment-method');
    const totalCalculatedSpan = document.getElementById('total-calculated');
    const amountPaidInput = document.getElementById('amount-paid');
    const changeSpan = document.getElementById('change');
    const exactAmountButton = document.getElementById('exact-amount');
    const roundHundredButton = document.getElementById('round-hundred');
    const roundThousandButton = document.getElementById('round-thousand');
    const confirmSaleButton = document.getElementById('confirm-sale');
    const cancelSaleButton = document.getElementById('cancel-sale');

    let totalCart = 0;

    checkoutButton.addEventListener('click', () => {
        totalCart = calculateTotalCart();
        totalCalculatedSpan.textContent = `$${totalCart.toFixed(2)}`;
        saleModal.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        saleModal.style.display = 'none';
    });

    paymentMethodSelect.addEventListener('change', updateTotalCalculated);
    amountPaidInput.addEventListener('input', updateChange);

    exactAmountButton.addEventListener('click', () => {
        amountPaidInput.value = totalCart.toFixed(2);
        updateChange();
    });

    roundHundredButton.addEventListener('click', () => {
        amountPaidInput.value = Math.ceil(totalCart / 100) * 100;
        updateChange();
    });

    roundThousandButton.addEventListener('click', () => {
        amountPaidInput.value = Math.ceil(totalCart / 1000) * 1000;
        updateChange();
    });

    confirmSaleButton.addEventListener('click', () => {
        // Deshabilitar el botón y mostrar el mensaje de "Procesando..."
        confirmSaleButton.disabled = true;
        confirmSaleButton.textContent = "Procesando...";

        const amountPaid = parseFloat(amountPaidInput.value);
        const paymentMethod = paymentMethodSelect.value;

        // Calcular el total con el método de pago aplicado a los precios modificados
        totalCart = calculateTotalCart(paymentMethod); // Pasar el método de pago

        if (amountPaid >= totalCart) {
            const itemsWithSerials = [];
            for (const productId in cart) {

                let productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
                if (!productCard) { // Si no se encuentra la tarjeta, buscarla entre los productos del buscador
                    const productos = Array.from(document.querySelectorAll('.product-card'));
                    productCard = productos.find(card => card.dataset.productId == productId);
                }

                const item = {  // Obtener datos de la tarjeta del producto
                    id: parseInt(productId),
                    quantity: cart[productId].quantity,
                    custom_price: cart[productId].price,
                    name: cart[productId].name,
                    new_stock: cart[productId].stock - cart[productId].quantity, // Usar el stock almacenado en el carrito.
                };

                if (productCard) {  // Si la tarjeta se encontró, obtener el SKU
                    item.sku = productCard.querySelector('.product-sku').textContent.replace('SKU: ', '');
                }

                itemsWithSerials.push(item);
            }

            const saleData = {
                items: itemsWithSerials,
                payment_method: paymentMethod,
                cliente: clienteSeleccionado // Asegúrate de enviar clienteSeleccionado, no cliente_id
            };

            fetch('/punto_venta/registrar_venta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saleData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message || data.timeout) {
                    const ticketContent = data.ticket;  // Use the ticket returned by the server

                    // Show the ticket in a modal
                    const ticketModal = document.getElementById('ticket-modal');
                    const ticketContentPre = document.getElementById('ticket-content'); // Get the <pre> element
                    ticketContentPre.textContent = ticketContent; // Assign the content to the <pre>
                    ticketModal.style.display = 'block';

                    // Add event to the print button in the modal
                    const printButton = document.getElementById('print-ticket-button');
                    printButton.addEventListener('click', () => {
                        printTicket(ticketContent); // Call the function to print
                    });

                    // Add event to the close button in the modal
                    const closeTicketModalButton = document.getElementById('close-ticket-modal');
                    closeTicketModalButton.addEventListener('click', () => {
                        ticketModal.style.display = 'none';
                    });

                    cart = {};
                    clienteSeleccionado = null;
                    clienteInfoDiv.textContent = "Cliente: Invitado";
                    updateCartDOM();
                } else if (data.error) {
                    alert('Error al registrar la venta: ' + (data.error || 'Error desconocido'));
                }
                confirmSaleButton.disabled = false;
                confirmSaleButton.textContent = "Confirmar Venta";
            })
            .catch(error => {
                alert('Error al registrar la venta: ' + error);
                confirmSaleButton.disabled = false; // Volver a habilitar el botón en caso de error
                confirmSaleButton.textContent = "Confirmar Venta";
            });
        } else {
            alert('El monto abonado es insuficiente.');
            confirmSaleButton.disabled = false; // Volver a habilitar el botón en caso de error
            confirmSaleButton.textContent = "Confirmar Venta";
        }
    });

    cancelSaleButton.addEventListener('click', () => {
        saleModal.style.display = 'none';
    });

    // Función para calcular el total del carrito (modificada)
    function calculateTotalCart(paymentMethod = 'efectivo') { // Agregar parámetro opcional
        let total = 0;
        for (const productId in cart) {
            total += cart[productId].price * cart[productId].quantity; // Usar precio modificado
        }

        // Aplicar la tarifa del método de pago
        if (paymentMethod === 'transferencia') total *= 1.05;
        else if (paymentMethod === 'credito-debito') total *= 1.10;
        else if (paymentMethod === '3-cuotas') total *= 1.15;
        else if (paymentMethod === '6-cuotas') total *= 1.50;

        return total;
    }

    function updateTotalCalculated() {
        const paymentMethod = paymentMethodSelect.value;
        let multiplier = 1;
        if (paymentMethod === 'transferencia') multiplier = 1.05;
        else if (paymentMethod === 'credito-debito') multiplier = 1.10;
        else if (paymentMethod === '3-cuotas') multiplier = 1.15;
        else if (paymentMethod === '6-cuotas') multiplier = 1.50;
        totalCart = calculateTotalCart() * multiplier;
        totalCalculatedSpan.textContent = `$${totalCart.toFixed(2)}`;
        updateChange();
    }

    function updateChange() {
        const amountPaid = parseFloat(amountPaidInput.value) || 0;
        const change = amountPaid - totalCart;
        changeSpan.textContent = `$${change.toFixed(2)}`;
    }

    // Buscador (modificado para búsqueda en vivo)
    const searchInput = document.getElementById('search-input');
    const productList = document.getElementById('product-list');
    let timeout = null;

    searchInput.addEventListener('input', () => {
        clearTimeout(timeout); // Limpiar el timeout anterior
        timeout = setTimeout(() => {
            const searchTerm = searchInput.value;
            if (searchTerm !== "") {
                fetch(`/punto_venta/buscar?termino=${searchTerm}`)
                    .then(response => response.json())
                    .then(productos => {
                        productList.innerHTML = '';

                        if (productos && Array.isArray(productos)) {
                            if (productos.length === 1 && (productos[0].name === searchTerm || productos[0].sku === searchTerm)) {
                                // Coincidencia exacta: agregar al carrito y reiniciar la búsqueda
                                const producto = productos[0];
                                addProductToCart(producto.id, producto.name, parseFloat(producto.price), producto.images && producto.images[0] && producto.images[0].src ? producto.images[0].src : '/static/images/placeholder.png');
                                searchInput.value = '';
                                // Reiniciar la búsqueda (mostrar todos los productos)
                                productList.innerHTML = '';
                                fetch('/punto_venta/')
                                    .then(response => response.text())
                                    .then(html => {
                                        productList.innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('product-list').innerHTML;
                                        // Volver a agregar event listeners
                                        const addToCartButtons = productList.querySelectorAll('.add-to-cart');
                                        addToCartButtons.forEach(button => button.addEventListener('click', () => {
                                            const productCard = button.closest('.product-card');
                                            const productId = productCard.dataset.productId;
                                            const productName = productCard.querySelector('.product-name').textContent;
                                            const productPrice = parseFloat(productCard.dataset.productPrice);
                                            const productImage = productCard.querySelector('img').src;
                                            addProductToCart(productId, productName, productPrice, productImage);
                                        }));
                                    });
                                return; // Detener la ejecución para evitar el código posterior
                            } else if (productos.length > 1) {
                                productos.forEach(producto => {
                                    const productCard = createProductCard(producto);
                                    productList.appendChild(productCard);
                                });
                            } else {
                                const noResultsMessage = document.createElement('p');
                                noResultsMessage.textContent = "No se encontraron productos.";
                                productList.appendChild(noResultsMessage);
                            }
                        } else {
                            const noResultsMessage = document.createElement('p');
                            noResultsMessage.textContent = 'No se encontraron productos.';
                            productList.appendChild(noResultsMessage);
                        }
                    })
                    .catch(error => {
                        console.error('Error en la búsqueda:', error);
                        // Manejar el error
                    });
            } else {
                // Limpiar la lista de productos y mostrar los productos originales (SIN recargar la página)
                productList.innerHTML = '';
                fetch('/punto_venta/')
                    .then(response => response.text())
                    .then(html => {
                        productList.innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('product-list').innerHTML;

                        // Volver a agregar los event listeners a los botones "Agregar al carrito"
                        const addToCartButtons = document.querySelectorAll('.add-to-cart');
                        addToCartButtons.forEach(button => {
                            button.addEventListener('click', () => {
                                const productCard = button.closest('.product-card');
                                const productId = productCard.dataset.productId;
                                const productName = productCard.querySelector('.product-name').textContent;
                                const productPrice = parseFloat(productCard.dataset.productPrice);
                                const productImage = productCard.querySelector('img').src;
                                addProductToCart(productId, productName, productPrice, productImage);
                            });
                        });
                    });
            }
        }, 300); // Esperar 300ms antes de realizar la búsqueda
    });

    // Función para crear la tarjeta del producto (CORREGIDA)
    function createProductCard(producto) {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.dataset.productId = producto.id;
        productCard.dataset.productPrice = producto.price;

        // Imagen (manejar el caso donde no hay imágenes)
        const productImage = document.createElement('img');
        productImage.src = producto.images && producto.images[0] && producto.images[0].src ? producto.images[0].src : '/static/images/placeholder.png';
        productImage.alt = producto.name;
        productCard.appendChild(productImage);

        const productName = document.createElement('div');
        productName.classList.add('product-name');
        productName.textContent = producto.name;
        productCard.appendChild(productName);

        const productPrice = document.createElement('div');
        productPrice.classList.add('product-price');
        productPrice.textContent = `$${producto.price}`;
        productCard.appendChild(productPrice);

        // Stock (manejar el caso donde no hay stock)
        const productStock = document.createElement('div');
        productStock.classList.add('product-stock');
        productStock.textContent = 'Stock: ' + (producto.stock_quantity === null ? 'N/A' : producto.stock_quantity);
        productCard.appendChild(productStock);

        // SKU
        const productSku = document.createElement('div');
        productSku.classList.add('product-sku');
        productSku.textContent = 'SKU: ' + (producto.sku || 'N/A');
        productCard.appendChild(productSku);

        // Categoría (manejar el caso donde no hay categorías)
        const productCategory = document.createElement('div');
        productCategory.classList.add('product-category');
        productCategory.textContent = producto.categories && producto.categories[0] && producto.categories[0].name ? `Categoría: ${producto.categories[0].name}` : 'Categoría: N/A';
        productCard.appendChild(productCategory);

        // Botón "Agregar al Carrito"
        const addToCartButton = document.createElement('button');
        addToCartButton.classList.add('add-to-cart');
        addToCartButton.textContent = 'Agregar al Carrito';
        addToCartButton.addEventListener('click', () => {
            const productCard = addToCartButton.closest('.product-card');
            const productId = productCard.dataset.productId;
            const productName = productCard.querySelector('.product-name').textContent;
            const productPrice = parseFloat(productCard.dataset.productPrice);
            const productImage = productCard.querySelector('img').src;
            const productStock = parseInt(productCard.querySelector('.product-stock').textContent.replace('Stock: ', ''));
            addProductToCart(productId, productName, productPrice, productImage, productStock); // Pasar el stock a addProductToCart
        });
        productCard.appendChild(addToCartButton);

        // Enlace "Ver producto"
        const productLink = document.createElement('a');
        productLink.href = producto.permalink;
        productLink.classList.add('product-link');
        productLink.textContent = 'Ver producto';
        productLink.target = '_blank';
        productCard.appendChild(productLink);

        return productCard;
    }

    const registerClientButton = document.getElementById('register-client-button');
    const clienteForm = document.getElementById('cliente-form');
    const closeClienteForm = document.getElementById('close-cliente-form');

    registerClientButton.addEventListener('click', () => {
        clienteForm.style.display = 'block';
    });

    closeClienteForm.addEventListener('click', () => {
        clienteForm.style.display = 'none';
    });

    // Buscar cliente por DNI
    clienteForm.querySelector('#cliente-dni').addEventListener('blur', async (event) => {
        const dni = event.target.value;
        if (dni) {
            const response = await fetch(`/punto_venta/buscar_cliente?dni=${dni}`);
            if (response.ok) {
                const cliente = await response.json();
                if (cliente) {
                    // Mostrar la información del cliente en el modal
                    // ... (código para rellenar el formulario con los datos del cliente) ...
                    clienteSeleccionado = cliente;
                } else {
                    // Limpiar el formulario si no se encuentra el cliente
                    clienteSeleccionado = null;
                }
            }
        }
    });

    // Registrar un nuevo cliente o actualizar uno existente
    const clienteDataForm = document.getElementById('cliente-data');
    clienteDataForm.onsubmit = async (e) => {
        e.preventDefault(); // Prevent normal form submission

        const nombre = document.getElementById('cliente-nombre').value;
        const dni = document.getElementById('cliente-dni').value || ''; // Default to empty string
        const telefono = document.getElementById('cliente-telefono').value || ''; // Default to empty string
        let correo = document.getElementById('cliente-correo').value || ''; // Default to empty string
        const direccion = document.getElementById('cliente-direccion').value || ''; // Default to empty string
        const tipo_cliente = document.getElementById('cliente-tipo').value || 'consumidor_final'; // Default to 'consumidor_final'

        if (telefono && !correo) {
            correo = `${telefono}@gmail.com`; // Create email if phone is provided and email is not
        }

        try {
            const response = await fetch('/punto_venta/guardar_cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, dni, telefono, correo, direccion, tipo_cliente })
            });

            if (response.ok) {
                const data = await response.json(); // Get JSON response
                clienteSeleccionado = data.cliente; // Update clienteSeleccionado with client data

                clienteForm.style.display = 'none'; // Close modal on success

                // Update client info in the main view
                clienteInfoDiv.textContent = `Cliente: ${clienteSeleccionado.nombre} (DNI: ${clienteSeleccionado.dni})`;

                // Call updateCartDOM to keep the cart visible
                updateCartDOM();
            } else {
                console.error('Error al guardar el cliente:', response.status);
            }
        } catch (error) {
            console.error('Error al guardar el cliente:', error);
        }
    };

    // Mostrar "Invitado" por defecto
    clienteInfoDiv.textContent = "Cliente: Invitado";
});

// Función para imprimir el ticket (adaptada para 80mm)
function printTicket(ticketContent) {
    const printWindow = window.open('', '_blank', 'width=300,height=600'); // Ajusta el ancho según tu impresora
    printWindow.document.open();

    // Estilos CSS para el ticket de 80mm
    const ticketStyles = `
        body {
            font-family: monospace; // Fuente monoespaciada para mejor alineación
            font-size: 12px; // Ajusta el tamaño de fuente según sea necesario
            margin: 0;
            padding: 5px;
        }
        pre {
            white-space: pre-wrap;  // Permite saltos de línea automáticos
        }
    `;

    // Contenido del ticket con estilos
    printWindow.document.write(`
        <html>
        <head>
            <title>Ticket</title>
            <style>${ticketStyles}</style>
        </head>
        <body>
            <pre>${ticketContent}</pre>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    //printWindow.close(); // Opcional: cerrar la ventana después de imprimir. En algunos navegadores, es mejor dejar que el usuario la cierre.
}