const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Simple login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // For now, simple check - we'll add proper authentication later
        if (username === 'admin' && password === 'admin123') {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;