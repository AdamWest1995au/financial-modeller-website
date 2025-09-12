// /pages/questionnaire/components/base-component.js

// Base Component Class
export class BaseComponent {
    constructor(config = {}) {
        this.id = config.id || this.generateId();
        this.container = null;
        this.config = {
            required: false,
            validation: {},
            ...config
        };
        this.value = null;
        this.isValid = false;
        this.listeners = new Map();
        this.rendered = false;
    }

    generateId() {
        return 'component_' + Math.random().toString(36).substr(2, 9);
    }

    render(container) {
        this.container = container;
        const element = this.createElement();
        container.appendChild(element);
        this.setupEventListeners();
        this.rendered = true;
        return element;
    }

    createElement() {
        throw new Error('createElement must be implemented by subclass');
    }

    setupEventListeners() {
        // Override in subclasses
    }

    getValue() {
        return this.value;
    }

    setValue(value) {
        this.value = value;
        this.updateDisplay();
        this.validate();
        this.emit('change', value);
    }

    updateDisplay() {
        // Override in subclasses
    }

    validate() {
        let isValid = true;
        let errors = [];

        // Required validation
        if (this.config.required && (this.value === null || this.value === '' || this.value === undefined)) {
            isValid = false;
            errors.push('This field is required');
        }

        // Custom validation
        if (this.config.validation.custom && typeof this.config.validation.custom === 'function') {
            const customResult = this.config.validation.custom(this.value);
            if (customResult !== true) {
                isValid = false;
                errors.push(customResult);
            }
        }

        this.isValid = isValid;
        this.emit('validate', { isValid, errors });
        
        return { isValid, errors };
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    destroy() {
        if (this.container && this.rendered) {
            this.container.innerHTML = '';
        }
        this.listeners.clear();
    }
}

// Text Input Component
export class TextInput extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.config = {
            type: 'text',
            placeholder: '',
            maxLength: null,
            pattern: null,
            ...this.config
        };
    }

    createElement() {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';

        if (this.config.label) {
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = this.config.label;
            if (this.config.required) {
                label.innerHTML += '<span class="required">*</span>';
            }
            wrapper.appendChild(label);
        }

        this.input = document.createElement('input');
        this.input.type = this.config.type;
        this.input.className = 'form-input';
        this.input.placeholder = this.config.placeholder;
        this.input.id = this.id;

        if (this.config.maxLength) {
            this.input.maxLength = this.config.maxLength;
        }

        if (this.config.pattern) {
            this.input.pattern = this.config.pattern;
        }

        wrapper.appendChild(this.input);

        // Validation message container
        this.validationContainer = document.createElement('div');
        this.validationContainer.className = 'validation-message';
        wrapper.appendChild(this.validationContainer);

        return wrapper;
    }

    setupEventListeners() {
        this.input.addEventListener('input', (e) => {
            this.setValue(e.target.value);
        });

        this.input.addEventListener('blur', () => {
            this.validate();
        });

        this.on('validate', ({ isValid, errors }) => {
            this.updateValidationDisplay(isValid, errors);
        });
    }

    updateDisplay() {
        if (this.input) {
            this.input.value = this.value || '';
        }
    }

    updateValidationDisplay(isValid, errors) {
        if (!this.input || !this.validationContainer) return;

        if (isValid) {
            this.input.classList.remove('invalid');
            this.validationContainer.textContent = '';
            this.validationContainer.classList.remove('error');
        } else {
            this.input.classList.add('invalid');
            this.validationContainer.textContent = errors.join(', ');
            this.validationContainer.classList.add('error');
        }
    }
}

