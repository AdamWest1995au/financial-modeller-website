// /pages/questionnaire/modules/working-capital.module.js - COMPLETE REWRITE
import { BaseComponent } from '../components/base-component.js';
import { Toggle } from '../components/toggle.js';
import { GenericPlaceholder } from '../components/generic-placeholder.js';

export class WorkingCapitalModule {
    constructor() {
        this.id = 'working-capital';
        this.title = 'Working Capital';
        this.description = 'Configure how you want to model working capital components including inventory, receivables, and payables.';
        this.required = false;
        
        this.components = {};
        this.currentContainer = null;
        this.responses = {
            multipleInventoryMethods: 'no',
            inventoryDaysOutstanding: 'no',
            prepaidExpensesDays: 'no'
        };

        // Setup customization listener
        this.setupCustomizationListener();
    }

    setupCustomizationListener() {
        this.customizationChangeHandler = (event) => {
            console.log('Working Capital module received customization change:', event.detail);
            if (this.currentContainer) {
                this.reRender();
            }
        };
        
        document.addEventListener('customizationChanged', this.customizationChangeHandler);
    }

    reRender() {
        if (!this.currentContainer) return;
        
        this.currentContainer.innerHTML = '';
        const newContent = this.renderContent();
        this.currentContainer.appendChild(newContent);
    }

    render() {
        const container = document.createElement('div');
        this.currentContainer = container;
        
        const content = this.renderContent();
        container.appendChild(content);
        
        return container;
    }

    renderContent() {
        console.log('=== WORKING CAPITAL MODULE DEBUG ===');
        
        const isGeneric = this.isGenericModeSelected();
        console.log('Working Capital isGeneric:', isGeneric);
        console.log('=== END WORKING CAPITAL MODULE DEBUG ===');

        if (isGeneric) {
            console.log('SHOWING GENERIC PLACEHOLDER FOR WORKING CAPITAL');
            return this.createGenericPlaceholder();
        }

        console.log('SHOWING CUSTOM WORKING CAPITAL CONTENT');
        return this.createCustomContent();
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
                        <radialGradient id="circleGradientWorkingCapital" cx="50%" cy="50%">
                            <stop offset="0%" style="stop-color:#c084fc;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                        </radialGradient>
                    </defs>
                    <g class="circle-group-1">
                        <circle cx="20" cy="40" r="4" class="circle" fill="url(#circleGradientWorkingCapital)" />
                    </g>
                    <g class="circle-group-2">
                        <circle cx="60" cy="40" r="4" class="circle" fill="url(#circleGradientWorkingCapital)" />
                    </g>
                    <g class="circle-group-3">
                        <circle cx="100" cy="40" r="4" class="circle" fill="url(#circleGradientWorkingCapital)" />
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
        container.className = 'working-capital-content';

        // Check if user selected "Sell Products" in revenue module
        const sellsProducts = this.detectProductsSelection();
        console.log('User sells products:', sellsProducts);

        // Question 1: Multiple inventory methods (conditional on selling products)
        if (sellsProducts) {
            const inventoryMethodsSection = this.createInventoryMethodsSection();
            container.appendChild(inventoryMethodsSection);

            // Question 2: Inventory days outstanding (conditional on selling products)
            const inventoryDaysSection = this.createInventoryDaysSection();
            container.appendChild(inventoryDaysSection);
        }

        // Question 3: Prepaid expenses days (always shown)
        const prepaidExpensesSection = this.createPrepaidExpensesSection();
        container.appendChild(prepaidExpensesSection);

        // If no inventory questions shown, show informative message
        if (!sellsProducts) {
            const noProductsMessage = this.createNoProductsMessage();
            container.appendChild(noProductsMessage);
        }

        return container;
    }

