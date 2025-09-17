// /pages/questionnaire/modules/revenue.module.js - COMPLETE VERSION WITH CUSTOMIZATION LISTENER
import { MultiSelect } from '../components/multi-select.js';
import { Toggle } from '../components/toggle.js';

export class RevenueModule {
    constructor() {
        this.id = 'revenue-structure';
        this.title = 'Revenue Structure';
        this.description = 'Help us understand how your business generates revenue and your operational setup.';
        this.required = false;
        
        this.components = {};
        this.currentContainer = null; // Store reference to container for re-rendering
        this.userHasInteracted = false; // Track user interaction for engine
        this.responses = {
            selectedRevenues: [],
            chargingModels: {},
            procurement: [],
            salesChannels: [],
            revenueStaff: 'no'
        };

        // Revenue type to charging model mappings - UPDATED TO UNIFIED OPTIONS
        this.chargingModelOptions = {
            'products': [
                { value: 'oneoff', text: 'One off fees' },
                { value: 'subscription', text: 'Subscription services' },
                { value: 'royalties', text: 'Royalties' }
            ],
            'services': [
                { value: 'oneoff', text: 'One off fees' },
                { value: 'subscription', text: 'Subscription services' },
                { value: 'royalties', text: 'Royalties' }
            ],
            'assets': [
                { value: 'oneoff', text: 'One off fees' },
                { value: 'subscription', text: 'Subscription services' },
                { value: 'royalties', text: 'Royalties' }
            ],
            'other': [
                { value: 'oneoff', text: 'One off fees' },
                { value: 'subscription', text: 'Subscription services' },
                { value: 'royalties', text: 'Royalties' }
            ]
        };

        // Listen for customization changes
        this.setupCustomizationListener();
    }

    setupCustomizationListener() {
    // Store the bound function so we can remove it later
    this.customizationChangeHandler = (event) => {
        console.log('Revenue module received customization change:', event.detail);
        if (this.currentContainer) {
            this.reRender();
        }
    };
    
    // Listen for customization changes and re-render
    document.addEventListener('customizationChanged', this.customizationChangeHandler);
}

    reRender() {
        if (!this.currentContainer) return;
        
        // Clear current content
        this.currentContainer.innerHTML = '';
        
        // Re-render with new customization settings
        const newContent = this.renderContent();
        this.currentContainer.appendChild(newContent);
    }

    render() {
        // Store container reference for re-rendering
        const container = document.createElement('div');
        this.currentContainer = container;
        
        // Render the actual content
        const content = this.renderContent();
        container.appendChild(content);
        
        return container;
    }

    renderContent() {
        // Check customization preference using consistent method
        const responses = window.questionnaireEngine?.stateManager?.getAllResponses() || {};
        const customizationResponse = responses['customization-preference'];
        const isGeneric = !customizationResponse?.customizationPreferences?.revenue || 
                         customizationResponse.customizationPreferences.revenue === 'generic';

        if (isGeneric) {
            return this.createGenericPlaceholder();
        } else {
            return this.createCustomContent();
        }
    }

    createGenericPlaceholder() {
        const container = document.createElement('div');
        container.className = 'placeholder-container';
        
        const content = document.createElement('div');
        content.className = 'placeholder-content';
        content.innerHTML = `
            <div class="animated-graphic">
                <svg viewBox="0 0 120 80">
                    <defs>
                        <radialGradient id="circleGradientRevenue" cx="50%" cy="50%">
                            <stop offset="0%" style="stop-color:#c084fc;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                        </radialGradient>
                    </defs>
                    <g class="circle-group-1">
                        <circle cx="20" cy="40" r="4" class="circle" fill="url(#circleGradientRevenue)" />
                    </g>
                    <g class="circle-group-2">
                        <circle cx="60" cy="40" r="4" class="circle" fill="url(#circleGradientRevenue)" />
                    </g>
                    <g class="circle-group-3">
                        <circle cx="100" cy="40" r="4" class="circle" fill="url(#circleGradientRevenue)" />
                    </g>
                </svg>
            </div>
            <h4 class="placeholder-title">GENERIC MODELLING APPROACH SELECTED</h4>
            <p class="placeholder-description">
                You've chosen to use our generic model for this section. 
                This will save you time during setup while still providing comprehensive financial projections.
            </p>
            <p class="placeholder-description" style="margin-top: 10px;">
                You can customise this section at a later date if needed.
                You can continue to the next section for now.
            </p>
        `;
        
        container.appendChild(content);
        return container;
    }

