// /pages/questionnaire/modules/assets.module.js - WITH CUSTOMIZATION CHANGE LISTENER
import { BaseComponent } from '../components/base-component.js';
import { MultiSelect } from '../components/multi-select.js';
import { Toggle } from '../components/toggle.js';
import { GenericPlaceholder } from '../components/generic-placeholder.js';

export class AssetsModule {
    constructor() {
        this.id = 'assets';
        this.title = 'Assets';
        this.description = 'Help us understand the types of assets your business owns and how you would like to model them.';
        this.required = false;
        
        this.components = {};
        this.currentContainer = null; // Store reference to container for re-rendering
        this.responses = {
            selectedAssets: [],
            multipleDepreciationMethods: 'no'
        };

        // Asset options - KEEPING YOUR EXISTING OPTIONS
        this.assetOptions = [
            { value: "ppe", text: "Property, Plant & Equipment" },
            { value: "land", text: "Land" },
            { value: "investment_properties", text: "Investment Properties" }
        ];

        // Listen for customization changes
        this.setupCustomizationListener();
    }

    setupCustomizationListener() {
    // Store the bound function so we can remove it later
    this.customizationChangeHandler = (event) => {
        console.log('Assets module received customization change:', event.detail);
        if (this.currentContainer) {
            this.reRender();
        }
    };
    
    // Listen for customization changes and re-render
    document.addEventListener('customizationChanged', this.customizationChangeHandler);
}

    reRender() {
        if (!this.currentContainer) return;
        
        // Clear current content
        this.currentContainer.innerHTML = '';
        
        // Re-render with new customization settings
        const newContent = this.render();
        this.currentContainer.appendChild(newContent);
    }

    render() {
        // Store container reference for re-rendering
        const container = document.createElement('div');
        this.currentContainer = container;
        
        // Check if this section should be Generic or Custom
        const isGeneric = this.isGenericModeSelected();
        
        if (isGeneric) {
            const genericContent = this.renderGenericMode();
            container.appendChild(genericContent);
        } else {
            const customContent = this.renderCustomMode();
            container.appendChild(customContent);
        }
        
        return container;
    }

    isGenericModeSelected() {
        // Check customization preference using the same method as other modules
        const responses = window.questionnaireEngine?.stateManager?.getAllResponses() || {};
        const customizationResponse = responses['customization-preference'];
        const isGeneric = !customizationResponse?.customizationPreferences?.assets || 
                         customizationResponse.customizationPreferences.assets === 'generic';
        
        return isGeneric;
    }

    renderGenericMode() {
        const container = document.createElement('div');
        container.className = 'placeholder-container';
        
        const content = document.createElement('div');
        content.className = 'placeholder-content';
        content.innerHTML = `
            <div class="animated-graphic">
                <svg viewBox="0 0 120 80">
                    <defs>
                        <radialGradient id="circleGradientAssets" cx="50%" cy="50%">
                            <stop offset="0%" style="stop-color:#c084fc;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                        </radialGradient>
                    </defs>
                    <g class="circle-group-1">
                        <circle cx="20" cy="40" r="4" class="circle" fill="url(#circleGradientAssets)" />
                    </g>
                    <g class="circle-group-2">
                        <circle cx="60" cy="40" r="4" class="circle" fill="url(#circleGradientAssets)" />
                    </g>
                    <g class="circle-group-3">
                        <circle cx="100" cy="40" r="4" class="circle" fill="url(#circleGradientAssets)" />
                    </g>
                </svg>
            </div>
            <h4 class="placeholder-title">GENERIC MODELLING APPROACH SELECTED</h4>
            <p class="placeholder-description">
                You've chosen to use our generic model for this section. 
                This will save you time during setup while still providing comprehensive financial projections.
            </p>
            <p class="placeholder-description" style="margin-top: 10px;">
                You can customise this section at a later date if needed.
                You can continue to the next section for now.
            </p>
        `;
        
        container.appendChild(content);
        return container;
    }

    renderCustomMode() {
        const container = document.createElement('div');
        container.className = 'assets-form';

        // Asset types section
        const assetTypesSection = this.createAssetTypesSection();
        container.appendChild(assetTypesSection);

        // Conditional depreciation section (hidden by default)
        const depreciationSection = this.createDepreciationSection();
        container.appendChild(depreciationSection);

        return container;
    }

    createAssetTypesSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Asset types';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'What type of assets do you own?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        // Asset types dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'parameter-toggle-input';

        const assetTypesComponent = new MultiSelect({
            id: 'assetTypesInput',
            placeholder: 'Search or select asset types...',
            options: this.assetOptions,
            allowCustom: true,
            required: false,
            onChange: (selectedValues) => {
                this.responses.selectedAssets = selectedValues;
                this.updateConditionalSections(selectedValues);
                this.onResponseChange();
            }
        });

        this.components.assetTypes = assetTypesComponent;
        assetTypesComponent.render(dropdownContainer);

        row.appendChild(textDiv);
        row.appendChild(dropdownContainer);
        section.appendChild(row);

        return section;
    }

    createDepreciationSection() {
        const section = document.createElement('div');
        section.className = 'conditional-section';
        section.id = 'depreciationSection';
        section.style.display = 'none';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Depreciation methods';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Would you like to model depreciation using multiple methods?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        // Toggle container
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const depreciationToggle = new Toggle({
            id: 'depreciationToggle',
            labels: ['No', 'Yes'],
            defaultValue: 'no',
            width: '300px',
            onChange: (value) => {
                this.responses.multipleDepreciationMethods = value;
                this.onResponseChange();
            }
        });

        this.components.depreciation = depreciationToggle;
        depreciationToggle.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    updateConditionalSections(selectedAssets) {
        const depreciationSection = document.getElementById('depreciationSection');
        
        if (depreciationSection) {
            // Show depreciation section only if "Property, Plant & Equipment" is selected
            const showDepreciation = selectedAssets.includes('ppe') || 
                                   selectedAssets.some(asset => 
                                       asset.toLowerCase().includes('property') ||
                                       asset.toLowerCase().includes('plant') ||
                                       asset.toLowerCase().includes('equipment')
                                   );
            
            depreciationSection.style.display = showDepreciation ? 'block' : 'none';
            
            // Reset depreciation response if not showing
            if (!showDepreciation) {
                this.responses.multipleDepreciationMethods = 'no';
                if (this.components.depreciation) {
                    this.components.depreciation.setValue('no');
                }
            }
        }
    }

    onResponseChange() {
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    getResponse() {
        return {
            type: 'assets-combined',
            selectedAssets: [...this.responses.selectedAssets],
            multipleDepreciationMethods: this.responses.multipleDepreciationMethods,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response) return;

        // Load response data
        this.responses = {
            selectedAssets: response.selectedAssets || [],
            multipleDepreciationMethods: response.multipleDepreciationMethods || 'no'
        };

        // Only update components in custom mode
        if (!this.isGenericModeSelected()) {
            // Update components with loaded data
            setTimeout(() => {
                if (this.components.assetTypes) {
                    this.components.assetTypes.setValue(this.responses.selectedAssets);
                    this.updateConditionalSections(this.responses.selectedAssets);
                }

                if (this.components.depreciation) {
                    this.components.depreciation.setValue(this.responses.multipleDepreciationMethods);
                }
            }, 100);
        }
    }

    validate() {
        // Always return valid - users can skip this section entirely
        return {
            isValid: true,
            errors: []
        };
    }

    shouldShow(responses) {
        // Always show Assets module - it will handle showing generic vs custom content internally
        return true;
    }

    getDatabaseFields() {
        const isGeneric = this.isGenericModeSelected();
        
        return {
            asset_types_selected: this.responses.selectedAssets.length > 0 ? this.responses.selectedAssets : null,
            asset_types_freetext: null, // Custom assets are included in the selected array
            multiple_depreciation_methods: this.responses.multipleDepreciationMethods,
            is_generic_assets: isGeneric // Track if generic mode was used
        };
    }

    destroy() {
    // Clean up event listeners
    if (this.customizationChangeHandler) {
        document.removeEventListener('customizationChanged', this.customizationChangeHandler);
    }
    
    Object.values(this.components).forEach(component => {
        if (component.destroy) {
            component.destroy();
        }
    });
    this.components = {};
    this.currentContainer = null;
}
}

export default AssetsModule;

if (typeof window !== 'undefined') {
    window.AssetsModule = AssetsModule;
}