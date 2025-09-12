// /pages/questionnaire/core/engine.js
class QuestionnaireEngine {
    constructor(config = {}) {
        this.config = {
            saveToStorage: true,
            storageKey: 'questionnaire_state',
            autoSave: true,
            ...config
        };
        
        this.modules = new Map();
        this.state = new QuestionnaireState(this.config);
        this.conditionalLogic = new ConditionalLogic();
        this.validator = new QuestionnaireValidator();
        this.security = new SecurityManager();
        this.ui = new UIManager();
        
        this.currentModuleId = null;
        this.currentQuestionIndex = 0;
        this.isInitialized = false;
        
        this.initializeEventHandlers();
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Questionnaire Engine...');
            
            // Initialize security (honeypot, reCAPTCHA)
            await this.security.initialize();
            
            // Load saved state if available
            await this.state.loadFromStorage();
            
            // Initialize UI components
            this.ui.initialize();
            
            // Register conditional logic handlers
            this.setupConditionalLogic();
            
            this.isInitialized = true;
            console.log('✅ Questionnaire Engine initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Questionnaire Engine:', error);
            throw error;
        }
    }

    registerModule(moduleInstance) {
        if (!moduleInstance.id) {
            throw new Error('Module must have an id property');
        }
        
        console.log(`📦 Registering module: ${moduleInstance.id}`);
        
        // Validate module structure
        this.validateModule(moduleInstance);
        
        // Store module
        this.modules.set(moduleInstance.id, moduleInstance);
        
        // Register module's conditional logic
        if (moduleInstance.conditionalLogic) {
            this.conditionalLogic.registerRules(moduleInstance.id, moduleInstance.conditionalLogic);
        }
        
        // Initialize module with engine reference
        moduleInstance.initialize(this);
        
        console.log(`✅ Module ${moduleInstance.id} registered successfully`);
    }

    validateModule(module) {
        const required = ['id', 'questions', 'render', 'collectData'];
        const missing = required.filter(prop => !module[prop]);
        
        if (missing.length > 0) {
            throw new Error(`Module missing required properties: ${missing.join(', ')}`);
        }
    }

    async startQuestionnaire() {
        if (!this.isInitialized) {
            throw new Error('Engine not initialized. Call initialize() first.');
        }

        // Security check - ensure reCAPTCHA is completed
        if (!this.security.isInitialRecaptchaComplete()) {
            throw new Error('Please complete the initial reCAPTCHA verification');
        }

        console.log('🎯 Starting questionnaire...');
        
        // Get first module to show
        const firstModule = this.getNextModule();
        if (firstModule) {
            await this.showModule(firstModule.id);
        } else {
            console.error('No modules available to start questionnaire');
        }
    }

    async showModule(moduleId) {
        const module = this.modules.get(moduleId);
        if (!module) {
            throw new Error(`Module ${moduleId} not found`);
        }

        console.log(`📋 Showing module: ${moduleId}`);
        
        this.currentModuleId = moduleId;
        this.currentQuestionIndex = 0;
        
        // Check if module should be shown based on conditional logic
        const shouldShow = this.conditionalLogic.shouldShowModule(moduleId, this.state.getAllResponses());
        
        if (!shouldShow) {
            console.log(`⏭️ Skipping module ${moduleId} due to conditional logic`);
            await this.nextModule();
            return;
        }

        // Update progress
        this.ui.updateProgress(this.calculateProgress());
        
        // Show first question in module
        await this.showQuestion(moduleId, 0);
    }

    async showQuestion(moduleId, questionIndex) {
        const module = this.modules.get(moduleId);
        if (!module) return;

        const questions = module.getQuestions();
        if (questionIndex >= questions.length) {
            // Module complete, move to next
            await this.nextModule();
            return;
        }

        const question = questions[questionIndex];
        
        // Check if question should be shown
        const shouldShow = this.conditionalLogic.shouldShowQuestion(
            moduleId, 
            questionIndex, 
            this.state.getAllResponses()
        );

        if (!shouldShow) {
            console.log(`⏭️ Skipping question ${questionIndex} in ${moduleId}`);
            this.currentQuestionIndex++;
            await this.showQuestion(moduleId, this.currentQuestionIndex);
            return;
        }

        console.log(`❓ Showing question ${questionIndex} in module ${moduleId}`);
        
        // Render question
        await module.renderQuestion(questionIndex, {
            onNext: (data) => this.handleQuestionResponse(moduleId, questionIndex, data),
            onBack: () => this.previousQuestion(),
            onValidate: (data) => this.validateQuestion(moduleId, questionIndex, data)
        });
        
        // Load previous response if exists
        const previousResponse = this.state.getResponse(moduleId, questionIndex);
        if (previousResponse) {
            module.loadPreviousResponse(questionIndex, previousResponse);
        }
    }

    async handleQuestionResponse(moduleId, questionIndex, responseData) {
        console.log(`💾 Saving response for ${moduleId}[${questionIndex}]:`, responseData);
        
        // Save response to state
        this.state.saveResponse(moduleId, questionIndex, responseData);
        
        // Auto-save if enabled
        if (this.config.autoSave) {
            await this.state.saveToStorage();
        }

        // Update conditional logic based on new response
        this.conditionalLogic.processResponse(moduleId, questionIndex, responseData, this.state.getAllResponses());
        
        // Move to next question
        this.currentQuestionIndex++;
        await this.showQuestion(moduleId, this.currentQuestionIndex);
    }

    async nextModule() {
        const nextModule = this.getNextModule();
        
        if (nextModule) {
            await this.showModule(nextModule.id);
        } else {
            // All modules complete
            await this.completeQuestionnaire();
        }
    }

    async previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            await this.showQuestion(this.currentModuleId, this.currentQuestionIndex);
        } else {
            // Go to previous module
            const prevModule = this.getPreviousModule();
            if (prevModule) {
                this.currentModuleId = prevModule.id;
                const questions = prevModule.getQuestions();
                this.currentQuestionIndex = Math.max(0, questions.length - 1);
                await this.showQuestion(this.currentModuleId, this.currentQuestionIndex);
            }
        }
    }

    validateQuestion(moduleId, questionIndex, data) {
        const module = this.modules.get(moduleId);
        if (!module) return false;

        return module.validateQuestion(questionIndex, data);
    }

    getNextModule() {
        const moduleOrder = this.getModuleOrder();
        const currentIndex = moduleOrder.findIndex(id => id === this.currentModuleId);
        
        for (let i = currentIndex + 1; i < moduleOrder.length; i++) {
            const moduleId = moduleOrder[i];
            const shouldShow = this.conditionalLogic.shouldShowModule(moduleId, this.state.getAllResponses());
            if (shouldShow) {
                return this.modules.get(moduleId);
            }
        }
        
        return null;
    }

    getPreviousModule() {
        const moduleOrder = this.getModuleOrder();
        const currentIndex = moduleOrder.findIndex(id => id === this.currentModuleId);
        
        for (let i = currentIndex - 1; i >= 0; i--) {
            const moduleId = moduleOrder[i];
            return this.modules.get(moduleId);
        }
        
        return null;
    }

    getModuleOrder() {
        // Return array of module IDs in order they should appear
        return [
            'customization-preference',
            'user-info', 
            'combined-parameters',
            'modeling-approach',
            'revenue-structure',
            'cogs-codb',
            'expenses',
            'assets',
            'debt',
            'equity-financing'
        ];
    }

    calculateProgress() {
        const allModules = this.getModuleOrder();
        const completedModules = allModules.filter(id => {
            const moduleResponses = this.state.getModuleResponses(id);
            return Object.keys(moduleResponses).length > 0;
        });
        
        return (completedModules.length / allModules.length) * 100;
    }

    async completeQuestionnaire() {
        console.log('🎉 Questionnaire complete! Preparing submission...');
        
        try {
            // Show submission reCAPTCHA
            await this.security.showSubmissionRecaptcha();
            
            // Collect all data from modules
            const submissionData = await this.collectSubmissionData();
            
            // Add security tokens
            submissionData.recaptchaToken = this.security.getSubmissionRecaptchaToken();
            submissionData.honeypot_website = this.security.getHoneypotValue('website');
            submissionData.honeypot_phone = this.security.getHoneypotValue('phone');
            
            // Submit to database
            await this.submitToDatabase(submissionData);
            
        } catch (error) {
            console.error('❌ Submission failed:', error);
            this.ui.showError('Submission failed. Please try again.');
        }
    }

    async collectSubmissionData() {
        const submissionData = {
            // Initialize with base structure
            submission_count: 1,
            ip_address: null,
            user_agent: navigator.userAgent || null
        };

        // Collect data from each module
        for (const [moduleId, module] of this.modules) {
            const moduleData = module.collectSubmissionData(this.state.getModuleResponses(moduleId));
            Object.assign(submissionData, moduleData);
        }

        return submissionData;
    }

    async submitToDatabase(formData) {
        console.log('📤 Submitting to database...');
        
        const response = await fetch('/api/submit-questionnaire', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.submission_id) {
            // Clear saved state
            await this.state.clearStorage();
            
            // Redirect to loading page
            window.location.href = `loading.html?submission_id=${result.submission_id}`;
        } else {
            throw new Error('No submission_id received from server');
        }
    }

    setupConditionalLogic() {
        // Register global conditional logic rules
        this.conditionalLogic.registerRule('combined-parameters', (responses) => {
            const userInfo = responses['user-info']?.[0];
            return userInfo?.parameterToggle === true;
        });
        
        // More global rules can be added here
    }

    initializeEventHandlers() {
        // Handle browser navigation
        window.addEventListener('beforeunload', () => {
            if (this.config.autoSave) {
                this.state.saveToStorage();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.ui.handleEscapeKey();
            }
        });
    }

    // Public API methods
    getCurrentState() {
        return {
            currentModule: this.currentModuleId,
            currentQuestion: this.currentQuestionIndex,
            responses: this.state.getAllResponses(),
            progress: this.calculateProgress()
        };
    }

    async reset() {
        await this.state.clearStorage();
        this.currentModuleId = null;
        this.currentQuestionIndex = 0;
        console.log('🔄 Questionnaire reset');
    }
}

// Export for use
window.QuestionnaireEngine = QuestionnaireEngine;