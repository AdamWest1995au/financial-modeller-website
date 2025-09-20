// modules/cogs-codb.module.js - COMPLETE REWRITE
import { Toggle } from '../components/toggle.js';

export class CogsCodbModule {
    constructor() {
        this.id = 'cogs-codb';
        this.title = 'COGS and CODB';
        this.description = 'Cost of Goods Sold and Cost of Doing Business configuration.';
        this.required = false;
        
        this.components = {};
        this.currentContainer = null;
        this.responses = {
            manufacturesProducts: 'no'
        };

        // Setup customization listener
        this.setupCustomizationListener();
    }

    setupCustomizationListener() {
        this.customizationChangeHandler = (event) => {
            console.log('COGS-CODB module received customization change:', event.detail);
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
        console.log('=== COGS-CODB MODULE DEBUG ===');
        
        const isGeneric = this.isGenericModeSelected();
        console.log('COGS-CODB isGeneric:', isGeneric);
        console.log('=== END COGS-CODB MODULE DEBUG ===');

        if (isGeneric) {
            console.log('SHOWING GENERIC PLACEHOLDER FOR COGS-CODB');
            return this.createGenericPlaceholder();
        }

        console.log('SHOWING CUSTOM COGS-CODB CONTENT');
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
                        <radialGradient id="circleGradientCogs" cx="50%" cy="50%">
                            <stop offset="0%" style="stop-color:#c084fc;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                        </radialGradient>
                    </defs>
                    <g class="circle-group-1">
                        <circle cx="20" cy="40" r="4" class="circle" fill="url(#circleGradientCogs)" />
                    </g>
                    <g class="circle-group-2">
                        <circle cx="60" cy="40" r="4" class="circle" fill="url(#circleGradientCogs)" />
                    </g>
                    <g class="circle-group-3">
                        <circle cx="100" cy="40" r="4" class="circle" fill="url(#circleGradientCogs)" />
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
        container.className = 'cogs-codb-content';

        // Check if user selected "Sell Products" in revenue module
        const sellsProducts = this.detectProductsSelection();
        console.log('User sells products:', sellsProducts);

        // Manufacturing question (conditional on selling products)
        if (sellsProducts) {
            const manufacturingSection = this.createManufacturingSection();
            container.appendChild(manufacturingSection);
        } else {
            // If no products selected, show informative message
            const noProductsMessage = this.createNoProductsMessage();
            container.appendChild(noProductsMessage);
        }

        return container;
    }

    /**
     * Enhanced product detection with multiple fallback methods
     * (Same logic as working capital module)
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

    createManufacturingSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Does your company manufacture products?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'This helps us understand whether to model manufacturing costs or procurement costs in your COGS structure.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const manufacturingComponent = new Toggle({
            id: 'manufacturesProducts',
            labels: ['No', 'Yes'],
            defaultValue: this.responses.manufacturesProducts,
            onChange: (value) => {
                this.responses.manufacturesProducts = value;
                this.onResponseChange();
            }
        });

        this.components.manufacturesProducts = manufacturingComponent;
        manufacturingComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    createNoProductsMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'cogs-codb-no-products-message';
        messageDiv.innerHTML = `
            <div class="info-message">
                <div class="info-icon">ℹ️</div>
                <div class="info-content">
                    <h4>Limited COGS Questions</h4>
                    <p>Since you haven't selected "Sell Products" in the Revenue section, specific Cost of Goods Sold questions are not applicable to your business model.</p>
                    <p>Your model will use our standard cost structure approach for service-based businesses.</p>
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
            
            if (customizationResponse?.customizationPreferences?.cogs) {
                isGeneric = customizationResponse.customizationPreferences.cogs === 'generic';
                console.log('Customization check - using state manager:', isGeneric);
                return isGeneric;
            }
        }
        
        // Method 2: Check global customization variables
        if (window.customizationPreferencesFormatted?.cogs) {
            isGeneric = window.customizationPreferencesFormatted.cogs === 'generic';
            console.log('Customization check - using global formatted:', isGeneric);
            return isGeneric;
        }
        
        if (window.customizationPreferences?.cogsCustomization !== undefined) {
            isGeneric = !window.customizationPreferences.cogsCustomization;
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
        const isGeneric = this.isGenericModeSelected();
        
        return {
            type: isGeneric ? 'generic-placeholder' : 'cogs-codb',
            originalType: 'cogs-codb',
            originalTitle: this.title,
            genericSelected: isGeneric,
            manufacturesProducts: this.responses.manufacturesProducts,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response) return;

        // Load manufacturing response if available
        if (response.manufacturesProducts) {
            this.responses.manufacturesProducts = response.manufacturesProducts;
        }

        // Only update components in custom mode
        const isGeneric = this.isGenericModeSelected();
        if (!isGeneric) {
            setTimeout(() => {
                if (this.components.manufacturesProducts) {
                    this.components.manufacturesProducts.setValue(this.responses.manufacturesProducts);
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
        return true; // Always show COGS-CODB module
    }

    getDatabaseFields() {
        const isGeneric = this.isGenericModeSelected();
        
        return {
            manufactures_products: this.responses.manufacturesProducts,
            is_generic_cogs_codb: isGeneric
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

export default CogsCodbModule;

if (typeof window !== 'undefined') {
    window.CogsCodbModule = CogsCodbModule;
}