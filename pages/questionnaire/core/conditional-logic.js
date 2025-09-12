// /pages/questionnaire/core/conditional-logic.js
class ConditionalLogic {
    constructor() {
        this.rules = new Map(); // moduleId -> rules
        this.globalRules = new Map(); // global rules across modules
        this.cache = new Map(); // cache for expensive rule evaluations
        this.dependencies = new Map(); // track dependencies between modules/questions
        this.evaluationStack = []; // prevent infinite recursion
    }

    registerRule(moduleId, rules) {
        if (typeof rules === 'function') {
            // Single rule function for entire module
            this.rules.set(moduleId, { '*': rules });
        } else if (typeof rules === 'object') {
            // Object with multiple rules
            this.rules.set(moduleId, rules);
        }
        
        console.log(`📋 Registered conditional rules for ${moduleId}:`, Object.keys(rules));
    }

    registerGlobalRule(ruleId, ruleFn) {
        this.globalRules.set(ruleId, ruleFn);
        console.log(`🌐 Registered global rule: ${ruleId}`);
    }

    shouldShowModule(moduleId, allResponses) {
        const cacheKey = `module:${moduleId}:${this.getResponsesHash(allResponses)}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Check for infinite recursion
        if (this.evaluationStack.includes(cacheKey)) {
            console.warn(`🔄 Circular dependency detected for module ${moduleId}`);
            return true; // Default to showing
        }

        this.evaluationStack.push(cacheKey);
        
        try {
            let shouldShow = true;

            // Check global rules first
            const globalRule = this.globalRules.get(moduleId);
            if (globalRule) {
                shouldShow = this.evaluateRule(globalRule, allResponses, null);
            }

            // Check module-specific rules
            const moduleRules = this.rules.get(moduleId);
            if (moduleRules && moduleRules['*']) {
                shouldShow = shouldShow && this.evaluateRule(moduleRules['*'], allResponses, null);
            }

            // Check customization preferences
            shouldShow = shouldShow && this.checkCustomizationPreferences(moduleId, allResponses);

            // Cache result
            this.cache.set(cacheKey, shouldShow);
            
            console.log(`📊 Module ${moduleId} visibility: ${shouldShow}`);
            return shouldShow;

        } finally {
            this.evaluationStack.pop();
        }
    }

    shouldShowQuestion(moduleId, questionIndex, allResponses) {
        const questionId = `${moduleId}:${questionIndex}`;
        const cacheKey = `question:${questionId}:${this.getResponsesHash(allResponses)}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Check for infinite recursion
        if (this.evaluationStack.includes(cacheKey)) {
            console.warn(`🔄 Circular dependency detected for question ${questionId}`);
            return true;
        }

        this.evaluationStack.push(cacheKey);
        
        try {
            let shouldShow = true;

            // First check if the module should be shown
            shouldShow = this.shouldShowModule(moduleId, allResponses);
            
            if (!shouldShow) {
                this.cache.set(cacheKey, false);
                return false;
            }

            // Check question-specific rules
            const moduleRules = this.rules.get(moduleId);
            if (moduleRules) {
                const questionRule = moduleRules[questionIndex] || moduleRules[`question_${questionIndex}`];
                if (questionRule) {
                    shouldShow = this.evaluateRule(questionRule, allResponses, { moduleId, questionIndex });
                }
            }

            // Cache result
            this.cache.set(cacheKey, shouldShow);
            
            return shouldShow;

        } finally {
            this.evaluationStack.pop();
        }
    }

    checkCustomizationPreferences(moduleId, allResponses) {
        // Map module IDs to customization sections
        const customizationMap = {
            'revenue-structure': 'revenue',
            'cogs-codb': 'cogs',
            'expenses': 'expenses',
            'assets': 'assets',
            'debt': 'debt',
            'equity-financing': 'equity'
        };

        const sectionKey = customizationMap[moduleId];
        if (!sectionKey) {
            return true; // No customization mapping, show by default
        }

        const customizationResponse = this.findResponseByType(allResponses, 'customization-preference');
        if (!customizationResponse) {
            return true; // No customization response, show by default
        }

        const preferences = customizationResponse.customizationPreferences || {};
        const preference = preferences[sectionKey];
        
        // If set to 'generic', the module will show a placeholder instead of being hidden
        // The actual question logic will handle showing generic vs custom content
        return true;
    }

