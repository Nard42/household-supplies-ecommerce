// Admin Products Management
document.addEventListener('DOMContentLoaded', function() {
    let products = [];
    const productsTableBody = document.getElementById('products-table-body');
    const addProductForm = document.getElementById('addProductForm');
    const editProductForm = document.getElementById('editProductForm');
    const addProductModal = new bootstrap.Modal(document.getElementById('addProductModal'));
    const editProductModal = new bootstrap.Modal(document.getElementById('editProductModal'));

    // Debug: Test API connection
    testAPIConnection();

    // Initialize the page
    initAdminProducts();

    async function testAPIConnection() {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            console.log('API Status:', response.status);
        } catch (error) {
            console.error('API Connection Failed');
        }
    }

    async function initAdminProducts() {
        await loadProducts();
        setupEventListeners();
        setupSearch();
    }

    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.products && Array.isArray(result.products)) {
                products = result.products;
            } else if (Array.isArray(result)) {
                products = result;
            } else {
                console.error('Unexpected API response structure');
                products = [];
            }
            
            console.log('Products loaded:', products.length);
            displayProductsTable();
        } catch (error) {
            console.error('Error loading products:', error.message);
            productsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        Error loading products: ${error.message}
                    </td>
                </tr>
            `;
        }
    }

    function validateImagePath(imagePath) {
        if (!imagePath) return '';
        
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        
        if (imagePath.includes('\\')) {
            const filename = imagePath.split('\\').pop();
            return `http://localhost:3000/images/${filename}`;
        }
        
        if (imagePath.startsWith('/images/')) {
            return `http://localhost:3000${imagePath}`;
        }
        
        if (!imagePath.includes('/') && !imagePath.includes('\\')) {
            return `http://localhost:3000/images/${imagePath}`;
        }
        
        if (imagePath.startsWith('/')) {
            return `http://localhost:3000${imagePath}`;
        }
        
        if (imagePath.includes('/') && !imagePath.startsWith('/')) {
            const correctedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
            return `http://localhost:3000${correctedPath}`;
        }
        
        return `http://localhost:3000/images/${imagePath}`;
    }

    function reverseImagePath(imagePath) {
        if (!imagePath) return '';
        
        if (imagePath.includes('http://localhost:3000/')) {
            return imagePath.replace('http://localhost:3000', '');
        }
        
        return imagePath;
    }

    function displayProductsTable() {
        if (!products || products.length === 0) {
            productsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        No products found.
                    </td>
                </tr>
            `;
            return;
        }

        productsTableBody.innerHTML = products.map(product => {
            const price = parseFloat(product.price) || 0;
            const stockQuantity = parseInt(product.stock_quantity) || 0;
            
            let imageSrc = '';
            if (product.image_url) {
                imageSrc = validateImagePath(product.image_url);
                imageSrc += '?t=' + Date.now();
            }
            
            return `
            <tr>
                <td>${product.id}</td>
                <td>
                    ${imageSrc ? 
                        `<img src="${imageSrc}" alt="${product.name}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjI1IiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTkE8L3RleHQ+Cjwvc3ZnPgo='">` :
                        `<div style="width: 50px; height: 50px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                            <small class="text-muted">No Image</small>
                         </div>`
                    }
                </td>
                <td>${product.name || 'N/A'}</td>
                <td>
                    <span class="badge bg-secondary">${product.category || 'Uncategorized'}</span>
                </td>
                <td>$${price.toFixed(2)}</td>
                <td>
                    <span class="badge ${getStockBadgeClass(stockQuantity)}">
                        ${stockQuantity}
                    </span>
                </td>
                <td>
                    <span class="badge ${getStatusBadgeClass(stockQuantity)}">
                        ${getStatusText(stockQuantity)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-btn" 
                            data-id="${product.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" 
                            data-id="${product.id}" 
                            data-name="${product.name}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                editProduct(productId);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const productName = this.getAttribute('data-name');
                deleteProduct(productId, productName);
            });
        });
    }

    function getStockBadgeClass(stockQuantity) {
        if (!stockQuantity || stockQuantity === 0) return 'bg-danger';
        if (stockQuantity <= 10) return 'bg-warning';
        return 'bg-success';
    }

    function getStatusBadgeClass(stockQuantity) {
        if (!stockQuantity || stockQuantity === 0) return 'bg-danger';
        if (stockQuantity <= 10) return 'bg-warning';
        return 'bg-success';
    }

    function getStatusText(stockQuantity) {
        if (!stockQuantity || stockQuantity === 0) return 'Out of Stock';
        if (stockQuantity <= 10) return 'Low Stock';
        return 'In Stock';
    }

