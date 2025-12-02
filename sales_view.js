
// --- IMPORTACIONES DE ESTADO Y CORE ---
import { 
    estado, ventasTemporales, totalDinero, historialActualizaciones, historialDiario, 
    metodoPagoActivo, history, historyPointer, stockChangedAlert, saveStateAndBroadcast, 
    saveStateToHistory, editingProduct 
} from './state_manager.js';

import { renderProductos } from './stock_view.js'; // Importamos la función de stock (correcta)


// --- FUNCIONES CORE DE UI/RENDERIZADO (EXPORTADAS) ---

export function renderTotalDinero() {
    document.getElementById('totalDinero').textContent = totalDinero.toFixed(2);
}

export function updateUndoRedoButtons() {
    document.getElementById('btnDeshacer').disabled = historyPointer <= 0;
    document.getElementById('btnRehacer').disabled = historyPointer === history.length - 1;
}

export function updatePaymentMethodButtons() {
    const btnEfectivo = document.getElementById('btnEfectivo');
    const btnTarjeta = document.getElementById('btnTarjeta');
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

// --- LÓGICA DE CÁLCULO Y VENTA ---

export function calcularTotalPagar() {
    const totalAPagarSpan = document.getElementById('totalAPagar');
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
    return total; // Retorna el total para calcularCambio
}

export function calcularCambio() {
    const totalAPagarSpan = document.getElementById('totalAPagar');
    const efectivoRecibidoInput = document.getElementById('efectivoRecibido');
    const cambioClienteSpan = document.getElementById('cambioCliente');

    const totalPagar = parseFloat(totalAPagarSpan.textContent);
    const efectivoRecibido = parseFloat(efectivoRecibidoInput.value) || 0; 
    const cambio = efectivoRecibido - totalPagar;

    cambioClienteSpan.textContent = cambio.toFixed(2);
    cambioClienteSpan.style.color = cambio < 0 ? '#e74c3c' : '#28a745';
}

export function setMetodoPago(metodo) {
    metodoPagoActivo = metodo;
    updatePaymentMethodButtons();
}

function guardar() {
    // Alias usado por el código antiguo que ahora llama al core de sincronización
    saveStateAndBroadcast();
}

// --- FUNCIÓN CENTRAL DE RENDERIZADO DE VENTAS ---

export function renderVentasDiarias() {
    const ventasDiv = document.getElementById('ventasDiarias');
    const totalAPagarSpan = document.getElementById('totalAPagar');
    const cambioClienteSpan = document.getElementById('cambioCliente');
    
    ventasDiv.innerHTML = '';
    for (const tipo in estado) {
        const productoDiv = document.createElement('div');
        productoDiv.className = 'venta-diaria';
        const titulo = document.createElement('h3');
        titulo.textContent = tipo;
        productoDiv.appendChild(titulo);
        
        for (const talla in estado[tipo]) {
            const datosStock = estado[tipo][talla];
            if (!ventasTemporales[tipo]) ventasTemporales[tipo] = {};
            if (!ventasTemporales[tipo][talla]) ventasTemporales[tipo][talla] = { vendidos: 0, regalados: 0 };

            const info = document.createElement('div');
            info.className = 'venta-info';
            info.innerHTML = `<strong>${talla}</strong>`;

            // Vendidos (Contadores)
            const contVend = document.createElement('div');
            contVend.className = 'contador';
            const menosV = document.createElement('button');
            menosV.textContent = '-';
            menosV.onclick = () => {
                if ((datosStock.vendidos + ventasTemporales[tipo][talla].vendidos) > 0) {
                    ventasTemporales[tipo][talla].vendidos--;
                    renderVentasDiarias();
                } else if (ventasTemporales[tipo][talla].vendidos > 0) {
                    ventasTemporales[tipo][talla].vendidos--;
                    renderVentasDiarias();
                }
            };
            const masV = document.createElement('button');
            masV.textContent = '+';
            masV.onclick = () => {
                const stockEfectivo = datosStock.stock - (ventasTemporales[tipo][talla].vendidos + ventasTemporales[tipo][talla].regalados);

                if (stockEfectivo > 0 || ventasTemporales[tipo][talla].vendidos < 0) {
                    ventasTemporales[tipo][talla].vendidos++;
                    renderVentasDiarias();
                }
            };
            const valV = document.createElement('span');
            valV.textContent = ventasTemporales[tipo][talla].vendidos;
            contVend.append(menosV, valV, masV);

            // Regalados (Contadores)
            const contReg = document.createElement('div');
            contReg.className = 'contador';
            const menosR = document.createElement('button');
            menosR.textContent = '-';
            menosR.onclick = () => {
                if ((datosStock.regalados + ventasTemporales[tipo][talla].regalados) > 0) {
                    ventasTemporales[tipo][talla].regalados--;
                    renderVentasDiarias();
                } else if (ventasTemporales[tipo][talla].regalados > 0) {
                    ventasTemporales[tipo][talla].regalados--;
                    renderVentasDiarias();
                }
            };
            const masR = document.createElement('button');
            masR.textContent = '+';
            masR.onclick = () => {
                const stockEfectivo = datosStock.stock - (ventasTemporales[tipo][talla].vendidos + ventasTemporales[tipo][talla].regalados);
                
                if (stockEfectivo > 0 || ventasTemporales[tipo][talla].regalados < 0) {
                    ventasTemporales[tipo][talla].regalados++;
                    renderVentasDiarias();
                }
            };
            const valR = document.createElement('span');
            valR.textContent = ventasTemporales[tipo][talla].regalados;
            contReg.append(menosR, valR, masR);

            info.append(contVend, contReg);
            productoDiv.appendChild(info);
        }
        ventasDiv.appendChild(productoDiv);
    }
    calcularTotalPagar();
    calcularCambio();
}


// --- LÓGICA DE ACTUALIZACIÓN DE VENTAS (btnActualizar.onclick) ---
// La lógica se envuelve en una función para que pueda ser llamada por ui_init.js
export function handleUpdateClick() {
    const areaAnotaciones = document.getElementById('areaAnotaciones');
    const efectivoRecibidoInput = document.getElementById('efectivoRecibido');

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
    if (!historialDiario[fechaActual]) {
        historialDiario[fechaActual] = { ventas: {}, regalos: {}, totalDinero: 0, totalEfectivo: 0, totalTarjeta: 0 };
    } else {
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
    efectivoRecibidoInput.value = '';
    calcularCambio();
    guardar(); // Usa la función guardar que hace socket.emit
    
    renderProductos();
    renderVentasDiarias();
    renderTotalDinero();
};


// --- FUNCIONES DE HISTORIAL Y UTILIDAD ---

export function loadStateFromHistory(loadedState) {
    const areaAnotaciones = document.getElementById('areaAnotaciones');
    const efectivoRecibidoInput = document.getElementById('efectivoRecibido');

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
    
    // (Renderizado de pestañas activas)
    const contentStock = document.getElementById('contentStock');
    const contentVentasDiarias = document.getElementById('contentVentasDiarias');
    const modalHistorial = document.getElementById('modalHistorial');
    const tabActualizaciones = document.getElementById('tabActualizaciones');

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

export function mostrarPestana(pestana) {
    // Referencias DOM (asumimos que ya han sido asignadas en ui_init.js)
    const tabActualizaciones = document.getElementById('tabActualizaciones');
    const tabDiario = document.getElementById('tabDiario');
    const contenidoHistorial = document.getElementById('contenidoHistorial');
    const contenidoHistorialDiario = document.getElementById('contenidoHistorialDiario');

    if (pestana === 'actualizaciones') {
        // Activar pestaña 'Ventas'
        tabActualizaciones.classList.add('active');
        tabDiario.classList.remove('active');
        contenidoHistorial.style.display = 'block';
        contenidoHistorialDiario.style.display = 'none';
        renderHistorial(); // Renderiza el historial de transacciones individuales
    } else if (pestana === 'diario') {
        // Activar pestaña 'Historial Diario'
        tabDiario.classList.add('active');
        tabActualizaciones.classList.remove('active');
        contenidoHistorial.style.display = 'none';
        contenidoHistorialDiario.style.display = 'block';
        renderHistorialDiario(); // Renderiza el resumen de ventas por día
    }
}

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