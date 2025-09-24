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

    // WORKING CAPITAL MODULE - Fix getDatabaseFields()
// Replace the getDatabaseFields method in working-capital.module.js

getDatabaseFields() {
    const isGeneric = this.isGenericModeSelected();
    
    return {
        // CORRECTED: Match exact schema field names
        multiple_inventory_methods: this.responses.multipleInventoryMethods, // TEXT: 'yes'/'no'
        inventory_days_outstanding: this.responses.inventoryDaysOutstanding, // TEXT: 'yes'/'no' 
        prepaid_expenses_days: this.responses.prepaidExpensesDays, // TEXT: 'yes'/'no'
        is_generic_working_capital: isGeneric
    };
}

// ASSETS MODULE - Fix getDatabaseFields()  
// Replace the getDatabaseFields method in assets.module.js

getDatabaseFields() {
    const isGeneric = this.isGenericModeSelected();
    
    return {
        // JSONB array or null
        asset_types_selected: this.responses.selectedAssets.length > 0 ? this.responses.selectedAssets : null,
        // TEXT field - custom assets are included in the selected array, so this can be null
        asset_types_freetext: null, 
        // TEXT: 'yes'/'no'
        multiple_depreciation_methods: this.responses.multipleDepreciationMethods,
        // TEXT: 'yes'/'no'
        units_of_production_depreciation: this.responses.unitsOfProductionDepreciation
    };
}

// REVENUE MODULE - Fix getDatabaseFields()
// Replace the getDatabaseFields method in revenue.module.js

getDatabaseFields() {
    return {
        // JSONB array or null
        revenue_generation_selected: this.responses.selectedRevenues.length > 0 ? this.responses.selectedRevenues : null,
        // TEXT - not in schema, remove this line if it exists
        // revenue_generation_freetext: null,
        // JSONB object or null
        charging_models: Object.keys(this.responses.chargingModels).length > 0 ? this.responses.chargingModels : null,
        // JSONB array or null  
        product_procurement_selected: this.responses.procurement.length > 0 ? this.responses.procurement : null,
        // TEXT - for custom procurement methods
        product_procurement_freetext: null,
        // JSONB array or null
        sales_channels_selected: this.responses.salesChannels.length > 0 ? this.responses.salesChannels : null,
        // TEXT - for custom sales channels  
        sales_channels_freetext: null,
        // TEXT: 'yes'/'no'
        revenue_staff: this.responses.revenueStaff
    };
}

// COGS MODULE - Fix getDatabaseFields()
// Replace the getDatabaseFields method in cogs-codb.module.js

getDatabaseFields() {
    const isGeneric = this.isGenericModeSelected();
    
    return {
        // TEXT: 'yes'/'no'/'active'/'inactive' (schema allows all these values)
        manufactures_products: this.responses.manufacturesProducts
    };
}

// TAXES MODULE - Fix getDatabaseFields() 
// Replace the getDatabaseFields method in taxes.module.js

getDatabaseFields() {
    return {
        // BOOLEAN fields
        corporate_tax_enabled: this.responses.corporateTax === 'yes',
        value_tax_enabled: this.responses.valueTax === 'yes',
        
        // TEXT fields (not arrays!) - join array to single string if needed
        corporate_tax_model: this.responses.corporateTaxModel.length > 0 ? 
            this.responses.corporateTaxModel.join(', ') : null,
        corporate_tax_model_custom: null,
        
        value_tax_model: this.responses.valueTaxModel.length > 0 ? 
            this.responses.valueTaxModel.join(', ') : null,
        value_tax_model_custom: null
    };
}

// EQUITY MODULE - Fix getDatabaseFields()
// Replace the getDatabaseFields method in equity.module.js  

getDatabaseFields() {
    const isGeneric = this.isGenericModeSelected();
    
    return {
        // TEXT field
        equity_financing_approach: this.responses.dividendsPaidWhenDeclared,
        // TEXT field - for custom approach
        equity_financing_custom: null,
        // JSONB field - for detailed equity info
        equity_financing_details: null
    };
}

// CUSTOMIZATION MODULE - Fix getDatabaseFields()
// Replace the getDatabaseFields method in customization.module.js

getDatabaseFields() {
    return {
        // All BOOLEAN fields
        customization_revenue: this.responses.revenueCustomization,
        customization_cogs: this.responses.cogsCustomization,
        customization_expenses: this.responses.expensesCustomization,
        customization_assets: this.responses.assetsCustomization,
        customization_working_capital: this.responses.workingCapitalCustomization,
        customization_taxes: this.responses.taxesCustomization,
        customization_debt: this.responses.debtCustomization,
        customization_equity: this.responses.equityCustomization,
        // JSONB field
        customization_summary: this.getCustomizationSummary()
    };
}

// USER INFO MODULE - Fix getDatabaseFields()
// Replace the getDatabaseFields method in user-info.module.js

getDatabaseFields() {
    return {
        // Required TEXT fields
        full_name: this.responses.userName || '',
        company_name: this.responses.companyName || '',
        email: this.responses.email || '',
        phone: this.responses.phone || '',
        country_name: this.responses.country?.name || '',
        
        // Optional TEXT fields
        country_code: this.responses.country?.code || null,
        country_flag: this.responses.country?.flag || null,
        industry_dropdown: this.responses.industry?.dropdown || null,
        industry_freetext: this.responses.industry?.freeText || null,
        
        // TEXT: 'yes'/'no'
        quick_parameters_choice: this.responses.parameterToggle ? 'yes' : 'no'
    };
}

// COMBINED PARAMETERS MODULE - Fix getDatabaseFields()
// Replace the getDatabaseFields method in combined-parameters.module.js

getDatabaseFields() {
    const fullDate = (this.responses.month && this.responses.year) ? 
                    `${this.responses.month} ${this.responses.year}` : null;

    return {
        // TEXT: must be 'quarter', 'half-year', or 'annual'
        model_periodicity: this.responses.periodicity || null,
        // TEXT: formatted date string
        historical_start_date: fullDate,
        // INTEGER: must be between 1 and 20
        forecast_years: this.responses.forecastYears ? parseInt(this.responses.forecastYears) : null
    };
}

// MODELING APPROACH MODULE - Fix getDatabaseFields()
// Replace the getDatabaseFields method in modeling-approach.module.js

getDatabaseFields() {
    console.log('🔍 Working Capital getDatabaseFields called');
    console.log('🔍 Working Capital responses:', this.responses);
    
    const isGeneric = this.isGenericModeSelected();
    
    // Helper function to convert toggle values to yes/no
    const convertToYesNo = (value) => {
        if (value === 'active' || value === true || value === 'yes') {
            return 'yes';
        } else if (value === 'inactive' || value === false || value === 'no') {
            return 'no';
        }
        return value || 'no'; // Default to 'no' if undefined
    };
    
    const fields = {
        // TEXT: 'yes'/'no' - these match the exact database schema constraints
        multiple_inventory_methods: convertToYesNo(this.responses.multipleInventoryMethods),
        inventory_days_outstanding: convertToYesNo(this.responses.inventoryDaysOutstanding), 
        prepaid_expenses_days: convertToYesNo(this.responses.prepaidExpensesDays)
    };
    
    console.log('🔍 Working Capital database fields:', fields);
    return fields;
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