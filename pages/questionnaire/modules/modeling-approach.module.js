// /pages/questionnaire/modules/modeling-approach.module.js
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

        // Purpose options
        this.purposeOptions = [
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

        // Purpose dropdown container with exact same structure as industry dropdown
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'purpose-dropdown-container';
        dropdownContainer.style.flex = '0 0 375px';

        // Create the exact HTML structure like industry dropdown
        dropdownContainer.innerHTML = `
            <div class="purpose-dropdown">
                <input 
                    type="text" 
                    class="purpose-input" 
                    id="modelPurpose"
                    placeholder="Search or select purpose..."
                    autocomplete="off"
                >
                <div class="purpose-options" id="purposeOptions">
                    ${this.purposeOptions.map(option => `
                        <div class="purpose-option" data-value="${option.value}">${option.text}</div>
                    `).join('')}
                </div>
                <div class="purpose-custom-indicator" id="purposeCustomIndicator">
                    Press Enter to add your custom purpose
                </div>
            </div>
        `;

        // Store references and setup event listeners
        this.setupPurposeEvents(dropdownContainer);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);

        return section;
    }

    setupPurposeEvents(container) {
        const purposeInput = container.querySelector('#modelPurpose');
        const purposeOptions = container.querySelector('#purposeOptions');
        const purposeCustomIndicator = container.querySelector('#purposeCustomIndicator');
        
        if (!purposeInput || !purposeOptions || !purposeCustomIndicator) return;

        // Store references
        this.purposeInput = purposeInput;
        this.purposeOptions = purposeOptions;
        this.purposeCustomIndicator = purposeCustomIndicator;

        let selectedValues = [];

        // Add methods to the purpose input for external access
        purposeInput.getSelectedValues = function() {
            return selectedValues;
        };

        purposeInput.setSelectedValues = function(values) {
            selectedValues = values;
            updateInputDisplay();
            updateOptionsDisplay();
        };

        function updateInputDisplay() {
            if (selectedValues.length === 0) {
                purposeInput.placeholder = 'Search or select purpose...';
                purposeInput.value = '';
            } else {
                const selectedTexts = selectedValues.map(function(value) {
                    const option = purposeOptions.querySelector(`[data-value="${value}"]`);
                    return option ? option.textContent : value;
                });
                purposeInput.value = selectedTexts.join(', ');
            }
        }

        function updateOptionsDisplay() {
            const options = purposeOptions.querySelectorAll('.purpose-option');
            options.forEach(function(option) {
                const value = option.dataset.value;
                if (selectedValues.includes(value)) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
        }

        // Show dropdown on focus
        purposeInput.addEventListener('focus', () => {
            purposeOptions.style.display = 'block';
            this.filterPurposes('');
        });

        // Filter purposes and handle custom input as user types
        purposeInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            // Only filter if user is actually searching, not when we update the display
            if (!selectedValues.some(function(val) { return purposeInput.value.includes(val); })) {
                this.filterPurposes(searchTerm);
                purposeOptions.style.display = 'block';
                
                // Show custom indicator for new text
                if (searchTerm && !Array.from(purposeOptions.querySelectorAll('.purpose-option')).some(function(option) {
                    return option.textContent.toLowerCase().includes(searchTerm);
                })) {
                    purposeCustomIndicator.classList.add('show');
                } else {
                    purposeCustomIndicator.classList.remove('show');
                }
            }
            
            this.updatePurposeResponse();
        });

        // Handle purpose selection from dropdown (multi-select like revenue)
        purposeOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.purpose-option');
            if (option) {
                const value = option.dataset.value;
                
                if (selectedValues.includes(value)) {
                    // Remove from selection
                    selectedValues = selectedValues.filter(function(v) { return v !== value; });
                } else {
                    // Add to selection
                    selectedValues.push(value);
                }
                
                updateInputDisplay();
                updateOptionsDisplay();
                purposeCustomIndicator.classList.remove('show');
                this.updatePurposeResponse();
            }
        });

        // Handle Enter key to add custom input
        purposeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentValue = purposeInput.value.trim();
                
                // Extract the last part after comma (what user is currently typing)
                const parts = currentValue.split(',').map(function(part) { return part.trim(); });
                const lastPart = parts[parts.length - 1];
                
                // Check if the last part is new custom text
                const isExistingOption = Array.from(purposeOptions.querySelectorAll('.purpose-option')).find(function(option) {
                    return option.textContent.toLowerCase() === lastPart.toLowerCase();
                });
                
                if (lastPart && !isExistingOption && !selectedValues.includes(lastPart)) {
                    // Add custom text to selections
                    selectedValues.push(lastPart);
                    updateInputDisplay();
                    // Keep dropdown open for more selections
                    purposeOptions.style.display = 'block';
                    this.filterPurposes('');
                }
                
                purposeCustomIndicator.classList.remove('show');
                this.updatePurposeResponse();
            } else if (e.key === 'Escape') {
                purposeOptions.style.display = 'none';
                purposeCustomIndicator.classList.remove('show');
                this.updatePurposeResponse();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!purposeInput.contains(e.target) && !purposeOptions.contains(e.target)) {
                purposeOptions.style.display = 'none';
                purposeCustomIndicator.classList.remove('show');
                this.updatePurposeResponse();
            }
        });

        // Clear selection when input is manually cleared
        purposeInput.addEventListener('keyup', (e) => {
            if (purposeInput.value === '') {
                selectedValues = [];
                updateOptionsDisplay();
                purposeCustomIndicator.classList.remove('show');
                this.updatePurposeResponse();
            }
        });
    }

    filterPurposes(searchTerm) {
        if (!this.purposeOptions) return;
        
        const options = this.purposeOptions.querySelectorAll('.purpose-option');
        options.forEach(option => {
            const purposeText = option.textContent.toLowerCase();
            const matches = purposeText.includes(searchTerm);
            option.style.display = matches ? 'block' : 'none';
        });
    }

    updatePurposeResponse() {
        if (!this.purposeInput) return;
        
        const selectedValues = this.purposeInput.getSelectedValues ? this.purposeInput.getSelectedValues() : [];
        this.responses.selectedPurposes = selectedValues;
        this.onResponseChange();
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
            if (this.purposeInput && this.responses.selectedPurposes.length > 0) {
                this.purposeInput.setSelectedValues(this.responses.selectedPurposes);
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