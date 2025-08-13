/**
 * Transaction Handler
 * Manages transaction operations, display, and real-time updates
 */

class TransactionHandler {
    constructor() {
        this.api = window.quantumAPI;
        this.transactions = [];
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check authentication
        if (!this.api.isAuthenticated()) {
            window.location.href = '/main/sign-in page.html';
            return;
        }

        try {
            // Get current user info
            this.currentUser = await this.api.getCurrentUser();
            
            // Load transactions
            await this.loadTransactions();
            
            // Bind events
            this.bindEvents();
            
            // Update UI
            this.updateDashboard();
            
        } catch (error) {
            console.error('Failed to initialize transaction handler:', error);
            this.showError('Failed to load transaction data');
        }
    }

    bindEvents() {
        // Send money form
        const sendMoneyForm = document.querySelector('#send-money-form');
        if (sendMoneyForm) {
            sendMoneyForm.addEventListener('submit', this.handleSendMoney.bind(this));
        }

        // Transaction filter/search
        const searchInput = document.querySelector('#transaction-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.filterTransactions.bind(this));
        }

        const filterSelect = document.querySelector('#transaction-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', this.filterTransactions.bind(this));
        }

        // Refresh button
        document.addEventListener('click', (e) => {
            if (e.target.matches('.refresh-transactions, [data-action="refresh-transactions"]')) {
                e.preventDefault();
                this.loadTransactions();
            }
        });

        // Transaction details modal
        document.addEventListener('click', (e) => {
            if (e.target.matches('.transaction-item, .transaction-row')) {
                const transactionId = e.target.getAttribute('data-transaction-id');
                if (transactionId) {
                    this.showTransactionDetails(transactionId);
                }
            }
        });

