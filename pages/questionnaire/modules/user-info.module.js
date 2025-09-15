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
            { value: "transportation", text: "Transportation & Logistics" },
            { value: "other", text: "Other (please specify)" }
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

        const label = document.createElement('label');
        label.textContent = 'Country';
        label.className = 'form-label required';
        section.appendChild(label);

        // Create searchable country dropdown container
        const container = document.createElement('div');
        container.className = 'searchable-dropdown-container';

        // Create the input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'searchable-dropdown-input';
        input.placeholder = 'Search or select your country...';
        input.autocomplete = 'off';

        // Create the dropdown list
        const dropdown = document.createElement('div');
        dropdown.className = 'searchable-dropdown-list';
        dropdown.style.display = 'none';

        // Get countries data
        const countries = window.countries || [];
        let filteredCountries = [...countries];
        let selectedCountryIndex = -1;

        // Populate dropdown
        const updateDropdown = (searchTerm = '') => {
            dropdown.innerHTML = '';
            
            filteredCountries = countries.filter(country => 
                country.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filteredCountries.length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'dropdown-item no-results';
                noResults.textContent = 'No countries found';
                dropdown.appendChild(noResults);
                return;
            }

            filteredCountries.slice(0, 10).forEach((country, index) => {
                const item = document.createElement('div');
                item.className = 'dropdown-item country-item';
                item.innerHTML = `
                    <img src="${country.flag}" alt="${country.name} flag" class="country-flag" />
                    <span class="country-name">${country.name}</span>
                `;
                item.dataset.code = country.code;
                item.dataset.name = country.name;
                item.dataset.flag = country.flag;
                item.dataset.index = index;

                item.addEventListener('click', () => {
                    this.selectCountry(country, input, dropdown);
                });

                dropdown.appendChild(item);
            });
        };

        // Input event handlers
        input.addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            updateDropdown(searchTerm);
            dropdown.style.display = 'block';
            selectedCountryIndex = -1;
        });

        input.addEventListener('focus', () => {
            updateDropdown(input.value);
            dropdown.style.display = 'block';
        });

        input.addEventListener('blur', (e) => {
            // Delay hiding to allow clicks on dropdown items
            setTimeout(() => {
                dropdown.style.display = 'none';
            }, 200);
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.dropdown-item:not(.no-results)');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedCountryIndex = Math.min(selectedCountryIndex + 1, items.length - 1);
                this.highlightItem(items, selectedCountryIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedCountryIndex = Math.max(selectedCountryIndex - 1, 0);
                this.highlightItem(items, selectedCountryIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedCountryIndex >= 0 && items[selectedCountryIndex]) {
                    const item = items[selectedCountryIndex];
                    const country = {
                        code: item.dataset.code,
                        name: item.dataset.name,
                        flag: item.dataset.flag
                    };
                    this.selectCountry(country, input, dropdown);
                }
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
                selectedCountryIndex = -1;
            }
        });

        // Initial population
        updateDropdown();

        container.appendChild(input);
        container.appendChild(dropdown);
        section.appendChild(container);

        // Store references for validation
        this.countryInput = input;
        this.countryDropdown = dropdown;

        // Add styles
        this.addCountryDropdownStyles();

        return section;
    }

    highlightItem(items, index) {
        items.forEach((item, i) => {
            item.classList.toggle('highlighted', i === index);
        });
    }

    selectCountry(country, input, dropdown) {
        input.value = country.name;
        dropdown.style.display = 'none';
        
        this.responses.country = {
            name: country.name,
            code: country.code,
            flag: country.flag
        };
        
        this.onResponseChange();
    }

    addCountryDropdownStyles() {
        if (document.getElementById('country-dropdown-styles')) return;

        const style = document.createElement('style');
        style.id = 'country-dropdown-styles';
        style.textContent = `
            .searchable-dropdown-container {
                position: relative;
                width: 100%;
            }

            .searchable-dropdown-input {
                width: 100%;
                padding: 12px 16px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.05);
                color: #ffffff;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .searchable-dropdown-input:focus {
                outline: none;
                border-color: #8b5cf6;
                box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
                background: rgba(255, 255, 255, 0.08);
            }

            .searchable-dropdown-input::placeholder {
                color: rgba(255, 255, 255, 0.5);
            }

            .searchable-dropdown-list {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                max-height: 200px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                margin-top: 4px;
                z-index: 1000;
                backdrop-filter: blur(10px);
            }

            .dropdown-item {
                padding: 12px 16px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .dropdown-item:last-child {
                border-bottom: none;
            }

            .dropdown-item:hover,
            .dropdown-item.highlighted {
                background: rgba(139, 92, 246, 0.2);
            }

            .country-item {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .country-flag {
                width: 24px;
                height: 18px;
                border-radius: 2px;
                object-fit: cover;
                flex-shrink: 0;
            }

            .country-name {
                color: #ffffff;
                font-size: 0.95rem;
                flex: 1;
            }

            .no-results {
                color: rgba(255, 255, 255, 0.6);
                font-style: italic;
                cursor: default;
            }

            .no-results:hover {
                background: transparent;
            }
        `;
        document.head.appendChild(style);
    }

    createIndustrySection() {
        const section = document.createElement('div');
        section.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = 'Industry';
        label.className = 'form-label';
        section.appendChild(label);

        const container = document.createElement('div');
        container.className = 'industry-container';

        // Create dropdown
        const dropdown = document.createElement('select');
        dropdown.className = 'industry-dropdown';
        dropdown.innerHTML = `
            <option value="">Select your industry...</option>
            ${this.industryOptions.map(option => 
                `<option value="${option.value}">${option.text}</option>`
            ).join('')}
        `;

        // Create free text input (initially hidden)
        const freeTextContainer = document.createElement('div');
        freeTextContainer.className = 'free-text-container';
        freeTextContainer.style.display = 'none';

        const freeTextInput = document.createElement('input');
        freeTextInput.type = 'text';
        freeTextInput.className = 'industry-free-text';
        freeTextInput.placeholder = 'Please specify your industry...';

        freeTextContainer.appendChild(freeTextInput);

        // Event handlers
        dropdown.addEventListener('change', (e) => {
            const value = e.target.value;
            
            if (value === 'other') {
                freeTextContainer.style.display = 'block';
                freeTextInput.focus();
                this.responses.industry = { dropdown: value, freeText: '' };
            } else {
                freeTextContainer.style.display = 'none';
                freeTextInput.value = '';
                this.responses.industry = { dropdown: value, freeText: null };
            }
            
            this.onResponseChange();
        });

        freeTextInput.addEventListener('input', (e) => {
            if (this.responses.industry) {
                this.responses.industry.freeText = e.target.value;
                this.onResponseChange();
            }
        });

        container.appendChild(dropdown);
        container.appendChild(freeTextContainer);
        section.appendChild(container);

        // Store references
        this.industryDropdown = dropdown;
        this.industryFreeText = freeTextInput;

        // Add styles
        this.addIndustryStyles();

        return section;
    }

    addIndustryStyles() {
        if (document.getElementById('industry-styles')) return;

        const style = document.createElement('style');
        style.id = 'industry-styles';
        style.textContent = `
            .industry-container {
                width: 100%;
            }

            .industry-dropdown,
            .industry-free-text {
                width: 100%;
                padding: 12px 16px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.05);
                color: #ffffff;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .industry-dropdown:focus,
            .industry-free-text:focus {
                outline: none;
                border-color: #8b5cf6;
                box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
                background: rgba(255, 255, 255, 0.08);
            }

            .industry-dropdown option {
                background: #1a1a1a;
                color: #ffffff;
            }

            .industry-free-text::placeholder {
                color: rgba(255, 255, 255, 0.5);
            }

            .free-text-container {
                margin-top: 8px;
            }
        `;
        document.head.appendChild(style);
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
                    if (key === 'country' && typeof value === 'object' && this.countryInput) {
                        this.countryInput.value = value.name || '';
                    } else if (key === 'industry' && typeof value === 'object') {
                        if (this.industryDropdown) {
                            this.industryDropdown.value = value.dropdown || '';
                            if (value.dropdown === 'other') {
                                const freeTextContainer = document.querySelector('.free-text-container');
                                if (freeTextContainer) freeTextContainer.style.display = 'block';
                                if (this.industryFreeText) this.industryFreeText.value = value.freeText || '';
                            }
                        }
                    } else if (component.setValue) {
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
            if (component && component.validate) {
                const validation = component.validate();
                if (!validation.isValid) {
                    isValid = false;
                    errors.push(...validation.errors);
                }
            }
        }

        // Additional validation for country
        if (!this.responses.country || !this.responses.country.code) {
            isValid = false;
            errors.push('Please select a valid country');
        }

        // Validate industry free text if "other" is selected
        if (this.responses.industry?.dropdown === 'other' && 
            (!this.responses.industry?.freeText || this.responses.industry.freeText.trim() === '')) {
            isValid = false;
            errors.push('Please specify your industry');
        }

        return { isValid, errors };
    }

    shouldShow(responses) {
        return true;
    }

    getDatabaseFields() {
        return {
            full_name: this.responses.userName || '',
            company_name: this.responses.companyName || '',
            email: this.responses.email || '',
            phone: this.responses.phone || '',
            country_name: this.responses.country?.name || '',
            country_code: this.responses.country?.code || null,
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

export default UserInfoModule;

if (typeof window !== 'undefined') {
    window.UserInfoModule = UserInfoModule;
}