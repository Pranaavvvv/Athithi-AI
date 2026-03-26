const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Fix PostgreSQL connection string for asyncpg format vs node-postgres format
let dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.startsWith("postgresql+asyncpg://")) {
    dbUrl = dbUrl.replace("postgresql+asyncpg://", "postgresql://");
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // Required for Render
});

async function runMigrations() {
    try {
        console.log("Connecting to the database...");
        const client = await pool.connect();
        
        const schemaPath = path.join(__dirname, 'ema_schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log("Executing ema_schema.sql...");
        await client.query(sql);
        
        console.log("Migration successful! Tables created and dummy vendors seeded.");
        client.release();
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

runMigrations();
