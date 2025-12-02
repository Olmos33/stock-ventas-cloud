// server.js
// Servidor Multi-Tienda con Persistencia en PostgreSQL

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const db = require('./db'); // [CRÍTICO] Módulo de conexión a PostgreSQL

// --- CONFIGURACIÓN INICIAL ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite la conexión desde cualquier origen (necesario en la nube)
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
// [SEGURIDAD] Leer la contraseña de una variable de entorno (Railway)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234"; 

// --- ESTADO CENTRALIZADO (Ahora cargado/guardado desde DB) ---
// appStates es la estructura de datos que contiene todas las tiendas y el archivo central.
let appStates = null; 
const ARCHIVO_CENTRAL_ID = 'ARCHIVO_CENTRAL';
const socketToStoreMap = new Map();

// --- FUNCIONES DE PERSISTENCIA (PostgreSQL) ---

/**
 * Carga el estado global de la DB. Si no existe, lo inicializa.
 * @returns {Promise<Object>} El objeto appStates completo.
 */
async function loadGlobalState() {
    try {
        const res = await db.query("SELECT data FROM config WHERE id = 1");
        if (res.rows.length > 0) {
            // Retorna el objeto JSON almacenado en la columna 'data'
            return res.rows[0].data;
        } else {
            // Inicialización si la fila 1 no existe (debe insertarse al crear la tabla)
            // Se asume que la fila 1 fue creada con: INSERT INTO config (id, data) VALUES (1, '{"ARCHIVO_CENTRAL": { ... }}')
            console.log("⚠️ Advertencia: No se encontró estado, inicializando por defecto.");
            return {
                [ARCHIVO_CENTRAL_ID]: {
                    nombre: 'Archivo Central',
                    estado: {}, // Stock INICIAL y Precio maestro
                    tiendas: {}, // Resumen de movimientos de cada tienda
                    totalDineroGeneral: 0,
                    isCentral: true
                }
            };
        }
    } catch (error) {
        console.error("❌ ERROR cargando el estado de la DB:", error);
        return { [ARCHIVO_CENTRAL_ID]: { nombre: 'Archivo Central', estado: {}, tiendas: {}, totalDineroGeneral: 0, isCentral: true } };
    }
}

/**
 * Guarda el estado global completo en la DB.
 * @param {Object} state El objeto appStates a guardar.
 */
async function saveGlobalState(state) {
    appStates = state; // También actualiza la copia en memoria
    try {
        const jsonState = JSON.stringify(state);
        // Usa UPSERT (ON CONFLICT) para INSERTAR si no existe (id=1) o ACTUALIZAR si sí existe.
        const query = `
            INSERT INTO config (id, data) 
            VALUES (1, $1)
            ON CONFLICT (id) 
            DO UPDATE SET data = $1;
        `;
        await db.query(query, [jsonState]);
        console.log("💾 Estado guardado con éxito en PostgreSQL.");
    } catch (error) {
        console.error("❌ ERROR guardando el estado en la DB:", error);
    }
}

// --- FUNCIONES AUXILIARES (MODIFICADAS A ASYNC) ---

/**
 * Calcula el Stock Maestro general para cada producto.
 */
function calculateMasterStock(currentAppStates) {
    const central = currentAppStates[ARCHIVO_CENTRAL_ID];
    const movimientos = {}; // { tipo: { talla: { vendidos: N, regalados: R } } }

    // 1. Sumar movimientos de todas las tiendas
    for (const storeId in central.tiendas) {
        const tienda = central.tiendas[storeId];
        for (const tipo in tienda.movimientos) {
            movimientos[tipo] = movimientos[tipo] || {};
            for (const talla in tienda.movimientos[tipo]) {
                movimientos[tipo][talla] = movimientos[tipo][talla] || { vendidos: 0, regalados: 0 };
                movimientos[tipo][talla].vendidos += tienda.movimientos[tipo][talla].vendidos;
                movimientos[tipo][talla].regalados += tienda.movimientos[tipo][talla].regalados;
            }
        }
    }

    // 2. Aplicar movimientos al stock inicial para obtener el Stock General
    for (const tipo in central.estado) {
        for (const talla in central.estado[tipo]) {
            const maestro = central.estado[tipo][talla];
            const mov = movimientos[tipo]?.[talla] || { vendidos: 0, regalados: 0 };
            
            maestro.stock = maestro.inicial - mov.vendidos - mov.regalados;
        }
    }
}


/**
 * Actualiza el Archivador Central con los datos de una tienda.
 */
function updateCentralArchive(tienda) {
    const central = appStates[ARCHIVO_CENTRAL_ID];
    
    // 1. Actualiza el resumen de la tienda en el Archivador Central
    central.tiendas[tienda.id] = {
        id: tienda.id,
        nombre: tienda.nombre,
        totalDinero: tienda.totalDinero,
        movimientos: tienda.movimientos // Movimientos totales de la tienda
    };

    // 2. Recalcula la facturación general
    central.totalDineroGeneral = Object.values(central.tiendas).reduce((sum, t) => sum + t.totalDinero, 0);

    // 3. Recalcula el Stock General Maestro
    calculateMasterStock(appStates);
}

// --- HANDLERS ASYNC DE SOCKET.IO ---

async function handleStoreCreation(socket, newStoreName) {
    const id = Date.now().toString();
    const newStore = {
        id: id,
        nombre: newStoreName,
        estado: {}, // Stock de la tienda
        totalDinero: 0,
        historialActualizaciones: [],
        historialDiario: {},
        movimientos: {}, // Movimientos totales de esta tienda
        isCentral: false
    };

    const currentAppStates = await loadGlobalState();
    currentAppStates[id] = newStore;
    
    updateCentralArchive(newStore);

    await saveGlobalState(currentAppStates);

    // Notificar al archivador y al nuevo cliente
    socket.emit('store:created', newStore);
    io.to(ARCHIVO_CENTRAL_ID).emit('archive:refresh');
}

