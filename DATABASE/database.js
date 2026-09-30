const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST || "postgres",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.POSTGRES_DB || "postgres",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "1234"
});

pool.on("error", error => {
    console.error("Ошибка PostgreSQL:", error.message);
});

module.exports = pool;
