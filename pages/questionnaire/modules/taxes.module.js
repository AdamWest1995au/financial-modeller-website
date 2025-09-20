// /pages/questionnaire/modules/taxes.module.js - FIXED VERSION
import { BaseComponent } from '../components/base-component.js';
import { Toggle } from '../components/toggle.js';
import { MultiSelect } from '../components/multi-select.js';
import { GenericPlaceholder } from '../components/generic-placeholder.js';

export class TaxesModule {
    constructor() {
        this.id = 'taxes';
        this.title = 'Taxes';
        this.description = 'Help us understand your tax obligations and how you would like to model corporate and value added taxes.';
        this.required = false;
        
        this.components = {};
        this.currentContainer = null;
        this.userHasInteracted = false;
        this.responses = {
            corporateTax: 'no',
            valueTax: 'no',
            corporateTaxModel: [],
            corporateTaxModelFreeText: '',
            valueTaxModel: [],
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
        this.customizationChangeHandler = (event) => {
            console.log('Taxes module received customization change:', event.detail);
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
        
        // Check from state manager responses
        if (customizationResponse1?.customizationPreferences?.taxes) {
            return customizationResponse1.customizationPreferences.taxes === 'generic';
        } else if (customizationResponse2?.customizationPreferences?.taxes) {
            return customizationResponse2.customizationPreferences.taxes === 'generic';
        } 
        // Check global formatted preferences (FIXED TYPO HERE)
        else if (window.customizationPreferencesFormatted?.taxes) {
            return window.customizationPreferencesFormatted.taxes === 'generic';
        } 
        // Check raw preferences
        else if (window.customizationPreferences?.taxesCustomization !== undefined) {
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

        // Set initial conditional visibility
        setTimeout(() => {
            this.updateConditionalVisibility();
        }, 100);

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
            defaultValue: this.responses.corporateTax === 'yes' ? 'active' : 'inactive',
            onChange: (value) => {
                this.userHasInteracted = true;
                this.responses.corporateTax = value === 'active' ? 'yes' : 'no';
                this.updateConditionalVisibility();
                this.notifyStateChange();
            }
        });

        this.components.corporateTax = corporateTaxComponent;
        toggleContainer.appendChild(corporateTaxComponent.render());

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
        title.textContent = 'Does your entity charge Value Added Tax / Sales Tax?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Indicate if your business collects VAT, GST, or other sales taxes on goods and services.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const vatComponent = new Toggle({
            id: 'valueTax',
            labels: ['No', 'Yes'],
            defaultValue: this.responses.valueTax === 'yes' ? 'active' : 'inactive',
            onChange: (value) => {
                this.userHasInteracted = true;
                this.responses.valueTax = value === 'active' ? 'yes' : 'no';
                this.updateConditionalVisibility();
                this.notifyStateChange();
            }
        });

        this.components.valueTax = vatComponent;
        toggleContainer.appendChild(vatComponent.render());

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    createCorporateTaxModelQuestion() {
        const section = document.createElement('div');
        section.className = 'parameter-section conditional-section';
        section.id = 'corporate-tax-model-section';
        section.style.display = 'none';

        const title = document.createElement('div');
        title.className = 'multi-select-title';
        title.textContent = 'How would you like to model corporate tax?';

        const subtitle = document.createElement('div');
        subtitle.className = 'multi-select-subtitle';
        subtitle.textContent = 'Choose your preferred method for calculating corporate income tax in the model.';

        const corporateTaxModelComponent = new MultiSelect({
            id: 'corporateTaxModel',
            options: this.corporateTaxOptions,
            defaultValues: this.responses.corporateTaxModel,
            placeholder: 'Select corporate tax modeling method',
            allowFreeText: true,
            onChange: (selectedValues, freeText) => {
                this.userHasInteracted = true;
                this.responses.corporateTaxModel = selectedValues;
                this.responses.corporateTaxModelFreeText = freeText || '';
                this.notifyStateChange();
            }
        });

        this.components.corporateTaxModel = corporateTaxModelComponent;

        section.appendChild(title);
        section.appendChild(subtitle);
        section.appendChild(corporateTaxModelComponent.render());

        return section;
    }

