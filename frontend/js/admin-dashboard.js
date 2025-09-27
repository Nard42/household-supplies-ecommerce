// admin-dashboard.js - Independent Version (No login required)
class AdminDashboard {
    constructor() {
        this.products = [];
        this.currentProduct = null;
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProducts();
        this.displayAdminInfo();
    }

    displayAdminInfo() {
        const welcomeElement = document.getElementById('adminWelcome');
        if (welcomeElement) {
            welcomeElement.textContent = 'Welcome, Administrator';
        }
    }

    bindEvents() {
        // Logout button - redirect to admin login
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'admin-login.html';
        });

        // Add product button
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.showProductModal();
        });

        // Product form submission
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Image preview
        document.getElementById('productImage').addEventListener('change', (e) => {
            this.previewImage(e.target);
        });
    }

    async loadProducts() {
        this.showLoading(true);
        try {
            // Load products directly without authentication for now
            const response = await fetch(`${this.apiBaseUrl}/products`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.products = result.products;
                this.renderProducts();
            } else {
                // If no products, use sample data
                this.useSampleProducts();
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.useSampleProducts();
        } finally {
            this.showLoading(false);
        }
    }

    useSampleProducts() {
        // Fallback to sample products if API fails
        this.products = [
            {
                id: 1,
                name: "All-Purpose Cleaner",
                description: "Effective cleaner for all surfaces",
                price: 5.99,
                stock: 50,
                category: "Cleaning",
                image: "/images/cleaner.jpg"
            },
            {
                id: 2,
                name: "Laundry Detergent",
                description: "Concentrated liquid detergent",
                price: 8.99,
                stock: 30,
                category: "Laundry",
                image: "/images/detergent.jpg"
            }
        ];
        this.renderProducts();
    }

    // ... keep the rest of your admin-dashboard.js methods the same ...
    // (renderProducts, showProductModal, populateForm, previewImage, saveProduct, etc.)
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});