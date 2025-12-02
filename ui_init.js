// ui_init.js
// Contiene las referencias DOM y los Event Listeners (para evitar errores de carga).

import { 
    renderVentasDiarias, renderTotalDinero, updateUndoRedoButtons, 
    updatePaymentMethodButtons, calcularCambio, mostrarPestanaPrincipal, 
    mostrarPestana, setMetodoPago, loadStateFromHistory, 
    descargarStockCSV, renderHistorial, renderHistorialDiario // Incluir historial
} from './sales_view.js';

import { 
    abrirModalProductoParaNuevo, eliminarProducto, editarProducto, renderProductos 
} from './stock_view.js';

import { 
    saveStateToHistory, saveStateAndBroadcast, historyPointer, history 
} from './state_manager.js';

// --- REFERENCIAS DOM GLOBALES (Declaradas) ---
// Decláralas como 'let' para que puedan ser asignadas en initDOM()
let totalDineroSpan, btnDeshacer, btnRehacer, totalAPagarSpan, efectivoRecibidoInput, 
    cambioClienteSpan, areaAnotaciones, ventasDiv, btnEfectivo, btnTarjeta, 
    tabStock, tabVentasDiarias, contentStock, contentVentasDiarias, 
    tabActualizaciones, tabDiario, contenidoHistorial, contenidoHistorialDiario, 
    modalHistorial, modalAnotacion, textoAnotacion, btnActualizar, btnHistorial, 
    cerrarModalHistorial, cerrarModalAnotacion, btnDescargarStock, modal, 
    cerrarModal, formProducto, productosDiv, btnNuevoProducto, btnEliminarProductoModal, 
    modalTitle, nombreProductoInput, tallaProductoInput, cantidadInicialInput, 
    precioProductoInput, btnGuardarProducto;

// --- 🛠️ FUNCIÓN CENTRAL DE INICIALIZACIÓN DEL DOM ---
export function initDOM() {
    // 1. ASIGNACIÓN DE ELEMENTOS (CRÍTICO: Garantiza que el elemento existe)
    totalDineroSpan = document.getElementById('totalDinero');
    btnDeshacer = document.getElementById('btnDeshacer');
    btnRehacer = document.getElementById('btnRehacer');
    totalAPagarSpan = document.getElementById('totalAPagar');
    efectivoRecibidoInput = document.getElementById('efectivoRecibido');
    cambioClienteSpan = document.getElementById('cambioCliente');
    areaAnotaciones = document.getElementById('areaAnotaciones');
    ventasDiv = document.getElementById('ventasDiarias');
    btnEfectivo = document.getElementById('btnEfectivo');
    btnTarjeta = document.getElementById('btnTarjeta');
    tabStock = document.getElementById('tabStock');
    tabVentasDiarias = document.getElementById('tabVentasDiarias');
    contentStock = document.getElementById('contentStock');
    contentVentasDiarias = document.getElementById('contentVentasDiarias');
    tabActualizaciones = document.getElementById('tabActualizaciones');
    tabDiario = document.getElementById('tabDiario');
    contenidoHistorial = document.getElementById('contenidoHistorial');
    contenidoHistorialDiario = document.getElementById('contenidoHistorialDiario');
    modalHistorial = document.getElementById('modalHistorial');
    modalAnotacion = document.getElementById('modalAnotacion');
    textoAnotacion = document.getElementById('textoAnotacion');
    btnActualizar = document.getElementById('btnActualizar');
    btnHistorial = document.getElementById('btnHistorial');
    cerrarModalHistorial = document.getElementById('cerrarModalHistorial');
    cerrarModalAnotacion = document.getElementById('cerrarModalAnotacion');
    btnDescargarStock = document.getElementById('btnDescargarStock');
    modal = document.getElementById('modal');
    cerrarModal = document.getElementById('cerrarModal');
    formProducto = document.getElementById('formProducto');
    productosDiv = document.getElementById('productos');
    btnNuevoProducto = document.getElementById('btnNuevoProducto');
    btnEliminarProductoModal = document.getElementById('btnEliminarProductoModal');
    modalTitle = document.getElementById('modalTitle');
    nombreProductoInput = document.getElementById('nombreProducto');
    tallaProductoInput = document.getElementById('tallaProducto');
    cantidadInicialInput = document.getElementById('cantidadInicial');
    precioProductoInput = document.getElementById('precioProducto');
    btnGuardarProducto = document.getElementById('btnGuardarProducto');

    // 2. CONFIGURACIÓN DE EVENT LISTENERS (CRÍTICO: La funcionalidad de la app)
    
    // Eventos Generales
    btnNuevoProducto.onclick = () => abrirModalProductoParaNuevo();
    cerrarModal.onclick = () => modal.style.display = 'none';

    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
        if (e.target === modalHistorial) modalHistorial.style.display = 'none';
        if (e.target === modalAnotacion) modalAnotacion.style.display = 'none';
    };

    // Eventos de Pestañas
    tabStock.onclick = () => mostrarPestanaPrincipal('stock');
    tabVentasDiarias.onclick = () => mostrarPestanaPrincipal('ventas');
    tabActualizaciones.onclick = () => mostrarPestana('actualizaciones');
    tabDiario.onclick = () => mostrarPestana('diario');

    // Eventos de Historial
    btnHistorial.onclick = () => {
        mostrarPestana('actualizaciones');
        modalHistorial.style.display = 'block';
    };
    cerrarModalHistorial.onclick = () => modalHistorial.style.display = 'none';
    cerrarModalAnotacion.onclick = () => modalAnotacion.style.display = 'none';

    // Eventos de Controles
    btnEfectivo.onclick = () => setMetodoPago('efectivo');
    btnTarjeta.onclick = () => setMetodoPago('tarjeta');
    btnDeshacer.onclick = () => {
        if (historyPointer > 0) {
            historyPointer--;
            const loadedState = history[historyPointer];
            loadStateFromHistory(loadedState); 
            saveStateAndBroadcast(); 
        }
    };
    btnRehacer.onclick = () => {
        if (historyPointer < history.length - 1) {
            historyPointer++;
            const loadedState = history[historyPointer];
            loadStateFromHistory(loadedState);
            saveStateAndBroadcast();
        }
    };
    
    // Eventos de Pago/Stock
    efectivoRecibidoInput.oninput = calcularCambio;
    btnDescargarStock.onclick = descargarStockCSV;
    
    // Conexión con funciones de los módulos stock_view y sales_view
    btnActualizar.onclick = () => { /* La lógica de btnActualizar.onclick está en sales_view.js */ };
    formProducto.onsubmit = (e) => { /* La lógica de formProducto.onsubmit está en stock_view.js */ };
    btnGuardarProducto.onclick = () => { /* La lógica de btnGuardarProducto está en stock_view.js */ };
    btnEliminarProductoModal.onclick = () => { /* La lógica de btnEliminarProductoModal está en stock_view.js */ };
}