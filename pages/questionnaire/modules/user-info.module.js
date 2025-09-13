// /pages/questionnaire/modules/user-info.module.js
import { BaseComponent } from '../components/base-component.js';
import { TextInput } from '../components/text-input.js';
import { Dropdown } from '../components/dropdown.js';
import { Toggle } from '../components/toggle.js';

export class UserInfoModule {
    constructor() {
        this.id = 'user-info';
        this.title = "Let's start with your details";
        this.description = "Please provide your contact information and industry so we can create and deliver your customized financial model.";
        this.required = true;
        
        this.components = {};
        this.responses = {
            userName: '',
            companyName: '',
            email: '',
            phone: '',
            country: null,
            industry: null,
            parameterToggle: true
        };

        // Industry options
        this.industryOptions = [
            { value: "technology", text: "Technology & Software" },
            { value: "healthcare", text: "Healthcare & Life Sciences" },
            { value: "finance", text: "Financial Services" },
            { value: "manufacturing", text: "Manufacturing & Industrial" },
            { value: "retail", text: "Retail & E-commerce" },
            { value: "realestate", text: "Real Estate & Construction" },
            { value: "energy", text: "Energy & Utilities" },
            { value: "education", text: "Education & Training" },
            { value: "hospitality", text: "Hospitality & Tourism" },
            { value: "consulting", text: "Professional Services & Consulting" },
            { value: "media", text: "Media & Entertainment" },
            { value: "transportation", text: "Transportation & Logistics" }
        ];
    }

    render() {
        const container = document.createElement('div');
        container.className = 'user-info-form';

        // Add honeypot fields for spam protection
        const honeypot = document.createElement('div');
        honeypot.style.position = 'absolute';
        honeypot.style.left = '-9999px';
        honeypot.innerHTML = `
            <label for="website">Website:</label>
            <input type="text" name="website" id="website" />
            <input type="text" name="company_name_hidden" id="company_name_hidden" style="display: none;" />
        `;
        container.appendChild(honeypot);

        // Create form sections
        container.appendChild(this.createUserNameSection());
        container.appendChild(this.createCompanyNameSection());
        container.appendChild(this.createEmailSection());
        container.appendChild(this.createPhoneSection());
        container.appendChild(this.createCountrySection());
        container.appendChild(this.createIndustrySection());
        container.appendChild(this.createParameterToggleSection());

        return container;
    }

    createUserNameSection() {
        const section = document.createElement('div');
        section.className = 'form-group';

        const nameInput = new TextInput({
            id: 'userName',
            label: 'Full Name',
            placeholder: 'Enter your full name',
            required: true,
            validation: {
                custom: (value) => {
                    if (!value || value.trim().length < 2) {
                        return 'Name must be at least 2 characters';
                    }
                    if (value.trim().length > 50) {
                        return 'Name must be no more than 50 characters';
                    }
                    return true;
                }
            },
            onChange: (value) => {
                this.responses.userName = value;
                this.onResponseChange();
            }
        });

        this.components.userName = nameInput;
        nameInput.render(section);

        return section;
    }

    createCompanyNameSection() {
        const section = document.createElement('div');
        section.className = 'form-group';

        const companyInput = new TextInput({
            id: 'companyName',
            label: 'Company Name',
            placeholder: 'Enter your company name',
            required: true,
            validation: {
                custom: (value) => {
                    if (!value || value.trim().length < 2) {
                        return 'Company name must be at least 2 characters';
                    }
                    if (value.trim().length > 100) {
                        return 'Company name must be no more than 100 characters';
                    }
                    return true;
                }
            },
            onChange: (value) => {
                this.responses.companyName = value;
                this.onResponseChange();
            }
        });

        this.components.companyName = companyInput;
        companyInput.render(section);

        return section;
    }

    createEmailSection() {
        const section = document.createElement('div');
        section.className = 'form-group';

        const emailInput = new TextInput({
            id: 'email',
            type: 'email',
            label: 'Email Address',
            placeholder: 'Enter your email address',
            required: true,
            validation: {
                custom: (value) => {
                    if (!value || value.trim() === '') {
                        return 'Email address is required';
                    }
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        return 'Please enter a valid email address';
                    }
                    return true;
                }
            },
            onChange: (value) => {
                this.responses.email = value;
                this.onResponseChange();
            }
        });

        this.components.email = emailInput;
        emailInput.render(section);

