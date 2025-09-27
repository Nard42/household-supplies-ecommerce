const express = require('express');
const router = express.Router();
const pool = require('../config/database'); // Fixed path - changed from '../config/database'
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../images/products/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

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
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
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

// =============================================================================
// ADMIN PROTECTED ROUTES (Temporarily removing auth for testing)
// =============================================================================

// POST - Create new product with image upload


router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stock_quantity, category, image_url } = req.body; // ← ADD image_url here
        
       // console.log('🔍 [SERVER] Request body:', req.body);
       // console.log('🔍 [SERVER] Uploaded file:', req.file);
        
        // Validation
        if (!name || !price || !category) {
            // Clean up uploaded file if validation fails
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                success: false,
                error: 'Name, price, and category are required' 
            });
        }
        
        // ✅ FIX: Handle both file upload AND URL string
        let finalImageUrl = null;
        
        if (req.file) {
            // Case 1: File was uploaded
            finalImageUrl = `/images/products/${req.file.filename}`;
        } else if (image_url) {
            // Case 2: URL was provided in the form
            finalImageUrl = image_url;
        }
        // Case 3: No image provided (finalImageUrl remains null)
        
      //  console.log('🔍 [SERVER] Final image URL:', finalImageUrl);

        const result = await pool.query(
            `INSERT INTO products (name, description, price, image_url, stock_quantity, category) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [name, description, parseFloat(price), finalImageUrl, parseInt(stock_quantity || 0), category]
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
        // Clean up uploaded file if error occurs
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error creating product:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});



// PUT - Update product with image upload
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
       
        
        
        const { id } = req.params;
        const { name, description, price, stock_quantity, category, image_url } = req.body;
        
        // Check if product exists
        console.log('🔍 [SERVER UPDATE] Checking if product exists...');
        const existingProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        console.log('🔍 [SERVER UPDATE] Existing product found:', existingProduct.rows.length > 0);
        
        if (existingProduct.rows.length === 0) {
            console.log('❌ [SERVER UPDATE] Product not found in database');
            return res.status(404).json({ 
                success: false,
                error: 'Product not found' 
            });
        }
    
        
        let finalImageUrl = existingProduct.rows[0].image_url;
        
        // Handle image update
        if (image_url) {
            console.log('🔍 [SERVER UPDATE] Updating image from:', existingProduct.rows[0].image_url, 'to:', image_url);
            finalImageUrl = image_url;
        } else {
            console.log('🔍 [SERVER UPDATE] Keeping existing image:', finalImageUrl);
        }
        
        console.log('🔍 [SERVER UPDATE] Final image URL to save:', finalImageUrl);

        // Execute the SQL UPDATE with detailed logging
       // console.log('🔍 [SERVER UPDATE] Executing SQL UPDATE...');
       // console.log('🔍 [SERVER UPDATE] SQL: UPDATE products SET name=$1, description=$2, price=$3, image_url=$4, stock_quantity=$5, category=$6 WHERE id=$7');
        //console.log('🔍 [SERVER UPDATE] Parameters:', [name, description, price, finalImageUrl, stock_quantity, category, id]);
        
        const result = await pool.query(
            `UPDATE products 
             SET name=$1, description=$2, price=$3, image_url=$4, stock_quantity=$5, category=$6, updated_at=CURRENT_TIMESTAMP 
             WHERE id=$7 
             RETURNING *`,
            [name, description, parseFloat(price), finalImageUrl, parseInt(stock_quantity || 0), category, id]
        );
        
       // console.log('🔍 [SERVER UPDATE] SQL UPDATE completed');
       // console.log('🔍 [SERVER UPDATE] Rows affected:', result.rowCount);
       // console.log('🔍 [SERVER UPDATE] Updated product data:', result.rows[0]);
        
        if (result.rowCount === 0) {
            console.log('❌ [SERVER UPDATE] UPDATE affected 0 rows - product may not exist');
        }
        
        // Clear cache
        cache.del(CACHE_KEYS.ALL_PRODUCTS);
        cache.del(CACHE_KEYS.PRODUCT_DETAIL(id));
        console.log('🧹 Cleared cache for product', id);
        
        res.json({
            success: true,
            message: 'Product updated successfully',
            product: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ [SERVER UPDATE] Database error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// DELETE - Delete product
router.delete('/:id', async (req, res) => {
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
        
        // Delete associated image file if it exists
        const imagePath = existingProduct.rows[0].image_url ? 
            path.join(uploadDir, path.basename(existingProduct.rows[0].image_url)) : null;
        
        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`🗑️ Deleted product image: ${imagePath}`);
        }
        
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

// Clear cache endpoint (for admin use when products are updated)
router.delete('/cache/clear', (req, res) => {
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
router.get('/cache/stats', (req, res) => {
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

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 5MB.'
            });
        }
    }
    
    if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({
            success: false,
            error: 'Only image files are allowed!'
        });
    }
    
    res.status(500).json({
        success: false,
        error: error.message
    });
});

module.exports = router;