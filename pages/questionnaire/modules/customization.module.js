// modules/customization.module.js

import { BaseComponent } from '../components/base-component.js';
import { Toggle } from '../components/toggle.js';

/**
 * Customization Module - Handles preference selection for model sections
 * Controls whether other modules show as "custom" (full questionnaire) or "generic" (placeholder)
 */
export class CustomizationModule {
    constructor() {
        this.id = 'customization-preference';
        this.title = 'How much customisation would you like';
        this.description = 'There will be a slight time investment to give us the necessary information to build your model, if you would like to reduce time you can opt for some parts to be generic models';
        this.required = false;
        
        // Section configurations with time estimates
        this.sections = [
            { key: 'revenue', title: 'Revenue Generation', timeMinutes: 3 },
            { key: 'cogs', title: 'COGS and CODB', timeMinutes: 3 },
            { key: 'expenses', title: 'Expenses', timeMinutes: 3 },
            { key: 'assets', title: 'Assets', timeMinutes: 3 },
            { key: 'debt', title: 'Debt', timeMinutes: 3 },
            { key: 'equity', title: 'Equity Financing', timeMinutes: 3 }
        ];
        
        this.components = {};
        this.preferences = {};
        
        // Initialize default preferences (all generic)
        this.sections.forEach(section => {
            this.preferences[section.key] = 'generic';
        });
    }

    /**
     * Render the customization preference form
     */
    render() {
        const container = document.createElement('div');
        container.className = 'customization-preference-container';
        
        // Create sections container
        const sectionsContainer = document.createElement('div');
        sectionsContainer.className = 'customization-sections';
        
        // Create each section
        this.sections.forEach(section => {
            const sectionElement = this.createSectionElement(section);
            sectionsContainer.appendChild(sectionElement);
        });
        
        container.appendChild(sectionsContainer);
        
        // Update initial time estimate
        this.updateTimeEstimate();
        
        return container;
    }

    /**
     * Create individual section element with toggle
     */
    createSectionElement(section) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'customization-section';
        
        const rowDiv = document.createElement('div');
        rowDiv.className = 'customization-row';
        
        // Text content
        const textDiv = document.createElement('div');
        textDiv.className = 'customization-text';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'customization-section-title';
        titleDiv.textContent = section.title;
        
        const subtitleDiv = document.createElement('div');
        subtitleDiv.className = 'customization-section-subtitle';
        subtitleDiv.textContent = `Estimated time to complete: ${section.timeMinutes} Minutes`;
        
        textDiv.appendChild(titleDiv);
        textDiv.appendChild(subtitleDiv);
        
        // Controls container
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'customization-controls';
        
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'customization-toggle-container';
        
        // Create toggle component
        const toggleConfig = {
            id: `${section.key}Toggle`,
            labels: ['Generic', 'Custom'],
            defaultValue: 'generic', // Default to Generic (left position, no active class)
            width: '180px'
        };
        
        const toggle = new Toggle(toggleConfig);
        this.components[section.key] = toggle;
        
        // Add change listener
        toggle.onChange = (value) => {
            this.preferences[section.key] = value;
            this.updateTimeEstimate();
            this.onPreferenceChange();
        };
        
        toggleContainer.appendChild(toggle.render());
        controlsDiv.appendChild(toggleContainer);
        
        // Assemble row
        rowDiv.appendChild(textDiv);
        rowDiv.appendChild(controlsDiv);
        sectionDiv.appendChild(rowDiv);
        
        return sectionDiv;
    }

    /**
     * Update total time estimate based on current preferences
     */
    updateTimeEstimate() {
        let totalMinutes = 3; // Base time for required sections
        
        // Add time for each custom section
        this.sections.forEach(section => {
            if (this.preferences[section.key] === 'custom') {
                totalMinutes += section.timeMinutes;
            }
        });
        
        const timeText = `${totalMinutes} minutes`;
        
        // Update time displays
        const timeElement = document.getElementById('totalEstimatedTime');
        if (timeElement) {
            timeElement.textContent = timeText;
        }
        
        const topTimeElement = document.getElementById('totalEstimatedTimeTop');
        if (topTimeElement) {
            topTimeElement.textContent = timeText;
        }
    }

    /**
     * Handle preference changes
     */
    onPreferenceChange() {
        // Trigger validation update
        if (window.questionnaireEngine) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    /**
     * Get current response data
     */
    getResponse() {
        return {
            type: 'customization-preference',
            customizationPreferences: { ...this.preferences },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Load previous response
     */
    loadResponse(response) {
        if (!response || !response.customizationPreferences) return;
        
        // Update preferences
        Object.entries(response.customizationPreferences).forEach(([key, value]) => {
            if (this.preferences.hasOwnProperty(key)) {
                this.preferences[key] = value;
                
                // Update component if it exists
                if (this.components[key]) {
                    this.components[key].setValue(value);
                }
            }
        });
        
        // Update time estimate
        this.updateTimeEstimate();
    }

    /**
     * Validate the module (always valid - preferences are optional)
     */
    validate() {
        return {
            isValid: true,
            errors: []
        };
    }

    /**
     * Check if this module should be shown based on conditional logic
     */
    shouldShow(responses) {
        // Customization module is always shown (first business logic question)
        return true;
    }

    /**
     * Get database field mappings
     */
    getDatabaseFields() {
        // Customization preferences affect other modules but don't have direct DB fields
        // The preferences are used by conditional logic to determine which modules to show
        return {};
    }

    /**
     * Show special title layout for customization questions
     */
    setupSpecialLayout() {
        const titleRowHeader = document.getElementById('titleRowHeader');
        const regularTitle = document.getElementById('questionTitle');
        const regularDescription = document.getElementById('questionDescription');
        const timeBoxTop = document.getElementById('customizationTimeBoxTop');
        const totalTimeTop = document.getElementById('totalEstimatedTimeTop');
        
        if (titleRowHeader && regularTitle && timeBoxTop && totalTimeTop) {
            titleRowHeader.style.display = 'flex';
            regularTitle.style.display = 'none';
            
            if (regularDescription) {
                regularDescription.style.display = 'none';
            }
            
            // Set initial time value
            setTimeout(() => {
                const currentTime = document.getElementById('totalEstimatedTime');
                if (currentTime) {
                    totalTimeTop.textContent = currentTime.textContent;
                }
            }, 100);
        }
    }

    /**
     * Hide special title layout
     */
    hideSpecialLayout() {
        const titleRowHeader = document.getElementById('titleRowHeader');
        const regularTitle = document.getElementById('questionTitle');
        const regularDescription = document.getElementById('questionDescription');
        
        if (titleRowHeader && regularTitle) {
            titleRowHeader.style.display = 'none';
            regularTitle.style.display = 'block';
            
            if (regularDescription) {
                regularDescription.style.display = 'block';
            }
        }
    }

    /**
     * Get preferences for use by conditional logic
     */
    getPreferences() {
        return { ...this.preferences };
    }

    /**
     * Check if a section is set to custom
     */
    isCustom(sectionKey) {
        return this.preferences[sectionKey] === 'custom';
    }

    /**
     * Check if a section is set to generic  
     */
    isGeneric(sectionKey) {
        return this.preferences[sectionKey] === 'generic';
    }

    /**
     * Cleanup when module is hidden
     */
    destroy() {
        // Clean up components
        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        
        this.components = {};
        this.hideSpecialLayout();
    }
}