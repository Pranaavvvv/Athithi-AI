require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { Pool } = require("pg");

let connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DB}`;
if (connectionString) {
  connectionString = connectionString.trim().replace("postgresql+asyncpg://", "postgresql://");
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
