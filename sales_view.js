// sales_view.js
// Contiene la lógica de Ventas, Historial, cálculos, y renderizado general de la UI.

// --- IMPORTACIONES DE ESTADO Y CORE ---
import { 
    estado, ventasTemporales, totalDinero, historialActualizaciones, historialDiario, 
    metodoPagoActivo, history, historyPointer, stockChangedAlert, saveStateAndBroadcast, 
    saveStateToHistory, editingProduct 
} from './state_manager.js';
import { renderProductos, eliminarProducto, editarProducto } from './stock_view.js';


// --- REFERENCIAS DOM (Para Event Listeners y manipulación) ---
const totalDineroSpan = document.getElementById('totalDinero');
const btnDeshacer = document.getElementById('btnDeshacer');
const btnRehacer = document.getElementById('btnRehacer');
const totalAPagarSpan = document.getElementById('totalAPagar');
const efectivoRecibidoInput = document.getElementById('efectivoRecibido');
const cambioClienteSpan = document.getElementById('cambioCliente');
const areaAnotaciones = document.getElementById('areaAnotaciones');
const ventasDiv = document.getElementById('ventasDiarias');
const btnEfectivo = document.getElementById('btnEfectivo');
const btnTarjeta = document.getElementById('btnTarjeta');
const tabStock = document.getElementById('tabStock');
const tabVentasDiarias = document.getElementById('tabVentasDiarias');
const contentStock = document.getElementById('contentStock');
const contentVentasDiarias = document.getElementById('contentVentasDiarias');
const tabActualizaciones = document.getElementById('tabActualizaciones');
const tabDiario = document.getElementById('tabDiario');
const contenidoHistorial = document.getElementById('contenidoHistorial');
const contenidoHistorialDiario = document.getElementById('contenidoHistorialDiario');
const modalHistorial = document.getElementById('modalHistorial');
const modalAnotacion = document.getElementById('modalAnotacion');
const textoAnotacion = document.getElementById('textoAnotacion');
const btnActualizar = document.getElementById('btnActualizar');
const btnHistorial = document.getElementById('btnHistorial');
const cerrarModalHistorial = document.getElementById('cerrarModalHistorial');
const cerrarModalAnotacion = document.getElementById('cerrarModalAnotacion');
const btnDescargarStock = document.getElementById('btnDescargarStock');

// --- FUNCIONES DE RENDERIZADO GENERAL (EXPORTADAS) ---

export function renderTotalDinero() {
    totalDineroSpan.textContent = totalDinero.toFixed(2);
}

export function updateUndoRedoButtons() {
    btnDeshacer.disabled = historyPointer <= 0;
    btnRehacer.disabled = historyPointer === history.length - 1;
}

export function updatePaymentMethodButtons() {
    if (btnEfectivo && btnTarjeta) {
        if (metodoPagoActivo === 'efectivo') {
            btnEfectivo.classList.add('active');
            btnTarjeta.classList.remove('active');
        } else {
            btnEfectivo.classList.remove('active');
            btnTarjeta.classList.add('active');
        }
    }
}

// --- FUNCIONES DE CÁLCULO ---

export function calcularTotalPagar() {
    let total = 0;
    for (const tipo in ventasTemporales) {
        for (const talla in ventasTemporales[tipo]) {
            const cantidadVendida = ventasTemporales[tipo][talla].vendidos;
            if (estado[tipo]?.[talla]) {
                total += cantidadVendida * estado[tipo][talla].precio;
            }
        }
    }
    totalAPagarSpan.textContent = total.toFixed(2);
}

export function calcularCambio() {
    const totalPagar = parseFloat(totalAPagarSpan.textContent);
    const efectivoRecibido = parseFloat(efectivoRecibidoInput.value) || 0; 
    const cambio = efectivoRecibido - totalPagar;
    cambioClienteSpan.textContent = cambio.toFixed(2);
    cambioClienteSpan.style.color = cambio < 0 ? '#e74c3c' : '#28a745';
}

// --- FUNCIONES DE VISTA Y HISTORY ---

