// /pages/questionnaire/app.js - UPDATED WITH PROPER SECURITY INTEGRATION

class QuestionnaireApp {
    constructor() {
        this.engine = null;
        this.securityManager = null;
        this.modules = [];
        this.initialized = false;
        this.startTime = Date.now();
    }

    async initialize() {
        console.log('🚀 Initializing Questionnaire Application...');
        
        try {
            // Check for required dependencies
            this.checkDependencies();
            
            // Initialize the security manager first
            await this.initializeSecurityManager();
            
            // Initialize the core engine
            this.engine = new QuestionnaireEngine({
                apiEndpoint: '/api/submit-questionnaire',
                recaptchaSiteKey: '6Lc4qoIrAAAAAEMzFRTNgfApcLPSozgLDOWI5yNF',
                debug: true
            });
            
            await this.engine.initialize();
            
            // Register all modules
            await this.registerModules();
            
            // Setup application-level event handlers
            this.setupEventHandlers();
            
            // Setup security callbacks - THIS IS THE KEY CONNECTION
            this.setupSecurityCallbacks();
            
            // Make instances globally available
            window.questionnaireEngine = this.engine;
            window.securityManager = this.securityManager;
            
            this.initialized = true;
            
            console.log('✅ Questionnaire Application initialized successfully');
            console.log(`📊 Loaded ${this.modules.length} modules`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Questionnaire Application:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    async initializeSecurityManager() {
        console.log('🛡️ Initializing Security Manager...');
        
        this.securityManager = new SecurityManager({
            recaptchaSiteKey: '6Lc4qoIrAAAAAEMzFRTNgfApcLPSozgLDOWI5yNF'
        });
        
        await this.securityManager.initialize();
        
        console.log('✅ Security Manager initialized');
    }

    checkDependencies() {
        const required = [
            'QuestionnaireEngine',
            'SecurityManager'
        ];
        
        const missing = required.filter(dep => !window[dep]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
        }
    }

    async registerModules() {
        console.log('📦 Registering questionnaire modules...');
        
        try {
            // Import and register modules in order
            const moduleConfigs = [
                { name: 'CustomizationModule', file: './modules/customization.module.js' },
                { name: 'UserInfoModule', file: './modules/user-info.module.js' },
                { name: 'CombinedParametersModule', file: './modules/combined-parameters.module.js' },
                { name: 'ModelingApproachModule', file: './modules/modeling-approach.module.js' },
                { name: 'RevenueModule', file: './modules/revenue.module.js' },
                { name: 'CogsCodbModule', file: './modules/cogs-codb.module.js' }
            ];

            for (const config of moduleConfigs) {
                try {
                    const module = await import(config.file);
                    const ModuleClass = module[config.name] || module.default;
                    
                    if (ModuleClass) {
                        const moduleInstance = new ModuleClass();
                        this.engine.registerModule(moduleInstance);
                        this.modules.push(moduleInstance);
                        console.log(`✅ Registered ${config.name}`);
                    } else {
                        console.warn(`⚠️ Module class not found in ${config.file}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to load module ${config.name}:`, error);
                }
            }
            
            console.log(`📋 Registered ${this.modules.length} modules total`);
            
        } catch (error) {
            console.error('Failed to register modules:', error);
            throw error;
        }
    }

    setupEventHandlers() {
        // Handle browser navigation during questionnaire
        window.addEventListener('popstate', (event) => {
            if (this.engine && this.engine.questionModal && this.engine.questionModal.classList.contains('active')) {
                // Prevent default browser navigation during questionnaire
                history.pushState(null, '', window.location.pathname);
            }
        });

        // Global error handling
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });

        // Handle page beforeunload
        window.addEventListener('beforeunload', (event) => {
            if (this.engine && this.engine.userHasInteracted) {
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return event.returnValue;
            }
        });
    }

    setupSecurityCallbacks() {
        if (!this.engine || !this.securityManager) return;

        console.log('🔗 Setting up security callbacks...');

        // Set initial reCAPTCHA callback - starts questionnaire
        this.securityManager.setInitialRecaptchaCallback(() => {
            console.log('🔓 Initial reCAPTCHA completed, starting questionnaire...');
            this.engine.startQuestionnaire();
        });

        // Set submission reCAPTCHA callback - finalizes submission
        this.securityManager.setSubmissionRecaptchaCallback((token) => {
            console.log('🔒 Submission reCAPTCHA completed, finalizing submission...');
            // Pass the token to the engine for final submission
            this.engine.finalizeSubmission(token);
        });

        console.log('✅ Security callbacks configured');
    }

    // Public API methods
    async start() {
        if (!this.initialized) {
            throw new Error('Application not initialized');
        }

        console.log('🎬 Starting questionnaire application...');
        
        // Show initial reCAPTCHA
        const shown = await this.securityManager.showInitialRecaptcha();
        if (!shown) {
            throw new Error('Failed to show initial reCAPTCHA (possibly rate limited)');
        }
        
        return true;
    }

    reset() {
        if (this.engine) {
            this.engine.reset();
        }
        
        if (this.securityManager) {
            this.securityManager.reset();
        }
        
        console.log('🔄 Application reset');
    }

    getCurrentState() {
        return {
            initialized: this.initialized,
            engine: this.engine ? this.engine.getCurrentState() : null,
            security: this.securityManager ? this.securityManager.getSubmissionData() : null,
            modules: this.modules.length,
            uptime: Date.now() - this.startTime
        };
    }

    handleInitializationError(error) {
        const errorMessage = error.message || 'Unknown initialization error';
        
        console.error('💥 Initialization failed:', errorMessage);
        
        // Show user-friendly error
        const errorContainer = this.createErrorDisplay(
            'Initialization Failed',
            `Failed to load the questionnaire: ${errorMessage}`,
            [
                {
                    text: 'Retry',
                    action: () => window.location.reload()
                },
                {
                    text: 'Contact Support',
                    action: () => window.location.href = 'mailto:info@thefinancialmodeller.com'
                }
            ]
        );

        document.body.appendChild(errorContainer);
    }

    createErrorDisplay(title, message, actions = []) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: rgba(220, 38, 38, 0.1);
            border: 1px solid rgba(220, 38, 38, 0.3);
            border-radius: 12px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            color: white;
        `;

        const titleEl = document.createElement('h2');
        titleEl.textContent = title;
        titleEl.style.cssText = 'color: #fca5a5; margin-bottom: 20px; font-size: 1.5rem;';

        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.cssText = 'color: #fca5a5; margin-bottom: 30px; line-height: 1.5;';

        const actionsContainer = document.createElement('div');
        actionsContainer.style.cssText = 'display: flex; gap: 15px; justify-content: center;';

        actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action.text;
            button.style.cssText = `
                background: #dc2626;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 24px;
                cursor: pointer;
                font-size: 1rem;
                transition: background-color 0.2s;
            `;
            button.addEventListener('click', action.action);
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#b91c1c';
            });
            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = '#dc2626';
            });
            actionsContainer.appendChild(button);
        });

        modal.appendChild(titleEl);
        modal.appendChild(messageEl);
        modal.appendChild(actionsContainer);
        container.appendChild(modal);

        return container;
    }

    destroy() {
        if (this.engine) {
            this.engine.reset();
        }
        
        if (this.securityManager) {
            this.securityManager.reset();
        }
        
        this.modules.forEach(module => {
            if (module.destroy) {
                module.destroy();
            }
        });
        
        this.modules = [];
        this.initialized = false;
        
        console.log('🗑️ Application destroyed');
    }
}

// Global functions for backward compatibility and HTML onclick handlers
window.showInfoPane = function() {
    alert('Info pane functionality will be added in the modular system');
};

window.showAIModal = function() {
    alert('AI integration coming soon!');
};

window.startQuestionnaire = function() {
    if (window.questionnaireApp) {
        window.questionnaireApp.start();
    } else {
        console.error('Questionnaire app not initialized');
    }
};

// Navigation functions for questions - these are called from HTML onclick handlers
window.nextQuestion = function() {
    if (window.questionnaireEngine) {
        window.questionnaireEngine.handleNext();
    }
};

window.previousQuestion = function() {
    if (window.questionnaireEngine) {
        window.questionnaireEngine.handleBack();
    }
};

// Modal functions (for navigation links)
window.showModal = function(modalType) {
    console.log('Modal type:', modalType);
    alert(`${modalType} modal not implemented yet`);
};

// Auto-initialization when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM loaded, initializing questionnaire app...');
    
    try {
        // Create global app instance
        window.questionnaireApp = new QuestionnaireApp();
        
        // Initialize the application
        await window.questionnaireApp.initialize();
        
        console.log('🎉 Questionnaire app ready!');
        
        // Auto-start if requested via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autostart') === 'true') {
            await window.questionnaireApp.start();
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize questionnaire app:', error);
        
        // Show error to user
        alert('Failed to initialize the questionnaire. Please refresh the page or contact support if the problem persists.');
    }
});

// Export for manual initialization if needed
window.QuestionnaireApp = QuestionnaireApp;