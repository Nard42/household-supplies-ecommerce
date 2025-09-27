// This is a placeholder for your backend API endpoint
const API_URL = 'http://localhost:3000/api/products';
const productListElement = document.getElementById('product-list');
const paginationControlsElement = document.getElementById('pagination-controls');

// 1. Function to create a single product card (using a template literal)
// Required ES6+ features: arrow function, template literals, destructuring
const createProductCard = (product) => {
    // Required ES6+ feature: destructuring 
    const { id, name, supplier, price, imageUrl, link } = product;

    return `
        <div class="product-card" data-product-id="${id}">
            <a href="${link}" aria-label="View product: ${name}">
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="${name} from ${supplier}">
                    <button class="wishlist-btn" aria-label="Add to wishlist">
                        <i class="fa-regular fa-heart"></i>
                    </button>
                </div>
            </a>
            <p class="product-supplier">${supplier}</p>
            <h3 class="product-title">${name}</h3>
            <p class="product-price">${price}</p>
        </div>
    `;
};

// 2. Function to fetch and render products dynamically
// Required ES6+ features: async/await with fetch 
const fetchAndRenderProducts = async (page = 1, sort = 'featured') => {
    productListElement.innerHTML = '<h2>Loading Products...</h2>';
    paginationControlsElement.innerHTML = '';
    
    try {
        const response = await fetch(`${API_URL}?page=${page}&sort=${sort}`);
        // Required ES6+ feature: object destructuring in function parameter default value is NOT possible for API response, so we destructure here.
        const { products, currentPage, totalPages } = await response.json(); 

        // Clear loading message and render products
        productListElement.innerHTML = '';
        products.forEach(product => {
            productListElement.innerHTML += createProductCard(product);
        });

        // Update pagination controls
        renderPagination(currentPage, totalPages);

    } catch (error) {
        console.error('Failed to fetch products:', error);
        productListElement.innerHTML = '<h2>Error loading products. Please try again later.</h2>';
    }
};

// 3. Function to render pagination controls
const renderPagination = (currentPage, totalPages) => {
    paginationControlsElement.innerHTML = '';
    
    // Add the Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'page-button next-prev';
    prevButton.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
    // Disable if on the first page
    if (currentPage === 1) prevButton.disabled = true; 
    
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchAndRenderProducts(currentPage - 1, document.getElementById('sort-select').value);
        }
    });
    paginationControlsElement.appendChild(prevButton);

    // Render page numbers (simplified to show 1, 2, 3, ...)
    const pagesToShow = Math.min(totalPages, 5);
    for (let i = 1; i <= pagesToShow; i++) {
        const button = document.createElement('button');
        button.className = `page-button ${i === currentPage ? 'active' : ''}`;
        button.textContent = i;
        button.addEventListener('click', () => {
            fetchAndRenderProducts(i, document.getElementById('sort-select').value);
        });
        // Event listener can be added here to handle page change
        paginationControlsElement.appendChild(button);
    }

    if (totalPages > 5) {
        const dots = document.createElement('span');
        dots.className = 'dots';
        dots.textContent = '...';
        paginationControlsElement.appendChild(dots);

        const lastPageButton = document.createElement('button');
        lastPageButton.className = 'page-button';
        lastPageButton.textContent = totalPages;
        lastPageButton.addEventListener('click', () => {
            fetchAndRenderProducts(totalPages, document.getElementById('sort-select').value);
        });
        paginationControlsElement.appendChild(lastPageButton);
    }

    // Add the Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'page-button next-prev';
    nextButton.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
    // Disable if on the last page
    if (currentPage === totalPages) nextButton.disabled = true; 
    
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            fetchAndRenderProducts(currentPage + 1, document.getElementById('sort-select').value);
        }
    });
    paginationControlsElement.appendChild(nextButton);
};


// --- NEW: Sign-in Panel Functions ---

/**
 * Opens the sign-in slide panel by adding the 'is-open' class.
 */
const openSignInPanel = () => {
    const panel = document.getElementById('sign-in-panel');
    const overlay = document.getElementById('sign-in-overlay');
    if (panel && overlay) {
        panel.classList.add('is-open');
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden'; // Prevent scrolling the main body
        panel.focus(); // Set focus to the panel for accessibility
    }
};

/**
 * Closes the sign-in slide panel by removing the 'is-open' class.
 */
const closeSignInPanel = () => {
    const panel = document.getElementById('sign-in-panel');
    const overlay = document.getElementById('sign-in-overlay');
    if (panel && overlay) {
        panel.classList.remove('is-open');
        overlay.classList.remove('is-open');
        document.body.style.overflow = ''; // Restore scrolling
    }
};

// 4. Initialization (The main execution point)
// Required ES6+ feature: arrow function for DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    // Initial load of products on page load
    fetchAndRenderProducts(1); 
    
    // Add event listeners for sorting (Filter/Search functionality is required [cite: 31])
    document.getElementById('sort-select').addEventListener('change', (e) => {
        // Re-fetch products with the new sorting parameter
        fetchAndRenderProducts(1, e.target.value);
    });

    // You will need to add listeners for the pagination controls, search bar, etc.

    // --- NEW: Sign-in Panel Event Listeners ---
    
    const signInIconBtn = document.getElementById('sign-in-icon-btn');
    const closeSignInBtn = document.getElementById('close-sign-in-btn');
    const signInOverlay = document.getElementById('sign-in-overlay');

    // 1. Open panel when user icon is clicked
    if (signInIconBtn) {
        signInIconBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            openSignInPanel();
        });
    }

    // 2. Close panel when the close button is clicked
    if (closeSignInBtn) {
        closeSignInBtn.addEventListener('click', closeSignInPanel);
    }

    // 3. Close panel when overlay is clicked
    if (signInOverlay) {
        signInOverlay.addEventListener('click', closeSignInPanel);
    }
    
    // 4. Close panel when ESC key is pressed
    document.addEventListener('keydown', (e) => {
        const panel = document.getElementById('sign-in-panel');
        if (e.key === 'Escape' && panel && panel.classList.contains('is-open')) {
            closeSignInPanel();
        }
    });
});
