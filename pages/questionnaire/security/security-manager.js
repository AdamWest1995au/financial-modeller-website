// /pages/questionnaire/security/security-manager.js - UPDATED WITH PROPER CALLBACK HANDLING

class SecurityManager {
    constructor(config = {}) {
        this.config = {
            recaptchaSiteKey: '6Lc4qoIrAAAAAEMzFRTNgfApcLPSozgLDOWI5yNF',
            honeypotFields: ['website', 'company_name_hidden'],
            spamDetection: true,
            rateLimit: {
                enabled: true,
                maxAttempts: 3,
                windowMs: 300000 // 5 minutes
            },
            ...config
        };
        
        this.state = {
            initialRecaptchaComplete: false,
            submissionRecaptchaComplete: false,
            initialRecaptchaToken: null,
            submissionRecaptchaToken: null,
            honeypotValues: {},
            attemptCount: 0,
            lastAttempt: null,
            isBlocked: false
        };
        
        this.modals = {
            initial: null,
            submission: null
        };

        // Callbacks
        this.onInitialRecaptchaComplete = null;
        this.onSubmissionRecaptchaComplete = null;
    }

    async initialize() {
        console.log('🛡️ Initializing Security Manager...');
        
        try {
            // Initialize honeypot fields
            this.initializeHoneypotFields();
            
            // Setup rate limiting
            this.initializeRateLimit();
            
            // Load reCAPTCHA script if not already loaded
            await this.loadRecaptchaScript();
            
            // Setup global reCAPTCHA callbacks
            this.setupRecaptchaCallbacks();
            
            // Initialize modals
            this.initializeModals();
            
            console.log('✅ Security Manager initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Security Manager:', error);
            throw error;
        }
    }

    initializeHoneypotFields() {
        console.log('🍯 Setting up honeypot fields...');
        
        // Create honeypot container (hidden)
        let honeypotContainer = document.getElementById('honeypotContainer');
        if (!honeypotContainer) {
            honeypotContainer = document.createElement('div');
            honeypotContainer.id = 'honeypotContainer';
            honeypotContainer.style.cssText = 'position: absolute; left: -9999px; opacity: 0; pointer-events: none;';
            document.body.appendChild(honeypotContainer);
        }

        // Create honeypot fields
        this.config.honeypotFields.forEach(fieldName => {
            if (!document.getElementById(fieldName)) {
                const field = document.createElement('input');
                field.type = 'text';
                field.name = fieldName;
                field.id = fieldName;
                field.tabIndex = -1;
                field.autocomplete = 'off';
                
                // Monitor honeypot values
                field.addEventListener('input', (e) => {
                    this.state.honeypotValues[fieldName] = e.target.value;
                    console.warn('🚨 Honeypot field filled:', fieldName);
                });
                
                honeypotContainer.appendChild(field);
            }
        });
    }

