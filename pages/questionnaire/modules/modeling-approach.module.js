// /pages/questionnaire/modules/modeling-approach.module.js
import { MultiSelect } from '../components/multi-select.js';
import { Toggle } from '../components/toggle.js';

export class ModelingApproachModule {
    constructor() {
        this.id = 'modeling-approach-combined';
        this.title = 'Modelling approach';
        this.description = 'Help us understand your modeling needs and preferred approach for your financial model.';
        this.required = false;
        this.components = {};
        this.responses = {
            selectedPurposes: [],
            modelingApproach: 'topdown'
        };
    }

    render() {
        const container = document.createElement('div');
        container.className = 'combined-parameters-container';

        // Model Purpose Section
        const purposeSection = this.createPurposeSection();
        container.appendChild(purposeSection);

        // Modeling Approach Section
        const approachSection = this.createApproachSection();
        container.appendChild(approachSection);

        return container;
    }

    createPurposeSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'What is the purpose of your financial model?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Select a model type that describes the outcome of your financial modelling project, or specify your own purpose.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        // Purpose dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'purpose-dropdown-container';
        dropdownContainer.style.flex = '0 0 375px';

        const purposeOptions = [
            { value: 'equities', text: 'Equities Research' },
            { value: 'equitiesraise', text: 'Equity Raise' },
            { value: 'debtsraise', text: 'Debt Raise' },
            { value: 'masell', text: 'M&A (Mergers & Acquisitions) - Sell Side' },
            { value: 'mabuy', text: 'M&A (Mergers & Acquisitions) - Buy Side' },
            { value: 'operating', text: 'Operating Model/Business Operations' },
            { value: 'valuation', text: 'Valuation Analysis' },
            { value: 'projectfinance', text: 'Project Finance' },
            { value: 'projectevaluation', text: 'Project Evaluation' },
            { value: 'fpa', text: 'FP&A (Financial Planning & Analysis)' }
        ];

        const purposeMultiSelect = new MultiSelect({
            id: 'modelPurpose',
            placeholder: 'Search or select purpose...',
            options: purposeOptions,
            allowCustom: true,
            customIndicatorText: 'Press Enter to add your custom purpose',
            onChange: (selectedValues) => {
                this.responses.selectedPurposes = selectedValues;
                this.onResponseChange();
            }
        });

        this.components.purpose = purposeMultiSelect;

        // FIXED: Use proper render method
        purposeMultiSelect.render(dropdownContainer);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);

        return section;
    }

    createApproachSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Modeling approach preference';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Would you like to model your business using a top down impact approach or a bottom up approach?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        // Toggle container
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const approachToggle = new Toggle({
            id: 'approachToggle',
            labels: ['Top Down', 'Bottom Up'],
            defaultValue: 'topdown',
            width: '300px',
            onChange: (value) => {
                this.responses.modelingApproach = value === 'bottomup' ? 'bottomup' : 'topdown';
                this.onResponseChange();
            }
        });

        this.components.approach = approachToggle;

        // FIXED: Use proper render method
        approachToggle.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    onResponseChange() {
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    getResponse() {
        return {
            type: 'modeling-approach-combined',
            selectedPurposes: [...this.responses.selectedPurposes],
            modelingApproach: this.responses.modelingApproach,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response) return;

        this.responses = {
            selectedPurposes: response.selectedPurposes || [],
            modelingApproach: response.modelingApproach || 'topdown'
        };

        // Update components with a delay to ensure they're rendered
        setTimeout(() => {
            if (this.components.purpose && this.responses.selectedPurposes.length > 0) {
                this.components.purpose.setValue(this.responses.selectedPurposes);
            }

            if (this.components.approach) {
                this.components.approach.setValue(this.responses.modelingApproach);
            }
        }, 100);
    }

    validate() {
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
            model_purpose_selected: this.responses.selectedPurposes.length > 0 ? this.responses.selectedPurposes : null,
            model_purpose_freetext: null,
            modeling_approach: this.responses.modelingApproach
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

export default ModelingApproachModule;

if (typeof window !== 'undefined') {
    window.ModelingApproachModule = ModelingApproachModule;
}