// Dropdown Component
export class Dropdown extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.config = {
            options: [],
            searchable: true,
            allowCustom: false,
            multiple: false,
            placeholder: 'Select an option...',
            searchPlaceholder: 'Search options...',
            ...this.config
        };
        this.selectedValues = [];
        this.isOpen = false;
        this.filteredOptions = [...this.config.options];
    }

    createElement() {
        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown-container';

        if (this.config.label) {
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = this.config.label;
            if (this.config.required) {
                label.innerHTML += '<span class="required">*</span>';
            }
            wrapper.appendChild(label);
        }

        // Main dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'dropdown';
        this.dropdown.dataset.multiple = this.config.multiple;

        // Input/display area
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'dropdown-input';
        this.input.placeholder = this.config.placeholder;
        this.input.readOnly = !this.config.searchable;
        this.dropdown.appendChild(this.input);

        // Options container
        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = 'dropdown-options';
        this.renderOptions();
        this.dropdown.appendChild(this.optionsContainer);

        // Custom input indicator
        if (this.config.allowCustom) {
            this.customIndicator = document.createElement('div');
            this.customIndicator.className = 'custom-indicator';
            this.customIndicator.textContent = 'Press Enter to add custom option';
            this.dropdown.appendChild(this.customIndicator);
        }

        wrapper.appendChild(this.dropdown);
        return wrapper;
    }

    renderOptions() {
        this.optionsContainer.innerHTML = '';
        
        this.filteredOptions.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'dropdown-option';
            optionElement.dataset.value = option.value;
            optionElement.textContent = option.text;
            
            if (this.selectedValues.includes(option.value)) {
                optionElement.classList.add('selected');
            }
            
            this.optionsContainer.appendChild(optionElement);
        });
    }

    setupEventListeners() {
        // Input events
        this.input.addEventListener('focus', () => this.openDropdown());
        
        if (this.config.searchable) {
            this.input.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Option selection
        this.optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.dropdown-option');
            if (option) {
                this.selectOption(option.dataset.value);
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    handleSearch(searchTerm) {
        this.filteredOptions = this.config.options.filter(option =>
            option.text.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderOptions();
        
        // Show custom indicator if no matches and custom allowed
        if (this.config.allowCustom) {
            const hasMatches = this.filteredOptions.length > 0;
            const isNewCustomValue = searchTerm && !this.config.options.some(opt => 
                opt.text.toLowerCase() === searchTerm.toLowerCase()
            );
            
            if (this.customIndicator) {
                this.customIndicator.style.display = (!hasMatches && isNewCustomValue) ? 'block' : 'none';
            }
        }
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                if (this.config.allowCustom && this.input.value) {
                    this.addCustomOption(this.input.value);
                }
                break;
            case 'Escape':
                this.closeDropdown();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateOptions(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateOptions(-1);
                break;
        }
    }

    navigateOptions(direction) {
        // Basic keyboard navigation - can be enhanced
        console.log('Navigate options:', direction);
    }

    selectOption(value) {
        if (this.config.multiple) {
            const index = this.selectedValues.indexOf(value);
            if (index > -1) {
                this.selectedValues.splice(index, 1);
            } else {
                this.selectedValues.push(value);
            }
        } else {
            this.selectedValues = [value];
            this.closeDropdown();
        }
        
        this.updateValue();
        this.renderOptions();
        this.updateDisplay();
    }

    addCustomOption(text) {
        const value = text.toLowerCase().replace(/\s+/g, '_');
        const newOption = { value, text };
        
        this.config.options.push(newOption);
        this.selectOption(value);
        
        if (this.customIndicator) {
            this.customIndicator.style.display = 'none';
        }
    }

    updateValue() {
        if (this.config.multiple) {
            this.value = this.selectedValues;
        } else {
            this.value = this.selectedValues[0] || null;
        }
        
        this.emit('change', this.value);
    }

    updateDisplay() {
        if (!this.input) return;
        
        if (this.selectedValues.length === 0) {
            this.input.value = '';
            this.input.placeholder = this.config.placeholder;
        } else {
            const selectedTexts = this.selectedValues.map(value => {
                const option = this.config.options.find(opt => opt.value === value);
                return option ? option.text : value;
            });
            this.input.value = selectedTexts.join(', ');
        }
    }

    openDropdown() {
        this.isOpen = true;
        this.optionsContainer.style.display = 'block';
        this.dropdown.classList.add('open');
    }

    closeDropdown() {
        this.isOpen = false;
        this.optionsContainer.style.display = 'none';
        this.dropdown.classList.remove('open');
        
        if (this.customIndicator) {
            this.customIndicator.style.display = 'none';
        }
    }

    setValue(value) {
        if (this.config.multiple) {
            this.selectedValues = Array.isArray(value) ? value : [];
        } else {
            this.selectedValues = value ? [value] : [];
        }
        
        this.updateValue();
        this.updateDisplay();
        this.renderOptions();
    }
}

// Toggle Component
export class Toggle extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.config = {
            labels: ['No', 'Yes'],
            values: [false, true],
            defaultValue: false,
            ...this.config
        };
        this.value = this.config.defaultValue;
    }

    createElement() {
        const wrapper = document.createElement('div');
        wrapper.className = 'toggle-container';

        if (this.config.label) {
            const label = document.createElement('div');
            label.className = 'toggle-label';
            label.textContent = this.config.label;
            wrapper.appendChild(label);
        }

        this.toggle = document.createElement('div');
        this.toggle.className = 'toggle-switch';
        
        // Create labels container
        const labelsContainer = document.createElement('div');
        labelsContainer.className = 'toggle-labels';
        
        this.config.labels.forEach((labelText, index) => {
            const label = document.createElement('span');
            label.className = 'toggle-option';
            label.textContent = labelText;
            label.dataset.value = this.config.values[index];
            labelsContainer.appendChild(label);
        });
        
        this.toggle.appendChild(labelsContainer);
        wrapper.appendChild(this.toggle);
        
        this.updateDisplay();
        return wrapper;
    }

    setupEventListeners() {
        this.toggle.addEventListener('click', () => {
            const currentIndex = this.config.values.indexOf(this.value);
            const nextIndex = (currentIndex + 1) % this.config.values.length;
            this.setValue(this.config.values[nextIndex]);
        });
    }

    updateDisplay() {
        if (!this.toggle) return;
        
        const currentIndex = this.config.values.indexOf(this.value);
        const isActive = currentIndex > 0;
        
        if (isActive) {
            this.toggle.classList.add('active');
        } else {
            this.toggle.classList.remove('active');
        }
    }

    setValue(value) {
        if (this.config.values.includes(value)) {
            this.value = value;
            this.updateDisplay();
            this.emit('change', value);
        }
    }
}

// Multi-Select Component (extends Dropdown)
export class MultiSelect extends Dropdown {
    constructor(config = {}) {
        super({
            ...config,
            multiple: true
        });
    }

    createElement() {
        const element = super.createElement();
        
        // Add selected items display
        this.selectedContainer = document.createElement('div');
        this.selectedContainer.className = 'selected-items';
        this.dropdown.insertBefore(this.selectedContainer, this.optionsContainer);
        
        return element;
    }

    updateDisplay() {
        super.updateDisplay();
        this.updateSelectedDisplay();
    }

    updateSelectedDisplay() {
        if (!this.selectedContainer) return;
        
        this.selectedContainer.innerHTML = '';
        
        this.selectedValues.forEach(value => {
            const option = this.config.options.find(opt => opt.value === value);
            const text = option ? option.text : value;
            
            const tag = document.createElement('div');
            tag.className = 'selected-tag';
            tag.innerHTML = `
                <span>${text}</span>
                <button type="button" class="remove-tag" data-value="${value}">×</button>
            `;
            
            this.selectedContainer.appendChild(tag);
        });
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Handle tag removal
        this.selectedContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag')) {
                const value = e.target.dataset.value;
                this.selectOption(value); // This will remove it since it's already selected
            }
        });
    }
}

// Keep backwards compatibility with global window object
if (typeof window !== 'undefined') {
    window.BaseComponent = BaseComponent;
    window.TextInput = TextInput;
    window.Dropdown = Dropdown;
    window.Toggle = Toggle;
    window.MultiSelect = MultiSelect;
}