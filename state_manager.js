// state_manager.js
// Contiene el estado centralizado, la conexión Socket.IO y la lógica de carga/guardado.

// --- IMPORTACIONES DE MÓDULOS DE VISTA ---
// Estas funciones se importan para que el state_manager pueda forzar la actualización de la UI
import { 
    renderTotalDinero, updateUndoRedoButtons, updatePaymentMethodButtons, 
    calcularTotalPagar, calcularCambio, mostrarAlertaStock, 
    renderProductos, renderVentasDiarias, loadStateFromHistory 
} from './sales_view.js';

// --- VARIABLES GLOBALES DE ESTADO (EXPORTADAS) ---
export let estado = {}; 
export let ventasTemporales = {}; // Local a la sesión del navegador
export let totalDinero = 0;
export let historialActualizaciones = [];
export let historialDiario = {};
export let metodoPagoActivo = 'efectivo';
export let stockChangedAlert = [];
export let history = []; 
export let historyPointer = -1; 
export let editingProduct = null;
export const socket = io(); 

// --- FUNCIONES CORE DE SINCRONIZACIÓN (EXPORTADAS) ---

export function saveStateAndBroadcast() {
    // 1. Prepara el objeto para la DB (quita ventasTemporales que es local)
    const stateToSave = {
        estado: estado,
        totalDinero: totalDinero,
        historialActualizaciones: historialActualizaciones,
        historialDiario: historialDiario,
        metodoPagoActivo: metodoPagoActivo,
    };
    // 2. Envía la actualización al servidor (que luego guardará en PostgreSQL)
    socket.emit('state:update', stateToSave);
}

// FUNCIÓN CENTRAL: Carga el estado del servidor (loadStateFromGlobal)
export function loadStateFromGlobal(loadedState, isInit = false) { 
    stockChangedAlert = []; // Re-inicializar la alerta al cargar un nuevo estado

    // 1. Pre-chequeo de Stock (Lógica original para evitar conflictos de venta)
    if (!isInit) {
        for (const tipo in ventasTemporales) {
            for (const talla in ventasTemporales[tipo]) {
                const tempVendido = ventasTemporales[tipo][talla].vendidos;
                if (tempVendido > 0 && loadedState.estado[tipo] && loadedState.estado[tipo][talla]) {
                    const stockAnterior = estado[tipo][talla] ? estado[tipo][talla].stock : Infinity;
                    const nuevoStock = loadedState.estado[tipo][talla].stock;

                    if (nuevoStock < stockAnterior || nuevoStock < tempVendido) {
                        stockChangedAlert.push({ tipo, talla, stockAnterior, nuevoStock });
                        if (nuevoStock < tempVendido) {
                            ventasTemporales[tipo][talla].vendidos = Math.max(0, nuevoStock);
                        }
                    }
                }
            }
        }
    }
    
    // 2. Aplicar el Estado del Servidor
    estado = loadedState.estado || {};
    totalDinero = loadedState.totalDinero || 0;
    historialActualizaciones = loadedState.historialActualizaciones || [];
    historialDiario = loadedState.historialDiario || {};
    
    if (isInit) {
        metodoPagoActivo = loadedState.metodoPagoActivo || 'efectivo';
    }

    // 3. Renderizar y actualizar UI (Llama a funciones exportadas desde sales_view)
    renderTotalDinero();
    updateUndoRedoButtons();
    updatePaymentMethodButtons();
    calcularTotalPagar();
    calcularCambio();
    
    if (stockChangedAlert.length > 0) {
        mostrarAlertaStock(stockChangedAlert);
    }
    
    // Renderizado de pestañas activas
    const contentStock = document.getElementById('contentStock');
    const contentVentasDiarias = document.getElementById('contentVentasDiarias');

    if (contentStock?.classList.contains('active')) {
        renderProductos();
    } else if (contentVentasDiarias?.classList.contains('active')) {
        renderVentasDiarias();
    } else {
        renderProductos(); 
    }
}


// --- FUNCIÓN DE HISTORY (LOCAL) ---
export function saveStateToHistory() {
    if (historyPointer < history.length - 1) {
        history = history.slice(0, historyPointer + 1);
    }
    history.push(JSON.parse(JSON.stringify({ estado, totalDinero, historialActualizaciones, historialDiario, metodoPagoActivo })));
    historyPointer = history.length - 1;
    updateUndoRedoButtons();
}