export function mostrarPestanaPrincipal(pestana) {
    document.querySelectorAll('.main-tab-button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.tab-content-main').forEach(content => content.classList.remove('active'));

    if (pestana === 'stock') {
        tabStock.classList.add('active');
        contentStock.classList.add('active');
        renderProductos(); 
    } else if (pestana === 'ventas') {
        tabVentasDiarias.classList.add('active');
        contentVentasDiarias.classList.add('active');
        renderVentasDiarias(); 
    }
}

export function loadStateFromHistory(loadedState) {
    // Modificamos las variables de estado importadas
    estado = JSON.parse(JSON.stringify(loadedState.estado || {}));
    totalDinero = loadedState.totalDinero || 0;
    historialActualizaciones = JSON.parse(JSON.stringify(loadedState.historialActualizaciones || []));
    historialDiario = JSON.parse(JSON.stringify(loadedState.historialDiario || {})); 
    metodoPagoActivo = loadedState.metodoPagoActivo || 'efectivo';
    
    // Reajustes locales
    ventasTemporales = {}; 
    areaAnotaciones.value = '';
    efectivoRecibidoInput.value = ''; 

    // Renderizar y actualizar UI
    renderTotalDinero();
    updateUndoRedoButtons();
    updatePaymentMethodButtons();
    
    if (contentStock.classList.contains('active')) {
        renderProductos();
    } else if (contentVentasDiarias.classList.contains('active')) {
        renderVentasDiarias();
    }

    if (modalHistorial.style.display === 'block') {
        mostrarPestana(tabActualizaciones.classList.contains('active') ? 'actualizaciones' : 'diario');
    }

    calcularTotalPagar();
    calcularCambio();
}

export function mostrarAlertaStock(alertas) {
    let mensaje = "⚠️ ALERTA DE STOCK ⚠️\n\nLos siguientes productos han sido modificados por otro dispositivo y el stock se ha ajustado:\n\n";
    alertas.forEach(a => {
        let linea = `- ${a.tipo} (${a.talla}): `;
        if (a.nuevoStock === 0) {
            linea += `¡STOCK AGOTADO! (Era ${a.stockAnterior}). Tu venta temporal se ha cancelado.`;
        } else if (a.nuevoStock < a.stockAnterior) {
            linea += `Stock ha bajado de ${a.stockAnterior} a ${a.nuevoStock}. Tu venta se ha ajustado a ${a.nuevoStock}.`;
        } else {
            linea += `Stock actualizado a ${a.nuevoStock}.`;
        }
        mensaje += linea + '\n';
    });
    alert(mensaje);
}