    createCustomContent() {
        const container = document.createElement('div');
        container.className = 'combined-parameters-container';

        // Revenue Generation Section
        container.appendChild(this.createRevenueGenerationSection());

        // Dynamic Charging Models Section
        const chargingSection = this.createChargingModelsSection();
        container.appendChild(chargingSection);

        // Products Specific Questions Section
        const productsSection = this.createProductsSpecificSection();
        container.appendChild(productsSection);

        // Revenue Staff Section
        container.appendChild(this.createRevenueStaffSection());

        return container;
    }

    createRevenueGenerationSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'How does your business generate revenue?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Select all the ways your business generates revenue. This helps us understand your revenue model and structure the financial projections accordingly.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'revenue-dropdown-container';
        dropdownContainer.style.flex = '0 0 375px';

        const revenueComponent = new MultiSelect({
            id: 'revenueGeneration',
            placeholder: 'Search or select revenue models...',
            options: [
                { value: 'products', text: 'Sell Products' },
                { value: 'services', text: 'Sell Services' },
                { value: 'assets', text: 'Lease Assets' },
                { value: 'other', text: 'Other Revenue Model' }
            ],
            allowCustom: true,
            required: false,
            onChange: (selectedValues) => {
                this.userHasInteracted = true;
                this.responses.selectedRevenues = selectedValues;
                this.updateConditionalSections(selectedValues);
                this.updateChargingModels(selectedValues);
                this.onResponseChange();
            }
        });

