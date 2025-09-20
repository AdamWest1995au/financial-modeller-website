// /pages/questionnaire/modules/taxes.module.js - UPDATED TO MATCH REVENUE MODULE STYLE
import { BaseComponent } from '../components/base-component.js';
import { Toggle } from '../components/toggle.js';
import { Dropdown } from '../components/dropdown.js';
import { GenericPlaceholder } from '../components/generic-placeholder.js';

export class TaxesModule {
    constructor() {
        this.id = 'taxes';
        this.title = 'Taxes';
        this.description = 'Help us understand your tax obligations and how you would like to model corporate and value added taxes.';
        this.required = false;
        
        this.components = {};
        this.currentContainer = null; // Store reference for re-rendering
        this.userHasInteracted = false; // Track user interaction for engine
        this.responses = {
            corporateTax: 'no',
            valueTax: 'no',
            corporateTaxModel: '',
            corporateTaxModelFreeText: '',
            valueTaxModel: '',
            valueTaxModelFreeText: ''
        };

        // Corporate tax modeling options
        this.corporateTaxOptions = [
            { value: 'line-by-line', text: 'Line by line' },
            { value: 'profit-based', text: 'Based on Profit before tax' }
        ];

        // VAT modeling options
        this.vatOptions = [
            { value: 'line-by-line', text: 'Line by line' },
            { value: 'accounting-based', text: 'Based on all revenue and expenses (accounting based)' }
        ];

        // Listen for customization changes
        this.setupCustomizationListener();
    }

    setupCustomizationListener() {
        // Store the bound function so we can remove it later
        this.customizationChangeHandler = (event) => {
            console.log('Taxes module received customization change:', event.detail);
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
        console.log('=== TAXES MODULE DEBUG ===');
        
        const isGeneric = this.isGenericModeSelected();
        console.log('Taxes isGeneric:', isGeneric);
        console.log('=== END TAXES MODULE DEBUG ===');

        if (isGeneric) {
            console.log('SHOWING GENERIC PLACEHOLDER FOR TAXES');
            return this.createGenericPlaceholder();
        }

        console.log('SHOWING CUSTOM TAXES CONTENT');
        return this.createCustomContent();
    }

    isGenericModeSelected() {
        // Try multiple ways to get customization preferences
        const responses = window.questionnaireEngine?.stateManager?.getAllResponses() || {};
        const customizationResponse1 = responses['customization-preference'];
        const customizationResponse2 = responses['customization'];
        
        console.log('Checking taxes customization from responses:', customizationResponse1, customizationResponse2);
        
        if (customizationResponse1?.customizationPreferences?.taxes) {
            return customizationResponse1.customizationPreferences.taxes === 'generic';
        } else if (customizationResponse2?.customizationPreferences?.taxes) {
            return customizationResponse2.customizationPreferences.taxes === 'generic';
        } else if (window.customizationPreferencesFormatted?.taxes) {
            return window.customizationPreferencesFormatted.taxes === 'generic';
        } else if (window.customizationPreferences?.taxesCustomization !== undefined) {
            return !window.customizationPreferences.taxesCustomization;
        }
        
        // Default to custom if no preference found
        return false;
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
                        <radialGradient id="circleGradientTaxes" cx="50%" cy="50%">
                            <stop offset="0%" style="stop-color:#c084fc;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                        </radialGradient>
                    </defs>
                    <g class="circle-group-1">
                        <circle cx="20" cy="40" r="4" class="circle" fill="url(#circleGradientTaxes)" />
                    </g>
                    <g class="circle-group-2">
                        <circle cx="60" cy="40" r="4" class="circle" fill="url(#circleGradientTaxes)" />
                    </g>
                    <g class="circle-group-3">
                        <circle cx="100" cy="40" r="4" class="circle" fill="url(#circleGradientTaxes)" />
                    </g>
                </svg>
            </div>
            <h4 class="placeholder-title">GENERIC MODELLING APPROACH SELECTED</h4>
            <p class="placeholder-description">
                You've chosen to use our generic model for this section. 
                This will save you time during setup while still providing comprehensive tax calculations.
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

        // Question 1: Corporate Tax
        const corporateTaxQuestion = this.createCorporateTaxQuestion();
        container.appendChild(corporateTaxQuestion);

        // Question 2: Value Added Tax
        const vatQuestion = this.createVATQuestion();
        container.appendChild(vatQuestion);

        // Question 3: Corporate Tax Modeling (conditional)
        const corporateTaxModelQuestion = this.createCorporateTaxModelQuestion();
        container.appendChild(corporateTaxModelQuestion);

        // Question 4: VAT Modeling (conditional)
        const vatModelQuestion = this.createVATModelQuestion();
        container.appendChild(vatModelQuestion);

        return container;
    }

    createCorporateTaxQuestion() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Does your entity pay corporate tax?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Select whether your business is subject to corporate income tax obligations.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const corporateTaxComponent = new Toggle({
            id: 'corporateTax',
            labels: ['No', 'Yes'],
            defaultValue: this.responses.corporateTax,
            onChange: (value) => {
                this.userHasInteracted = true;
                this.responses.corporateTax = value;
                this.updateConditionalVisibility();
                this.onResponseChange();
            }
        });

        this.components.corporateTax = corporateTaxComponent;
        corporateTaxComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    createVATQuestion() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Does your entity pay value added tax?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Select whether your business is subject to VAT, GST, or similar consumption tax obligations.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const vatComponent = new Toggle({
            id: 'valueTax',
            labels: ['No', 'Yes'],
            defaultValue: this.responses.valueTax,
            onChange: (value) => {
                this.userHasInteracted = true;
                this.responses.valueTax = value;
                this.updateConditionalVisibility();
                this.onResponseChange();
            }
        });

        this.components.valueTax = vatComponent;
        vatComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    createCorporateTaxModelQuestion() {
        const section = document.createElement('div');
        section.className = 'parameter-section conditional-question';
        section.id = 'corporate-tax-model-question';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'How will you model your corporate tax?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Choose the approach for calculating corporate tax in your financial model.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        // Create dropdown with free text
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-with-freetext-container';
        dropdownContainer.style.flex = '0 0 375px';

        this.components.corporateTaxModelDropdown = new Dropdown({
            id: 'corporate-tax-model-dropdown',
            options: this.corporateTaxOptions,
            placeholder: 'Select corporate tax modeling approach...',
            allowCustom: true,
            value: this.responses.corporateTaxModel,
            onChange: (value) => {
                this.userHasInteracted = true;
                this.responses.corporateTaxModel = value;
                this.onResponseChange();
            },
            onCustomText: (text) => {
                this.userHasInteracted = true;
                this.responses.corporateTaxModelFreeText = text;
                this.onResponseChange();
            }
        });

        const dropdownElement = this.components.corporateTaxModelDropdown.createElement();
        dropdownContainer.appendChild(dropdownElement);

        // Add free text section
        const freeTextSection = document.createElement('div');
        freeTextSection.className = 'free-text-section';
        freeTextSection.style.marginTop = '16px';

        const freeTextLabel = document.createElement('label');
        freeTextLabel.className = 'free-text-label';
        freeTextLabel.textContent = 'Additional details or custom approach (optional):';

        const freeTextInput = document.createElement('textarea');
        freeTextInput.className = 'free-text-input';
        freeTextInput.placeholder = 'Describe any specific corporate tax considerations, rates, or methodologies you would like to include in your model...';
        freeTextInput.value = this.responses.corporateTaxModelFreeText;
        freeTextInput.addEventListener('input', (e) => {
            this.userHasInteracted = true;
            this.responses.corporateTaxModelFreeText = e.target.value;
            this.onResponseChange();
        });

        freeTextSection.appendChild(freeTextLabel);
        freeTextSection.appendChild(freeTextInput);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);
        section.appendChild(freeTextSection);

        return section;
    }

