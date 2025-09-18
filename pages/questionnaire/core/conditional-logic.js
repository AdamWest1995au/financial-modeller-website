// /pages/questionnaire/core/conditional-logic.js - COMPLETE VERSION
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
        // Map module IDs to customization sections - INCLUDES WORKING CAPITAL
        const customizationMap = {
            'revenue-structure': 'revenue',
            'cogs-codb': 'cogs',
            'expenses': 'expenses',
            'assets': 'assets',
            'working-capital': 'workingCapital',
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
                if (response && response.type === responseType) {
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
                if (response && response.type === responseType) {
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
                affected.push('working-capital'); // Working capital affected by products selection
            }
        }
        
        // User info affects combined parameters
        if (sourceModuleId === 'user-info' && responseData.parameterToggle) {
            affected.push('combined-parameters');
        }
        
        // Customization affects all other modules
        if (sourceModuleId === 'customization-preference') {
            affected.push('revenue-structure', 'cogs-codb', 'expenses', 'assets', 'working-capital', 'debt', 'equity-financing');
        }

        // Assets module dependencies
        if (sourceModuleId === 'assets' && responseData.selectedAssets) {
            // Assets might affect depreciation calculations in other modules
            affected.push('expenses'); // Depreciation expenses
            
            // If PPE is selected, might affect related modules
            if (responseData.selectedAssets.includes('ppe') || 
                responseData.selectedAssets.some(asset => 
                    asset.toLowerCase().includes('property') ||
                    asset.toLowerCase().includes('plant') ||
                    asset.toLowerCase().includes('equipment')
                )) {
                affected.push('cogs-codb'); // Could affect COGS if manufacturing equipment
            }
        }
        
        // Working Capital module dependencies - NEW
        if (sourceModuleId === 'working-capital') {
            // Working capital affects cash flow calculations
            affected.push('cash-flow');
            
            // If inventory methods are enabled, might affect COGS calculations
            if (responseData.multipleInventoryMethods === 'yes') {
                affected.push('cogs-codb');
            }
        }
        
        // Revenue module affects Working Capital - NEW
        if (sourceModuleId === 'revenue-structure' && responseData.selectedRevenues) {
            if (responseData.selectedRevenues.includes('products')) {
                affected.push('working-capital'); // Show inventory-related questions
            }
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

    // Assets-specific rule factories
    static showIfAssetsSelected() {
        return (allResponses) => {
            const assetsResponse = ConditionalLogic.prototype.findResponseByType.call(
                { findResponseByType: ConditionalLogic.prototype.findResponseByType }, 
                allResponses, 
                'assets-combined'
            );
            return assetsResponse?.selectedAssets?.length > 0 || false;
        };
    }

    static showIfPPESelected() {
        return (allResponses) => {
            const assetsResponse = ConditionalLogic.prototype.findResponseByType.call(
                { findResponseByType: ConditionalLogic.prototype.findResponseByType }, 
                allResponses, 
                'assets-combined'
            );
            
            if (!assetsResponse?.selectedAssets) return false;
            
            return assetsResponse.selectedAssets.includes('ppe') || 
                   assetsResponse.selectedAssets.some(asset => 
                       asset.toLowerCase().includes('property') ||
                       asset.toLowerCase().includes('plant') ||
                       asset.toLowerCase().includes('equipment')
                   );
        };
    }

    static showIfInvestmentPropertiesSelected() {
        return (allResponses) => {
            const assetsResponse = ConditionalLogic.prototype.findResponseByType.call(
                { findResponseByType: ConditionalLogic.prototype.findResponseByType }, 
                allResponses, 
                'assets-combined'
            );
            
            if (!assetsResponse?.selectedAssets) return false;
            
            return assetsResponse.selectedAssets.includes('investment_properties') || 
                   assetsResponse.selectedAssets.some(asset => 
                       asset.toLowerCase().includes('investment') &&
                       asset.toLowerCase().includes('properties')
                   );
        };
    }

    static showIfLandSelected() {
        return (allResponses) => {
            const assetsResponse = ConditionalLogic.prototype.findResponseByType.call(
                { findResponseByType: ConditionalLogic.prototype.findResponseByType }, 
                allResponses, 
                'assets-combined'
            );
            
            if (!assetsResponse?.selectedAssets) return false;
            
            return assetsResponse.selectedAssets.includes('land') || 
                   assetsResponse.selectedAssets.some(asset => 
                       asset.toLowerCase().includes('land')
                   );
        };
    }

    static showIfMultipleDepreciationMethodsEnabled() {
        return (allResponses) => {
            const assetsResponse = ConditionalLogic.prototype.findResponseByType.call(
                { findResponseByType: ConditionalLogic.prototype.findResponseByType }, 
                allResponses, 
                'assets-combined'
            );
            
            return assetsResponse?.multipleDepreciationMethods === 'yes' || false;
        };
    }

    // Helper methods for Revenue module
    hasUserSelectedRevenueType(allResponses, revenueType) {
        const revenueResponse = this.findResponseByType(allResponses, 'revenue-structure') ||
                              this.findResponseByType(allResponses, 'revenue-combined');
        if (!revenueResponse) return false;
        
        const selectedRevenues = revenueResponse.selectedRevenues || revenueResponse.revenueGeneration || [];
        return selectedRevenues.includes(revenueType);
    }

    getSelectedRevenueTypes(allResponses) {
        const revenueResponse = this.findResponseByType(allResponses, 'revenue-structure') ||
                              this.findResponseByType(allResponses, 'revenue-combined');
        return revenueResponse?.selectedRevenues || revenueResponse?.revenueGeneration || [];
    }

    isRevenueStaffSelected(allResponses) {
        const revenueResponse = this.findResponseByType(allResponses, 'revenue-structure') ||
                              this.findResponseByType(allResponses, 'revenue-combined');
        return revenueResponse?.revenueStaff === 'yes';
    }

    // Helper methods for Assets module
    hasUserSelectedAssetType(allResponses, assetType) {
        const assetsResponse = this.findResponseByType(allResponses, 'assets-combined');
        if (!assetsResponse?.selectedAssets) return false;
        
        return assetsResponse.selectedAssets.includes(assetType) ||
               assetsResponse.selectedAssets.some(asset => 
                   asset.toLowerCase().includes(assetType.toLowerCase())
               );
    }

    isMultipleDepreciationEnabled(allResponses) {
        const assetsResponse = this.findResponseByType(allResponses, 'assets-combined');
        return assetsResponse?.multipleDepreciationMethods === 'yes';
    }

    getSelectedAssetTypes(allResponses) {
        const assetsResponse = this.findResponseByType(allResponses, 'assets-combined');
        return assetsResponse?.selectedAssets || [];
    }

    // Helper methods for Working Capital module - NEW
    doesUserSellProducts(allResponses) {
        const revenueResponse = this.findResponseByType(allResponses, 'revenue-structure') ||
                              this.findResponseByType(allResponses, 'revenue');
        
        if (!revenueResponse) return false;
        
        // Check for products in selected revenues
        const selectedRevenues = revenueResponse.selectedRevenues || revenueResponse.revenueGeneration || [];
        return selectedRevenues.includes('products');
    }

    getWorkingCapitalPreferences(allResponses) {
        const workingCapitalResponse = this.findResponseByType(allResponses, 'working-capital');
        if (!workingCapitalResponse) return {};
        
        return {
            multipleInventoryMethods: workingCapitalResponse.multipleInventoryMethods === 'yes',
            inventoryDaysOutstanding: workingCapitalResponse.inventoryDaysOutstanding === 'yes',
            prepaidExpensesDays: workingCapitalResponse.prepaidExpensesDays === 'yes'
        };
    }

    isWorkingCapitalCustomModeSelected(allResponses) {
        const customizationResponse = this.findResponseByType(allResponses, 'customization-preference');
        if (!customizationResponse?.customizationPreferences) return false;
        
        return customizationResponse.customizationPreferences.workingCapital === 'custom';
    }

    // Helper methods for User Info module
    getUserPreferences(allResponses) {
        const userResponse = this.findResponseByType(allResponses, 'user-info');
        if (!userResponse) return {};
        
        return {
            parameterToggle: userResponse.parameterToggle,
            userEmail: userResponse.userEmail,
            userName: userResponse.userName
        };
    }

    isParameterToggleEnabled(allResponses) {
        const userResponse = this.findResponseByType(allResponses, 'user-info');
        return userResponse?.parameterToggle === 'yes';
    }

    // Helper methods for Customization module
    getCustomizationPreferences(allResponses) {
        const customizationResponse = this.findResponseByType(allResponses, 'customization-preference');
        return customizationResponse?.customizationPreferences || {};
    }

    isCustomizationSectionCustom(allResponses, sectionKey) {
        const preferences = this.getCustomizationPreferences(allResponses);
        return preferences[sectionKey] === 'custom';
    }

    isCustomizationSectionGeneric(allResponses, sectionKey) {
        const preferences = this.getCustomizationPreferences(allResponses);
        return preferences[sectionKey] === 'generic';
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