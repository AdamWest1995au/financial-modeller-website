// /pages/questionnaire/core/validator.js
class QuestionnaireValidator {
    constructor(config = {}) {
        this.config = {
            validateOnChange: true,
            showRealTimeErrors: true,
            emailValidation: true,
            phoneValidation: false,
            ...config
        };
        
        this.validationRules = new Map();
        this.customValidators = new Map();
        this.currentValidationState = new Map();
        
        this.setupDefaultValidators();
    }

    setupDefaultValidators() {
        // Email validation
        this.customValidators.set('email', (value) => {
            if (!value) return true; // Allow empty if not required
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) || 'Please enter a valid email address';
        });

        // Phone validation (basic)
        this.customValidators.set('phone', (value) => {
            if (!value) return true;
            const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
            return phoneRegex.test(value) || 'Please enter a valid phone number';
        });

        // Numeric validation
        this.customValidators.set('numeric', (value, min = null, max = null) => {
            if (!value) return true;
            const num = Number(value);
            if (isNaN(num)) return 'Please enter a valid number';
            if (min !== null && num < min) return `Number must be at least ${min}`;
            if (max !== null && num > max) return `Number must be no more than ${max}`;
            return true;
        });

        // URL validation
        this.customValidators.set('url', (value) => {
            if (!value) return true;
            try {
                new URL(value);
                return true;
            } catch {
                return 'Please enter a valid URL';
            }
        });

        // Text length validation
        this.customValidators.set('length', (value, min = 0, max = Infinity) => {
            if (!value) return true;
            const length = value.length;
            if (length < min) return `Must be at least ${min} characters`;
            if (length > max) return `Must be no more than ${max} characters`;
            return true;
        });

        // Pattern validation
        this.customValidators.set('pattern', (value, pattern, message = 'Invalid format') => {
            if (!value) return true;
            const regex = new RegExp(pattern);
            return regex.test(value) || message;
        });

