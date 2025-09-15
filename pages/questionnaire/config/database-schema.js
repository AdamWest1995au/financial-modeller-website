// /pages/questionnaire/config/database-schema.js
class DatabaseSchemaMapper {
    constructor() {
        // Database field mappings - MUST NOT CHANGE to maintain compatibility
        this.fieldMappings = {
            // User Information - Required fields
            user: {
                full_name: 'string',
                company_name: 'string', 
                email: 'string',
                phone: 'string',
                country_name: 'string',
                country_code: 'string',
                country_flag: 'string|null',
                industry_dropdown: 'string|null',
                industry_freetext: 'string|null'
            },

            // Model Parameters
            parameters: {
                quick_parameters_choice: 'enum:yes,no',
                model_periodicity: 'string|null',
                historical_start_date: 'string|null', // MMM YY format
                forecast_years: 'integer|null'
            },

            // Modeling Approach
            approach: {
                model_purpose_selected: 'array|null',
                model_purpose_freetext: 'string|null',
                modeling_approach: 'string|null'
            },

            // Revenue Questions
            revenue: {
                revenue_generation_selected: 'array|null',
                revenue_generation_freetext: 'string|null',
                charging_models: 'json|null',
                product_procurement_selected: 'array|null',
                product_procurement_freetext: 'string|null',
                sales_channels_selected: 'array|null',
                sales_channels_freetext: 'string|null',
                revenue_staff: 'enum:yes,no'
            },

            // COGS and CODB (placeholder for future)
            cogs: {
                // Will be added when COGS module is implemented
            },

            // Expenses (placeholder for future)
            expenses: {
                // Will be added when Expenses module is implemented
            },

            // Assets - UPDATED WITH NEW FIELDS
            assets: {
                asset_types_selected: 'array|null',
                asset_types_freetext: 'string|null',
                multiple_depreciation_methods: 'enum:yes,no'
            },

            // Debt (placeholder for future)
            debt: {
                // Will be added when Debt module is implemented
            },

            // Equity (placeholder for future)
            equity: {
                // Will be added when Equity module is implemented
            },

            // Security and Metadata
            security: {
                ip_address: 'string|null',
                user_agent: 'string|null',
                submission_count: 'integer',
                honeypot_website: 'string|null',
                honeypot_phone: 'string|null'
            }
        };

        // Validation rules for each field type
        this.validationRules = {
            string: (value) => typeof value === 'string',
            'string|null': (value) => value === null || typeof value === 'string',
            integer: (value) => Number.isInteger(value),
            'integer|null': (value) => value === null || Number.isInteger(value),
            array: (value) => Array.isArray(value),
            'array|null': (value) => value === null || Array.isArray(value),
            'json|null': (value) => value === null || typeof value === 'object',
            'enum:yes,no': (value) => ['yes', 'no'].includes(value)
        };
    }

    // Transform module data to database format
    transformToDatabase(moduleData) {
        const dbData = {};
        
        // Process each module's data
        Object.entries(moduleData).forEach(([moduleId, moduleSubmissionData]) => {
            Object.assign(dbData, moduleSubmissionData);
        });

        // Ensure all required fields are present with defaults
        this.applyDefaults(dbData);

        // Validate the data structure
        const validation = this.validateDatabaseData(dbData);
        if (!validation.isValid) {
            console.error('Database validation failed:', validation.errors);
            throw new Error('Invalid data structure for database submission');
        }

        return dbData;
    }

