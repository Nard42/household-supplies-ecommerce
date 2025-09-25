// Admin-specific authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminAuth();
});

function initializeAdminAuth() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Add admin-specific password toggle
    const adminPasswordToggles = document.querySelectorAll('.admin-login-page .password-toggle');
    adminPasswordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
}

async function handleAdminLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        securityCode: formData.get('securityCode'),
        isAdmin: true // Flag to indicate admin login
    };

    // Admin-specific validation
    const validation = validateAdminLogin(data);
    if (!validation.isValid) {
        showAdminError(validation.message);
        return;
    }

    const btn = e.target.querySelector('.auth-btn');
    showLoading(btn);

    try {
        console.log('Sending admin login request:', { ...data, password: '***' });
        
        // Send admin login request to backend
        const response = await fetch(`${API_BASE_URL}/auth/admin-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('Admin login response:', result);

        if (response.ok && result.success) {
            // Verify admin role
            if (result.user.role !== 'admin') {
                showAdminError('Access denied: Administrator privileges required');
                return;
            }

            // Store admin session
            localStorage.setItem('admin', JSON.stringify({
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.first_name,
                lastName: result.user.last_name,
                role: result.user.role,
                adminLevel: result.user.admin_level,
                loggedIn: true,
                timestamp: Date.now(),
                isAdmin: true
            }));

            // Show success message
            showAdminSuccess('Admin authentication successful! Redirecting...');
            
            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);
            
        } else {
            showAdminError(result.message || 'Admin login failed. Please check your credentials.');
        }
        
    } catch (error) {
        console.error('Admin login error:', error);
        showAdminError('Admin login failed. Please check your connection and try again.');
    } finally {
        hideLoading(btn);
    }
}

function validateAdminLogin(data) {
    // Check required fields
    if (!data.firstName || !data.lastName || !data.email || !data.password) {
        return { isValid: false, message: 'All administrator fields are required' };
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return { isValid: false, message: 'Please enter a valid admin email address' };
    }

    // Additional admin email validation (optional)
    if (!data.email.includes('@')) {
        return { isValid: false, message: 'Admin email must be a company email address' };
    }

    return { isValid: true, message: '' };
}

function showAdminError(message) {
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.admin-error-message');
    existingErrors.forEach(error => error.remove());
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'admin-error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    errorDiv.style.cssText = `
        background: #ffebee;
        color: #c62828;
        padding: 12px;
        border-radius: 8px;
        margin: 15px 0;
        border: 1px solid #ffcdd2;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
    `;
    
    // Insert before the form
    const form = document.querySelector('.auth-form');
    if (form) {
        form.insertBefore(errorDiv, form.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

function showAdminSuccess(message) {
    // Remove any existing success messages
    const existingSuccess = document.querySelectorAll('.admin-success-message');
    existingSuccess.forEach(success => success.remove());
    
    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'admin-success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successDiv.style.cssText = `
        background: #e8f5e9;
        color: #2e7d32;
        padding: 12px;
        border-radius: 8px;
        margin: 15px 0;
        border: 1px solid #c8e6c9;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
    `;
    
    // Insert before the form
    const form = document.querySelector('.auth-form');
    if (form) {
        form.insertBefore(successDiv, form.firstChild);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
}