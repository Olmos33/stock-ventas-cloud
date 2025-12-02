// db.js (MODIFICADO para asegurar que lee DATABASE_URL)

const { Pool } = require('pg');

// Railway inyecta la variable de entorno DATABASE_URL (privada)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    // Esto solo debería pasar si la variable no se inyecta en el servicio
    console.error("❌ ERROR CRÍTICO: DATABASE_URL no encontrada en el entorno.");
}

// Pasamos la cadena de conexión completa al constructor del Pool.
// Esto sobrescribe la búsqueda de variables separadas (PGHOST, etc.).
const pool = new Pool({
    connectionString: connectionString,
    // CRÍTICO: Las conexiones Cloud a menudo requieren SSL
    ssl: { 
        rejectUnauthorized: false 
    }
});

console.log("Módulo de conexión a PostgreSQL listo.");

module.exports = {
  query: (text, params) => pool.query(text, params),
};