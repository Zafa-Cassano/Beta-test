const mysql = require('mysql2/promise');
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jaystore',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool = null;

async function testConnection() {
    try {
        const tempPool = mysql.createPool({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        
        await tempPool.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        console.log('✅ Database ready!');
        await tempPool.end();
        
        pool = mysql.createPool(dbConfig);
        
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully!');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'customer') DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                category VARCHAR(100) NOT NULL,
                original_price INT NOT NULL,
                sale_price INT NOT NULL,
                stock INT DEFAULT 0,
                image VARCHAR(500),
                description TEXT,
                colors VARCHAR(200),
                discount INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cart (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                UNIQUE KEY unique_cart_item (user_id, product_id)
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(50) PRIMARY KEY,
                user_id INT,
                customer_name VARCHAR(100) NOT NULL,
                customer_email VARCHAR(100) NOT NULL,
                customer_phone VARCHAR(20),
                customer_address TEXT,
                total INT NOT NULL,
                status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(50) NOT NULL,
                product_id INT,
                product_name VARCHAR(200) NOT NULL,
                product_image VARCHAR(500),
                price INT NOT NULL,
                quantity INT NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
            )
        `);
        
        const [admins] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@jaystore.com']);
        if (admins.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Admin', 'admin@jaystore.com', hashedPassword, 'admin']
            );
            console.log('✅ Default admin created: admin@jaystore.com / admin123');
        }
        
        const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
        if (products[0].count === 0) {
            const sampleProducts = [
                ['3D™ Wireless Headset', 'Audio', 500000, 400000, 50, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'High quality wireless headset with 3D audio', 'red,black,blue', 20],
                ['PS5 DualShock Wireless Controller', 'Gaming', 899000, 599000, 30, 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400', 'Wireless controller for PlayStation', 'black,blue', 33],
                ['RGB Gaming Keyboard & Mouse', 'Accessories', 750000, 499000, 25, 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400', 'Mechanical gaming keyboard with RGB lighting', 'black', 33],
                ['Logitech Streamcam', 'Electronics', 2190000, 1990000, 15, 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400', 'Full HD streaming webcam', 'white,black', 9],
                ['3D™ Wireless Speaker', 'Audio', 650000, 387000, 40, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', 'Portable wireless speaker with deep bass', 'black,blue', 40],
                ['Bass Meets Clarity Speaker', 'Audio', 400000, 233000, 20, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400', 'Smart speaker with voice assistant', 'red,black,blue', 42],
                ['Logitech Gaming Mouse', 'Accessories', 350000, 250000, 60, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', 'Ergonomic gaming mouse with RGB', 'black,white', 29],
                ['PlayStation Controller Black', 'Gaming', 899000, 599000, 35, 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=400', 'DualSense wireless controller', 'red,black,blue', 33],
                ['Zone Headphone Pro', 'Audio', 2000000, 1790000, 10, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400', 'Premium noise-cancelling headphones', 'black,silver', 11]
            ];
            
            for (const product of sampleProducts) {
                await pool.query(
                    'INSERT INTO products (name, category, original_price, sale_price, stock, image, description, colors, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    product
                );
            }
            console.log('✅ Sample products inserted');
        }
        
        console.log('✅ Database initialized successfully!');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        return false;
    }
}

function getPool() {
    return pool;
}
module.exports = { getPool, testConnection, initDatabase };
