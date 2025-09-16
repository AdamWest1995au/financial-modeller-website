// /pages/questionnaire/modules/revenue.module.js - UPDATED with Generic/Custom Logic
import { MultiSelect } from '../components/multi-select.js';
import { Toggle } from '../components/toggle.js';
import { GenericPlaceholder } from '../components/generic-placeholder.js';

export class RevenueModule {
    constructor() {
        this.id = 'revenue-structure';
        this.title = 'Revenue Structure';
        this.description = 'Help us understand how your business generates revenue and your operational setup.';
        this.required = false;
        this.components = {};
        this.userHasInteracted = false;
        
        // Default responses
        this.responses = {
            selectedRevenues: [],
            chargingModels: {},
            procurement: [],
            salesChannels: [],
            revenueStaff: 'no'
        };

        // Revenue generation options
        this.revenueOptions = [
            { value: 'products', text: 'Products' },
            { value: 'services', text: 'Services' },
            { value: 'assets', text: 'Leasing' },
            { value: 'other', text: 'Other' }
        ];

        // Charging model options for each revenue type
        this.chargingModelOptions = {
            'products': [
                { value: 'oneoff', text: 'One-off' },
                { value: 'subscription', text: 'Subscription' },
                { value: 'usage', text: 'Usage-based' },
                { value: 'freemium', text: 'Freemium' },
                { value: 'commission', text: 'Commission' },
                { value: 'advertising', text: 'Advertising' }
            ],
            'services': [
                { value: 'hourly', text: 'Hourly' },
                { value: 'project', text: 'Project-based' },
                { value: 'retainer', text: 'Retainer' },
                { value: 'subscription', text: 'Subscription' },
                { value: 'performance', text: 'Performance-based' },
                { value: 'commission', text: 'Commission' }
            ],
            'assets': [
                { value: 'fixed', text: 'Fixed Lease' },
                { value: 'variable', text: 'Variable Lease' },
                { value: 'percentage', text: 'Percentage of Revenue' },
                { value: 'usage', text: 'Usage-based' }
            ],
            'other': [
                { value: 'oneoff', text: 'One-off' },
                { value: 'subscription', text: 'Subscription' },
                { value: 'commission', text: 'Commission' },
                { value: 'custom', text: 'Custom' }
            ]
        };

        // Procurement options
        this.procurementOptions = [
            { value: 'manufacturing', text: 'Manufacturing' },
            { value: 'wholesale', text: 'Wholesale Purchasing' },
            { value: 'dropshipping', text: 'Drop Shipping' },
            { value: 'licensing', text: 'Licensing' },
            { value: 'none', text: 'No Physical Products' }
        ];

        // Sales channels options
        this.salesChannelsOptions = [
            { value: 'direct', text: 'Direct Sales' },
            { value: 'online', text: 'Online/E-commerce' },
            { value: 'retail', text: 'Retail Partners' },
            { value: 'distributors', text: 'Distributors' },
            { value: 'resellers', text: 'Resellers' },
            { value: 'marketplace', text: 'Marketplaces (Amazon, eBay, etc.)' },
            { value: 'subscription', text: 'Subscription Platforms' }
        ];
    }

    render() {
        // Check if this section should be Generic or Custom
        const isGeneric = this.isGenericModeSelected();
        
        if (isGeneric) {
            return this.renderGenericMode();
        } else {
            return this.renderCustomMode();
        }
    }

    isGenericModeSelected() {
        // Check global customization preferences
        if (typeof window !== 'undefined' && window.customizationPreferences) {
            return window.customizationPreferences.revenueCustomization === false;
        }
        
        // Default to custom mode if preferences not set
        return false;
    }

    renderGenericMode() {
        const placeholder = new GenericPlaceholder({
            sectionName: 'Revenue',
            description: 'A standard revenue model framework will be included with basic revenue streams, pricing models, and sales channels that you can customize in your final Excel model.',
            icon: '💰'
        });

        // Set generic responses for database
        this.responses = {
            selectedRevenues: ['generic'],
            chargingModels: { generic: 'standard' },
            procurement: ['generic'],
            salesChannels: ['generic'],
            revenueStaff: 'generic'
        };

        return placeholder.render();
    }

    renderCustomMode() {
        const container = document.createElement('div');
        container.className = 'revenue-container';

        // Revenue Generation Section
        const revenueSection = this.createRevenueSection();
        container.appendChild(revenueSection);

        // Charging Models Section (initially hidden)
        const chargingSection = this.createChargingModelsSection();
        container.appendChild(chargingSection);

        // Products-specific Section (initially hidden)
        const productsSection = this.createProductsSection();
        container.appendChild(productsSection);

        // Sales Channels Section
        const salesChannelsSection = this.createSalesChannelsSection();
        container.appendChild(salesChannelsSection);

        // Revenue Staff Section
        const staffSection = this.createRevenueStaffSection();
        container.appendChild(staffSection);

        return container;
    }

    createRevenueSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';
        section.id = 'revenueGenerationSection';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'How does your business generate revenue?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.innerHTML = 'Select all that apply. <span class="skip-text">You can skip this if you prefer.</span>';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-container';

        const revenueComponent = new MultiSelect({
            id: 'revenueGeneration',
            options: this.revenueOptions,
            placeholder: 'Search or select revenue types...',
            allowCustom: true,
            customIndicatorText: 'Press Enter to add your custom revenue type',
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
        section.className = 'conditional-section';
        section.id = 'chargingModelsSection';
        section.style.display = 'none';

        const title = document.createElement('div');
        title.className = 'parameter-title';
        title.textContent = 'How do you charge for each revenue type?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-description';
        subtitle.textContent = 'Understanding your pricing model helps us build accurate revenue projections.';

        const container = document.createElement('div');
        container.className = 'charging-models-container';
        container.id = 'chargingModelsContainer';

        section.appendChild(title);
        section.appendChild(subtitle);
        section.appendChild(container);

        return section;
    }

    createProductsSection() {
        const section = document.createElement('div');
        section.className = 'conditional-section';
        section.id = 'productsSpecificSection';
        section.style.display = 'none';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'How do you procure/acquire your products?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.innerHTML = 'Select all that apply. <span class="skip-text">You can skip this if you prefer.</span>';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-container';

        const procurementComponent = new MultiSelect({
            id: 'procurement',
            options: this.procurementOptions,
            placeholder: 'Search or select procurement methods...',
            allowCustom: true,
            customIndicatorText: 'Press Enter to add your custom procurement method',
            onChange: (selectedValues) => {
                this.userHasInteracted = true;
                this.responses.procurement = selectedValues;
                this.onResponseChange();
            }
        });

        this.components.procurement = procurementComponent;
        procurementComponent.render(dropdownContainer);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);

        return section;
    }

    createSalesChannelsSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'What sales channels do you use?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.innerHTML = 'Select all that apply. <span class="skip-text">You can skip this if you prefer.</span>';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-container';

        const salesChannelsComponent = new MultiSelect({
            id: 'salesChannels',
            options: this.salesChannelsOptions,
            placeholder: 'Search or select sales channels...',
            allowCustom: true,
            customIndicatorText: 'Press Enter to add your custom sales channel',
            onChange: (selectedValues) => {
                this.userHasInteracted = true;
                this.responses.salesChannels = selectedValues;
                this.onResponseChange();
            }
        });

        this.components.salesChannels = salesChannelsComponent;
        salesChannelsComponent.render(dropdownContainer);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);

        return section;
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
        title.textContent = 'Do your staff generate revenue?';

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
        const chargingModelComponent = new MultiSelect({
            id: componentId,
            options: options,
            placeholder: `Select ${displayName.toLowerCase()} charging model...`,
            allowCustom: true,
            customIndicatorText: 'Press Enter to add your custom charging model',
            onChange: (selectedValues) => {
                this.userHasInteracted = true;
                if (!this.responses.chargingModels) {
                    this.responses.chargingModels = {};
                }
                this.responses.chargingModels[revenueType] = selectedValues;
                this.onResponseChange();
            }
        });

        this.components[componentId] = chargingModelComponent;
        chargingModelComponent.render(document.getElementById(componentId));
    }

    clearChargingModelComponents() {
        const container = document.getElementById('chargingModelsContainer');
        if (container) {
            // Remove old components
            Object.keys(this.components).forEach(key => {
                if (key.startsWith('chargingModel')) {
                    if (this.components[key] && this.components[key].destroy) {
                        this.components[key].destroy();
                    }
                    delete this.components[key];
                }
            });
            
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
            type: 'revenue-structure',
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

        // Update components with loaded data (only in custom mode)
        if (!this.isGenericModeSelected()) {
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
        const isGeneric = this.isGenericModeSelected();
        
        return {
            revenue_generation_selected: this.responses.selectedRevenues.length > 0 ? this.responses.selectedRevenues : null,
            charging_models: Object.keys(this.responses.chargingModels).length > 0 ? this.responses.chargingModels : null,
            product_procurement_selected: this.responses.procurement.length > 0 ? this.responses.procurement : null,
            sales_channels_selected: this.responses.salesChannels.length > 0 ? this.responses.salesChannels : null,
            revenue_staff: this.responses.revenueStaff,
            is_generic_revenue: isGeneric
        };
    }

    destroy() {
        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components = {};
    }
}

export default RevenueModule;

if (typeof window !== 'undefined') {
    window.RevenueModule = RevenueModule;
}