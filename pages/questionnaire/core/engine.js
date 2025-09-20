// /pages/questionnaire/core/engine.js - COMPLETE ENGINE WITH FIXED COMPLETION FLOW

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
        this.showSimpleSecurityCheck = this.showSimpleSecurityCheck.bind(this);
        this.handleFinalSubmission = this.handleFinalSubmission.bind(this);
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
                } else if (e.key === 'ArrowLeft' && this.backBtn?.style.display !== 'none') {
                    this.handleBack();
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
            
            this.questionModal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const isValidTarget = e.target.tagName === 'BUTTON' || 
                                        e.target.getAttribute('role') === 'button' ||
                                        e.target.hasAttribute('data-allow-enter');
                    if (!isValidTarget) {
                        console.log('🚫 Enter key prevented on', e.target.tagName);
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
        
        // Make sure we're showing a visible module
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
                console.log(`⏭️ Skipping module during show: ${currentModule.id}`);
                this.currentModuleIndex++;
                continue;
            }
        }
        
        const currentModule = this.modules[this.currentModuleIndex];
        if (!currentModule) {
            console.log('🎉 No current module - completing questionnaire');
            this.completeQuestionnaire();
            return;
        }
        
        console.log(`📋 Showing module: ${currentModule.id} (${this.currentModuleIndex + 1}/${this.modules.length})`);
        
        // Reset interaction flag for new module
        this.userHasInteracted = false;
        
        // Update question number
        if (this.questionNumber) {
            this.questionNumber.textContent = this.currentModuleIndex + 1;
        }
        
        // Handle customization questions with time display
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
        // Track any user interactions within the module
        const interactionEvents = ['click', 'change', 'input', 'keydown'];
        
        interactionEvents.forEach(eventType => {
            container.addEventListener(eventType, (e) => {
                // Only count real user interactions, not programmatic events
                if (e.isTrusted) {
                    console.log(`👆 User interaction detected: ${eventType}`);
                    this.userHasInteracted = true;
                    this.updateNavigationButtons();
                }
            }, true); // Use capture phase
        });
    }

    shouldShowModule(module) {
        let shouldShow = true;
        
        // First check with conditional logic system if available
        if (this.conditionalLogic) {
            try {
                // Use the conditional logic system to check global rules for this module
                const moduleRules = this.conditionalLogic.rules.get(module.id);
                if (moduleRules && moduleRules['*']) {
                    const ruleResult = this.conditionalLogic.evaluateRule(moduleRules['*'], this.responses, null);
                    console.log(`🧠 Conditional logic for ${module.id}: ${ruleResult}`);
                    shouldShow = shouldShow && ruleResult;
                }
            } catch (error) {
                console.error(`❌ Error in conditional logic for module ${module.id}:`, error);
                // Continue with module's own shouldShow method
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
                // Default to showing if error, but respect conditional logic result
            }
        }
        
        // Default to showing module if no conditional logic and no module shouldShow method
        if (!this.conditionalLogic && typeof module.shouldShow !== 'function') {
            console.log(`📋 Module ${module.id} has no conditional logic - showing by default`);
            shouldShow = true;
        }
        
        console.log(`✅ Final decision for ${module.id}: ${shouldShow}`);
        return shouldShow;
    }

    findNextVisibleModule() {
        // Find the next module after current that should be shown
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
        return -1; // No more visible modules
    }

    findPreviousVisibleModule() {
        // Find the previous module before current that should be shown
        for (let i = this.currentModuleIndex - 1; i >= 0; i--) {
            const module = this.modules[i];
            if (this.shouldShowModule(module)) {
                console.log(`⏮️ Previous visible module found: ${module.id} at index ${i}`);
                return i;
            } else {
                console.log(`⏮️ Skipping previous module: ${module.id} (conditional logic)`);
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

    // FIXED WITH EXTENSIVE DEBUG LOGGING
    handleNext() {
        console.log('🔍 DEBUG: handleNext called');
        console.log('🔍 DEBUG: isProcessingNavigation:', this.isProcessingNavigation);
        console.log('🔍 DEBUG: userHasInteracted:', this.userHasInteracted);
        
        if (this.isProcessingNavigation) {
            console.log('⏸️ Already processing navigation, ignoring handleNext');
            return;
        }
        
        // CRITICAL: Only proceed if user has interacted
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
                console.log('🔍 DEBUG: No current module, processing navigation false');
                this.isProcessingNavigation = false;
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
            
            // Find next visible module instead of just incrementing
            console.log('🔍 DEBUG: Looking for next visible module...');
            const nextModuleIndex = this.findNextVisibleModule();
            console.log('🔍 DEBUG: Next module index:', nextModuleIndex);
            
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
                this.completeQuestionnaire();
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

    // FIXED COMPLETION FLOW WITH DEBUG LOGGING
    completeQuestionnaire() {
        console.log('🎉 DEBUG: completeQuestionnaire called!');
        console.log('🎉 DEBUG: Questionnaire completed! Responses:', this.responses);
        
        // Show completion pane with simplified security check
        if (this.questionContent) {
            console.log('🎉 DEBUG: Updating question content with completion screen');
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🎉</div>
                    <h3 style="color: #8b5cf6; margin-bottom: 20px; font-size: 1.8rem;">Questionnaire Complete!</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px; font-size: 1.1rem; line-height: 1.6;">
                        Thank you for completing our questionnaire. One final security check is required before we can process your submission.
                    </p>
                    <p style="color: rgba(255,255,255,0.6); margin-bottom: 40px; font-size: 0.95rem;">
                        After verification, our team will create your custom financial model and you'll receive an email within 24-48 hours.
                    </p>
                    
                    <!-- Simple Security Check Button -->
                    <div style="margin-bottom: 30px;">
                        <button 
                            id="securityCheckBtn" 
                            onclick="window.questionnaireEngine.showSimpleSecurityCheck()" 
                            class="security-check-btn"
                            style="
                                background: rgba(139, 92, 246, 0.2); 
                                border: 1px solid rgba(139, 92, 246, 0.4); 
                                color: #8b5cf6; 
                                padding: 8px 16px; 
                                border-radius: 6px; 
                                font-size: 0.9rem; 
                                cursor: pointer;
                                transition: all 0.2s ease;
                            "
                            onmouseover="this.style.background='rgba(139, 92, 246, 0.3)'"
                            onmouseout="this.style.background='rgba(139, 92, 246, 0.2)'"
                        >
                            🔒 Security Check Required
                        </button>
                    </div>
                    
                    <p style="color: rgba(255,255,255,0.5); font-size: 0.85rem; margin-bottom: 20px;">
                        You can skip any question and come back to it later
                    </p>
                </div>
            `;
            console.log('🎉 DEBUG: Question content updated successfully');
        } else {
            console.error('🎉 DEBUG: questionContent element not found!');
        }
        
        // Update progress to 100%
        this.updateProgress(100);
        console.log('🎉 DEBUG: Progress updated to 100%');
        
        // Hide back button, update next button for final submission
        if (this.backBtn) {
            this.backBtn.style.display = 'none';
            console.log('🎉 DEBUG: Back button hidden');
        }
        if (this.nextBtn) {
            this.nextBtn.textContent = 'Complete Questionnaire';
            this.nextBtn.disabled = false;
            this.nextBtn.onclick = () => this.showSimpleSecurityCheck();
            console.log('🎉 DEBUG: Next button updated for final submission');
        }
        
        // Hide skip text for completion page
        if (this.skipTextContainer) {
            this.skipTextContainer.style.display = 'none';
            console.log('🎉 DEBUG: Skip text hidden');
        }
        
        console.log('🎉 DEBUG: completeQuestionnaire finished');
    }

    /**
     * Show simplified security check (inline reCAPTCHA)
     */
    showSimpleSecurityCheck() {
        console.log('🔐 DEBUG: Showing simple security check...');
        
        // Show inline reCAPTCHA instead of modal
        if (this.questionContent) {
            console.log('🔐 DEBUG: Updating content for security check');
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 2.5rem; margin-bottom: 20px;">🔒</div>
                    <h3 style="color: #8b5cf6; margin-bottom: 20px; font-size: 1.6rem;">Security Verification</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 30px; font-size: 1rem; line-height: 1.6;">
                        Please complete the security check below to submit your questionnaire.
                    </p>
                    
                    <!-- reCAPTCHA Container -->
                    <div style="display: flex; justify-content: center; margin-bottom: 30px;">
                        <div id="inlineRecaptcha"></div>
                    </div>
                    
                    <!-- Submit Button (initially disabled) -->
                    <button 
                        id="finalSubmitBtn" 
                        onclick="window.questionnaireEngine.handleFinalSubmission()" 
                        disabled
                        class="final-submit-btn"
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
                        "
                    >
                        Complete Questionnaire
                    </button>
                    
                    <div style="margin-top: 20px;">
                        <button 
                            onclick="window.questionnaireEngine.completeQuestionnaire()" 
                            class="back-btn-security"
                            style="
                                background: transparent; 
                                border: none; 
                                color: rgba(255,255,255,0.5); 
                                font-size: 0.9rem; 
                                cursor: pointer;
                                text-decoration: underline;
                            "
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            `;
            console.log('🔐 DEBUG: Security check content updated');
        }
        
        // Update next button to be hidden during security check
        if (this.nextBtn) {
            this.nextBtn.style.display = 'none';
            console.log('🔐 DEBUG: Next button hidden');
        }
        
        // Initialize inline reCAPTCHA
        setTimeout(() => {
            this.initializeInlineRecaptcha();
        }, 100);
    }

    /**
     * Initialize inline reCAPTCHA
     */
    initializeInlineRecaptcha() {
        console.log('🔐 DEBUG: Initializing inline reCAPTCHA...');
        if (window.grecaptcha && window.grecaptcha.ready) {
            window.grecaptcha.ready(() => {
                try {
                    // Clean up any existing reCAPTCHA
                    if (this.inlineRecaptchaId !== undefined) {
                        grecaptcha.reset(this.inlineRecaptchaId);
                    }
                    
                    // Render new reCAPTCHA
                    const container = document.getElementById('inlineRecaptcha');
                    if (container) {
                        this.inlineRecaptchaId = grecaptcha.render('inlineRecaptcha', {
                            'sitekey': this.config.recaptchaSiteKey,
                            'callback': this.onInlineRecaptchaComplete,
                            'expired-callback': this.onInlineRecaptchaExpired
                        });
                        console.log('✅ Inline reCAPTCHA rendered successfully');
                    } else {
                        console.error('❌ inlineRecaptcha container not found');
                    }
                } catch (error) {
                    console.error('❌ Error rendering inline reCAPTCHA:', error);
                    // Fallback: enable submit button if reCAPTCHA fails
                    this.enableFinalSubmit();
                }
            });
        } else {
            console.warn('⚠️ reCAPTCHA not loaded, enabling submit button');
            this.enableFinalSubmit();
        }
    }

    /**
     * Handle inline reCAPTCHA completion
     */
    onInlineRecaptchaComplete(token) {
        console.log('✅ Inline reCAPTCHA completed');
        this.submissionRecaptchaToken = token;
        this.enableFinalSubmit();
    }

    /**
     * Handle inline reCAPTCHA expiration
     */
    onInlineRecaptchaExpired() {
        console.log('⏰ Inline reCAPTCHA expired');
        this.submissionRecaptchaToken = null;
        this.disableFinalSubmit();
    }

    /**
     * Enable final submit button
     */
    enableFinalSubmit() {
        const submitBtn = document.getElementById('finalSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.cursor = 'pointer';
            submitBtn.style.opacity = '1';
            submitBtn.style.background = '#22c55e';
            
            submitBtn.onmouseover = () => {
                submitBtn.style.background = '#16a34a';
            };
            submitBtn.onmouseout = () => {
                submitBtn.style.background = '#22c55e';
            };
            console.log('✅ Final submit button enabled');
        }
    }

    /**
     * Disable final submit button
     */
    disableFinalSubmit() {
        const submitBtn = document.getElementById('finalSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.opacity = '0.5';
            submitBtn.style.background = '#6b7280';
            submitBtn.onmouseover = null;
            submitBtn.onmouseout = null;
            console.log('❌ Final submit button disabled');
        }
    }

    /**
     * Handle final submission
     */
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

    /**
     * Show submission loading state
     */
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

    /**
     * Show submission error
     */
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
                        onclick="window.questionnaireEngine.showSimpleSecurityCheck()" 
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

    // OLD COMPATIBILITY METHODS FOR BACKWARDS COMPATIBILITY
    proceedWithSubmission(recaptchaToken) {
        console.log('📤 Proceeding with submission...');
        
        // Store the submission reCAPTCHA token
        this.submissionRecaptchaToken = recaptchaToken;
        
        // Submit responses
        this.submitResponses();
    }

    showSubmissionStatus() {
        if (this.questionContent) {
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📤</div>
                    <h3 style="color: #8b5cf6; margin-bottom: 20px; font-size: 1.8rem;">Submitting Your Responses</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 30px; font-size: 1.1rem; line-height: 1.6;">
                        We're now submitting your responses and our team will create your custom financial model.
                        You'll receive an email within 24-48 hours with your model and instructions for next steps.
                    </p>
                    <div id="submission-status" style="margin-top: 20px;">
                        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #8b5cf6; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 10px; color: rgba(255,255,255,0.6);">Submitting your responses...</p>
                    </div>
                </div>
            `;
        }
        
        // Add CSS for spinner if not already added
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
    }

    // reCAPTCHA verification
    async verifyRecaptcha() {
        // Use the submission reCAPTCHA token if available
        if (this.submissionRecaptchaToken) {
            console.log('🔐 Using submission reCAPTCHA token');
            return this.submissionRecaptchaToken;
        }
        
        // Fallback to initial reCAPTCHA token if needed
        if (this.recaptchaToken) {
            console.log('🔐 Using initial reCAPTCHA token as fallback');
            return this.recaptchaToken;
        }
        
        console.warn('⚠️ No reCAPTCHA token available, proceeding without verification');
        return null;
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
            
            // Assets fields
            asset_types_selected: null,
            asset_types_freetext: null,
            multiple_depreciation_methods: 'no',
            
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
                    console.log(`💾 Database fields from ${module.id}:`, dbFields);
                } catch (error) {
                    console.warn(`⚠️ Error getting database fields from module ${module.id}:`, error);
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

    // Show success message and redirect to loading page
    showSuccessMessage() {
        console.log('✅ Submission successful, redirecting to loading page...');
        
        // Show brief success message before redirect
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
        
        // Also update the question content to show redirect message
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
        
        // Redirect to loading page after a short delay (2 seconds)
        setTimeout(() => {
            if (this.submissionId) {
                console.log(`🔄 Redirecting to loading page with submission_id: ${this.submissionId}`);
                window.location.href = `/pages/loading.html?submission_id=${this.submissionId}`;
            } else {
                console.error('❌ No submission ID available for redirect');
                // Fallback: try to redirect anyway or show error
                alert('Submission was successful, but there was an issue with the redirect. Please contact support.');
            }
        }, 2000);
    }

    // Retry submission
    retrySubmission() {
        console.log('🔄 Retrying submission...');
        
        // Reset the status display
        const statusDiv = document.getElementById('submission-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #8b5cf6; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 10px; color: rgba(255,255,255,0.6);">Retrying submission...</p>
            `;
        }
        
        // Disable button during retry
        if (this.nextBtn) {
            this.nextBtn.disabled = true;
            this.nextBtn.textContent = 'Retrying...';
        }
        
        // Retry submission
        this.submitResponses();
    }

    // Main submission method
    async submitResponses() {
        try {
            console.log('📤 Submitting responses...');
            
            // Verify reCAPTCHA if configured
            const recaptchaToken = await this.verifyRecaptcha();
            
            // Prepare submission data
            const submissionData = this.prepareSubmissionData();
            
            // Add reCAPTCHA token if available
            if (recaptchaToken) {
                submissionData.recaptchaToken = recaptchaToken;
            }
            
            // Add completion time
            if (this.startTime) {
                submissionData.completion_time = Date.now() - this.startTime;
            }
            
            console.log('📦 Submission data prepared:', submissionData);
            
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
            console.log('✅ Submission successful:', result);
            
            // Store the submission ID for the redirect
            if (result.submission_id) {
                this.submissionId = result.submission_id;
                console.log('✅ Submission ID stored:', this.submissionId);
            } else {
                console.error('❌ No submission_id in response:', result);
            }
            
            // Show success message (which will now redirect)
            this.showSuccessMessage();
            
            return result;
            
        } catch (error) {
            console.error('❌ Submission failed:', error);
            
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

    showErrorModule(message) {
        if (this.questionContent) {
            this.questionContent.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <div style="font-size: 2rem; margin-bottom: 20px;">⚠️</div>
                    <h3 style="margin-bottom: 15px;">Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // Public API methods
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

    // Response management
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

    // Completion checking
    isComplete() {
        return this.modules.every(module => {
            if (!this.shouldShowModule(module)) {
                return true; // Hidden modules are considered complete
            }
            if (module.isRequired && !module.isRequired()) {
                return true; // Not required, so considered complete
            }
            return this.responses[module.id] !== undefined;
        });
    }

    getCompletionPercentage() {
        const visibleModules = this.modules.filter(module => this.shouldShowModule(module));
        const completedModules = visibleModules.filter(module => this.responses[module.id] !== undefined);
        return visibleModules.length > 0 ? Math.round((completedModules.length / visibleModules.length) * 100) : 0;
    }

    // Debug utilities
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

    // Event system for extensibility
    addEventListener(eventType, callback) {
        if (!this._eventListeners) {
            this._eventListeners = {};
        }
        if (!this._eventListeners[eventType]) {
            this._eventListeners[eventType] = [];
        }
        this._eventListeners[eventType].push(callback);
    }

    removeEventListener(eventType, callback) {
        if (!this._eventListeners || !this._eventListeners[eventType]) {
            return;
        }
        const index = this._eventListeners[eventType].indexOf(callback);
        if (index > -1) {
            this._eventListeners[eventType].splice(index, 1);
        }
    }

    emit(eventType, data) {
        if (!this._eventListeners || !this._eventListeners[eventType]) {
            return;
        }
        this._eventListeners[eventType].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${eventType}:`, error);
            }
        });
    }
}

// Global instance management
let questionnaireEngine = null;

// Initialize global functions for HTML onclick handlers
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

// Global reCAPTCHA callbacks - Updated for inline security check only
window.onSubmissionRecaptchaComplete = function(token) {
    console.log('📞 Global submission reCAPTCHA callback triggered - using inline approach');
    if (window.questionnaireEngine) {
        // For inline reCAPTCHA, the token is handled by onInlineRecaptchaComplete
        // This callback shouldn't be used anymore, but keeping for safety
        console.warn('⚠️ Old reCAPTCHA callback triggered - this should not happen with inline security check');
    } else {
        console.error('❌ No questionnaire engine instance available for reCAPTCHA callback');
    }
};

// Export for use in modules
export default QuestionnaireEngine;