// /pages/questionnaire/core/ui-manager.js
class UIManager {
    constructor(config = {}) {
        this.config = {
            progressSelector: '#progressFill',
            modalProgressSelector: '#modalProgressFill',
            progressTextSelector: '#progressText',
            modalProgressTextSelector: '#modalProgressText',
            modalSelector: '#questionModal',
            nextBtnSelector: '#nextBtn',
            backBtnSelector: '#backBtn',
            skipTextSelector: '#skipText',
            animationDuration: 300,
            ...config
        };
        
        this.elements = {};
        this.isModalOpen = false;
        this.animationQueue = [];
        this.currentAnimation = null;
    }

    initialize() {
        console.log('🎨 Initializing UI Manager...');
        
        try {
            // Cache DOM elements
            this.cacheElements();
            
            // Setup global event handlers
            this.setupGlobalEventHandlers();
            
            // Initialize progress bars
            this.updateProgress(0);
            
            console.log('✅ UI Manager initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize UI Manager:', error);
            throw error;
        }
    }

    cacheElements() {
        const selectors = {
            progressFill: this.config.progressSelector,
            modalProgressFill: this.config.modalProgressSelector,
            progressText: this.config.progressTextSelector,
            modalProgressText: this.config.modalProgressTextSelector,
            modal: this.config.modalSelector,
            nextBtn: this.config.nextBtnSelector,
            backBtn: this.config.backBtnSelector,
            skipText: this.config.skipTextSelector,
            questionTitle: '#questionTitle',
            questionDescription: '#questionDescription',
            questionNumber: '#questionNumber',
            questionContent: '#questionContent',
            progressContainer: '.progress-container'
        };

        Object.entries(selectors).forEach(([key, selector]) => {
            const element = document.querySelector(selector);
            if (element) {
                this.elements[key] = element;
            } else {
                console.warn(`UI element not found: ${selector}`);
            }
        });
    }

