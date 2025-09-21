// /pages/questionnaire/core/engine.js - FIXED VERSION WITH CORRECT DATA MAPPING

export class QuestionnaireEngine {
    constructor(config = {}) {
        this.config = {
            apiEndpoint: config.apiEndpoint || '/api/submit-questionnaire',
            recaptchaSiteKey: config.recaptchaSiteKey || '6Lc4qoIrAAAAAEMzFRTNgfApcLPSozgLDOWI5yNF',
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
        this.submissionRecaptchaToken = null;
        this.recaptchaToken = null;
        this.submissionRecaptchaWidgetId = undefined;
        this.inlineRecaptchaId = undefined;
        this.startTime = null;
        
        // Store global customization preferences
        this.customizationPreferences = {};
        
        // Initialize conditional logic system
        this.conditionalLogic = null;
        
        // UI Elements
        this.questionModal = null;
        this.questionTitle = null;
        this.questionDescription = null;
        this.questionContent = null;
        this.nextBtn = null;
        this.backBtn = null;
        this.progressFill = null;
        this.progressText = null;
        this.questionNumber = null;
        this.skipTextContainer = null;
        this.titleRowHeader = null;
        this.questionTitleWithTime = null;
        this.questionDescriptionWithTime = null;
        this.customizationTimeBoxTop = null;
        this.totalEstimatedTimeTop = null;
        
        // Bind methods to prevent context issues
        this.handleNext = this.handleNext.bind(this);
        this.handleBack = this.handleBack.bind(this);
        this.onInlineRecaptchaComplete = this.onInlineRecaptchaComplete.bind(this);
        this.onInlineRecaptchaExpired = this.onInlineRecaptchaExpired.bind(this);
        this.onSecurityRecaptchaComplete = this.onSecurityRecaptchaComplete.bind(this);
        this.onSecurityRecaptchaExpired = this.onSecurityRecaptchaExpired.bind(this);
        this.showSimpleSecurityCheck = this.showSimpleSecurityCheck.bind(this);
        this.handleFinalSubmission = this.handleFinalSubmission.bind(this);
        this.closeSecurityModal = this.closeSecurityModal.bind(this);
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Questionnaire Engine...');
            
            // Record start time
            this.startTime = Date.now();
            
            // Initialize conditional logic system
            if (window.ConditionalLogic) {
                this.conditionalLogic = new window.ConditionalLogic();
                console.log('✅ Conditional logic system initialized');
            } else {
                console.warn('⚠️ ConditionalLogic not available - modules will use individual shouldShow methods only');
            }
            
            // Get UI elements
            this.questionModal = document.getElementById('questionModal');
            this.questionTitle = document.getElementById('questionTitle');
            this.questionDescription = document.getElementById('questionDescription');
            this.questionContent = document.getElementById('questionContent');
            this.nextBtn = document.getElementById('nextBtn');
            this.backBtn = document.getElementById('backBtn');
            this.progressFill = document.getElementById('modalProgressFill');
            this.progressText = document.getElementById('modalProgressText');
            this.questionNumber = document.getElementById('questionNumber');
            this.skipTextContainer = document.getElementById('skipTextContainer');
            this.titleRowHeader = document.getElementById('titleRowHeader');
            this.questionTitleWithTime = document.getElementById('questionTitleWithTime');
            this.questionDescriptionWithTime = document.getElementById('questionDescriptionWithTime');
            this.customizationTimeBoxTop = document.getElementById('customizationTimeBoxTop');
            this.totalEstimatedTimeTop = document.getElementById('totalEstimatedTimeTop');
            
            if (!this.questionModal) {
                throw new Error('❌ Question modal not found');
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Hide any existing notification boxes
            this.hideNotifications();
            
            this.isInitialized = true;
            console.log('✅ Questionnaire Engine initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Questionnaire Engine:', error);
            throw error;
        }
    }

    registerModule(moduleInstance) {
        if (!moduleInstance || !moduleInstance.id) {
            throw new Error('Module must have an id property');
        }
        
        console.log(`📝 Registering module: ${moduleInstance.id}`);
        this.modules.push(moduleInstance);
        
        console.log(`✅ Module ${moduleInstance.id} registered successfully`);
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
                console.log('👆 Next button clicked by user');
                this.userHasInteracted = true;
                e.preventDefault();
                e.stopPropagation();
                this.handleNext();
            });
        }
        
        if (this.backBtn) {
            this.backBtn.addEventListener('click', (e) => {
                console.log('👆 Back button clicked by user');
                this.userHasInteracted = true;
                e.preventDefault();
                e.stopPropagation();
                this.handleBack();
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isModalOpen()) {
                if (e.key === 'Escape') {
                    this.closeModal();
                } else if (e.key === 'Enter' && !this.nextBtn?.disabled) {
                    const isValidTarget = e.target.tagName === 'BUTTON' || 
                                        e.target.getAttribute('role') === 'button' ||
                                        e.target.hasAttribute('data-allow-enter');
                    if (isValidTarget) {
                        this.handleNext();
                    }
                }
            }
        });
        
        // Close modal on overlay click
        if (this.questionModal) {
            this.questionModal.addEventListener('click', (e) => {
                if (e.target === this.questionModal) {
                    this.closeModal();
                }
            });
        }
        
        // Prevent form submissions and unwanted Enter key behavior
        if (this.questionModal) {
            this.questionModal.addEventListener('submit', (e) => {
                console.log('🚫 Form submission prevented');
                e.preventDefault();
                return false;
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
            console.error('❌ Engine not initialized');
            return;
        }
        
        console.log('🎯 Starting questionnaire...');
        
        if (this.modules.length === 0) {
            console.error('❌ No modules registered');
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

    closeModal() {
        if (this.questionModal) {
            this.questionModal.classList.remove('active');
            this.questionModal.classList.remove('question-mode');
            document.body.style.overflow = 'auto';
        }
    }

    isModalOpen() {
        return this.questionModal?.classList.contains('active');
    }

    showCurrentModule() {
        if (this.isProcessingNavigation) {
            return;
        }
        
        // Check if we've exceeded the module count
        if (this.currentModuleIndex >= this.modules.length) {
            console.log('🎉 All modules completed - finishing questionnaire');
            this.completeQuestionnaire();
            return;
        }
        
        // Find next visible module
        while (this.currentModuleIndex < this.modules.length) {
            const currentModule = this.modules[this.currentModuleIndex];
            
            if (!currentModule) {
                console.log('🎉 No more modules - completing questionnaire');
                this.completeQuestionnaire();
                return;
            }
            
            // Check if this module should be shown
            if (this.shouldShowModule(currentModule)) {
                break; // This module should be shown
            } else {
                // Skip this module
                console.log(`⏭️ Skipping module: ${currentModule.id} (conditional logic)`);
                this.currentModuleIndex++;
                continue;
            }
        }
        
        // Final check after skipping
        if (this.currentModuleIndex >= this.modules.length) {
            console.log('🎉 After skipping, all modules completed - finishing questionnaire');
            this.completeQuestionnaire();
            return;
        }
        
        const currentModule = this.modules[this.currentModuleIndex];
        if (!currentModule) {
            console.log('🎉 No current module - completing questionnaire');
            this.completeQuestionnaire();
            return;
        }
        
        console.log(`📋 Showing module: ${currentModule.id} (${this.currentModuleIndex + 1}/${this.modules.length})`);
        
        // Update question number
        if (this.questionNumber) {
            this.questionNumber.textContent = this.currentModuleIndex + 1;
        }
        
        // Handle different module types
        if (currentModule.isCustomizationQuestion) {
            this.showCustomizationQuestion(currentModule);
        } else {
            this.showRegularQuestion(currentModule);
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
                console.error(`❌ Error rendering module ${currentModule.id}:`, error);
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
        
        // Module-specific initialization
        if (currentModule.onShow && typeof currentModule.onShow === 'function') {
            currentModule.onShow();
        }
        
        // Hide notifications after module renders
        setTimeout(() => this.hideNotifications(), 100);
    }

    showCustomizationQuestion(module) {
        // Show time-based header
        if (this.titleRowHeader) {
            this.titleRowHeader.style.display = 'flex';
        }
        
        // Hide regular header
        if (this.questionTitle) {
            this.questionTitle.style.display = 'none';
        }
        if (this.questionDescription) {
            this.questionDescription.style.display = 'none';
        }
        
        // Update customization header content
        if (this.questionTitleWithTime) {
            this.questionTitleWithTime.textContent = module.title || 'Customization Question';
        }
        
        if (this.questionDescriptionWithTime) {
            this.questionDescriptionWithTime.textContent = module.description || '';
        }
        
        // Update estimated time
        if (this.totalEstimatedTimeTop && module.estimatedTime) {
            this.totalEstimatedTimeTop.textContent = module.estimatedTime;
        }
    }

    showRegularQuestion(module) {
        // Hide time-based header
        if (this.titleRowHeader) {
            this.titleRowHeader.style.display = 'none';
        }
        
        // Show regular header
        if (this.questionTitle) {
            this.questionTitle.style.display = 'block';
            this.questionTitle.textContent = module.title || 'Question';
        }
        
        if (this.questionDescription) {
            this.questionDescription.style.display = 'block';
            this.questionDescription.textContent = module.description || '';
        }
    }
    
    addInteractionTracking(container) {
        // Track user interactions within the module
        const interactionEvents = ['click', 'change', 'input', 'keydown'];
        
        interactionEvents.forEach(eventType => {
            container.addEventListener(eventType, (e) => {
                if (e.isTrusted) {
                    console.log(`👆 User interaction detected: ${eventType}`);
                    this.userHasInteracted = true;
                    this.updateNavigationButtons();
                }
            }, true);
        });
    }

    shouldShowModule(module) {
        let shouldShow = true;
        
        // First check with conditional logic system if available
        if (this.conditionalLogic) {
            try {
                const moduleRules = this.conditionalLogic.rules.get(module.id);
                if (moduleRules && moduleRules['*']) {
                    const ruleResult = this.conditionalLogic.evaluateRule(moduleRules['*'], this.responses, null);
                    console.log(`🧠 Conditional logic for ${module.id}: ${ruleResult}`);
                    shouldShow = shouldShow && ruleResult;
                }
            } catch (error) {
                console.error(`❌ Error in conditional logic for module ${module.id}:`, error);
            }
        }
        
        // Then check module's own shouldShow method
        if (typeof module.shouldShow === 'function' && shouldShow) {
            try {
                const moduleResult = module.shouldShow(this.responses);
                console.log(`📋 Module ${module.id} shouldShow: ${moduleResult}`);
                shouldShow = shouldShow && moduleResult;
            } catch (error) {
                console.error(`❌ Error checking shouldShow for module ${module.id}:`, error);
            }
        }
        
        console.log(`✅ Final decision for ${module.id}: ${shouldShow}`);
        return shouldShow;
    }

    findNextVisibleModule() {
        for (let i = this.currentModuleIndex + 1; i < this.modules.length; i++) {
            const module = this.modules[i];
            if (this.shouldShowModule(module)) {
                console.log(`⏭️ Next visible module found: ${module.id} at index ${i}`);
                return i;
            } else {
                console.log(`⏭️ Skipping module: ${module.id} (conditional logic)`);
            }
        }
        console.log('⏭️ No more visible modules found');
        return -1;
    }

    findPreviousVisibleModule() {
        for (let i = this.currentModuleIndex - 1; i >= 0; i--) {
            const module = this.modules[i];
            if (this.shouldShowModule(module)) {
                console.log(`⏮️ Previous visible module found: ${module.id} at index ${i}`);
                return i;
            } else {
                console.log(`⏮️ Skipping previous module: ${module.id} (conditional logic)`);
            }
        }
        return -1;
    }

    updateNavigation() {
        // Check if there's a previous visible module
        const hasPreviousModule = this.findPreviousVisibleModule() !== -1;
        
        if (this.backBtn) {
            this.backBtn.style.display = hasPreviousModule ? 'block' : 'none';
        }
        
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        if (this.nextBtn) {
            // Check if there are more visible modules after current
            const hasNextModule = this.findNextVisibleModule() !== -1;
            this.nextBtn.textContent = hasNextModule ? 'Next →' : 'Complete';
            
            // Enable/disable based on current module validation and user interaction
            const currentModule = this.getCurrentModule();
            let isValid = true;
            
            if (currentModule?.validate) {
                const validation = currentModule.validate();
                isValid = validation.isValid;
            }
            
            this.nextBtn.disabled = !isValid;
        }
    }

    updateProgress(progressOverride = null) {
        let progress;
        
        if (progressOverride !== null) {
            progress = progressOverride;
        } else {
            // Calculate progress based on visible modules only
            const visibleModules = this.modules.filter((module, index) => {
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
            
            progress = visibleModules.length > 0 ? 
                            Math.round(((currentVisibleIndex + 1) / visibleModules.length) * 100) : 0;
        }
        
        if (this.progressFill) {
            this.progressFill.style.width = progress + '%';
        }
        
        if (this.progressText) {
            this.progressText.textContent = progress + '% Complete';
        }
    }

    handleNext() {
        console.log('🔍 DEBUG: handleNext called');
        console.log('🔍 DEBUG: isProcessingNavigation:', this.isProcessingNavigation);
        console.log('🔍 DEBUG: userHasInteracted:', this.userHasInteracted);
        
        if (this.isProcessingNavigation) {
            console.log('⏸️ Already processing navigation, ignoring handleNext');
            return;
        }
        
        if (!this.userHasInteracted) {
            console.log('⏸️ No user interaction detected - not advancing automatically');
            return;
        }
        
        this.isProcessingNavigation = true;
        
        try {
            const currentModule = this.modules[this.currentModuleIndex];
            console.log('🔍 DEBUG: Current module:', currentModule?.id);
            console.log('🔍 DEBUG: Current module index:', this.currentModuleIndex);
            console.log('🔍 DEBUG: Total modules:', this.modules.length);
            
            if (!currentModule) {
                console.log('🔍 DEBUG: No current module - COMPLETING QUESTIONNAIRE');
                this.isProcessingNavigation = false;
                this.completeQuestionnaire();
                return;
            }
            
            console.log(`🔍 DEBUG: Processing navigation from module: ${currentModule.id}`);
            
            // Collect response from current module
            if (currentModule.getResponse) {
                try {
                    const response = currentModule.getResponse();
                    this.responses[currentModule.id] = response;
                    console.log(`💾 Saved response for ${currentModule.id}:`, response);
                } catch (error) {
                    console.error(`❌ Error getting response from ${currentModule.id}:`, error);
                }
            }
            
            // Validate if module has validation
            if (currentModule.validate) {
                const validation = currentModule.validate();
                console.log('🔍 DEBUG: Validation result:', validation);
                if (!validation.isValid) {
                    console.log('❌ Validation failed:', validation.errors);
                    this.isProcessingNavigation = false;
                    return;
                }
            }
            
            // Check if we're at the last visible module
            console.log('🔍 DEBUG: Looking for next visible module...');
            const nextModuleIndex = this.findNextVisibleModule();
            console.log('🔍 DEBUG: Next module index:', nextModuleIndex);
            
            const isCurrentLastModule = this.currentModuleIndex === this.modules.length - 1;
            console.log('🔍 DEBUG: Is current last module:', isCurrentLastModule);
            
            if (nextModuleIndex !== -1) {
                console.log('🔍 DEBUG: Found next module, navigating to index:', nextModuleIndex);
                this.currentModuleIndex = nextModuleIndex;
                setTimeout(() => {
                    this.isProcessingNavigation = false;
                    this.showCurrentModule();
                }, 10);
            } else {
                console.log('🔍 DEBUG: No next module found - CALLING COMPLETE QUESTIONNAIRE');
                this.isProcessingNavigation = false;
                console.log('🎉 FORCING COMPLETION - All modules processed');
                this.completeQuestionnaire();
                return;
            }
            
        } catch (error) {
            console.error('🔍 DEBUG: Error in handleNext:', error);
            this.isProcessingNavigation = false;
        }
    }

    handleBack() {
        if (this.isProcessingNavigation) {
            console.log('⏸️ Already processing navigation, ignoring handleBack');
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
        console.log('🎉 DEBUG: completeQuestionnaire called!');
        console.log('🎉 DEBUG: Questionnaire completed! Responses:', this.responses);
        
        // Stop any further module processing
        this.isProcessingNavigation = true;
        this.currentModuleIndex = this.modules.length;
        
        // Update progress to 100%
        this.updateProgress(100);
        console.log('🎉 DEBUG: Progress updated to 100%');
        
        // Hide all module-related elements
        if (this.titleRowHeader) this.titleRowHeader.style.display = 'none';
        if (this.questionTitle) this.questionTitle.style.display = 'none';
        if (this.questionDescription) this.questionDescription.style.display = 'none';
        if (this.backBtn) {
            this.backBtn.style.display = 'none';
            console.log('🎉 DEBUG: Back button hidden');
        }
        if (this.nextBtn) {
            this.nextBtn.style.display = 'none';
            console.log('🎉 DEBUG: Next button hidden');
        }
        if (this.skipTextContainer) {
            this.skipTextContainer.style.display = 'none';
            console.log('🎉 DEBUG: Skip text hidden');
        }
        
        // Show security verification modal
        this.showSecurityVerificationModal();
        
        console.log('🎉 DEBUG: completeQuestionnaire finished - processing stopped');
    }

    showSecurityVerificationModal() {
        console.log('🔐 DEBUG: Showing security verification modal...');
        
        if (this.questionContent) {
            console.log('🔐 DEBUG: Creating compact security verification modal');
            this.questionContent.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                ">
                    <div style="
                        background: #1f2937;
                        border-radius: 12px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        max-width: 480px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        position: relative;
                    ">
                        <div style="padding: 40px 32px; text-align: center;">
                            <div style="margin-bottom: 24px;">
                                <div style="
                                    width: 64px; 
                                    height: 64px; 
                                    background: #8b5cf6; 
                                    border-radius: 50%; 
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    margin: 0 auto;
                                    font-size: 24px;
                                ">
                                    🔒
                                </div>
                            </div>
                            
                            <h3 style="
                                color: white; 
                                margin-bottom: 16px; 
                                font-size: 1.5rem; 
                                font-weight: 600;
                                text-align: center;
                            ">Security Verification</h3>
                            
                            <p style="
                                color: rgba(255,255,255,0.8); 
                                margin-bottom: 32px; 
                                font-size: 1rem; 
                                line-height: 1.5;
                                text-align: center;
                            ">
                                Please complete the security check below to continue with the questionnaire.
                            </p>
                            
                            <div style="display: flex; justify-content: center; margin-bottom: 32px;">
                                <div id="inlineRecaptcha"></div>
                            </div>
                            
                            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                                <button 
                                    onclick="window.questionnaireEngine.closeSecurityModal()" 
                                    class="cancel-btn"
                                    style="
                                        background: transparent; 
                                        border: 1px solid rgba(255,255,255,0.3); 
                                        color: rgba(255,255,255,0.7); 
                                        padding: 12px 24px; 
                                        border-radius: 6px; 
                                        font-size: 1rem; 
                                        cursor: pointer;
                                        transition: all 0.2s ease;
                                        min-width: 120px;
                                    "
                                    onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='white';"
                                    onmouseout="this.style.background='transparent'; this.style.color='rgba(255,255,255,0.7)';"
                                >
                                    Cancel
                                </button>
                                <button 
                                    id="continueToQuestionnaireBtn" 
                                    onclick="window.questionnaireEngine.handleFinalSubmission()" 
                                    disabled
                                    class="continue-btn"
                                    style="
                                        background: #6b7280; 
                                        border: none; 
                                        color: white; 
                                        padding: 12px 24px; 
                                        border-radius: 6px; 
                                        font-size: 1rem; 
                                        cursor: not-allowed;
                                        opacity: 0.5;
                                        transition: all 0.2s ease;
                                        min-width: 180px;
                                    "
                                >
                                    Continue to Questionnaire
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            console.log('🔐 DEBUG: Compact security verification modal created');
        }
        
        // Initialize inline reCAPTCHA
        setTimeout(() => {
            this.initializeSecurityRecaptcha();
        }, 100);
    }

    closeSecurityModal() {
        console.log('❌ Security modal cancelled by user');
        this.closeModal();
    }

    initializeSecurityRecaptcha() {
        console.log('🔐 DEBUG: Initializing security reCAPTCHA...');
        if (window.grecaptcha && window.grecaptcha.ready) {
            window.grecaptcha.ready(() => {
                try {
                    if (this.inlineRecaptchaId !== undefined) {
                        grecaptcha.reset(this.inlineRecaptchaId);
                    }
                    
                    const container = document.getElementById('inlineRecaptcha');
                    if (container) {
                        this.inlineRecaptchaId = grecaptcha.render('inlineRecaptcha', {
                            'sitekey': this.config.recaptchaSiteKey,
                            'callback': this.onSecurityRecaptchaComplete,
                            'expired-callback': this.onSecurityRecaptchaExpired
                        });
                        console.log('✅ Security reCAPTCHA rendered successfully');
                    } else {
                        console.error('❌ inlineRecaptcha container not found');
                    }
                } catch (error) {
                    console.error('❌ Error rendering security reCAPTCHA:', error);
                    this.enableContinueButton();
                }
            });
        } else {
            console.warn('⚠️ reCAPTCHA not loaded, enabling continue button');
            this.enableContinueButton();
        }
    }

    onSecurityRecaptchaComplete(token) {
        console.log('✅ Security reCAPTCHA completed');
        this.submissionRecaptchaToken = token;
        this.enableContinueButton();
    }

    onSecurityRecaptchaExpired() {
        console.log('⏰ Security reCAPTCHA expired');
        this.submissionRecaptchaToken = null;
        this.disableContinueButton();
    }

    enableContinueButton() {
        const continueBtn = document.getElementById('continueToQuestionnaireBtn');
        if (continueBtn) {
            continueBtn.disabled = false;
            continueBtn.style.cursor = 'pointer';
            continueBtn.style.opacity = '1';
            continueBtn.style.background = '#8b5cf6';
            
            continueBtn.onmouseover = () => {
                continueBtn.style.background = '#7c3aed';
            };
            continueBtn.onmouseout = () => {
                continueBtn.style.background = '#8b5cf6';
            };
            console.log('✅ Continue button enabled');
        }
    }

    disableContinueButton() {
        const continueBtn = document.getElementById('continueToQuestionnaireBtn');
        if (continueBtn) {
            continueBtn.disabled = true;
            continueBtn.style.cursor = 'not-allowed';
            continueBtn.style.opacity = '0.5';
            continueBtn.style.background = '#6b7280';
            continueBtn.onmouseover = null;
            continueBtn.onmouseout = null;
            console.log('❌ Continue button disabled');
        }
    }

    // Legacy compatibility methods
    showSimpleSecurityCheck() {
        console.log('🔐 DEBUG: Legacy showSimpleSecurityCheck called - redirecting to new modal');
        this.showSecurityVerificationModal();
    }

    initializeInlineRecaptcha() {
        console.log('🔐 DEBUG: Legacy initializeInlineRecaptcha called - redirecting to new method');
        this.initializeSecurityRecaptcha();
    }

    onInlineRecaptchaComplete(token) {
        console.log('✅ Legacy inline reCAPTCHA completed - redirecting to new handler');
        this.onSecurityRecaptchaComplete(token);
    }

    onInlineRecaptchaExpired() {
        console.log('⏰ Legacy inline reCAPTCHA expired - redirecting to new handler');
        this.onSecurityRecaptchaExpired();
    }

    enableFinalSubmit() {
        console.log('✅ Legacy enableFinalSubmit called - redirecting to new method');
        this.enableContinueButton();
    }

    disableFinalSubmit() {
        console.log('❌ Legacy disableFinalSubmit called - redirecting to new method');
        this.disableContinueButton();
    }

    async handleFinalSubmission() {
        if (!this.submissionRecaptchaToken) {
            alert('Please complete the security verification first.');
            return;
        }
        
        console.log('🚀 Starting final submission...');
        
        // Show loading state
        this.showSubmissionLoading();
        
        try {
            // Submit the questionnaire
            const result = await this.submitResponses();
            
            if (result && result.submission_id) {
                this.submissionId = result.submission_id;
                console.log('✅ Submission successful, redirecting to loading page...');
                
                // Redirect to loading page immediately
                window.location.href = `/pages/loading.html?submission_id=${this.submissionId}`;
            } else {
                throw new Error('No submission ID received');
            }
            
        } catch (error) {
            console.error('❌ Submission failed:', error);
            this.showSubmissionError(error);
        }
    }

    showSubmissionLoading() {
        if (this.questionContent) {
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 2.5rem; margin-bottom: 20px;">⏳</div>
                    <h3 style="color: #8b5cf6; margin-bottom: 20px; font-size: 1.6rem;">Submitting Questionnaire...</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 30px; font-size: 1rem;">
                        Please wait while we process your submission.
                    </p>
                    <div class="loading-spinner" style="display: inline-block; width: 32px; height: 32px; border: 3px solid rgba(139, 92, 246, 0.3); border-top: 3px solid #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            `;
        }
        
        // Add spinner animation CSS if not present
        if (!document.getElementById('spinner-animation')) {
            const style = document.createElement('style');
            style.id = 'spinner-animation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    showSubmissionError(error) {
        if (this.questionContent) {
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 2.5rem; margin-bottom: 20px;">❌</div>
                    <h3 style="color: #ef4444; margin-bottom: 20px; font-size: 1.6rem;">Submission Failed</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 30px; font-size: 1rem;">
                        There was an error submitting your questionnaire. Please try again.
                    </p>
                    <p style="color: rgba(255,255,255,0.6); margin-bottom: 30px; font-size: 0.9rem;">
                        Error: ${error.message || 'Unknown error occurred'}
                    </p>
                    <button 
                        onclick="window.questionnaireEngine.showSecurityVerificationModal()" 
                        style="
                            background: #8b5cf6; 
                            border: none; 
                            color: white; 
                            padding: 12px 24px; 
                            border-radius: 6px; 
                            font-size: 1rem; 
                            cursor: pointer;
                        "
                    >
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    async verifyRecaptcha() {
        if (this.submissionRecaptchaToken) {
            console.log('🔐 Using submission reCAPTCHA token');
            return this.submissionRecaptchaToken;
        }
        
        if (this.recaptchaToken) {
            console.log('🔐 Using initial reCAPTCHA token as fallback');
            return this.recaptchaToken;
        }
        
        console.warn('⚠️ No reCAPTCHA token available, proceeding without verification');
        return null;
    }

    // FIXED: Complete data preparation matching database schema exactly
    prepareSubmissionData() {
        console.log('📦 === PREPARING SUBMISSION DATA ===');
        console.log('📦 Raw responses:', this.responses);
        
        // Helper function to convert active/inactive to yes/no
        const convertActiveToYesNo = (value) => {
            if (value === 'active') return 'yes';
            if (value === 'inactive') return 'no';
            return value;
        };
        
        // Helper function to safely get nested response data
        const getResponseData = (moduleId, field, defaultValue = null) => {
            const response = this.responses[moduleId];
            if (!response || !response.data) return defaultValue;
            return response.data[field] !== undefined ? response.data[field] : defaultValue;
        };
        
        // Initialize submission data with all required fields
        const submissionData = {
            // ===== REQUIRED USER INFO FIELDS =====
            full_name: getResponseData('user-info', 'fullName', ''),
            company_name: getResponseData('user-info', 'companyName', ''),
            email: getResponseData('user-info', 'email', ''),
            phone: getResponseData('user-info', 'phone', ''),
            country_name: getResponseData('user-info', 'countryName', ''),
            country_code: getResponseData('user-info', 'countryCode', ''),
            country_flag: getResponseData('user-info', 'countryFlag'),
            industry_dropdown: getResponseData('user-info', 'industryDropdown'),
            industry_freetext: getResponseData('user-info', 'industryFreetext'),
            
            // ===== PARAMETERS FIELDS =====
            quick_parameters_choice: this.responses['combined-parameters']?.quickParametersChoice === 'yes' ? 'yes' : 'no',
            model_periodicity: getResponseData('combined-parameters', 'periodicity'),
            historical_start_date: getResponseData('combined-parameters', 'fullDate'),
            forecast_years: this.responses['combined-parameters']?.forecastYears ? 
                parseInt(this.responses['combined-parameters'].forecastYears) : null,
            
            // ===== MODELING APPROACH FIELDS =====
            model_purpose_selected: this.responses['modeling-approach-combined']?.selectedPurposes || null,
            model_purpose_freetext: getResponseData('modeling-approach-combined', 'customPurpose'),
            modeling_approach: this.responses['modeling-approach-combined']?.modelingApproach || null,
            
            // ===== REVENUE FIELDS =====
            revenue_generation_selected: this.responses['revenue-structure']?.selectedRevenues || null,
            revenue_generation_freetext: getResponseData('revenue-structure', 'customRevenue'),
            charging_models: this.responses['revenue-structure']?.chargingModels || null,
            product_procurement_selected: this.responses['revenue-structure']?.procurement || null,
            product_procurement_freetext: getResponseData('revenue-structure', 'customProcurement'),
            sales_channels_selected: this.responses['revenue-structure']?.salesChannels || null,
            sales_channels_freetext: getResponseData('revenue-structure', 'customSalesChannel'),
            revenue_staff: convertActiveToYesNo(this.responses['revenue-structure']?.revenueStaff),
            
            // ===== COGS FIELDS =====
            manufactures_products: convertActiveToYesNo(this.responses['cogs-codb']?.manufacturesProducts),
            
            // ===== WORKING CAPITAL FIELDS (FIXED FIELD NAMES) =====
            multiple_inventory_methods: convertActiveToYesNo(this.responses['working-capital']?.multipleInventoryMethods),
            inventory_days_outstanding: convertActiveToYesNo(this.responses['working-capital']?.inventoryDaysOutstanding),
            prepaid_expenses_days: convertActiveToYesNo(this.responses['working-capital']?.prepaidExpensesDays),
            
            // ===== TAX FIELDS =====
            corporate_tax_enabled: this.responses['taxes']?.corporateTax === 'yes',
            value_tax_enabled: this.responses['taxes']?.valueTax === 'yes',
            corporate_tax_model: this.responses['taxes']?.corporateTaxModel || null,
            corporate_tax_model_custom: getResponseData('taxes', 'corporateTaxModelCustom'),
            value_tax_model: this.responses['taxes']?.valueTaxModel || null,
            value_tax_model_custom: getResponseData('taxes', 'valueTaxModelCustom'),
            
            // ===== ASSETS FIELDS =====
            asset_types_selected: this.responses['assets']?.selectedAssets || null,
            asset_types_freetext: getResponseData('assets', 'customAssetType'),
            multiple_depreciation_methods: convertActiveToYesNo(this.responses['assets']?.multipleDepreciationMethods),
            units_of_production_depreciation: convertActiveToYesNo(this.responses['assets']?.unitsOfProductionDepreciation),
            
            // ===== EQUITY FINANCING FIELDS =====
            equity_financing_approach: this.responses['equity-financing']?.dividendsPaidWhenDeclared === 'active' ? 
                'dividends_when_declared' : null,
            equity_financing_custom: getResponseData('equity-financing', 'customApproach'),
            equity_financing_details: getResponseData('equity-financing', 'details'),
            
            // ===== CUSTOMIZATION FLAGS (from global customization preferences) =====
            customization_revenue: window.customizationPreferences?.revenueCustomization === true,
            customization_cogs: window.customizationPreferences?.cogsCustomization === true,
            customization_expenses: window.customizationPreferences?.expensesCustomization === true,
            customization_assets: window.customizationPreferences?.assetsCustomization === true,
            customization_working_capital: window.customizationPreferences?.workingCapitalCustomization === true,
            customization_taxes: window.customizationPreferences?.taxesCustomization === true,
            customization_debt: window.customizationPreferences?.debtCustomization === true,
            customization_equity: window.customizationPreferences?.equityCustomization === true,
            customization_summary: window.customizationPreferences || null,
            
            // ===== COMPLETION TRACKING =====
            questionnaire_completion_status: 'completed',
            total_completion_time_seconds: this.startTime ? 
                Math.round((Date.now() - this.startTime) / 1000) : null,
            modules_completed: Object.keys(this.responses),
            skipped_modules: [],
            
            // ===== METADATA =====
            user_agent: navigator.userAgent,
            submission_count: 1,
            
            // ===== SECURITY =====
            honeypot_website: null,
            honeypot_phone: null
        };
        
        // Add reCAPTCHA token if available
        const recaptchaToken = this.submissionRecaptchaToken || this.recaptchaToken;
        if (recaptchaToken) {
            submissionData.recaptchaToken = recaptchaToken;
        }
        
        console.log('📦 Submission data prepared:', submissionData);
        console.log('📦 === END PREPARING SUBMISSION DATA ===');
        
        return submissionData;
    }

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
        
        if (this.nextBtn) {
            this.nextBtn.disabled = false;
            this.nextBtn.textContent = 'Try Again';
            this.nextBtn.onclick = () => this.retrySubmission();
        }
    }

    showSuccessMessage() {
        console.log('✅ Submission successful, redirecting to loading page...');
        
        const statusDiv = document.getElementById('submission-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 20px; margin-top: 20px;">
                    <h4 style="color: #4ade80; margin-bottom: 10px;">Successfully Submitted!</h4>
                    <p style="color: #4ade80; margin-bottom: 10px;">Your responses have been saved.</p>
                    <p style="color: #4ade80; font-size: 0.9rem;">Redirecting to loading page...</p>
                </div>
            `;
        }
        
        if (this.questionContent) {
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">✅</div>
                    <h3 style="color: #22c55e; margin-bottom: 20px; font-size: 1.8rem;">Successfully Submitted!</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px; font-size: 1.1rem; line-height: 1.6;">
                        Your questionnaire has been submitted successfully. 
                    </p>
                    <p style="color: rgba(255,255,255,0.6); font-size: 1rem;">
                        Redirecting to the loading page...
                    </p>
                    <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #22c55e; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-top: 20px;"></div>
                </div>
            `;
        }
        
        // Redirect to loading page after a short delay
        setTimeout(() => {
            if (this.submissionId) {
                console.log(`🔄 Redirecting to loading page with submission_id: ${this.submissionId}`);
                window.location.href = `/pages/loading.html?submission_id=${this.submissionId}`;
            } else {
                console.error('❌ No submission ID available for redirect');
                alert('Submission was successful, but there was an issue with the redirect. Please contact support.');
            }
        }, 2000);
    }

    retrySubmission() {
        console.log('🔄 Retrying submission...');
        
        const statusDiv = document.getElementById('submission-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #8b5cf6; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 10px; color: rgba(255,255,255,0.6);">Retrying submission...</p>
            `;
        }
        
        if (this.nextBtn) {
            this.nextBtn.disabled = true;
            this.nextBtn.textContent = 'Retrying...';
        }
        
        this.submitResponses();
    }

    async submitResponses() {
        try {
            console.log('📤 Submitting responses...');
            
            // Get reCAPTCHA token
            const recaptchaToken = await this.verifyRecaptcha();
            console.log('🔐 Using submission reCAPTCHA token');
            
            // Prepare submission data
            const submissionData = this.prepareSubmissionData();
            
            // Add reCAPTCHA token if available
            if (recaptchaToken) {
                submissionData.recaptchaToken = recaptchaToken;
            }
            
            console.log('📦 Submission data prepared:', submissionData);
            
            // Submit to API
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Submission successful:', result);
            
            if (result.submission_id) {
                this.submissionId = result.submission_id;
                console.log('✅ Submission ID stored:', this.submissionId);
            } else {
                console.error('❌ No submission_id in response:', result);
            }
            
            this.showSuccessMessage();
            return result;
            
        } catch (error) {
            console.error('❌ Submission failed:', error);
            
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

    // Utility methods
    getCurrentModule() {
        return this.modules[this.currentModuleIndex] || null;
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

    getCurrentState() {
        return {
            currentModule: this.currentModuleIndex,
            totalModules: this.modules.length,
            responses: { ...this.responses },
            progress: Math.round(((this.currentModuleIndex + 1) / this.modules.length) * 100),
            isInitialized: this.isInitialized,
            userHasInteracted: this.userHasInteracted
        };
    }

    reset() {
        this.currentModuleIndex = 0;
        this.responses = {};
        this.userHasInteracted = false;
        this.isProcessingNavigation = false;
        this.submissionId = null;
        this.submissionRecaptchaToken = null;
        this.recaptchaToken = null;
        this.submissionRecaptchaWidgetId = undefined;
        this.inlineRecaptchaId = undefined;
        this.startTime = Date.now();
        console.log('🔄 Questionnaire reset');
    }

    addResponse(moduleId, response) {
        this.responses[moduleId] = response;
        console.log(`💾 Response added for ${moduleId}:`, response);
        this.updateNavigationButtons();
    }

    getResponse(moduleId) {
        return this.responses[moduleId];
    }

    updateModuleResponse(moduleId, response) {
        this.responses[moduleId] = response;
        this.updateNavigationButtons();
    }

    isComplete() {
        return this.modules.every(module => {
            if (!this.shouldShowModule(module)) {
                return true;
            }
            if (module.isRequired && !module.isRequired()) {
                return true;
            }
            return this.responses[module.id] !== undefined;
        });
    }

    getCompletionPercentage() {
        const visibleModules = this.modules.filter(module => this.shouldShowModule(module));
        const completedModules = visibleModules.filter(module => this.responses[module.id] !== undefined);
        return visibleModules.length > 0 ? Math.round((completedModules.length / visibleModules.length) * 100) : 0;
    }

    debugModuleVisibility() {
        console.log('=== Module Visibility Debug ===');
        this.modules.forEach((module, index) => {
            const isVisible = this.shouldShowModule(module);
            const hasResponse = !!this.responses[module.id];
            console.log(`${index + 1}. ${module.id}: visible=${isVisible}, hasResponse=${hasResponse}`);
        });
        console.log('Current responses:', this.responses);
        console.log('===========================');
    }
}

// Global instance management
let questionnaireEngine = null;

// Global functions for HTML onclick handlers
window.nextQuestion = function() {
    if (questionnaireEngine) {
        questionnaireEngine.handleNext();
    }
};

window.previousQuestion = function() {
    if (questionnaireEngine) {
        questionnaireEngine.handleBack();
    }
};

// Global reCAPTCHA callbacks
window.onSubmissionRecaptchaComplete = function(token) {
    console.log('📞 Global submission reCAPTCHA callback triggered');
    if (window.questionnaireEngine) {
        console.warn('⚠️ Old reCAPTCHA callback triggered - this should not happen with inline security check');
    } else {
        console.error('❌ No questionnaire engine instance available for reCAPTCHA callback');
    }
};

export default QuestionnaireEngine;