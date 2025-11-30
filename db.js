// db.js
// Configuración de conexión para PostgreSQL

const { Pool } = require('pg');

// La librería 'pg' lee automáticamente la variable de entorno DATABASE_URL
// Por lo tanto, no necesitamos pasar ninguna configuración si esa variable existe.
const pool = new Pool();

// Exportamos la función de query para que server.js la use
module.exports = {
  query: (text, params) => pool.query(text, params),
};

// Asegúrate de instalar la dependencia en tu package.json:
// npm install pg