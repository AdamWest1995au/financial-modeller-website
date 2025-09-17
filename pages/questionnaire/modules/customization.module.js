// /pages/questionnaire/modules/customization.module.js
export class CustomizationModule {
    constructor() {
        this.id = 'customization';
        this.title = 'How much customisation would you like';
        this.description = 'There will be a slight time investment to give us the necessary information to build your model, if you would like to reduce time you can opt for some parts to be generic models';
        this.required = true;
        this.components = {};
        
        // Define all customizable sections
        this.sections = [
            {
                id: 'revenue',
                title: 'Revenue Generation',
                timeEstimate: '3 Minutes',
                key: 'revenueCustomization'
            },
            {
                id: 'cogs',
                title: 'COGS and CODB',
                timeEstimate: '3 Minutes', 
                key: 'cogsCustomization'
            },
            {
                id: 'expenses',
                title: 'Expenses',
                timeEstimate: '3 Minutes',
                key: 'expensesCustomization'
            },
            {
                id: 'assets',
                title: 'Assets',
                timeEstimate: '3 Minutes',
                key: 'assetsCustomization'
            },
            {
                id: 'debt',
                title: 'Debt',
                timeEstimate: '3 Minutes',
                key: 'debtCustomization'
            },
            {
                id: 'equity',
                title: 'Equity Financing',
                timeEstimate: '3 Minutes',
                key: 'equityCustomization'
            }
        ];

        // Initialize responses - default to Generic (false = Generic, true = Custom)
        this.responses = {};
        this.sections.forEach(section => {
            this.responses[section.key] = false; // Default to Generic
        });
    }

    render() {
        const container = document.createElement('div');
        container.className = 'customization-preference-container';

        // Calculate total estimated time
        const totalTime = this.calculateTotalTime();
        
        // Create time box
        const timeBox = this.createTimeBox(totalTime);
        container.appendChild(timeBox);

        // Create sections container
        const sectionsContainer = document.createElement('div');
        sectionsContainer.className = 'customization-sections';

        // Create each customization section
        this.sections.forEach(section => {
            const sectionElement = this.createCustomizationSection(section);
            sectionsContainer.appendChild(sectionElement);
        });

        container.appendChild(sectionsContainer);
        return container;
    }

    createTimeBox(totalTime) {
        const timeBox = document.createElement('div');
        timeBox.className = 'customization-time-box';
        timeBox.innerHTML = `
            <div class="customization-time-label">Estimated time to complete</div>
            <div class="customization-time-value" id="totalTimeEstimate">${totalTime}</div>
        `;
        return timeBox;
    }