    createVATModelQuestion() {
        const section = document.createElement('div');
        section.className = 'parameter-section conditional-section';
        section.id = 'vat-model-section';
        section.style.display = 'none';

        const title = document.createElement('div');
        title.className = 'multi-select-title';
        title.textContent = 'How would you like to model Value Added Tax / Sales Tax?';

        const subtitle = document.createElement('div');
        subtitle.className = 'multi-select-subtitle';
        subtitle.textContent = 'Select your approach for incorporating VAT or sales tax calculations.';

        const vatModelComponent = new MultiSelect({
            id: 'valueTaxModel',
            options: this.vatOptions,
            defaultValues: this.responses.valueTaxModel,
            placeholder: 'Select VAT/Sales tax modeling method',
            allowFreeText: true,
            onChange: (selectedValues, freeText) => {
                this.userHasInteracted = true;
                this.responses.valueTaxModel = selectedValues;
                this.responses.valueTaxModelFreeText = freeText || '';
                this.notifyStateChange();
            }
        });

        this.components.valueTaxModel = vatModelComponent;

        section.appendChild(title);
        section.appendChild(subtitle);
        section.appendChild(vatModelComponent.render());

        return section;
    }

    updateConditionalVisibility() {
        // Show/hide corporate tax model question
        const corporateTaxModelSection = document.getElementById('corporate-tax-model-section');
        if (corporateTaxModelSection) {
            corporateTaxModelSection.style.display = 
                this.responses.corporateTax === 'yes' ? 'block' : 'none';
        }

        // Show/hide VAT model question
        const vatModelSection = document.getElementById('vat-model-section');
        if (vatModelSection) {
            vatModelSection.style.display = 
                this.responses.valueTax === 'yes' ? 'block' : 'none';
        }
    }

    notifyStateChange() {
        if (this.userHasInteracted) {
            const response = this.getResponse();
            if (window.questionnaireEngine && window.questionnaireEngine.stateManager) {
                window.questionnaireEngine.stateManager.saveResponse(this.id, 0, response);
            }
        }
    }

    getResponse() {
        const isGeneric = this.isGenericModeSelected();
        
        if (isGeneric) {
            return {
                type: 'generic-placeholder',
                originalType: 'taxes',
                originalTitle: this.title,
                genericSelected: true,
                timestamp: new Date().toISOString()
            };
        }
        
        return {
            type: 'taxes',
            data: { ...this.responses },
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response || !response.data) return;
        
        const isGeneric = this.isGenericModeSelected();
        if (!isGeneric) {
            this.responses = { ...this.responses, ...response.data };
            this.userHasInteracted = false;

            setTimeout(() => {
                if (this.components.corporateTax) {
                    this.components.corporateTax.setValue(
                        this.responses.corporateTax === 'yes' ? 'active' : 'inactive'
                    );
                }

                if (this.components.valueTax) {
                    this.components.valueTax.setValue(
                        this.responses.valueTax === 'yes' ? 'active' : 'inactive'
                    );
                }

                if (this.components.corporateTaxModel) {
                    this.components.corporateTaxModel.setValues(
                        this.responses.corporateTaxModel,
                        this.responses.corporateTaxModelFreeText
                    );
                }

                if (this.components.valueTaxModel) {
                    this.components.valueTaxModel.setValues(
                        this.responses.valueTaxModel,
                        this.responses.valueTaxModelFreeText
                    );
                }

                this.updateConditionalVisibility();
                this.userHasInteracted = false;
            }, 100);
        }
    }

    validate() {
        const errors = [];
        const isGeneric = this.isGenericModeSelected();
        
        if (!isGeneric) {
            if (this.responses.corporateTax === 'yes' && 
                this.responses.corporateTaxModel.length === 0 && 
                !this.responses.corporateTaxModelFreeText) {
                errors.push('Please select how you would like to model corporate tax.');
            }

            if (this.responses.valueTax === 'yes' && 
                this.responses.valueTaxModel.length === 0 && 
                !this.responses.valueTaxModelFreeText) {
                errors.push('Please select how you would like to model VAT/Sales tax.');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    shouldShow(responses) {
        return true;
    }

    getDatabaseFields() {
        const isGeneric = this.isGenericModeSelected();
        
        if (isGeneric) {
            return {
                is_generic_taxes: true,
                pays_corporate_tax: null,
                charges_vat: null,
                corporate_tax_model: null,
                corporate_tax_model_other: null,
                vat_model: null,
                vat_model_other: null
            };
        }
        
        return {
            is_generic_taxes: false,
            pays_corporate_tax: this.responses.corporateTax === 'yes',
            charges_vat: this.responses.valueTax === 'yes',
            corporate_tax_model: this.responses.corporateTaxModel.join(', '),
            corporate_tax_model_other: this.responses.corporateTaxModelFreeText,
            vat_model: this.responses.valueTaxModel.join(', '),
            vat_model_other: this.responses.valueTaxModelFreeText
        };
    }

    destroy() {
        if (this.customizationChangeHandler) {
            document.removeEventListener('customizationChanged', this.customizationChangeHandler);
        }
        
        Object.values(this.components).forEach(component => {
            if (component && component.destroy) {
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