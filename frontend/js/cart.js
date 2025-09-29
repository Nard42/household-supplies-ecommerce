// Replace your current cart functions with these:

let cart = [];
let currentUser = null;


// Load cart from backend
async function loadCartFromServer() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/cart/${currentUser.id}`);
        const result = await response.json();
        
        if (result.success) {
            cart = result.cart.map(item => ({
                id: item.id,
                productId: item.product_id,
                quantity: item.quantity,
                name: item.name,
                price: item.price,
                image_url: item.image_url,
                stock_quantity: item.stock_quantity
            }));
            updateCartUI();
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        // Fallback to localStorage if server fails
        loadCartFromLocalStorage();
    }
}

// Add to cart with backend persistence
async function addToCart(productId, quantity = 1) {
    if (!currentUser) {
        alert('Please login to add items to cart');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id,
                productId: productId,
                quantity: quantity
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadCartFromServer(); // Reload cart from server
            showNotification('Item added to cart', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Update cart item quantity
async function updateCartItem(productId, quantity) {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/cart/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id,
                quantity: quantity
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadCartFromServer(); // Reload cart from server
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Remove from cart
async function removeFromCart(productId) {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/cart/${productId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadCartFromServer(); // Reload cart from server
            showNotification('Item removed from cart', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Place order
async function placeOrder(orderData) {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id,
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                })),
                totalAmount: calculateTotal(),
                shippingAddress: orderData.shippingAddress,
                paymentMethod: orderData.paymentMethod
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear cart after successful order
            cart = [];
            updateCartUI();
            showNotification('Order placed successfully!', 'success');
            return result.orderId;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    }
}

// Keep your existing UI update functions, but remove localStorage operations
function updateCartUI() {
    // Your existing UI update code, but remove localStorage.setItem calls
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    }
    
    // Update cart page if on cart page
    if (window.location.pathname.includes('cart.html')) {
        renderCartItems();
    }
}

// Fallback to localStorage (optional, for offline support)
function loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('userCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}
