/**
 * Authentication Handler
 * Manages user authentication flows, form validation, and UI updates
 */

class AuthHandler {
    constructor() {
        this.api = window.quantumAPI;
        this.init();
    }

    init() {
        // Check if user is already authenticated
        if (this.api.isAuthenticated()) {
            this.redirectToDashboard();
        }

        // Bind form events
        this.bindEvents();
    }

    bindEvents() {
        // Sign in form
        const signinForm = document.querySelector('#signin-form');
        if (signinForm) {
            signinForm.addEventListener('submit', this.handleSignIn.bind(this));
        }

        // Step 1 registration form
        const step1Form = document.querySelector('#step1-form');
        if (step1Form) {
            step1Form.addEventListener('submit', this.handleStep1.bind(this));
        }

        // Step 2 registration form
        const step2Form = document.querySelector('#step2-form');
        if (step2Form) {
            step2Form.addEventListener('submit', this.handleStep2.bind(this));
            
            // Password strength validation
            const passwordInput = document.querySelector('#password');
            if (passwordInput) {
                passwordInput.addEventListener('input', this.validatePasswordStrength.bind(this));
            }
        }

        // Step 3 registration form
        const step3Form = document.querySelector('#step3-form');
        if (step3Form) {
            step3Form.addEventListener('submit', this.handleStep3.bind(this));
        }

        // Logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.logout-btn, [data-action="logout"]')) {
                e.preventDefault();
                this.handleLogout();
            }
        });
    }

    // ==================== FORM HANDLERS ====================

    async handleSignIn(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = formData.get('remember-me');

        // Show loading state
        this.setFormLoading(form, true);

        try {
            // Validate inputs
            if (!this.api.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (!password) {
                throw new Error('Password is required');
            }

            // Attempt login
            const response = await this.api.login(email, password);
            
            // Handle remember me functionality
            if (rememberMe) {
                localStorage.setItem('quantum_remember_me', 'true');
            }

            // Show success message
            this.showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1500);

        } catch (error) {
            this.showMessage(error.message, 'error');
            this.setFormLoading(form, false);
        }
    }

    async handleStep1(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const firstName = formData.get('first-name');
        const lastName = formData.get('last-name');
        const email = formData.get('email');

        // Validate inputs
        if (!firstName || !lastName) {
            this.showMessage('Please enter your first and last name', 'error');
            return;
        }

        if (!this.api.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        // Store data for next steps
        sessionStorage.setItem('quantum_signup_data', JSON.stringify({
            name: `${firstName} ${lastName}`,
            email: email
        }));

        // Proceed to step 2
        window.location.href = 'create-account-step2.html';
    }

    async handleStep2(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');

        // Validate password
        const passwordValidation = this.api.validatePassword(password);
        if (!passwordValidation.isValid) {
            this.showMessage('Password does not meet security requirements', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        // Store password for final signup
        const signupData = JSON.parse(sessionStorage.getItem('quantum_signup_data') || '{}');
        signupData.password = password;
        sessionStorage.setItem('quantum_signup_data', JSON.stringify(signupData));

        // Proceed to step 3
        window.location.href = 'create-account-step3.html';
    }

    async handleStep3(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const phoneNumber = formData.get('phone-number');
        const termsAccepted = formData.get('terms');
        const marketingOptIn = formData.get('marketing');

        // Validate terms acceptance
        if (!termsAccepted) {
            this.showMessage('You must accept the Terms of Service to continue', 'error');
            return;
        }

        // Show loading state
        this.setFormLoading(form, true);

        try {
            // Get stored signup data
            const signupData = JSON.parse(sessionStorage.getItem('quantum_signup_data') || '{}');
            
            if (!signupData.name || !signupData.email || !signupData.password) {
                throw new Error('Registration data is incomplete. Please start over.');
            }

            // Complete signup
            const response = await this.api.signup(
                signupData.name, 
                signupData.email, 
                signupData.password
            );

            // Clear stored data
            sessionStorage.removeItem('quantum_signup_data');

            // Store additional preferences
            if (phoneNumber) {
                localStorage.setItem('quantum_phone', phoneNumber);
            }
            if (marketingOptIn) {
                localStorage.setItem('quantum_marketing_opt_in', 'true');
            }

            // Show success message
            this.showMessage('Account created successfully! Redirecting to dashboard...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '../dashboard/dashboard-getstarted.html';
            }, 2000);

        } catch (error) {
            this.showMessage(error.message, 'error');
            this.setFormLoading(form, false);
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.api.logout();
        }
    }

    // ==================== VALIDATION METHODS ====================

    validatePasswordStrength(event) {
        const password = event.target.value;
        const validation = this.api.validatePassword(password);
        
        // Update strength indicator
        const strengthIndicator = document.querySelector('.strength-indicator');
        if (strengthIndicator) {
            strengthIndicator.textContent = validation.strength.charAt(0).toUpperCase() + validation.strength.slice(1);
            strengthIndicator.className = `strength-indicator ${validation.strength}`;
        }

        // Update requirement checklist
        const requirements = document.querySelectorAll('.password-requirements li');
        const reqKeys = ['minLength', 'hasUppercase', 'hasLowercase', 'hasNumbers', 'hasSpecialChars'];
        
        requirements.forEach((req, index) => {
            const isValid = validation.requirements[reqKeys[index]];
            req.className = isValid ? 'valid' : 'invalid';
        });
    }

    // ==================== UI HELPER METHODS ====================

    setFormLoading(form, isLoading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            if (isLoading) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Processing...</span>';
                submitBtn.style.opacity = '0.7';
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.getAttribute('data-original-text') || 'Submit';
                submitBtn.style.opacity = '1';
            }
        }
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `auth-message auth-message--${type}`;
        messageEl.innerHTML = `
            <div class="auth-message__content">
                <span class="auth-message__text">${message}</span>
                <button class="auth-message__close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;

        // Add styles
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        // Add animation styles if not already present
        if (!document.querySelector('#auth-message-styles')) {
            const styles = document.createElement('style');
            styles.id = 'auth-message-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .auth-message__content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .auth-message__close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: 12px;
                    padding: 0;
                    line-height: 1;
                }
                .auth-message__close:hover {
                    opacity: 0.8;
                }
            `;
            document.head.appendChild(styles);
        }

        // Insert message
        document.body.appendChild(messageEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.remove();
            }
        }, 5000);
    }

    redirectToDashboard() {
        // Check if we're already on a dashboard page
        if (window.location.pathname.includes('/dashboard/')) {
            return;
        }
        
        window.location.href = '/dashboard/dashboard-main.html';
    }

    // ==================== INITIALIZATION CHECKS ====================

    async checkAuthStatus() {
        if (!this.api.isAuthenticated()) {
            return false;
        }

        try {
            // Verify token is still valid
            await this.api.getCurrentUser();
            return true;
        } catch (error) {
            // Token is invalid, clear it
            this.api.clearAuthToken();
            return false;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authHandler = new AuthHandler();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthHandler;
}