    setupGlobalEventHandlers() {
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });

        // Handle browser navigation
        window.addEventListener('beforeunload', (e) => {
            if (this.isModalOpen) {
                e.preventDefault();
                e.returnValue = 'Your progress will be lost. Are you sure you want to leave?';
                return e.returnValue;
            }
        });

        // Handle modal clicks (close on backdrop click)
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) {
                    this.handleEscapeKey();
                }
            });
        }
    }

    handleEscapeKey() {
        // Only close modal if no dropdowns are open
        const openDropdowns = document.querySelectorAll('.dropdown-options[style*="display: block"]');
        if (openDropdowns.length === 0 && this.isModalOpen) {
            this.closeModal();
        }
    }

    updateProgress(percentage) {
        const progressValue = Math.min(Math.max(percentage, 0), 100);
        const progressText = Math.round(progressValue) + '% Complete';
        
        // Update main progress bar
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = progressValue + '%';
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = progressText;
        }
        
        // Update modal progress bar
        if (this.elements.modalProgressFill) {
            this.elements.modalProgressFill.style.width = progressValue + '%';
        }
        
        if (this.elements.modalProgressText) {
            this.elements.modalProgressText.textContent = progressText;
        }
        
        console.log(`📊 Progress updated: ${progressValue}%`);
    }

    showModal() {
        if (!this.elements.modal) {
            console.error('Modal element not found');
            return false;
        }

        this.isModalOpen = true;
        
        // Show progress container when modal opens
        if (this.elements.progressContainer) {
            this.elements.progressContainer.classList.add('active');
        }
        
        // Add modal classes
        this.elements.modal.classList.add('active', 'question-mode');
        
        // Scroll to top
        this.scrollToTop();
        
        console.log('📱 Modal opened');
        return true;
    }

    closeModal() {
        if (!this.elements.modal) return false;

        this.isModalOpen = false;
        
        // Hide progress container
        if (this.elements.progressContainer) {
            this.elements.progressContainer.classList.remove('active');
        }
        
        // Remove modal classes
        this.elements.modal.classList.remove('active', 'question-mode');
        
        console.log('📱 Modal closed');
        return true;
    }

    updateQuestionHeader(questionData) {
        const { title, description, number } = questionData;
        
        if (this.elements.questionTitle && title) {
            this.elements.questionTitle.textContent = title;
        }
        
        if (this.elements.questionDescription && description) {
            this.elements.questionDescription.textContent = description;
        }
        
        if (this.elements.questionNumber && number !== undefined) {
            this.elements.questionNumber.textContent = number;
        }
    }

    updateNavigationButtons(buttonConfig) {
        const {
            showBack = false,
            showNext = true,
            nextEnabled = true,
            nextText = 'Next',
            backText = 'Back'
        } = buttonConfig;

        // Update back button
        if (this.elements.backBtn) {
            this.elements.backBtn.style.display = showBack ? 'block' : 'none';
            this.elements.backBtn.textContent = backText;
        }

        // Update next button
        if (this.elements.nextBtn) {
            this.elements.nextBtn.style.display = showNext ? 'block' : 'none';
            this.elements.nextBtn.disabled = !nextEnabled;
            this.elements.nextBtn.textContent = nextText;
        }
    }

    updateSkipText(text, show = true) {
        if (this.elements.skipText) {
            this.elements.skipText.textContent = text;
            this.elements.skipText.style.display = show ? 'block' : 'none';
        }
    }

    hideSkipText() {
        this.updateSkipText('', false);
    }

    showSkipText(text = 'You can skip this question and come back to it later') {
        this.updateSkipText(text, true);
    }

    renderQuestionContent(html) {
        if (this.elements.questionContent) {
            this.elements.questionContent.innerHTML = html;
            this.scrollToTop();
        }
    }

    scrollToTop() {
        // Multiple scroll targets to ensure we reach the top
        setTimeout(() => {
            // Scroll the modal itself
            if (this.elements.modal) {
                this.elements.modal.scrollTop = 0;
            }
            
            // Scroll the document
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            
            // Scroll the question modal container
            const questionModal = document.querySelector('.question-modal');
            if (questionModal) {
                questionModal.scrollTop = 0;
            }
        }, 100);
    }

    showError(message, duration = 5000) {
        console.error('🚨 UI Error:', message);
        
        // Create error toast
        const errorToast = this.createErrorToast(message);
        document.body.appendChild(errorToast);
        
        // Show with animation
        setTimeout(() => errorToast.classList.add('show'), 100);
        
        // Auto-hide
        setTimeout(() => {
            errorToast.classList.remove('show');
            setTimeout(() => errorToast.remove(), 300);
        }, duration);
    }

    createErrorToast(message) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.innerHTML = `
            <div class="error-toast-content">
                <span class="error-icon">⚠️</span>
                <span class="error-message">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#error-toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'error-toast-styles';
            styles.textContent = `
                .error-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(220, 38, 38, 0.95);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                    max-width: 400px;
                }
                .error-toast.show {
                    transform: translateX(0);
                }
                .error-toast-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .error-message {
                    flex: 1;
                }
                .error-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `;
            document.head.appendChild(styles);
        }
        
        return toast;
    }

    showSuccess(message, duration = 3000) {
        console.log('✅ UI Success:', message);
        
        // Create success toast (similar to error but green)
        const successToast = this.createSuccessToast(message);
        document.body.appendChild(successToast);
        
        setTimeout(() => successToast.classList.add('show'), 100);
        
        setTimeout(() => {
            successToast.classList.remove('show');
            setTimeout(() => successToast.remove(), 300);
        }, duration);
    }

    createSuccessToast(message) {
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.innerHTML = `
            <div class="success-toast-content">
                <span class="success-icon">✅</span>
                <span class="success-message">${message}</span>
                <button class="success-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#success-toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'success-toast-styles';
            styles.textContent = `
                .success-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(34, 197, 94, 0.95);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                    max-width: 400px;
                }
                .success-toast.show {
                    transform: translateX(0);
                }
                .success-toast-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .success-message {
                    flex: 1;
                }
                .success-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `;
            document.head.appendChild(styles);
        }
        
        return toast;
    }

    showLoading(message = 'Loading...') {
        // Create or update loading overlay
        let loadingOverlay = document.getElementById('ui-loading-overlay');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'ui-loading-overlay';
            loadingOverlay.className = 'ui-loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="ui-loading-content">
                    <div class="ui-loading-spinner"></div>
                    <div class="ui-loading-message">${message}</div>
                </div>
            `;
            
            // Add styles
            if (!document.querySelector('#ui-loading-styles')) {
                const styles = document.createElement('style');
                styles.id = 'ui-loading-styles';
                styles.textContent = `
                    .ui-loading-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.8);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 9999;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    .ui-loading-overlay.show {
                        opacity: 1;
                    }
                    .ui-loading-content {
                        text-align: center;
                        color: white;
                    }
                    .ui-loading-spinner {
                        width: 40px;
                        height: 40px;
                        border: 3px solid rgba(255, 255, 255, 0.1);
                        border-top-color: #8b5cf6;
                        border-radius: 50%;
                        animation: ui-spin 1s linear infinite;
                        margin: 0 auto 20px;
                    }
                    .ui-loading-message {
                        font-size: 1.1rem;
                    }
                    @keyframes ui-spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            document.body.appendChild(loadingOverlay);
        } else {
            loadingOverlay.querySelector('.ui-loading-message').textContent = message;
        }
        
        setTimeout(() => loadingOverlay.classList.add('show'), 100);
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('ui-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
            setTimeout(() => loadingOverlay.remove(), 300);
        }
    }

    animateTransition(fromElement, toElement, direction = 'forward') {
        return new Promise((resolve) => {
            if (!fromElement || !toElement) {
                resolve();
                return;
            }

            const duration = this.config.animationDuration;
            
            // Setup initial states
            if (direction === 'forward') {
                toElement.style.transform = 'translateX(100%)';
                toElement.style.opacity = '0';
            } else {
                toElement.style.transform = 'translateX(-100%)';
                toElement.style.opacity = '0';
            }
            
            toElement.style.transition = `all ${duration}ms ease`;
            fromElement.style.transition = `all ${duration}ms ease`;
            
            // Trigger animation
            setTimeout(() => {
                if (direction === 'forward') {
                    fromElement.style.transform = 'translateX(-100%)';
                    fromElement.style.opacity = '0';
                } else {
                    fromElement.style.transform = 'translateX(100%)';
                    fromElement.style.opacity = '0';
                }
                
                toElement.style.transform = 'translateX(0)';
                toElement.style.opacity = '1';
            }, 50);
            
            // Clean up
            setTimeout(() => {
                fromElement.style.transition = '';
                fromElement.style.transform = '';
                fromElement.style.opacity = '';
                toElement.style.transition = '';
                toElement.style.transform = '';
                toElement.style.opacity = '';
                resolve();
            }, duration + 50);
        });
    }

    // Utility methods for common UI patterns
    isDropdownOpen() {
        const openDropdowns = document.querySelectorAll('.dropdown-options[style*="display: block"]');
        return openDropdowns.length > 0;
    }

    closeAllDropdowns() {
        const openDropdowns = document.querySelectorAll('.dropdown-options[style*="display: block"]');
        openDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
        
        // Remove dropdown-open classes
        document.querySelectorAll('.dropdown-open').forEach(element => {
            element.classList.remove('dropdown-open');
        });
    }

    focusFirstInput() {
        const firstInput = this.elements.questionContent?.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    // Accessibility helpers
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.cssText = `
            position: absolute;
            left: -10000px;
            top: auto;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => announcement.remove(), 1000);
    }

    updatePageTitle(title) {
        if (title) {
            document.title = `${title} - The Financial Modeller`;
        }
    }

    // Debug and development helpers
    getUIState() {
        return {
            isModalOpen: this.isModalOpen,
            hasModal: !!this.elements.modal,
            cachedElements: Object.keys(this.elements),
            isDropdownOpen: this.isDropdownOpen(),
            currentTitle: this.elements.questionTitle?.textContent,
            currentProgress: this.elements.progressText?.textContent
        };
    }

    destroy() {
        // Clean up event listeners and elements
        this.closeModal();
        this.hideLoading();
        
        // Remove any toast notifications
        document.querySelectorAll('.error-toast, .success-toast').forEach(toast => {
            toast.remove();
        });
        
        // Clear cached elements
        this.elements = {};
        
        console.log('🎨 UI Manager destroyed');
    }
}

// Export for use
window.UIManager = UIManager;