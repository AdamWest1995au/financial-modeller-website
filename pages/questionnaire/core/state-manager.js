// /pages/questionnaire/core/state-manager.js
class QuestionnaireState {
    constructor(config = {}) {
        this.config = {
            saveToStorage: true,
            storageKey: 'questionnaire_state',
            compression: false,
            ...config
        };
        
        // Main state structure
        this.state = {
            version: '1.0.0',
            timestamp: Date.now(),
            startTime: Date.now(),
            currentModule: null,
            currentQuestion: 0,
            modules: {}, // moduleId: { questionIndex: responseData }
            metadata: {
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language
            }
        };
        
        this.listeners = new Map(); // For state change notifications
        this.saveQueue = []; // For batched saves
        this.saveTimer = null;
    }

    async loadFromStorage() {
        if (!this.config.saveToStorage) return;

        try {
            const stored = localStorage.getItem(this.config.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                
                // Validate stored state
                if (this.validateStoredState(parsed)) {
                    this.state = { ...this.state, ...parsed };
                    console.log('📥 State loaded from localStorage:', this.state);
                    
                    // Emit state loaded event
                    this.emit('stateLoaded', this.state);
                } else {
                    console.warn('⚠️ Invalid stored state, using fresh state');
                    await this.clearStorage();
                }
            }
        } catch (error) {
            console.error('❌ Failed to load state from storage:', error);
            await this.clearStorage();
        }
    }

    validateStoredState(state) {
        // Check for required properties and valid structure
        return state && 
               typeof state === 'object' && 
               state.version && 
               state.modules && 
               typeof state.modules === 'object';
    }

    async saveToStorage() {
        if (!this.config.saveToStorage) return;

        try {
            this.state.timestamp = Date.now();
            const serialized = JSON.stringify(this.state);
            localStorage.setItem(this.config.storageKey, serialized);
            console.log('💾 State saved to localStorage');
            
            this.emit('stateSaved', this.state);
        } catch (error) {
            console.error('❌ Failed to save state to storage:', error);
            
            // If quota exceeded, try to clear old data
            if (error.name === 'QuotaExceededError') {
                await this.handleQuotaExceeded();
            }
        }
    }

    async handleQuotaExceeded() {
        console.warn('⚠️ Storage quota exceeded, attempting cleanup...');
        
        try {
            // Keep only essential data
            const essentialState = {
                version: this.state.version,
                timestamp: this.state.timestamp,
                startTime: this.state.startTime,
                currentModule: this.state.currentModule,
                currentQuestion: this.state.currentQuestion,
                modules: this.state.modules,
                metadata: {
                    userAgent: this.state.metadata.userAgent
                }
            };
            
            const serialized = JSON.stringify(essentialState);
            localStorage.setItem(this.config.storageKey, serialized);
            console.log('✅ Storage cleaned up successfully');
        } catch (error) {
            console.error('❌ Failed to cleanup storage:', error);
            await this.clearStorage();
        }
    }

    async clearStorage() {
        try {
            localStorage.removeItem(this.config.storageKey);
            console.log('🗑️ Storage cleared');
            
            this.emit('stateCleared');
        } catch (error) {
            console.error('❌ Failed to clear storage:', error);
        }
    }

    saveResponse(moduleId, questionIndex, responseData) {
        // Initialize module if it doesn't exist
        if (!this.state.modules[moduleId]) {
            this.state.modules[moduleId] = {};
        }

        // Add timestamp to response
        const enrichedResponse = {
            ...responseData,
            timestamp: Date.now(),
            questionIndex
        };

        // Save response
        this.state.modules[moduleId][questionIndex] = enrichedResponse;
        
        console.log(`💾 Response saved: ${moduleId}[${questionIndex}]`, enrichedResponse);
        
        // Emit change event
        this.emit('responseChanged', {
            moduleId,
            questionIndex,
            responseData: enrichedResponse
        });

        // Queue save to storage
        this.queueSave();
    }

    getResponse(moduleId, questionIndex) {
        return this.state.modules[moduleId]?.[questionIndex] || null;
    }

    getModuleResponses(moduleId) {
        return this.state.modules[moduleId] || {};
    }

    getAllResponses() {
        return { ...this.state.modules };
    }

