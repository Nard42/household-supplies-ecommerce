const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET user's cart
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log('🔍 Fetching cart for user:', userId);
        
        const result = await pool.query(`
            SELECT ci.*, p.name, p.price, p.image_url, p.stock_quantity 
            FROM cart_items ci 
            JOIN products p ON ci.product_id = p.id 
            WHERE ci.user_id = $1
        `, [userId]);
        
        console.log('✅ Cart items found:', result.rows.length);
        
        res.json({
            success: true,
            cart: result.rows
        });
    } catch (error) {
        console.error('❌ Error fetching cart:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add item to cart
router.post('/', async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;
        
        console.log('🛒 Adding to cart:', { userId, productId, quantity });
        
        // Check if item already in cart
        const existingItem = await pool.query(
            'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );
        
        if (existingItem.rows.length > 0) {
            // Update quantity
            await pool.query(
                'UPDATE cart_items SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3',
                [quantity, userId, productId]
            );
            console.log('✅ Updated existing cart item');
        } else {
            // Add new item
            await pool.query(
                'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
                [userId, productId, quantity]
            );
            console.log('✅ Added new cart item');
        }
        
        res.json({
            success: true,
            message: 'Item added to cart'
        });
        
    } catch (error) {
        console.error('❌ Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ✅ CRITICAL: Add UPDATE route for cart items
router.put('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { userId, quantity } = req.body;
        
        console.log('📝 Updating cart quantity:', { userId, productId, quantity });
        
        // If quantity is 0 or less, remove the item
        if (quantity <= 0) {
            await pool.query(
                'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
                [userId, productId]
            );
            console.log('✅ Removed item from cart (quantity <= 0)');
        } else {
            // Update quantity
            const result = await pool.query(
                'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3 RETURNING *',
                [quantity, userId, productId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart item not found'
                });
            }
            console.log('✅ Updated cart item quantity');
        }
        
        res.json({
            success: true,
            message: 'Cart updated successfully'
        });
        
    } catch (error) {
        console.error('❌ Error updating cart:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ✅ CRITICAL: Add DELETE route for cart items
router.delete('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { userId } = req.body;
        
        console.log('🗑️ Removing from cart:', { userId, productId });
        
        const result = await pool.query(
            'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *',
            [userId, productId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }
        
        console.log('✅ Removed item from cart');
        
        res.json({
            success: true,
            message: 'Item removed from cart'
        });
        
    } catch (error) {
        console.error('❌ Error removing from cart:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;