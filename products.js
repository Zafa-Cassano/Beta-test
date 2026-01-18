const express = require('express');
const { getPool } = require('../config/database');
const { requireAdmin } = require('./auth');

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const { category, minPrice, maxPrice, sort, search } = req.query;
        
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        
        // Filter by category
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        
        // Filter by price range
        if (minPrice) {
            query += ' AND sale_price >= ?';
            params.push(parseInt(minPrice));
        }
        if (maxPrice) {
            query += ' AND sale_price <= ?';
            params.push(parseInt(maxPrice));
        }
        
        // Search
        if (search) {
            query += ' AND (name LIKE ? OR category LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        // Sort
        switch (sort) {
            case 'price-low':
                query += ' ORDER BY sale_price ASC';
                break;
            case 'price-high':
                query += ' ORDER BY sale_price DESC';
                break;
            case 'name':
                query += ' ORDER BY name ASC';
                break;
            default:
                query += ' ORDER BY created_at DESC';
        }
        
        const [products] = await pool.query(query, params);
        
        // Convert colors string to array
        const formattedProducts = products.map(p => ({
            ...p,
            colors: p.colors ? p.colors.split(',') : []
        }));
        
        res.json({ 
            success: true, 
            products: formattedProducts 
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data produk!' 
        });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const pool = getPool();
        const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        
        if (products.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Produk tidak ditemukan!' 
            });
        }
        
        const product = products[0];
        product.colors = product.colors ? product.colors.split(',') : [];
        
        res.json({ 
            success: true, 
            product 
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data produk!' 
        });
    }
});

// Add product (Admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { name, category, originalPrice, salePrice, stock, image, description, colors } = req.body;
        
        const discount = Math.round((1 - salePrice / originalPrice) * 100);
        const colorsStr = Array.isArray(colors) ? colors.join(',') : colors || '';
        
        const [result] = await pool.query(
            `INSERT INTO products (name, category, original_price, sale_price, stock, image, description, colors, discount) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, category, originalPrice, salePrice, stock || 0, image, description, colorsStr, discount]
        );
        
        res.json({ 
            success: true, 
            message: 'Produk berhasil ditambahkan!',
            productId: result.insertId
        });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menambahkan produk!' 
        });
    }
});

// Update product (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { name, category, originalPrice, salePrice, stock, image, description, colors } = req.body;
        
        const discount = Math.round((1 - salePrice / originalPrice) * 100);
        const colorsStr = Array.isArray(colors) ? colors.join(',') : colors || '';
        
        await pool.query(
            `UPDATE products SET name = ?, category = ?, original_price = ?, sale_price = ?, 
             stock = ?, image = ?, description = ?, colors = ?, discount = ? WHERE id = ?`,
            [name, category, originalPrice, salePrice, stock, image, description, colorsStr, discount, req.params.id]
        );
        
        res.json({ 
            success: true, 
            message: 'Produk berhasil diupdate!' 
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengupdate produk!' 
        });
    }
});

// Update stock (Admin only)
router.patch('/:id/stock', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { stock } = req.body;
        
        await pool.query('UPDATE products SET stock = ? WHERE id = ?', [stock, req.params.id]);
        
        res.json({ 
            success: true, 
            message: 'Stok berhasil diupdate!' 
        });
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengupdate stok!' 
        });
    }
});

// Delete product (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        
        res.json({ 
            success: true, 
            message: 'Produk berhasil dihapus!' 
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menghapus produk!' 
        });
    }
});

module.exports = router;