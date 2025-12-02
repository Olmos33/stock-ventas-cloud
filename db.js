// db.js (MODIFICADO para forzar SSL)

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERROR CRÍTICO: DATABASE_URL no encontrada en el entorno.");
}

// Pasamos la cadena de conexión completa + configuración SSL requerida por Railway
const pool = new Pool({
    connectionString: connectionString,
    // [CRÍTICO]: Este objeto es necesario para las conexiones cifradas en la nube.
    ssl: { 
        rejectUnauthorized: false 
    }
});

console.log("Módulo de conexión a PostgreSQL listo con SSL forzado.");

module.exports = {
  query: (text, params) => pool.query(text, params),
};