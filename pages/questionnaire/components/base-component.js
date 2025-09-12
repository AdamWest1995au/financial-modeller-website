// /pages/questionnaire/components/base-component.js
// Base Component Class Only

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

// Keep backwards compatibility with global window object (BaseComponent only)
if (typeof window !== 'undefined') {
    window.BaseComponent = BaseComponent;
}