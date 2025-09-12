// /pages/questionnaire/modules/revenue.module.js
class RevenueModule {
    constructor() {
        this.id = 'revenue-structure';
        this.title = 'Revenue Structure';
        this.description = 'Help us understand how your business generates revenue and your operational setup.';
        
        this.engine = null;
        this.currentQuestionIndex = 0;
        this.components = new Map();
        
        // Define questions structure
        this.questions = [
            {
                id: 'revenue-generation',
                type: 'revenue-combined',
                title: 'Revenue Generation',
                description: 'Tell us about your revenue streams and operational structure.',
                required: false
            }
        ];

        // Conditional logic rules for this module
        this.conditionalLogic = {
            // Show products-specific sections only if 'products' is selected in revenue generation
            'products-procurement': (responses, questionData) => {
                const revenueData = this.getResponseData(responses, 'revenue-generation');
                return revenueData?.selectedRevenues?.includes('products') || false;
            },
            
            'sales-channels': (responses, questionData) => {
                const revenueData = this.getResponseData(responses, 'revenue-generation');
                return revenueData?.selectedRevenues?.includes('products') || false;
            },

            // Show charging models section if any revenue streams are selected
            'charging-models': (responses, questionData) => {
                const revenueData = this.getResponseData(responses, 'revenue-generation');
                return revenueData?.selectedRevenues?.length > 0 || false;
            }
        };

        // Revenue type to charging model mappings
        this.chargingModelOptions = {
            'products': [
                { value: 'oneoff', text: 'One off fees' },
                { value: 'subscription', text: 'Subscription services' },
                { value: 'royalties', text: 'Royalties' }
            ],
            'services': [
                { value: 'hourly', text: 'Hourly rates' },
                { value: 'project', text: 'Project-based' },
                { value: 'retainer', text: 'Monthly retainer' },
                { value: 'subscription', text: 'Subscription services' }
            ],
            'assets': [
                { value: 'rental', text: 'Rental fees' },
                { value: 'lease', text: 'Lease agreements' },
                { value: 'royalties', text: 'Royalties' }
            ],
            'other': [
                { value: 'commission', text: 'Commission-based' },
                { value: 'licensing', text: 'Licensing fees' },
                { value: 'advertising', text: 'Advertising revenue' }
            ]
        };
    }

    initialize(engine) {
        this.engine = engine;
        console.log(`📦 Revenue module initialized`);
    }

    getQuestions() {
        return this.questions;
    }

    async renderQuestion(questionIndex, callbacks) {
        this.currentQuestionIndex = questionIndex;
        const question = this.questions[questionIndex];
        
        if (!question) {
            throw new Error(`Question ${questionIndex} not found in revenue module`);
        }

        console.log(`🎨 Rendering revenue question: ${question.id}`);

        // Get the modal content container
        const modal = document.getElementById('questionModal');
        const questionContent = document.getElementById('questionContent');
        
        if (!modal || !questionContent) {
            throw new Error('Modal elements not found');
        }

        // Update modal header
        this.updateModalHeader(question);

        // Render the combined revenue form
        questionContent.innerHTML = this.createRevenueCombinedForm();
        
        // Setup all components and event listeners
        this.setupRevenueComponents(callbacks);
        
        // Show modal
        modal.classList.add('active', 'question-mode');
        
        return true;
    }

    updateModalHeader(question) {
        const questionTitle = document.getElementById('questionTitle');
        const questionDescription = document.getElementById('questionDescription');
        const questionNumber = document.getElementById('questionNumber');
        
        if (questionTitle) questionTitle.textContent = question.title;
        if (questionDescription) questionDescription.textContent = question.description;
        if (questionNumber) questionNumber.textContent = this.currentQuestionIndex + 1;
    }

