// /pages/questionnaire/core/engine.js - COMPLETE ENGINE WITH SUBMISSION FUNCTIONALITY

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
                throw new Error('Question modal not found');
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Hide any existing notification boxes
            this.hideNotifications();
            
            this.isInitialized = true;
            console.log('Questionnaire Engine initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Questionnaire Engine:', error);
            throw error;
        }
    }

    registerModule(moduleInstance) {
        if (!moduleInstance || !moduleInstance.id) {
            throw new Error('Module must have an id property');
        }
        
        console.log(`Registering module: ${moduleInstance.id}`);
        this.modules.push(moduleInstance);
        
        console.log(`Module ${moduleInstance.id} registered successfully`);
    }

    setupEventListeners() {
        // Remove existing listeners first to prevent duplicates
        if (this.nextBtn) {
            const newNextBtn = this.nextBtn.cloneNode(true);
            this.nextBtn.parentNode.replaceChild(newNextBtn, this.nextBtn);
            this.nextBtn = newNextBtn;
        }
        
        if (this.backBtn) {
            const newBackBtn = this.backBtn.cloneNode(true);
            this.backBtn.parentNode.replaceChild(newBackBtn, this.backBtn);
            this.backBtn = newBackBtn;
        }
        
        // Add clean event listeners
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', (e) => {
                console.log('Next button clicked by user');
                this.userHasInteracted = true;
                e.preventDefault();
                e.stopPropagation();
                this.handleNext();
            });
        }
        
        if (this.backBtn) {
            this.backBtn.addEventListener('click', (e) => {
                console.log('Back button clicked by user');
                this.userHasInteracted = true;
                e.preventDefault();
                e.stopPropagation();
                this.handleBack();
            });
        }
        
        // Prevent form submissions and unwanted Enter key behavior
        if (this.questionModal) {
            this.questionModal.addEventListener('submit', (e) => {
                console.log('Form submission prevented');
                e.preventDefault();
                return false;
            });
            
            this.questionModal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const isValidTarget = e.target.tagName === 'BUTTON' || 
                                        e.target.getAttribute('role') === 'button' ||
                                        e.target.hasAttribute('data-allow-enter');
                    if (!isValidTarget) {
                        console.log('Enter key prevented on', e.target.tagName);
                        e.preventDefault();
                    }
                }
            });
        }
    }

    hideNotifications() {
        // Hide any existing notification boxes/toasts
        const selectors = [
            '.success-toast',
            '.notification-box',
            '.feedback-message',
            '.alert-success',
            '.message-success'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
                el.remove();
            });
        });
        
        // Add CSS to prevent notifications from showing
        const style = document.createElement('style');
        style.id = 'hide-notifications';
        style.textContent = `
            .success-toast,
            .notification-box,
            .feedback-message,
            .alert-success,
            .message-success,
            [class*="selections-recorded"],
            [class*="notification"],
            [class*="feedback"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
        `;
        
        // Remove existing style if present
        const existingStyle = document.getElementById('hide-notifications');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        document.head.appendChild(style);
    }

    start() {
        if (!this.isInitialized) {
            console.error('Engine not initialized');
            return;
        }
        
        console.log('Starting questionnaire...');
        
        if (this.modules.length === 0) {
            console.error('No modules registered');
            return;
        }
        
        // Reset state
        this.userHasInteracted = false;
        
        // Show the modal and start with first module
        this.showModal();
        this.showCurrentModule();
    }

    showModal() {
        if (this.questionModal) {
            this.questionModal.classList.add('active');
            this.questionModal.classList.add('question-mode');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal() {
        if (this.questionModal) {
            this.questionModal.classList.remove('active');
            this.questionModal.classList.remove('question-mode');
            document.body.style.overflow = 'auto';
        }
    }

    showCurrentModule() {
        if (this.isProcessingNavigation) {
            return;
        }
        
        // Make sure we're showing a visible module
        while (this.currentModuleIndex < this.modules.length) {
            const currentModule = this.modules[this.currentModuleIndex];
            
            if (!currentModule) {
                this.completeQuestionnaire();
                return;
            }
            
            // Check if this module should be shown
            if (this.shouldShowModule(currentModule)) {
                break; // This module should be shown
            } else {
                // Skip this module
                console.log(`Skipping module during show: ${currentModule.id}`);
                this.currentModuleIndex++;
                continue;
            }
        }
        
        const currentModule = this.modules[this.currentModuleIndex];
        if (!currentModule) {
            this.completeQuestionnaire();
            return;
        }
        
        console.log(`Showing module: ${currentModule.id}`);
        
        // Reset interaction flag for new module
        this.userHasInteracted = false;
        
        // Update header
        if (this.questionTitle) {
            this.questionTitle.textContent = currentModule.title || 'Question';
        }
        
        if (this.questionDescription) {
            this.questionDescription.textContent = currentModule.description || '';
        }
        
        // Render module content
        if (this.questionContent && currentModule.render) {
            this.questionContent.innerHTML = '';
            
            try {
                const content = currentModule.render();
                if (content instanceof HTMLElement) {
                    this.questionContent.appendChild(content);
                } else if (typeof content === 'string') {
                    this.questionContent.innerHTML = content;
                }
                
                // Add interaction tracking
                this.addInteractionTracking(this.questionContent);
                
            } catch (error) {
                console.error(`Error rendering module ${currentModule.id}:`, error);
                this.questionContent.innerHTML = `<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">
                    <p>Error loading this section. Please continue to the next step.</p>
                </div>`;
            }
        }
        
        // Update navigation
        this.updateNavigation();
        
        // Update progress
        this.updateProgress();
        
        // Load previous response if exists
        if (this.responses[currentModule.id] && currentModule.loadResponse) {
            currentModule.loadResponse(this.responses[currentModule.id]);
        }
        
        // Hide notifications after module renders
        setTimeout(() => this.hideNotifications(), 100);
    }
    
    addInteractionTracking(container) {
        // Track any user interactions within the module
        const interactionEvents = ['click', 'change', 'input', 'keydown'];
        
        interactionEvents.forEach(eventType => {
            container.addEventListener(eventType, (e) => {
                // Only count real user interactions, not programmatic events
                if (e.isTrusted) {
                    console.log(`User interaction detected: ${eventType}`);
                    this.userHasInteracted = true;
                }
            }, true); // Use capture phase
        });
    }

    // Conditional logic methods
    shouldShowModule(module) {
        // If module has shouldShow method, use it
        if (typeof module.shouldShow === 'function') {
            try {
                const result = module.shouldShow(this.responses);
                console.log(`Checking module ${module.id} shouldShow: ${result}`);
                
                // Debug: Show what we're checking for combined-parameters
                if (module.id === 'combined-parameters') {
                    console.log('Checking combined-parameters visibility');
                    console.log('Current responses:', this.responses);
                    const userInfoResponse = this.responses['user-info'];
                    console.log('User info response:', userInfoResponse);
                    if (userInfoResponse && userInfoResponse.data) {
                        console.log('Parameter toggle value:', userInfoResponse.data.parameterToggle);
                    }
                }
                
                return result;
            } catch (error) {
                console.error(`Error checking shouldShow for module ${module.id}:`, error);
                return true; // Default to showing if error
            }
        }
        
        // Default to showing module if no conditional logic
        console.log(`Module ${module.id} has no shouldShow method, showing by default`);
        return true;
    }

    findNextVisibleModule() {
        // Find the next module after current that should be shown
        for (let i = this.currentModuleIndex + 1; i < this.modules.length; i++) {
            const module = this.modules[i];
            if (this.shouldShowModule(module)) {
                console.log(`Next visible module found: ${module.id} at index ${i}`);
                return i;
            } else {
                console.log(`Skipping module: ${module.id} (conditional logic)`);
            }
        }
        console.log('No more visible modules found');
        return -1; // No more visible modules
    }

    findPreviousVisibleModule() {
        // Find the previous module before current that should be shown
        for (let i = this.currentModuleIndex - 1; i >= 0; i--) {
            const module = this.modules[i];
            if (this.shouldShowModule(module)) {
                console.log(`Previous visible module found: ${module.id} at index ${i}`);
                return i;
            } else {
                console.log(`Skipping previous module: ${module.id} (conditional logic)`);
            }
        }
        return -1; // No previous visible modules
    }

    updateNavigation() {
        // Check if there's a previous visible module
        const hasPreviousModule = this.findPreviousVisibleModule() !== -1;
        
        if (this.backBtn) {
            this.backBtn.style.display = hasPreviousModule ? 'block' : 'none';
        }
        
        if (this.nextBtn) {
            // Check if there are more visible modules after current
            const hasNextModule = this.findNextVisibleModule() !== -1;
            this.nextBtn.textContent = hasNextModule ? 'Next →' : 'Complete';
            this.nextBtn.disabled = false;
        }
    }

    updateProgress() {
        // Calculate progress based on visible modules only
        const visibleModules = this.modules.filter((module, index) => {
            // Temporarily set index to check visibility
            const originalIndex = this.currentModuleIndex;
            this.currentModuleIndex = index;
            const isVisible = this.shouldShowModule(module);
            this.currentModuleIndex = originalIndex;
            return isVisible;
        });
        
        // Find current position in visible modules
        let currentVisibleIndex = 0;
        for (let i = 0; i <= this.currentModuleIndex && i < this.modules.length; i++) {
            const originalIndex = this.currentModuleIndex;
            this.currentModuleIndex = i;
            const isVisible = this.shouldShowModule(this.modules[i]);
            this.currentModuleIndex = originalIndex;
            
            if (isVisible && i < this.currentModuleIndex) {
                currentVisibleIndex++;
            }
        }
        
        const progress = visibleModules.length > 0 ? 
                        Math.round(((currentVisibleIndex + 1) / visibleModules.length) * 100) : 0;
        
        if (this.progressFill) {
            this.progressFill.style.width = progress + '%';
        }
        
        if (this.progressText) {
            this.progressText.textContent = progress + '% Complete';
        }
    }

    handleNext() {
        if (this.isProcessingNavigation) {
            console.log('Already processing navigation, ignoring handleNext');
            return;
        }
        
        // CRITICAL: Only proceed if user has interacted
        if (!this.userHasInteracted) {
            console.log('No user interaction detected - not advancing automatically');
            return;
        }
        
        this.isProcessingNavigation = true;
        
        try {
            const currentModule = this.modules[this.currentModuleIndex];
            
            if (!currentModule) {
                this.isProcessingNavigation = false;
                return;
            }
            
            console.log(`Processing navigation from module: ${currentModule.id}`);
            
            // Collect response from current module
            if (currentModule.getResponse) {
                try {
                    const response = currentModule.getResponse();
                    this.responses[currentModule.id] = response;
                    console.log(`Saved response for ${currentModule.id}:`, response);
                } catch (error) {
                    console.error(`Error getting response from ${currentModule.id}:`, error);
                }
            }
            
            // Validate if module has validation
            if (currentModule.validate) {
                const validation = currentModule.validate();
                if (!validation.isValid) {
                    console.log('Validation failed:', validation.errors);
                    this.isProcessingNavigation = false;
                    return;
                }
            }
            
            // Find next visible module instead of just incrementing
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
        
        // Show completion message
        if (this.questionContent) {
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🎉</div>
                    <h3 style="color: #8b5cf6; margin-bottom: 20px; font-size: 1.8rem;">Questionnaire Complete!</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 30px; font-size: 1.1rem; line-height: 1.6;">
                        Thank you for completing our questionnaire. We're now submitting your responses and our team will create your custom financial model.
                        You'll receive an email within 24-48 hours with your model and instructions for next steps.
                    </p>
                    <div id="submission-status" style="margin-top: 20px;">
                        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #8b5cf6; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 10px; color: rgba(255,255,255,0.6);">Submitting your responses...</p>
                    </div>
                </div>
            `;
        }
        
        // Add CSS for spinner
        if (!document.getElementById('spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'spinner-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Hide back button, disable next button during submission
        if (this.backBtn) this.backBtn.style.display = 'none';
        if (this.nextBtn) {
            this.nextBtn.disabled = true;
            this.nextBtn.textContent = 'Submitting...';
        }
        
        // Submit responses
        this.submitResponses();
    }

    // reCAPTCHA verification
    async verifyRecaptcha() {
        if (!this.config.recaptchaSiteKey) {
            console.warn('reCAPTCHA not configured, skipping verification');
            return null;
        }
        
        return new Promise((resolve, reject) => {
            if (typeof grecaptcha !== 'undefined') {
                grecaptcha.ready(() => {
                    grecaptcha.execute(this.config.recaptchaSiteKey, {action: 'submit'})
                        .then(token => resolve(token))
                        .catch(reject);
                });
            } else {
                console.warn('reCAPTCHA not loaded, skipping verification');
                resolve(null);
            }
        });
    }

    // Prepare submission data in the format your API expects
    prepareSubmissionData() {
        // Initialize with default structure matching your API schema
        const submissionData = {
            // Required fields
            full_name: '',
            company_name: '',
            email: '',
            phone: '',
            country_name: '',
            country_code: '',
            country_flag: null,
            industry_dropdown: null,
            industry_freetext: null,
            
            // Optional parameters
            quick_parameters_choice: 'no',
            model_periodicity: null,
            historical_start_date: null,
            forecast_years: null,
            
            // Business model questions (JSONB fields)
            model_purpose_selected: null,
            model_purpose_freetext: null,
            modeling_approach: null,
            revenue_generation_selected: null,
            revenue_generation_freetext: null,
            charging_models: null,
            product_procurement_selected: null,
            product_procurement_freetext: null,
            sales_channels_selected: null,
            sales_channels_freetext: null,
            revenue_staff: null,
            
            // Metadata
            ip_address: null,
            user_agent: navigator.userAgent,
            submission_count: 1,
            honeypot_website: null,
            honeypot_phone: null
        };
        
        // Extract data from each module using their getDatabaseFields method
        for (const module of this.modules) {
            const moduleResponse = this.responses[module.id];
            if (!moduleResponse) continue;
            
            // Use the module's getDatabaseFields if available
            if (module.getDatabaseFields) {
                try {
                    const dbFields = module.getDatabaseFields();
                    Object.assign(submissionData, dbFields);
                    console.log(`Database fields from ${module.id}:`, dbFields);
                } catch (error) {
                    console.warn(`Error getting database fields from module ${module.id}:`, error);
                }
            }
        }
        
        return submissionData;
    }

    // Show error message
    showErrorMessage(errorMessage) {
        const statusDiv = document.getElementById('submission-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 8px; padding: 20px; margin-top: 20px;">
                    <h4 style="color: #fca5a5; margin-bottom: 10px;">Submission Failed</h4>
                    <p style="color: #fca5a5; margin-bottom: 15px;">${errorMessage}</p>
                    <button onclick="window.questionnaireEngine.retrySubmission()" style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 10px 20px; cursor: pointer;">
                        Try Again
                    </button>
                </div>
            `;
        }
        
        // Re-enable next button for retry
        if (this.nextBtn) {
            this.nextBtn.disabled = false;
            this.nextBtn.textContent = 'Try Again';
            this.nextBtn.onclick = () => this.retrySubmission();
        }
    }

    // Show success message
    showSuccessMessage() {
        const statusDiv = document.getElementById('submission-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 20px; margin-top: 20px;">
                    <h4 style="color: #4ade80; margin-bottom: 10px;">Successfully Submitted!</h4>
                    <p style="color: #4ade80; margin-bottom: 0;">Your responses have been saved. We'll be in touch within 24-48 hours.</p>
                </div>
            `;
        }
        
        // Update next button to close
        if (this.nextBtn) {
            this.nextBtn.disabled = false;
            this.nextBtn.textContent = 'Close';
            this.nextBtn.onclick = () => this.hideModal();
        }
    }

    // Retry submission
    retrySubmission() {
        // Reset the status display
        const statusDiv = document.getElementById('submission-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #8b5cf6; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 10px; color: rgba(255,255,255,0.6);">Submitting your responses...</p>
            `;
        }
        
        // Disable button during retry
        if (this.nextBtn) {
            this.nextBtn.disabled = true;
            this.nextBtn.textContent = 'Submitting...';
        }
        
        // Retry submission
        this.submitResponses();
    }

    // Main submission method
    async submitResponses() {
        try {
            console.log('Submitting responses...');
            
            // Verify reCAPTCHA if configured
            const recaptchaToken = await this.verifyRecaptcha();
            
            // Prepare submission data
            const submissionData = this.prepareSubmissionData();
            
            // Add reCAPTCHA token if available
            if (recaptchaToken) {
                submissionData.recaptchaToken = recaptchaToken;
            }
            
            console.log('Submission data prepared:', submissionData);
            
            // Make the HTTP request to your API
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData)
            });
            
            // Check if the request was successful
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Submission successful:', result);
            
            // Store the submission ID for future reference
            if (result.submission_id) {
                this.submissionId = result.submission_id;
            }
            
            // Show success message
            this.showSuccessMessage();
            
            return result;
            
        } catch (error) {
            console.error('Submission failed:', error);
            
            // Show user-friendly error message
            let errorMessage = 'An unexpected error occurred. Please try again.';
            
            if (error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('400')) {
                errorMessage = 'There was an issue with your submission data. Please try again.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error. Please try again in a few moments.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showErrorMessage(errorMessage);
            
            throw error;
        }
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
        const moduleIndex = this.modules.findIndex(module => module.id === moduleId);
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