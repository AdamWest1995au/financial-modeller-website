// TEMPORARY DEBUG VERSION - Replace /pages/questionnaire/core/engine.js with this
// This version adds extensive logging to identify what's calling handleNext()

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
        this.debugCallStack = []; // Track what calls handleNext
        
        // UI Elements
        this.questionModal = null;
        this.questionTitle = null;
        this.questionDescription = null;
        this.questionContent = null;
        this.nextBtn = null;
        this.backBtn = null;
        this.progressFill = null;
        this.progressText = null;
        
        // Bind methods
        this.handleNext = this.handleNext.bind(this);
        this.handleBack = this.handleBack.bind(this);
        
        console.log('🔧 DEBUG ENGINE LOADED - This will help identify auto-advance source');
    }

    async initialize() {
        try {
            console.log('Initializing DEBUG Questionnaire Engine...');
            
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
            
            this.isInitialized = true;
            console.log('DEBUG Questionnaire Engine initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize DEBUG Questionnaire Engine:', error);
            throw error;
        }
    }

    registerModule(moduleInstance) {
        if (!moduleInstance || !moduleInstance.id) {
            throw new Error('Module must have an id property');
        }
        
        console.log(`🔧 DEBUG: Registering module: ${moduleInstance.id}`);
        this.modules.push(moduleInstance);
        
        console.log(`Module ${moduleInstance.id} registered successfully`);
    }

    setupEventListeners() {
        console.log('🔧 DEBUG: Setting up event listeners...');
        
        // Remove existing listeners first
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
        
        // Add event listeners with debug logging
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', (e) => {
                console.log('🔧 DEBUG: Next button CLICKED by user');
                console.log('🔧 DEBUG: Event details:', {
                    isTrusted: e.isTrusted,
                    type: e.type,
                    target: e.target,
                    currentTarget: e.currentTarget
                });
                this.debugCallStack.push('NEXT_BUTTON_CLICK');
                this.userHasInteracted = true;
                e.preventDefault();
                e.stopPropagation();
                this.handleNext();
            });
            console.log('🔧 DEBUG: Next button listener added');
        }
        
        if (this.backBtn) {
            this.backBtn.addEventListener('click', (e) => {
                console.log('🔧 DEBUG: Back button CLICKED by user');
                this.debugCallStack.push('BACK_BUTTON_CLICK');
                this.userHasInteracted = true;
                e.preventDefault();
                e.stopPropagation();
                this.handleBack();
            });
            console.log('🔧 DEBUG: Back button listener added');
        }
        
        // Prevent form submissions
        if (this.questionModal) {
            this.questionModal.addEventListener('submit', (e) => {
                console.log('🔧 DEBUG: Form submission prevented');
                e.preventDefault();
                return false;
            });
            
            this.questionModal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    console.log('🔧 DEBUG: Enter key pressed, preventing default');
                    e.preventDefault();
                }
            });
        }
        
        console.log('🔧 DEBUG: Event listeners setup complete');
    }

    start() {
        if (!this.isInitialized) {
            console.error('Engine not initialized');
            return;
        }
        
        console.log('🔧 DEBUG: Starting questionnaire...');
        this.debugCallStack.push('START_CALLED');
        
        if (this.modules.length === 0) {
            console.error('No modules registered');
            return;
        }
        
        this.userHasInteracted = false;
        
        // Show the modal and start with first module
        this.showModal();
        this.showCurrentModule();
    }

    showModal() {
        console.log('🔧 DEBUG: Showing modal...');
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
        console.log('🔧 DEBUG: showCurrentModule called');
        console.log('🔧 DEBUG: Call stack when showing module:', this.debugCallStack);
        
        if (this.isProcessingNavigation) {
            console.log('🔧 DEBUG: Already processing navigation, skipping');
            return;
        }
        
        const currentModule = this.modules[this.currentModuleIndex];
        
        if (!currentModule) {
            this.completeQuestionnaire();
            return;
        }
        
        console.log(`🔧 DEBUG: Showing module: ${currentModule.id}`);
        console.log(`🔧 DEBUG: User has interacted: ${this.userHasInteracted}`);
        
        // Reset interaction flag for new module
        this.userHasInteracted = false;
        this.debugCallStack = ['SHOW_MODULE_' + currentModule.id];
        
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
                console.log(`🔧 DEBUG: Rendering module ${currentModule.id}...`);
                const content = currentModule.render();
                if (content instanceof HTMLElement) {
                    this.questionContent.appendChild(content);
                } else if (typeof content === 'string') {
                    this.questionContent.innerHTML = content;
                }
                
                // Add interaction tracking
                this.addInteractionTracking(this.questionContent);
                
                console.log(`🔧 DEBUG: Module ${currentModule.id} rendered successfully`);
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
            console.log(`🔧 DEBUG: Loading previous response for ${currentModule.id}`);
            currentModule.loadResponse(this.responses[currentModule.id]);
        }
        
        console.log(`🔧 DEBUG: Module ${currentModule.id} setup complete - waiting for user interaction`);
        
        // CHECK: Is something calling handleNext immediately after this?
        setTimeout(() => {
            if (this.currentModuleIndex !== this.modules.findIndex(m => m.id === currentModule.id)) {
                console.error('🚨 FOUND THE BUG: Module advanced without user interaction!');
                console.error('🚨 Call stack that caused advance:', this.debugCallStack);
            }
        }, 100);
    }
    
    addInteractionTracking(container) {
        const interactionEvents = ['click', 'change', 'input', 'keydown'];
        
        interactionEvents.forEach(eventType => {
            container.addEventListener(eventType, (e) => {
                if (e.isTrusted) {
                    console.log(`🔧 DEBUG: User interaction detected: ${eventType} on`, e.target);
                    this.userHasInteracted = true;
                    this.debugCallStack.push(`USER_${eventType.toUpperCase()}`);
                }
            }, true);
        });
    }

    updateNavigation() {
        if (this.backBtn) {
            this.backBtn.style.display = this.currentModuleIndex > 0 ? 'block' : 'none';
        }
        
        if (this.nextBtn) {
            const isLastModule = this.currentModuleIndex >= this.modules.length - 1;
            this.nextBtn.textContent = isLastModule ? 'Complete' : 'Next →';
            this.nextBtn.disabled = false;
        }
    }

    updateProgress() {
        const progress = Math.round(((this.currentModuleIndex + 1) / this.modules.length) * 100);
        
        if (this.progressFill) {
            this.progressFill.style.width = progress + '%';
        }
        
        if (this.progressText) {
            this.progressText.textContent = progress + '% Complete';
        }
    }

    handleNext() {
        console.log('🚨 DEBUG: handleNext() called!');
        console.log('🚨 DEBUG: Stack trace:');
        console.trace();
        console.log('🚨 DEBUG: Call history:', this.debugCallStack);
        console.log('🚨 DEBUG: User has interacted:', this.userHasInteracted);
        console.log('🚨 DEBUG: Is processing navigation:', this.isProcessingNavigation);
        
        this.debugCallStack.push('HANDLE_NEXT_CALLED');
        
        if (this.isProcessingNavigation) {
            console.log('🔧 DEBUG: Already processing navigation, ignoring');
            return;
        }
        
        // CRITICAL: Only proceed if user has interacted
        if (!this.userHasInteracted) {
            console.log('🚨 BUG IDENTIFIED: handleNext called without user interaction!');
            console.log('🚨 This is the source of auto-advancement');
            console.log('🚨 Call stack that led here:', this.debugCallStack);
            return; // STOP AUTO-ADVANCEMENT
        }
        
        this.isProcessingNavigation = true;
        
        try {
            const currentModule = this.modules[this.currentModuleIndex];
            
            if (!currentModule) {
                this.isProcessingNavigation = false;
                return;
            }
            
            console.log(`🔧 DEBUG: Processing legitimate navigation from module: ${currentModule.id}`);
            
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
            
            // Move to next module or complete
            if (this.currentModuleIndex < this.modules.length - 1) {
                this.currentModuleIndex++;
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
        console.log('🔧 DEBUG: handleBack() called');
        this.debugCallStack.push('HANDLE_BACK_CALLED');
        
        if (this.isProcessingNavigation) {
            return;
        }
        
        if (this.currentModuleIndex > 0) {
            this.isProcessingNavigation = true;
            this.currentModuleIndex--;
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
        this.debugCallStack = [];
        console.log('Questionnaire reset');
    }
}

export default QuestionnaireEngine;