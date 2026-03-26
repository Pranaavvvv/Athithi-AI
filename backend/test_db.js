const { Pool } = require("pg");
require("dotenv").config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT count(*) FROM vendors").then(res => { console.log("Vendors count:", res.rows[0].count); pool.end(); }).catch(e => { console.error(e); pool.end(); });