        // OTP verification
        document.addEventListener('click', (e) => {
            if (e.target.matches('.verify-otp-btn')) {
                const transactionId = e.target.getAttribute('data-transaction-id');
                this.showOTPModal(transactionId);
            }
        });
    }

    // ==================== TRANSACTION OPERATIONS ====================

    async loadTransactions() {
        try {
            this.showLoading(true);
            this.transactions = await this.api.getAllTransactions();
            this.renderTransactions();
            this.updateDashboardStats();
        } catch (error) {
            console.error('Failed to load transactions:', error);
            this.showError('Failed to load transactions');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSendMoney(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const transactionData = {
            amount: parseFloat(formData.get('amount')) * 100, // Convert to cents
            currency: formData.get('currency') || 'USD',
            receiver_user_id: formData.get('receiver_id') || formData.get('receiver_email'),
            sender_user_id: this.currentUser.id,
            status: 'pending',
            transaction_date: Date.now(),
            otp_code: this.api.generateOTP(),
            otp_verified: false
        };

        // Validate inputs
        if (!transactionData.amount || transactionData.amount <= 0) {
            this.showError('Please enter a valid amount');
            return;
        }

        if (!transactionData.receiver_user_id) {
            this.showError('Please enter recipient information');
            return;
        }

        try {
            this.setFormLoading(form, true);
            
            // Create transaction
            const newTransaction = await this.api.createTransaction(transactionData);
            
            // Show OTP verification modal
            this.showOTPModal(newTransaction.id);
            
            // Refresh transactions
            await this.loadTransactions();
            
            // Reset form
            form.reset();
            
            this.showSuccess('Transaction initiated! Please verify with OTP.');
            
        } catch (error) {
            console.error('Transaction failed:', error);
            this.showError(error.message || 'Transaction failed');
        } finally {
            this.setFormLoading(form, false);
        }
    }

    async verifyOTP(transactionId, otpCode) {
        try {
            // Update transaction with OTP verification
            const updatedTransaction = await this.api.updateTransaction(transactionId, {
                otp_code: otpCode,
                otp_verified: true,
                status: 'completed'
            });

            this.showSuccess('Transaction completed successfully!');
            
            // Refresh transactions
            await this.loadTransactions();
            
            // Close OTP modal
            this.closeModal();
            
            return updatedTransaction;
            
        } catch (error) {
            console.error('OTP verification failed:', error);
            this.showError('Invalid OTP code. Please try again.');
            throw error;
        }
    }

    async cancelTransaction(transactionId) {
        if (!confirm('Are you sure you want to cancel this transaction?')) {
            return;
        }

        try {
            await this.api.updateTransaction(transactionId, {
                status: 'cancelled'
            });

            this.showSuccess('Transaction cancelled successfully');
            await this.loadTransactions();
            
        } catch (error) {
            console.error('Failed to cancel transaction:', error);
            this.showError('Failed to cancel transaction');
        }
    }

    // ==================== UI RENDERING ====================

    renderTransactions() {
        const transactionList = document.querySelector('#transaction-list');
        const transactionTable = document.querySelector('#transaction-table tbody');
        
        if (!transactionList && !transactionTable) return;

        const container = transactionList || transactionTable;
        
        if (this.transactions.length === 0) {
            container.innerHTML = `
                <div class="no-transactions">
                    <div class="no-transactions__icon">💳</div>
                    <h3>No transactions yet</h3>
                    <p>Your transaction history will appear here</p>
                </div>
            `;
            return;
        }

        const transactionHTML = this.transactions.map(transaction => {
            const isOutgoing = transaction.sender_user_id === this.currentUser.id;
            const amount = this.api.formatCurrency(transaction.amount, transaction.currency);
            const date = new Date(transaction.transaction_date).toLocaleDateString();
            const statusClass = `status-${transaction.status}`;

            if (transactionList) {
                // Card layout for dashboard
                return `
                    <div class="transaction-item ${isOutgoing ? 'outgoing' : 'incoming'}" data-transaction-id="${transaction.id}">
                        <div class="transaction-icon">
                            ${isOutgoing ? '↗️' : '↙️'}
                        </div>
                        <div class="transaction-details">
                            <div class="transaction-title">
                                ${isOutgoing ? 'Sent to' : 'Received from'} ${this.getTransactionParticipant(transaction, isOutgoing)}
                            </div>
                            <div class="transaction-date">${date}</div>
                        </div>
                        <div class="transaction-amount ${isOutgoing ? 'negative' : 'positive'}">
                            ${isOutgoing ? '-' : '+'}${amount}
                        </div>
                        <div class="transaction-status ${statusClass}">
                            ${transaction.status}
                            ${!transaction.otp_verified && transaction.status === 'pending' ? 
                                `<button class="verify-otp-btn" data-transaction-id="${transaction.id}">Verify</button>` : 
                                ''
                            }
                        </div>
                    </div>
                `;
            } else {
                // Table layout for transactions page
                return `
                    <tr class="transaction-row" data-transaction-id="${transaction.id}">
                        <td>
                            <div class="transaction-id">${transaction.id.slice(0, 8)}...</div>
                        </td>
                        <td>${date}</td>
                        <td>${this.getTransactionParticipant(transaction, isOutgoing)}</td>
                        <td class="${isOutgoing ? 'negative' : 'positive'}">
                            ${isOutgoing ? '-' : '+'}${amount}
                        </td>
                        <td>
                            <span class="status-badge ${statusClass}">${transaction.status}</span>
                        </td>
                        <td>
                            ${!transaction.otp_verified && transaction.status === 'pending' ? 
                                `<button class="btn-small verify-otp-btn" data-transaction-id="${transaction.id}">Verify OTP</button>` : 
                                '<button class="btn-small" onclick="transactionHandler.showTransactionDetails(\'' + transaction.id + '\')">View</button>'
                            }
                        </td>
                    </tr>
                `;
            }
        }).join('');

        container.innerHTML = transactionHTML;
    }

    updateDashboardStats() {
        const balanceEl = document.querySelector('#account-balance');
        const incomeEl = document.querySelector('#total-income');
        const expensesEl = document.querySelector('#total-expenses');
        const pendingEl = document.querySelector('#pending-transactions');

        if (!balanceEl) return;

        // Calculate stats
        const stats = this.calculateTransactionStats();
        
        if (balanceEl) balanceEl.textContent = this.api.formatCurrency(stats.balance);
        if (incomeEl) incomeEl.textContent = this.api.formatCurrency(stats.income);
        if (expensesEl) expensesEl.textContent = this.api.formatCurrency(stats.expenses);
        if (pendingEl) pendingEl.textContent = stats.pendingCount.toString();
    }

    updateDashboard() {
        // Update user info
        const userNameEls = document.querySelectorAll('.user-name, #user-name');
        const userEmailEls = document.querySelectorAll('.user-email, #user-email');

        userNameEls.forEach(el => el.textContent = this.currentUser.name);
        userEmailEls.forEach(el => el.textContent = this.currentUser.email);

        // Update welcome message
        const welcomeEl = document.querySelector('#welcome-message');
        if (welcomeEl) {
            const firstName = this.currentUser.name.split(' ')[0];
            welcomeEl.textContent = `Welcome back, ${firstName}!`;
        }
    }

    // ==================== HELPER METHODS ====================

    calculateTransactionStats() {
        const completed = this.transactions.filter(t => t.status === 'completed');
        const pending = this.transactions.filter(t => t.status === 'pending');
        
        const income = completed
            .filter(t => t.receiver_user_id === this.currentUser.id)
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expenses = completed
            .filter(t => t.sender_user_id === this.currentUser.id)
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            balance: income - expenses,
            income,
            expenses,
            pendingCount: pending.length
        };
    }

    getTransactionParticipant(transaction, isOutgoing) {
        // This would typically fetch user info by ID
        // For now, return the user ID
        const participantId = isOutgoing ? transaction.receiver_user_id : transaction.sender_user_id;
        return participantId.slice(0, 8) + '...';
    }

    filterTransactions() {
        const searchTerm = document.querySelector('#transaction-search')?.value.toLowerCase() || '';
        const statusFilter = document.querySelector('#transaction-filter')?.value || 'all';

        let filtered = this.transactions;

        if (searchTerm) {
            filtered = filtered.filter(t => 
                t.id.toLowerCase().includes(searchTerm) ||
                t.status.toLowerCase().includes(searchTerm)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }

        // Temporarily store original transactions and render filtered
        const originalTransactions = this.transactions;
        this.transactions = filtered;
        this.renderTransactions();
        this.transactions = originalTransactions;
    }

    // ==================== MODAL METHODS ====================

    showTransactionDetails(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        const isOutgoing = transaction.sender_user_id === this.currentUser.id;
        const amount = this.api.formatCurrency(transaction.amount, transaction.currency);
        const date = new Date(transaction.transaction_date).toLocaleString();

        const modalHTML = `
            <div class="modal-overlay" onclick="transactionHandler.closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Transaction Details</h3>
                        <button class="modal-close" onclick="transactionHandler.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="transaction-detail-item">
                            <label>Transaction ID:</label>
                            <span>${transaction.id}</span>
                        </div>
                        <div class="transaction-detail-item">
                            <label>Date:</label>
                            <span>${date}</span>
                        </div>
                        <div class="transaction-detail-item">
                            <label>Type:</label>
                            <span>${isOutgoing ? 'Outgoing' : 'Incoming'}</span>
                        </div>
                        <div class="transaction-detail-item">
                            <label>Amount:</label>
                            <span class="${isOutgoing ? 'negative' : 'positive'}">${amount}</span>
                        </div>
                        <div class="transaction-detail-item">
                            <label>Status:</label>
                            <span class="status-badge status-${transaction.status}">${transaction.status}</span>
                        </div>
                        <div class="transaction-detail-item">
                            <label>OTP Verified:</label>
                            <span>${transaction.otp_verified ? 'Yes' : 'No'}</span>
                        </div>
                        ${transaction.status === 'pending' ? `
                            <div class="modal-actions">
                                <button class="btn btn-danger" onclick="transactionHandler.cancelTransaction('${transaction.id}')">Cancel Transaction</button>
                                ${!transaction.otp_verified ? `<button class="btn btn-primary" onclick="transactionHandler.showOTPModal('${transaction.id}')">Verify OTP</button>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    showOTPModal(transactionId) {
        const modalHTML = `
            <div class="modal-overlay" onclick="transactionHandler.closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Verify Transaction</h3>
                        <button class="modal-close" onclick="transactionHandler.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Please enter the OTP code to verify this transaction:</p>
                        <form id="otp-form">
                            <div class="form-group">
                                <input type="text" id="otp-code" placeholder="Enter 6-digit OTP" maxlength="6" required>
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" onclick="transactionHandler.closeModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Verify OTP</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Bind OTP form
        const otpForm = document.querySelector('#otp-form');
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otpCode = document.querySelector('#otp-code').value;
            await this.verifyOTP(transactionId, otpCode);
        });
    }

    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    // ==================== UI HELPER METHODS ====================

    setFormLoading(form, isLoading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.textContent = isLoading ? 'Processing...' : 'Send Money';
        }
    }

    showLoading(show) {
        const loader = document.querySelector('#transaction-loader');
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Reuse the notification system from auth handler
        if (window.authHandler && window.authHandler.showMessage) {
            window.authHandler.showMessage(message, type);
            return;
        }

        // Fallback notification
        alert(message);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on dashboard pages
    if (window.location.pathname.includes('/dashboard/')) {
        window.transactionHandler = new TransactionHandler();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionHandler;
}
