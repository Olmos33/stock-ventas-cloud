// stock_view.js
// Contiene la lógica CRUD (Crear, Leer, Editar, Eliminar) de los productos.

// --- IMPORTACIONES DE ESTADO Y CORE ---
import { 
    estado, totalDinero, editingProduct, saveStateToHistory, saveStateAndBroadcast 
} from './state_manager.js';

import { renderVentasDiarias, renderTotalDinero } from './sales_view.js'; // Necesario para actualizar otras vistas


// --- FUNCIÓN DE RENDERIZADO DE STOCK (EXPORTADA) ---

export function renderProductos() {
    // Referencias DOM (Se asume que estas variables son globales o están disponibles por ui_init.js)
    const productosDiv = document.getElementById('productos');
    
    productosDiv.innerHTML = '';
    // Iterar por los tipos de producto primero
    for (const tipo in estado) {
        const productoDiv = document.createElement('div');
        productoDiv.className = 'producto';
        const titulo = document.createElement('h3');
        titulo.textContent = tipo;
        productoDiv.appendChild(titulo);

        // Iterar por las tallas
        for (const talla in estado[tipo]) {
            const datos = estado[tipo][talla];
            const info = document.createElement('div');
            info.className = 'stock-info';
            info.innerHTML = `
                <strong>${talla}</strong> 
                <span>${datos.inicial}</span>
                <span>${datos.vendidos}</span>
                <span>${datos.regalados}</span>
                <span>${datos.stock}</span>
                <span>${datos.precio.toFixed(2)}€</span>
            `;
            const btnEdit = document.createElement('button');
            btnEdit.textContent = '✏️ Editar';
            btnEdit.onclick = () => editarProducto(tipo, talla);
            info.appendChild(btnEdit);
            productoDiv.appendChild(info);
        }
        productosDiv.appendChild(productoDiv);
    }
}


// --- FUNCIONES CRUD (Crear, Editar, Eliminar) ---

export function abrirModalProductoParaNuevo() {
    const modalTitle = document.getElementById('modalTitle');
    const nombreProductoInput = document.getElementById('nombreProducto');
    const tallaProductoInput = document.getElementById('tallaProducto');
    const cantidadInicialInput = document.getElementById('cantidadInicial');
    const precioProductoInput = document.getElementById('precioProducto');
    const btnGuardarProducto = document.getElementById('btnGuardarProducto');
    const btnEliminarProductoModal = document.getElementById('btnEliminarProductoModal');
    const modal = document.getElementById('modal');

    modalTitle.textContent = 'Añadir Nuevo Producto';
    nombreProductoInput.value = '';
    tallaProductoInput.value = '';
    cantidadInicialInput.value = '';
    precioProductoInput.value = '';
    btnGuardarProducto.textContent = 'Guardar Producto';
    btnEliminarProductoModal.style.display = 'none'; // Ocultar botón eliminar
    nombreProductoInput.disabled = false; // Habilitar edición de tipo y talla
    tallaProductoInput.disabled = false;
    editingProduct = null; // No estamos editando ningún producto
    modal.style.display = 'block';
}

export function editarProducto(tipo, talla) {
    const modalTitle = document.getElementById('modalTitle');
    const nombreProductoInput = document.getElementById('nombreProducto');
    const tallaProductoInput = document.getElementById('tallaProducto');
    const cantidadInicialInput = document.getElementById('cantidadInicial');
    const precioProductoInput = document.getElementById('precioProducto');
    const btnGuardarProducto = document.getElementById('btnGuardarProducto');
    const btnEliminarProductoModal = document.getElementById('btnEliminarProductoModal');
    const modal = document.getElementById('modal');

    const datos = estado[tipo][talla];
    if (!datos) return; // No se encontró el producto

    modalTitle.textContent = `Editar Producto: ${tipo} (${talla})`;
    nombreProductoInput.value = tipo;
    tallaProductoInput.value = talla;
    cantidadInicialInput.value = datos.inicial;
    precioProductoInput.value = datos.precio;

    btnGuardarProducto.textContent = 'Actualizar Producto';
    btnEliminarProductoModal.style.display = 'block'; // Mostrar botón eliminar
    nombreProductoInput.disabled = true; // Deshabilitar edición de tipo y talla durante la edición
    tallaProductoInput.disabled = true;
    
    // Almacenar el producto que se está editando (editingProduct se importa como let)
    editingProduct = { tipo: tipo, talla: talla }; 

    modal.style.display = 'block';
}

export function eliminarProducto(tipo, talla) {
    if (estado[tipo]?.[talla]) {
        const datos = estado[tipo][talla];
        totalDinero -= (datos.vendidos * datos.precio); // Actualiza totalDinero importado
        
        delete estado[tipo][talla];
        if (Object.keys(estado[tipo]).length === 0) {
            delete estado[tipo];
        }
        
        // Asume que la limpieza de ventasTemporales se hace en el core
        
        saveStateToHistory(); 
        saveStateAndBroadcast(); // Notifica a otros clientes y a la DB
        renderProductos();
        renderVentasDiarias(); 
        renderTotalDinero();
    }
}


// --- LÓGICA DE ENVÍO DEL FORMULARIO (handleFormSubmit) ---

export function handleFormSubmit(e) {
    e.preventDefault();
    
    // Referencias DOM necesarias para la lógica
    const formProducto = document.getElementById('formProducto');
    const nombreProductoInput = document.getElementById('nombreProducto');
    const tallaProductoInput = document.getElementById('tallaProducto');
    const cantidadInicialInput = document.getElementById('cantidadInicial');
    const precioProductoInput = document.getElementById('precioProducto');
    const modal = document.getElementById('modal');
    
    const tipo = nombreProductoInput.value.trim();
    const talla = tallaProductoInput.value.trim();
    const cantidad = parseInt(cantidadInicialInput.value);
    const precio = parseFloat(precioProductoInput.value);

    if (editingProduct) {
        // Estamos en modo edición
        const oldTipo = editingProduct.tipo;
        const oldTalla = editingProduct.talla;

        // Actualizar los datos del producto existente
        if (estado[oldTipo]?.[oldTalla]) {
            estado[oldTipo][oldTalla].inicial = cantidad;
            estado[oldTipo][oldTalla].precio = precio;
            // Recalcular stock basado en la nueva inicial y los vendidos/regalados
            estado[oldTipo][oldTalla].stock = cantidad - estado[oldTipo][oldTalla].vendidos - estado[oldTipo][oldTalla].regalados;
        }
        // editingProduct se resetea en el Event Listener de ui_init.js si se hace el submit
    } else {
        // Estamos añadiendo un nuevo producto
        if (!estado[tipo]) estado[tipo] = {};
        if (estado[tipo]?.[talla]) {
            if (!confirm(`El producto "${tipo}" en talla "${talla}" ya existe. ¿Deseas actualizar la cantidad inicial a ${cantidad} y el precio a ${precio.toFixed(2)}€?`)) {
                return;
            }
        }
        estado[tipo][talla] = { inicial: cantidad, vendidos: 0, regalados: 0, stock: cantidad, precio: precio };
    }

    modal.style.display = 'none';
    saveStateToHistory();
    saveStateAndBroadcast();
    renderProductos();
    renderVentasDiarias(); 
    renderTotalDinero();
    formProducto.reset();
}
