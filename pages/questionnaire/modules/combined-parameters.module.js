// modules/combined-parameters.module.js

import { Dropdown } from '../components/dropdown.js';
import { TextInput } from '../components/text-input.js';

export class CombinedParametersModule {
    constructor() {
        this.id = 'combined-parameters';
        this.title = 'Model Parameters';
        this.description = 'Please provide the following details to help us structure your financial model.';
        this.required = false;
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
            'What is the periodicity of your model?',
            'Would you initially like to look at the business on a Quarterly, Half-yearly or Annual basis?',
            this.createPeriodicityDropdown()
        );
        container.appendChild(periodicitySection);

        // Historical Start Date Section  
        const dateSection = this.createSection(
            'Historical start date',
            'What historical period would you like to include data from?',
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
        const container = document.createElement('div');
        container.className = 'dropdown-container';
        
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
        
        // FIXED: Pass container to render method
        periodicityDropdown.render(container);
        
        return container;
    }

    createDateDropdowns() {
        const container = document.createElement('div');
        container.className = 'date-dropdowns';

        // Month dropdown
        const monthGroup = document.createElement('div');
        monthGroup.className = 'date-dropdown-group';

        const monthLabel = document.createElement('label');
        monthLabel.className = 'date-label';
        monthLabel.textContent = 'Month';

        const monthContainer = document.createElement('div');
        monthContainer.className = 'dropdown-wrapper';

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthOptions = months.map(month => ({ value: month, text: month }));

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
        // FIXED: Pass container to render method
        monthDropdown.render(monthContainer);
        monthGroup.appendChild(monthContainer);

        // Year dropdown  
        const yearGroup = document.createElement('div');
        yearGroup.className = 'date-dropdown-group';

        const yearLabel = document.createElement('label');
        yearLabel.className = 'date-label';
        yearLabel.textContent = 'Year';

        const yearContainer = document.createElement('div');
        yearContainer.className = 'dropdown-wrapper';

        // Generate years from 2000 to 2025 (showing last 2 digits)
        const yearOptions = [];
        for (let year = 2000; year <= 2025; year++) {
            const shortYear = year.toString().slice(-2);
            yearOptions.push({ value: shortYear, text: shortYear });
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
        // FIXED: Pass container to render method
        yearDropdown.render(yearContainer);
        yearGroup.appendChild(yearContainer);

        container.appendChild(monthGroup);
        container.appendChild(yearGroup);

        return container;
    }

    createForecastInput() {
        const container = document.createElement('div');
        container.className = 'input-container';
        
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
        
        // FIXED: Pass container to render method
        forecastInput.render(container);
        
        return container;
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
        // Only show if parameterToggle is true in user-info
        const userInfoResponse = responses['user-info'];
        return userInfoResponse && userInfoResponse.data && userInfoResponse.data.parameterToggle === true;
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

// Export for ES6 imports
export default CombinedParametersModule;

// Also add to window for backward compatibility if needed
if (typeof window !== 'undefined') {
    window.CombinedParametersModule = CombinedParametersModule;
}