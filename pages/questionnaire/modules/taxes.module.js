// /pages/questionnaire/modules/taxes.module.js - FIXED VERSION WITH MULTISELECT AND CONDITIONAL LOGIC
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
        this.currentContainer = null; // Store reference for re-rendering
        this.userHasInteracted = false; // Track user interaction for engine
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
        
        if (customizationResponse1?.customizationPreferences?.taxes !== undefined) {
            return customizationResponse1.customizationPreferences.taxes === 'generic';
        } else if (customizationResponse2?.customizationPreferences?.taxes !== undefined) {
            return customizationResponse2.customizationPreferences.taxes === 'generic';
        } else if (window.customizationPreferencesFormatted?.taxes !== undefined) {
            return window.customizationPreferencesFormatted.taxes === 'generic';
        } else if (window.customizationPreferences?.taxesCustomization !== undefined) {
            return !window.customizationPreferences.taxesCustomization;
        }
        
        // Default to generic if no preference found
        return true;
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
                console.log('Corporate tax changed to:', value, 'mapped to:', this.responses.corporateTax);
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

    setupCorporateTaxEvents(container) {
        const corporateTaxInput = container.querySelector('#corporateTaxModel');
        const corporateTaxOptions = container.querySelector('#corporateTaxOptions');
        const corporateTaxCustomIndicator = container.querySelector('#corporateTaxCustomIndicator');
        
        if (!corporateTaxInput || !corporateTaxOptions || !corporateTaxCustomIndicator) return;

        // Store references
        this.corporateTaxInput = corporateTaxInput;
        this.corporateTaxOptions = corporateTaxOptions;
        this.corporateTaxCustomIndicator = corporateTaxCustomIndicator;

        let selectedValues = [];

        // Add methods to the input for external access
        corporateTaxInput.getSelectedValues = function() {
            return selectedValues;
        };

        corporateTaxInput.setSelectedValues = function(values) {
            selectedValues = values;
            updateInputDisplay();
            updateOptionsDisplay();
        };

        function updateInputDisplay() {
            if (selectedValues.length === 0) {
                corporateTaxInput.placeholder = 'Search or select corporate tax modeling approach...';
                corporateTaxInput.value = '';
            } else {
                const selectedTexts = selectedValues.map(function(value) {
                    const option = corporateTaxOptions.querySelector(`[data-value="${value}"]`);
                    return option ? option.textContent : value;
                });
                corporateTaxInput.value = selectedTexts.join(', ');
            }
        }

        function updateOptionsDisplay() {
            const options = corporateTaxOptions.querySelectorAll('.corporate-tax-option');
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
        corporateTaxInput.addEventListener('focus', () => {
            corporateTaxOptions.style.display = 'block';
            this.filterCorporateTaxOptions('');
        });

        // Filter options and handle custom input as user types
        corporateTaxInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            // Only filter if user is actually searching, not when we update the display
            if (!selectedValues.some(function(val) { return corporateTaxInput.value.includes(val); })) {
                this.filterCorporateTaxOptions(searchTerm);
                corporateTaxOptions.style.display = 'block';
                
                // Show custom indicator for new text
                if (searchTerm && !Array.from(corporateTaxOptions.querySelectorAll('.corporate-tax-option')).some(function(option) {
                    return option.textContent.toLowerCase().includes(searchTerm);
                })) {
                    corporateTaxCustomIndicator.classList.add('show');
                } else {
                    corporateTaxCustomIndicator.classList.remove('show');
                }
            }
            
            this.updateCorporateTaxResponse();
        });

        // Handle option selection from dropdown (multi-select)
        corporateTaxOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.corporate-tax-option');
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
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            }
        });

        // Handle Enter key to add custom input
        corporateTaxInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentValue = corporateTaxInput.value.trim();
                
                // Extract the last part after comma (what user is currently typing)
                const parts = currentValue.split(',').map(function(part) { return part.trim(); });
                const lastPart = parts[parts.length - 1];
                
                // Check if the last part is new custom text
                const isExistingOption = Array.from(corporateTaxOptions.querySelectorAll('.corporate-tax-option')).find(function(option) {
                    return option.textContent.toLowerCase() === lastPart.toLowerCase();
                });
                
                if (lastPart && !isExistingOption && !selectedValues.includes(lastPart)) {
                    // Add custom text to selections
                    selectedValues.push(lastPart);
                    updateInputDisplay();
                    // Keep dropdown open for more selections
                    corporateTaxOptions.style.display = 'block';
                    this.filterCorporateTaxOptions('');
                }
                
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            } else if (e.key === 'Escape') {
                corporateTaxOptions.style.display = 'none';
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!corporateTaxInput.contains(e.target) && !corporateTaxOptions.contains(e.target)) {
                corporateTaxOptions.style.display = 'none';
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            }
        });

        // Clear selection when input is manually cleared
        corporateTaxInput.addEventListener('keyup', (e) => {
            if (corporateTaxInput.value === '') {
                selectedValues = [];
                updateOptionsDisplay();
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            }
        });
    }

    setupVATEvents(container) {
        const vatInput = container.querySelector('#vatModel');
        const vatOptions = container.querySelector('#vatOptions');
        const vatCustomIndicator = container.querySelector('#vatCustomIndicator');
        
        if (!vatInput || !vatOptions || !vatCustomIndicator) return;

        // Store references
        this.vatInput = vatInput;
        this.vatOptions = vatOptions;
        this.vatCustomIndicator = vatCustomIndicator;

        let selectedValues = [];

        // Add methods to the input for external access
        vatInput.getSelectedValues = function() {
            return selectedValues;
        };

        vatInput.setSelectedValues = function(values) {
            selectedValues = values;
            updateInputDisplay();
            updateOptionsDisplay();
        };

        function updateInputDisplay() {
            if (selectedValues.length === 0) {
                vatInput.placeholder = 'Search or select VAT modeling approach...';
                vatInput.value = '';
            } else {
                const selectedTexts = selectedValues.map(function(value) {
                    const option = vatOptions.querySelector(`[data-value="${value}"]`);
                    return option ? option.textContent : value;
                });
                vatInput.value = selectedTexts.join(', ');
            }
        }

        function updateOptionsDisplay() {
            const options = vatOptions.querySelectorAll('.vat-option');
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
        vatInput.addEventListener('focus', () => {
            vatOptions.style.display = 'block';
            this.filterVATOptions('');
        });

        // Filter options and handle custom input as user types
        vatInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            // Only filter if user is actually searching, not when we update the display
            if (!selectedValues.some(function(val) { return vatInput.value.includes(val); })) {
                this.filterVATOptions(searchTerm);
                vatOptions.style.display = 'block';
                
                // Show custom indicator for new text
                if (searchTerm && !Array.from(vatOptions.querySelectorAll('.vat-option')).some(function(option) {
                    return option.textContent.toLowerCase().includes(searchTerm);
                })) {
                    vatCustomIndicator.classList.add('show');
                } else {
                    vatCustomIndicator.classList.remove('show');
                }
            }
            
            this.updateVATResponse();
        });

        // Handle option selection from dropdown (multi-select)
        vatOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.vat-option');
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
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            }
        });

        // Handle Enter key to add custom input
        vatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentValue = vatInput.value.trim();
                
                // Extract the last part after comma (what user is currently typing)
                const parts = currentValue.split(',').map(function(part) { return part.trim(); });
                const lastPart = parts[parts.length - 1];
                
                // Check if the last part is new custom text
                const isExistingOption = Array.from(vatOptions.querySelectorAll('.vat-option')).find(function(option) {
                    return option.textContent.toLowerCase() === lastPart.toLowerCase();
                });
                
                if (lastPart && !isExistingOption && !selectedValues.includes(lastPart)) {
                    // Add custom text to selections
                    selectedValues.push(lastPart);
                    updateInputDisplay();
                    // Keep dropdown open for more selections
                    vatOptions.style.display = 'block';
                    this.filterVATOptions('');
                }
                
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            } else if (e.key === 'Escape') {
                vatOptions.style.display = 'none';
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!vatInput.contains(e.target) && !vatOptions.contains(e.target)) {
                vatOptions.style.display = 'none';
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            }
        });

        // Clear selection when input is manually cleared
        vatInput.addEventListener('keyup', (e) => {
            if (vatInput.value === '') {
                selectedValues = [];
                updateOptionsDisplay();
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            }
        });
    }

    filterCorporateTaxOptions(searchTerm) {
        if (!this.corporateTaxOptions) return;
        
        const options = this.corporateTaxOptions.querySelectorAll('.corporate-tax-option');
        options.forEach(option => {
            const optionText = option.textContent.toLowerCase();
            const matches = optionText.includes(searchTerm);
            option.style.display = matches ? 'block' : 'none';
        });
    }

    filterVATOptions(searchTerm) {
        if (!this.vatOptions) return;
        
        const options = this.vatOptions.querySelectorAll('.vat-option');
        options.forEach(option => {
            const optionText = option.textContent.toLowerCase();
            const matches = optionText.includes(searchTerm);
            option.style.display = matches ? 'block' : 'none';
        });
    }

    updateCorporateTaxResponse() {
        if (!this.corporateTaxInput) return;
        
        const selectedValues = this.corporateTaxInput.getSelectedValues ? this.corporateTaxInput.getSelectedValues() : [];
        this.responses.corporateTaxModel = selectedValues;
        this.userHasInteracted = true;
        this.onResponseChange();
    }

    updateVATResponse() {
        if (!this.vatInput) return;
        
        const selectedValues = this.vatInput.getSelectedValues ? this.vatInput.getSelectedValues() : [];
        this.responses.valueTaxModel = selectedValues;
        this.userHasInteracted = true;
        this.onResponseChange();
    }

    setupCorporateTaxEvents(container) {
        const corporateTaxInput = container.querySelector('#corporateTaxModel');
        const corporateTaxOptions = container.querySelector('#corporateTaxOptions');
        const corporateTaxCustomIndicator = container.querySelector('#corporateTaxCustomIndicator');
        
        if (!corporateTaxInput || !corporateTaxOptions || !corporateTaxCustomIndicator) return;

        // Store references
        this.corporateTaxInput = corporateTaxInput;
        this.corporateTaxOptions = corporateTaxOptions;
        this.corporateTaxCustomIndicator = corporateTaxCustomIndicator;

        let selectedValues = [];

        // Add methods to the input for external access
        corporateTaxInput.getSelectedValues = function() {
            return selectedValues;
        };

        corporateTaxInput.setSelectedValues = function(values) {
            selectedValues = values;
            updateInputDisplay();
            updateOptionsDisplay();
        };

        function updateInputDisplay() {
            if (selectedValues.length === 0) {
                corporateTaxInput.placeholder = 'Search or select corporate tax modeling approach...';
                corporateTaxInput.value = '';
            } else {
                const selectedTexts = selectedValues.map(function(value) {
                    const option = corporateTaxOptions.querySelector(`[data-value="${value}"]`);
                    return option ? option.textContent : value;
                });
                corporateTaxInput.value = selectedTexts.join(', ');
            }
        }

        function updateOptionsDisplay() {
            const options = corporateTaxOptions.querySelectorAll('.corporate-tax-option');
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
        corporateTaxInput.addEventListener('focus', () => {
            corporateTaxOptions.style.display = 'block';
            this.filterCorporateTaxOptions('');
        });

        // Filter options and handle custom input as user types
        corporateTaxInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            // Only filter if user is actually searching, not when we update the display
            if (!selectedValues.some(function(val) { return corporateTaxInput.value.includes(val); })) {
                this.filterCorporateTaxOptions(searchTerm);
                corporateTaxOptions.style.display = 'block';
                
                // Show custom indicator for new text
                if (searchTerm && !Array.from(corporateTaxOptions.querySelectorAll('.corporate-tax-option')).some(function(option) {
                    return option.textContent.toLowerCase().includes(searchTerm);
                })) {
                    corporateTaxCustomIndicator.classList.add('show');
                } else {
                    corporateTaxCustomIndicator.classList.remove('show');
                }
            }
            
            this.updateCorporateTaxResponse();
        });

        // Handle option selection from dropdown (multi-select)
        corporateTaxOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.corporate-tax-option');
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
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            }
        });

        // Handle Enter key to add custom input
        corporateTaxInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentValue = corporateTaxInput.value.trim();
                
                // Extract the last part after comma (what user is currently typing)
                const parts = currentValue.split(',').map(function(part) { return part.trim(); });
                const lastPart = parts[parts.length - 1];
                
                // Check if the last part is new custom text
                const isExistingOption = Array.from(corporateTaxOptions.querySelectorAll('.corporate-tax-option')).find(function(option) {
                    return option.textContent.toLowerCase() === lastPart.toLowerCase();
                });
                
                if (lastPart && !isExistingOption && !selectedValues.includes(lastPart)) {
                    // Add custom text to selections
                    selectedValues.push(lastPart);
                    updateInputDisplay();
                    // Keep dropdown open for more selections
                    corporateTaxOptions.style.display = 'block';
                    this.filterCorporateTaxOptions('');
                }
                
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            } else if (e.key === 'Escape') {
                corporateTaxOptions.style.display = 'none';
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!corporateTaxInput.contains(e.target) && !corporateTaxOptions.contains(e.target)) {
                corporateTaxOptions.style.display = 'none';
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            }
        });

        // Clear selection when input is manually cleared
        corporateTaxInput.addEventListener('keyup', (e) => {
            if (corporateTaxInput.value === '') {
                selectedValues = [];
                updateOptionsDisplay();
                corporateTaxCustomIndicator.classList.remove('show');
                this.updateCorporateTaxResponse();
            }
        });
    }

    setupVATEvents(container) {
        const vatInput = container.querySelector('#vatModel');
        const vatOptions = container.querySelector('#vatOptions');
        const vatCustomIndicator = container.querySelector('#vatCustomIndicator');
        
        if (!vatInput || !vatOptions || !vatCustomIndicator) return;

        // Store references
        this.vatInput = vatInput;
        this.vatOptions = vatOptions;
        this.vatCustomIndicator = vatCustomIndicator;

        let selectedValues = [];

        // Add methods to the input for external access
        vatInput.getSelectedValues = function() {
            return selectedValues;
        };

        vatInput.setSelectedValues = function(values) {
            selectedValues = values;
            updateInputDisplay();
            updateOptionsDisplay();
        };

        function updateInputDisplay() {
            if (selectedValues.length === 0) {
                vatInput.placeholder = 'Search or select VAT modeling approach...';
                vatInput.value = '';
            } else {
                const selectedTexts = selectedValues.map(function(value) {
                    const option = vatOptions.querySelector(`[data-value="${value}"]`);
                    return option ? option.textContent : value;
                });
                vatInput.value = selectedTexts.join(', ');
            }
        }

        function updateOptionsDisplay() {
            const options = vatOptions.querySelectorAll('.vat-option');
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
        vatInput.addEventListener('focus', () => {
            vatOptions.style.display = 'block';
            this.filterVATOptions('');
        });

        // Filter options and handle custom input as user types
        vatInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            // Only filter if user is actually searching, not when we update the display
            if (!selectedValues.some(function(val) { return vatInput.value.includes(val); })) {
                this.filterVATOptions(searchTerm);
                vatOptions.style.display = 'block';
                
                // Show custom indicator for new text
                if (searchTerm && !Array.from(vatOptions.querySelectorAll('.vat-option')).some(function(option) {
                    return option.textContent.toLowerCase().includes(searchTerm);
                })) {
                    vatCustomIndicator.classList.add('show');
                } else {
                    vatCustomIndicator.classList.remove('show');
                }
            }
            
            this.updateVATResponse();
        });

        // Handle option selection from dropdown (multi-select)
        vatOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.vat-option');
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
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            }
        });

        // Handle Enter key to add custom input
        vatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentValue = vatInput.value.trim();
                
                // Extract the last part after comma (what user is currently typing)
                const parts = currentValue.split(',').map(function(part) { return part.trim(); });
                const lastPart = parts[parts.length - 1];
                
                // Check if the last part is new custom text
                const isExistingOption = Array.from(vatOptions.querySelectorAll('.vat-option')).find(function(option) {
                    return option.textContent.toLowerCase() === lastPart.toLowerCase();
                });
                
                if (lastPart && !isExistingOption && !selectedValues.includes(lastPart)) {
                    // Add custom text to selections
                    selectedValues.push(lastPart);
                    updateInputDisplay();
                    // Keep dropdown open for more selections
                    vatOptions.style.display = 'block';
                    this.filterVATOptions('');
                }
                
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            } else if (e.key === 'Escape') {
                vatOptions.style.display = 'none';
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!vatInput.contains(e.target) && !vatOptions.contains(e.target)) {
                vatOptions.style.display = 'none';
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            }
        });

        // Clear selection when input is manually cleared
        vatInput.addEventListener('keyup', (e) => {
            if (vatInput.value === '') {
                selectedValues = [];
                updateOptionsDisplay();
                vatCustomIndicator.classList.remove('show');
                this.updateVATResponse();
            }
        });
    }

    filterCorporateTaxOptions(searchTerm) {
        if (!this.corporateTaxOptions) return;
        
        const options = this.corporateTaxOptions.querySelectorAll('.corporate-tax-option');
        options.forEach(option => {
            const optionText = option.textContent.toLowerCase();
            const matches = optionText.includes(searchTerm);
            option.style.display = matches ? 'block' : 'none';
        });
    }

    filterVATOptions(searchTerm) {
        if (!this.vatOptions) return;
        
        const options = this.vatOptions.querySelectorAll('.vat-option');
        options.forEach(option => {
            const optionText = option.textContent.toLowerCase();
            const matches = optionText.includes(searchTerm);
            option.style.display = matches ? 'block' : 'none';
        });
    }

    updateCorporateTaxResponse() {
        if (!this.corporateTaxInput) return;
        
        const selectedValues = this.corporateTaxInput.getSelectedValues ? this.corporateTaxInput.getSelectedValues() : [];
        this.responses.corporateTaxModel = selectedValues;
        this.userHasInteracted = true;
        this.onResponseChange();
    }

    updateVATResponse() {
        if (!this.vatInput) return;
        
        const selectedValues = this.vatInput.getSelectedValues ? this.vatInput.getSelectedValues() : [];
        this.responses.valueTaxModel = selectedValues;
        this.userHasInteracted = true;
        this.onResponseChange();
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
            defaultValue: this.responses.valueTax === 'yes' ? 'active' : 'inactive',
            onChange: (value) => {
                this.userHasInteracted = true;
                this.responses.valueTax = value === 'active' ? 'yes' : 'no';
                console.log('Value tax changed to:', value, 'mapped to:', this.responses.valueTax);
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
        section.style.display = 'none'; // Initially hidden

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

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'corporate-tax-dropdown-container';
        dropdownContainer.style.flex = '0 0 375px';

        const corporateTaxModelComponent = new MultiSelect({
            id: 'purposeCorporateTax', // Using 'purpose' prefix to get purple styling
            placeholder: 'Search or select corporate tax modeling approach...',
            options: this.corporateTaxOptions,
            allowCustom: true,
            required: false,
            onChange: (selectedValues) => {
                this.userHasInteracted = true;
                this.responses.corporateTaxModel = selectedValues;
                this.onResponseChange();
            }
        });

        this.components.corporateTaxModel = corporateTaxModelComponent;
        corporateTaxModelComponent.render(dropdownContainer);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);

        return section;
    }

    createVATModelQuestion() {
        const section = document.createElement('div');
        section.className = 'parameter-section conditional-question';
        section.id = 'vat-model-question';
        section.style.display = 'none'; // Initially hidden

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

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'vat-dropdown-container';
        dropdownContainer.style.flex = '0 0 375px';

        const vatModelComponent = new MultiSelect({
            id: 'purposeVAT', // Using 'purpose' prefix to get purple styling
            placeholder: 'Search or select VAT modeling approach...',
            options: this.vatOptions,
            allowCustom: true,
            required: false,
            onChange: (selectedValues) => {
                this.userHasInteracted = true;
                this.responses.valueTaxModel = selectedValues;
                this.onResponseChange();
            }
        });

        this.components.valueTaxModel = vatModelComponent;
        vatModelComponent.render(dropdownContainer);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);

        return section;
    }

    updateConditionalVisibility() {
        console.log('Updating conditional visibility, corporate tax:', this.responses.corporateTax, 'value tax:', this.responses.valueTax);
        
        const corporateTaxModelQuestion = document.getElementById('corporate-tax-model-question');
        const vatModelQuestion = document.getElementById('vat-model-question');

        if (corporateTaxModelQuestion) {
            if (this.responses.corporateTax === 'yes') {
                console.log('Showing corporate tax model question');
                corporateTaxModelQuestion.style.display = 'block';
                corporateTaxModelQuestion.style.opacity = '1';
                corporateTaxModelQuestion.style.transform = 'translateY(0)';
                corporateTaxModelQuestion.classList.add('show');
            } else {
                console.log('Hiding corporate tax model question');
                corporateTaxModelQuestion.style.display = 'none';
                corporateTaxModelQuestion.style.opacity = '0';
                corporateTaxModelQuestion.style.transform = 'translateY(-20px)';
                corporateTaxModelQuestion.classList.remove('show');
            }
        }

        if (vatModelQuestion) {
            if (this.responses.valueTax === 'yes') {
                console.log('Showing VAT model question');
                vatModelQuestion.style.display = 'block';
                vatModelQuestion.style.opacity = '1';
                vatModelQuestion.style.transform = 'translateY(0)';
                vatModelQuestion.classList.add('show');
            } else {
                console.log('Hiding VAT model question');
                vatModelQuestion.style.display = 'none';
                vatModelQuestion.style.opacity = '0';
                vatModelQuestion.style.transform = 'translateY(-20px)';
                vatModelQuestion.classList.remove('show');
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
            this.responses.corporateTaxModel = response.corporateTaxModel || [];
            this.responses.corporateTaxModelFreeText = response.corporateTaxModelFreeText || '';
            this.responses.valueTaxModel = response.valueTaxModel || [];
            this.responses.valueTaxModelFreeText = response.valueTaxModelFreeText || '';
        }

        // Update UI components if they exist
        setTimeout(() => {
            if (this.components.corporateTax) {
                const corporateValue = this.responses.corporateTax === 'yes' ? 'active' : 'inactive';
                this.components.corporateTax.setValue(corporateValue);
            }
            
            if (this.components.valueTax) {
                const vatValue = this.responses.valueTax === 'yes' ? 'active' : 'inactive';
                this.components.valueTax.setValue(vatValue);
            }
            
            if (this.components.corporateTaxModel) {
                this.components.corporateTaxModel.setValue(this.responses.corporateTaxModel);
            }
            
            if (this.components.valueTaxModel) {
                this.components.valueTaxModel.setValue(this.responses.valueTaxModel);
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