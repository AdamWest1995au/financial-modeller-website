// /pages/questionnaire/modules/assets.module.js - COMPLETE FIXED VERSION
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
            multipleDepreciationMethods: 'no',
            unitsOfProductionDepreciation: 'no'
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
        container.className = 'combined-parameters-container'; // Same as revenue module
        
        // Create main asset types section
        const assetTypesSection = this.createAssetTypesSection();
        container.appendChild(assetTypesSection);
        
        // Create depreciation methods section (initially hidden)
        const depreciationSection = this.createDepreciationSection();
        container.appendChild(depreciationSection);
        
        // Create units of production section (initially hidden)
        const unitsOfProductionSection = this.createUnitsOfProductionSection();
        container.appendChild(unitsOfProductionSection);
        
        return container;
    }

    createAssetTypesSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section'; // Same class as revenue

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row'; // Same class as revenue

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text'; // Same class as revenue

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'What types of assets does your business own?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Select the types of assets your business owns. This helps us model depreciation and asset-related expenses accurately.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'revenue-dropdown-container'; // Use same class as revenue
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
        section.className = 'parameter-section';
        section.id = 'depreciationSection';
        section.style.display = 'none';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';
        textDiv.style.flex = '1';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Do you use different depreciation methods for different asset types?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Understanding your depreciation approach helps us model your asset expenses and tax implications more accurately.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const depreciationComponent = new Toggle({
            id: 'multipleDepreciationMethods',
            labels: ['No', 'Yes'],
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

    /**
     * Detect if manufacturing was selected in COGS module
     */
    detectManufacturingSelection() {
        console.log('=== MANUFACTURING DETECTION ===');
        
        let manufactures = false;

        // Method 1: Check engine responses directly
        if (window.questionnaireEngine?.responses) {
            const engineResponses = window.questionnaireEngine.responses;
            console.log('Checking engine responses:', engineResponses);
            
            const cogsResponse = engineResponses['cogs-codb'];
            if (cogsResponse?.manufacturesProducts) {
                manufactures = cogsResponse.manufacturesProducts === 'yes' || cogsResponse.manufacturesProducts === 'active';
                console.log('Engine check - manufacturesProducts:', cogsResponse.manufacturesProducts, 'Manufacturing found:', manufactures);
                if (manufactures) {
                    console.log('✅ Manufacturing detected via engine responses');
                    return manufactures;
                }
            }
        }

        // Method 2: Check state manager
        if (!manufactures && window.questionnaireEngine?.stateManager) {
            const allResponses = window.questionnaireEngine.stateManager.getAllResponses();
            console.log('Checking state manager responses:', allResponses);
            
            // Try multiple possible keys
            const possibleKeys = ['cogs-codb', 'cogs', 'codb'];
            
            for (const key of possibleKeys) {
                const response = allResponses[key];
                if (response) {
                    console.log(`Checking response under key '${key}':`, response);
                    
                    // Check manufacturesProducts property - handle both 'yes' and 'active'
                    if (response.manufacturesProducts) {
                        manufactures = response.manufacturesProducts === 'yes' || response.manufacturesProducts === 'active';
                        console.log(`State manager check - ${key}.manufacturesProducts:`, response.manufacturesProducts, 'Manufacturing found:', manufactures);
                        if (manufactures) {
                            console.log(`✅ Manufacturing detected via state manager - ${key}`);
                            break;
                        }
                    }
                    
                    // Check nested data property - handle both 'yes' and 'active'
                    if (!manufactures && response.data?.manufacturesProducts) {
                        manufactures = response.data.manufacturesProducts === 'yes' || response.data.manufacturesProducts === 'active';
                        console.log(`State manager check - ${key}.data.manufacturesProducts:`, response.data.manufacturesProducts, 'Manufacturing found:', manufactures);
                        if (manufactures) {
                            console.log(`✅ Manufacturing detected via state manager - ${key}.data`);
                            break;
                        }
                    }
                }
            }
        }

        // Method 3: Check module instances directly
        if (!manufactures && window.questionnaireEngine?.modules) {
            console.log('Checking module instances...');
            const modules = window.questionnaireEngine.modules;
            
            for (const module of modules) {
                if (module.id === 'cogs-codb') {
                    console.log('Found COGS module:', module);
                    if (module.responses?.manufacturesProducts) {
                        manufactures = module.responses.manufacturesProducts === 'yes' || module.responses.manufacturesProducts === 'active';
                        console.log('Module check - manufacturesProducts:', module.responses.manufacturesProducts, 'Manufacturing found:', manufactures);
                        if (manufactures) {
                            console.log('✅ Manufacturing detected via module instance');
                            break;
                        }
                    }
                }
            }
        }

        // Method 4: Global variable fallback
        if (!manufactures && window.cogsData) {
            console.log('Checking global COGS data:', window.cogsData);
            if (window.cogsData.manufacturesProducts === 'yes' || window.cogsData.manufacturesProducts === 'active') {
                manufactures = true;
                console.log('✅ Manufacturing detected via global variable');
            }
        }

        console.log('Final manufacturing detection result:', manufactures);
        console.log('=== END MANUFACTURING DETECTION ===');
        
        return manufactures;
    }

    createUnitsOfProductionSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';
        section.id = 'unitsOfProductionSection';
        section.style.display = 'none';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'You manufacture your own products, do you depreciate your assets using units of production?';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Units of production depreciation allocates asset costs based on actual usage/output, which can be more accurate for manufacturing equipment.';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const unitsOfProductionComponent = new Toggle({
            id: 'unitsOfProductionDepreciation',
            labels: ['No', 'Yes'],
            defaultValue: this.responses.unitsOfProductionDepreciation,
            onChange: (value) => {
                this.responses.unitsOfProductionDepreciation = value;
                this.onResponseChange();
            }
        });

        this.components.unitsOfProduction = unitsOfProductionComponent;
        unitsOfProductionComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    updateConditionalSections(selectedAssets) {
        const depreciationSection = document.getElementById('depreciationSection');
        const unitsOfProductionSection = document.getElementById('unitsOfProductionSection');
        
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

        // Show units of production section if assets are selected AND manufacturing is detected
        if (unitsOfProductionSection) {
            const hasAssets = selectedAssets && selectedAssets.length > 0;
            const manufactures = this.detectManufacturingSelection();
            const showUnitsOfProduction = hasAssets && manufactures;
            
            console.log('Units of Production visibility check:', {
                hasAssets,
                manufactures,
                showUnitsOfProduction
            });
            
            if (showUnitsOfProduction) {
                unitsOfProductionSection.style.display = 'block';
            } else {
                unitsOfProductionSection.style.display = 'none';
                
                // Reset units of production response if not showing
                this.responses.unitsOfProductionDepreciation = 'no';
                if (this.components.unitsOfProduction) {
                    this.components.unitsOfProduction.setValue('no');
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
            unitsOfProductionDepreciation: this.responses.unitsOfProductionDepreciation,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response) return;

        // Load response data
        this.responses = {
            selectedAssets: response.selectedAssets || [],
            multipleDepreciationMethods: response.multipleDepreciationMethods || 'no',
            unitsOfProductionDepreciation: response.unitsOfProductionDepreciation || 'no'
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

                if (this.components.unitsOfProduction) {
                    this.components.unitsOfProduction.setValue(this.responses.unitsOfProductionDepreciation);
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
    const convertToYesNo = (value) => {
        if (value === 'active' || value === true || value === 'yes') {
            return 'yes';
        } else if (value === 'inactive' || value === false || value === 'no') {
            return 'no';
        }
        return value || 'no';
    };

    return {
        asset_types_selected: this.responses.selectedAssets.length > 0 ? this.responses.selectedAssets : null,
        asset_types_freetext: null, 
        multiple_depreciation_methods: convertToYesNo(this.responses.multipleDepreciationMethods), // FIX: Convert to yes/no
        units_of_production_depreciation: convertToYesNo(this.responses.unitsOfProductionDepreciation) // FIX: Convert to yes/no
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