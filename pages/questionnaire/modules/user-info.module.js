// /pages/questionnaire/modules/user-info.module.js
export class UserInfoModule {
    constructor() {
        this.id = 'user-info';
        this.title = "Let's start with your details";
        this.description = "Please provide your contact information and industry so we can create and deliver your customized financial model.";
        
        this.engine = null;
        this.currentQuestionIndex = 0;
        this.components = new Map();
        
        // Define questions structure
        this.questions = [
            {
                id: 'user-details',
                type: 'user-info-form',
                title: "Let's start with your details",
                description: "Please provide your contact information and industry so we can create and deliver your customized financial model.",
                required: true
            }
        ];

        // No conditional logic for user info - always required
        this.conditionalLogic = {};

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

    initialize(engine) {
        this.engine = engine;
        console.log('User info module initialized');
    }

    getQuestions() {
        return this.questions;
    }

    async renderQuestion(questionIndex, callbacks) {
        this.currentQuestionIndex = questionIndex;
        const question = this.questions[questionIndex];
        
        if (!question) {
            throw new Error(`Question ${questionIndex} not found in user info module`);
        }

        console.log(`Rendering user info question: ${question.id}`);

        // Get the modal content container
        const modal = document.getElementById('questionModal');
        const questionContent = document.getElementById('questionContent');
        
        if (!modal || !questionContent) {
            throw new Error('Modal elements not found');
        }

        // Update modal header
        this.updateModalHeader(question);

        // Render the user info form
        questionContent.innerHTML = this.createUserInfoForm();
        
        // Setup all components and event listeners
        this.setupUserInfoComponents(callbacks);
        
        // Show modal
        modal.classList.add('active', 'question-mode');
        
        return true;
    }

    updateModalHeader(question) {
        const questionTitle = document.getElementById('questionTitle');
        const questionDescription = document.getElementById('questionDescription');
        const questionNumber = document.getElementById('questionNumber');
        
        if (questionTitle) questionTitle.textContent = question.title;
        if (questionDescription) questionDescription.textContent = question.description;
        if (questionNumber) questionNumber.textContent = this.currentQuestionIndex + 1;
    }

    createUserInfoForm() {
        return `
            <div class="user-info-form">
                <!-- Honeypot fields for spam protection -->
                <div style="position: absolute; left: -9999px;">
                    <label for="website">Website:</label>
                    <input type="text" name="website" id="website" />
                    <input type="text" name="company_name_hidden" id="company_name_hidden" style="display: none;" />
                </div>
                
                <!-- Full Name -->
                <div class="form-group">
                    <div id="userNameComponent"></div>
                </div>
                
                <!-- Company Name -->
                <div class="form-group">
                    <div id="companyNameComponent"></div>
                </div>
                
                <!-- Email -->
                <div class="form-group">
                    <div id="emailComponent"></div>
                </div>
                
                <!-- Phone -->
                <div class="form-group">
                    <div id="phoneComponent"></div>
                </div>
                
                <!-- Country -->
                <div class="form-group">
                    <div id="countryComponent"></div>
                </div>
                
                <!-- Industry -->
                <div class="form-group">
                    <div id="industryComponent"></div>
                </div>
                
                <!-- Parameter Toggle -->
                <div class="parameter-toggle-container">
                    <div class="parameter-toggle-row">
                        <div class="parameter-toggle-text">
                            <div class="parameter-toggle-title">Enter in some initial model parameters</div>
                            <div class="parameter-toggle-subtitle">Would you like to enter in some key model parameters before we work on the drivers behind your business (Estimated time: 1 Minute)</div>
                        </div>
                        <div class="toggle-switch-container">
                            <div id="parameterToggleComponent"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupUserInfoComponents(callbacks) {
        // 1. Setup Full Name input
        this.setupUserNameComponent(callbacks);
        
        // 2. Setup Company Name input
        this.setupCompanyNameComponent(callbacks);
        
        // 3. Setup Email input
        this.setupEmailComponent(callbacks);
        
        // 4. Setup Phone input
        this.setupPhoneComponent(callbacks);
        
        // 5. Setup Country dropdown
        this.setupCountryComponent(callbacks);
        
        // 6. Setup Industry dropdown
        this.setupIndustryComponent(callbacks);
        
        // 7. Setup Parameter Toggle
        this.setupParameterToggleComponent(callbacks);
    }

    setupUserNameComponent(callbacks) {
        const container = document.getElementById('userNameComponent');
        
        const nameComponent = new TextInput({
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
            }
        });

        nameComponent.render(container);
        this.components.set('userName', nameComponent);

        nameComponent.on('change', () => {
            callbacks.onValidate(this.collectCurrentData());
        });

        nameComponent.on('validate', ({ isValid }) => {
            this.updateValidationState('userName', isValid);
            callbacks.onValidate(this.collectCurrentData());
        });
    }

    setupCompanyNameComponent(callbacks) {
        const container = document.getElementById('companyNameComponent');
        
        const companyComponent = new TextInput({
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
            }
        });

        companyComponent.render(container);
        this.components.set('companyName', companyComponent);

        companyComponent.on('change', () => {
            callbacks.onValidate(this.collectCurrentData());
        });

        companyComponent.on('validate', ({ isValid }) => {
            this.updateValidationState('companyName', isValid);
            callbacks.onValidate(this.collectCurrentData());
        });
    }

    setupEmailComponent(callbacks) {
        const container = document.getElementById('emailComponent');
        
        const emailComponent = new TextInput({
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
            }
        });

        emailComponent.render(container);
        this.components.set('email', emailComponent);

        emailComponent.on('change', () => {
            callbacks.onValidate(this.collectCurrentData());
        });

        emailComponent.on('validate', ({ isValid }) => {
            this.updateValidationState('email', isValid);
            callbacks.onValidate(this.collectCurrentData());
        });
    }

    setupPhoneComponent(callbacks) {
        const container = document.getElementById('phoneComponent');
        
        const phoneComponent = new TextInput({
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
                    // Basic phone validation - at least 10 digits
                    const phoneRegex = /[\d\s\-\(\)\+]{10,}/;
                    if (!phoneRegex.test(value)) {
                        return 'Please enter a valid phone number';
                    }
                    return true;
                }
            }
        });

        phoneComponent.render(container);
        this.components.set('phone', phoneComponent);

        phoneComponent.on('change', () => {
            callbacks.onValidate(this.collectCurrentData());
        });

        phoneComponent.on('validate', ({ isValid }) => {
            this.updateValidationState('phone', isValid);
            callbacks.onValidate(this.collectCurrentData());
        });
    }

    setupCountryComponent(callbacks) {
        const container = document.getElementById('countryComponent');
        
        // Create country dropdown with flags
        const countryComponent = new CountryDropdown({
            id: 'country',
            label: 'Country',
            placeholder: 'Search for your country...',
            required: true,
            countries: window.countries || []
        });

        countryComponent.render(container);
        this.components.set('country', countryComponent);

        countryComponent.on('change', () => {
            callbacks.onValidate(this.collectCurrentData());
        });

        countryComponent.on('validate', ({ isValid }) => {
            this.updateValidationState('country', isValid);
            callbacks.onValidate(this.collectCurrentData());
        });
    }

    setupIndustryComponent(callbacks) {
        const container = document.getElementById('industryComponent');
        
        const industryComponent = new Dropdown({
            id: 'industry',
            label: 'Industry',
            placeholder: 'Search or select your industry...',
            options: this.industryOptions,
            allowCustom: true,
            required: false
        });

        industryComponent.render(container);
        this.components.set('industry', industryComponent);

        industryComponent.on('change', () => {
            callbacks.onValidate(this.collectCurrentData());
        });
    }

    setupParameterToggleComponent(callbacks) {
        const container = document.getElementById('parameterToggleComponent');
        
        const toggleComponent = new Toggle({
            id: 'parameterToggle',
            labels: ['No', 'Yes'],
            values: [false, true],
            defaultValue: true // Default to Yes
        });

        toggleComponent.render(container);
        this.components.set('parameterToggle', toggleComponent);

        toggleComponent.on('change', () => {
            callbacks.onValidate(this.collectCurrentData());
        });
    }

    updateValidationState(componentName, isValid) {
        const component = this.components.get(componentName);
        if (component && component.input) {
            if (isValid) {
                component.input.classList.remove('invalid');
            } else {
                component.input.classList.add('invalid');
            }
        }
    }

    validateQuestion(questionIndex, data) {
        if (questionIndex !== 0) return true;
        
        let isValid = true;
        const requiredFields = ['userName', 'companyName', 'email', 'phone', 'country'];
        
        for (const fieldName of requiredFields) {
            const component = this.components.get(fieldName);
            if (component) {
                const validation = component.validate();
                if (!validation.isValid) {
                    isValid = false;
                }
            }
        }
        
        return isValid;
    }

    collectCurrentData() {
        const data = {
            type: 'user-info',
            timestamp: Date.now()
        };

        // Collect data from all components
        this.components.forEach((component, key) => {
            data[key] = component.getValue();
        });

        return data;
    }

    collectData() {
        return this.collectCurrentData();
    }

    collectSubmissionData(responses) {
        const firstResponse = responses[0] || {};
        
        // Transform to database schema format
        return {
            // User Information
            full_name: firstResponse.userName || '',
            company_name: firstResponse.companyName || '',
            email: firstResponse.email || '',
            phone: firstResponse.phone || '',
            
            // Country information
            country_name: firstResponse.country?.name || '',
            country_code: firstResponse.country?.code || '',
            country_flag: firstResponse.country?.flag || null,
            
            // Industry information
            industry_dropdown: firstResponse.industry?.dropdown || null,
            industry_freetext: firstResponse.industry?.freeText || null,
            
            // Parameter toggle
            quick_parameters_choice: firstResponse.parameterToggle ? 'yes' : 'no'
        };
    }

    loadPreviousResponse(questionIndex, responseData) {
        console.log('Loading previous user info response:', responseData);
        
        // Load data into components
        Object.entries(responseData).forEach(([key, value]) => {
            const component = this.components.get(key);
            if (component && value !== undefined) {
                component.setValue(value);
            }
        });
    }

    destroy() {
        // Clean up all components
        this.components.forEach(component => {
            component.destroy();
        });
        this.components.clear();
    }
}

// Specialized Country Dropdown Component
export class CountryDropdown extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.config = {
            countries: [],
            showFlags: true,
            searchable: true,
            placeholder: 'Search for your country...',
            ...this.config
        };
        
        this.filteredCountries = [...this.config.countries];
        this.isOpen = false;
        this.selectedCountry = null;
    }

    createElement() {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';

        if (this.config.label) {
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = this.config.label;
            if (this.config.required) {
                label.innerHTML += '<span class="required">*</span>';
            }
            wrapper.appendChild(label);
        }

        // Country dropdown container
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'country-dropdown';

        // Flag display
        this.flagImg = document.createElement('img');
        this.flagImg.className = 'country-flag';
        this.flagImg.src = 'https://flagcdn.com/24x18/un.png';
        this.flagImg.alt = 'Select country';
        this.dropdown.appendChild(this.flagImg);

        // Input field
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'country-input';
        this.input.placeholder = this.config.placeholder;
        this.input.autocomplete = 'off';
        this.dropdown.appendChild(this.input);

        // Options container
        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = 'country-options';
        this.renderCountryOptions();
        this.dropdown.appendChild(this.optionsContainer);

        wrapper.appendChild(this.dropdown);

        // Validation message container
        this.validationContainer = document.createElement('div');
        this.validationContainer.className = 'validation-message';
        wrapper.appendChild(this.validationContainer);

        return wrapper;
    }

    renderCountryOptions() {
        this.optionsContainer.innerHTML = '';
        
        this.filteredCountries.forEach(country => {
            const option = document.createElement('div');
            option.className = 'country-option';
            option.dataset.value = country.code;
            option.dataset.name = country.name;
            option.dataset.flag = country.flag;
            
            option.innerHTML = `
                <img class="country-option-flag" src="${country.flag}" alt="${country.name}" />
                <span class="country-option-name">${country.name}</span>
            `;
            
            this.optionsContainer.appendChild(option);
        });
    }

    setupEventListeners() {
        // Show dropdown on focus
        this.input.addEventListener('focus', () => {
            this.openDropdown();
        });

        // Filter countries as user types
        this.input.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterCountries(searchTerm);
            this.openDropdown();
        });

        // Handle country selection
        this.optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.country-option');
            if (option) {
                this.selectCountry({
                    code: option.dataset.value,
                    name: option.dataset.name,
                    flag: option.dataset.flag
                });
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Handle keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDropdown();
            }
        });

        // Clear selection when input is manually cleared
        this.input.addEventListener('keyup', (e) => {
            if (this.input.value === '') {
                this.clearSelection();
            }
        });

        this.on('validate', ({ isValid, errors }) => {
            this.updateValidationDisplay(isValid, errors);
        });
    }

    filterCountries(searchTerm) {
        this.filteredCountries = this.config.countries.filter(country =>
            country.name.toLowerCase().includes(searchTerm) ||
            country.code.toLowerCase().includes(searchTerm)
        );
        this.renderCountryOptions();
    }

    selectCountry(country) {
        this.selectedCountry = country;
        this.input.value = country.name;
        this.flagImg.src = country.flag;
        this.flagImg.alt = country.name;
        
        this.setValue(country);
        this.closeDropdown();
        this.input.classList.remove('invalid');
    }

    clearSelection() {
        this.selectedCountry = null;
        this.flagImg.src = 'https://flagcdn.com/24x18/un.png';
        this.flagImg.alt = 'Select country';
        this.setValue(null);
    }

    openDropdown() {
        this.isOpen = true;
        this.optionsContainer.style.display = 'block';
        this.dropdown.classList.add('open');
    }

    closeDropdown() {
        this.isOpen = false;
        this.optionsContainer.style.display = 'none';
        this.dropdown.classList.remove('open');
    }

    updateDisplay() {
        if (this.selectedCountry) {
            this.input.value = this.selectedCountry.name;
            this.flagImg.src = this.selectedCountry.flag;
            this.flagImg.alt = this.selectedCountry.name;
        } else {
            this.input.value = '';
            this.flagImg.src = 'https://flagcdn.com/24x18/un.png';
            this.flagImg.alt = 'Select country';
        }
    }

    updateValidationDisplay(isValid, errors) {
        if (!this.input || !this.validationContainer) return;

        if (isValid) {
            this.input.classList.remove('invalid');
            this.validationContainer.textContent = '';
            this.validationContainer.classList.remove('error');
        } else {
            this.input.classList.add('invalid');
            this.validationContainer.textContent = errors.join(', ');
            this.validationContainer.classList.add('error');
        }
    }

    setValue(country) {
        this.selectedCountry = country;
        this.value = country;
        this.updateDisplay();
        this.validate();
        this.emit('change', country);
    }

    validate() {
        let isValid = true;
        let errors = [];

        if (this.config.required && !this.selectedCountry) {
            isValid = false;
            errors.push('Please select a country');
        }

        this.isValid = isValid;
        this.emit('validate', { isValid, errors });
        
        return { isValid, errors };
    }
}

// Export for ES6 imports
export default UserInfoModule;

// Export classes to window for backward compatibility
if (typeof window !== 'undefined') {
    window.UserInfoModule = UserInfoModule;
    window.CountryDropdown = CountryDropdown;
}