        this.components.revenueGeneration = revenueComponent;
        revenueComponent.render(dropdownContainer);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);

        return section;
    }

    createChargingModelsSection() {
        const section = document.createElement('div');
        section.className = 'charging-models-section';
        section.id = 'chargingModelsSection';
        section.style.display = 'none';

        const header = document.createElement('div');
        header.className = 'charging-models-header';

        const title = document.createElement('div');
        title.className = 'charging-models-title';
        title.textContent = 'Charging Models';

        const description = document.createElement('div');
        description.className = 'charging-models-description';
        description.textContent = 'Tell us how you charge customers for each revenue stream.';

        header.appendChild(title);
        header.appendChild(description);

        const container = document.createElement('div');
        container.className = 'charging-models-container';
        container.id = 'chargingModelsContainer';

        section.appendChild(header);
        section.appendChild(container);

        return section;
    }

    createProductsSpecificSection() {
        const section = document.createElement('div');
        section.className = 'products-specific-section';
        section.id = 'productsSpecificSection';
        section.style.display = 'none';

        // Product Procurement Component
        const procurementRow = this.createProcurementRow();
        section.appendChild(procurementRow);

        // Sales Channels Component
        const channelsRow = this.createSalesChannelsRow();
        section.appendChild(channelsRow);

        return section;
    }

    createProcurementRow() {
        const row = document.createElement('div');
        row.className = 'parameter-section';

        const headerRow = document.createElement('div');
        headerRow.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Product procurement';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'How do you procure/source your products?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'procurement-dropdown-container';
        dropdownContainer.style.flex = '0 0 375px';

        const procurementComponent = new MultiSelect({
            id: 'productProcurement',
            placeholder: 'Search or select procurement methods...',
            options: [
                { value: 'wholesale_own', text: 'Wholesale (manage own logistics)' },
                { value: 'wholesale_3pl', text: 'Wholesale (Logistics handled by a 3PL/manufacturer)' },
                { value: 'manufacture', text: 'Manufacture products' }
            ],
            allowCustom: true,
            required: false,
            onChange: (selectedValues) => {
                this.userHasInteracted = true;
                this.responses.procurement = selectedValues;
                this.onResponseChange();
            }
        });

        this.components.procurement = procurementComponent;
        procurementComponent.render(dropdownContainer);

        headerRow.appendChild(textDiv);
        headerRow.appendChild(dropdownContainer);
        row.appendChild(headerRow);

        return row;
    }

    createSalesChannelsRow() {
        const row = document.createElement('div');
        row.className = 'parameter-section';

        const headerRow = document.createElement('div');
        headerRow.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Sales channels';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'What are your main sales channels?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'channels-dropdown-container';
        dropdownContainer.style.flex = '0 0 375px';

        const channelsComponent = new MultiSelect({
            id: 'salesChannels',
            placeholder: 'Search or select sales channels...',
            options: [
                { value: 'physical_shopfront', text: 'Physical shopfront' },
                { value: 'website', text: 'Website' },
                { value: 'sales_driven_b2b', text: 'Sales driven (B2B)' }
            ],
            allowCustom: true,
            required: false,
            onChange: (selectedValues) => {
                this.userHasInteracted = true;
                this.responses.salesChannels = selectedValues;
                this.onResponseChange();
            }
        });

        this.components.salesChannels = channelsComponent;
        channelsComponent.render(dropdownContainer);

        headerRow.appendChild(textDiv);
        headerRow.appendChild(dropdownContainer);
        row.appendChild(headerRow);

        return row;
    }

    createRevenueStaffSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Do you have revenue generating staff?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Understanding your staffing structure helps us model your operational costs and revenue generation capacity more accurately.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const staffComponent = new Toggle({
            id: 'revenueStaff',
            labels: ['No', 'Yes'],
            defaultValue: 'no',
            onChange: (value) => {
                this.userHasInteracted = true;
                this.responses.revenueStaff = value;
                this.onResponseChange();
            }
        });

        this.components.revenueStaff = staffComponent;
        staffComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
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
            required: false,
            onChange: (selectedValues) => {
                this.userHasInteracted = true;
                this.responses.chargingModels[revenueType] = selectedValues;
                this.onResponseChange();
            }
        });

        chargingComponent.render(document.getElementById(componentId));
        this.components[componentId] = chargingComponent;
    }

    clearChargingModelComponents() {
        const container = document.getElementById('chargingModelsContainer');
        if (container) {
            // Remove components from our tracking
            Object.keys(this.components).forEach(key => {
                if (key.startsWith('chargingModel')) {
                    const component = this.components[key];
                    if (component.destroy) {
                        component.destroy();
                    }
                    delete this.components[key];
                }
            });
            
            // Clear container
            container.innerHTML = '';
        }
    }

    onResponseChange() {
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    getResponse() {
        return {
            type: 'revenue-combined',
            selectedRevenues: [...this.responses.selectedRevenues],
            chargingModels: { ...this.responses.chargingModels },
            procurement: [...this.responses.procurement],
            salesChannels: [...this.responses.salesChannels],
            revenueStaff: this.responses.revenueStaff,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response) return;

        // Load response data
        this.responses = {
            selectedRevenues: response.selectedRevenues || [],
            chargingModels: response.chargingModels || {},
            procurement: response.procurement || [],
            salesChannels: response.salesChannels || [],
            revenueStaff: response.revenueStaff || 'no'
        };

        // Only update components in custom mode
        const responses = window.questionnaireEngine?.stateManager?.getAllResponses() || {};
        const customizationResponse = responses['customization-preference'];
        const isGeneric = !customizationResponse?.customizationPreferences?.revenue || 
                         customizationResponse.customizationPreferences.revenue === 'generic';

        if (!isGeneric) {
            // Update components with loaded data
            setTimeout(() => {
                if (this.components.revenueGeneration) {
                    this.components.revenueGeneration.setValue(this.responses.selectedRevenues);
                    this.updateConditionalSections(this.responses.selectedRevenues);
                    this.updateChargingModels(this.responses.selectedRevenues);
                }

                if (this.components.procurement) {
                    this.components.procurement.setValue(this.responses.procurement);
                }

                if (this.components.salesChannels) {
                    this.components.salesChannels.setValue(this.responses.salesChannels);
                }

                if (this.components.revenueStaff) {
                    this.components.revenueStaff.setValue(this.responses.revenueStaff);
                }

                // Load charging models
                Object.entries(this.responses.chargingModels).forEach(([revenueType, values]) => {
                    const componentKey = `chargingModel${revenueType}`;
                    if (this.components[componentKey]) {
                        this.components[componentKey].setValue(values);
                    }
                });
            }, 100);
        }
    }

    validate() {
        // Always return valid - users can skip this section entirely
        return {
            isValid: true,
            errors: []
        };
    }

    shouldShow(responses) {
        return true; // Always show revenue module
    }

    getDatabaseFields() {
        return {
            revenue_generation_selected: this.responses.selectedRevenues.length > 0 ? this.responses.selectedRevenues : null,
            charging_models: Object.keys(this.responses.chargingModels).length > 0 ? this.responses.chargingModels : null,
            product_procurement_selected: this.responses.procurement.length > 0 ? this.responses.procurement : null,
            sales_channels_selected: this.responses.salesChannels.length > 0 ? this.responses.salesChannels : null,
            revenue_staff: this.responses.revenueStaff
        };
    }

    destroy() {
    // Clean up event listeners
    if (this.customizationChangeHandler) {
        document.removeEventListener('customizationChanged', this.customizationChangeHandler);
    }
    
    Object.values(this.components).forEach(component => {
        if (component.destroy) {
            component.destroy();
        }
    });
    this.components = {};
    this.currentContainer = null;
}
}

export default RevenueModule;

if (typeof window !== 'undefined') {
    window.RevenueModule = RevenueModule;
}