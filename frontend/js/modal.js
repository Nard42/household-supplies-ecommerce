// Modal Management
class ModalManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupModalListeners();
    }

    setupModalListeners() {
        // Login Modal
        const loginModal = document.getElementById('login-modal');
        const userIconBtn = document.getElementById('user-icon-btn');
        const closeModalBtn = document.getElementById('close-modal-btn');

        if (userIconBtn) {
            userIconBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal(loginModal);
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal(loginModal));
        }

        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) this.closeModal(loginModal);
        });

        // Search Modal
        const searchModal = document.getElementById('search-modal');
        const searchIconBtn = document.getElementById('search-icon-btn');
        const closeSearchBtn = document.getElementById('close-search-btn');

        if (searchIconBtn) {
            searchIconBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal(searchModal);
            });
        }

        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => this.closeModal(searchModal));
        }

        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) this.closeModal(searchModal);
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    openModal(modalElement) {
        this.closeAllModals();
        modalElement.classList.add('is-visible');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalElement) {
        modalElement.classList.remove('is-visible');
        document.body.style.overflow = '';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('is-visible');
        });
        document.body.style.overflow = '';
    }
}

// Initialize modal manager
const modalManager = new ModalManager();