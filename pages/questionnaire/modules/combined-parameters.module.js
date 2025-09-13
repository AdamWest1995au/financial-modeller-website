// /pages/questionnaire/modules/combined-parameters.module.js - FIXED VERSION

import { Dropdown } from '../components/dropdown.js';
import { TextInput } from '../components/text-input.js';

export class CombinedParametersModule {
    constructor() {
        this.id = 'combined-parameters';
        this.title = 'Model Parameters';
        this.description = 'Let us know the key parameters for your financial model.';
        this.components = {};
        this.responses = {
            periodicity: '',
            month: '',
            year: '',
            forecastYears: ''
        };
    }

    render() {
        const container = document.createElement('div');
        container.className = 'combined-parameters-container';

        // Periodicity Section
        const periodicitySection = this.createSection(
            'Periodicity', 
            'What would you like the period of your model to be?',
            this.createPeriodicityDropdown()
        );
        container.appendChild(periodicitySection);

        // Historical Date Section
        const dateSection = this.createSection(
            'Historical start date', 
            'What would you like the start date of your historical data to be?',
            this.createDateDropdowns()
        );
        container.appendChild(dateSection);

        // Forecast Years Section
        const forecastSection = this.createSection(
            'Forecast years', 
            'How many years would you like to model your forecast for?',
            this.createForecastInput()
        );
        container.appendChild(forecastSection);

        return container;
    }

    createSection(title, description, content) {
        const section = document.createElement('div');
        section.className = 'parameter-section';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'parameter-title';
        titleDiv.textContent = title;

        const descDiv = document.createElement('div');
        descDiv.className = 'parameter-description';
        descDiv.textContent = description;

        section.appendChild(titleDiv);
        section.appendChild(descDiv);
        section.appendChild(content);

        return section;
    }

    createPeriodicityDropdown() {
        const options = [
            { value: 'quarter', text: 'Quarter' },
            { value: 'half-year', text: 'Half-year' },
            { value: 'annual', text: 'Annual' }
        ];

        const periodicityDropdown = new Dropdown({
            id: 'periodicitySelect',
            placeholder: 'Select an option...',
            options: options,
            defaultValue: this.responses.periodicity,
            onChange: (value) => {
                this.responses.periodicity = value;
                this.onResponseChange();
            }
        });

        this.components.periodicity = periodicityDropdown;
        return periodicityDropdown.render();
    }

    createDateDropdowns() {
        const container = document.createElement('div');
        container.className = 'date-input-container';

        // Month group
        const monthGroup = document.createElement('div');
        monthGroup.className = 'date-input-group';

        const monthLabel = document.createElement('label');
        monthLabel.className = 'date-label';
        monthLabel.textContent = 'Month';

        const monthOptions = [
            { value: 'Jan', text: 'January' },
            { value: 'Feb', text: 'February' },
            { value: 'Mar', text: 'March' },
            { value: 'Apr', text: 'April' },
            { value: 'May', text: 'May' },
            { value: 'Jun', text: 'June' },
            { value: 'Jul', text: 'July' },
            { value: 'Aug', text: 'August' },
            { value: 'Sep', text: 'September' },
            { value: 'Oct', text: 'October' },
            { value: 'Nov', text: 'November' },
            { value: 'Dec', text: 'December' }
        ];

        const monthDropdown = new Dropdown({
            id: 'monthDropdown',
            placeholder: 'Month',
            options: monthOptions,
            defaultValue: this.responses.month,
            onChange: (value) => {
                this.responses.month = value;
                this.onResponseChange();
            }
        });

        this.components.month = monthDropdown;

        monthGroup.appendChild(monthLabel);
        monthGroup.appendChild(monthDropdown.render());

        // Year group
        const yearGroup = document.createElement('div');
        yearGroup.className = 'date-input-group';

        const yearLabel = document.createElement('label');
        yearLabel.className = 'date-label';
        yearLabel.textContent = 'Year';

        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let year = currentYear; year >= currentYear - 10; year--) {
            const yearStr = year.toString().slice(-2);
            yearOptions.push({ value: yearStr, text: year.toString() });
        }

        const yearDropdown = new Dropdown({
            id: 'yearDropdown', 
            placeholder: 'Year',
            options: yearOptions,
            defaultValue: this.responses.year,
            onChange: (value) => {
                this.responses.year = value;
                this.onResponseChange();
            }
        });

        this.components.year = yearDropdown;

        yearGroup.appendChild(yearLabel);
        yearGroup.appendChild(yearDropdown.render());

        container.appendChild(monthGroup);
        container.appendChild(yearGroup);

        return container;
    }

    createForecastInput() {
        const forecastInput = new TextInput({
            id: 'forecastYearsInput',
            placeholder: 'Enter number of years (e.g., 5)',
            type: 'text',
            validation: {
                required: false,
                pattern: /^\d*$/,
                min: 1,
                max: 50,
                errorMessage: 'Please enter a number between 1 and 50'
            },
            onChange: (value) => {
                this.responses.forecastYears = value;
                this.onResponseChange();
            }
        });

        this.components.forecastYears = forecastInput;
        return forecastInput.render();
    }

    onResponseChange() {
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    getResponse() {
        const fullDate = (this.responses.month && this.responses.year) ? 
                        `${this.responses.month} ${this.responses.year}` : '';

        return {
            type: 'combined-parameters',
            periodicity: this.responses.periodicity,
            month: this.responses.month,
            year: this.responses.year,
            fullDate: fullDate,
            forecastYears: this.responses.forecastYears,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response) return;

        this.responses = {
            periodicity: response.periodicity || '',
            month: response.month || '',
            year: response.year || '',
            forecastYears: response.forecastYears || ''
        };

        // Update components
        setTimeout(() => {
            if (this.components.periodicity) {
                this.components.periodicity.setValue(this.responses.periodicity);
            }
            if (this.components.month) {
                this.components.month.setValue(this.responses.month);
            }
            if (this.components.year) {
                this.components.year.setValue(this.responses.year);
            }
            if (this.components.forecastYears) {
                this.components.forecastYears.setValue(this.responses.forecastYears);
            }
        }, 100);
    }

    validate() {
        // All fields are optional, always allow proceeding
        return {
            isValid: true,
            errors: []
        };
    }

    shouldShow(responses) {
        // FIXED: Check customization preferences instead of user-info parameterToggle
        console.log('🔍 Combined Parameters shouldShow called with responses:', responses);
        
        // Get customization preferences
        const customizationResponse = responses['customization-preference'];
        console.log('🔍 Customization response:', customizationResponse);
        
        if (!customizationResponse || !customizationResponse.customizationPreferences) {
            console.log('🔍 No customization preferences found, showing by default');
            return true; // Default to showing if no preferences
        }
        
        const preferences = customizationResponse.customizationPreferences;
        console.log('🔍 Preferences object:', preferences);
        
        // Check if parameters section is set to 'custom' (meaning user wants to enter parameters)
        const parametersPreference = preferences.parameters;
        console.log('🔍 Parameters preference:', parametersPreference);
        
        const shouldShow = parametersPreference === 'custom';
        console.log(`🔍 Combined Parameters shouldShow result: ${shouldShow} (preference: ${parametersPreference})`);
        
        return shouldShow;
    }

    getDatabaseFields() {
        const fullDate = (this.responses.month && this.responses.year) ? 
                        `${this.responses.month} ${this.responses.year}` : null;

        return {
            model_periodicity: this.responses.periodicity || null,
            historical_start_date: fullDate,
            forecast_years: this.responses.forecastYears ? parseInt(this.responses.forecastYears) : null
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