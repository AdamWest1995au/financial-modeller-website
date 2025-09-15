// /pages/questionnaire/app.js
class QuestionnaireApp {
    constructor() {
        this.engine = null;
        this.modules = [];
        this.initialized = false;
        this.startTime = Date.now();
    }

    async initialize() {
        console.log('🚀 Initializing Questionnaire Application...');
        
        try {
            // Check for required dependencies
            this.checkDependencies();
            
            // Initialize the core engine
            this.engine = new QuestionnaireEngine({
                saveToStorage: true,
                storageKey: 'questionnaire_state_v2',
                autoSave: true
            });
            
            await this.engine.initialize();
            
            // Register all modules
            await this.registerModules();
            
            // Register conditional logic rules
            this.registerConditionalLogic();
            
            // Setup application-level event handlers
            this.setupEventHandlers();
            
            // Setup security callbacks
            this.setupSecurityCallbacks();
            
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

    checkDependencies() {
        const required = [
            'QuestionnaireEngine',
            'QuestionnaireState', 
            'SecurityManager',
            'ConditionalLogic',
            'QuestionnaireValidator',
            'UIManager',
            'BaseComponent'
        ];
        
        const missing = required.filter(dep => !window[dep]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
        }
        
        console.log('✅ All dependencies available');
    }

    async registerModules() {
        console.log('📦 Registering modules...');
        
        // Define module loading order
        const moduleConfigs = [
            { 
                name: 'CustomizationModule', 
                file: 'customization.module.js',
                className: 'CustomizationModule' 
            },
            { 
                name: 'UserInfoModule', 
                file: 'user-info.module.js',
                className: 'UserInfoModule' 
            },
            { 
                name: 'CombinedParametersModule', 
                file: 'combined-parameters.module.js',
                className: 'CombinedParametersModule' 
            },
            { 
                name: 'ModelingApproachModule', 
                file: 'modeling-approach.module.js',
                className: 'ModelingApproachModule' 
            },
            { 
                name: 'RevenueModule', 
                file: 'revenue.module.js',
                className: 'RevenueModule' 
            },
            { 
                name: 'CogsCodbModule', 
                file: 'cogs-codb.module.js',
                className: 'CogsCodbModule' 
            },
            { 
                name: 'ExpensesModule', 
                file: 'expenses.module.js',
                className: 'ExpensesModule' 
            },
            { 
                name: 'AssetsModule', 
                file: 'assets.module.js',
                className: 'AssetsModule' 
            },
            { 
                name: 'DebtModule', 
                file: 'debt.module.js',
                className: 'DebtModule' 
            },
            { 
                name: 'EquityModule', 
                file: 'equity.module.js',
                className: 'EquityModule' 
            }
        ];

        // Register available modules
        for (const config of moduleConfigs) {
            try {
                await this.registerModule(config);
            } catch (error) {
                console.warn(`⚠️ Failed to load module ${config.name}:`, error);
                // Continue with other modules - some may not be implemented yet
            }
        }

        console.log(`✅ Registered ${this.modules.length} modules successfully`);
    }

    async registerModule(config) {
        const { name, className } = config;
        
        // Check if module class is available
        const ModuleClass = window[className];
        if (!ModuleClass) {
            console.log(`⏭️ Module ${name} not yet implemented, skipping...`);
            return;
        }

        // Create and register module instance
        const moduleInstance = new ModuleClass();
        this.engine.registerModule(moduleInstance);
        this.modules.push(moduleInstance);
        
        console.log(`✅ Module registered: ${name}`);
    }

    registerConditionalLogic() {
        if (!this.engine?.conditionalLogic) {
            console.warn('⚠️ Conditional logic not available');
            return;
        }

        console.log('📋 Registering conditional logic rules...');

        const logic = this.engine.conditionalLogic;

        // Revenue module conditional logic
        logic.registerRule('revenue-structure', {
            '*': (allResponses) => {
                // Show revenue module based on customization preferences
                const customizationResponse = logic.findResponseByType(allResponses, 'customization-preference');
                if (!customizationResponse) return true;
                
                const revenuePreference = customizationResponse.customizationPreferences?.revenue;
                return revenuePreference !== 'generic';
            }
        });

        // Assets module conditional logic
        logic.registerRule('assets', {
            '*': (allResponses) => {
                // Show assets module based on customization preferences
                const customizationResponse = logic.findResponseByType(allResponses, 'customization-preference');
                if (!customizationResponse) return true;
                
                const assetsPreference = customizationResponse.customizationPreferences?.assets;
                return assetsPreference !== 'generic';
            }
        });

        // COGS/CODB module conditional logic
        logic.registerRule('cogs-codb', {
            '*': (allResponses) => {
                const customizationResponse = logic.findResponseByType(allResponses, 'customization-preference');
                if (!customizationResponse) return true;
                
                const cogsPreference = customizationResponse.customizationPreferences?.cogs;
                return cogsPreference !== 'generic';
            }
        });

        // Expenses module conditional logic
        logic.registerRule('expenses', {
            '*': (allResponses) => {
                const customizationResponse = logic.findResponseByType(allResponses, 'customization-preference');
                if (!customizationResponse) return true;
                
                const expensesPreference = customizationResponse.customizationPreferences?.expenses;
                return expensesPreference !== 'generic';
            }
        });

        // Debt module conditional logic
        logic.registerRule('debt', {
            '*': (allResponses) => {
                const customizationResponse = logic.findResponseByType(allResponses, 'customization-preference');
                if (!customizationResponse) return true;
                
                const debtPreference = customizationResponse.customizationPreferences?.debt;
                return debtPreference !== 'generic';
            }
        });

        // Equity module conditional logic
        logic.registerRule('equity-financing', {
            '*': (allResponses) => {
                const customizationResponse = logic.findResponseByType(allResponses, 'customization-preference');
                if (!customizationResponse) return true;
                
                const equityPreference = customizationResponse.customizationPreferences?.equity;
                return equityPreference !== 'generic';
            }
        });

        console.log('✅ Conditional logic rules registered');
    }

    setupEventHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('🚨 Global error caught:', event.error);
            this.handleError(event.error);
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Unhandled promise rejection:', event.reason);
            this.handleError(event.reason);
            event.preventDefault();
        });

