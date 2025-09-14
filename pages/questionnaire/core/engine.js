// /pages/questionnaire/core/engine.js - UPDATED WITH PROPER SUBMISSION FLOW

export class QuestionnaireEngine {
    constructor(config = {}) {
        this.config = {
            apiEndpoint: config.apiEndpoint || '/api/submit-questionnaire',
            recaptchaSiteKey: config.recaptchaSiteKey || '',
            debug: config.debug || false,
            ...config
        };
        
        this.modules = [];
        this.currentModuleIndex = 0;
        this.responses = {};
        this.isInitialized = false;
        this.isProcessingNavigation = false;
        this.userHasInteracted = false;
        this.submissionId = null;
        
        // UI Elements
        this.questionModal = null;
        this.questionTitle = null;
        this.questionDescription = null;
        this.questionContent = null;
        this.nextBtn = null;
        this.backBtn = null;
        this.progressFill = null;
        this.progressText = null;
        
        // Bind methods to prevent context issues
        this.handleNext = this.handleNext.bind(this);
        this.handleBack = this.handleBack.bind(this);
        this.finalizeSubmission = this.finalizeSubmission.bind(this);
    }

    async initialize() {
        try {
            console.log('Initializing Questionnaire Engine...');
            
            // Get UI elements
            this.questionModal = document.getElementById('questionModal');
            this.questionTitle = document.getElementById('questionTitle');
            this.questionDescription = document.getElementById('questionDescription');
            this.questionContent = document.getElementById('questionContent');
            this.nextBtn = document.getElementById('nextBtn');
            this.backBtn = document.getElementById('backBtn');
            this.progressFill = document.getElementById('modalProgressFill');
            this.progressText = document.getElementById('modalProgressText');
            
            if (!this.questionModal) {
                throw new Error('Question modal not found in DOM');
            }
            
            // Setup event listeners
            if (this.nextBtn) {
                this.nextBtn.addEventListener('click', this.handleNext);
            }
            
            if (this.backBtn) {
                this.backBtn.addEventListener('click', this.handleBack);
            }
            
            // Setup global navigation functions for backward compatibility
            window.nextQuestion = this.handleNext;
            window.previousQuestion = this.handleBack;
            
            this.isInitialized = true;
            console.log('Questionnaire Engine initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Questionnaire Engine:', error);
            throw error;
        }
    }

    registerModule(module) {
        if (!module || typeof module.getId !== 'function') {
            throw new Error('Invalid module: must have getId() method');
        }
        
        console.log('Registering module:', module.getId());
        this.modules.push(module);
        console.log('Module', module.getId(), 'registered successfully');
    }

    async startQuestionnaire() {
        try {
            console.log('Starting questionnaire...');
            
            if (!this.isInitialized) {
                throw new Error('Engine not initialized');
            }
            
            if (this.modules.length === 0) {
                throw new Error('No modules registered');
            }
            
            this.currentModuleIndex = 0;
            this.responses = {};
            this.userHasInteracted = false;
            
            // Show the question modal
            if (this.questionModal) {
                this.questionModal.classList.add('active');
                this.questionModal.classList.add('question-mode');
            }
            
            // Show first visible module
            this.showCurrentModule();
            this.updateProgress();
            
            console.log('Questionnaire started successfully');
            
        } catch (error) {
            console.error('Failed to start questionnaire:', error);
            throw error;
        }
    }

    findNextVisibleModule() {
        for (let i = this.currentModuleIndex + 1; i < this.modules.length; i++) {
            const module = this.modules[i];
            
            console.log('Checking module', module.getId(), 'shouldShow:', module.shouldShow(this.responses));
            
            if (module.shouldShow(this.responses)) {
                console.log('Next visible module found:', module.getId(), 'at index', i);
                return i;
            } else {
                console.log('Skipping module:', module.getId(), '(conditional logic)');
            }
        }
        console.log('No more visible modules found');
        return -1;
    }

    findPreviousVisibleModule() {
        for (let i = this.currentModuleIndex - 1; i >= 0; i--) {
            const module = this.modules[i];
            if (module.shouldShow(this.responses)) {
                console.log('Previous visible module found:', module.getId(), 'at index', i);
                return i;
            } else {
                console.log('Skipping previous module:', module.getId(), '(conditional logic)');
            }
        }
        console.log('No previous visible modules found');
        return -1;
    }

