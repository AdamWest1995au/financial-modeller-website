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
        }; // Semicolon was missing here in the original, added for correctness.

        // This method has been moved inside the constructor where it belongs.
        this.addIndustryStyles = function() {
            if (document.getElementById('industry-styles')) return;
    
            const style = document.createElement('style');
            style.id = 'industry-styles';
            // FIXED: Added backticks (`) to enclose the multi-line CSS string.
            style.textContent = `
                .industry-dropdown {
                    position: relative;
                    width: 100%;
                }
    
                .industry-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    color: #ffffff;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                }
    
                .industry-input:focus {
                    outline: none;
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
                    background: rgba(255, 255, 255, 0.08);
                }
    
                .industry-input::placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }
    
                .industry-options {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    max-height: 200px;
                    overflow-y: auto;
                    background: rgba(0, 0, 0, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    z-index: 1000;
                    display: none;
                    backdrop-filter: blur(20px);
                }
    
                .industry-option {
                    padding: 12px 16px;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.8);
                }
    
                .industry-option:last-child {
                    border-bottom: none;
                }
    
                .industry-option:hover {
                    background-color: rgba(139, 92, 246, 0.2);
                    color: #ffffff;
                }
    
                .industry-custom-indicator {
                    margin-top: 10px;
                    padding: 8px 12px;
                    background: rgba(139, 92, 246, 0.1);
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    border-radius: 6px;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.85rem;
                    font-style: italic;
                    display: none;
                }
    
                .industry-custom-indicator.show {
                    display: block;
                }
            `;        
            document.head.appendChild(style);
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
        // FIXED: Added backticks (`) to enclose the multi-line HTML string.
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

        // Create country dropdown matching HTML structure
        const countryContainer = document.createElement('div');
        countryContainer.className = 'country-dropdown';

        // Country flag image
        const countryFlag = document.createElement('img');
        countryFlag.className = 'country-flag';
        countryFlag.id = 'countryFlag';
        countryFlag.src = 'https://flagcdn.com/24x18/un.png';
        countryFlag.alt = 'Select country';
        countryContainer.appendChild(countryFlag);

        // Country input field
        const countryInput = document.createElement('input');
        countryInput.type = 'text';
        countryInput.className = 'country-input';
        countryInput.id = 'country';
        countryInput.placeholder = 'Search for your country...';
        countryInput.autocomplete = 'off';
        countryInput.required = true;
        countryContainer.appendChild(countryInput);

        // Country options dropdown
        const countryOptions = document.createElement('div');
        countryOptions.className = 'country-options';
        countryOptions.id = 'countryOptions';

        // Populate country options
        const countries = window.countries || [];
        countries.forEach(country => {
            const option = document.createElement('div');
            option.className = 'country-option';
            option.dataset.value = country.code;
            option.dataset.name = country.name;
            option.dataset.flag = country.flag;
            
            // FIXED: Added backticks (`) to enclose the multi-line HTML string.
            option.innerHTML = `
                <img class="country-option-flag" src="${country.flag}" alt="${country.name}" />
                <span class="country-option-name">${country.name}</span>
            `;            
            countryOptions.appendChild(option);
        });

        countryContainer.appendChild(countryOptions);
        section.appendChild(countryContainer);

        // Setup country dropdown functionality
        this.setupCountryDropdown(countryInput, countryOptions, countryFlag);

        return section;
    }

    setupCountryDropdown(countryInput, countryOptions, countryFlag) {
        // Show dropdown on focus and input
        countryInput.addEventListener('focus', () => {
            countryOptions.style.display = 'block';
            this.filterCountries('', countryOptions);
            this.onResponseChange();
        });

        // Filter countries as user types
        countryInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterCountries(searchTerm, countryOptions);
            countryOptions.style.display = 'block';
            this.onResponseChange();
        });

        // Handle country selection
        countryOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.country-option');
            if (option) {
                const countryName = option.dataset.name;
                const countryCode = option.dataset.value;
                const flagUrl = option.dataset.flag;
                
                countryInput.value = countryName;
                countryInput.dataset.value = countryCode;
                countryFlag.src = flagUrl;
                countryFlag.alt = countryName;
                countryOptions.style.display = 'none';
                
                this.responses.country = {
                    name: countryName,
                    code: countryCode,
                    flag: flagUrl
                };
                
                countryInput.classList.remove('invalid');
                this.onResponseChange();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!countryInput.contains(e.target) && !countryOptions.contains(e.target)) {
                countryOptions.style.display = 'none';
                this.onResponseChange();
            }
        });

        // Handle keyboard navigation
        countryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                countryOptions.style.display = 'none';
                this.onResponseChange();
            }
        });

        // Clear selection when input is manually cleared
        countryInput.addEventListener('keyup', (e) => {
            if (countryInput.value === '') {
                countryFlag.src = 'https://flagcdn.com/24x18/un.png';
                countryFlag.alt = 'Select country';
                countryInput.dataset.value = '';
                this.responses.country = null;
                this.onResponseChange();
            }
        });

        this.components.country = {
            validate: () => {
                const isValid = countryInput.value.trim() !== '' && countryInput.dataset.value;
                if (!isValid) {
                    countryInput.classList.add('invalid');
                    return { isValid: false, errors: ['Please select a valid country'] };
                } else {
                    countryInput.classList.remove('invalid');
                    return { isValid: true, errors: [] };
                }
            },
            setValue: (value) => {
                if (value && typeof value === 'object') {
                    countryInput.value = value.name || '';
                    countryInput.dataset.value = value.code || '';
                    if (value.flag) {
                        countryFlag.src = value.flag;
                        countryFlag.alt = value.name || 'Selected country';
                    }
                    this.responses.country = value;
                }
            }
        };
    }

    filterCountries(searchTerm, countryOptions) {
        const options = countryOptions.querySelectorAll('.country-option');
        options.forEach(option => {
            const countryName = option.dataset.name.toLowerCase();
            const countryCode = option.dataset.value.toLowerCase();
            const matches = countryName.includes(searchTerm) || countryCode.includes(searchTerm);
            option.style.display = matches ? 'flex' : 'none';
        });
    }

    createIndustrySection() {
        const section = document.createElement('div');
        section.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = 'Industry';
        label.className = 'form-label';
        section.appendChild(label);

        // Simple dropdown with built-in "Other" option
        const dropdown = document.createElement('select');
        dropdown.className = 'form-input';
        dropdown.id = 'industry';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select your industry...';
        dropdown.appendChild(defaultOption);

        // Add industry options
        this.industryOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            dropdown.appendChild(optionElement);
        });

        section.appendChild(dropdown);

        // Create free text input (initially hidden)
        const freeTextContainer = document.createElement('div');
        freeTextContainer.className = 'free-text-container';
        freeTextContainer.style.display = 'none';
        freeTextContainer.style.marginTop = '8px';

        const freeTextInput = document.createElement('input');
        freeTextInput.type = 'text';
        freeTextInput.className = 'form-input';
        freeTextInput.placeholder = 'Please specify your industry...';

        freeTextContainer.appendChild(freeTextInput);
        section.appendChild(freeTextContainer);

        // Setup industry dropdown functionality
        this.setupIndustryDropdown(dropdown, freeTextInput, freeTextContainer);

        return section;
    }

    setupIndustryDropdown(dropdown, freeTextInput, freeTextContainer) {
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

        this.components.industry = {
            validate: () => {
                const dropdownValue = dropdown.value;
                const freeTextValue = freeTextInput.value.trim();
                
                // Industry is optional, so always return valid
                return { isValid: true, errors: [] };
            },
            setValue: (value) => {
                if (value && typeof value === 'object') {
                    if (value.dropdown) {
                        dropdown.value = value.dropdown;
                        if (value.dropdown === 'other') {
                            freeTextContainer.style.display = 'block';
                            if (value.freeText) {
                                freeTextInput.value = value.freeText;
                            }
                        }
                    }
                    this.responses.industry = value;
                } else if (typeof value === 'string') {
                    // Handle simple string value
                    const option = Array.from(dropdown.options).find(opt => opt.value === value);
                    if (option) {
                        dropdown.value = value;
                        this.responses.industry = { dropdown: value, freeText: null };
                    }
                }
            }
        };
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
                    if (component.setValue) {
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