export function renderHistorial() {
  contenidoHistorial.innerHTML = '';
  if (!Array.isArray(historialActualizaciones) || historialActualizaciones.length === 0) {
    contenidoHistorial.innerHTML = '<p>No hay ventas registradas en el historial.</p>';
    return;
  }
  historialActualizaciones.forEach(entry => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'historial-entrada';
    entryDiv.innerHTML = `<strong>Fecha/Hora:</strong> ${entry.timestamp}<br>`;

    if (entry.montoTotal !== undefined && entry.montoTotal !== 0) {
        const metodoTexto = entry.metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta';
        if (entry.montoTotal > 0) {
            entryDiv.innerHTML += `<strong>Método de Pago:</strong> ${metodoTexto}<br>`;
            entryDiv.innerHTML += `<strong>Monto Total de Venta:</strong> ${entry.montoTotal.toFixed(2)}€<br>`;
        } else { // Si montoTotal es negativo, es una devolución
            entryDiv.innerHTML += `<strong>Método de Devolución:</strong> ${metodoTexto}<br>`;
            entryDiv.innerHTML += `<strong>Monto Total de Devolución:</strong> ${Math.abs(entry.montoTotal).toFixed(2)}€<br>`;
        }
    }


    if (entry.ventas && Object.keys(entry.ventas).length > 0) {
      entryDiv.innerHTML += '<strong>Ventas de Productos:</strong><ul>';
      for (const tipo in entry.ventas) {
        for (const talla in entry.ventas[tipo]) {
          entryDiv.innerHTML += `<li>${entry.ventas[tipo][talla]} x ${tipo} (${talla})</li>`;
        }
      }
      entryDiv.innerHTML += '</ul>';
    }

    if (entry.devoluciones && Object.keys(entry.devoluciones).length > 0) {
      entryDiv.innerHTML += '<strong>Devoluciones de Productos:</strong><ul>';
      for (const tipo in entry.devoluciones) {
        for (const talla in entry.devoluciones[tipo]) {
          entryDiv.innerHTML += `<li>${entry.devoluciones[tipo][talla]} x ${tipo} (${talla})</li>`;
        }
      }
      entryDiv.innerHTML += '</ul>';
    }

    if (entry.regalos && Object.keys(entry.regalos).length > 0) {
      entryDiv.innerHTML += '<strong>Regalados/Des-regalados:</strong><ul>';
      for (const tipo in entry.regalos) {
        for (const talla in entry.regalos[tipo]) {
          const cantidadRegalo = entry.regalos[tipo][talla];
          if (cantidadRegalo > 0) {
            entryDiv.innerHTML += `<li>Regalo: ${cantidadRegalo} x ${tipo} (${talla})</li>`;
          } else {
            entryDiv.innerHTML += `<li>Des-regalo: ${Math.abs(cantidadRegalo)} x ${tipo} (${talla})</li>`;
          }
        }
      }
      entryDiv.innerHTML += '</ul>';
    }

    if (entry.anotacion) {
        const anotacionBtn = document.createElement('span');
        anotacionBtn.className = 'historial-anotacion';
        anotacionBtn.textContent = 'Ver Anotación 📝';
        anotacionBtn.onclick = () => {
            textoAnotacion.textContent = entry.anotacion;
            modalAnotacion.style.display = 'block';
        };
        entryDiv.appendChild(anotacionBtn);
    }

    contenidoHistorial.appendChild(entryDiv);
  });
}

export function renderHistorialDiario() {
  contenidoHistorialDiario.innerHTML = '';
  const fechas = Object.keys(historialDiario || {}).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/').map(Number);
    const [dayB, monthB, yearB] = b.split('/').map(Number);
    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    return dateB - dateA;
  });

  if (fechas.length === 0) {
    contenidoHistorialDiario.innerHTML = '<p>No hay ventas registradas por día.</p>';
    return;
  }

  fechas.forEach(fecha => {
    const diaData = historialDiario[fecha] || { ventas: {}, regalos: {}, totalDinero: 0, totalEfectivo: 0, totalTarjeta: 0 };
    const diaDiv = document.createElement('div');
    diaDiv.className = 'historial-entrada';
    diaDiv.innerHTML = `<h3>${fecha}</h3>`;

    if ((diaData.ventas && Object.keys(diaData.ventas).length > 0) || (diaData.regalos && Object.keys(diaData.regalos).length > 0)) {
      diaDiv.innerHTML += '<strong>Movimiento de Productos:</strong><ul>';
      for (const tipo in diaData.ventas) {
        for (const talla in diaData.ventas[tipo]) {
            const cantidad = diaData.ventas[tipo][talla];
            if (cantidad > 0) {
                diaDiv.innerHTML += `<li>Venta: ${cantidad} x ${tipo} (${talla})</li>`;
            } else if (cantidad < 0) {
                diaDiv.innerHTML += `<li>Devolución: ${Math.abs(cantidad)} x ${tipo} (${talla})</li>`;
            }
        }
      }
      for (const tipo in diaData.regalos) {
        for (const talla in diaData.regalos[tipo]) {
          const cantidadRegalo = diaData.regalos[tipo][talla];
          if (cantidadRegalo > 0) {
            diaDiv.innerHTML += `<li>Regalo: ${cantidadRegalo} x ${tipo} (${talla})</li>`;
          } else {
            diaDiv.innerHTML += `<li>Des-regalo: ${Math.abs(cantidadRegalo)} x ${tipo} (${talla})</li>`;
          }
        }
      }
      diaDiv.innerHTML += '</ul>';
    }
    
    diaDiv.innerHTML += `<strong>Dinero Total del día:</strong> ${(diaData.totalDinero || 0).toFixed(2)}€<br>`;
    diaDiv.innerHTML += `<strong>Efectivo:</strong> ${(diaData.totalEfectivo || 0).toFixed(2)}€<br>`;
    diaDiv.innerHTML += `<strong>Tarjeta:</strong> ${(diaData.totalTarjeta || 0).toFixed(2)}€`;
    
    contenidoHistorialDiario.appendChild(diaDiv);
  });
}