    showCurrentModule() {
        if (this.currentModuleIndex >= this.modules.length) {
            console.log('Reached end of modules');
            return;
        }

        const currentModule = this.modules[this.currentModuleIndex];
        
        console.log('Showing module:', currentModule.getId(), 'at index', this.currentModuleIndex);
        
        // Check if module should be shown
        if (!currentModule.shouldShow(this.responses)) {
            console.log('Module should not be shown, finding next visible module');
            const nextIndex = this.findNextVisibleModule();
            if (nextIndex !== -1) {
                this.currentModuleIndex = nextIndex;
                this.showCurrentModule();
                return;
            } else {
                console.log('No more visible modules, completing questionnaire');
                this.completeQuestionnaire();
                return;
            }
        }

        try {
            // Update UI elements
            if (this.questionTitle) {
                this.questionTitle.textContent = currentModule.getTitle();
            }
            
            if (this.questionDescription) {
                this.questionDescription.textContent = currentModule.getDescription();
            }
            
            if (this.questionContent) {
                const content = currentModule.render(this.responses);
                if (typeof content === 'string') {
                    this.questionContent.innerHTML = content;
                } else {
                    this.questionContent.innerHTML = '';
                    this.questionContent.appendChild(content);
                }
            }
            
            // Setup module event listeners
            currentModule.setupEventListeners();
            
            // Load previous response if exists
            const existingResponse = this.responses[currentModule.getId()];
            if (existingResponse) {
                currentModule.loadResponse(existingResponse);
            }
            
            // Update navigation buttons
            this.updateNavigationButtons();
            
            // Update progress
            this.updateProgress();
            
            console.log('Module displayed successfully');
            
        } catch (error) {
            console.error('Error displaying module:', error);
            this.showErrorMessage('Failed to display question. Please try refreshing the page.');
        }
    }

    updateNavigationButtons() {
        if (!this.nextBtn || !this.backBtn) return;
        
        // Update back button
        const hasPrevious = this.findPreviousVisibleModule() !== -1;
        this.backBtn.style.display = hasPrevious ? 'block' : 'none';
        
        // Update next button
        const currentModule = this.modules[this.currentModuleIndex];
        const isValid = currentModule ? currentModule.validate() : false;
        
        this.nextBtn.disabled = !isValid;
        
        // Check if this is the last module
        const hasNext = this.findNextVisibleModule() !== -1;
        this.nextBtn.textContent = hasNext ? 'Next' : 'Complete';
    }

    updateProgress() {
        if (!this.progressFill || !this.progressText) return;
        
        const progress = Math.round(((this.currentModuleIndex + 1) / this.modules.length) * 100);
        const progressText = progress + '% Complete';
        
        this.progressFill.style.width = progress + '%';
        this.progressText.textContent = progressText;
    }

    async handleNext() {
        if (this.isProcessingNavigation) {
            console.log('Already processing navigation, ignoring handleNext');
            return;
        }
        
        try {
            this.isProcessingNavigation = true;
            
            // Detect user interaction
            if (!this.userHasInteracted) {
                this.userHasInteracted = true;
                console.log('User interaction detected: click');
            }
            
            const currentModule = this.modules[this.currentModuleIndex];
            if (!currentModule) {
                this.isProcessingNavigation = false;
                return;
            }
            
            console.log('Processing navigation from module:', currentModule.getId());
            
            // Save current module response
            const response = currentModule.collectResponse();
            if (response) {
                this.responses[currentModule.getId()] = response;
                console.log('Saved response for', currentModule.getId() + ':', response);
            }
            
            // Find next visible module
            const nextModuleIndex = this.findNextVisibleModule();
            
            if (nextModuleIndex !== -1) {
                this.currentModuleIndex = nextModuleIndex;
                setTimeout(() => {
                    this.isProcessingNavigation = false;
                    this.showCurrentModule();
                }, 10);
            } else {
                this.isProcessingNavigation = false;
                this.completeQuestionnaire();
            }
            
        } catch (error) {
            console.error('Error in handleNext:', error);
            this.isProcessingNavigation = false;
        }
    }

    handleBack() {
        if (this.isProcessingNavigation) {
            console.log('Already processing navigation, ignoring handleBack');
            return;
        }
        
        const previousIndex = this.findPreviousVisibleModule();
        if (previousIndex !== -1) {
            this.isProcessingNavigation = true;
            this.currentModuleIndex = previousIndex;
            setTimeout(() => {
                this.isProcessingNavigation = false;
                this.showCurrentModule();
            }, 10);
        }
    }

    completeQuestionnaire() {
        console.log('Questionnaire completed! Responses:', this.responses);
        
        // Hide the question modal
        if (this.questionModal) {
            this.questionModal.classList.remove('active');
            this.questionModal.classList.remove('question-mode');
        }
        
        // Show submission reCAPTCHA instead of directly submitting
        if (window.securityManager) {
            console.log('Showing submission reCAPTCHA...');
            window.securityManager.showSubmissionRecaptcha();
        } else {
            console.error('SecurityManager not available');
            this.showErrorMessage('Security system not available. Please refresh and try again.');
        }
    }

