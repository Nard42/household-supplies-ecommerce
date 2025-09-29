const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Create new order
router.post('/', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { userId, items, totalAmount, shippingAddress, paymentMethod } = req.body;
        
        console.log('🛒 Creating order for user:', userId);
        console.log('📦 Order items:', items);
        
        // 1. Create order
        const orderResult = await client.query(
            `INSERT INTO orders (user_id, total_amount, shipping_address, payment_method) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [userId, totalAmount, shippingAddress, paymentMethod]
        );
        
        const orderId = orderResult.rows[0].id;
        console.log('✅ Order created with ID:', orderId);
        
        // 2. Add order items and update product stock
        for (const item of items) {
            console.log('📝 Processing item:', item);
            
            // Add order item
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price) 
                 VALUES ($1, $2, $3, $4)`,
                [orderId, item.productId, item.quantity, item.price]
            );
            
            // Update product stock - THIS IS CRITICAL
            const updateResult = await client.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 RETURNING stock_quantity',
                [item.quantity, item.productId]
            );
            
            console.log('✅ Updated stock for product', item.productId, 'new stock:', updateResult.rows[0].stock_quantity);
            
            // Check if stock is sufficient
            const productResult = await client.query(
                'SELECT stock_quantity FROM products WHERE id = $1',
                [item.productId]
            );
            
            if (productResult.rows[0].stock_quantity < 0) {
                throw new Error(`Insufficient stock for product ${item.productId}`);
            }
        }
        
        // 3. Clear user's cart
        const deleteResult = await client.query(
            'DELETE FROM cart_items WHERE user_id = $1 RETURNING *',
            [userId]
        );
        
        console.log('✅ Cleared cart items:', deleteResult.rowCount);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            orderId: orderId,
            message: 'Order placed successfully'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        client.release();
    }
});

// Get user's orders
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const ordersResult = await pool.query(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        
        res.json({
            success: true,
            orders: ordersResult.rows
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get order details
router.get('/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const orderResult = await pool.query(
            `SELECT o.*, oi.*, p.name, p.image_url 
             FROM orders o 
             JOIN order_items oi ON o.id = oi.order_id 
             JOIN products p ON oi.product_id = p.id 
             WHERE o.id = $1`,
            [orderId]
        );
        
        res.json({
            success: true,
            order: orderResult.rows
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;