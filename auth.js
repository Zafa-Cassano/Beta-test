const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const pool = getPool();
        const { name, email, password } = req.body;
        
        // Validasi input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Semua field harus diisi!' 
            });
        }
        
        // Cek email sudah terdaftar
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email sudah terdaftar!' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'customer']
        );
        
        res.json({ 
            success: true, 
            message: 'Registrasi berhasil!' 
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mendaftar!' 
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const pool = getPool();
        const { email, password } = req.body;
        
        // Validasi input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email dan password harus diisi!' 
            });
        }
        
        // Cari user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email tidak ditemukan!' 
            });
        }
        
        const user = users[0];
        
        // Verifikasi password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Password salah!' 
            });
        }
        
        // Set session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        res.json({ 
            success: true, 
            message: 'Login berhasil!',
            user: req.session.user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal login!' 
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Gagal logout!' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Logout berhasil!' 
        });
    });
});

// Get current user
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({ 
            success: true, 
            user: req.session.user,
            isLoggedIn: true,
            isAdmin: req.session.user.role === 'admin'
        });
    } else {
        res.json({ 
            success: true, 
            user: null,
            isLoggedIn: false,
            isAdmin: false
        });
    }
});

// Middleware untuk cek login
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Silakan login terlebih dahulu!' 
        });
    }
    next();
};

// Middleware untuk cek admin
const requireAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Silakan login terlebih dahulu!' 
        });
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Akses ditolak! Hanya admin yang bisa mengakses.' 
        });
    }
    next();
};

module.exports = router;
module.exports.requireLogin = requireLogin;
module.exports.requireAdmin = requireAdmin;