    applyDefaults(dbData) {
        const defaults = {
            // User info defaults
            full_name: '',
            company_name: '',
            email: '',
            phone: '',
            country_name: '',
            country_code: '',
            country_flag: null,
            industry_dropdown: null,
            industry_freetext: null,

            // Parameters defaults
            quick_parameters_choice: 'no',
            model_periodicity: null,
            historical_start_date: null,
            forecast_years: null,

            // Approach defaults
            model_purpose_selected: null,
            model_purpose_freetext: null,
            modeling_approach: null,

            // Revenue defaults
            revenue_generation_selected: null,
            revenue_generation_freetext: null,
            charging_models: null,
            product_procurement_selected: null,
            product_procurement_freetext: null,
            sales_channels_selected: null,
            sales_channels_freetext: null,
            revenue_staff: 'no',

            // Assets defaults - NEW
            asset_types_selected: null,
            asset_types_freetext: null,
            multiple_depreciation_methods: 'no',

            // Security defaults
            ip_address: null,
            user_agent: navigator.userAgent || null,
            submission_count: 1,
            honeypot_website: null,
            honeypot_phone: null
        };

        // Apply defaults for missing fields
        Object.entries(defaults).forEach(([field, defaultValue]) => {
            if (dbData[field] === undefined) {
                dbData[field] = defaultValue;
            }
        });
    }

    validateDatabaseData(dbData) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Get all field definitions
        const allFields = {};
        Object.values(this.fieldMappings).forEach(section => {
            Object.assign(allFields, section);
        });

        // Validate each field
        Object.entries(allFields).forEach(([fieldName, fieldType]) => {
            const value = dbData[fieldName];
            
            if (value !== undefined) {
                const validator = this.validationRules[fieldType];
                if (validator && !validator(value)) {
                    result.isValid = false;
                    result.errors.push(`Field '${fieldName}' has invalid type. Expected: ${fieldType}, Got: ${typeof value}`);
                }
            }
        });

        // Check for required fields
        const requiredFields = ['full_name', 'company_name', 'email', 'phone', 'country_name'];
        requiredFields.forEach(field => {
            if (!dbData[field] || dbData[field].toString().trim() === '') {
                result.isValid = false;
                result.errors.push(`Required field '${field}' is missing or empty`);
            }
        });

