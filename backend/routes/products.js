const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const NodeCache = require('node-cache');

// Initialize cache with 5-minute TTL (time to live)
const cache = new NodeCache({ 
    stdTTL: 300, // 5 minutes
    checkperiod: 60 // Check for expired keys every 60 seconds
});

// Cache keys
const CACHE_KEYS = {
    ALL_PRODUCTS: 'all-products',
    PRODUCT_DETAIL: (id) => `product-${id}`
};

// GET all products with caching
router.get('/', async (req, res) => {
    try {
        const cacheKey = CACHE_KEYS.ALL_PRODUCTS;
        
        // Try to get from cache first
        let products = cache.get(cacheKey);
        
        if (products) {
            console.log('✅ Cache HIT for all products');
            
            // Set cache headers for client-side caching
            res.set('Cache-Control', 'public, max-age=300');
            res.set('X-Cache', 'HIT');
            
            return res.json(products);
        }
        
        console.log('❌ Cache MISS for all products - querying database');
        
        // If not in cache, query database
        const result = await pool.query('SELECT * FROM products ORDER BY id');
        products = result.rows;
        
        // Store in cache for future requests
        cache.set(cacheKey, products);
        
        // Set cache headers
        res.set('Cache-Control', 'public, max-age=300');
        res.set('X-Cache', 'MISS');
        
        res.json(products);
        
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET single product with caching
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = CACHE_KEYS.PRODUCT_DETAIL(id);
        
        // Try to get from cache first
        let product = cache.get(cacheKey);
        
        if (product) {
            console.log(`✅ Cache HIT for product ${id}`);
            
            res.set('Cache-Control', 'public, max-age=300');
            res.set('X-Cache', 'HIT');
            
            return res.json(product);
        }
        
        console.log(`❌ Cache MISS for product ${id} - querying database`);
        
        // If not in cache, query database
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        product = result.rows[0];
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Store in cache for future requests
        cache.set(cacheKey, product);
        
        res.set('Cache-Control', 'public, max-age=300');
        res.set('X-Cache', 'MISS');
        
        res.json(product);
        
    } catch (error) {
        console.error(`Error fetching product ${req.params.id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Clear cache endpoint (for admin use when products are updated)
router.delete('/cache', (req, res) => {
    try {
        const deletedKeys = cache.keys().length;
        cache.flushAll();
        console.log(`🧹 Cache cleared - ${deletedKeys} keys removed`);
        res.json({ message: `Cache cleared successfully - ${deletedKeys} keys removed` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cache statistics (for monitoring)
router.get('/cache/stats', (req, res) => {
    try {
        const stats = cache.getStats();
        const keys = cache.keys();
        res.json({
            keys: keys.length,
            hits: stats.hits,
            misses: stats.misses,
            keyCount: stats.keys,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;