    /**
     * Enhanced product detection with multiple fallback methods
     */
    detectProductsSelection() {
        console.log('=== ENHANCED PRODUCTS DETECTION ===');
        
        let sellsProducts = false;

        // Method 1: Check engine responses directly
        if (window.questionnaireEngine?.responses) {
            const engineResponses = window.questionnaireEngine.responses;
            console.log('Checking engine responses:', engineResponses);
            
            const revenueResponse = engineResponses['revenue-structure'];
            if (revenueResponse?.selectedRevenues) {
                sellsProducts = revenueResponse.selectedRevenues.includes('products');
                console.log('Engine check - selectedRevenues:', revenueResponse.selectedRevenues, 'Products found:', sellsProducts);
                if (sellsProducts) {
                    console.log('✅ Products detected via engine responses');
                    return sellsProducts;
                }
            }
        }

        // Method 2: Check state manager
        if (!sellsProducts && window.questionnaireEngine?.stateManager) {
            const allResponses = window.questionnaireEngine.stateManager.getAllResponses();
            console.log('Checking state manager responses:', allResponses);
            
            // Try multiple possible keys
            const possibleKeys = ['revenue-structure', 'revenue', 'revenue-combined'];
            
            for (const key of possibleKeys) {
                const response = allResponses[key];
                if (response) {
                    console.log(`Checking response under key '${key}':`, response);
                    
                    // Check selectedRevenues property
                    if (response.selectedRevenues && Array.isArray(response.selectedRevenues)) {
                        sellsProducts = response.selectedRevenues.includes('products');
                        console.log(`State manager check - ${key}.selectedRevenues:`, response.selectedRevenues, 'Products found:', sellsProducts);
                        if (sellsProducts) {
                            console.log(`✅ Products detected via state manager - ${key}`);
                            break;
                        }
                    }
                    
                    // Check nested data property
                    if (!sellsProducts && response.data?.selectedRevenues) {
                        sellsProducts = response.data.selectedRevenues.includes('products');
                        console.log(`State manager check - ${key}.data.selectedRevenues:`, response.data.selectedRevenues, 'Products found:', sellsProducts);
                        if (sellsProducts) {
                            console.log(`✅ Products detected via state manager - ${key}.data`);
                            break;
                        }
                    }
                }
            }
        }

        // Method 3: Check module instances directly
        if (!sellsProducts && window.questionnaireEngine?.modules) {
            console.log('Checking module instances...');
            const modules = window.questionnaireEngine.modules;
            
            for (const module of modules) {
                if (module.id === 'revenue-structure') {
                    console.log('Found revenue module:', module);
                    if (module.responses?.selectedRevenues) {
                        sellsProducts = module.responses.selectedRevenues.includes('products');
                        console.log('Module check - selectedRevenues:', module.responses.selectedRevenues, 'Products found:', sellsProducts);
                        if (sellsProducts) {
                            console.log('✅ Products detected via module instance');
                            break;
                        }
                    }
                }
            }
        }

        // Method 4: Global variable fallback
        if (!sellsProducts && window.revenueData) {
            console.log('Checking global revenue data:', window.revenueData);
            if (window.revenueData.selectedRevenues?.includes('products')) {
                sellsProducts = true;
                console.log('✅ Products detected via global variable');
            }
        }

        console.log('Final products detection result:', sellsProducts);
        console.log('=== END ENHANCED PRODUCTS DETECTION ===');
        
        return sellsProducts;
    }

    createInventoryMethodsSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Multiple inventory methods';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Would you like to model inventory using multiple methods (FIFO, LIFO, etc)?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const inventoryMethodsComponent = new Toggle({
            id: 'multipleInventoryMethods',
            labels: ['No', 'Yes'],
            defaultValue: this.responses.multipleInventoryMethods,
            onChange: (value) => {
                this.responses.multipleInventoryMethods = value;
                this.onResponseChange();
            }
        });

        this.components.multipleInventoryMethods = inventoryMethodsComponent;
        inventoryMethodsComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    createInventoryDaysSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Inventory days outstanding method';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Would you like to use the days outstanding method for calculating inventory?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const inventoryDaysComponent = new Toggle({
            id: 'inventoryDaysOutstanding',
            labels: ['No', 'Yes'],
            defaultValue: this.responses.inventoryDaysOutstanding,
            onChange: (value) => {
                this.responses.inventoryDaysOutstanding = value;
                this.onResponseChange();
            }
        });

        this.components.inventoryDaysOutstanding = inventoryDaysComponent;
        inventoryDaysComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    createPrepaidExpensesSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Prepaid expenses days method';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Would you like to model payments of prepaid expenses using the days method?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const prepaidExpensesComponent = new Toggle({
            id: 'prepaidExpensesDays',
            labels: ['No', 'Yes'],
            defaultValue: this.responses.prepaidExpensesDays,
            onChange: (value) => {
                this.responses.prepaidExpensesDays = value;
                this.onResponseChange();
            }
        });

        this.components.prepaidExpensesDays = prepaidExpensesComponent;
        prepaidExpensesComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    createNoProductsMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'working-capital-no-products-message';
        messageDiv.innerHTML = `
            <div class="info-message">
                <div class="info-icon">ℹ️</div>
                <div class="info-content">
                    <h4>Limited Working Capital Questions</h4>
                    <p>Since you haven't selected "Sell Products" in the Revenue section, some working capital questions related to inventory modeling are not applicable to your business model.</p>
                    <p>You can still configure prepaid expenses modeling above.</p>
                </div>
            </div>
        `;
        return messageDiv;
    }

    isGenericModeSelected() {
        let isGeneric = true; // Default to generic
        
        // Method 1: Check state manager responses
        if (window.questionnaireEngine?.stateManager) {
            const responses = window.questionnaireEngine.stateManager.getAllResponses();
            const customizationResponse = responses['customization'] || responses['customization-preference'];
            
            if (customizationResponse?.customizationPreferences?.workingCapital) {
                isGeneric = customizationResponse.customizationPreferences.workingCapital === 'generic';
                console.log('Customization check - using state manager:', isGeneric);
                return isGeneric;
            }
        }
        
        // Method 2: Check global customization variables
        if (window.customizationPreferencesFormatted?.workingCapital) {
            isGeneric = window.customizationPreferencesFormatted.workingCapital === 'generic';
            console.log('Customization check - using global formatted:', isGeneric);
            return isGeneric;
        }
        
        if (window.customizationPreferences?.workingCapitalCustomization !== undefined) {
            isGeneric = !window.customizationPreferences.workingCapitalCustomization;
            console.log('Customization check - using global raw:', isGeneric);
            return isGeneric;
        }
        
        console.log('Customization check - using default:', isGeneric);
        return isGeneric;
    }

    onResponseChange() {
        if (window.questionnaireEngine?.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    getResponse() {
        return {
            type: 'working-capital',
            multipleInventoryMethods: this.responses.multipleInventoryMethods,
            inventoryDaysOutstanding: this.responses.inventoryDaysOutstanding,
            prepaidExpensesDays: this.responses.prepaidExpensesDays,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response) return;

        this.responses = {
            multipleInventoryMethods: response.multipleInventoryMethods || 'no',
            inventoryDaysOutstanding: response.inventoryDaysOutstanding || 'no',
            prepaidExpensesDays: response.prepaidExpensesDays || 'no'
        };

        // Only update components in custom mode
        const isGeneric = this.isGenericModeSelected();
        if (!isGeneric) {
            setTimeout(() => {
                if (this.components.multipleInventoryMethods) {
                    this.components.multipleInventoryMethods.setValue(this.responses.multipleInventoryMethods);
                }

                if (this.components.inventoryDaysOutstanding) {
                    this.components.inventoryDaysOutstanding.setValue(this.responses.inventoryDaysOutstanding);
                }

                if (this.components.prepaidExpensesDays) {
                    this.components.prepaidExpensesDays.setValue(this.responses.prepaidExpensesDays);
                }
            }, 100);
        }
    }

    validate() {
        return {
            isValid: true,
            errors: []
        };
    }

    shouldShow(responses) {
        return true; // Always show Working Capital module
    }

    getDatabaseFields() {
        const isGeneric = this.isGenericModeSelected();
        
        return {
            multiple_inventory_methods: this.responses.multipleInventoryMethods,
            inventory_days_outstanding_method: this.responses.inventoryDaysOutstanding,
            prepaid_expenses_days_method: this.responses.prepaidExpensesDays,
            is_generic_working_capital: isGeneric
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

export default WorkingCapitalModule;

if (typeof window !== 'undefined') {
    window.WorkingCapitalModule = WorkingCapitalModule;
}