function setupSearch() {
    const searchInput = document.getElementById('searchProducts');
    const searchButton = document.getElementById('searchButton');
    if (!searchInput) return;
    
    // Search on Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    // Search on input (real-time)
    searchInput.addEventListener('input', function() {
        if (this.value.length === 0) {
            displayProductsTable();
        } else if (this.value.length > 2) {
            performSearch();
        }
    });
}

function performSearch() {
    const searchTerm = document.getElementById('searchProducts').value.toLowerCase().trim();
    
    if (!searchTerm) {
        displayProductsTable();
        return;
    }
    
    const filteredProducts = products.filter(product => {
        return (
            (product.name && product.name.toLowerCase().includes(searchTerm)) ||
            (product.category && product.category.toLowerCase().includes(searchTerm)) ||
            (product.description && product.description.toLowerCase().includes(searchTerm)) ||
            (product.id && product.id.toString().includes(searchTerm))
        );
    });
    
    displayFilteredProducts(filteredProducts);
}

function displayFilteredProducts(filteredProducts) {
    if (!filteredProducts || filteredProducts.length === 0) {
        productsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    No products found matching your search.
                </td>
            </tr>
        `;
        return;
    }

    productsTableBody.innerHTML = filteredProducts.map(product => {
        const price = parseFloat(product.price) || 0;
        const stockQuantity = parseInt(product.stock_quantity) || 0;
        
        let imageSrc = '';
        if (product.image_url) {
            imageSrc = validateImagePath(product.image_url);
            imageSrc += '?t=' + Date.now();
        }
        
        return `
        <tr>
            <td>${product.id}</td>
            <td>
                ${imageSrc ? 
                    `<img src="${imageSrc}" alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjI1IiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTkE8L3RleHQ+Cjwvc3ZnPgo='">` :
                    `<div style="width: 50px; height: 50px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                        <small class="text-muted">No Image</small>
                     </div>`
                }
            </td>
            <td>${product.name || 'N/A'}</td>
            <td>
                <span class="badge bg-secondary">${product.category || 'Uncategorized'}</span>
            </td>
            <td>$${price.toFixed(2)}</td>
            <td>
                <span class="badge ${getStockBadgeClass(stockQuantity)}">
                    ${stockQuantity}
                </span>
            </td>
            <td>
                <span class="badge ${getStatusBadgeClass(stockQuantity)}">
                    ${getStatusText(stockQuantity)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-btn" 
                        data-id="${product.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger delete-btn" 
                        data-id="${product.id}" 
                        data-name="${product.name}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
        `;
    }).join('');

    // Reattach event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            editProduct(productId);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            const productName = this.getAttribute('data-name');
            deleteProduct(productId, productName);
        });
    });
}

    function setupEventListeners() {
        addProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await addProduct();
        });

        editProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateProduct();
        });

        setupImagePathValidation();
    }

    function setupImagePathValidation() {
        const imageInput = document.getElementById('productImage');
        const editImageInput = document.getElementById('editProductImage');
        
        if (imageInput) {
            imageInput.addEventListener('blur', function() {
                const validatedPath = validateImagePath(this.value);
                if (this.value && !validatedPath) {
                    this.classList.add('is-invalid');
                } else {
                    this.classList.remove('is-invalid');
                }
            });
        }
        
        if (editImageInput) {
            editImageInput.addEventListener('blur', function() {
                const validatedPath = validateImagePath(this.value);
                if (this.value && !validatedPath) {
                    this.classList.add('is-invalid');
                } else {
                    this.classList.remove('is-invalid');
                }
            });
        }
    }

    function setupImageHandling() {
        const imageFileInput = document.getElementById('productImageFile');
        if (imageFileInput) {
            imageFileInput.addEventListener('change', function() {
                const fileName = this.files[0] ? this.files[0].name : 'No file chosen';
                document.getElementById('productImage').value = fileName;
            });
        }
    }

    async function addProduct() {
        const rawImagePath = document.getElementById('productImage').value;
        const validatedImagePath = validateImagePath(rawImagePath);
        
        if (rawImagePath && !validatedImagePath) {
            showNotification('Please enter a valid image path', 'error');
            return;
        }

        const formData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            image_url: validatedImagePath,
            stock_quantity: parseInt(document.getElementById('productStock').value),
            category: document.getElementById('productCategory').value
        };

        try {
            const response = await fetch('http://localhost:3000/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || `HTTP error! status: ${response.status}`);
            }

            if (result.product) {
                products.push(result.product);
            } else if (result.id) {
                products.push(result);
            }
            
            addProductForm.reset();
            addProductModal.hide();
            displayProductsTable();
            showNotification('Product added successfully!', 'success');
            
        } catch (error) {
            console.error('Error adding product:', error.message);
            showNotification(`Error adding product: ${error.message}`, 'error');
        }
    }

    function editProduct(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) {
            showNotification('Product not found!', 'error');
            return;
        }

        const imageValue = reverseImagePath(product.image_url || '');

        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name || '';
        document.getElementById('editProductDescription').value = product.description || '';
        document.getElementById('editProductPrice').value = product.price || '';
        document.getElementById('editProductStock').value = product.stock_quantity || '';
        document.getElementById('editProductImage').value = imageValue;
        document.getElementById('editProductCategory').value = product.category || '';

        editProductModal.show();
    }

    async function updateProduct() {
        try {
            const productId = parseInt(document.getElementById('editProductId').value);
            
            const rawImagePath = document.getElementById('editProductImage').value;
            const validatedImagePath = validateImagePath(rawImagePath);
            
            if (rawImagePath && !validatedImagePath) {
                showNotification('Please enter a valid image path', 'error');
                return;
            }

            const formData = {
                name: document.getElementById('editProductName').value,
                description: document.getElementById('editProductDescription').value,
                price: parseFloat(document.getElementById('editProductPrice').value),
                image_url: validatedImagePath,
                stock_quantity: parseInt(document.getElementById('editProductStock').value),
                category: document.getElementById('editProductCategory').value
            };

            const response = await fetch(`http://localhost:3000/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Update failed');
            }

            await loadProducts();
            editProductModal.hide();
            showNotification('Product updated successfully!', 'success');
            
        } catch (error) {
            console.error('Error updating product:', error.message);
            showNotification(`Error updating product: ${error.message}`, 'error');
        }
    }

    async function deleteProduct(productId, productName) {
        const result = await Swal.fire({
            title: 'Are you sure?',
            html: `You are about to delete <strong>"${productName}"</strong><br>This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`http://localhost:3000/api/products/${productId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            products = products.filter(p => p.id !== productId);
            displayProductsTable();
            
            Swal.fire({
                title: 'Deleted!',
                text: 'Product has been deleted successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            
        } catch (error) {
            console.error('Error deleting product:', error.message);
            Swal.fire({
                title: 'Error!',
                text: `Error deleting product: ${error.message}`,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
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
                    <div class="toast-body">
                        ${message}
                    </div>
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

    window.adminProducts = {
        loadProducts,
        addProduct,
        editProduct,
        deleteProduct
    };
});