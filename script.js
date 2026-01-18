// ============================================
// Main Script - Shop Functionality (API Version)
// ============================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    await checkSession();
    await loadProducts();
    await updateCartCount();
    updateAuthUI();
});

// Check if session is still valid
async function checkSession() {
    await DB.getCurrentUser();
}

// ============================================
// Product Functions
// ============================================

async function loadProducts(category = '', priceRange = '', sort = 'default', searchTerm = '') {
    const options = {};
    
    if (category) options.category = category;
    if (searchTerm) options.search = searchTerm;
    if (sort && sort !== 'default') options.sort = sort;
    
    if (priceRange) {
        const [min, max] = priceRange.split('-').map(Number);
        options.minPrice = min;
        options.maxPrice = max;
    }
    
    const products = await DB.getProducts(options);
    renderProducts(products);
    
    // Update product count
    const countEl = document.getElementById('productCount');
    if (countEl) {
        countEl.textContent = `${products.length} products`;
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-search"></i>
                <h3>No Products Found</h3>
                <p>Try adjusting your filters or search term.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = products.map((product, index) => {
        const stock = product.stock || 0;
        const isOutOfStock = stock <= 0;
        const isLowStock = stock > 0 && stock < 10;
        
        return `
        <div class="product-card" style="animation-delay: ${index * 0.1}s">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                ${product.discount > 0 ? `<span class="product-badge">${product.discount}% OFF</span>` : ''}
                ${isOutOfStock ? '<span class="product-badge out-of-stock">Out of Stock</span>' : ''}
                <span class="product-stock ${isOutOfStock ? 'out' : isLowStock ? 'low' : ''}">
                    ${isOutOfStock ? 'Sold Out' : `Stock: ${stock}`}
                </span>
                <div class="product-actions">
                    <button onclick="addToCart(${product.id})" title="Add to Cart" ${isOutOfStock ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    <button title="Add to Wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="product-price">
                    <span class="original-price">${formatPrice(product.original_price)}</span>
                    <span class="sale-price">${formatPrice(product.sale_price)}</span>
                </div>
                <div class="product-colors">
                    ${(product.colors || []).map(color => 
                        `<span class="color-dot" style="background: ${color}"></span>`
                    ).join('')}
                </div>
            </div>
        </div>
    `}).join('');
}

function filterByCategory(category) {
    window.location.href = `shop.html?category=${category}`;
}

async function applyFilters() {
    const category = document.querySelector('input[name="category"]:checked')?.value || '';
    const priceRange = document.querySelector('input[name="price"]:checked')?.value || '';
    const sort = document.getElementById('sortSelect')?.value || 'default';
    const searchTerm = document.getElementById('searchInput')?.value || '';
    
    await loadProducts(category, priceRange, sort, searchTerm);
}

async function resetFilters() {
    document.querySelectorAll('input[name="category"]').forEach(input => {
        input.checked = input.value === '';
    });
    document.querySelectorAll('input[name="price"]').forEach(input => {
        input.checked = input.value === '';
    });
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = 'default';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    await loadProducts();
}

function searchProducts() {
    const searchTerm = document.getElementById('searchInput')?.value || '';
    
    if (window.location.pathname.includes('shop.html')) {
        applyFilters();
    } else {
        window.location.href = `shop.html?search=${encodeURIComponent(searchTerm)}`;
    }
}

// ============================================
// Cart Functions
// ============================================

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        renderCart();
    }
}

