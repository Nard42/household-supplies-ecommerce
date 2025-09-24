const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, requireCustomer } = require('../middleware/auth');

// GET customer's orders
router.get('/', authenticate, requireCustomer, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT o.*, 
                    json_agg(
                        json_build_object(
                            'id', oi.id,
                            'product_id', oi.product_id,
                            'product_name', p.name,
                            'quantity', oi.quantity,
                            'price', oi.price,
                            'image_url', p.image_url
                        )
                    ) as items
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE o.user_id = $1
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            orders: result.rows
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single order details
router.get('/:orderId', authenticate, requireCustomer, async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        const result = await pool.query(
            `SELECT o.*, 
                    json_agg(
                        json_build_object(
                            'id', oi.id,
                            'product_id', oi.product_id,
                            'product_name', p.name,
                            'description', p.description,
                            'quantity', oi.quantity,
                            'price', oi.price,
                            'image_url', p.image_url
                        )
                    ) as items
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE o.id = $1 AND o.user_id = $2
             GROUP BY o.id`,
            [orderId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        res.json({
            success: true,
            order: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// CREATE new order from cart
router.post('/create', authenticate, requireCustomer, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const userId = req.user.id;
        const { shipping_address, payment_method } = req.body;

        // Get cart items
        const cartItems = await client.query(
            `SELECT ci.*, p.name, p.price, p.stock_quantity 
             FROM cart_items ci 
             JOIN products p ON ci.product_id = p.id 
             WHERE ci.user_id = $1`,
            [userId]
        );

        if (cartItems.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Cart is empty' });
        }

        // Check stock availability
        for (const item of cartItems.rows) {
            if (item.quantity > item.stock_quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false, 
                    error: `Not enough stock for ${item.name}. Only ${item.stock_quantity} available.` 
                });
            }
        }

        // Calculate total
        const total = cartItems.rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create order
        const orderResult = await client.query(
            `INSERT INTO orders (user_id, total_amount, shipping_address, payment_method) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [userId, total, shipping_address, payment_method]
        );

        const order = orderResult.rows[0];

        // Create order items and update product stock
        for (const item of cartItems.rows) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price) 
                 VALUES ($1, $2, $3, $4)`,
                [order.id, item.product_id, item.quantity, item.price]
            );

            // Update product stock
            await client.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }

        // Clear cart
        await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: order,
            items: cartItems.rows.length
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// CANCEL order (if pending)
router.put('/:orderId/cancel', authenticate, requireCustomer, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const userId = req.user.id;
        const { orderId } = req.params;

        // Check if order exists and belongs to user
        const orderResult = await client.query(
            'SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status = $3',
            [orderId, userId, 'pending']
        );

        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                error: 'Order not found or cannot be cancelled' 
            });
        }

        // Restore product stock
        const orderItems = await client.query(
            'SELECT * FROM order_items WHERE order_id = $1',
            [orderId]
        );

        for (const item of orderItems.rows) {
            await client.query(
                'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }

        // Update order status
        await client.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['cancelled', orderId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

module.exports = router;