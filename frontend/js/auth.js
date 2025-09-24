// Authentication functionality with API integration
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

// API base URL - adjust this to match your server
const API_BASE_URL = 'http://localhost:3000/api'; // Change to your server URL

function initializeAuth() {
    // Password toggle functionality
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
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

    // Password strength indicator and matching
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }

    // Form submissions
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

function checkPasswordStrength() {
    const password = this.value;
    const strengthFill = document.querySelector('.strength-fill');
    const strengthValue = document.getElementById('strengthValue');
    
    if (!strengthFill || !strengthValue) return;

    let strength = 0;
    let level = 'weak';
    let color = '#e74c3c';

    // Check password criteria
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;

    if (strength >= 75) {
        level = 'strong';
        color = '#27ae60';
    } else if (strength >= 50) {
        level = 'medium';
        color = '#f39c12';
    }

    strengthFill.className = 'strength-fill ' + level;
    strengthFill.style.backgroundColor = color;
    strengthValue.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    strengthValue.style.color = color;
}

function checkPasswordMatch() {
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = this.value;
    const matchMessage = document.getElementById('passwordMatch');
    
    if (!matchMessage) return;

    if (confirmPassword === '') {
        matchMessage.textContent = '';
        matchMessage.className = 'validation-message';
    } else if (password === confirmPassword) {
        matchMessage.textContent = '✓ Passwords match';
        matchMessage.className = 'validation-message valid';
    } else {
        matchMessage.textContent = '✗ Passwords do not match';
        matchMessage.className = 'validation-message invalid';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password'),
        remember: formData.get('remember') === 'on'
    };

    const btn = e.target.querySelector('.auth-btn');
    showLoading(btn);

    try {
        // Send login request to backend
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Store user session
            localStorage.setItem('user', JSON.stringify({
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.first_name,
                lastName: result.user.last_name,
                role: result.user.role,
                loggedIn: true,
                timestamp: Date.now()
            }));

            // Show success message
            showSuccess('Login successful! Redirecting...');
            
            // Redirect based on role
            setTimeout(() => {
                if (result.user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1500);
        } else {
            showError(result.message || 'Login failed. Please try again.');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please check your connection and try again.');
    } finally {
        hideLoading(btn);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: 'customer' // Default role
    };

    // Frontend validation
    const validation = validateRegistration(data);
    if (!validation.isValid) {
        showError(validation.message);
        return;
    }

    const btn = e.target.querySelector('.auth-btn');
    showLoading(btn);

    try {
        console.log('Sending registration request:', data);
        
        // Send registration request to backend
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('Registration response:', result);

        if (response.ok && result.success) {
            // Show success modal
            showSuccessModal();
            
            // Store user session
            localStorage.setItem('user', JSON.stringify({
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.first_name,
                lastName: result.user.last_name,
                role: result.user.role,
                loggedIn: true,
                timestamp: Date.now()
            }));
            
        } else {
            showError(result.message || 'Registration failed. Please try again.');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showError('Registration failed. Please check your connection and try again.');
    } finally {
        hideLoading(btn);
    }
}

function validateRegistration(data) {
    // Check required fields
    if (!data.first_name || !data.last_name || !data.email || !data.password) {
        return { isValid: false, message: 'All fields are required' };
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }

    // Check password length
    if (data.password.length < 6) {
        return { isValid: false, message: 'Password must be at least 6 characters long' };
    }

    // Check if passwords match (for registration)
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    if (data.password !== confirmPassword) {
        return { isValid: false, message: 'Passwords do not match' };
    }

    // Check terms agreement
    const termsChecked = document.getElementById('terms')?.checked;
    if (!termsChecked) {
        return { isValid: false, message: 'Please accept the terms and conditions' };
    }

    return { isValid: true, message: '' };
}

// Utility functions
function showLoading(btn) {
    if (!btn) return;
    btn.disabled = true;
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'block';
}

function hideLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    if (btnText) btnText.style.display = 'block';
    if (btnLoader) btnLoader.style.display = 'none';
}

function showError(message) {
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorDiv.style.cssText = `
        background: #fee;
        color: #c33;
        padding: 12px;
        border-radius: 8px;
        margin: 15px 0;
        border: 1px solid #fcc;
        display: flex;
        align-items: center;
        gap: 10px;
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

function showSuccess(message) {
    // Remove any existing success messages
    const existingSuccess = document.querySelectorAll('.success-message');
    existingSuccess.forEach(success => success.remove());
    
    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successDiv.style.cssText = `
        background: #efe;
        color: #363;
        padding: 12px;
        border-radius: 8px;
        margin: 15px 0;
        border: 1px solid #cfc;
        display: flex;
        align-items: center;
        gap: 10px;
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

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
        // Redirect to home page
        window.location.href = 'index.html';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('successModal');
    if (event.target === modal) {
        closeModal();
    }
}