    createRevenueCombinedForm() {
        return `
            <div class="combined-parameters-container">
                <!-- Revenue Generation Section -->
                <div class="parameter-section">
                    <div class="parameter-toggle-row">
                        <div class="parameter-toggle-text">
                            <div class="parameter-toggle-title">How does your business generate revenue?</div>
                            <div class="parameter-toggle-subtitle">Select all the ways your business generates revenue. This helps us understand your revenue model and structure the financial projections accordingly.</div>
                        </div>
                        <div class="revenue-dropdown-container" style="flex: 0 0 375px;">
                            <div id="revenueGenerationComponent"></div>
                        </div>
                    </div>
                </div>

                <!-- Dynamic Charging Models Section -->
                <div class="charging-models-section" id="chargingModelsSection" style="display: none;">
                    <div class="charging-models-header">
                        <div class="charging-models-title">Charging Models</div>
                        <div class="charging-models-description">Tell us how you charge customers for each revenue stream.</div>
                    </div>
                    <div class="charging-models-container" id="chargingModelsContainer">
                        <!-- Dynamic charging model components will be inserted here -->
                    </div>
                </div>

                <!-- Products Specific Questions Section -->
                <div class="conditional-section" id="productsSpecificSection" style="display: none;">
                    <div class="parameter-title" style="color: #ffffff; margin-bottom: 20px;">Products specific questions</div>
                    
                    <!-- Product Procurement Subsection -->
                    <div style="margin-bottom: 25px;">
                        <div class="parameter-toggle-row">
                            <div class="parameter-toggle-text">
                                <div class="parameter-toggle-title">Product procurement</div>
                                <div class="parameter-toggle-subtitle">How do you source your products?</div>
                            </div>
                            <div class="procurement-dropdown-container" style="flex: 0 0 375px;">
                                <div id="procurementComponent"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Sales Channels Subsection -->
                    <div>
                        <div class="parameter-toggle-row">
                            <div class="parameter-toggle-text">
                                <div class="parameter-toggle-title">Sales Channels</div>
                                <div class="parameter-toggle-subtitle">What channels do you use to sell your products?</div>
                            </div>
                            <div class="channels-dropdown-container" style="flex: 0 0 375px;">
                                <div id="salesChannelsComponent"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Revenue Staff Section -->
                <div class="parameter-section">
                    <div class="parameter-toggle-row">
                        <div class="parameter-toggle-text">
                            <div class="parameter-toggle-title">Do you have revenue generating staff?</div>
                            <div class="parameter-toggle-subtitle">Understanding your staffing structure helps us model your operational costs and revenue generation capacity more accurately.</div>
                        </div>
                        <div class="toggle-switch-container">
                            <div id="revenueStaffComponent"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupRevenueComponents(callbacks) {
        // 1. Setup Revenue Generation Multi-Select
        this.setupRevenueGenerationComponent(callbacks);
        
        // 2. Setup Product Procurement Multi-Select  
        this.setupProcurementComponent(callbacks);
        
        // 3. Setup Sales Channels Multi-Select
        this.setupSalesChannelsComponent(callbacks);
        
        // 4. Setup Revenue Staff Toggle
        this.setupRevenueStaffComponent(callbacks);
        
        // 5. Setup conditional visibility
        this.setupConditionalSections();
    }

    setupRevenueGenerationComponent(callbacks) {
        const container = document.getElementById('revenueGenerationComponent');
        
        const revenueComponent = new MultiSelect({
            id: 'revenueGeneration',
            label: '',
            placeholder: 'Search or select revenue models...',
            options: [
                { value: 'products', text: 'Sell Products' },
                { value: 'services', text: 'Sell Services' },
                { value: 'assets', text: 'Lease Assets' },
                { value: 'other', text: 'Other Revenue Model' }
            ],
            allowCustom: true,
            required: false
        });

        revenueComponent.render(container);
        this.components.set('revenueGeneration', revenueComponent);

        // Listen for changes to update conditional sections
        revenueComponent.on('change', (selectedValues) => {
            console.log('Revenue generation changed:', selectedValues);
            this.updateConditionalSections(selectedValues);
            this.updateChargingModels(selectedValues);
            callbacks.onValidate?.(this.collectCurrentData());
        });
    }

    setupProcurementComponent(callbacks) {
        const container = document.getElementById('procurementComponent');
        
        const procurementComponent = new MultiSelect({
            id: 'productProcurement',
            placeholder: 'Search or select procurement methods...',
            options: [
                { value: 'wholesale_own', text: 'Wholesale (manage own logistics)' },
                { value: 'wholesale_3pl', text: 'Wholesale (Logistics handled by a 3PL/manufacturer)' },
                { value: 'manufacture', text: 'Manufacture products' }
            ],
            allowCustom: true,
            required: false
        });

        procurementComponent.render(container);
        this.components.set('procurement', procurementComponent);

        procurementComponent.on('change', () => {
            callbacks.onValidate?.(this.collectCurrentData());
        });
    }

    setupSalesChannelsComponent(callbacks) {
        const container = document.getElementById('salesChannelsComponent');
        
        const channelsComponent = new MultiSelect({
            id: 'salesChannels',
            placeholder: 'Search or select sales channels...',
            options: [
                { value: 'physical', text: 'Physical shopfront' },
                { value: 'website', text: 'Website' },
                { value: 'b2b', text: 'Sales driven (B2B)' }
            ],
            allowCustom: true,
            required: false
        });

        channelsComponent.render(container);
        this.components.set('salesChannels', channelsComponent);

        channelsComponent.on('change', () => {
            callbacks.onValidate?.(this.collectCurrentData());
        });
    }

    setupRevenueStaffComponent(callbacks) {
        const container = document.getElementById('revenueStaffComponent');
        
        const staffComponent = new Toggle({
            id: 'revenueStaff',
            labels: ['No', 'Yes'],
            values: ['no', 'yes'],
            defaultValue: 'no'
        });

        staffComponent.render(container);
        this.components.set('revenueStaff', staffComponent);

        staffComponent.on('change', () => {
            callbacks.onValidate?.(this.collectCurrentData());
        });
    }

    updateConditionalSections(selectedRevenues) {
        const productsSection = document.getElementById('productsSpecificSection');
        
        if (productsSection) {
            const showProducts = selectedRevenues.includes('products');
            productsSection.style.display = showProducts ? 'block' : 'none';
            
            if (showProducts) {
                productsSection.classList.add('show');
            } else {
                productsSection.classList.remove('show');
            }
        }
    }

    updateChargingModels(selectedRevenues) {
        const chargingSection = document.getElementById('chargingModelsSection');
        const container = document.getElementById('chargingModelsContainer');
        
        if (!chargingSection || !container) return;

        // Clear existing charging model components
        this.clearChargingModelComponents();

        if (selectedRevenues.length === 0) {
            chargingSection.style.display = 'none';
            return;
        }

        // Show section and create components for each revenue type
        chargingSection.style.display = 'block';
        chargingSection.classList.add('show');
        
        selectedRevenues.forEach(revenueType => {
            this.createChargingModelComponent(container, revenueType);
        });
    }

    createChargingModelComponent(container, revenueType) {
        const revenueLabels = {
            'products': 'Products',
            'services': 'Services',
            'assets': 'Leasing',
            'other': 'Other'
        };

        const componentId = `chargingModel${revenueType}`;
        const displayName = revenueLabels[revenueType] || revenueType;

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'charging-model-item';
        wrapper.innerHTML = `
            <div class="charging-model-label">${displayName}</div>
            <div class="charging-model-dropdown-container">
                <div id="${componentId}"></div>
            </div>
        `;
        
        container.appendChild(wrapper);

        // Create component
        const options = this.chargingModelOptions[revenueType] || this.chargingModelOptions['other'];
        
        const chargingComponent = new MultiSelect({
            id: componentId,
            placeholder: 'Select charging model...',
            options: options,
            allowCustom: true,
            required: false
        });

        chargingComponent.render(document.getElementById(componentId));
        this.components.set(componentId, chargingComponent);

        chargingComponent.on('change', () => {
            // Validate when charging models change
            if (this.engine) {
                this.engine.validator.validateCurrentQuestion();
            }
        });
    }

    clearChargingModelComponents() {
        const container = document.getElementById('chargingModelsContainer');
        if (container) {
            // Remove components from our tracking
            Array.from(this.components.keys()).forEach(key => {
                if (key.startsWith('chargingModel')) {
                    const component = this.components.get(key);
                    component.destroy();
                    this.components.delete(key);
                }
            });
            
            // Clear container
            container.innerHTML = '';
        }
    }

    setupConditionalSections() {
        // Initial state - hide all conditional sections
        this.updateConditionalSections([]);
        this.updateChargingModels([]);
    }

    validateQuestion(questionIndex, data) {
        // Revenue questions are optional, so always return true
        // Individual components handle their own validation
        return true;
    }

    collectCurrentData() {
        const data = {
            type: 'revenue-combined',
            timestamp: Date.now()
        };

        // Collect data from all components
        this.components.forEach((component, key) => {
            data[key] = component.getValue();
        });

        return data;
    }

    collectData() {
        return this.collectCurrentData();
    }

    collectSubmissionData(responses) {
        // Transform component data to database schema format
        const firstResponse = responses[0] || {};
        
        // Extract revenue generation data
        const selectedRevenues = firstResponse.revenueGeneration || [];
        
        // Extract charging models data
        const chargingModels = {};
        Object.entries(firstResponse).forEach(([key, value]) => {
            if (key.startsWith('chargingModel') && value && value.length > 0) {
                const revenueType = key.replace('chargingModel', '').toLowerCase();
                chargingModels[revenueType] = value;
            }
        });

        return {
            // Revenue questions - updated to handle new charging models structure
            revenue_generation_selected: selectedRevenues.length > 0 ? selectedRevenues : null,
            revenue_generation_freetext: null, // Now handled within the multi-select
            
            // Individual charging models per revenue type
            charging_models: Object.keys(chargingModels).length > 0 ? chargingModels : null,
            
            // Product procurement fields (conditional)
            product_procurement_selected: firstResponse.procurement?.length > 0 ? firstResponse.procurement : null,
            product_procurement_freetext: null, // Now handled within the multi-select
            
            // Sales channels fields (conditional)
            sales_channels_selected: firstResponse.salesChannels?.length > 0 ? firstResponse.salesChannels : null,
            sales_channels_freetext: null, // Now handled within the multi-select
            
            revenue_staff: firstResponse.revenueStaff || 'no'
        };
    }

    loadPreviousResponse(questionIndex, responseData) {
        console.log('Loading previous revenue response:', responseData);
        
        // Load data into components
        Object.entries(responseData).forEach(([key, value]) => {
            const component = this.components.get(key);
            if (component && value !== undefined) {
                console.log(`Loading ${key}:`, value);
                component.setValue(value);
            }
        });

        // Update conditional sections based on loaded data
        const revenueComponent = this.components.get('revenueGeneration');
        if (revenueComponent) {
            const selectedRevenues = revenueComponent.getValue() || [];
            this.updateConditionalSections(selectedRevenues);
            this.updateChargingModels(selectedRevenues);
        }
    }

    getResponseData(responses, questionId) {
        // Helper to get response data for a specific question
        const moduleResponses = responses[this.id] || {};
        return Object.values(moduleResponses).find(response => 
            response.type === 'revenue-combined'
        );
    }

    destroy() {
        // Clean up all components
        this.components.forEach(component => {
            component.destroy();
        });
        this.components.clear();
    }
}

// Export the module
window.RevenueModule = RevenueModule;