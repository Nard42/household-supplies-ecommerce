const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Static files caching (1 day cache for CSS, JS, images)
app.use(express.static('../frontend', {
    maxAge: '1d',
    etag: true
}));

// Global API caching middleware
app.use((req, res, next) => {
    // Add cache headers to all API responses
    if (req.path.startsWith('/api/')) {
        res.set('Cache-Control', 'public, max-age=60'); // 1 minute default
    }
    next();
});

// Import routes (USE THIS VERSION FOR NOW)
const productsRouter = require('./routes/products'); // Changed back to simple import
const authRouter = require('./routes/auth');

// Routes
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// Basic route
app.get('/', (req, res) => {
    res.set('Cache-Control', 'no-cache'); // Don't cache homepage
    res.send('Household Supplies E-Commerce API is running!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('✅ Caching enabled: 5-minute product cache, 1-day static files cache');
});