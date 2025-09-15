// /pages/questionnaire/modules/assets.module.js
import { BaseComponent } from '../components/base-component.js';
import { MultiSelect } from '../components/multi-select.js';
import { Toggle } from '../components/toggle.js';

export class AssetsModule {
    constructor() {
        this.id = 'assets';
        this.title = 'Assets';
        this.description = 'Help us understand the types of assets your business owns and how you would like to model them.';
        this.required = false;
        
        this.components = {};
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
    }

    render() {
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

    validate() {
        // Always return valid - users can skip this section entirely
        return {
            isValid: true,
            errors: []
        };
    }

    shouldShow(responses) {
        // For testing - always show Assets module for now
        // TODO: Re-enable customization logic once testing is complete
        console.log('Assets module shouldShow called - always returning true for testing');
        return true;
        
        // Original conditional logic (commented out for testing):
        /*
        if (window.questionnaireEngine && window.questionnaireEngine.conditionalLogic) {
            const customizationPreference = window.questionnaireEngine.conditionalLogic
                .getCustomizationPreference(responses, 'assets');
            
            return customizationPreference !== 'generic';
        }
        
        return true;
        */
    }

    getDatabaseFields() {
        return {
            asset_types_selected: this.responses.selectedAssets.length > 0 ? this.responses.selectedAssets : null,
            asset_types_freetext: null, // Custom assets are included in the selected array
            multiple_depreciation_methods: this.responses.multipleDepreciationMethods
        };
    }

    destroy() {
        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components = {};
    }
}

export default AssetsModule;

if (typeof window !== 'undefined') {
    window.AssetsModule = AssetsModule;
}