// Products Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let products = [];
    let filteredProducts = [];
    let cart = [];
    
    // Session expiration
    const MAX_SESSION_AGE = 2 * 60 * 60 * 1000;
    let currentUser = null;
    
    // Check session
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const sessionAge = Date.now() - (user.timestamp || 0);
            
            if (sessionAge > MAX_SESSION_AGE) {
                localStorage.removeItem('currentUser');
                currentUser = null;
                showNotification('Your session has expired. Please login again.', 'error');
            } else {
                currentUser = user;
            }
        } catch (error) {
            localStorage.removeItem('currentUser');
            currentUser = null;
        }
    }
    
    // DOM Elements
    const productsGrid = document.getElementById('productsGrid');
    const categoryNav = document.getElementById('categoryNav');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const cartIcon = document.getElementById('cartIcon');
    const cartCount = document.getElementById('cartCount');
    const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
    const cartItems = document.getElementById('cartItems');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
    const checkoutForm = document.getElementById('checkoutForm');
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logoutLink');
    
    // Initialize the page
    initProductsPage();
    
    async function initProductsPage() {
        await loadProducts();
        await refreshCartData();
        setupEventListeners();
        updateUserUI();
    }
    
    // ==================== COMPLETELY NEW CART SYSTEM ====================
    
    // Centralized cart data management
    async function refreshCartData() {
        if (!currentUser) {
            cart = [];
            updateCartDisplay();
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/cart/${currentUser.id}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();
            
            if (result.success) {
                cart = result.cart.map(item => ({
                    id: item.id,
                    productId: item.product_id,
                    quantity: item.quantity,
                    name: item.name,
                    price: parseFloat(item.price),
                    image_url: item.image_url,
                    stock_quantity: item.stock_quantity
                }));
                
                updateCartDisplay();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            cart = [];
            updateCartDisplay();
        }
    }
    
    // Unified cart display update
    function updateCartDisplay() {
        updateCartBadge();
        updateCartModal();
    }
    
    // Update cart badge count
    function updateCartBadge() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
    
    // Update cart modal content
    function updateCartModal() {
        if (!cartItems) return;
        
        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <p>Your cart is empty</p>
                    <button class="btn btn-primary" data-bs-dismiss="modal">Continue Shopping</button>
                </div>
            `;
            return;
        }
        
        let total = 0;
        const cartHTML = cart.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return '';
            
            const price = parseFloat(product.price) || 0;
            const subtotal = price * item.quantity;
            total += subtotal;
            
            return `
            <div class="cart-item d-flex align-items-center mb-3 pb-3 border-bottom">
                <img src="${validateImagePath(product.image_url)}" 
                     class="rounded me-3" 
                     style="width: 80px; height: 80px; object-fit: cover;"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tk88L3RleHQ+Cjwvc3ZnPgo='">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${product.name}</h6>
                    <p class="text-muted mb-1">$${price.toFixed(2)} x ${item.quantity}</p>
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm btn-outline-secondary" onclick="cartSystem.decreaseItem(${item.productId})">-</button>
                        <span class="mx-2">${item.quantity}</span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="cartSystem.increaseItem(${item.productId})">+</button>
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="cartSystem.removeItem(${item.productId})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="text-end">
                    <div class="fw-bold">$${subtotal.toFixed(2)}</div>
                </div>
            </div>
            `;
        }).join('');
        
        cartItems.innerHTML = cartHTML + `
            <div class="border-top pt-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h5>Total: $${total.toFixed(2)}</h5>
                    <button class="btn btn-primary" id="modalCheckoutBtn">Proceed to Checkout</button>
                </div>
            </div>
        `;
        
        // Reattach checkout button listener
        const checkoutBtn = document.getElementById('modalCheckoutBtn');
        if (checkoutBtn) {
            checkoutBtn.onclick = handleCheckout;
        }
    }
    
    // Cart operations system
    const cartSystem = {
        // Add item to cart
     async addItem(productId, quantity = 1) {
    if (!currentUser) {
        showNotification('Please login to add items to cart', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    
    // IMMEDIATE UI UPDATE - Add to local cart first
    const product = products.find(p => p.id === productId);
    if (product) {
        const existingItem = cart.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                id: Date.now(), // Temporary ID
                productId: productId,
                quantity: quantity,
                name: product.name,
                price: parseFloat(product.price),
                image_url: product.image_url,
                stock_quantity: product.stock_quantity
            });
        }
        
        // Update UI immediately
        updateCartDisplay();
        
        // Show success notification immediately
        showNotification('Item added to cart', 'success');
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                productId: productId,
                quantity: quantity
            })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        
        if (result.success) {
            await refreshCartData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification(`Error: ${error.message}`, 'error');
        // Refresh cart to sync with server state
        await refreshCartData();
    }
    // In your addItem function, change this:
// Then sync with server in background (don't wait for it)
this.syncCartWithServer(productId, quantity); // NON-BLOCKING CALL
},
// Add this separate sync function to your cartSystem object
async syncCartWithServer(productId, quantity) {
    try {
        const response = await fetch('http://localhost:3000/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                productId: productId,
                quantity: quantity
            })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        
        if (result.success) {
            // Refresh cart data to get proper IDs and sync
            await refreshCartData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error syncing cart:', error);
        // Don't show error to user - just log it and refresh
        await refreshCartData();
    }
},       
        // Update item quantity
        async updateItem(productId, newQuantity) {
            if (!currentUser) return;
            
            if (newQuantity <= 0) {
                await this.removeItem(productId);
                return;
            }
            
            try {
                const response = await fetch(`http://localhost:3000/api/cart/${productId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        quantity: newQuantity
                    })
                });
                
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const result = await response.json();
                
                if (result.success) {
                    await refreshCartData();
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Error updating cart:', error);
                showNotification(`Error: ${error.message}`, 'error');
            }
        },
        
        // Remove item from cart
        async removeItem(productId) {
            if (!currentUser) return;
            
            try {
                const response = await fetch(`http://localhost:3000/api/cart/${productId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id })
                });
                
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const result = await response.json();
                
                if (result.success) {
                    showNotification('Item removed from cart', 'success');
                    await refreshCartData();
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Error removing from cart:', error);
                showNotification(`Error: ${error.message}`, 'error');
            }
        },
        
        // Increase item quantity
        async increaseItem(productId) {
            const cartItem = cart.find(item => item.productId === productId);
            if (cartItem) {
                await this.updateItem(productId, cartItem.quantity + 1);
            }
        },
        
        // Decrease item quantity
        async decreaseItem(productId) {
            const cartItem = cart.find(item => item.productId === productId);
            if (cartItem) {
                await this.updateItem(productId, cartItem.quantity - 1);
            }
        }
    };
    
    // Make cartSystem globally available
    window.cartSystem = cartSystem;
    
    // ==================== END OF NEW CART SYSTEM ====================
    
    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();
            
            if (result.products && Array.isArray(result.products)) {
                products = result.products;
            } else if (Array.isArray(result)) {
                products = result;
            } else {
                products = [];
            }
            
            filteredProducts = [...products];
            displayProducts();
        } catch (error) {
            console.error('Error loading products:', error.message);
            productsGrid.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Error loading products</h4>
                        <p>${error.message}</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">Try Again</button>
                    </div>
                </div>
            `;
        }
    }
    
    function displayProducts() {
        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h4>No products found</h4>
                        <p>No products match your search criteria.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        productsGrid.innerHTML = filteredProducts.map(product => {
            const price = parseFloat(product.price) || 0;
            const stockQuantity = parseInt(product.stock_quantity) || 0;
            const imageSrc = validateImagePath(product.image_url);
            
            return `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4" data-product-id="${product.id}">
                <div class="card product-card">
                    <div class="position-relative">
                        ${imageSrc ? 
                            `<img src="${imageSrc}" class="product-image" alt="${product.name}" 
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOT1QgQVZBSUxBQkxFPC90ZXh0Pgo8L3N2Zz4KJy">` :
                            `<div class="product-image d-flex align-items-center justify-content-center bg-light">
                                <small class="text-muted">No Image Available</small>
                             </div>`
                        }
                        <span class="stock-badge badge ${getStockBadgeClass(stockQuantity)}">
                            ${getStockText(stockQuantity)}
                        </span>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title product-title">${product.name || 'Unnamed Product'}</h5>
                        <p class="card-text text-muted flex-grow-1">${product.description ? product.description.substring(0, 100) + '...' : 'No description available.'}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="product-price">$${price.toFixed(2)}</span>
                                <span class="badge bg-secondary">${product.category || 'Uncategorized'}</span>
                            </div>
                            ${stockQuantity > 0 ? `
                            <div class="quantity-control">
                                <button class="quantity-btn" onclick="event.stopPropagation(); decreaseProductQuantity(${product.id})">-</button>
                                <input type="number" class="quantity-input" id="quantity-${product.id}" value="1" min="1" max="${stockQuantity}" onclick="event.stopPropagation();">
                                <button class="quantity-btn" onclick="event.stopPropagation(); increaseProductQuantity(${product.id}, ${stockQuantity})">+</button>
                            </div>
                            <button class="btn cart-btn w-100" onclick="event.stopPropagation(); addProductToCart(${product.id})">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                            ` : `
                            <button class="btn btn-secondary w-100" disabled onclick="event.stopPropagation();">
                                <i class="fas fa-times-circle"></i> Out of Stock
                            </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        // Add click event listeners to product cards for modal
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || 
                    e.target.classList.contains('quantity-btn')) {
                    return;
                }
                
                const productId = this.closest('[data-product-id]').getAttribute('data-product-id');
                showProductModal(parseInt(productId));
            });
        });
    }
    
    // Product quantity controls (separate from cart operations)
    window.decreaseProductQuantity = function(productId) {
        const input = document.getElementById(`quantity-${productId}`);
        if (input && parseInt(input.value) > 1) {
            input.value = parseInt(input.value) - 1;
        }
    };
    
    window.increaseProductQuantity = function(productId, maxStock) {
        const input = document.getElementById(`quantity-${productId}`);
        if (input && parseInt(input.value) < maxStock) {
            input.value = parseInt(input.value) + 1;
        }
    };
    
    window.addProductToCart = function(productId) {
        const input = document.getElementById(`quantity-${productId}`);
        const quantity = input ? parseInt(input.value) : 1;
        cartSystem.addItem(productId, quantity);
    };
    
    // Product modal functions
    function showProductModal(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        const price = parseFloat(product.price) || 0;
        const stockQuantity = parseInt(product.stock_quantity) || 0;
        const imageSrc = validateImagePath(product.image_url);
        
        const modalHTML = `
            <div class="modal fade" id="productModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${product.name || 'Unnamed Product'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="product-modal-image-container">
                                        ${imageSrc ? 
                                            `<img src="${imageSrc}" class="img-fluid rounded" alt="${product.name}" 
                                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOT1QgQVZBSUxBQkxFPC90ZXh0Pgo8L3N2Zz4KJy">` :
                                            `<div class="d-flex align-items-center justify-content-center bg-light rounded" style="height: 300px;">
                                                <small class="text-muted">No Image Available</small>
                                             </div>`
                                        }
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="product-details">
                                        <div class="mb-3">
                                            <span class="badge ${getStockBadgeClass(stockQuantity)} me-2">
                                                ${getStockText(stockQuantity)}
                                            </span>
                                            <span class="badge bg-secondary">${product.category || 'Uncategorized'}</span>
                                        </div>
                                        
                                        <h3 class="product-price mb-3">$${price.toFixed(2)}</h3>
                                        
                                        <div class="product-description mb-4">
                                            <h6>Description</h6>
                                            <p class="text-muted">${product.description || 'No description available.'}</p>
                                        </div>
                                        
                                        ${stockQuantity > 0 ? `
                                        <div class="add-to-cart-section">
                                            <div class="quantity-control mb-3">
                                                <label class="form-label">Quantity:</label>
                                                <div class="d-flex align-items-center">
                                                    <button class="btn btn-outline-secondary" onclick="decreaseModalQuantity(${product.id})">-</button>
                                                    <input type="number" class="form-control mx-2 text-center" id="modal-quantity-${product.id}" value="1" min="1" max="${stockQuantity}" style="width: 80px;">
                                                    <button class="btn btn-outline-secondary" onclick="increaseModalQuantity(${product.id}, ${stockQuantity})">+</button>
                                                </div>
                                            </div>
                                            <button class="btn btn-primary w-100" onclick="addModalProductToCart(${product.id})">
                                                <i class="fas fa-cart-plus"></i> Add to Cart
                                            </button>
                                        </div>
                                        ` : `
                                        <div class="out-of-stock-section">
                                            <button class="btn btn-secondary w-100" disabled>
                                                <i class="fas fa-times-circle"></i> Out of Stock
                                            </button>
                                        </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('productModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const productModal = new bootstrap.Modal(document.getElementById('productModal'));
        productModal.show();
        
        document.getElementById('productModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
    
    // Modal quantity controls
    window.decreaseModalQuantity = function(productId) {
        const input = document.getElementById(`modal-quantity-${productId}`);
        if (input && parseInt(input.value) > 1) {
            input.value = parseInt(input.value) - 1;
        }
    };
    
    window.increaseModalQuantity = function(productId, maxStock) {
        const input = document.getElementById(`modal-quantity-${productId}`);
        if (input && parseInt(input.value) < maxStock) {
            input.value = parseInt(input.value) + 1;
        }
    };
    
    window.addModalProductToCart = function(productId) {
        const input = document.getElementById(`modal-quantity-${productId}`);
        const quantity = input ? parseInt(input.value) : 1;
        cartSystem.addItem(productId, quantity);
        
        // Close modal after adding
        const productModal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
        if (productModal) productModal.hide();
    };
    
    // Event handlers
    function handleCheckout() {
        if (!currentUser) {
            showNotification('Please login to checkout', 'error');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }
        
        if (cart.length === 0) {
            showNotification('Your cart is empty', 'error');
            return;
        }
        
        cartModal.hide();
        displayCheckoutSummary();
        checkoutModal.show();
    }
    
    function setupEventListeners() {
        // Category filtering
        categoryNav.addEventListener('click', function(e) {
            if (e.target.classList.contains('category-btn')) {
                document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                const searchTerm = searchInput.value.toLowerCase().trim();
                const category = e.target.getAttribute('data-category');
                filterProducts(category, searchTerm);
            }
        });
        
        // Search functionality
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const activeCategory = document.querySelector('.category-btn.active');
            const category = activeCategory ? activeCategory.getAttribute('data-category') : 'all';
            
            filterProducts(category, searchTerm);
            
            if (searchTerm.length === 0) {
                searchResults.style.display = 'none';
            } else {
                showSearchResultsDropdown(searchTerm);
            }
        });
        
        // Hide search results when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
        
        // Cart icon click - ALWAYS loads fresh data
        cartIcon.addEventListener('click', async function(e) {
            e.preventDefault();
            await refreshCartData();
            cartModal.show();
        });
        
        // Checkout button
        checkoutBtn.addEventListener('click', handleCheckout);
        
        // Payment method toggle
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const creditCardInfo = document.getElementById('creditCardInfo');
                creditCardInfo.style.display = this.value === 'credit_card' ? 'block' : 'none';
            });
        });
        
        // Checkout form submission
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            placeOrder();
        });
        
        // User authentication links
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'login.html';
        });
        
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Rest of your existing functions (filterProducts, validateImagePath, etc.)
    function filterProducts(category = 'all', searchTerm = '') {
        filteredProducts = products.filter(product => {
            const categoryMatch = category === 'all' || 
                (product.category && product.category.toLowerCase().includes(category.toLowerCase()));
            
            const searchMatch = !searchTerm || 
                (product.name && product.name.toLowerCase().includes(searchTerm)) ||
                (product.category && product.category.toLowerCase().includes(searchTerm)) ||
                (product.description && product.description.toLowerCase().includes(searchTerm));
            
            return categoryMatch && searchMatch;
        });
        
        displayProducts();
    }
    
    function validateImagePath(imagePath) {
        if (!imagePath) return '';
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        if (imagePath.includes('\\')) {
            const filename = imagePath.split('\\').pop();
            return `http://localhost:3000/images/${filename}`;
        }
        if (imagePath.startsWith('/images/')) return `http://localhost:3000${imagePath}`;
        if (!imagePath.includes('/') && !imagePath.includes('\\')) return `http://localhost:3000/images/${imagePath}`;
        if (imagePath.startsWith('/')) return `http://localhost:3000${imagePath}`;
        if (imagePath.includes('/') && !imagePath.startsWith('/')) {
            const correctedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
            return `http://localhost:3000${correctedPath}`;
        }
        return `http://localhost:3000/images/${imagePath}`;
    }
    
    function getStockBadgeClass(stockQuantity) {
        if (!stockQuantity || stockQuantity === 0) return 'bg-danger';
        if (stockQuantity <= 10) return 'bg-warning';
        return 'bg-success';
    }
    
    function getStockText(stockQuantity) {
        if (!stockQuantity || stockQuantity === 0) return 'Out of Stock';
        if (stockQuantity <= 10) return 'Low Stock';
        return 'In Stock';
    }
    
    function showSearchResultsDropdown(searchTerm) {
        const searchResultsContainer = document.getElementById('searchResults');
        const searchResults = products.filter(product => {
            return (
                (product.name && product.name.toLowerCase().includes(searchTerm)) ||
                (product.category && product.category.toLowerCase().includes(searchTerm)) ||
                (product.description && product.description.toLowerCase().includes(searchTerm))
            );
        }).slice(0, 5);
        
        if (searchResults.length === 0) {
            searchResultsContainer.innerHTML = `<div class="search-item"><div class="text-muted">No products found for "${searchTerm}"</div></div>`;
            searchResultsContainer.style.display = 'block';
            return;
        }
        
        searchResultsContainer.innerHTML = searchResults.map(product => {
            const imageSrc = validateImagePath(product.image_url);
            return `
            <div class="search-item" data-id="${product.id}">
                ${imageSrc ? `<img src="${imageSrc}" alt="${product.name}">` : ''}
                <div>
                    <div class="fw-bold">${product.name}</div>
                    <small class="text-muted">$${parseFloat(product.price || 0).toFixed(2)} • ${product.category || 'Uncategorized'}</small>
                </div>
            </div>
            `;
        }).join('');
        
        searchResultsContainer.style.display = 'block';
        
        document.querySelectorAll('.search-item').forEach(item => {
            item.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('data-category') === 'all') btn.classList.add('active');
                });
                
                searchInput.value = '';
                searchResultsContainer.style.display = 'none';
                filterProducts('all', '');
                
                setTimeout(() => {
                    const productElement = document.querySelector(`[data-product-id="${productId}"]`);
                    if (productElement) {
                        productElement.scrollIntoView({ behavior: 'smooth' });
                        productElement.classList.add('highlight');
                        setTimeout(() => productElement.classList.remove('highlight'), 2000);
                    }
                }, 100);
            });
        });
    }
    
    function displayCheckoutSummary() {
        let subtotal = 0;
        cart.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) subtotal += parseFloat(product.price) * item.quantity;
        });
        
        const shipping = 5.00;
        const total = subtotal + shipping;
        
        document.getElementById('checkoutSubtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('checkoutShipping').textContent = `$${shipping.toFixed(2)}`;
        document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;
        
        if (currentUser) {
            document.getElementById('firstName').value = currentUser.firstName || '';
            document.getElementById('lastName').value = currentUser.lastName || '';
        }
    }
    
    async function placeOrder() {
        if (!currentUser) {
            showNotification('Please log in to place an order', 'error');
            window.location.href = 'login.html';
            return;
        }
        
        if (cart.length === 0) {
            showNotification('Your cart is empty', 'error');
            return;
        }
        
        // Validate stock
        for (const item of cart) {
            const product = products.find(p => p.id === item.productId);
            if (!product || product.stock_quantity < item.quantity) {
                showNotification(`Sorry, ${product ? product.name : 'some items'} are out of stock`, 'error');
                return;
            }
        }
        
        try {
            const orderData = {
                userId: currentUser.id,
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: parseFloat(products.find(p => p.id === item.productId).price)
                })),
                shippingAddress: document.getElementById('address').value,
                paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
                totalAmount: parseFloat(document.getElementById('checkoutTotal').textContent.replace('$', ''))
            };
            
            const response = await fetch('http://localhost:3000/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            
            if (result.success) {
                await refreshCartData();
                checkoutModal.hide();
                
                Swal.fire({
                    title: 'Order Placed!',
                    text: 'Your order has been placed successfully.',
                    icon: 'success',
                    confirmButtonText: 'Continue Shopping'
                }).then(() => loadProducts());
            } else {
                throw new Error(result.message || 'Failed to place order');
            }
            
        } catch (error) {
            console.error('Error placing order:', error);
            showNotification(`Error placing order: ${error.message}`, 'error');
        }
    }
    
    function updateUserUI() {
        if (currentUser) {
            loginLink.style.display = 'none';
            logoutLink.style.display = 'block';
        } else {
            loginLink.style.display = 'block';
            logoutLink.style.display = 'none';
        }
    }
    
    function logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        currentUser = null;
        cart = [];
        updateCartDisplay();
        updateUserUI();
        showNotification('You have been logged out', 'success');
    }
    
    function showNotification(message, type) {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        const toastId = 'toast-' + Date.now();
        const bgColor = type === 'success' ? 'bg-success' : 'bg-danger';
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgColor} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', function() {
            toastElement.remove();
        });
    }
});