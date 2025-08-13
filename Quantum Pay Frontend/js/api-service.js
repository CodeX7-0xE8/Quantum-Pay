/**
 * Quantum Pay API Service
 * Handles all API communications with Xano backend
 */

class QuantumPayAPI {
    constructor() {
        this.authBaseURL = 'https://x8ki-letl-twmt.n7.xano.io/api:Yh3BvUig';
        this.transactionBaseURL = 'https://x8ki-letl-twmt.n7.xano.io/api:1i6yBSwb';
        this.authToken = localStorage.getItem('quantum_auth_token');
    }

    // Helper method to make HTTP requests
    async makeRequest(url, options = {}) {
        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        // Add auth token if available
        if (this.authToken) {
            defaultHeaders['Authorization'] = `Bearer ${this.authToken}`;
        }

        const config = {
            headers: { ...defaultHeaders, ...options.headers },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Handle empty responses
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Set auth token
    setAuthToken(token) {
        this.authToken = token;
        localStorage.setItem('quantum_auth_token', token);
    }

    // Clear auth token
    clearAuthToken() {
        this.authToken = null;
        localStorage.removeItem('quantum_auth_token');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.authToken;
    }

    // ==================== AUTHENTICATION ENDPOINTS ====================

    /**
     * Login user and retrieve authentication token
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Authentication response with token
     */
    async login(email, password) {
        const response = await this.makeRequest(`${this.authBaseURL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (response.authToken) {
            this.setAuthToken(response.authToken);
        }

        return response;
    }

    /**
     * Sign up new user and retrieve authentication token
     * @param {string} name - User full name
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Authentication response with token
     */
    async signup(name, email, password) {
        const response = await this.makeRequest(`${this.authBaseURL}/auth/signup`, {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        if (response.authToken) {
            this.setAuthToken(response.authToken);
        }

        return response;
    }

    /**
     * Get current user information
     * @returns {Promise<Object>} User data
     */
    async getCurrentUser() {
        return await this.makeRequest(`${this.authBaseURL}/auth/me`, {
            method: 'GET'
        });
    }

    /**
     * Logout user (clear local token)
     */
    logout() {
        this.clearAuthToken();
        // Redirect to login page
        window.location.href = '/main/sign-in page.html';
    }

    // ==================== TRANSACTION ENDPOINTS ====================

    /**
     * Create a new transaction
     * @param {Object} transactionData - Transaction details
     * @returns {Promise<Object>} Created transaction
     */
    async createTransaction(transactionData) {
        return await this.makeRequest(`${this.transactionBaseURL}/transaction`, {
            method: 'POST',
            body: JSON.stringify(transactionData)
        });
    }

    /**
     * Get all transactions for current user
     * @returns {Promise<Array>} List of transactions
     */
    async getAllTransactions() {
        return await this.makeRequest(`${this.transactionBaseURL}/transaction`, {
            method: 'GET'
        });
    }

    /**
     * Get specific transaction by ID
     * @param {string} transactionId - Transaction UUID
     * @returns {Promise<Object>} Transaction details
     */
    async getTransaction(transactionId) {
        return await this.makeRequest(`${this.transactionBaseURL}/transaction/${transactionId}`, {
            method: 'GET'
        });
    }

    /**
     * Update transaction
     * @param {string} transactionId - Transaction UUID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated transaction
     */
    async updateTransaction(transactionId, updateData) {
        return await this.makeRequest(`${this.transactionBaseURL}/transaction/${transactionId}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });
    }

    /**
     * Delete transaction
     * @param {string} transactionId - Transaction UUID
     * @returns {Promise<void>}
     */
    async deleteTransaction(transactionId) {
        return await this.makeRequest(`${this.transactionBaseURL}/transaction/${transactionId}`, {
            method: 'DELETE'
        });
    }

    // ==================== WEBHOOK LOG ENDPOINTS ====================

    /**
     * Create webhook log entry
     * @param {Object} webhookData - Webhook log data
     * @returns {Promise<Object>} Created webhook log
     */
    async createWebhookLog(webhookData) {
        return await this.makeRequest(`${this.transactionBaseURL}/webhook_log`, {
            method: 'POST',
            body: JSON.stringify(webhookData)
        });
    }

    /**
     * Get all webhook logs
     * @returns {Promise<Array>} List of webhook logs
     */
    async getAllWebhookLogs() {
        return await this.makeRequest(`${this.transactionBaseURL}/webhook_log`, {
            method: 'GET'
        });
    }

    /**
     * Get specific webhook log by ID
     * @param {string} webhookLogId - Webhook log UUID
     * @returns {Promise<Object>} Webhook log details
     */
    async getWebhookLog(webhookLogId) {
        return await this.makeRequest(`${this.transactionBaseURL}/webhook_log/${webhookLogId}`, {
            method: 'GET'
        });
    }

    /**
     * Update webhook log
     * @param {string} webhookLogId - Webhook log UUID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated webhook log
     */
    async updateWebhookLog(webhookLogId, updateData) {
        return await this.makeRequest(`${this.transactionBaseURL}/webhook_log/${webhookLogId}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });
    }

    /**
     * Delete webhook log
     * @param {string} webhookLogId - Webhook log UUID
     * @returns {Promise<void>}
     */
    async deleteWebhookLog(webhookLogId) {
        return await this.makeRequest(`${this.transactionBaseURL}/webhook_log/${webhookLogId}`, {
            method: 'DELETE'
        });
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Format currency amount
     * @param {number} amount - Amount in cents
     * @param {string} currency - Currency code (default: USD)
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount / 100);
    }

    /**
     * Generate OTP code
     * @returns {string} 6-digit OTP code
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result with strength and requirements
     */
    validatePassword(password) {
        const requirements = {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const passedCount = Object.values(requirements).filter(Boolean).length;
        let strength = 'weak';
        
        if (passedCount >= 4) strength = 'strong';
        else if (passedCount >= 3) strength = 'medium';

        return {
            strength,
            requirements,
            isValid: passedCount >= 4
        };
    }
}

// Create global instance
window.quantumAPI = new QuantumPayAPI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuantumPayAPI;
}
