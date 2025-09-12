// components/multi-select.js

import { BaseComponent } from './base-component.js';

export class MultiSelect extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.options = config.options || [];
        this.placeholder = config.placeholder || 'Search or select options...';
        this.allowCustom = config.allowCustom !== false;
        this.customIndicatorText = config.customIndicatorText || 'Press Enter to add your custom option';
        this.selectedValues = [];
        this.onChange = config.onChange || (() => {});
        
        // Elements
        this.input = null;
        this.optionsContainer = null;
        this.customIndicator = null;
        
        // State
        this.isOpen = false;
        this.searchTerm = '';
        
        this.value = [];
    }

    createElement() {
        const container = document.createElement('div');
        container.className = this.getContainerClass();
        
        // Create input
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = this.getInputClass();
        this.input.id = this.config.id || this.id;
        this.input.placeholder = this.placeholder;
        this.input.autocomplete = 'off';
        
        // Create options container
        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = this.getOptionsClass();
        this.optionsContainer.style.display = 'none';
        
        // Create custom indicator
        if (this.allowCustom) {
            this.customIndicator = document.createElement('div');
            this.customIndicator.className = this.getCustomIndicatorClass();
            this.customIndicator.textContent = this.customIndicatorText;
            this.customIndicator.style.display = 'none';
        }
        
        // Populate options
        this.populateOptions();
        
        // Assemble container
        container.appendChild(this.input);
        container.appendChild(this.optionsContainer);
        if (this.customIndicator) {
            container.appendChild(this.customIndicator);
        }
        
        return container;
    }

    setupEventListeners() {
        if (!this.input) return;

        // Input focus - show dropdown
        this.input.addEventListener('focus', () => {
            this.showDropdown();
        });

        // Input change - filter options and handle custom input
        this.input.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            
            if (!this.isDisplayUpdate()) {
                this.filterOptions(this.searchTerm);
                this.showDropdown();
                this.handleCustomInput();
            }
        });

        // Handle keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Option clicks
        this.optionsContainer.addEventListener('click', (e) => {
            this.handleOptionClick(e);
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            this.handleClickOutside(e);
        });

        // Input clear detection
        this.input.addEventListener('keyup', (e) => {
            if (this.input.value === '') {
                this.clearSelection();
            }
        });
    }

    getContainerClass() {
        if (this.config.id && this.config.id.includes('revenue')) return 'revenue-dropdown';
        if (this.config.id && this.config.id.includes('purpose')) return 'purpose-dropdown';
        if (this.config.id && this.config.id.includes('procurement')) return 'procurement-dropdown';
        if (this.config.id && this.config.id.includes('channels')) return 'channels-dropdown';
        return 'searchable-dropdown';
    }

    getInputClass() {
        if (this.config.id && this.config.id.includes('revenue')) return 'revenue-input';
        if (this.config.id && this.config.id.includes('purpose')) return 'purpose-input';
        if (this.config.id && this.config.id.includes('procurement')) return 'procurement-input';
        if (this.config.id && this.config.id.includes('channels')) return 'channels-input';
        return 'dropdown-input';
    }

    getOptionsClass() {
        if (this.config.id && this.config.id.includes('revenue')) return 'revenue-options';
        if (this.config.id && this.config.id.includes('purpose')) return 'purpose-options';
        if (this.config.id && this.config.id.includes('procurement')) return 'procurement-options';
        if (this.config.id && this.config.id.includes('channels')) return 'channels-options';
        return 'dropdown-options';
    }

    getCustomIndicatorClass() {
        if (this.config.id && this.config.id.includes('revenue')) return 'revenue-custom-indicator';
        if (this.config.id && this.config.id.includes('purpose')) return 'purpose-custom-indicator';
        if (this.config.id && this.config.id.includes('procurement')) return 'procurement-custom-indicator';
        if (this.config.id && this.config.id.includes('channels')) return 'channels-custom-indicator';
        return 'custom-indicator';
    }

    getOptionClass() {
        if (this.config.id && this.config.id.includes('revenue')) return 'revenue-option';
        if (this.config.id && this.config.id.includes('purpose')) return 'purpose-option';
        if (this.config.id && this.config.id.includes('procurement')) return 'procurement-option';
        if (this.config.id && this.config.id.includes('channels')) return 'channels-option';
        return 'dropdown-option';
    }

    populateOptions() {
        this.optionsContainer.innerHTML = '';
        
        this.options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = this.getOptionClass();
            optionElement.dataset.value = option.value;
            optionElement.textContent = option.text;
            
            if (this.selectedValues.includes(option.value)) {
                optionElement.classList.add('selected');
            }
            
            this.optionsContainer.appendChild(optionElement);
        });
    }

    updateDisplay() {
        if (this.input) {
            this.input.value = this.getDisplayText();
        }
        this.updateOptionsDisplay();
    }

    getDisplayText() {
        if (this.selectedValues.length === 0) {
            return '';
        }
        
        const displayTexts = this.selectedValues.map(value => {
            const option = this.options.find(opt => opt.value === value);
            return option ? option.text : value;
        });
        
        return displayTexts.join(', ');
    }

    updateOptionsDisplay() {
        const options = this.optionsContainer.querySelectorAll(`.${this.getOptionClass()}`);
        
        options.forEach(option => {
            const value = option.dataset.value;
            if (this.selectedValues.includes(value)) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    isDisplayUpdate() {
        const displayText = this.getDisplayText();
        return this.input && this.input.value === displayText;
    }

    showDropdown() {
        this.isOpen = true;
        this.optionsContainer.style.display = 'block';
        this.addDropdownOpenClasses();
        this.filterOptions('');
    }

    hideDropdown() {
        this.isOpen = false;
        this.optionsContainer.style.display = 'none';
        this.removeDropdownOpenClasses();
        
        if (this.customIndicator) {
            this.customIndicator.style.display = 'none';
        }
    }

    addDropdownOpenClasses() {
        const dropdown = this.container;
        const section = dropdown && dropdown.closest('.parameter-section, .conditional-section, .charging-models-section');
        
        if (dropdown) {
            dropdown.classList.add('dropdown-open');
        }
        if (section) {
            section.classList.add('dropdown-open');
        }
    }

    removeDropdownOpenClasses() {
        const dropdown = this.container;
        const section = dropdown && dropdown.closest('.parameter-section, .conditional-section, .charging-models-section');
        
        if (dropdown) {
            dropdown.classList.remove('dropdown-open');
        }
        if (section) {
            section.classList.remove('dropdown-open');
        }
    }

    filterOptions(searchTerm) {
        const options = this.optionsContainer.querySelectorAll(`.${this.getOptionClass()}`);
        
        options.forEach(option => {
            const optionText = option.textContent.toLowerCase();
            const matches = optionText.includes(searchTerm);
            option.style.display = matches ? 'block' : 'none';
        });
    }

    handleCustomInput() {
        if (!this.allowCustom || !this.customIndicator) return;
        
        const searchTerm = this.searchTerm;
        
        if (searchTerm && !this.hasMatchingOption(searchTerm)) {
            this.customIndicator.style.display = 'block';
        } else {
            this.customIndicator.style.display = 'none';
        }
    }

    hasMatchingOption(searchTerm) {
        return this.options.some(option => 
            option.text.toLowerCase().includes(searchTerm)
        );
    }

    handleKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.handleEnterKey();
        } else if (e.key === 'Escape') {
            this.hideDropdown();
        }
    }

    handleEnterKey() {
        const currentValue = this.input.value.trim();
        
        if (currentValue) {
            const parts = currentValue.split(',').map(part => part.trim());
            const lastPart = parts[parts.length - 1];
            
            const isExistingOption = this.options.find(option => 
                option.text.toLowerCase() === lastPart.toLowerCase()
            );
            
            if (lastPart && !isExistingOption && !this.selectedValues.includes(lastPart)) {
                this.selectedValues.push(lastPart);
                this.setValue(this.selectedValues);
                this.showDropdown();
                this.filterOptions('');
            }
        }
        
        if (this.customIndicator) {
            this.customIndicator.style.display = 'none';
        }
    }

    handleOptionClick(e) {
        const option = e.target.closest(`.${this.getOptionClass()}`);
        if (!option) return;
        
        const value = option.dataset.value;
        
        if (this.selectedValues.includes(value)) {
            this.selectedValues = this.selectedValues.filter(v => v !== value);
            option.classList.remove('selected');
        } else {
            this.selectedValues.push(value);
            option.classList.add('selected');
        }
        
        this.setValue(this.selectedValues);
        
        if (this.customIndicator) {
            this.customIndicator.style.display = 'none';
        }
    }

    handleClickOutside(e) {
        if (this.container && !this.container.contains(e.target)) {
            this.hideDropdown();
        }
    }

    clearSelection() {
        this.selectedValues = [];
        this.setValue(this.selectedValues);
        this.removeDropdownOpenClasses();
    }

    setValue(values) {
        this.selectedValues = Array.isArray(values) ? [...values] : [];
        this.value = this.selectedValues;
        this.updateDisplay();
        this.onChange(this.selectedValues);
        this.emit('change', this.selectedValues);
    }

    getValue() {
        return [...this.selectedValues];
    }

    validate() {
        const isValid = this.selectedValues.length > 0;
        const errors = isValid ? [] : ['Please select at least one option'];
        
        this.isValid = isValid;
        this.emit('validate', { isValid, errors });
        
        return { isValid, errors };
    }
}