    getResponsesByType(moduleId, dataPath) {
        const moduleResponses = this.getModuleResponses(moduleId);
        const responses = [];
        
        for (const [questionIndex, response] of Object.entries(moduleResponses)) {
            if (dataPath) {
                const value = this.getNestedValue(response, dataPath);
                if (value !== undefined) {
                    responses.push(value);
                }
            } else {
                responses.push(response);
            }
        }
        
        return responses;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    hasResponse(moduleId, questionIndex = null) {
        if (questionIndex !== null) {
            return !!this.state.modules[moduleId]?.[questionIndex];
        }
        return !!this.state.modules[moduleId] && Object.keys(this.state.modules[moduleId]).length > 0;
    }

    removeResponse(moduleId, questionIndex) {
        if (this.state.modules[moduleId]?.[questionIndex]) {
            delete this.state.modules[moduleId][questionIndex];
            
            // Remove module if empty
            if (Object.keys(this.state.modules[moduleId]).length === 0) {
                delete this.state.modules[moduleId];
            }
            
            console.log(`🗑️ Response removed: ${moduleId}[${questionIndex}]`);
            
            this.emit('responseRemoved', { moduleId, questionIndex });
            this.queueSave();
        }
    }

    removeModule(moduleId) {
        if (this.state.modules[moduleId]) {
            delete this.state.modules[moduleId];
            
            console.log(`🗑️ Module removed: ${moduleId}`);
            
            this.emit('moduleRemoved', { moduleId });
            this.queueSave();
        }
    }

    updateCurrentPosition(moduleId, questionIndex) {
        this.state.currentModule = moduleId;
        this.state.currentQuestion = questionIndex;
        
        this.emit('positionChanged', { moduleId, questionIndex });
        this.queueSave();
    }

    getCurrentPosition() {
        return {
            moduleId: this.state.currentModule,
            questionIndex: this.state.currentQuestion
        };
    }

    // Event system for state changes
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for ${event}:`, error);
                }
            });
        }
    }

    // Batched saving
    queueSave() {
        if (!this.config.saveToStorage) return;

        // Clear existing timer
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }

        // Queue new save
        this.saveTimer = setTimeout(() => {
            this.saveToStorage();
        }, 500); // 500ms debounce
    }

    // Data validation and transformation
    validateResponse(moduleId, questionIndex, responseData) {
        // Basic validation
        if (!moduleId || questionIndex < 0 || !responseData) {
            return false;
        }

        // Type-specific validation can be added here
        return true;
    }

    // Analytics and insights
    getCompletionStats() {
        const stats = {
            totalModules: Object.keys(this.state.modules).length,
            totalQuestions: 0,
            timeSpent: Date.now() - this.state.startTime,
            moduleBreakdown: {}
        };

        for (const [moduleId, moduleData] of Object.entries(this.state.modules)) {
            const questionCount = Object.keys(moduleData).length;
            stats.totalQuestions += questionCount;
            stats.moduleBreakdown[moduleId] = {
                questions: questionCount,
                lastActivity: Math.max(...Object.values(moduleData).map(r => r.timestamp || 0))
            };
        }

        return stats;
    }

    // Export/Import functionality
    exportState() {
        return {
            ...this.state,
            exportedAt: Date.now()
        };
    }

    importState(importedState) {
        if (this.validateStoredState(importedState)) {
            this.state = { ...this.state, ...importedState };
            this.emit('stateImported', this.state);
            this.queueSave();
            return true;
        }
        return false;
    }

    // Debugging and development helpers
    getStateSnapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }

    logState() {
        console.log('📊 Current State:', this.getStateSnapshot());
        console.log('📊 Completion Stats:', this.getCompletionStats());
    }

    // Cleanup
    destroy() {
        // Clear timers
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }

        // Clear listeners
        this.listeners.clear();

        // Final save
        if (this.config.saveToStorage) {
            this.saveToStorage();
        }
    }
}

// Utility functions for working with state
class StateUtils {
    static findResponseByValue(state, searchValue, searchPath = null) {
        const results = [];
        
        for (const [moduleId, moduleData] of Object.entries(state.modules)) {
            for (const [questionIndex, response] of Object.entries(moduleData)) {
                const value = searchPath ? 
                    StateUtils.getNestedValue(response, searchPath) : 
                    response;
                
                if (StateUtils.matchesSearch(value, searchValue)) {
                    results.push({
                        moduleId,
                        questionIndex: parseInt(questionIndex),
                        response,
                        matchedValue: value
                    });
                }
            }
        }
        
        return results;
    }

    static getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    static matchesSearch(value, searchValue) {
        if (Array.isArray(value)) {
            return value.includes(searchValue);
        }
        return value === searchValue;
    }

    static calculateResponseTime(state, moduleId, questionIndex) {
        const response = state.modules[moduleId]?.[questionIndex];
        if (!response?.timestamp) return null;

        // Try to find previous response timestamp
        let previousTimestamp = state.startTime;
        
        // Look for previous question in same module
        for (let i = questionIndex - 1; i >= 0; i--) {
            const prevResponse = state.modules[moduleId]?.[i];
            if (prevResponse?.timestamp) {
                previousTimestamp = prevResponse.timestamp;
                break;
            }
        }

        return response.timestamp - previousTimestamp;
    }
}

// Export classes
window.QuestionnaireState = QuestionnaireState;
window.StateUtils = StateUtils;