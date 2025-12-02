// server.js
// Servidor Multi-Tienda con Persistencia en PostgreSQL

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const db = require('./db'); 

// --- CONFIGURACIÓN INICIAL ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234"; 

// --- ESTADO CENTRALIZADO ---
let appStates = null; 
const ARCHIVO_CENTRAL_ID = 'ARCHIVO_CENTRAL';
const socketToStoreMap = new Map();

// --- FUNCIONES DE PERSISTENCIA (PostgreSQL) ---

async function loadGlobalState() {
    try {
        // [CORREGIDO] Busca la única fila de configuración (id=1, tabla config)
        const res = await db.query("SELECT data FROM config WHERE id = 1");

        if (res.rows.length === 0 || !res.rows[0].data || !res.rows[0].data[ARCHIVO_CENTRAL_ID]) {
            console.log('⚠️ DB vacía. Inicializando estado global por defecto.');
            
            const initialState = {
                [ARCHIVO_CENTRAL_ID]: {
                    nombre: 'Archivo Central', estado: {}, tiendas: {}, 
                    totalDineroGeneral: 0, isCentral: true
                }
            };
            
            // [CORREGIDO] Usa la columna 'data' y id=1 para el insert inicial
            await db.query(
                'INSERT INTO config(id, data) VALUES(1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data', 
                [initialState]
            );
            return initialState;
        }

        console.log('✅ Estado global cargado desde PostgreSQL.');
        // Devuelve el objeto completo (que incluye ARCHIVO_CENTRAL y otras tiendas)
        return res.rows[0].data;

    } catch (error) {
        console.error('❌ Error CRÍTICO al cargar el estado global de la DB:', error);
        return { [ARCHIVO_CENTRAL_ID]: { nombre: 'Archivo Central (Contingencia)', estado: {}, tiendas: {}, totalDineroGeneral: 0, isCentral: true } };
    }
}

async function saveGlobalState(state) {
    appStates = state; 
    try {
        const jsonState = JSON.stringify(state);
        const query = `
            INSERT INTO config (id, data) 
            VALUES (1, $1)
            ON CONFLICT (id) 
            DO UPDATE SET data = EXCLUDED.data;
        `;
        await db.query(query, [jsonState]);
        console.log("💾 Estado guardado con éxito en PostgreSQL.");
    } catch (error) {
        console.error("❌ ERROR guardando el estado en la DB:", error);
    }
}

// --- FUNCIONES AUXILIARES (Lógica Multi-Tienda) ---
// (Mantenidas para la funcionalidad)
function calculateMasterStock(currentAppStates) { /* ... */ }
function updateCentralArchive(tienda) { /* ... */ }
async function handleStoreCreation(socket, newStoreName) { /* ... */ }
async function handleStoreDeletion(socket, storeId) { /* ... */ }
async function handleStoreUpdate(socket, storeId, data) { /* ... */ }

// --- LÓGICA DE SINCRONIZACIÓN DE SOCKET.IO ---
io.on('connection', async (socket) => {
    // ... (El resto del código Socket.IO, usando las funciones handleStore...)
});

// --- CONFIGURACIÓN DE EXPRESS ---
app.use(express.static(path.join(__dirname))); 
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// --- INICIAR SERVIDOR ---
async function startServer() {
    appStates = await loadGlobalState();
    server.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(`✅ SERVIDOR MULTI-TIENDA CLOUD ACTIVADO`);
        console.log(`🔑 Contraseña Admin: ${ADMIN_PASSWORD}`);
        console.log(`======================================================`);
    });
}
startServer();