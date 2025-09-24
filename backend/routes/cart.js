const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, requireCustomer } = require('../middleware/auth');

// GET cart items for logged-in customer
router.get('/', authenticate, requireCustomer, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT ci.*, p.name, p.price, p.image_url, p.stock_quantity 
             FROM cart_items ci 
             JOIN products p ON ci.product_id = p.id 
             WHERE ci.user_id = $1 
             ORDER BY ci.created_at DESC`,
            [userId]
        );

        // Calculate total
        const total = result.rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        res.json({
            success: true,
            cartItems: result.rows,
            total: total.toFixed(2),
            itemCount: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ADD item to cart
router.post('/add', authenticate, requireCustomer, async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id, quantity = 1 } = req.body;

        if (!product_id) {
            return res.status(400).json({ success: false, error: 'Product ID is required' });
        }

        // Check if product exists and has stock
        const productResult = await pool.query(
            'SELECT * FROM products WHERE id = $1 AND stock_quantity > 0',
            [product_id]
        );

        if (productResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found or out of stock' });
        }

        const product = productResult.rows[0];

        // Check if item already in cart
        const existingCartItem = await pool.query(
            'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
            [userId, product_id]
        );

        if (existingCartItem.rows.length > 0) {
            // Update quantity if already in cart
            const newQuantity = existingCartItem.rows[0].quantity + quantity;
            
            await pool.query(
                'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
                [newQuantity, userId, product_id]
            );

            res.json({
                success: true,
                message: 'Cart item quantity updated',
                cartItem: { ...existingCartItem.rows[0], quantity: newQuantity }
            });
        } else {
            // Add new item to cart
            const result = await pool.query(
                'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
                [userId, product_id, quantity]
            );

            res.status(201).json({
                success: true,
                message: 'Item added to cart',
                cartItem: result.rows[0]
            });
        }

    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// UPDATE cart item quantity
router.put('/update/:productId', authenticate, requireCustomer, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ success: false, error: 'Valid quantity is required' });
        }

        // Check product stock
        const productResult = await pool.query(
            'SELECT stock_quantity FROM products WHERE id = $1',
            [productId]
        );

        if (productResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        if (quantity > productResult.rows[0].stock_quantity) {
            return res.status(400).json({ 
                success: false, 
                error: `Only ${productResult.rows[0].stock_quantity} items available in stock` 
            });
        }

        const result = await pool.query(
            'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3 RETURNING *',
            [quantity, userId, productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cart item not found' });
        }

        res.json({
            success: true,
            message: 'Cart item updated',
            cartItem: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// REMOVE item from cart
router.delete('/remove/:productId', authenticate, requireCustomer, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        const result = await pool.query(
            'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *',
            [userId, productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cart item not found' });
        }

        res.json({
            success: true,
            message: 'Item removed from cart',
            cartItem: result.rows[0]
        });

    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// CLEAR entire cart
router.delete('/clear', authenticate, requireCustomer, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            'DELETE FROM cart_items WHERE user_id = $1 RETURNING *',
            [userId]
        );

        res.json({
            success: true,
            message: 'Cart cleared successfully',
            removedItems: result.rows.length
        });

    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;