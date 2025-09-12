// components/dropdown.js

import { BaseComponent } from './base-component.js';

export class Dropdown extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.options = config.options || [];
        this.placeholder = config.placeholder || 'Select an option...';
        this.defaultValue = config.defaultValue || '';
        this.onChange = config.onChange || (() => {});
        
        this.value = this.defaultValue;
        this.selectElement = null;
    }

    createElement() {
        this.selectElement = document.createElement('select');
        this.selectElement.className = 'single-dropdown-select';
        this.selectElement.id = this.config.id || this.id;

        // Add placeholder/default option
        if (this.placeholder) {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = this.placeholder;
            placeholderOption.disabled = true;
            placeholderOption.selected = this.value === '';
            this.selectElement.appendChild(placeholderOption);
        }

        // Add options
        this.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            optionElement.selected = option.value === this.value;
            this.selectElement.appendChild(optionElement);
        });

        return this.selectElement;
    }

    setupEventListeners() {
        if (!this.selectElement) return;

        this.selectElement.addEventListener('change', (e) => {
            this.setValue(e.target.value);
        });
    }

    updateDisplay() {
        if (this.selectElement) {
            this.selectElement.value = this.value;
        }
    }

    setValue(value) {
        this.value = value;
        this.updateDisplay();
        this.onChange(this.value);
        this.emit('change', this.value);
    }

    getValue() {
        return this.value;
    }

    validate() {
        const isValid = this.value !== '' && this.value !== null && this.value !== undefined;
        const errors = isValid ? [] : ['Please select an option'];
        
        this.isValid = isValid;
        this.emit('validate', { isValid, errors });
        
        return { isValid, errors };
    }
}