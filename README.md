# Jay Store - E-commerce dengan MySQL

Website e-commerce dengan fitur multi-user (Admin & Customer dapat login bersamaan).

## 📋 Persyaratan

1. **Node.js** (v14 atau lebih baru)
   - Download: https://nodejs.org/

2. **MySQL Server**
   - Download: https://dev.mysql.com/downloads/mysql/
   - Atau gunakan **XAMPP**: https://www.apachefriends.org/

3. **Browser Modern** (Chrome, Firefox, Edge)

## 🚀 Cara Instalasi

### 1. Install MySQL
- Jalankan XAMPP dan start **Apache** dan **MySQL**
- Atau jalankan MySQL service jika menggunakan MySQL standalone

### 2. Konfigurasi Database
Edit file `backend/config/database.js` sesuai dengan kredensial MySQL Anda:

```javascript
const dbConfig = {
    host: 'localhost',
    user: 'root',           // Username MySQL Anda
    password: '',           // Password MySQL Anda (kosongkan jika XAMPP default)
    database: 'jaystore',
    // ...
};
```

### 3. Install Dependencies
```bash
cd backend
npm install
```

### 4. Jalankan Server
```bash
cd backend
npm start
```

Server akan berjalan di `http://localhost:3000`

### 5. Buka Website
Buka browser dan akses:
- **Homepage:** http://localhost:3000/index.html
- **Shop:** http://localhost:3000/shop.html
- **Login:** http://localhost:3000/login.html
- **Admin Panel:** http://localhost:3000/admin.html

## 👤 Akun Default

### Admin
- Email: `admin@jaystore.com`
- Password: `admin123`

### Customer
Daftar melalui halaman Register

## ✨ Fitur

### 🛒 Customer
- Registrasi & Login
- Melihat produk dengan filter
- Menambahkan produk ke keranjang (harus login)
- Checkout pesanan (harus login)
- Melihat riwayat pesanan

### 👨‍💼 Admin
- Login sebagai Admin
- Dashboard dengan statistik
- CRUD Produk (Add, Edit, Delete)
- Restock produk
- Kelola pesanan (status, hapus)
- Melihat daftar customer

## 🔄 Multi-User (Bersamaan)

Dengan MySQL, Admin dan Customer dapat:
- ✅ Login bersamaan di browser berbeda
- ✅ Login bersamaan di komputer berbeda
- ✅ Data tersinkronisasi real-time
- ✅ Stok berkurang untuk semua user
- ✅ Order customer langsung terlihat di admin

## 📁 Struktur Folder

```
amiri-coffee/
├── backend/
│   ├── config/
│   │   └── database.js     # Konfigurasi MySQL
│   ├── routes/
│   │   ├── auth.js         # API autentikasi
│   │   ├── products.js     # API produk
│   │   ├── cart.js         # API keranjang
│   │   ├── orders.js       # API pesanan
│   │   └── stats.js        # API statistik
│   ├── node_modules/
│   ├── package.json
│   └── server.js           # Entry point server
│
├── index.html              # Homepage
├── shop.html               # Halaman produk
├── login.html              # Halaman login
├── register.html           # Halaman registrasi
├── admin.html              # Panel admin
├── orders.html             # Kelola pesanan
├── style.css               # Styling
├── database.js             # API client (frontend)
├── script.js               # Shop script
├── admin.js                # Admin script
├── orders.js               # Orders script
├── auth.js                 # Auth script
└── README.md
```

## 🛠️ Troubleshooting

### Error: Unknown database 'jaystore'
Database akan otomatis dibuat saat pertama kali menjalankan server. Pastikan MySQL berjalan dan kredensial benar.

### Error: Access denied for user 'root'
Periksa password MySQL di `backend/config/database.js`

### Error: ECONNREFUSED
MySQL tidak berjalan. Jalankan MySQL service atau start XAMPP.

### Tidak bisa menjalankan npm
Jalankan PowerShell sebagai Administrator dan ketik:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📞 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/auth/register | Registrasi user |
| POST | /api/auth/login | Login user |
| POST | /api/auth/logout | Logout user |
| GET | /api/auth/me | Get current user |
| GET | /api/products | Get semua produk |
| POST | /api/products | Add produk (admin) |
| PUT | /api/products/:id | Update produk (admin) |
| DELETE | /api/products/:id | Delete produk (admin) |
| GET | /api/cart | Get keranjang user |
| POST | /api/cart/add | Add ke keranjang |
| PUT | /api/cart/update | Update quantity |
| DELETE | /api/cart/remove/:id | Hapus dari keranjang |
| GET | /api/orders | Get pesanan |
| POST | /api/orders | Buat pesanan |
| PATCH | /api/orders/:id/status | Update status (admin) |
| GET | /api/stats | Get statistik (admin) |

---

Made with ❤️ for Jay Store
