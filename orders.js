const express = require('express');
const { getPool } = require('../config/database');
const { requireLogin, requireAdmin } = require('./auth');

const router = express.Router();

// Get all orders (Admin) or user's orders (Customer)
router.get('/', requireLogin, async (req, res) => {
    try {
        const pool = getPool();
        const user = req.session.user;
        const { status } = req.query;
        
        let query = 'SELECT * FROM orders';
        const params = [];
        
        // If not admin, only show user's orders
        if (user.role !== 'admin') {
            query += ' WHERE user_id = ?';
            params.push(user.id);
        }
        
        // Filter by status
        if (status) {
            query += user.role === 'admin' ? ' WHERE status = ?' : ' AND status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [orders] = await pool.query(query, params);
        
        // Get order items for each order
        for (let order of orders) {
            const [items] = await pool.query(
                'SELECT * FROM order_items WHERE order_id = ?',
                [order.id]
            );
            order.items = items;
            order.customer = {
                name: order.customer_name,
                email: order.customer_email,
                phone: order.customer_phone,
                address: order.customer_address
            };
        }
        
        res.json({ 
            success: true, 
            orders 
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data pesanan!' 
        });
    }
});

// Get single order
router.get('/:id', requireLogin, async (req, res) => {
    try {
        const pool = getPool();
        const user = req.session.user;
        const orderId = req.params.id;
        
        let query = 'SELECT * FROM orders WHERE id = ?';
        const params = [orderId];
        
        // If not admin, only allow viewing own orders
        if (user.role !== 'admin') {
            query += ' AND user_id = ?';
            params.push(user.id);
        }
        
        const [orders] = await pool.query(query, params);
        
        if (orders.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pesanan tidak ditemukan!' 
            });
        }
        
        const order = orders[0];
        
        // Get order items
        const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        order.items = items;
        order.customer = {
            name: order.customer_name,
            email: order.customer_email,
            phone: order.customer_phone,
            address: order.customer_address
        };
        
        res.json({ 
            success: true, 
            order 
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data pesanan!' 
        });
    }
});

// Create order (requires login)
router.post('/', requireLogin, async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const user = req.session.user;
        const { name, email, phone, address } = req.body;
        
        // Get cart items
        const [cartItems] = await connection.query(`
            SELECT c.product_id, c.quantity, p.name, p.sale_price as price, p.image, p.stock
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `, [user.id]);
        
        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Keranjang kosong!' 
            });
        }
        
        // Check stock for all items
        for (const item of cartItems) {
            if (item.stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `Stok ${item.name} tidak mencukupi!` 
                });
            }
        }
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Generate order ID
        const orderId = 'ORD-' + Date.now();
        
        // Create order
        await connection.query(
            `INSERT INTO orders (id, user_id, customer_name, customer_email, customer_phone, customer_address, total, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [orderId, user.id, name, email, phone, address, total]
        );
        
        // Create order items and update stock
        for (const item of cartItems) {
            // Insert order item
            await connection.query(
                `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.name, item.image, item.price, item.quantity]
            );
            
            // Reduce stock
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }
        
        // Clear cart
        await connection.query('DELETE FROM cart WHERE user_id = ?', [user.id]);
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: 'Pesanan berhasil dibuat!',
            orderId 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal membuat pesanan!' 
        });
    } finally {
        connection.release();
    }
});

// Update order status (Admin only)
router.patch('/:id/status', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { status } = req.body;
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status tidak valid!' 
            });
        }
        
        await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        
        res.json({ 
            success: true, 
            message: 'Status pesanan diupdate!' 
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengupdate status pesanan!' 
        });
    }
});

// Delete order (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
        
        res.json({ 
            success: true, 
            message: 'Pesanan berhasil dihapus!' 
        });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menghapus pesanan!' 
        });
    }
});

module.exports = router;