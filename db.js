// db.js (VERSIÓN FINAL CORREGIDA)

const { Pool } = require('pg');

// La clave de conexión para la nube
const connectionString = process.env.DATABASE_URL;

// [CORRECCIÓN] Objeto dummy para la conexión de prueba (Asegura el formato correcto)
const dummyQuery = async (text, params) => {
    console.log(`[DB SIMULADA] Consulta SQL recibida: ${text}`);
    
    // Simular que la fila 1 (config) existe y tiene el formato JSONB correcto
    if (text.includes("SELECT data FROM config")) {
        return { 
            rows: [{ 
                data: {
                    // Estructura mínima que el servidor espera para el Archivo Central
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
    // Simular éxito para INSERT/UPDATE y otras consultas
    return { rows: [], rowCount: 1 };
};


if (connectionString) {
    // Si la variable de entorno existe (MODO CLOUD/REAL)
    
    // [CORRECCIÓN]: Aseguramos la configuración SSL para las conexiones de Railway
    const pool = new Pool({
        connectionString: connectionString,
        ssl: { 
            rejectUnauthorized: false // Ignora certificados auto-firmados de Railway
        }
    });
    console.log("✅ CONEXIÓN REAL: Módulo PostgreSQL listo.");
    
    module.exports = {
        query: (text, params) => pool.query(text, params),
    };
    
} else {
    // Si la variable de entorno NO existe (MODO LOCAL SIMULADO)
    console.log("⚠️ MODO SIMULADO: DATABASE_URL no encontrada. Usando datos dummy.");
    
    module.exports = {
        query: dummyQuery, // Usa la función de simulación
    };
}