        // Page visibility change (for auto-save)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.engine && this.engine.state) {
                this.engine.state.saveToStorage();
            }
        });

        // Browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (this.engine && this.engine.isModalOpen) {
                // Prevent default browser navigation during questionnaire
                history.pushState(null, '', window.location.pathname);
            }
        });
    }

    setupSecurityCallbacks() {
        if (!this.engine || !this.engine.security) return;

        // Set initial reCAPTCHA callback
        this.engine.security.setInitialRecaptchaCallback(() => {
            console.log('🔐 Initial reCAPTCHA completed, starting questionnaire...');
            this.engine.startQuestionnaire();
        });

        // Set submission reCAPTCHA callback
        this.engine.security.setSubmissionRecaptchaCallback((token) => {
            console.log('🔐 Submission reCAPTCHA completed, proceeding with submission...');
            // The engine will handle the actual submission
        });
    }

    handleInitializationError(error) {
        const errorMessage = error.message || 'Unknown initialization error';
        
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
                    action: () => window.location.href = 'mailto:support@thefinancialmodeller.com'
                }
            ]
        );

        document.body.appendChild(errorContainer);
    }

    handleError(error) {
        console.error('🚨 Application error:', error);
        
        // Don't show error UI during development
        if (window.location.hostname === 'localhost') {
            return;
        }

        // Show user-friendly error for production
        if (this.engine && this.engine.ui) {
            this.engine.ui.showError('An unexpected error occurred. Please try again.');
        }
    }

    createErrorDisplay(title, message, actions = []) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: rgba(220, 38, 38, 0.1);
            border: 1px solid rgba(220, 38, 38, 0.3);
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
        `;

        content.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
            <h2 style="margin-bottom: 15px; color: #fca5a5;">${title}</h2>
            <p style="margin-bottom: 30px; color: rgba(255, 255, 255, 0.8); line-height: 1.6;">${message}</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                ${actions.map(action => `
                    <button style="
                        background: #dc2626;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 1rem;
                    " onclick="(${action.action.toString()})()">${action.text}</button>
                `).join('')}
            </div>
        `;

        container.appendChild(content);
        return container;
    }

    // Public API methods
    async start() {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }

        console.log('🎯 Starting questionnaire application...');

        // Show the initial reCAPTCHA
        await this.engine.security.showInitialRecaptcha();
    }

    getCurrentState() {
        if (!this.engine) return null;
        return this.engine.getCurrentState();
    }

    async reset() {
        if (!this.engine) return;
        await this.engine.reset();
        console.log('🔄 Application reset');
    }

    getDebugInfo() {
        return {
            initialized: this.initialized,
            moduleCount: this.modules.length,
            modules: this.modules.map(m => m.id),
            engineState: this.engine ? this.engine.getCurrentState() : null,
            uptime: Date.now() - this.startTime
        };
    }

    destroy() {
        if (this.engine) {
            this.engine.destroy();
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

// Auto-initialization when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM loaded, initializing questionnaire app...');
    
    try {
        // Create global app instance
        window.questionnaireApp = new QuestionnaireApp();
        
        // Initialize the application
        await window.questionnaireApp.initialize();
        
        // Make app methods globally available for backward compatibility
        window.startQuestionnaire = () => window.questionnaireApp.start();
        window.resetQuestionnaire = () => window.questionnaireApp.reset();
        window.getQuestionnaireState = () => window.questionnaireApp.getCurrentState();
        
        console.log('🎉 Questionnaire app ready!');
        
        // Auto-start if requested
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autostart') === 'true') {
            await window.questionnaireApp.start();
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize questionnaire app:', error);
        
        // Fallback to legacy system if available
        if (window.startLegacyQuestionnaire) {
            console.log('🔄 Falling back to legacy questionnaire system...');
            window.startLegacyQuestionnaire();
        }
    }
});

// Export for manual initialization if needed
window.QuestionnaireApp = QuestionnaireApp;