        return section;
    }

    createPhoneSection() {
        const section = document.createElement('div');
        section.className = 'form-group';

        const phoneInput = new TextInput({
            id: 'phone',
            type: 'tel',
            label: 'Phone Number',
            placeholder: 'Enter your phone number',
            required: true,
            validation: {
                custom: (value) => {
                    if (!value || value.trim() === '') {
                        return 'Phone number is required';
                    }
                    const phoneRegex = /[\d\s\-\(\)\+]{10,}/;
                    if (!phoneRegex.test(value)) {
                        return 'Please enter a valid phone number';
                    }
                    return true;
                }
            },
            onChange: (value) => {
                this.responses.phone = value;
                this.onResponseChange();
            }
        });

        this.components.phone = phoneInput;
        phoneInput.render(section);

        return section;
    }

    createCountrySection() {
        const section = document.createElement('div');
        section.className = 'form-group';

        // For now, create a simple dropdown - you can enhance this later with the CountryDropdown
        const countryInput = new TextInput({
            id: 'country',
            label: 'Country',
            placeholder: 'Enter your country',
            required: true,
            onChange: (value) => {
                this.responses.country = { name: value, code: '', flag: '' };
                this.onResponseChange();
            }
        });

        this.components.country = countryInput;
        countryInput.render(section);

        return section;
    }

    createIndustrySection() {
        const section = document.createElement('div');
        section.className = 'form-group';

        const industryDropdown = new Dropdown({
            id: 'industry',
            label: 'Industry',
            placeholder: 'Search or select your industry...',
            options: this.industryOptions,
            required: false,
            onChange: (value) => {
                this.responses.industry = { dropdown: value, freeText: null };
                this.onResponseChange();
            }
        });

        this.components.industry = industryDropdown;
        industryDropdown.render(section);

        return section;
    }

    createParameterToggleSection() {
        const section = document.createElement('div');
        section.className = 'parameter-toggle-container';

        const row = document.createElement('div');
        row.className = 'parameter-toggle-row';

        const textDiv = document.createElement('div');
        textDiv.className = 'parameter-toggle-text';

        const title = document.createElement('div');
        title.className = 'parameter-toggle-title';
        title.textContent = 'Enter in some initial model parameters';

        const subtitle = document.createElement('div');
        subtitle.className = 'parameter-toggle-subtitle';
        subtitle.textContent = 'Would you like to enter in some key model parameters before we work on the drivers behind your business (Estimated time: 1 Minute)';

        textDiv.appendChild(title);
        textDiv.appendChild(subtitle);

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-switch-container';

        const toggleComponent = new Toggle({
            id: 'parameterToggle',
            labels: ['No', 'Yes'],
            defaultValue: true,
            onChange: (value) => {
                this.responses.parameterToggle = value;
                this.onResponseChange();
            }
        });

        this.components.parameterToggle = toggleComponent;
        toggleComponent.render(toggleContainer);

        row.appendChild(textDiv);
        row.appendChild(toggleContainer);
        section.appendChild(row);

        return section;
    }

    onResponseChange() {
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    getResponse() {
        return {
            type: 'user-info',
            data: { ...this.responses },
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        if (!response || !response.data) return;

        this.responses = {
            userName: response.data.userName || '',
            companyName: response.data.companyName || '',
            email: response.data.email || '',
            phone: response.data.phone || '',
            country: response.data.country || null,
            industry: response.data.industry || null,
            parameterToggle: response.data.parameterToggle !== undefined ? response.data.parameterToggle : true
        };

        // Update components
        setTimeout(() => {
            Object.entries(this.responses).forEach(([key, value]) => {
                const component = this.components[key];
                if (component && value !== undefined && value !== null) {
                    if (key === 'country' && typeof value === 'object') {
                        component.setValue(value.name || '');
                    } else if (key === 'industry' && typeof value === 'object') {
                        component.setValue(value.dropdown || '');
                    } else {
                        component.setValue(value);
                    }
                }
            });
        }, 100);
    }

    validate() {
        const requiredFields = ['userName', 'companyName', 'email', 'phone', 'country'];
        let isValid = true;
        let errors = [];

        for (const fieldName of requiredFields) {
            const component = this.components[fieldName];
            if (component) {
                const validation = component.validate();
                if (!validation.isValid) {
                    isValid = false;
                    errors.push(...validation.errors);
                }
            }
        }

        return { isValid, errors };
    }

    shouldShow(responses) {
        // User info is always shown after customization
        return true;
    }

    getDatabaseFields() {
        return {
            full_name: this.responses.userName || '',
            company_name: this.responses.companyName || '',
            email: this.responses.email || '',
            phone: this.responses.phone || '',
            country_name: this.responses.country?.name || '',
            country_code: this.responses.country?.code || '',
            country_flag: this.responses.country?.flag || null,
            industry_dropdown: this.responses.industry?.dropdown || null,
            industry_freetext: this.responses.industry?.freeText || null,
            quick_parameters_choice: this.responses.parameterToggle ? 'yes' : 'no'
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
export default UserInfoModule;

// Also add to window for backward compatibility if needed
if (typeof window !== 'undefined') {
    window.UserInfoModule = UserInfoModule;
}