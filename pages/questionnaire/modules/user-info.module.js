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

        // Create the exact HTML structure from your original
        section.innerHTML = `
            <label class="form-label">
                Country
                <span class="required">*</span>
            </label>
            <div class="country-dropdown">
                <img class="country-flag" id="countryFlag" src="https://flagcdn.com/24x18/un.png" alt="Select country" />
                <input 
                    type="text" 
                    class="country-input" 
                    id="country"
                    placeholder="Search for your country..."
                    required
                    autocomplete="off"
                >
                <div class="country-options" id="countryOptions">
                    ${window.countries ? window.countries.map(country => `
                        <div class="country-option" data-value="${country.code}" data-name="${country.name}" data-flag="${country.flag}">
                            <img class="country-option-flag" src="${country.flag}" alt="${country.name}" />
                            <span class="country-option-name">${country.name}</span>
                        </div>
                    `).join('') : ''}
                </div>
            </div>
        `;

        // Store references and setup event listeners
        this.setupCountryEvents(section);

        return section;
    }

    setupCountryEvents(section) {
        const countryInput = section.querySelector('#country');
        const countryOptions = section.querySelector('#countryOptions');
        const countryFlag = section.querySelector('#countryFlag');
        
        if (!countryInput || !countryOptions || !countryFlag) return;

        // Store references
        this.countryInput = countryInput;
        this.countryOptions = countryOptions;
        this.countryFlag = countryFlag;

        // Show dropdown on focus and input
        countryInput.addEventListener('focus', () => {
            countryOptions.style.display = 'block';
            this.filterCountries('');
        });

        countryInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterCountries(searchTerm);
            countryOptions.style.display = 'block';
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
                
                this.onResponseChange();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!countryInput.contains(e.target) && !countryOptions.contains(e.target)) {
                countryOptions.style.display = 'none';
            }
        });

        // Handle keyboard events
        countryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                countryOptions.style.display = 'none';
            }
        });

        countryInput.addEventListener('keyup', (e) => {
            if (countryInput.value === '') {
                countryFlag.src = 'https://flagcdn.com/24x18/un.png';
                countryFlag.alt = 'Select country';
                countryInput.dataset.value = '';
                this.responses.country = null;
                this.onResponseChange();
            }
        });
    }

    filterCountries(searchTerm) {
        if (!this.countryOptions) return;
        
        const options = this.countryOptions.querySelectorAll('.country-option');
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

        // Create the exact HTML structure from your original
        section.innerHTML = `
            <label class="form-label">Industry</label>
            <div class="industry-dropdown">
                <input 
                    type="text" 
                    class="industry-input" 
                    id="industry"
                    placeholder="Search or select your industry..."
                    autocomplete="off"
                >
                <div class="industry-options" id="industryOptions">
                    ${this.industryOptions.map(option => `
                        <div class="industry-option" data-value="${option.value}">${option.text}</div>
                    `).join('')}
                </div>
                <div class="industry-custom-indicator" id="industryCustomIndicator">
                    Press Enter to register your custom industry
                </div>
            </div>
        `;

        // Store references and setup event listeners
        this.setupIndustryEvents(section);

        return section;
    }

    setupIndustryEvents(section) {
        const industryInput = section.querySelector('#industry');
        const industryOptions = section.querySelector('#industryOptions');
        const industryCustomIndicator = section.querySelector('#industryCustomIndicator');
        
        if (!industryInput || !industryOptions || !industryCustomIndicator) return;

        // Store references
        this.industryInput = industryInput;
        this.industryOptions = industryOptions;
        this.industryCustomIndicator = industryCustomIndicator;

        // Show dropdown on focus
        industryInput.addEventListener('focus', () => {
            if (!industryInput.dataset.isCustom || industryInput.dataset.isCustom === 'false') {
                industryOptions.style.display = 'block';
                this.filterIndustries(industryInput.value.toLowerCase());
            }
        });

        // Filter industries and handle custom input as user types
        industryInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            // Check if the input exactly matches any dropdown option
            const exactMatch = Array.from(industryOptions.querySelectorAll('.industry-option')).find(option => {
                return option.textContent.toLowerCase() === searchTerm;
            });
            
            if (exactMatch) {
                // User typed something that matches a dropdown option exactly
                industryInput.dataset.value = exactMatch.dataset.value;
                industryInput.dataset.isCustom = 'false';
                industryOptions.style.display = 'block';
                industryCustomIndicator.classList.remove('show');
                this.filterIndustries(searchTerm);
            } else if (searchTerm === '') {
                // Input is empty
                industryInput.dataset.value = '';
                industryInput.dataset.isCustom = 'false';
                industryOptions.style.display = 'block';
                industryCustomIndicator.classList.remove('show');
                this.filterIndustries('');
            } else {
                // User is typing custom text or partial match
                const hasPartialMatches = Array.from(industryOptions.querySelectorAll('.industry-option')).some(option => {
                    return option.textContent.toLowerCase().includes(searchTerm);
                });
                
                if (hasPartialMatches && searchTerm.length < 15) {
                    // Show dropdown with filtered options
                    industryInput.dataset.value = '';
                    industryInput.dataset.isCustom = 'false';
                    industryOptions.style.display = 'block';
                    industryCustomIndicator.classList.remove('show');
                    this.filterIndustries(searchTerm);
                } else {
                    // No matches or long text, treat as custom input
                    industryInput.dataset.value = '';
                    industryInput.dataset.isCustom = 'true';
                    industryOptions.style.display = 'none';
                    industryCustomIndicator.classList.add('show');
                }
            }
            
            this.updateIndustryResponse();
        });

        // Handle industry selection from dropdown
        industryOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.industry-option');
            if (option) {
                const industryText = option.textContent;
                
                industryInput.value = industryText;
                industryInput.dataset.value = option.dataset.value;
                industryInput.dataset.isCustom = 'false';
                industryOptions.style.display = 'none';
                industryCustomIndicator.classList.remove('show');
                
                this.updateIndustryResponse();
            }
        });

        // Handle Enter key to accept custom input
        industryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                industryOptions.style.display = 'none';
                
                const currentValue = industryInput.value.trim();
                if (currentValue) {
                    // Check if it matches any dropdown option
                    const exactMatch = Array.from(industryOptions.querySelectorAll('.industry-option')).find(option => {
                        return option.textContent.toLowerCase() === currentValue.toLowerCase();
                    });
                    
                    if (exactMatch) {
                        // It's actually a dropdown option
                        industryInput.dataset.value = exactMatch.dataset.value;
                        industryInput.dataset.isCustom = 'false';
                        industryCustomIndicator.classList.remove('show');
                    } else {
                        // It's custom text
                        industryInput.dataset.value = '';
                        industryInput.dataset.isCustom = 'true';
                        industryCustomIndicator.classList.remove('show');
                    }
                }
                
                this.updateIndustryResponse();
            } else if (e.key === 'Escape') {
                industryOptions.style.display = 'none';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!industryInput.contains(e.target) && !industryOptions.contains(e.target)) {
                industryOptions.style.display = 'none';
                
                // If there's text and it's not from dropdown, mark as custom
                const currentValue = industryInput.value.trim();
                if (currentValue && !industryInput.dataset.value) {
                    const exactMatch = Array.from(industryOptions.querySelectorAll('.industry-option')).find(option => {
                        return option.textContent.toLowerCase() === currentValue.toLowerCase();
                    });
                    
                    if (!exactMatch) {
                        industryInput.dataset.isCustom = 'true';
                        industryCustomIndicator.classList.remove('show');
                    }
                }
                
                this.updateIndustryResponse();
            }
        });

        // Clear selection when input is manually cleared
        industryInput.addEventListener('keyup', (e) => {
            if (industryInput.value === '') {
                industryInput.dataset.value = '';
                industryInput.dataset.isCustom = 'false';
                industryCustomIndicator.classList.remove('show');
                this.updateIndustryResponse();
            }
        });
    }

    filterIndustries(searchTerm) {
        if (!this.industryOptions) return;
        
        const options = this.industryOptions.querySelectorAll('.industry-option');
        options.forEach(option => {
            const industryText = option.textContent.toLowerCase();
            const matches = industryText.includes(searchTerm);
            option.style.display = matches ? 'block' : 'none';
        });
    }

    updateIndustryResponse() {
        if (!this.industryInput) return;
        
        const input = this.industryInput;
        const isCustom = input.dataset.isCustom === 'true';
        const value = input.value.trim();
        
        if (value) {
            if (isCustom) {
                this.responses.industry = {
                    dropdown: '',
                    freeText: value,
                    value: ''
                };
            } else {
                this.responses.industry = {
                    dropdown: value,
                    freeText: '',
                    value: input.dataset.value || ''
                };
            }
        } else {
            this.responses.industry = null;
        }
        
        this.onResponseChange();
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
                        this.countryInput.dataset.value = value.code || '';
                        if (this.countryFlag && value.flag) {
                            this.countryFlag.src = value.flag;
                            this.countryFlag.alt = value.name || 'Selected country';
                        }
                    } else if (key === 'industry' && typeof value === 'object' && this.industryInput) {
                        if (value.dropdown) {
                            // It's a dropdown selection
                            this.industryInput.value = value.dropdown;
                            this.industryInput.dataset.value = value.value || '';
                            this.industryInput.dataset.isCustom = 'false';
                            if (this.industryCustomIndicator) {
                                this.industryCustomIndicator.classList.remove('show');
                            }
                        } else if (value.freeText) {
                            // It's custom text
                            this.industryInput.value = value.freeText;
                            this.industryInput.dataset.value = '';
                            this.industryInput.dataset.isCustom = 'true';
                            if (this.industryCustomIndicator) {
                                this.industryCustomIndicator.classList.remove('show');
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