// /pages/questionnaire/modules/equity.module.js - COMPLETE EQUITY FINANCING MODULE
import { BaseComponent } from '../components/base-component.js';
import { Toggle } from '../components/toggle.js';
import { GenericPlaceholder } from '../components/generic-placeholder.js';

export class EquityModule {
    constructor() {
        this.id = 'equity-financing';
        this.title = 'Equity Financing';
        this.description = 'Configure how you want to model equity financing including dividend policies and equity issuance.';
        this.required = false;
        
        this.components = {};
        this.currentContainer = null;
        this.responses = {
            dividendsPaidWhenDeclared: 'no'
        };

        // Setup customization listener
        this.setupCustomizationListener();
    }

    setupCustomizationListener() {
        this.customizationChangeHandler = (event) => {
            console.log('Equity Financing module received customization change:', event.detail);
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
        console.log('=== EQUITY FINANCING MODULE DEBUG ===');
        
        const isGeneric = this.isGenericModeSelected();
        console.log('Equity Financing isGeneric:', isGeneric);
        console.log('=== END EQUITY FINANCING MODULE DEBUG ===');

        if (isGeneric) {
            console.log('SHOWING GENERIC PLACEHOLDER FOR EQUITY FINANCING');
            return this.createGenericPlaceholder();
        }

        console.log('SHOWING CUSTOM EQUITY FINANCING CONTENT');
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
                        <radialGradient id="circleGradientEquity" cx="50%" cy="50%">
                            <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
                        </radialGradient>
                    </defs>
                    <g class="circle-group-1">
                        <circle cx="20" cy="40" r="4" class="circle" fill="url(#circleGradientEquity)" />
                    </g>
                    <g class="circle-group-2">
                        <circle cx="60" cy="40" r="4" class="circle" fill="url(#circleGradientEquity)" />
                    </g>
                    <g class="circle-group-3">
                        <circle cx="100" cy="40" r="4" class="circle" fill="url(#circleGradientEquity)" />
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
        container.className = 'equity-financing-content';

        // Question 1: Dividends paid when declared
        const dividendsSection = this.createDividendsPaidSection();
        container.appendChild(dividendsSection);

        return container;
    }

    createDividendsPaidSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Dividends paid when declared';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Are your dividends paid when declared?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const dividendsComponent = new Toggle({
            id: 'dividendsPaidWhenDeclared',
            labels: ['No', 'Yes'],
            defaultValue: this.responses.dividendsPaidWhenDeclared,
            onChange: (value) => {
                this.responses.dividendsPaidWhenDeclared = value;
                this.onResponseChange();
            }
        });

        this.components.dividendsPaidWhenDeclared = dividendsComponent;
        dividendsComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    isGenericModeSelected() {
        let isGeneric = true; // Default to generic
        
        // Method 1: Check state manager responses
        if (window.questionnaireEngine?.stateManager) {
            const responses = window.questionnaireEngine.stateManager.getAllResponses();
            const customizationResponse = responses['customization'] || responses['customization-preference'];
            
            if (customizationResponse?.customizationPreferences?.equity) {
                isGeneric = customizationResponse.customizationPreferences.equity === 'generic';
                console.log('Customization check - using state manager:', isGeneric);
                return isGeneric;
            }
        }
        
        // Method 2: Check global customization variables
        if (window.customizationPreferencesFormatted?.equity) {
            isGeneric = window.customizationPreferencesFormatted.equity === 'generic';
            console.log('Customization check - using global formatted:', isGeneric);
            return isGeneric;
        }
        
        if (window.customizationPreferences?.equityCustomization !== undefined) {
            isGeneric = !window.customizationPreferences.equityCustomization;
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
            type: 'equity-financing',
            dividendsPaidWhenDeclared: this.responses.dividendsPaidWhenDeclared,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response) return;

        this.responses = {
            dividendsPaidWhenDeclared: response.dividendsPaidWhenDeclared || 'no'
        };

        // Only update components in custom mode
        const isGeneric = this.isGenericModeSelected();
        if (!isGeneric) {
            setTimeout(() => {
                if (this.components.dividendsPaidWhenDeclared) {
                    this.components.dividendsPaidWhenDeclared.setValue(this.responses.dividendsPaidWhenDeclared);
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
        return true; // Always show Equity Financing module
    }

   getDatabaseFields() {
    const convertToYesNo = (value) => {
        if (value === 'active' || value === true || value === 'yes') {
            return 'yes';
        } else if (value === 'inactive' || value === false || value === 'no') {
            return 'no';
        }
        return value || 'no';
    };

    return {
        equity_financing_approach: convertToYesNo(this.responses.dividendsPaidWhenDeclared), // FIX: Convert to yes/no
        equity_financing_custom: null,
        equity_financing_details: null
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

export default EquityModule;

if (typeof window !== 'undefined') {
    window.EquityModule = EquityModule;
}