    createCustomizationSection(section) {
        const sectionElement = document.createElement('div');
        sectionElement.className = 'customization-section';
        sectionElement.dataset.sectionId = section.id;

        const row = document.createElement('div');
        row.className = 'customization-row';

        // Text content
        const textDiv = document.createElement('div');
        textDiv.className = 'customization-text';
        
        const title = document.createElement('div');
        title.className = 'customization-section-title';
        title.textContent = section.title;

        const subtitle = document.createElement('div');
        subtitle.className = 'customization-section-subtitle';
        subtitle.textContent = `Estimated time to complete ${section.timeEstimate}`;

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        // Controls
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'customization-controls';

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'customization-toggle-container';

        // Create custom toggle element (not using the Toggle component due to specific styling needs)
        const toggle = document.createElement('div');
        toggle.className = 'customization-toggle';
        toggle.dataset.sectionKey = section.key;
        
        // Add active class if Custom is selected (true)
        if (this.responses[section.key]) {
            toggle.classList.add('active');
        }

        const labelsContainer = document.createElement('div');
        labelsContainer.className = 'customization-toggle-labels';

        const genericLabel = document.createElement('div');
        genericLabel.className = 'customization-toggle-label';
        genericLabel.textContent = 'Generic';

        const customLabel = document.createElement('div');
        customLabel.className = 'customization-toggle-label';
        customLabel.textContent = 'Custom';

        labelsContainer.appendChild(genericLabel);
        labelsContainer.appendChild(customLabel);
        toggle.appendChild(labelsContainer);

        // Add click handler
        toggle.addEventListener('click', () => {
            this.handleToggleClick(section.key, toggle);
        });

        toggleContainer.appendChild(toggle);
        controlsDiv.appendChild(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(controlsDiv);
        sectionElement.appendChild(row);

        // Store reference to toggle element
        this.components[section.key] = toggle;

        return sectionElement;
    }

    handleToggleClick(sectionKey, toggleElement) {
    // Toggle the state: false = Generic, true = Custom
    this.responses[sectionKey] = !this.responses[sectionKey];
    
    // Update visual state
    if (this.responses[sectionKey]) {
        toggleElement.classList.add('active'); // Custom selected
    } else {
        toggleElement.classList.remove('active'); // Generic selected
    }

    // Update total time estimate
    this.updateTimeEstimate();
    
    // IMPORTANT: Save the response to state manager
    if (window.questionnaireEngine && window.questionnaireEngine.stateManager) {
        const response = this.getResponse();
        window.questionnaireEngine.stateManager.saveResponse(this.id, 0, response);
    }
    
    // Trigger validation
    this.onResponseChange();

    // Store the customization preferences globally for other modules to access
    this.updateGlobalCustomizationState();
    
    console.log('Customization preferences updated:', this.responses);
}

    updateTimeEstimate() {
        const totalTime = this.calculateTotalTime();
        const timeElement = document.getElementById('totalTimeEstimate');
        if (timeElement) {
            timeElement.textContent = totalTime;
        }
    }

    calculateTotalTime() {
        let totalMinutes = 0;
        
        this.sections.forEach(section => {
            if (this.responses[section.key]) { // If Custom is selected
                totalMinutes += 3; // 3 minutes per custom section
            }
        });

        if (totalMinutes === 0) {
            return '< 1 Minute'; // All generic
        } else if (totalMinutes < 60) {
            return `${totalMinutes} Minutes`;
        } else {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
        }
    }

    updateGlobalCustomizationState() {
        // Store customization preferences in a global state that other modules can access
        if (typeof window !== 'undefined') {
            window.customizationPreferences = { ...this.responses };
            
            // Emit a custom event for any modules that need to listen
            const event = new CustomEvent('customizationChanged', {
                detail: { preferences: this.responses }
            });
            document.dispatchEvent(event);
        }
    }

    onResponseChange() {
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    getResponse() {
    // Convert internal responses to the format expected by other modules
    const customizationPreferences = {
        revenue: this.responses.revenueCustomization ? 'custom' : 'generic',
        cogs: this.responses.cogsCustomization ? 'custom' : 'generic', 
        expenses: this.responses.expensesCustomization ? 'custom' : 'generic',
        assets: this.responses.assetsCustomization ? 'custom' : 'generic',
        debt: this.responses.debtCustomization ? 'custom' : 'generic',
        equity: this.responses.equityCustomization ? 'custom' : 'generic'
    };

    return {
        type: 'customization-preference',
        data: { ...this.responses },
        customizationPreferences: customizationPreferences,
        customizationSummary: this.getCustomizationSummary(),
        timestamp: new Date().toISOString()
    };
}

    getCustomizationSummary() {
        const summary = {
            totalCustomSections: 0,
            totalGenericSections: 0,
            customSections: [],
            genericSections: []
        };

        this.sections.forEach(section => {
            if (this.responses[section.key]) {
                summary.totalCustomSections++;
                summary.customSections.push(section.title);
            } else {
                summary.totalGenericSections++;
                summary.genericSections.push(section.title);
            }
        });

        return summary;
    }

    loadResponse(response) {
        if (!response || !response.data) return;

        // Load saved responses
        this.responses = { ...this.responses, ...response.data };

        // Update UI after a small delay to ensure elements are rendered
        setTimeout(() => {
            this.sections.forEach(section => {
                const toggleElement = this.components[section.key];
                if (toggleElement) {
                    if (this.responses[section.key]) {
                        toggleElement.classList.add('active'); // Custom selected
                    } else {
                        toggleElement.classList.remove('active'); // Generic selected
                    }
                }
            });
            
            this.updateTimeEstimate();
            this.updateGlobalCustomizationState();
        }, 100);
    }

    validate() {
        // Always valid - user can choose any combination of Generic/Custom
        return {
            isValid: true,
            errors: []
        };
    }

    shouldShow(responses) {
        return true; // Always show customization module
    }

    getDatabaseFields() {
        return {
            customization_revenue: this.responses.revenueCustomization,
            customization_cogs: this.responses.cogsCustomization,
            customization_expenses: this.responses.expensesCustomization,
            customization_assets: this.responses.assetsCustomization,
            customization_debt: this.responses.debtCustomization,
            customization_equity: this.responses.equityCustomization,
            customization_summary: JSON.stringify(this.getCustomizationSummary())
        };
    }

    destroy() {
        Object.values(this.components).forEach(component => {
            if (component && component.remove) {
                component.remove();
            }
        });
        this.components = {};
    }

    // Helper method to check if a specific section is set to Custom
    isSectionCustom(sectionKey) {
        return this.responses[sectionKey] === true;
    }

    // Helper method to check if a specific section is set to Generic  
    isSectionGeneric(sectionKey) {
        return this.responses[sectionKey] === false;
    }
}

export default CustomizationModule;

if (typeof window !== 'undefined') {
    window.CustomizationModule = CustomizationModule;
}