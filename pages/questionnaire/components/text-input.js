// components/text-input.js

import { BaseComponent } from './base-component.js';

export class TextInput extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.type = config.type || 'text';
        this.placeholder = config.placeholder || '';
        this.defaultValue = config.defaultValue || '';
        this.required = config.required || false;
        this.validation = config.validation || {};
        this.onChange = config.onChange || (() => {});
        this.onBlur = config.onBlur || (() => {});
        
        // Elements
        this.input = null;
        this.validationMessage = null;
        
        // State
        this.value = this.defaultValue;
        this.isValid = true;
        this.errorMessage = '';
        
        // Validation rules
        this.setupValidation();
    }

    setupValidation() {
        if (!this.validation.errorMessage) {
            if (this.type === 'email') {
                this.validation.errorMessage = 'Please enter a valid email address';
            } else if (this.validation.pattern) {
                this.validation.errorMessage = 'Please enter a valid value';
            } else if (this.required) {
                this.validation.errorMessage = 'This field is required';
            }
        }
    }

    createElement() {
        const container = document.createElement('div');
        container.className = this.getContainerClass();
        
        // Create input
        this.input = document.createElement('input');
        this.input.type = this.type;
        this.input.className = this.getInputClass();
        this.input.id = this.config.id || this.id;
        this.input.placeholder = this.placeholder;
        this.input.value = this.value;
        this.input.autocomplete = this.getAutocomplete();
        
        if (this.required) {
            this.input.required = true;
        }
        
        // Create validation message
        this.validationMessage = document.createElement('div');
        this.validationMessage.className = 'validation-message';
        this.validationMessage.textContent = this.getDefaultMessage();
        
        // Assemble container
        container.appendChild(this.input);
        container.appendChild(this.validationMessage);
        
        return container;
    }

    setupEventListeners() {
        if (!this.input) return;

        // Input event - real-time validation
        this.input.addEventListener('input', (e) => {
            this.setValue(e.target.value);
        });

        // Blur event - additional validation
        this.input.addEventListener('blur', (e) => {
            this.validateInput();
            this.onBlur(this.value);
        });

        // Focus event - clear error state
        this.input.addEventListener('focus', (e) => {
            if (this.input.classList.contains('invalid')) {
                this.clearError();
            }
        });
    }

    updateDisplay() {
        if (this.input) {
            this.input.value = this.value || '';
        }
    }

    getContainerClass() {
        if (this.validation.pattern && this.validation.pattern.toString().includes('\\d') || 
            this.config.id && (this.config.id.includes('numeric') || 
            this.config.id.includes('forecast') || 
            this.config.id.includes('years'))) {
            return 'numeric-input-container';
        }
        return 'text-input-container';
    }

    getInputClass() {
        if (this.validation.pattern && this.validation.pattern.toString().includes('\\d') || 
            this.config.id && (this.config.id.includes('numeric') || 
            this.config.id.includes('forecast') || 
            this.config.id.includes('years'))) {
            return 'numeric-input';
        }
        
        if (this.type === 'email' || (this.config.id && this.config.id.includes('email'))) {
            return 'form-input';
        }
        
        if (this.type === 'tel' || (this.config.id && this.config.id.includes('phone'))) {
            return 'form-input';
        }
        
        return 'form-input';
    }

    getAutocomplete() {
        switch (this.type) {
            case 'email':
                return 'email';
            case 'tel':
                return 'tel';
            default:
                return this.config.id || 'off';
        }
    }

    getDefaultMessage() {
        if (this.validation.pattern && this.validation.pattern.toString().includes('\\d')) {
            return 'Numerical values only';
        }
        return '';
    }

    validateInput() {
        const value = this.value ? this.value.trim() : '';
        
        // Reset state
        this.isValid = true;
        this.errorMessage = '';
        
        // Required validation
        if (this.required && !value) {
            this.setError('This field is required');
            return false;
        }
        
        // Skip other validations if empty and not required
        if (!value && !this.required) {
            this.clearError();
            return true;
        }
        
        // Email validation
        if (this.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.setError('Please enter a valid email address');
                return false;
            }
        }
        
        // Pattern validation
        if (this.validation.pattern && value) {
            if (!this.validation.pattern.test(value)) {
                this.setError(this.validation.errorMessage || 'Invalid format');
                return false;
            }
        }
        
        // Numeric range validation
        if (this.validation.min !== undefined || this.validation.max !== undefined) {
            const numericValue = parseInt(value);
            
            if (isNaN(numericValue)) {
                this.setError('Please enter a valid number');
                return false;
            }
            
            if (this.validation.min !== undefined && numericValue < this.validation.min) {
                this.setError(`Please enter a number of at least ${this.validation.min}`);
                return false;
            }
            
            if (this.validation.max !== undefined && numericValue > this.validation.max) {
                this.setError(`Please enter a number no greater than ${this.validation.max}`);
                return false;
            }
        }
        
        // Custom validation function
        if (this.validation.customValidator) {
            const customResult = this.validation.customValidator(value);
            if (!customResult.isValid) {
                this.setError(customResult.message || 'Invalid value');
                return false;
            }
        }
        
        // All validations passed
        this.clearError();
        return true;
    }

    setError(message) {
        this.isValid = false;
        this.errorMessage = message;
        
        // Update UI
        if (this.input) {
            this.input.classList.add('invalid');
        }
        if (this.validationMessage) {
            this.validationMessage.textContent = message;
            this.validationMessage.classList.add('error');
        }
    }

    clearError() {
        this.isValid = true;
        this.errorMessage = '';
        
        // Update UI
        if (this.input) {
            this.input.classList.remove('invalid');
        }
        if (this.validationMessage) {
            this.validationMessage.textContent = this.getDefaultMessage();
            this.validationMessage.classList.remove('error');
        }
    }

    setValue(value) {
        this.value = value || '';
        this.updateDisplay();
        this.validateInput();
        this.onChange(this.value);
        this.emit('change', this.value);
    }

    getValue() {
        return this.value;
    }

    focus() {
        if (this.input) {
            this.input.focus();
        }
    }

    blur() {
        if (this.input) {
            this.input.blur();
        }
    }

    setRequired(required) {
        this.required = required;
        if (this.input) {
            this.input.required = required;
        }
        this.validateInput();
    }

    setPlaceholder(placeholder) {
        this.placeholder = placeholder;
        if (this.input) {
            this.input.placeholder = placeholder;
        }
    }

    enable() {
        if (this.input) {
            this.input.disabled = false;
        }
    }

    disable() {
        if (this.input) {
            this.input.disabled = true;
        }
    }

    validate() {
        const isValid = this.validateInput();
        const result = {
            isValid: isValid,
            errors: isValid ? [] : [this.errorMessage]
        };
        
        this.emit('validate', result);
        return result;
    }
}