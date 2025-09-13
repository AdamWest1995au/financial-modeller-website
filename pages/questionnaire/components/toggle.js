// components/toggle.js

import { BaseComponent } from './base-component.js';

export class Toggle extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.labels = config.labels || ['No', 'Yes'];
        this.defaultValue = config.defaultValue || 'inactive';
        this.width = config.width || '140px';
        this.onChange = config.onChange || (() => {});
        
        // IMPORTANT: Setup value mapping BEFORE calling getInitialState
        this.valueMapping = this.setupValueMapping();
        
        // State - false = left option (inactive), true = right option (active)
        this.isActive = this.getInitialState();
        this.value = this.isActive ? 'active' : 'inactive';
        
        // Elements
        this.toggleElement = null;
        this.labelsContainer = null;
    }

    setupValueMapping() {
        const mapping = {};
        
        // Default mapping
        mapping['active'] = true;
        mapping['inactive'] = false;
        mapping['yes'] = true;
        mapping['no'] = false;
        mapping['true'] = true;
        mapping['false'] = false;
        
        // Custom mappings based on labels or config
        if (this.config.id && this.config.id.includes('approach')) {
            mapping['topdown'] = false;
            mapping['bottomup'] = true;
        } else if (this.config.id && this.config.id.includes('revenue') && this.config.id.includes('staff')) {
            mapping['no'] = false;
            mapping['yes'] = true;
        } else if (this.labels.length === 2) {
            mapping[this.labels[0].toLowerCase()] = false;
            mapping[this.labels[1].toLowerCase()] = true;
        }
        
        return mapping;
    }

    getInitialState() {
        if (this.defaultValue === 'active') return true;
        if (this.defaultValue === 'inactive') return false;
        
        if (this.valueMapping && this.valueMapping.hasOwnProperty(this.defaultValue)) {
            return this.valueMapping[this.defaultValue];
        }
        
        return false;
    }

    // This method is required by BaseComponent
    createElement() {
        // Create main container
        const container = document.createElement('div');
        container.className = 'toggle-switch-container';
        
        // Create toggle switch
        this.toggleElement = document.createElement('div');
        this.toggleElement.className = 'toggle-switch';
        if (this.config.id) {
            this.toggleElement.id = this.config.id;
        }
        this.toggleElement.style.width = this.width;
        
        // Set initial active state
        if (this.isActive) {
            this.toggleElement.classList.add('active');
        }
        
        // Create labels container
        this.labelsContainer = document.createElement('div');
        this.labelsContainer.className = 'toggle-labels';
        
        // Create label elements
        this.labels.forEach((labelText, index) => {
            const label = document.createElement('span');
            label.className = 'toggle-label';
            label.textContent = labelText;
            
            if (this.config.id) {
                if (index === 0) {
                    label.id = `${this.config.id}LeftLabel`;
                } else {
                    label.id = `${this.config.id}RightLabel`;
                }
            }
            
            this.labelsContainer.appendChild(label);
        });
        
        // Assemble toggle
        this.toggleElement.appendChild(this.labelsContainer);
        container.appendChild(this.toggleElement);
        
        // Set initial visual state
        this.updateVisualState();
        this.updateDatasetValue();
        
        return container;
    }

    // This method is required by BaseComponent
    setupEventListeners() {
        if (!this.toggleElement) return;

        this.toggleElement.addEventListener('click', () => {
            this.toggle();
        });
        
        this.toggleElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });
        
        this.toggleElement.setAttribute('tabindex', '0');
    }

    // Override updateDisplay from BaseComponent
    updateDisplay() {
        this.updateVisualState();
        this.updateDatasetValue();
    }

    toggle() {
        this.isActive = !this.isActive;
        this.updateState();
        this.triggerChange();
    }

    updateState() {
        if (!this.toggleElement) return;

        if (this.isActive) {
            this.toggleElement.classList.add('active');
        } else {
            this.toggleElement.classList.remove('active');
        }
        
        this.updateVisualState();
        this.value = this.getCurrentValue();
        this.updateDatasetValue();
    }

    updateVisualState() {
        if (!this.labelsContainer) return;

        const labels = this.labelsContainer.querySelectorAll('.toggle-label');
        
        if (labels.length === 2) {
            if (this.isActive) {
                labels[0].style.color = 'rgba(255, 255, 255, 0.4)';
                labels[1].style.color = '#ffffff';
            } else {
                labels[0].style.color = '#ffffff';
                labels[1].style.color = 'rgba(255, 255, 255, 0.4)';
            }
        }
    }

    getCurrentValue() {
        if (this.config.id && this.config.id.includes('approach')) {
            return this.isActive ? 'bottomup' : 'topdown';
        } else if (this.config.id && this.config.id.includes('revenue') && this.config.id.includes('staff')) {
            return this.isActive ? 'yes' : 'no';
        } else if (this.config.id && this.config.id.includes('parameter')) {
            return this.isActive;
        } else {
            return this.isActive ? 'active' : 'inactive';
        }
    }

    updateDatasetValue() {
        if (this.toggleElement) {
            this.toggleElement.dataset.value = this.value.toString();
        }
    }

    triggerChange() {
        this.onChange(this.value);
        this.emit('change', this.value);
        
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    // Override setValue from BaseComponent
    setValue(value) {
        if (typeof value === 'boolean') {
            this.isActive = value;
        } else if (typeof value === 'string') {
            if (this.valueMapping && this.valueMapping.hasOwnProperty(value.toLowerCase())) {
                this.isActive = this.valueMapping[value.toLowerCase()];
            } else if (value === 'active') {
                this.isActive = true;
            } else if (value === 'inactive') {
                this.isActive = false;
            } else {
                const lowerValue = value.toLowerCase();
                const lowerLabels = this.labels.map(l => l.toLowerCase());
                const labelIndex = lowerLabels.indexOf(lowerValue);
                
                if (labelIndex === 0) {
                    this.isActive = false;
                } else if (labelIndex === 1) {
                    this.isActive = true;
                }
            }
        }
        
        this.value = this.getCurrentValue();
        this.updateState();
        this.emit('change', this.value);
    }

    setActive(active) {
        this.isActive = Boolean(active);
        this.updateState();
    }

    isToggleActive() {
        return this.isActive;
    }

    setLabels(labels) {
        if (Array.isArray(labels) && labels.length === 2) {
            this.labels = labels;
            
            if (this.labelsContainer) {
                const labelElements = this.labelsContainer.querySelectorAll('.toggle-label');
                labelElements.forEach((label, index) => {
                    if (this.labels[index]) {
                        label.textContent = this.labels[index];
                    }
                });
            }
            
            this.valueMapping = this.setupValueMapping();
        }
    }

    setWidth(width) {
        this.width = width;
        if (this.toggleElement) {
            this.toggleElement.style.width = width;
        }
    }

    enable() {
        if (this.toggleElement) {
            this.toggleElement.style.pointerEvents = 'auto';
            this.toggleElement.style.opacity = '1';
            this.toggleElement.setAttribute('tabindex', '0');
        }
    }

    disable() {
        if (this.toggleElement) {
            this.toggleElement.style.pointerEvents = 'none';
            this.toggleElement.style.opacity = '0.5';
            this.toggleElement.removeAttribute('tabindex');
        }
    }

    // Override validate from BaseComponent
    validate() {
        return {
            isValid: true,
            errors: []
        };
    }
}

export default Toggle;