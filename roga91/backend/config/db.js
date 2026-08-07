const { Client } = require('pg');
const path = require('path');

// Load environment variables from ../.env
require('dotenv').config({ path: path.resolve(__dirname, '/root/regan/roga91/.env') });
console.log('Loaded DB config:', {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

const db = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

db.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch((err) => console.error('❌ Database Connection error:', err));

module.exports = db;
