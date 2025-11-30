// app.js

import { socket, loadStateFromGlobal } from './state_manager.js';
import { renderProductos } from './stock_view.js';


// --- MANEJADORES DE SOCKET.IO ---
socket.on('state:init', (initialState) => {
    console.log("Estado inicial recibido de la DB.");
    // Carga el estado inicial y llama a los renderizados iniciales
    loadStateFromGlobal(initialState, true);
    
    // El state_manager contiene ahora la lógica de renderizado para simplificar la inicialización:
    // renderTotalDinero(); 
    // updateUndoRedoButtons();
    // ...
});

socket.on('state:updated', (updatedState) => {
    console.log("Actualización recibida de otro cliente.");
    // Sincroniza los cambios hechos por otro usuario.
    loadStateFromGlobal(updatedState, false);
});


// --- INICIALIZACIÓN DEL DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Mostrar la pestaña de stock por defecto al cargar
    mostrarPestanaPrincipal('stock'); 
});

// Nota: Las funciones de renderizado (renderProductos, renderTotalDinero, etc.)
// se encuentran ahora dentro de sales_view.js y stock_view.js y se llaman desde loadStateFromGlobal.