    evaluateRule(rule, allResponses, context) {
        try {
            if (typeof rule === 'function') {
                return rule(allResponses, context);
            } else if (typeof rule === 'object' && rule.condition) {
                // Complex rule object
                return this.evaluateComplexRule(rule, allResponses, context);
            } else if (typeof rule === 'boolean') {
                return rule;
            }
            
            console.warn('Invalid rule type:', typeof rule);
            return true; // Default to showing
        } catch (error) {
            console.error('Error evaluating rule:', error);
            return true; // Default to showing if rule fails
        }
    }

    evaluateComplexRule(rule, allResponses, context) {
        const { condition, sourceModule, sourceQuestion, field, operator, value, logic } = rule;
        
        if (condition === 'response_equals') {
            const sourceResponse = this.getSourceResponse(allResponses, sourceModule, sourceQuestion);
            if (!sourceResponse) return false;
            
            const sourceValue = this.getNestedValue(sourceResponse, field);
            return this.compareValues(sourceValue, operator || 'equals', value);
        }
        
        if (condition === 'response_contains') {
            const sourceResponse = this.getSourceResponse(allResponses, sourceModule, sourceQuestion);
            if (!sourceResponse) return false;
            
            const sourceValue = this.getNestedValue(sourceResponse, field);
            if (Array.isArray(sourceValue)) {
                return sourceValue.includes(value);
            }
            return false;
        }
        
        if (condition === 'multiple' && logic && Array.isArray(rule.rules)) {
            // Handle multiple conditions with AND/OR logic
            const results = rule.rules.map(subRule => this.evaluateComplexRule(subRule, allResponses, context));
            
            if (logic === 'AND') {
                return results.every(r => r);
            } else if (logic === 'OR') {
                return results.some(r => r);
            }
        }
        
        return true;
    }

    getSourceResponse(allResponses, sourceModule, sourceQuestion) {
        const moduleResponses = allResponses[sourceModule];
        if (!moduleResponses) return null;
        
        if (sourceQuestion !== undefined) {
            return moduleResponses[sourceQuestion];
        }
        
        // If no specific question, return the latest response
        const questionIndices = Object.keys(moduleResponses).map(k => parseInt(k)).sort((a, b) => b - a);
        return questionIndices.length > 0 ? moduleResponses[questionIndices[0]] : null;
    }

