const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'household_supplies',
    password: process.env.DB_PASSWORD || 'yourpassword',
    port: process.env.DB_PORT || 5432,
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
});

// Test the connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connection test successful');
        
        // Test query to check if products table exists
        const result = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'products'
            );
        `);
        
        console.log('📊 Products table exists:', result.rows[0].exists);
        client.release();
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
    }
};

testConnection();

module.exports = pool;