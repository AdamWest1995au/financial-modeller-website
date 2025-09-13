// /pages/questionnaire/core/engine.js - COMPLETE REWRITTEN ENGINE WITH CONDITIONAL LOGIC

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
                console.log(`🚫 Skipping module during show: ${currentModule.id}`);
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

    // NEW: Conditional logic methods
    shouldShowModule(module) {
        // If module has shouldShow method, use it
        if (typeof module.shouldShow === 'function') {
            try {
                const result = module.shouldShow(this.responses);
                console.log(`🔍 Module ${module.id} shouldShow: ${result}`);
                
                // Debug: Show what we're checking for combined-parameters
                if (module.id === 'combined-parameters') {
                    console.log('🔍 Checking combined-parameters visibility');
                    console.log('🔍 Current responses:', this.responses);
                    const userInfoResponse = this.responses['user-info'];
                    console.log('🔍 User info response:', userInfoResponse);
                    if (userInfoResponse && userInfoResponse.data) {
                        console.log('🔍 Parameter toggle value:', userInfoResponse.data.parameterToggle);
                    }
                }
                
                return result;
            } catch (error) {
                console.error(`Error checking shouldShow for module ${module.id}:`, error);
                return true; // Default to showing if error
            }
        }
        
        // Default to showing module if no conditional logic
        console.log(`📝 Module ${module.id} has no shouldShow method, showing by default`);
        return true;
    }

    findNextVisibleModule() {
        // Find the next module after current that should be shown
        for (let i = this.currentModuleIndex + 1; i < this.modules.length; i++) {
            const module = this.modules[i];
            if (this.shouldShowModule(module)) {
                console.log(`✅ Next visible module found: ${module.id} at index ${i}`);
                return i;
            } else {
                console.log(`🚫 Skipping module: ${module.id} (conditional logic)`);
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
                console.log(`✅ Previous visible module found: ${module.id} at index ${i}`);
                return i;
            } else {
                console.log(`🚫 Skipping previous module: ${module.id} (conditional logic)`);
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
            console.log('🚫 No user interaction detected - not advancing automatically');
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
            
            // FIXED: Find next visible module instead of just incrementing
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
                        Thank you for completing our questionnaire. We've captured all your responses and our team will now create your custom financial model.
                        You'll receive an email within 24-48 hours with your model and instructions for next steps.
                    </p>
                </div>
            `;
        }
        
        // Hide back button, change next to close
        if (this.backBtn) this.backBtn.style.display = 'none';
        if (this.nextBtn) {
            this.nextBtn.textContent = 'Close';
            this.nextBtn.onclick = () => this.hideModal();
        }
        
        this.submitResponses();
    }

    async submitResponses() {
        try {
            console.log('Submitting responses...');
            
            const submissionData = {
                responses: this.responses,
                completedAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
                moduleCount: this.modules.length
            };
            
            for (const module of this.modules) {
                if (module.getDatabaseFields && this.responses[module.id]) {
                    const dbFields = module.getDatabaseFields();
                    Object.assign(submissionData, dbFields);
                }
            }
            
            console.log('Submission data prepared:', submissionData);
            console.log('Submission completed successfully');
            
        } catch (error) {
            console.error('Submission failed:', error);
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
        console.log('Questionnaire reset');
    }
}

// Export as default for flexibility
export default QuestionnaireEngine;