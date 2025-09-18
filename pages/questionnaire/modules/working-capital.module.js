// /pages/questionnaire/modules/working-capital.module.js
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
        this.currentContainer = null; // Store reference to container for re-rendering
        this.responses = {
            multipleInventoryMethods: 'no',
            inventoryDaysOutstanding: 'no',
            prepaidExpensesDays: 'no'
        };

        // Listen for customization changes
        this.setupCustomizationListener();
    }

    setupCustomizationListener() {
        // Store the bound function so we can remove it later
        this.customizationChangeHandler = (event) => {
            console.log('Working Capital module received customization change:', event.detail);
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
        console.log('=== WORKING CAPITAL MODULE DEBUG ===');
        
        // Check if generic mode is selected
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
        const placeholder = new GenericPlaceholder({
            sectionName: 'Working Capital',
            description: 'A standard working capital model will be provided including basic inventory, receivables, and payables calculations.',
            icon: '💼'
        });
        
        return placeholder.render();
    }

    createCustomContent() {
        const container = document.createElement('div');
        container.className = 'working-capital-content';

        // Check if user selected "Sell Products" in revenue module
        const sellsProducts = this.checkIfUserSellsProducts();
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

        // If no questions are shown, show a message
        if (!sellsProducts) {
            const noQuestionsMessage = this.createNoProductsMessage();
            container.appendChild(noQuestionsMessage);
        }

        return container;
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

    checkIfUserSellsProducts() {
        // Check if user selected "Sell Products" (products) in the revenue module
        let sellsProducts = false;

        // Try multiple ways to get the revenue data
        const responses = window.questionnaireEngine?.stateManager?.getAllResponses() || {};
        
        // Check for revenue responses
        const revenueResponse1 = responses['revenue-structure'];
        const revenueResponse2 = responses['revenue'];
        
        // Look for products in selected revenues
        if (revenueResponse1?.selectedRevenues) {
            sellsProducts = revenueResponse1.selectedRevenues.includes('products');
        } else if (revenueResponse1?.revenueGeneration) {
            sellsProducts = revenueResponse1.revenueGeneration.includes('products');
        } else if (revenueResponse2?.selectedRevenues) {
            sellsProducts = revenueResponse2.selectedRevenues.includes('products');
        } else if (revenueResponse2?.revenueGeneration) {
            sellsProducts = revenueResponse2.revenueGeneration.includes('products');
        }

        console.log('Revenue responses check:', {
            revenueResponse1,
            revenueResponse2,
            sellsProducts
        });

        return sellsProducts;
    }

    isGenericModeSelected() {
        // Try multiple ways to get customization data (same pattern as other modules)
        let isGeneric = true; // Default to generic
        
        // Method 1: Check state manager
        const responses = window.questionnaireEngine?.stateManager?.getAllResponses() || {};
        const customizationResponse1 = responses['customization'];
        const customizationResponse2 = responses['customization-preference'];
        
        console.log('Checking customization - working capital:');
        console.log('From state - customization:', customizationResponse1);
        console.log('From state - customization-preference:', customizationResponse2);
        
        // Method 2: Check global variables
        console.log('Global customizationPreferences:', window.customizationPreferences);
        console.log('Global customizationPreferencesFormatted:', window.customizationPreferencesFormatted);
        
        // Determine if generic or custom
        if (customizationResponse1?.customizationPreferences?.workingCapital) {
            isGeneric = customizationResponse1.customizationPreferences.workingCapital === 'generic';
            console.log('Using customizationResponse1, isGeneric:', isGeneric);
        } else if (customizationResponse2?.customizationPreferences?.workingCapital) {
            isGeneric = customizationResponse2.customizationPreferences.workingCapital === 'generic';
            console.log('Using customizationResponse2, isGeneric:', isGeneric);
        } else if (window.customizationPreferencesFormatted?.workingCapital) {
            isGeneric = window.customizationPreferencesFormatted.workingCapital === 'generic';
            console.log('Using global formatted, isGeneric:', isGeneric);
        } else if (window.customizationPreferences?.workingCapitalCustomization !== undefined) {
            isGeneric = !window.customizationPreferences.workingCapitalCustomization;
            console.log('Using global raw, isGeneric:', isGeneric);
        }
        
        console.log('Final isGeneric decision:', isGeneric);
        
        return isGeneric;
    }

    onResponseChange() {
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
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

        // Load response data
        this.responses = {
            multipleInventoryMethods: response.multipleInventoryMethods || 'no',
            inventoryDaysOutstanding: response.inventoryDaysOutstanding || 'no',
            prepaidExpensesDays: response.prepaidExpensesDays || 'no'
        };

        // Only update components in custom mode
        const isGeneric = this.isGenericModeSelected();
        if (!isGeneric) {
            // Update components with loaded data
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
        // Always return valid - users can skip this section entirely
        return {
            isValid: true,
            errors: []
        };
    }

    shouldShow(responses) {
        // Always show Working Capital module - it will handle showing generic vs custom content internally
        return true;
    }

    getDatabaseFields() {
        const isGeneric = this.isGenericModeSelected();
        
        return {
            multiple_inventory_methods: this.responses.multipleInventoryMethods,
            inventory_days_outstanding_method: this.responses.inventoryDaysOutstanding,
            prepaid_expenses_days_method: this.responses.prepaidExpensesDays,
            is_generic_working_capital: isGeneric // Track if generic mode was used
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