// /pages/questionnaire/core/engine.js

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
        
        // UI Elements
        this.questionModal = null;
        this.questionTitle = null;
        this.questionDescription = null;
        this.questionContent = null;
        this.nextBtn = null;
        this.backBtn = null;
        this.progressFill = null;
        this.progressText = null;
    }

    async initialize() {
        try {
            console.log('Initializing Simple Questionnaire Engine...');
            
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
            console.log('Simple Questionnaire Engine initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Simple Questionnaire Engine:', error);
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
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.handleNext());
        }
        
        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => this.handleBack());
        }
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
        const currentModule = this.modules[this.currentModuleIndex];
        
        if (!currentModule) {
            this.completeQuestionnaire();
            return;
        }
        
        console.log(`Showing module: ${currentModule.id}`);
        
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
        const currentModule = this.modules[this.currentModuleIndex];
        
        if (!currentModule) return;
        
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
                // Could show validation errors here
                return;
            }
        }
        
        // Move to next module or complete
        if (this.currentModuleIndex < this.modules.length - 1) {
            this.currentModuleIndex++;
            this.showCurrentModule();
        } else {
            this.completeQuestionnaire();
        }
    }

    handleBack() {
        if (this.currentModuleIndex > 0) {
            this.currentModuleIndex--;
            this.showCurrentModule();
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
                    <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 25px; margin: 30px 0;">
                        <h4 style="color: #8b5cf6; margin-bottom: 15px; font-size: 1.1rem;">What happens next?</h4>
                        <p style="color: rgba(255,255,255,0.9); margin: 0; line-height: 1.5;">
                            Our financial modeling specialists will review your responses and create a tailored model for your business. 
                            You'll receive an email within 24-48 hours with your model and instructions for next steps.
                        </p>
                    </div>
                </div>
            `;
        }
        
        // Hide back button, change next to close
        if (this.backBtn) this.backBtn.style.display = 'none';
        if (this.nextBtn) {
            this.nextBtn.textContent = 'Close';
            this.nextBtn.onclick = () => this.hideModal();
        }
        
        // In a real implementation, you would submit the responses to your backend here
        this.submitResponses();
    }

    async submitResponses() {
        try {
            console.log('Submitting responses...');
            
            // Prepare submission data
            const submissionData = {
                responses: this.responses,
                completedAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
                moduleCount: this.modules.length
            };
            
            // Add individual module database fields
            for (const module of this.modules) {
                if (module.getDatabaseFields && this.responses[module.id]) {
                    const dbFields = module.getDatabaseFields();
                    Object.assign(submissionData, dbFields);
                }
            }
            
            console.log('Submission data prepared:', submissionData);
            
            // In a real implementation, submit to your backend:
            // const response = await fetch(this.config.apiEndpoint, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(submissionData)
            // });
            
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
        console.log('Questionnaire reset');
    }
}

// Also export as default for flexibility
export default QuestionnaireEngine;