export function mostrarPestana(pestana) {
  if (pestana === 'actualizaciones') { // Internamente sigue siendo 'actualizaciones' para la lógica
    tabActualizaciones.classList.add('active');
    tabDiario.classList.remove('active');
    contenidoHistorial.style.display = 'block';
    contenidoHistorialDiario.style.display = 'none';
    renderHistorial();
  } else if (pestana === 'diario') {
    tabDiario.classList.add('active');
    tabActualizaciones.classList.remove('active');
    contenidoHistorial.style.display = 'none';
    contenidoHistorialDiario.style.display = 'block';
    renderHistorialDiario();
  }
}

export function setMetodoPago(metodo) {
    metodoPagoActivo = metodo;
    // localStorage.setItem('metodoPagoActivo', metodo); // ELIMINADO: No se usa localStorage
    updatePaymentMethodButtons(); // Actualizar clases CSS
}

export function descargarStockCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Tipo de Producto,Talla,Cantidad Inicial,Cantidad Vendida,Cantidad Regalada,Stock Actual,Precio Unitario (€)\n";

    // Recopilar datos del estado de stock (variables globales)
    for (const tipo in estado) {
        for (const talla in estado[tipo]) {
            const datos = estado[tipo][talla];

            // Escapar comillas dobles y asegurarse de que los datos sean seguros para CSV
            const tipoEscapado = `"${tipo.replace(/"/g, '""')}"`;
            const tallaEscapada = `"${talla.replace(/"/g, '""')}"`;

            const linea = [
                tipoEscapado,
                tallaEscapada,
                datos.inicial,
                datos.vendidos,
                datos.regalados,
                datos.stock,
                datos.precio.toFixed(2)
            ].join(',');

            csvContent += linea + "\n";
        }
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Nombre del archivo: stock_general_DD-MM-AAAA.csv
    link.setAttribute("download", `stock_general_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.csv`);

    // Simular el clic para descargar
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link); 
}
// --- EVENT LISTENERS (Se ejecutan al cargar el módulo) ---