        // Validate email format
        if (dbData.email && typeof dbData.email === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(dbData.email)) {
                result.isValid = false;
                result.errors.push('Email field has invalid format');
            }
        }

        // Validate arrays are not empty if present
        ['revenue_generation_selected', 'model_purpose_selected', 'asset_types_selected'].forEach(field => {
            if (dbData[field] && Array.isArray(dbData[field]) && dbData[field].length === 0) {
                result.warnings.push(`Field '${field}' is an empty array`);
            }
        });

        return result;
    }

    // Helper to check if data structure matches expected schema
    validateSchema(data) {
        const issues = [];
        const allExpectedFields = {};
        
        // Collect all expected fields
        Object.values(this.fieldMappings).forEach(section => {
            Object.assign(allExpectedFields, section);
        });

        // Check for unexpected fields
        Object.keys(data).forEach(field => {
            if (!allExpectedFields[field]) {
                issues.push(`Unexpected field: ${field}`);
            }
        });

        // Check for missing required fields
        const requiredFields = ['full_name', 'company_name', 'email', 'phone'];
        requiredFields.forEach(field => {
            if (!(field in data)) {
                issues.push(`Missing required field: ${field}`);
            }
        });

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    // Get schema information for documentation
    getSchemaDocumentation() {
        const docs = {
            description: 'Database schema for questionnaire submissions',
            version: '2.0.0',
            tables: {
                questionnaire_submissions: {
                    description: 'Main table for storing questionnaire responses',
                    fields: {}
                }
            }
        };

        // Generate field documentation
        Object.entries(this.fieldMappings).forEach(([section, fields]) => {
            Object.entries(fields).forEach(([fieldName, fieldType]) => {
                docs.tables.questionnaire_submissions.fields[fieldName] = {
                    type: fieldType,
                    section: section,
                    required: this.isFieldRequired(fieldName),
                    description: this.getFieldDescription(fieldName)
                };
            });
        });

        return docs;
    }

    isFieldRequired(fieldName) {
        const requiredFields = [
            'full_name', 'company_name', 'email', 'phone', 'country_name',
            'submission_count'
        ];
        return requiredFields.includes(fieldName);
    }

    getFieldDescription(fieldName) {
        const descriptions = {
            // User fields
            full_name: 'User\'s full name',
            company_name: 'User\'s company name',
            email: 'User\'s email address',
            phone: 'User\'s phone number',
            country_name: 'Selected country name',
            country_code: 'ISO country code',
            country_flag: 'URL to country flag image',
            industry_dropdown: 'Selected industry from dropdown',
            industry_freetext: 'Custom industry text',

            // Parameters
            quick_parameters_choice: 'Whether user wants to enter initial parameters',
            model_periodicity: 'Model time period (quarter/half-year/annual)',
            historical_start_date: 'Historical data start date (MMM YY format)',
            forecast_years: 'Number of forecast years',

            // Approach
            model_purpose_selected: 'Array of selected model purposes',
            model_purpose_freetext: 'Custom model purpose',
            modeling_approach: 'Top-down or bottom-up approach',

            // Revenue
            revenue_generation_selected: 'Array of selected revenue generation methods',
            revenue_generation_freetext: 'Custom revenue generation method',
            charging_models: 'JSON object of charging models per revenue type',
            product_procurement_selected: 'Array of product procurement methods',
            product_procurement_freetext: 'Custom procurement method',
            sales_channels_selected: 'Array of sales channels',
            sales_channels_freetext: 'Custom sales channel',
            revenue_staff: 'Whether company has revenue generating staff',

            // Assets - NEW DESCRIPTIONS
            asset_types_selected: 'Array of selected asset types (PPE, Land, Investment Properties, custom)',
            asset_types_freetext: 'Custom asset types entered by user',
            multiple_depreciation_methods: 'Whether to model depreciation using multiple methods',

            // Security
            ip_address: 'User IP address (for spam detection)',
            user_agent: 'Browser user agent string',
            submission_count: 'Number of submission attempts',
            honeypot_website: 'Honeypot field value (should be empty)',
            honeypot_phone: 'Honeypot field value (should be empty)'
        };

        return descriptions[fieldName] || 'No description available';
    }

    // Migration helpers
    getMigrationMapping() {
        return {
            // Map old response structure to new database fields
            'user-info.userName': 'full_name',
            'user-info.companyName': 'company_name',
            'user-info.email': 'email',
            'user-info.phone': 'phone',
            'user-info.country.name': 'country_name',
            'user-info.country.code': 'country_code',
            'user-info.country.flag': 'country_flag',
            'user-info.industry.dropdown': 'industry_dropdown',
            'user-info.industry.freeText': 'industry_freetext',
            'user-info.parameterToggle': 'quick_parameters_choice',
            
            'combined-parameters.periodicity': 'model_periodicity',
            'combined-parameters.fullDate': 'historical_start_date',
            'combined-parameters.forecastYears': 'forecast_years',
            
            'modeling-approach.selectedPurposes': 'model_purpose_selected',
            'modeling-approach.modelingApproach': 'modeling_approach',
            
            'revenue-structure.selectedRevenues': 'revenue_generation_selected',
            'revenue-structure.chargingModels': 'charging_models',
            'revenue-structure.selectedProcurement': 'product_procurement_selected',
            'revenue-structure.selectedChannels': 'sales_channels_selected',
            'revenue-structure.revenueStaff': 'revenue_staff',

            // Assets mapping - NEW
            'assets.selectedAssets': 'asset_types_selected',
            'assets.multipleDepreciationMethods': 'multiple_depreciation_methods'
        };
    }

    // Convert legacy response format to new database format
    migrateLegacyData(legacyResponses) {
        const dbData = {};
        const mapping = this.getMigrationMapping();
        
        // Apply mapping
        Object.entries(mapping).forEach(([legacyPath, dbField]) => {
            const value = this.getNestedValue(legacyResponses, legacyPath);
            if (value !== undefined) {
                dbData[dbField] = value;
            }
        });

        // Apply defaults and validate
        this.applyDefaults(dbData);
        
        return dbData;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}

// Export for use
window.DatabaseSchemaMapper = DatabaseSchemaMapper;

// Create global instance for easy access
window.dbSchema = new DatabaseSchemaMapper();