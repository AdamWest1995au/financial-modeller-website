// /pages/questionnaire/config/database-schema.js - COMPLETE VERSION WITH TAXES
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

            // Assets Questions
            assets: {
                asset_types_selected: 'array|null',
                asset_types_freetext: 'string|null',
                multiple_depreciation_methods: 'enum:yes,no'
            },

            // Working Capital Questions
            workingCapital: {
                multiple_inventory_methods: 'enum:yes,no',
                inventory_days_outstanding: 'enum:yes,no',
                prepaid_expenses_days: 'enum:yes,no'
            },

            // Taxes Questions - NEW
            taxes: {
                corporate_tax_enabled: 'boolean',
                value_tax_enabled: 'boolean',
                corporate_tax_model: 'string|null',
                corporate_tax_model_custom: 'string|null',
                value_tax_model: 'string|null',
                value_tax_model_custom: 'string|null'
            },

            // Customization Preferences - UPDATED WITH TAXES
            customization: {
                customization_revenue: 'boolean',
                customization_cogs: 'boolean',
                customization_expenses: 'boolean',
                customization_assets: 'boolean',
                customization_working_capital: 'boolean',
                customization_taxes: 'boolean',
                customization_debt: 'boolean',
                customization_equity: 'boolean',
                customization_summary: 'json|null'
            },

            // Security and tracking
            security: {
                ip_address: 'string|null',
                user_agent: 'string|null',
                submission_count: 'integer',
                honeypot_website: 'string|null',
                honeypot_phone: 'string|null'
            }
        };

        // Type validators
        this.validators = {
            'string': (value) => typeof value === 'string',
            'integer': (value) => Number.isInteger(value),
            'boolean': (value) => typeof value === 'boolean',
            'array': (value) => Array.isArray(value),
            'json': (value) => typeof value === 'object' && value !== null,
            'string|null': (value) => value === null || typeof value === 'string',
            'integer|null': (value) => value === null || Number.isInteger(value),
            'boolean|null': (value) => value === null || typeof value === 'boolean',
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

            // Assets defaults
            asset_types_selected: null,
            asset_types_freetext: null,
            multiple_depreciation_methods: 'no',

            // Working Capital defaults
            multiple_inventory_methods: 'no',
            inventory_days_outstanding: 'no',
            prepaid_expenses_days: 'no',

            // Taxes defaults - NEW
            corporate_tax_enabled: false,
            value_tax_enabled: false,
            corporate_tax_model: null,
            corporate_tax_model_custom: null,
            value_tax_model: null,
            value_tax_model_custom: null,

            // Customization defaults - UPDATED WITH TAXES
            customization_revenue: false,
            customization_cogs: false,
            customization_expenses: false,
            customization_assets: false,
            customization_working_capital: false,
            customization_taxes: false,
            customization_debt: false,
            customization_equity: false,
            customization_summary: null,

            // Security defaults
            ip_address: null,
            user_agent: null,
            submission_count: 1,
            honeypot_website: null,
            honeypot_phone: null
        };

        // Apply defaults for any missing fields
        Object.entries(defaults).forEach(([field, defaultValue]) => {
            if (!(field in dbData)) {
                dbData[field] = defaultValue;
            }
        });

        return dbData;
    }

    validateDatabaseData(dbData) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Validate each field against its type
        Object.entries(this.fieldMappings).forEach(([section, fields]) => {
            Object.entries(fields).forEach(([fieldName, expectedType]) => {
                if (fieldName in dbData) {
                    const value = dbData[fieldName];
                    const validator = this.validators[expectedType];
                    
                    if (validator && !validator(value)) {
                        result.isValid = false;
                        result.errors.push(`Field '${fieldName}' has invalid type. Expected: ${expectedType}, Got: ${typeof value}`);
                    }
                }
            });
        });

        // Validate required fields
        const requiredFields = ['full_name', 'company_name', 'email', 'phone'];
        requiredFields.forEach(field => {
            if (!dbData[field] || (typeof dbData[field] === 'string' && dbData[field].trim() === '')) {
                result.isValid = false;
                result.errors.push(`Required field '${field}' is missing or empty`);
            }
        });

        // Validate email format
        if (dbData.email) {
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
            version: '2.1.0',
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

            // Assets
            asset_types_selected: 'Array of selected asset types (PPE, Land, Investment Properties, custom)',
            asset_types_freetext: 'Custom asset types entered by user',
            multiple_depreciation_methods: 'Whether to model depreciation using multiple methods',

            // Working Capital
            multiple_inventory_methods: 'Whether to use multiple inventory methods',
            inventory_days_outstanding: 'Whether to model inventory days outstanding',
            prepaid_expenses_days: 'Whether to model prepaid expenses days',

            // Taxes - NEW DESCRIPTIONS
            corporate_tax_enabled: 'Whether entity pays corporate tax',
            value_tax_enabled: 'Whether entity pays value added tax (VAT/GST)',
            corporate_tax_model: 'Selected corporate tax modeling approach',
            corporate_tax_model_custom: 'Custom corporate tax modeling details',
            value_tax_model: 'Selected VAT/GST modeling approach',
            value_tax_model_custom: 'Custom VAT/GST modeling details',

            // Customization - UPDATED WITH TAXES
            customization_revenue: 'Whether revenue section is customized',
            customization_cogs: 'Whether COGS section is customized',
            customization_expenses: 'Whether expenses section is customized',
            customization_assets: 'Whether assets section is customized',
            customization_working_capital: 'Whether working capital section is customized',
            customization_taxes: 'Whether taxes section is customized',
            customization_debt: 'Whether debt section is customized',
            customization_equity: 'Whether equity section is customized',
            customization_summary: 'JSON summary of all customization choices',

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

            // Assets mapping
            'assets.selectedAssets': 'asset_types_selected',
            'assets.multipleDepreciationMethods': 'multiple_depreciation_methods',

            // Working Capital mapping
            'working-capital.multipleInventoryMethods': 'multiple_inventory_methods',
            'working-capital.inventoryDaysOutstanding': 'inventory_days_outstanding',
            'working-capital.prepaidExpensesDays': 'prepaid_expenses_days',

            // Taxes mapping - NEW
            'taxes.corporateTax': 'corporate_tax_enabled',
            'taxes.valueTax': 'value_tax_enabled',
            'taxes.corporateTaxModel': 'corporate_tax_model',
            'taxes.corporateTaxModelFreeText': 'corporate_tax_model_custom',
            'taxes.valueTaxModel': 'value_tax_model',
            'taxes.valueTaxModelFreeText': 'value_tax_model_custom',

            // Customization mapping - UPDATED WITH TAXES
            'customization.revenueCustomization': 'customization_revenue',
            'customization.cogsCustomization': 'customization_cogs',
            'customization.expensesCustomization': 'customization_expenses',
            'customization.assetsCustomization': 'customization_assets',
            'customization.workingCapitalCustomization': 'customization_working_capital',
            'customization.taxesCustomization': 'customization_taxes',
            'customization.debtCustomization': 'customization_debt',
            'customization.equityCustomization': 'customization_equity'
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