    createVATModelQuestion() {
        const section = document.createElement('div');
        section.className = 'parameter-section conditional-question';
        section.id = 'vat-model-question';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'How will you model your value added tax?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Choose the approach for calculating VAT/GST in your financial model.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        // Create dropdown with free text
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-with-freetext-container';
        dropdownContainer.style.flex = '0 0 375px';

        this.components.vatModelDropdown = new Dropdown({
            id: 'vat-model-dropdown',
            options: this.vatOptions,
            placeholder: 'Select VAT modeling approach...',
            allowCustom: true,
            value: this.responses.valueTaxModel,
            onChange: (value) => {
                this.userHasInteracted = true;
                this.responses.valueTaxModel = value;
                this.onResponseChange();
            },
            onCustomText: (text) => {
                this.userHasInteracted = true;
                this.responses.valueTaxModelFreeText = text;
                this.onResponseChange();
            }
        });

        const dropdownElement = this.components.vatModelDropdown.createElement();
        dropdownContainer.appendChild(dropdownElement);

        // Add free text section
        const freeTextSection = document.createElement('div');
        freeTextSection.className = 'free-text-section';
        freeTextSection.style.marginTop = '16px';

        const freeTextLabel = document.createElement('label');
        freeTextLabel.className = 'free-text-label';
        freeTextLabel.textContent = 'Additional details or custom approach (optional):';

        const freeTextInput = document.createElement('textarea');
        freeTextInput.className = 'free-text-input';
        freeTextInput.placeholder = 'Describe any specific VAT/GST considerations, rates, exemptions, or methodologies you would like to include in your model...';
        freeTextInput.value = this.responses.valueTaxModelFreeText;
        freeTextInput.addEventListener('input', (e) => {
            this.userHasInteracted = true;
            this.responses.valueTaxModelFreeText = e.target.value;
            this.onResponseChange();
        });

        freeTextSection.appendChild(freeTextLabel);
        freeTextSection.appendChild(freeTextInput);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);
        section.appendChild(freeTextSection);

