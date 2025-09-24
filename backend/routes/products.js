const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const NodeCache = require('node-cache');
const { authenticate, requireAdmin } = require('../middleware/auth'); // Updated import

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
router.delete('/cache', authenticate, requireAdmin, (req, res) => { // Added authentication
    try {
        const deletedKeys = cache.keys().length;
        cache.flushAll();
        console.log(`🧹 Cache cleared - ${deletedKeys} keys removed`);
        res.json({ 
            success: true,
            message: `Cache cleared successfully - ${deletedKeys} keys removed` 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cache statistics (for monitoring)
router.get('/cache/stats', authenticate, requireAdmin, (req, res) => { // Added authentication
    try {
        const stats = cache.getStats();
        const keys = cache.keys();
        res.json({
            success: true,
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

// =============================================================================
// ADMIN PROTECTED ROUTES (UPDATED WITH requireAdmin)
// =============================================================================

// POST - Create new product (Protected - Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { name, description, price, image_url, stock_quantity, category } = req.body;
        
        // Validation
        if (!name || !price) {
            return res.status(400).json({ 
                success: false,
                error: 'Name and price are required' 
            });
        }
        
        const result = await pool.query(
            'INSERT INTO products (name, description, price, image_url, stock_quantity, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, parseFloat(price), image_url, parseInt(stock_quantity) || 0, category]
        );
        
        // Clear cache since products changed
        cache.del(CACHE_KEYS.ALL_PRODUCTS);
        console.log('🧹 Cleared products cache after creating new product');
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// PUT - Update product (Protected - Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, image_url, stock_quantity, category } = req.body;
        
        // Check if product exists
        const existingProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (existingProduct.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Product not found' 
            });
        }
        
        const result = await pool.query(
            `UPDATE products 
             SET name=$1, description=$2, price=$3, image_url=$4, stock_quantity=$5, category=$6, updated_at=CURRENT_TIMESTAMP 
             WHERE id=$7 
             RETURNING *`,
            [name, description, parseFloat(price), image_url, parseInt(stock_quantity), category, id]
        );
        
        // Clear relevant cache entries
        cache.del(CACHE_KEYS.ALL_PRODUCTS);
        cache.del(CACHE_KEYS.PRODUCT_DETAIL(id));
        console.log(`🧹 Cleared cache for product ${id} and all products`);
        
        res.json({
            success: true,
            message: 'Product updated successfully',
            product: result.rows[0]
        });
        
    } catch (error) {
        console.error(`Error updating product ${id}:`, error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// DELETE - Delete product (Protected - Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if product exists
        const existingProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (existingProduct.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Product not found' 
            });
        }
        
        const result = await pool.query('DELETE FROM products WHERE id=$1 RETURNING *', [id]);
        
        // Clear relevant cache entries
        cache.del(CACHE_KEYS.ALL_PRODUCTS);
        cache.del(CACHE_KEYS.PRODUCT_DETAIL(id));
        console.log(`🧹 Cleared cache after deleting product ${id}`);
        
        res.json({
            success: true,
            message: 'Product deleted successfully',
            product: result.rows[0]
        });
        
    } catch (error) {
        console.error(`Error deleting product ${id}:`, error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;