async function handleStoreDeletion(socket, storeId) {
    const currentAppStates = await loadGlobalState();

    if (currentAppStates[storeId] && storeId !== ARCHIVO_CENTRAL_ID) {
        const deletedStore = currentAppStates[storeId];
        delete currentAppStates[storeId];

        // 1. Elimina la tienda del resumen central
        delete currentAppStates[ARCHIVO_CENTRAL_ID].tiendas[storeId];
        
        // 2. Recalcula Stock Maestro (los movimientos de la tienda eliminada ya no cuentan)
        calculateMasterStock(currentAppStates);
        
        // 3. Recalcula facturación general
        currentAppStates[ARCHIVO_CENTRAL_ID].totalDineroGeneral = Object.values(currentAppStates[ARCHIVO_CENTRAL_ID].tiendas).reduce((sum, t) => sum + t.totalDinero, 0);

        await saveGlobalState(currentAppStates);

        // Notificar a todos los clientes del archivador que la lista cambió
        io.to(ARCHIVO_CENTRAL_ID).emit('archive:refresh');
        
        // Notificar a todos los clientes que estaban en esa tienda para que vuelvan al archivador
        io.sockets.sockets.forEach(s => {
            if (socketToStoreMap.get(s.id) === storeId) {
                s.emit('store:deleted', deletedStore.nombre);
            }
        });
    }
}

async function handleStoreUpdate(socket, storeId, data) {
    const currentAppStates = await loadGlobalState();

    if (currentAppStates[storeId]) {
        const tienda = currentAppStates[storeId];
        
        // 1. Actualiza el estado de la tienda con los datos recibidos
        Object.assign(tienda, data);

        // 2. Actualiza el resumen en el Archivador Central
        updateCentralArchive(tienda);
        
        await saveGlobalState(currentAppStates);

        // 3. Distribución (Broadcasting)
        // Notifica a los otros clientes de la misma tienda (excepto el que envió el cambio)
        socket.broadcast.to(storeId).emit('state:updated', tienda); 

        // Notifica a los clientes en el ARCHIVO_CENTRAL que algo cambió
        io.to(ARCHIVO_CENTRAL_ID).emit('archive:updated', currentAppStates[ARCHIVO_CENTRAL_ID]);
        
        // El stock maestro global cambió, notificamos a todas las tiendas
        io.sockets.sockets.forEach((s, sId) => {
             const mappedId = socketToStoreMap.get(sId);
             if (mappedId && mappedId !== ARCHIVO_CENTRAL_ID) {
                 s.emit('central:stock_updated', currentAppStates[mappedId]);
             }
        });

        console.log(`Estado de ${tienda.nombre} (${storeId}) actualizado por cliente ${socket.id}`);
    }
}

// --- LÓGICA DE SINCRONIZACIÓN DE SOCKET.IO ---

io.on('connection', async (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);

    // Cargar el estado la primera vez que se conecta un cliente
    const currentAppStates = await loadGlobalState();
    
    // 1. Al conectarse, solo enviamos el estado del archivador para que pueda elegir tienda
    socket.emit('archive:init', currentAppStates);

    socket.on('store:open', async (storeId) => {
        const currentAppStates = await loadGlobalState();
        const stateToEmit = currentAppStates[storeId];

        if (stateToEmit) {
            // Unir el socket a la "sala" de la tienda
            socket.join(storeId);
            socketToStoreMap.set(socket.id, storeId);
            
            // Enviar el estado específico (tienda o central) al cliente
            socket.emit('state:init', stateToEmit);
            console.log(`Cliente ${socket.id} se unió a la sala: ${storeId}`);
        } else {
            socket.emit('error', 'Tienda no encontrada o ID inválido.');
        }
    });

    socket.on('store:create', async (newStoreName) => {
        await handleStoreCreation(socket, newStoreName);
    });

    socket.on('store:delete', async ({ id, password }) => {
        if (password === ADMIN_PASSWORD) {
            await handleStoreDeletion(socket, id);
        } else {
            socket.emit('password:error', 'Contraseña de administrador incorrecta.');
        }
    });
    
    socket.on('store:get_all', async () => {
        const currentAppStates = await loadGlobalState();
        socket.emit('archive:init', currentAppStates);
    });

    socket.on('state:update', async (data) => {
        const storeId = socketToStoreMap.get(socket.id);
        if (storeId) {
            await handleStoreUpdate(socket, storeId, data);
        }
    });

    socket.on('disconnect', () => {
        socketToStoreMap.delete(socket.id);
        console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
});


// --- CONFIGURACIÓN DE EXPRESS ---

// Servir archivos estáticos (index.html, style.css, los nuevos JS)
app.use(express.static(path.join(__dirname))); 

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// --- INICIAR SERVIDOR ---

async function startServer() {
    appStates = await loadGlobalState();

    server.listen(PORT, () => { // Eliminamos '0.0.0.0'
        
        console.log(`\n======================================================`);
        console.log(`✅ SERVIDOR MULTI-TIENDA CLOUD ACTIVADO`);
        console.log(`🔑 Contraseña Admin: ${ADMIN_PASSWORD}`);
        console.log(`\n🌐 URL de la Aplicación: <GENERADA POR RAILWAY>`);
        console.log(`======================================================`);
    });
}
startServer();