// routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'images/products/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
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

// Get all products for admin
router.get('/products', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, description, price, image_url as image, stock_quantity as stock, category, 
                    created_at, updated_at 
             FROM products 
             ORDER BY created_at DESC`
        );
        
        res.json({
            success: true,
            products: result.rows
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching products' 
        });
    }
});

// Add new product
router.post('/products', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category, stock } = req.body;
        
        // Validation
        if (!name || !description || !price || !category || !stock) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        const imageUrl = req.file ? `/images/products/${req.file.filename}` : null;

        const result = await pool.query(
            `INSERT INTO products (name, description, price, image_url, stock_quantity, category) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, name, description, price, image_url as image, stock_quantity as stock, category`,
            [name, description, parseFloat(price), imageUrl, parseInt(stock), category]
        );

        res.status(201).json({
            success: true,
            message: 'Product added successfully',
            product: result.rows[0]
        });

    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error adding product' 
        });
    }
});

// Update product
router.put('/products/:id', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, category, stock } = req.body;

        // Check if product exists
        const existingProduct = await pool.query(
            'SELECT * FROM products WHERE id = $1', 
            [productId]
        );

        if (existingProduct.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }

        let imageUrl = existingProduct.rows[0].image_url;
        if (req.file) {
            imageUrl = `/images/products/${req.file.filename}`;
        }

        const result = await pool.query(
            `UPDATE products 
             SET name = $1, description = $2, price = $3, image_url = $4, stock_quantity = $5, category = $6, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $7 
             RETURNING id, name, description, price, image_url as image, stock_quantity as stock, category`,
            [name, description, parseFloat(price), imageUrl, parseInt(stock), category, productId]
        );

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating product' 
        });
    }
});

// Delete product
router.delete('/products/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const productId = req.params.id;

        // Check if product exists
        const existingProduct = await pool.query(
            'SELECT * FROM products WHERE id = $1', 
            [productId]
        );

        if (existingProduct.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }

        await pool.query('DELETE FROM products WHERE id = $1', [productId]);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting product' 
        });
    }
});

module.exports = router;