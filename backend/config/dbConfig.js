require("dotenv").config()

const {Pool} = require("pg")

const isProduction = process.env.NODE_ENV === "production";

let connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DB}`;
connectionString = connectionString.trim().replace("postgresql+asyncpg://", "postgresql://");

const pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
})

module.exports = pool