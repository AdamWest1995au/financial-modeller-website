// /pages/questionnaire/modules/assets.module.js - FIXED VERSION
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

        // Asset options
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
        const newContent = this.renderContent();
        this.currentContainer.appendChild(newContent);
    }

    render() {
        // Store container reference for re-rendering
        const container = document.createElement('div');
        this.currentContainer = container;
        
        // Render the actual content
        const content = this.renderContent();
        container.appendChild(content);
        
        return container;
    }

    renderContent() {
        console.log('=== ASSETS MODULE DEBUG ===');
        
        // Try multiple ways to get customization data (same as revenue module)
        let isGeneric = true; // Default to generic
        
        // Method 1: Check state manager
        const responses = window.questionnaireEngine?.stateManager?.getAllResponses() || {};
        console.log('State manager responses:', responses);
        
        const customizationResponse1 = responses['customization'];
        const customizationResponse2 = responses['customization-preference'];
        
        console.log('From state - customization:', customizationResponse1);
        console.log('From state - customization-preference:', customizationResponse2);
        
        // Method 2: Check global variables
        console.log('Global customizationPreferences:', window.customizationPreferences);
        console.log('Global customizationPreferencesFormatted:', window.customizationPreferencesFormatted);
        
        // Determine if generic or custom - checking multiple sources
        if (customizationResponse1?.customizationPreferences?.assets) {
            isGeneric = customizationResponse1.customizationPreferences.assets === 'generic';
            console.log('Using customizationResponse1, isGeneric:', isGeneric);
        } else if (customizationResponse2?.customizationPreferences?.assets) {
            isGeneric = customizationResponse2.customizationPreferences.assets === 'generic';
            console.log('Using customizationResponse2, isGeneric:', isGeneric);
        } else if (window.customizationPreferencesFormatted?.assets) {
            isGeneric = window.customizationPreferencesFormatted.assets === 'generic';
            console.log('Using global formatted, isGeneric:', isGeneric);
        } else if (window.customizationPreferences?.assetsCustomization !== undefined) {
            isGeneric = !window.customizationPreferences.assetsCustomization;
            console.log('Using global raw, isGeneric:', isGeneric);
        }
        
        console.log('Final isGeneric decision:', isGeneric);
        console.log('=== END ASSETS MODULE DEBUG ===');

        if (isGeneric) {
            console.log('SHOWING GENERIC PLACEHOLDER');
            return this.createGenericPlaceholder();
        } else {
            console.log('SHOWING CUSTOM CONTENT');
            return this.createCustomContent();
        }
    }

    createGenericPlaceholder() {
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
        `;

        container.appendChild(content);
        return container;
    }

    createCustomContent() {
        const container = document.createElement('div');
        container.className = 'assets-custom-content';
        
        // Create asset types section
        const assetTypesSection = this.createAssetTypesSection();
        container.appendChild(assetTypesSection);
        
        // Create depreciation section (initially hidden)
        const depreciationSection = this.createDepreciationSection();
        container.appendChild(depreciationSection);
        
        return container;
    }

    createAssetTypesSection() {
        const section = document.createElement('div');
        section.className = 'assets-section';

        const row = document.createElement('div');
        row.className = 'assets-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'assets-text';
        textDiv.style.flex = '1';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Asset Types';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Select the types of assets your business owns. This helps us model depreciation and asset-related expenses accurately.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'assets-dropdown-container';
        dropdownContainer.style.flex = '0 0 375px';

        const assetTypesComponent = new MultiSelect({
            id: 'assetTypes',
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
        section.className = 'depreciation-section';
        section.id = 'depreciationSection';
        section.style.display = 'none';

        const row = document.createElement('div');
        row.className = 'depreciation-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'depreciation-text';
        textDiv.style.flex = '1';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Multiple Depreciation Methods';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Do you use different depreciation methods for different asset types?';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'depreciation-toggle-container';
        toggleContainer.style.flex = '0 0 375px';

        const depreciationComponent = new Toggle({
            id: 'multipleDepreciationMethods',
            options: [
                { value: 'no', text: 'No - Use same method for all assets' },
                { value: 'yes', text: 'Yes - Different methods for different assets' }
            ],
            defaultValue: 'no',
            onChange: (value) => {
                this.responses.multipleDepreciationMethods = value;
                this.onResponseChange();
            }
        });

        this.components.depreciation = depreciationComponent;
        depreciationComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    updateConditionalSections(selectedAssets) {
        const depreciationSection = document.getElementById('depreciationSection');
        if (!depreciationSection) return;

        // Show depreciation section if any assets are selected
        const showDepreciation = selectedAssets && selectedAssets.length > 0;
        
        if (showDepreciation) {
            depreciationSection.style.display = 'block';
        } else {
            depreciationSection.style.display = 'none';
            
            // Reset depreciation response if not showing
            this.responses.multipleDepreciationMethods = 'no';
            if (this.components.depreciation) {
                this.components.depreciation.setValue('no');
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
        const isGeneric = this.isGenericModeSelected();
        if (!isGeneric) {
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

    // This method now mirrors the comprehensive approach used in renderContent()
    isGenericModeSelected() {
        // Try multiple ways to get customization data (same as renderContent)
        let isGeneric = true; // Default to generic
        
        // Method 1: Check state manager
        const responses = window.questionnaireEngine?.stateManager?.getAllResponses() || {};
        const customizationResponse1 = responses['customization'];
        const customizationResponse2 = responses['customization-preference'];
        
        // Determine if generic or custom - checking multiple sources
        if (customizationResponse1?.customizationPreferences?.assets) {
            isGeneric = customizationResponse1.customizationPreferences.assets === 'generic';
        } else if (customizationResponse2?.customizationPreferences?.assets) {
            isGeneric = customizationResponse2.customizationPreferences.assets === 'generic';
        } else if (window.customizationPreferencesFormatted?.assets) {
            isGeneric = window.customizationPreferencesFormatted.assets === 'generic';
        } else if (window.customizationPreferences?.assetsCustomization !== undefined) {
            isGeneric = !window.customizationPreferences.assetsCustomization;
        }
        
        return isGeneric;
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