    async finalizeSubmission(recaptchaToken) {
        try {
            console.log('Finalizing submission with reCAPTCHA token...');
            
            // Prepare submission data
            const submissionData = this.prepareSubmissionData();
            submissionData.recaptchaToken = recaptchaToken;
            
            // Submit to database
            const result = await this.submitToDatabase(submissionData);
            
            // Hide submission reCAPTCHA modal
            if (window.securityManager) {
                window.securityManager.closeSubmissionRecaptcha();
            }
            
            // Store the submission ID
            if (result.submission_id) {
                this.submissionId = result.submission_id;
                console.log('Redirecting to loading page with submission_id:', result.submission_id);
                window.location.href = `loading.html?submission_id=${result.submission_id}`;
            } else {
                this.showSuccessMessage();
            }
            
            return result;
            
        } catch (error) {
            console.error('Submission failed:', error);
            
            // Hide submission reCAPTCHA modal
            if (window.securityManager) {
                window.securityManager.closeSubmissionRecaptcha();
            }
            
            // Re-show question modal for retry
            if (this.questionModal) {
                this.questionModal.classList.add('active');
                this.questionModal.classList.add('question-mode');
            }
            
            // Show error message
            this.showErrorMessage(error.message || 'Submission failed. Please try again.');
            
            throw error;
        }
    }

    prepareSubmissionData() {
        console.log('Preparing submission data...');
        
        const submissionData = {
            // Metadata
            ip_address: null,
            user_agent: navigator.userAgent || null,
            submission_count: 1,
            
            // Honeypot fields for spam detection
            honeypot_website: document.getElementById('website')?.value || null,
            honeypot_phone: null
        };
        
        // Collect database fields from each module
        for (const module of this.modules) {
            const moduleResponse = this.responses[module.getId()];
            if (moduleResponse && typeof module.getDatabaseFields === 'function') {
                try {
                    const dbFields = module.getDatabaseFields(moduleResponse);
                    Object.assign(submissionData, dbFields);
                    console.log(`Database fields from ${module.getId()}:`, dbFields);
                } catch (error) {
                    console.warn(`Error getting database fields from module ${module.getId()}:`, error);
                }
            }
        }
        
        return submissionData;
    }

    async submitToDatabase(formData) {
        try {
            console.log('Submitting form data to API...');
            console.log('Submission data prepared:', formData);
            
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            console.log('API Response status:', response.status);
            
            if (!response.ok) {
                const result = await response.json();
                console.error('API error:', result);
                throw new Error(result.error || result.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Submission successful:', result);
            
            return result;
            
        } catch (error) {
            console.error('Submission error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            throw error;
        }
    }

    showErrorMessage(errorMessage) {
        // Show error in modal if it exists
        if (this.questionContent) {
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 12px; margin: 20px 0;">
                    <div style="font-size: 2rem; margin-bottom: 20px;">⚠️</div>
                    <h3 style="color: #fca5a5; margin-bottom: 15px; font-size: 1.4rem;">Submission Failed</h3>
                    <p style="color: #fca5a5; margin-bottom: 20px; line-height: 1.5;">${errorMessage}</p>
                    <button onclick="window.questionnaireEngine.retrySubmission()" style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 12px 24px; cursor: pointer; font-size: 1rem;">
                        Try Again
                    </button>
                </div>
            `;
        }
        
        // Also show modal if it's hidden
        if (this.questionModal && !this.questionModal.classList.contains('active')) {
            this.questionModal.classList.add('active');
            this.questionModal.classList.add('question-mode');
        }
    }

    showSuccessMessage() {
        if (this.questionContent) {
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🎉</div>
                    <h3 style="color: #4ade80; margin-bottom: 20px; font-size: 1.8rem;">Successfully Submitted!</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 30px; font-size: 1.1rem; line-height: 1.6;">
                        Thank you for completing our questionnaire. We're processing your responses and will create your custom financial model.
                        You'll receive an email within 24-48 hours with your model and next steps.
                    </p>
                </div>
            `;
        }
    }

    retrySubmission() {
        console.log('Retrying submission...');
        this.completeQuestionnaire();
    }

    // Public API methods
    getCurrentState() {
        return {
            currentModule: this.currentModuleIndex,
            totalModules: this.modules.length,
            responses: { ...this.responses },
            progress: Math.round(((this.currentModuleIndex + 1) / this.modules.length) * 100)
        };
    }

    getModuleById(id) {
        return this.modules.find(module => module.id === id);
    }

    goToModule(moduleId) {
        const moduleIndex = this.modules.findIndex(module => module.getId() === moduleId);
        if (moduleIndex !== -1) {
            this.currentModuleIndex = moduleIndex;
            this.showCurrentModule();
        }
    }

    reset() {
        this.currentModuleIndex = 0;
        this.responses = {};
        this.userHasInteracted = false;
        this.isProcessingNavigation = false;
        this.submissionId = null;
        console.log('Questionnaire reset');
    }
}

// Export as default for flexibility
export default QuestionnaireEngine;