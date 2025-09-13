// /pages/questionnaire/modules/revenue.module.js
import { MultiSelect } from '../components/multi-select.js';
import { Toggle } from '../components/toggle.js';

export class RevenueModule {
    constructor() {
        this.id = 'revenue-structure';
        this.title = 'Revenue Structure';
        this.description = 'Help us understand how your business generates revenue and your operational setup.';
        this.required = false;
        
        this.components = {};
        this.userHasInteracted = false; // Track if user has made any selections
        this.responses = {
            selectedRevenues: [],
            chargingModels: {},
            procurement: [],
            salesChannels: [],
            revenueStaff: 'no'
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

    render() {
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

        // Add interaction prompt
        container.appendChild(this.createInteractionPrompt());

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
                this.updateInteractionStatus();
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
        section.className = 'conditional-section';
        section.id = 'productsSpecificSection';
        section.style.display = 'none';

        const title = document.createElement('div');
        title.className = 'parameter-title';
        title.style.color = '#ffffff';
        title.style.marginBottom = '20px';
        title.textContent = 'Products specific questions';

        section.appendChild(title);

        // Product Procurement Subsection
        const procurementDiv = document.createElement('div');
        procurementDiv.style.marginBottom = '25px';

        const procurementRow = document.createElement('div');
        procurementRow.className = 'parameter-toggle-row';

        const procurementText = document.createElement('div');
        procurementText.className = 'parameter-toggle-text';

        const procurementTitle = document.createElement('div');
        procurementTitle.className = 'parameter-toggle-title';
        procurementTitle.textContent = 'Product procurement';

        const procurementSubtitle = document.createElement('div');
        procurementSubtitle.className = 'parameter-toggle-subtitle';
        procurementSubtitle.textContent = 'How do you source your products?';

        procurementText.appendChild(procurementTitle);
        procurementText.appendChild(procurementSubtitle);

        const procurementContainer = document.createElement('div');
        procurementContainer.className = 'procurement-dropdown-container';
        procurementContainer.style.flex = '0 0 375px';

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
            onChange: (values) => {
                this.userHasInteracted = true;
                this.responses.procurement = values;
                this.updateInteractionStatus();
                this.onResponseChange();
            }
        });

        this.components.procurement = procurementComponent;
        procurementComponent.render(procurementContainer);

        procurementRow.appendChild(procurementText);
        procurementRow.appendChild(procurementContainer);
        procurementDiv.appendChild(procurementRow);

        // Sales Channels Subsection
        const channelsDiv = document.createElement('div');

        const channelsRow = document.createElement('div');
        channelsRow.className = 'parameter-toggle-row';

        const channelsText = document.createElement('div');
        channelsText.className = 'parameter-toggle-text';

        const channelsTitle = document.createElement('div');
        channelsTitle.className = 'parameter-toggle-title';
        channelsTitle.textContent = 'Sales Channels';

        const channelsSubtitle = document.createElement('div');
        channelsSubtitle.className = 'parameter-toggle-subtitle';
        channelsSubtitle.textContent = 'What channels do you use to sell your products?';

        channelsText.appendChild(channelsTitle);
        channelsText.appendChild(channelsSubtitle);

        const channelsContainer = document.createElement('div');
        channelsContainer.className = 'channels-dropdown-container';
        channelsContainer.style.flex = '0 0 375px';

        const channelsComponent = new MultiSelect({
            id: 'salesChannels',
            placeholder: 'Search or select sales channels...',
            options: [
                { value: 'physical', text: 'Physical shopfront' },
                { value: 'website', text: 'Website' },
                { value: 'b2b', text: 'Sales driven (B2B)' }
            ],
            allowCustom: true,
            required: false,
            onChange: (values) => {
                this.userHasInteracted = true;
                this.responses.salesChannels = values;
                this.updateInteractionStatus();
                this.onResponseChange();
            }
        });

        this.components.salesChannels = channelsComponent;
        channelsComponent.render(channelsContainer);

        channelsRow.appendChild(channelsText);
        channelsRow.appendChild(channelsContainer);
        channelsDiv.appendChild(channelsRow);

        section.appendChild(procurementDiv);
        section.appendChild(channelsDiv);

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
                this.updateInteractionStatus();
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

    createInteractionPrompt() {
        const section = document.createElement('div');
        section.id = 'interactionPrompt';
        section.style.cssText = `
            background: rgba(239, 68, 68, 0.1);
            border: 2px solid #ef4444;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        `;

        section.innerHTML = `
            <div style="color: #ef4444; font-weight: bold; margin-bottom: 10px;">
                Please make at least one selection above to continue
            </div>
            <div style="color: #ffffff; font-size: 14px;">
                You can select revenue types, staffing preferences, or skip this section entirely by clicking Next.
            </div>
        `;

        return section;
    }

    updateInteractionStatus() {
        const prompt = document.getElementById('interactionPrompt');
        if (prompt) {
            if (this.userHasInteracted) {
                prompt.style.cssText = `
                    background: rgba(16, 185, 129, 0.1);
                    border: 2px solid #10b981;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                `;
                prompt.innerHTML = `
                    <div style="color: #10b981; font-weight: bold; margin-bottom: 10px;">
                        Selections recorded! You can continue or make additional changes.
                    </div>
                    <div style="color: #ffffff; font-size: 14px;">
                        Click Next when you're ready to proceed.
                    </div>
                `;
            }
        }
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

        const label = document.createElement('div');
        label.className = 'charging-model-label';
        label.textContent = displayName;

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'charging-model-dropdown-container';

        wrapper.appendChild(label);
        wrapper.appendChild(dropdownContainer);
        container.appendChild(wrapper);

        // Create component
        const options = this.chargingModelOptions[revenueType] || this.chargingModelOptions['other'];
        
        const chargingComponent = new MultiSelect({
            id: componentId,
            placeholder: 'Select charging model...',
            options: options,
            allowCustom: true,
            required: false,
            onChange: (values) => {
                this.userHasInteracted = true;
                this.responses.chargingModels[revenueType] = values;
                this.updateInteractionStatus();
                this.onResponseChange();
            }
        });

        chargingComponent.render(dropdownContainer);
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
            userHasInteracted: this.userHasInteracted,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response) return;

        this.responses = {
            selectedRevenues: response.selectedRevenues || [],
            chargingModels: response.chargingModels || {},
            procurement: response.procurement || [],
            salesChannels: response.salesChannels || [],
            revenueStaff: response.revenueStaff || 'no'
        };

        this.userHasInteracted = response.userHasInteracted || false;

        // Update components
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

            this.updateInteractionStatus();
        }, 100);
    }

    validate() {
        // Always return valid - user can skip this section
        // But track whether user has interacted for UI feedback
        return {
            isValid: true,
            errors: []
        };
    }

    shouldShow(responses) {
        return true;
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