    initializeRateLimit() {
        if (!this.config.rateLimit.enabled) return;
        
        try {
            const stored = localStorage.getItem('questionnaire_attempts');
            if (stored) {
                const data = JSON.parse(stored);
                const now = Date.now();
                
                // Check if within rate limit window
                if (now - data.lastAttempt < this.config.rateLimit.windowMs) {
                    this.state.attemptCount = data.attemptCount || 0;
                    this.state.lastAttempt = data.lastAttempt;
                    
                    if (this.state.attemptCount >= this.config.rateLimit.maxAttempts) {
                        this.state.isBlocked = true;
                        console.warn('🚨 Rate limit exceeded - user blocked');
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load rate limit data:', error);
        }
    }

    async loadRecaptchaScript() {
        return new Promise((resolve, reject) => {
            // Check if reCAPTCHA is already loaded
            if (window.grecaptcha) {
                resolve();
                return;
            }

            // Check if script is already loading
            if (document.querySelector('script[src*="recaptcha"]')) {
                // Wait for it to load
                const checkLoaded = () => {
                    if (window.grecaptcha) {
                        resolve();
                    } else {
                        setTimeout(checkLoaded, 100);
                    }
                };
                checkLoaded();
                return;
            }

            // Load reCAPTCHA script
            const script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                console.log('✅ reCAPTCHA script loaded');
                resolve();
            };
            
            script.onerror = () => {
                console.error('❌ Failed to load reCAPTCHA script');
                reject(new Error('Failed to load reCAPTCHA'));
            };
            
            document.head.appendChild(script);
        });
    }

    setupRecaptchaCallbacks() {
        // Initial reCAPTCHA callback
        window.onRecaptchaComplete = (token) => {
            console.log('✅ Initial reCAPTCHA completed');
            this.state.initialRecaptchaComplete = true;
            this.state.initialRecaptchaToken = token;
            
            // Enable continue button
            const continueBtn = document.getElementById('continueBtn');
            if (continueBtn) {
                continueBtn.disabled = false;
            }
        };

        // Submission reCAPTCHA callback
        window.onSubmissionRecaptchaComplete = (token) => {
            console.log('✅ Submission reCAPTCHA completed');
            this.state.submissionRecaptchaComplete = true;
            this.state.submissionRecaptchaToken = token;
            
            // Hide reCAPTCHA and show loading
            if (this.modals.submission) {
                const recaptchaContent = this.modals.submission.querySelector('.recaptcha-content');
                const loadingContent = this.modals.submission.querySelector('.submission-loading');
                
                if (recaptchaContent) recaptchaContent.style.display = 'none';
                if (loadingContent) loadingContent.style.display = 'block';
            }
            
            // Trigger submission completion callback
            if (this.onSubmissionRecaptchaComplete) {
                this.onSubmissionRecaptchaComplete(token);
            }
        };
    }

    initializeModals() {
        // Get or create initial reCAPTCHA modal
        this.modals.initial = document.getElementById('recaptchaModal');
        if (!this.modals.initial) {
            this.modals.initial = this.createInitialRecaptchaModal();
            document.body.appendChild(this.modals.initial);
        }

        // Get or create submission reCAPTCHA modal
        this.modals.submission = document.getElementById('submissionRecaptchaModal');
        if (!this.modals.submission) {
            this.modals.submission = this.createSubmissionRecaptchaModal();
            document.body.appendChild(this.modals.submission);
        }
    }

    createInitialRecaptchaModal() {
        const modal = document.createElement('div');
        modal.id = 'recaptchaModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="recaptcha-modal">
                <div class="recaptcha-header">
                    <div class="recaptcha-icon">🛡️</div>
                    <h2 class="recaptcha-title">Security Verification</h2>
                    <p class="recaptcha-description">Please complete the security check below to continue with the questionnaire.</p>
                </div>
                
                <div class="recaptcha-content">
                    <div class="recaptcha-container">
                        <div class="g-recaptcha" data-sitekey="${this.config.recaptchaSiteKey}" data-callback="onRecaptchaComplete"></div>
                    </div>
                </div>
                
                <div class="recaptcha-actions">
                    <button class="btn btn-secondary" onclick="window.securityManager.closeInitialRecaptcha()">Cancel</button>
                    <button class="btn btn-primary" id="continueBtn" onclick="window.securityManager.handleInitialRecaptchaComplete()" disabled>Continue to Questionnaire</button>
                </div>
            </div>
        `;
        return modal;
    }

    createSubmissionRecaptchaModal() {
        const modal = document.createElement('div');
        modal.id = 'submissionRecaptchaModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="submission-recaptcha-modal">
                <div class="recaptcha-header">
                    <div class="recaptcha-icon">🔒</div>
                    <h2 class="recaptcha-title">Final Security Check</h2>
                    <p class="recaptcha-description">Please complete one final security verification before submitting your responses.</p>
                </div>
                
                <div class="recaptcha-content">
                    <div class="recaptcha-container">
                        <div class="g-recaptcha" id="submissionRecaptcha" data-sitekey="${this.config.recaptchaSiteKey}" data-callback="onSubmissionRecaptchaComplete"></div>
                    </div>
                </div>
                
                <div class="submission-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Submitting your questionnaire...</p>
                </div>
            </div>
        `;
        return modal;
    }

    async showInitialRecaptcha() {
        if (this.state.isBlocked) {
            this.showRateLimitError();
            return false;
        }

        console.log('🛡️ Showing initial reCAPTCHA...');
        
        // Reset state
        this.state.initialRecaptchaComplete = false;
        this.state.initialRecaptchaToken = null;
        
        // Show modal
        if (this.modals.initial) {
            this.modals.initial.classList.add('active');
            
            // Reset reCAPTCHA if needed
            setTimeout(() => {
                if (window.grecaptcha) {
                    try {
                        grecaptcha.reset();
                    } catch (error) {
                        console.warn('reCAPTCHA reset failed:', error);
                    }
                }
            }, 100);
        }
        
        return true;
    }

    closeInitialRecaptcha() {
        if (this.modals.initial) {
            this.modals.initial.classList.remove('active');
        }
        
        // Reset state
        this.state.initialRecaptchaComplete = false;
        this.state.initialRecaptchaToken = null;
        
        // Reset reCAPTCHA
        if (window.grecaptcha) {
            try {
                grecaptcha.reset();
            } catch (error) {
                console.warn('reCAPTCHA reset failed:', error);
            }
        }
    }

    handleInitialRecaptchaComplete() {
        if (!this.state.initialRecaptchaComplete) {
            alert('Please complete the reCAPTCHA verification first.');
            return;
        }

        this.closeInitialRecaptcha();
        
        // Trigger callback if set
        if (this.onInitialRecaptchaComplete) {
            this.onInitialRecaptchaComplete();
        }
    }

    async showSubmissionRecaptcha() {
        console.log('🔒 Showing submission reCAPTCHA...');
        
        // Reset state
        this.state.submissionRecaptchaComplete = false;
        this.state.submissionRecaptchaToken = null;
        
        // Show modal
        if (this.modals.submission) {
            this.modals.submission.classList.add('active');
            
            // Reset display state
            const recaptchaContent = this.modals.submission.querySelector('.recaptcha-content');
            const loadingContent = this.modals.submission.querySelector('.submission-loading');
            
            if (recaptchaContent) recaptchaContent.style.display = 'block';
            if (loadingContent) loadingContent.style.display = 'none';
            
            // Render fresh reCAPTCHA
            setTimeout(() => {
                if (window.grecaptcha) {
                    try {
                        const container = document.getElementById('submissionRecaptcha');
                        if (container) {
                            container.innerHTML = ''; // Clear existing
                            grecaptcha.render(container, {
                                'sitekey': this.config.recaptchaSiteKey,
                                'callback': 'onSubmissionRecaptchaComplete'
                            });
                        }
                    } catch (error) {
                        console.error('Failed to render submission reCAPTCHA:', error);
                    }
                }
            }, 100);
        }
    }

    closeSubmissionRecaptcha() {
        if (this.modals.submission) {
            this.modals.submission.classList.remove('active');
        }
        
        // Reset state
        this.state.submissionRecaptchaComplete = false;
        this.state.submissionRecaptchaToken = null;
    }

    // Callback setter methods
    setInitialRecaptchaCallback(callback) {
        this.onInitialRecaptchaComplete = callback;
    }

    setSubmissionRecaptchaCallback(callback) {
        this.onSubmissionRecaptchaComplete = callback;
    }

    detectSpam() {
        const spamIndicators = [];
        
        // Check honeypot fields
        Object.entries(this.state.honeypotValues).forEach(([field, value]) => {
            if (value && value.trim() !== '') {
                spamIndicators.push(`Honeypot field '${field}' filled`);
            }
        });
        
        // Check rate limiting
        if (this.state.isBlocked) {
            spamIndicators.push('Rate limit exceeded');
        }
        
        return {
            isSpam: spamIndicators.length > 0,
            indicators: spamIndicators
        };
    }

    recordAttempt() {
        if (!this.config.rateLimit.enabled) return;
        
        this.state.attemptCount++;
        this.state.lastAttempt = Date.now();
        
        try {
            localStorage.setItem('questionnaire_attempts', JSON.stringify({
                attemptCount: this.state.attemptCount,
                lastAttempt: this.state.lastAttempt
            }));
        } catch (error) {
            console.warn('Failed to save rate limit data:', error);
        }
        
        if (this.state.attemptCount >= this.config.rateLimit.maxAttempts) {
            this.state.isBlocked = true;
        }
    }

    showRateLimitError() {
        alert('You have exceeded the maximum number of submission attempts. Please wait before trying again.');
    }

    // Validation methods
    validateRecaptchaTokens() {
        return {
            initialValid: !!this.state.initialRecaptchaToken,
            submissionValid: !!this.state.submissionRecaptchaToken,
            hasRequiredTokens: !!this.state.initialRecaptchaToken && !!this.state.submissionRecaptchaToken
        };
    }

    getSubmissionData() {
        return {
            initialRecaptchaToken: this.state.initialRecaptchaToken,
            submissionRecaptchaToken: this.state.submissionRecaptchaToken,
            honeypotValues: { ...this.state.honeypotValues },
            spamDetection: this.detectSpam()
        };
    }

    reset() {
        this.state = {
            initialRecaptchaComplete: false,
            submissionRecaptchaComplete: false,
            initialRecaptchaToken: null,
            submissionRecaptchaToken: null,
            honeypotValues: {},
            attemptCount: 0,
            lastAttempt: null,
            isBlocked: false
        };
        
        console.log('🔄 Security Manager reset');
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityManager;
}

// Also make available globally for backward compatibility
window.SecurityManager = SecurityManager;