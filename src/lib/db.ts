/**
 * src/lib/db.ts
 *
 * Pool de conexiones MySQL.
 * Usa el patrón singleton para evitar crear múltiples pools
 * en desarrollo con Next.js (hot-reload).
 */
import mysql from "mysql2/promise";

declare global {
  // Evita re-crear el pool en cada hot-reload de Next.js
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host:     process.env.DB_HOST     ?? "localhost",
    port:     Number(process.env.DB_PORT ?? 3306),
    user:     process.env.DB_USER     ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME     ?? "carpinteria",
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    timezone:           "local",
  });
}

const pool: mysql.Pool =
  process.env.NODE_ENV === "production"
    ? createPool()
    : (globalThis._mysqlPool ??= createPool());

export default pool;