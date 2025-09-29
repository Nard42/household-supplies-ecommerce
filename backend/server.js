const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - UPDATED CORS CONFIGURATION
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // Allow both frontend URLs
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());


const path = require('path');
const fs = require('fs');

// Add debug middleware for ALL requests
/*app.use((req, res, next) => {
    console.log('📍 Incoming request:', req.method, req.url);
    next();
});
*/
// Add specific debug for image requests

// Serve static files from frontend directory
app.use(express.static('../frontend', {
    maxAge: '1d',
    etag: true
}));

app.get('/api/test-image/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../frontend/images', filename);
    
    const result = {
        filename: filename,
        requestedPath: `/images/${filename}`,
        absolutePath: imagePath,
        exists: fs.existsSync(imagePath),
        directoryContents: []
    };
    
    // List directory contents
    const imagesDir = path.join(__dirname, '../frontend/images');
    if (fs.existsSync(imagesDir)) {
        result.directoryContents = fs.readdirSync(imagesDir);
    }
    
    res.json(result);
});

// Global API caching middleware
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        res.set('Cache-Control', 'public, max-age=300'); // 5 minutes for API cache
    }
    next();
});

// Import routes
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

// Serve frontend pages (optional - since frontend is static)
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '../frontend' });
});

app.get('/admin/products', (req, res) => {
    res.sendFile('admin-products.html', { root: '../frontend' });
});

// Basic API route
app.get('/api', (req, res) => {
    res.json({ 
        message: 'Household Supplies E-Commerce API is running!',
        endpoints: {
            products: '/api/products',
            auth: '/api/auth',
            cart: '/api/cart',
            orders: '/api/orders'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('✅ API endpoints available at /api/*');
    console.log('✅ Frontend served from ../frontend');
    console.log('✅ Images served from ../frontend/images'); // NEW: Confirmation message
});