btnActualizar.onclick = () => {
  const updateEntry = {
    timestamp: new Date().toLocaleString('es-ES'),
    ventas: {},
    devoluciones: {},
    regalos: {},
    anotacion: areaAnotaciones.value.trim(),
    metodoPago: '', 
    montoTotal: 0 
  };

  const fechaActual = new Date().toLocaleDateString('es-ES');
  // Asegurarse de que el objeto del día existe y tiene las propiedades de método de pago
  if (!historialDiario[fechaActual]) {
    historialDiario[fechaActual] = { ventas: {}, regalos: {}, totalDinero: 0, totalEfectivo: 0, totalTarjeta: 0 };
  } else {
      // Asegurarse de que las propiedades de método de pago existen si el día ya existía (para compatibilidad con datos antiguos)
      historialDiario[fechaActual].totalEfectivo = historialDiario[fechaActual].totalEfectivo || 0;
      historialDiario[fechaActual].totalTarjeta = historialDiario[fechaActual].totalTarjeta || 0;
  }

  let salesMade = false;
  let moneyChange = 0;

  for (const tipo in ventasTemporales) {
    for (const talla in ventasTemporales[tipo]) {
      const cantidadNeta = ventasTemporales[tipo][talla]?.vendidos || 0;
      const regalados = ventasTemporales[tipo][talla]?.regalados || 0;

      if (estado[tipo]?.[talla]) {
        if (cantidadNeta !== 0 || regalados !== 0) { 
          salesMade = true;

          estado[tipo][talla].stock -= (cantidadNeta + regalados);
          
          estado[tipo][talla].vendidos += cantidadNeta;
          estado[tipo][talla].regalados += regalados; 

          const dineroGenerado = (cantidadNeta * estado[tipo][talla].precio);
          totalDinero += dineroGenerado;
          moneyChange += dineroGenerado;

          if (cantidadNeta > 0) {
            if (!updateEntry.ventas[tipo]) updateEntry.ventas[tipo] = {};
            updateEntry.ventas[tipo][talla] = cantidadNeta;
          } else if (cantidadNeta < 0) {
            if (!updateEntry.devoluciones[tipo]) updateEntry.devoluciones[tipo] = {};
            updateEntry.devoluciones[tipo][talla] = Math.abs(cantidadNeta);
          }
          
          if (regalados !== 0) {
            if (!updateEntry.regalos[tipo]) updateEntry.regalos[tipo] = {};
            updateEntry.regalos[tipo][talla] = regalados;
          }

          if (!historialDiario[fechaActual].ventas[tipo]) historialDiario[fechaActual].ventas[tipo] = {};
          historialDiario[fechaActual].ventas[tipo][talla] = (historialDiario[fechaActual].ventas[tipo][talla] || 0) + cantidadNeta;

          if (!historialDiario[fechaActual].regalos[tipo]) historialDiario[fechaActual].regalos[tipo] = {};
          historialDiario[fechaActual].regalos[tipo][talla] = (historialDiario[fechaActual].regalos[tipo][talla] || 0) + regalados;
        }
      }
    }
  }
  
  if (salesMade || updateEntry.anotacion) {
      if (salesMade) {
        historialDiario[fechaActual].totalDinero += moneyChange;
        // Registrar dinero por método de pago
        if (metodoPagoActivo === 'efectivo') {
            historialDiario[fechaActual].totalEfectivo += moneyChange;
        } else if (metodoPagoActivo === 'tarjeta') {
            historialDiario[fechaActual].totalTarjeta += moneyChange;
        }
        updateEntry.metodoPago = metodoPagoActivo;
        updateEntry.montoTotal = moneyChange;
      }
      historialActualizaciones.unshift(updateEntry);
      saveStateToHistory(); 
  }
  
  ventasTemporales = {};
  areaAnotaciones.value = '';
  efectivoRecibidoInput.value = ''; // Limpiar campo de efectivo
  calcularCambio(); // Recalcular cambio a 0.00
  guardar(); // Usa la nueva función guardar que hace socket.emit
  // Al actualizar, queremos que ambas pestañas se refresquen si están activas o si se cambia a ellas
  renderProductos();
  renderVentasDiarias();
  renderTotalDinero();
};

btnDeshacer.onclick = () => {
    if (historyPointer > 0) {
        historyPointer--;
        const loadedState = history[historyPointer];
        loadStateFromHistory(loadedState); 
        saveStateAndBroadcast(); // Notificar al servidor el estado deshecho
    }
};

btnRehacer.onclick = () => {
    if (historyPointer < history.length - 1) {
        historyPointer++;
        const loadedState = history[historyPointer];
        loadStateFromHistory(loadedState);
        saveStateAndBroadcast(); // Notificar al servidor el estado rehecho
    }
};

efectivoRecibidoInput.oninput = calcularCambio;

btnEfectivo.onclick = () => setMetodoPago('efectivo');
btnTarjeta.onclick = () => setMetodoPago('tarjeta');

tabStock.onclick = () => mostrarPestanaPrincipal('stock');
tabVentasDiarias.onclick = () => mostrarPestanaPrincipal('ventas');

btnHistorial.onclick = () => {
  mostrarPestana('actualizaciones'); // La función sigue llamándose 'actualizaciones' internamente
  modalHistorial.style.display = 'block';
};

tabActualizaciones.onclick = () => mostrarPestana('actualizaciones');
tabDiario.onclick = () => mostrarPestana('diario');

btnDescargarStock.onclick = descargarStockCSV;

// ... [Añadir el resto de Event Listeners y funciones de pago (setMetodoPago, etc.) aquí] ...