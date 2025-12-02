// db.js (MODIFICADO PARA PRUEBAS LOCALES)

const { Pool } = require('pg');

// La clave de conexión para la nube
const connectionString = process.env.DATABASE_URL;

// Objeto dummy para la conexión de prueba
const dummyQuery = async (text, params) => {
    console.log(`[DB SIMULADA] Consulta SQL recibida: ${text}`);
    
    // Simular que la fila 1 (config) existe y está vacía
    if (text.includes("SELECT data FROM config")) {
        return { 
            rows: [{ data: {
                "ARCHIVO_CENTRAL": {
                    nombre: 'Archivo Central',
                    estado: {}, // Stock INICIAL
                    tiendas: {}, // Resumen de movimientos de cada tienda
                    totalDineroGeneral: 0,
                    isCentral: true
                }
            } }] 
        };
    }
    // Simular éxito para INSERT/UPDATE
    return { rows: [], rowCount: 1 };
};


if (connectionString) {
    // Si la variable de entorno existe, intentamos conectarnos a la base de datos real (Nube)
    const pool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });
    console.log("✅ CONEXIÓN REAL: Módulo PostgreSQL listo.");
    
    module.exports = {
        query: (text, params) => pool.query(text, params),
    };
    
} else {
    // Si la variable de entorno NO existe (estamos en local), usamos la simulación
    console.log("⚠️ MODO SIMULADO: DATABASE_URL no encontrada. Usando datos dummy.");
    
    module.exports = {
        query: dummyQuery, // Usa la función de simulación
    };
}