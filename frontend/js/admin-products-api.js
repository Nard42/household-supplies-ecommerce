// API Configuration
const API_CONFIG = {
    baseURL: 'http://localhost:3000/api',
    endpoints: {
        products: '/products',
        auth: '/auth',
        cart: '/cart',
        orders: '/orders'
    }
};

// Products API Service
const productsAPI = {
    baseURL: `${API_CONFIG.baseURL}${API_CONFIG.endpoints.products}`,

    async getAllProducts() {
        try {
            const response = await fetch(this.baseURL);
            if (!response.ok) throw new Error('Failed to fetch products');
            return await response.json();
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    },

    async createProduct(productData) {
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });
            if (!response.ok) throw new Error('Failed to create product');
            return await response.json();
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    },

    async updateProduct(id, productData) {
        try {
            const response = await fetch(`${this.baseURL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });
            if (!response.ok) throw new Error('Failed to update product');
            return await response.json();
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },

    async deleteProduct(id) {
        try {
            const response = await fetch(`${this.baseURL}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete product');
            return await response.json();
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }
};