        return section;
    }

    updateConditionalVisibility() {
        const corporateTaxModelQuestion = document.getElementById('corporate-tax-model-question');
        const vatModelQuestion = document.getElementById('vat-model-question');

        if (corporateTaxModelQuestion) {
            if (this.responses.corporateTax === 'yes') {
                corporateTaxModelQuestion.style.display = 'block';
                corporateTaxModelQuestion.style.opacity = '1';
                corporateTaxModelQuestion.style.transform = 'translateY(0)';
            } else {
                corporateTaxModelQuestion.style.display = 'none';
                corporateTaxModelQuestion.style.opacity = '0';
                corporateTaxModelQuestion.style.transform = 'translateY(-20px)';
            }
        }

        if (vatModelQuestion) {
            if (this.responses.valueTax === 'yes') {
                vatModelQuestion.style.display = 'block';
                vatModelQuestion.style.opacity = '1';
                vatModelQuestion.style.transform = 'translateY(0)';
            } else {
                vatModelQuestion.style.display = 'none';
                vatModelQuestion.style.opacity = '0';
                vatModelQuestion.style.transform = 'translateY(-20px)';
            }
        }
    }

    onResponseChange() {
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    notifyChange() {
        // Emit change event for the questionnaire engine
        if (window.questionnaireEngine && window.questionnaireEngine.handleModuleUpdate) {
            window.questionnaireEngine.handleModuleUpdate(this.id, this.responses);
        }
        
        // Also emit a custom event for any listeners
        document.dispatchEvent(new CustomEvent('moduleResponseChange', {
            detail: {
                moduleId: this.id,
                responses: this.responses
            }
        }));
    }

    // Required module interface methods
    getResponse() {
        return {
            type: 'taxes-combined',
            originalType: 'taxes',
            originalTitle: this.title,
            corporateTax: this.responses.corporateTax,
            valueTax: this.responses.valueTax,
            corporateTaxModel: this.responses.corporateTaxModel,
            corporateTaxModelFreeText: this.responses.corporateTaxModelFreeText,
            valueTaxModel: this.responses.valueTaxModel,
            valueTaxModelFreeText: this.responses.valueTaxModelFreeText,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (response) {
            this.responses.corporateTax = response.corporateTax || 'no';
            this.responses.valueTax = response.valueTax || 'no';
            this.responses.corporateTaxModel = response.corporateTaxModel || '';
            this.responses.corporateTaxModelFreeText = response.corporateTaxModelFreeText || '';
            this.responses.valueTaxModel = response.valueTaxModel || '';
            this.responses.valueTaxModelFreeText = response.valueTaxModelFreeText || '';
        }

        // Update UI components if they exist
        setTimeout(() => {
            if (this.components.corporateTax) {
                this.components.corporateTax.setValue(this.responses.corporateTax);
            }
            
            if (this.components.valueTax) {
                this.components.valueTax.setValue(this.responses.valueTax);
            }
            
            if (this.components.corporateTaxModelDropdown) {
                this.components.corporateTaxModelDropdown.setValue(this.responses.corporateTaxModel);
            }
            
            if (this.components.vatModelDropdown) {
                this.components.vatModelDropdown.setValue(this.responses.valueTaxModel);
            }
            
            // Update conditional visibility
            this.updateConditionalVisibility();
        }, 100);
    }

    validate() {
        let isValid = true;
        let errors = [];

        // No strict validation required - taxes are optional configurations
        
        return { isValid, errors };
    }

    shouldShow(responses) {
        return true; // Always show taxes module
    }

    getDatabaseFields() {
        return {
            corporate_tax_enabled: this.responses.corporateTax === 'yes',
            value_tax_enabled: this.responses.valueTax === 'yes',
            corporate_tax_model: this.responses.corporateTaxModel || null,
            corporate_tax_model_custom: this.responses.corporateTaxModelFreeText || null,
            value_tax_model: this.responses.valueTaxModel || null,
            value_tax_model_custom: this.responses.valueTaxModelFreeText || null
        };
    }

    destroy() {
        // Remove event listeners
        if (this.customizationChangeHandler) {
            document.removeEventListener('customizationChanged', this.customizationChangeHandler);
        }
        
        // Destroy components
        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components = {};
        this.currentContainer = null;
    }
}

export default TaxesModule;

if (typeof window !== 'undefined') {
    window.TaxesModule = TaxesModule;
}