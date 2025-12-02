// db.js (VERSIÓN FINAL CORREGIDA)

const { Pool } = require('pg');

// La clave de conexión para la nube
const connectionString = process.env.DATABASE_URL;

// Objeto dummy para la conexión de prueba (Simulación Local)
const dummyQuery = async (text, params) => {
    console.log(`[DB SIMULADA] Consulta SQL recibida: ${text}`);
    
    if (text.includes("SELECT data FROM config")) {
        // Simular que la fila 1 (config) existe y tiene el formato JSONB correcto
        return { 
            rows: [{ 
                data: {
                    "ARCHIVO_CENTRAL": {
                        nombre: 'Archivo Central',
                        estado: {}, 
                        tiendas: {}, 
                        totalDineroGeneral: 0,
                        isCentral: true
                    }
                }
            }] 
        };
    }
    // Simular éxito para INSERT/UPDATE
    return { rows: [], rowCount: 1 };
};


if (connectionString) {
    // MODO CLOUD/REAL
    const pool = new Pool({
        connectionString: connectionString,
        ssl: { 
            rejectUnauthorized: false // CRÍTICO: Necesario para conexiones a PostgreSQL en la nube
        }
    });
    console.log("✅ CONEXIÓN REAL: Módulo PostgreSQL listo.");
    
    module.exports = {
        query: (text, params) => pool.query(text, params),
    };
    
} else {
    // MODO LOCAL SIMULADO
    console.log("⚠️ MODO SIMULADO: DATABASE_URL no encontrada. Usando datos dummy.");
    
    module.exports = {
        query: dummyQuery,
    };
}