async function addToCart(productId) {
    // Check if logged in
    if (!DB.isLoggedIn()) {
        showToast('Silakan login terlebih dahulu untuk menambahkan ke keranjang!', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    const result = await DB.addToCart(productId);
    
    if (result.success) {
        await updateCartCount();
        await renderCart();
        showToast(result.message, 'success');
    } else {
        showToast(result.message, 'error');
    }
}

async function updateCartCount() {
    const count = await DB.getCartCount();
    const countElements = document.querySelectorAll('#cartCount');
    countElements.forEach(el => {
        el.textContent = count;
    });
}

async function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (!cartItems) return;
    
    // Check if logged in
    if (!DB.isLoggedIn()) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-user-lock"></i>
                <p>Silakan login untuk melihat keranjang</p>
                <a href="login.html" class="btn btn-primary" style="margin-top: 15px;">Login</a>
            </div>
        `;
        if (cartTotal) cartTotal.textContent = formatPrice(0);
        return;
    }
    
    const cart = await DB.getCart();
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Keranjang Anda kosong</p>
            </div>
        `;
        if (cartTotal) cartTotal.textContent = formatPrice(0);
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p class="price">${formatPrice(item.price)}</p>
                <div class="cart-item-qty">
                    <button onclick="updateQuantity(${item.product_id}, ${item.quantity - 1})">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
                </div>
            </div>
            <i class="fas fa-trash cart-item-remove" onclick="removeFromCart(${item.product_id})"></i>
        </div>
    `).join('');
    
    if (cartTotal) {
        const total = await DB.getCartTotal();
        cartTotal.textContent = formatPrice(total);
    }
}

async function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
        await removeFromCart(productId);
        return;
    }
    const result = await DB.updateCartQuantity(productId, quantity);
    if (!result.success) {
        showToast(result.message, 'error');
        return;
    }
    await updateCartCount();
    await renderCart();
}

async function removeFromCart(productId) {
    await DB.removeFromCart(productId);
    await updateCartCount();
    await renderCart();
    showToast('Item dihapus dari keranjang', 'info');
}

// ============================================
// Checkout Functions
// ============================================

async function checkout() {
    // WAJIB LOGIN UNTUK CHECKOUT
    if (!DB.isLoggedIn()) {
        showToast('Anda harus login terlebih dahulu untuk checkout!', 'error');
        toggleCart();
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    const cart = await DB.getCart();
    
    if (cart.length === 0) {
        showToast('Keranjang Anda kosong!', 'error');
        return;
    }
    
    toggleCart();
    prefillCheckoutForm();
    await openCheckoutModal();
}

function prefillCheckoutForm() {
    const user = DB.getCurrentUserSync();
    if (user) {
        const nameInput = document.getElementById('customerName');
        const emailInput = document.getElementById('customerEmail');
        if (nameInput) nameInput.value = user.name || '';
        if (emailInput) emailInput.value = user.email || '';
    }
}

async function openCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    const summaryItems = document.getElementById('orderSummaryItems');
    const orderTotal = document.getElementById('orderTotal');
    
    if (!modal) return;
    
    const cart = await DB.getCart();
    const total = await DB.getCartTotal();
    
    if (summaryItems) {
        summaryItems.innerHTML = cart.map(item => `
            <div class="order-summary-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>${formatPrice(item.price * item.quantity)}</span>
            </div>
        `).join('');
    }
    
    if (orderTotal) {
        orderTotal.textContent = formatPrice(total);
    }
    
    modal.classList.add('active');
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.remove('active');
}

async function submitOrder(event) {
    event.preventDefault();
    
    // Double check login
    if (!DB.isLoggedIn()) {
        showToast('Sesi Anda habis. Silakan login kembali.', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const customerData = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        address: document.getElementById('customerAddress').value
    };
    
    const result = await DB.createOrder(customerData);
    
    if (result.success) {
        closeCheckoutModal();
        await updateCartCount();
        await renderCart();
        showToast(`Pesanan ${result.orderId} berhasil dibuat!`, 'success');
        
        // Reset form
        document.getElementById('checkoutForm').reset();
        
        // Reload products to update stock
        await loadProducts();
    } else {
        showToast(result.message || 'Gagal membuat pesanan. Silakan coba lagi.', 'error');
    }
}

// ============================================
// Auth UI Update
// ============================================

function updateAuthUI() {
    const user = DB.getCurrentUserSync();
    const isAdmin = DB.isAdmin();
    
    // Update header auth links
    const authLinks = document.getElementById('authLinks');
    if (authLinks) {
        if (user) {
            authLinks.innerHTML = `
                <span class="user-greeting">Halo, ${user.name}</span>
                <a href="#" onclick="logout(); return false;">Logout</a>
            `;
        } else {
            authLinks.innerHTML = `
                <a href="login.html">Login</a>
                <a href="register.html">Register</a>
            `;
        }
    }
    
    // Show/hide admin menu
    const adminMenu = document.querySelectorAll('.admin-only');
    adminMenu.forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });
}

async function logout() {
    await DB.logout();
    showToast('Logout berhasil!', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500);
}

// ============================================
// Utility Functions
// ============================================

function formatPrice(price) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(price);
}

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Handle URL parameters on shop page
if (window.location.pathname.includes('shop.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        const search = urlParams.get('search');
        
        if (category) {
            const categoryInput = document.querySelector(`input[name="category"][value="${category}"]`);
            if (categoryInput) categoryInput.checked = true;
        }
        
        if (search) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = search;
        }
        
        setTimeout(applyFilters, 100);
    });
}

// Search on Enter key
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.id === 'searchInput') {
        searchProducts();
    }
});