        // Selection validation (for dropdowns)
        this.customValidators.set('selection', (value, minSelections = 1) => {
            if (Array.isArray(value)) {
                return value.length >= minSelections || `Please select at least ${minSelections} option(s)`;
            }
            return value ? true : 'Please make a selection';
        });
    }

    registerValidationRule(moduleId, questionIndex, rules) {
        const key = `${moduleId}:${questionIndex}`;
        this.validationRules.set(key, rules);
        console.log(`✅ Validation rule registered for ${key}`);
    }

    validateQuestion(moduleId, questionIndex, data) {
        const key = `${moduleId}:${questionIndex}`;
        const rules = this.validationRules.get(key);
        
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            fieldErrors: {}
        };

        // If no rules defined, check if question is required
        if (!rules) {
            const isRequired = this.isQuestionRequired(moduleId, questionIndex);
            if (isRequired && this.isDataEmpty(data)) {
                result.isValid = false;
                result.errors.push('This question is required');
            }
            this.currentValidationState.set(key, result);
            return result;
        }

        // Apply validation rules
        Object.entries(rules).forEach(([fieldName, fieldRules]) => {
            const fieldValue = this.getFieldValue(data, fieldName);
            const fieldResult = this.validateField(fieldValue, fieldRules);
            
            if (!fieldResult.isValid) {
                result.isValid = false;
                result.fieldErrors[fieldName] = fieldResult.errors;
                result.errors.push(...fieldResult.errors);
            }
            
            if (fieldResult.warnings.length > 0) {
                result.warnings.push(...fieldResult.warnings);
            }
        });

        // Cross-field validation
        if (rules._crossField) {
            const crossFieldResult = this.validateCrossField(data, rules._crossField);
            if (!crossFieldResult.isValid) {
                result.isValid = false;
                result.errors.push(...crossFieldResult.errors);
            }
        }

        this.currentValidationState.set(key, result);
        console.log(`🔍 Validation result for ${key}:`, result);
        
        return result;
    }

    validateField(value, rules) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Handle array of rules
        if (Array.isArray(rules)) {
            rules.forEach(rule => {
                const ruleResult = this.applyValidationRule(value, rule);
                if (!ruleResult.isValid) {
                    result.isValid = false;
                    result.errors.push(...ruleResult.errors);
                }
                result.warnings.push(...ruleResult.warnings);
            });
        } else {
            const ruleResult = this.applyValidationRule(value, rules);
            result.isValid = ruleResult.isValid;
            result.errors = ruleResult.errors;
            result.warnings = ruleResult.warnings;
        }

        return result;
    }

    applyValidationRule(value, rule) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Handle different rule formats
        if (typeof rule === 'string') {
            // Simple validator name
            result.isValid = this.runValidator(rule, value);
            if (result.isValid !== true) {
                result.errors.push(result.isValid);
                result.isValid = false;
            }
        } else if (typeof rule === 'object') {
            const { validator, required, message, params, warning } = rule;
            
            // Check if required
            if (required && this.isEmpty(value)) {
                result.isValid = false;
                result.errors.push(message || 'This field is required');
                return result;
            }
            
            // Skip validation if empty and not required
            if (!required && this.isEmpty(value)) {
                return result;
            }
            
            // Run validator
            const validatorResult = this.runValidator(validator, value, params);
            if (validatorResult !== true) {
                if (warning) {
                    result.warnings.push(message || validatorResult);
                } else {
                    result.isValid = false;
                    result.errors.push(message || validatorResult);
                }
            }
        } else if (typeof rule === 'function') {
            // Custom validation function
            const customResult = rule(value);
            if (customResult !== true) {
                result.isValid = false;
                result.errors.push(customResult);
            }
        }

        return result;
    }

    runValidator(validatorName, value, params = []) {
        const validator = this.customValidators.get(validatorName);
        if (!validator) {
            console.warn(`Validator '${validatorName}' not found`);
            return true;
        }

        try {
            return validator(value, ...params);
        } catch (error) {
            console.error(`Error running validator '${validatorName}':`, error);
            return 'Validation error occurred';
        }
    }

    validateCrossField(data, crossFieldRules) {
        const result = {
            isValid: true,
            errors: []
        };

        crossFieldRules.forEach(rule => {
            const { fields, validator, message } = rule;
            const fieldValues = fields.map(field => this.getFieldValue(data, field));
            
            try {
                const isValid = validator(...fieldValues);
                if (!isValid) {
                    result.isValid = false;
                    result.errors.push(message || 'Cross-field validation failed');
                }
            } catch (error) {
                console.error('Cross-field validation error:', error);
                result.isValid = false;
                result.errors.push(message || 'Validation error occurred');
            }
        });

        return result;
    }

    getFieldValue(data, fieldPath) {
        return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
    }

    isEmpty(value) {
        if (value === null || value === undefined || value === '') return true;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    isDataEmpty(data) {
        if (!data || typeof data !== 'object') return true;
        return Object.values(data).every(value => this.isEmpty(value));
    }

    isQuestionRequired(moduleId, questionIndex) {
        // Check if this is a required question (like user-info)
        const requiredModules = ['user-info'];
        return requiredModules.includes(moduleId);
    }

    // Validation for specific question types
    validateUserInfoQuestion(data) {
        const rules = {
            userName: [
                { validator: 'length', params: [2, 50], required: true, message: 'Name must be 2-50 characters' }
            ],
            companyName: [
                { validator: 'length', params: [2, 100], required: true, message: 'Company name must be 2-100 characters' }
            ],
            email: [
                { validator: 'email', required: true, message: 'Valid email address is required' }
            ],
            phone: [
                { validator: 'phone', required: true, message: 'Valid phone number is required' }
            ],
            'country.name': [
                { validator: 'length', params: [2], required: true, message: 'Please select a country' }
            ]
        };

        return this.validateDataWithRules(data, rules);
    }

    validateRevenueQuestion(data) {
        const rules = {
            selectedRevenues: [
                { validator: 'selection', params: [1], required: false, message: 'Please select at least one revenue model' }
            ]
        };

        return this.validateDataWithRules(data, rules);
    }

    validateNumericInputQuestion(data, min = 1, max = 50) {
        const rules = {
            value: [
                { validator: 'numeric', params: [min, max], required: true, message: `Please enter a number between ${min} and ${max}` }
            ]
        };

        return this.validateDataWithRules(data, rules);
    }

    validateDataWithRules(data, rules) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            fieldErrors: {}
        };

        Object.entries(rules).forEach(([fieldName, fieldRules]) => {
            const fieldValue = this.getFieldValue(data, fieldName);
            const fieldResult = this.validateField(fieldValue, fieldRules);
            
            if (!fieldResult.isValid) {
                result.isValid = false;
                result.fieldErrors[fieldName] = fieldResult.errors;
                result.errors.push(...fieldResult.errors);
            }
            
            if (fieldResult.warnings.length > 0) {
                result.warnings.push(...fieldResult.warnings);
            }
        });

        return result;
    }

    // Validation for final submission
    validateSubmissionData(submissionData) {
        const result = {
            isValid: true,
            errors: [],
            missingRequired: []
        };

        // Check required fields
        const requiredFields = [
            'full_name',
            'company_name', 
            'email',
            'phone',
            'country_name'
        ];

        requiredFields.forEach(field => {
            const value = submissionData[field];
            if (this.isEmpty(value)) {
                result.isValid = false;
                result.missingRequired.push(field);
                result.errors.push(`${this.formatFieldName(field)} is required`);
            }
        });

        // Validate email format
        if (submissionData.email && !this.runValidator('email', submissionData.email)) {
            result.isValid = false;
            result.errors.push('Invalid email format');
        }

        // Check for spam indicators
        if (submissionData.honeypot_website && submissionData.honeypot_website.trim() !== '') {
            result.isValid = false;
            result.errors.push('Submission failed security validation');
        }

        return result;
    }

    formatFieldName(fieldName) {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    // Real-time validation
    validateCurrentQuestion() {
        // This would be called by the engine to validate the current question
        // Implementation depends on how the engine tracks current state
        console.log('🔍 Validating current question...');
        return { isValid: true, errors: [] };
    }

    // Get validation state for a specific question
    getValidationState(moduleId, questionIndex) {
        const key = `${moduleId}:${questionIndex}`;
        return this.currentValidationState.get(key) || { isValid: true, errors: [] };
    }

    // Clear validation state
    clearValidationState(moduleId, questionIndex = null) {
        if (questionIndex !== null) {
            const key = `${moduleId}:${questionIndex}`;
            this.currentValidationState.delete(key);
        } else {
            // Clear all for module
            for (const [key] of this.currentValidationState) {
                if (key.startsWith(`${moduleId}:`)) {
                    this.currentValidationState.delete(key);
                }
            }
        }
    }

    // Helper methods for common validation patterns
    validateEmail(email) {
        return this.runValidator('email', email);
    }

    validatePhone(phone) {
        return this.runValidator('phone', phone);
    }

    validateRequired(value, fieldName = 'Field') {
        if (this.isEmpty(value)) {
            return `${fieldName} is required`;
        }
        return true;
    }

    validateLength(value, min, max, fieldName = 'Field') {
        if (!value) return true;
        const length = value.length;
        if (length < min) return `${fieldName} must be at least ${min} characters`;
        if (length > max) return `${fieldName} must be no more than ${max} characters`;
        return true;
    }

    // Utility methods
    addCustomValidator(name, validatorFn) {
        this.customValidators.set(name, validatorFn);
        console.log(`✅ Custom validator '${name}' added`);
    }

    removeCustomValidator(name) {
        this.customValidators.delete(name);
        console.log(`🗑️ Custom validator '${name}' removed`);
    }

    getAllValidationStates() {
        return Object.fromEntries(this.currentValidationState);
    }

    getOverallValidationSummary() {
        const states = this.getAllValidationStates();
        const summary = {
            totalQuestions: Object.keys(states).length,
            validQuestions: 0,
            invalidQuestions: 0,
            totalErrors: 0,
            totalWarnings: 0
        };

        Object.values(states).forEach(state => {
            if (state.isValid) {
                summary.validQuestions++;
            } else {
                summary.invalidQuestions++;
                summary.totalErrors += state.errors.length;
            }
            summary.totalWarnings += (state.warnings || []).length;
        });

        return summary;
    }

    // Debug helpers
    logValidationSummary() {
        const summary = this.getOverallValidationSummary();
        console.log('📊 Validation Summary:', summary);
    }

    destroy() {
        this.validationRules.clear();
        this.currentValidationState.clear();
        console.log('🔍 Validator destroyed');
    }
}

// Export for use
window.QuestionnaireValidator = QuestionnaireValidator;