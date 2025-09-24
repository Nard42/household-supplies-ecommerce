const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../config/database');

// Helper function to generate simple tokens (in real app, use JWT)
const generateToken = (role) => {
    return role === 'admin' ? 'admin-token-123' : 'customer-token-456';
};

// Customer Registration
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists with this email' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password, first_name, last_name, role) 
             VALUES ($1, $2, $3, $4, 'customer') 
             RETURNING id, email, first_name, last_name, role, created_at`,
            [email, hashedPassword, first_name, last_name]
        );

        const user = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token: generateToken('customer'),
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration' 
        });
    }
});

// Login (Both admin and customer)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Find user by email
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        const user = result.rows[0];

        // Verify password (in real app, use bcrypt.compare)
        // For now, using simple validation
        const isValidPassword = password === 'admin123' && email === 'admin@example.com' 
            ? true 
            : password === 'customer123' && email === 'customer@example.com'
            ? true
            : await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            token: generateToken(user.role),
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

// Get current user profile
router.get('/me', async (req, res) => {
    try {
        // This would require authentication middleware
        // For now, return simple response
        res.json({ 
            success: true, 
            message: 'User profile endpoint' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Logout successful' 
    });
});

module.exports = router;