// Admin Portal JavaScript
const API_BASE_URL = 'http://localhost:3000/api';
const MASTER_PASSWORD = "123456"; // Change this to your preferred master password
const USED_PASSWORDS = new Set(); // Track used passwords

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPortal();
});

function initializeAdminPortal() {
    // Master password form
    const masterPasswordForm = document.getElementById('masterPasswordForm');
    const adminRegistrationForm = document.getElementById('adminRegistrationForm');
    const generatePasswordBtn = document.getElementById('generatePasswordBtn');
    const copyPasswordBtn = document.getElementById('copyPasswordBtn');
    const backToStep1Btn = document.getElementById('backToStep1');
    const createAnotherAdminBtn = document.getElementById('createAnotherAdmin');

    if (masterPasswordForm) {
        masterPasswordForm.addEventListener('submit', handleMasterPasswordVerification);
    }

    if (adminRegistrationForm) {
        adminRegistrationForm.addEventListener('submit', handleAdminRegistration);
    }

    if (generatePasswordBtn) {
        generatePasswordBtn.addEventListener('click', generateUniquePassword);
    }

    if (copyPasswordBtn) {
        copyPasswordBtn.addEventListener('click', copyPasswordToClipboard);
    }

    if (backToStep1Btn) {
        backToStep1Btn.addEventListener('click', () => showStep(1));
    }

    if (createAnotherAdminBtn) {
        createAnotherAdminBtn.addEventListener('click', () => {
            showStep(2);
            document.getElementById('adminRegistrationForm').reset();
            document.getElementById('passwordText').textContent = 'Click generate button';
            document.getElementById('copyPasswordBtn').style.display = 'none';
            document.getElementById('passwordStrength').style.display = 'none';
        });
    }

    // Password toggle
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
}

function handleMasterPasswordVerification(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const enteredPassword = formData.get('masterPassword');
    const btn = e.target.querySelector('.portal-access-btn');

    showLoading(btn);

    // Simulate verification delay
    setTimeout(() => {
        if (enteredPassword === MASTER_PASSWORD) {
            showStep(2);
            showSuccess('Master password verified successfully!',e.target);
        } else {
            showError('Invalid master password. Access denied.',e.target);
        }
        hideLoading(btn);
    }, 1000);
}

function generateUniquePassword() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password;
    let attempts = 0;
    const maxAttempts = 100;

    // Generate unique password
    do {
        password = '';
        for (let i = 0; i < 12; i++) {
            password += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        attempts++;
    } while (USED_PASSWORDS.has(password) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
        showError('Could not generate unique password. Please try again.');
        return;
    }

    USED_PASSWORDS.add(password);
    
    // Display password
    const passwordText = document.getElementById('passwordText');
    const copyBtn = document.getElementById('copyPasswordBtn');
    const strengthMeter = document.getElementById('passwordStrength');
    
    passwordText.textContent = password;
    copyBtn.style.display = 'block';
    strengthMeter.style.display = 'block';
    
    // Update strength meter
    updatePasswordStrength(password);
}

function updatePasswordStrength(password) {
    let strength = 0;
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    // Check password criteria
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const strengthPercent = (strength / 5) * 100;
    
    // Update visual strength meter
    strengthFill.style.width = strengthPercent + '%';
    
    // Set color and text based on strength
    if (strengthPercent < 40) {
        strengthFill.style.background = '#f44336';
        strengthText.textContent = 'Weak';
        strengthText.style.color = '#f44336';
    } else if (strengthPercent < 80) {
        strengthFill.style.background = '#ff9800';
        strengthText.textContent = 'Good';
        strengthText.style.color = '#ff9800';
    } else {
        strengthFill.style.background = '#4caf50';
        strengthText.textContent = 'Strong';
        strengthText.style.color = '#4caf50';
    }
}

function copyPasswordToClipboard() {
    const passwordText = document.getElementById('passwordText').textContent;
    
    navigator.clipboard.writeText(passwordText).then(() => {
        const copyBtn = document.getElementById('copyPasswordBtn');
        const originalIcon = copyBtn.innerHTML;
        
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        copyBtn.style.color = '#4caf50';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalIcon;
            copyBtn.style.color = '';
        }, 2000);
    });
}