    getNestedValue(obj, path) {
        if (!path) return obj;
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    compareValues(actual, operator, expected) {
        switch (operator) {
            case 'equals':
                return actual === expected;
            case 'not_equals':
                return actual !== expected;
            case 'greater_than':
                return Number(actual) > Number(expected);
            case 'less_than':
                return Number(actual) < Number(expected);
            case 'contains':
                if (Array.isArray(actual)) {
                    return actual.includes(expected);
                }
                return String(actual).includes(String(expected));
            case 'not_contains':
                if (Array.isArray(actual)) {
                    return !actual.includes(expected);
                }
                return !String(actual).includes(String(expected));
            case 'is_empty':
                return !actual || actual.length === 0;
            case 'is_not_empty':
                return actual && actual.length > 0;
            default:
                return actual === expected;
        }
    }

    findResponseByType(allResponses, responseType) {
        for (const [moduleId, moduleResponses] of Object.entries(allResponses)) {
            for (const [questionIndex, response] of Object.entries(moduleResponses)) {
                if (response.type === responseType) {
                    return response;
                }
            }
        }
        return null;
    }

    findResponsesByType(allResponses, responseType) {
        const results = [];
        for (const [moduleId, moduleResponses] of Object.entries(allResponses)) {
            for (const [questionIndex, response] of Object.entries(moduleResponses)) {
                if (response.type === responseType) {
                    results.push({
                        moduleId,
                        questionIndex: parseInt(questionIndex),
                        response
                    });
                }
            }
        }
        return results;
    }

    processResponse(moduleId, questionIndex, responseData, allResponses) {
        console.log(`🔄 Processing response for conditional logic: ${moduleId}[${questionIndex}]`);
        
        // Clear cache entries that might be affected by this response
        this.invalidateCache(moduleId, questionIndex);
        
        // Track dependencies
        this.updateDependencies(moduleId, questionIndex, responseData);
        
        // Emit change event for any listeners
        this.emitResponseChange(moduleId, questionIndex, responseData, allResponses);
    }

    invalidateCache(changedModuleId, changedQuestionIndex) {
        const toDelete = [];
        
        for (const [cacheKey] of this.cache) {
            // Invalidate all cache entries for now (could be optimized)
            // In a more sophisticated implementation, we'd track dependencies
            // and only invalidate affected entries
            toDelete.push(cacheKey);
        }
        
        toDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Invalidated ${toDelete.length} cache entries`);
    }

    updateDependencies(moduleId, questionIndex, responseData) {
        const dependencyKey = `${moduleId}:${questionIndex}`;
        
        // Track what this response might affect
        // This is a simplified version - in practice you'd want more sophisticated dependency tracking
        this.dependencies.set(dependencyKey, {
            timestamp: Date.now(),
            type: responseData.type,
            affectedModules: this.getAffectedModules(moduleId, responseData)
        });
    }

    getAffectedModules(sourceModuleId, responseData) {
        // Determine which modules might be affected by this response
        const affected = [];
        
        // Revenue affects procurement and channels
        if (sourceModuleId === 'revenue-structure' && responseData.revenueGeneration) {
            if (responseData.revenueGeneration.includes('products')) {
                affected.push('products-specific');
            }
        }
        
        // User info affects combined parameters
        if (sourceModuleId === 'user-info' && responseData.parameterToggle) {
            affected.push('combined-parameters');
        }
        
        // Customization affects all other modules
        if (sourceModuleId === 'customization-preference') {
            affected.push('revenue-structure', 'cogs-codb', 'expenses', 'assets', 'debt', 'equity-financing');
        }
        
        return affected;
    }

    emitResponseChange(moduleId, questionIndex, responseData, allResponses) {
        // Could emit events here for external listeners
        // For now, just log the change
        console.log(`📡 Response change processed: ${moduleId}[${questionIndex}]`);
    }

    getResponsesHash(allResponses) {
        // Create a simple hash of responses for caching
        // In production, you'd want a more robust hashing function
        const str = JSON.stringify(allResponses);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    // Helper methods for common conditional patterns
    hasUserSelectedOption(allResponses, moduleId, questionIndex, field, option) {
        const response = this.getSourceResponse(allResponses, moduleId, questionIndex);
        if (!response) return false;
        
        const value = this.getNestedValue(response, field);
        if (Array.isArray(value)) {
            return value.includes(option);
        }
        return value === option;
    }

    getUserToggleValue(allResponses, moduleId, questionIndex, field) {
        const response = this.getSourceResponse(allResponses, moduleId, questionIndex);
        if (!response) return false;
        
        return this.getNestedValue(response, field) === true;
    }

    getCustomizationPreference(allResponses, section) {
        const customizationResponse = this.findResponseByType(allResponses, 'customization-preference');
        if (!customizationResponse) return null;
        
        return customizationResponse.customizationPreferences?.[section];
    }

    // Rule builder helpers for easier rule creation
    static createSimpleRule(sourceModule, sourceQuestion, field, operator, value) {
        return {
            condition: 'response_equals',
            sourceModule,
            sourceQuestion,
            field,
            operator,
            value
        };
    }

    static createContainsRule(sourceModule, sourceQuestion, field, value) {
        return {
            condition: 'response_contains',
            sourceModule,
            sourceQuestion,
            field,
            value
        };
    }

    static createMultipleRule(logic, rules) {
        return {
            condition: 'multiple',
            logic, // 'AND' or 'OR'
            rules
        };
    }

    // Common rule factories
    static showIfProductsSelected() {
        return (allResponses) => {
            const revenueResponse = ConditionalLogic.prototype.findResponseByType.call(
                { findResponseByType: ConditionalLogic.prototype.findResponseByType }, 
                allResponses, 
                'revenue-combined'
            );
            return revenueResponse?.selectedRevenues?.includes('products') || false;
        };
    }

    static showIfToggleEnabled(sourceModule, sourceQuestion, field) {
        return (allResponses) => {
            const logic = new ConditionalLogic();
            return logic.getUserToggleValue(allResponses, sourceModule, sourceQuestion, field);
        };
    }

    static showIfCustomizationSelected(section, preference = 'custom') {
        return (allResponses) => {
            const logic = new ConditionalLogic();
            return logic.getCustomizationPreference(allResponses, section) === preference;
        };
    }

    // Debug and development helpers
    getDebugInfo() {
        return {
            rulesCount: this.rules.size,
            globalRulesCount: this.globalRules.size,
            cacheSize: this.cache.size,
            dependencies: Object.fromEntries(this.dependencies),
            evaluationStackDepth: this.evaluationStack.length
        };
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Conditional logic cache cleared');
    }

    destroy() {
        this.rules.clear();
        this.globalRules.clear();
        this.cache.clear();
        this.dependencies.clear();
        this.evaluationStack.length = 0;
    }
}

// Export for use
window.ConditionalLogic = ConditionalLogic;