async function handleAdminRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const generatedPassword = document.getElementById('passwordText').textContent;
    
    if (generatedPassword === 'Click generate button') {
        showError('Please generate a password first.',e.target);
        return;
    }

    const data = {
        first_name: formData.get('firstName'),  // Change to match backend
        last_name: formData.get('lastName'),    // Change to match backend
        email: formData.get('email'),
        password: generatedPassword,
        role: 'admin'
    };

    const btn = e.target.querySelector('.portal-create-btn');
    showLoading(btn);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();

        if (result.success) {
            showAdminCredentials(result.user, generatedPassword);
            showStep(3);
        } else {
            showError(result.message || 'Failed to create admin user',e.target);
            USED_PASSWORDS.delete(generatedPassword);
        }
        
    } catch (error) {
        console.error('Admin registration error:', error);
        showError('Registration failed: ' + error.message,e.target);
        USED_PASSWORDS.delete(generatedPassword);
    } finally {
        hideLoading(btn);
    }
}

function showAdminCredentials(user, password) {
    const credentialsDiv = document.getElementById('adminCredentials');
    credentialsDiv.innerHTML = `
        <div class="credential-item">
            <span class="credential-label">Full Name:</span>
            <span class="credential-value">${user.first_name} ${user.last_name}</span>
        </div>
        <div class="credential-item">
            <span class="credential-label">Email Address:</span>
            <span class="credential-value">${user.email}</span>
        </div>
        <div class="credential-item">
            <span class="credential-label">Password:</span>
            <span class="credential-value password">${password}</span>
        </div>
        <div class="credential-item">
            <span class="credential-label">User Role:</span>
            <span class="credential-value role">${user.role.toUpperCase()}</span>
        </div>
    `;
}

function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.portal-step').forEach(step => {
        step.style.display = 'none';
    });
    
    // Show selected step
    document.getElementById(`step${stepNumber}`).style.display = 'block';
}

function showError(message, formElement = null) {
    // Remove any existing error notifications in forms
    const existingErrors = document.querySelectorAll('.form-error');
    existingErrors.forEach(error => error.remove());

    // Create error container
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <div class="form-error-content">${message}</div>
        <button class="form-error-close">&times;</button>
    `;

    // Determine where to place the error
    let insertLocation;
    if (formElement) {
        // Insert at the top of the specific form
        insertLocation = formElement;
    } else {
        // Insert at the top of the current step
        const currentStep = document.querySelector('.portal-step[style*="display: block"]');
        insertLocation = currentStep.querySelector('form') || currentStep;
    }

    // Insert the error message at the top of the form/step
    if (insertLocation.querySelector('form')) {
        insertLocation.querySelector('form').insertBefore(errorDiv, insertLocation.querySelector('form').firstChild);
    } else {
        insertLocation.insertBefore(errorDiv, insertLocation.firstChild);
    }

    // Auto-remove after 5 seconds
    const autoRemove = setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);

    // Close button functionality
    errorDiv.querySelector('.form-error-close').addEventListener('click', () => {
        clearTimeout(autoRemove);
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    });
}

function showSuccessMessage(message, formElement = null) {
    // Remove any existing errors
    const existingErrors = document.querySelectorAll('.form-error');
    existingErrors.forEach(error => error.remove());

    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'form-success';
    successDiv.style.cssText = `
        background: #d4edda;
        color: #155724;
        padding: 12px 15px;
        border-radius: 6px;
        border: 1px solid #c3e6cb;
        margin: 15px 0;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: fadeIn 0.3s ease-out;
    `;
    
    successDiv.innerHTML = `
        <i class="fas fa-check-circle" style="color: #155724;"></i>
        <div style="font-weight: 500; font-size: 14px;">${message}</div>
    `;

    // Insert at the top of the form/step
    let insertLocation;
    if (formElement) {
        insertLocation = formElement;
    } else {
        const currentStep = document.querySelector('.portal-step[style*="display: block"]');
        insertLocation = currentStep.querySelector('form') || currentStep;
    }

    if (insertLocation.querySelector('form')) {
        insertLocation.querySelector('form').insertBefore(successDiv, insertLocation.querySelector('form').firstChild);
    } else {
        insertLocation.insertBefore(successDiv, insertLocation.firstChild);
    }

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

function showLoading(button) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    button.disabled = true;
}

function hideLoading(button) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    btnText.style.display = 'block';
    btnLoader.style.display = 'none';
    button.disabled = false;
}