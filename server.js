const express = require('express')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const rateLimit = require('express-rate-limit')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' })) // Increased limit for large form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Trust proxy for accurate IP addresses
app.set('trust proxy', true)

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')))

// Supabase client - Using service key for bypassing RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Rate limiting for form submissions
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 submissions per IP per window
  message: { 
    error: 'Too many submissions', 
    message: 'Please wait 15 minutes before submitting again.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown'
})

// Helper Functions

/**
 * Verify reCAPTCHA token
 */
const verifyCaptcha = async (token) => {
  if (!token) {
    console.log('No reCAPTCHA token provided')
    return false
  }
  
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY not configured')
    return true // Allow if not configured (for testing)
  }
  
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`
    })
    const data = await response.json()
    console.log('reCAPTCHA verification result:', data.success)
    return data.success
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return false
  }
}

/**
 * Validate required fields
 */
const validateRequiredFields = (formData) => {
  const requiredFields = ['full_name', 'company_name', 'email', 'phone', 'country_name']
  const missingFields = requiredFields.filter(field => 
    !formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')
  )
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Check for spam using honeypot fields
 */
const checkSpam = (formData) => {
  const honeypotFields = ['honeypot_website', 'website', 'honeypot_phone']
  
  for (const field of honeypotFields) {
    if (formData[field] && formData[field].trim() !== '') {
      console.log('Spam detected: honeypot field filled:', field)
      return true
    }
  }
  return false
}

/**
 * Safely parse JSON strings
 */
const safeParseJSON = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (e) {
      return value // Return as string if not valid JSON
    }
  }
  return value
}

/**
 * Convert string boolean values to actual booleans
 */
const convertBoolean = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === 'yes' || lower === 'active') return true
    if (lower === 'false' || lower === 'no' || lower === 'inactive') return false
  }
  return value
}

/**
 * Log comprehensive form data analysis
 */
const logFormDataAnalysis = (formData) => {
  console.log('=== COMPLETE FORM DATA ANALYSIS ===')
  
  const fieldCategories = {
    'REQUIRED': ['full_name', 'company_name', 'email', 'phone', 'country_name'],
    'LOCATION': ['country_code', 'country_flag', 'industry_dropdown', 'industry_freetext'],
    'PARAMETERS': ['quick_parameters_choice', 'model_periodicity', 'historical_start_date', 'forecast_years'],
    'BUSINESS_MODEL': ['model_purpose_selected', 'model_purpose_freetext', 'modeling_approach'],
    'REVENUE': ['revenue_generation_selected', 'revenue_generation_freetext', 'charging_models', 'product_procurement_selected', 'product_procurement_freetext', 'sales_channels_selected', 'sales_channels_freetext', 'revenue_staff'],
    'ASSETS': ['asset_types_selected', 'asset_types_freetext', 'multiple_depreciation_methods', 'units_of_production_depreciation', 'manufactures_products'],
    'WORKING_CAPITAL': ['multiple_inventory_methods', 'inventory_days_outstanding', 'prepaid_expenses_days'],
    'TAXES': ['corporate_tax_enabled', 'value_tax_enabled', 'corporate_tax_model', 'corporate_tax_model_custom', 'value_tax_model', 'value_tax_model_custom'],
    'CUSTOMIZATION': ['customization_revenue', 'customization_cogs', 'customization_expenses', 'customization_assets', 'customization_working_capital', 'customization_taxes', 'customization_debt', 'customization_equity', 'customization_summary'],
    'EQUITY': ['equity_financing_approach', 'equity_financing_custom', 'equity_financing_details'],
    'COMPLETION': ['questionnaire_completion_status', 'total_completion_time_seconds', 'modules_completed', 'skipped_modules'],
    'SECURITY': ['recaptchaToken', 'honeypot_website', 'honeypot_phone']
  }
  
  for (const [category, fields] of Object.entries(fieldCategories)) {
    const categoryData = {}
    fields.forEach(field => {
      const value = formData[field]
      if (value === null || value === undefined || value === '') {
        categoryData[field] = 'NULL'
      } else if (Array.isArray(value)) {
        categoryData[field] = `ARRAY[${value.length}]`
      } else if (typeof value === 'object') {
        categoryData[field] = 'OBJECT'
      } else if (typeof value === 'boolean') {
        categoryData[field] = `BOOL(${value})`
      } else {
        categoryData[field] = 'SET'
      }
    })
    console.log(`${category}:`, categoryData)
  }
  
  // Show critical field values
  console.log('CRITICAL VALUES:', {
    email: formData.email || 'NULL',
    company: formData.company_name || 'NULL',
    completion_status: formData.questionnaire_completion_status || 'NULL',
    modules_completed: formData.modules_completed ? (Array.isArray(formData.modules_completed) ? `array[${formData.modules_completed.length}]` : typeof formData.modules_completed) : 'NULL',
    charging_models: formData.charging_models ? typeof formData.charging_models : 'NULL',
    customization_revenue: formData.customization_revenue || 'NULL'
  })
}

// Routes

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    environment: {
      supabaseConnected: !!process.env.SUPABASE_URL,
      hasRecaptchaKey: !!process.env.RECAPTCHA_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  })
})

// COMPLETE QUESTIONNAIRE SUBMISSION ENDPOINT - HANDLES ALL FIELDS
app.post('/api/submit-questionnaire', formLimiter, async (req, res) => {
  const startTime = Date.now()
  
  console.log('============================================')
  console.log('QUESTIONNAIRE SUBMISSION STARTED')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Method:', req.method)
  console.log('============================================')
  
  try {
    // Environment validation
    const envCheck = {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
      hasRecaptchaKey: !!process.env.RECAPTCHA_SECRET_KEY
    }
    console.log('Environment check:', envCheck)
    
    if (!envCheck.hasSupabaseUrl || !envCheck.hasSupabaseKey) {
      console.error('CRITICAL: Missing Supabase environment variables')
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Database connection not configured'
      })
    }
    
    // Extract client information
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'
    console.log('Client info:', { 
      ip: clientIP, 
      userAgent: userAgent.length > 100 ? userAgent.substring(0, 100) + '...' : userAgent 
    })
    
    // Validate request body
    const formData = req.body
    if (!formData || typeof formData !== 'object') {
      console.error('Invalid request body type:', typeof formData)
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Request body must be valid JSON object'
      })
    }
    
    // Log comprehensive form data analysis
    logFormDataAnalysis(formData)
    
    console.log('=== VALIDATION PHASE ===')
    
    // Spam detection
    if (checkSpam(formData)) {
      console.log('SPAM DETECTED - Rejecting submission')
      return res.status(400).json({ 
        error: 'Invalid submission',
        message: 'Submission failed security validation'
      })
    }
    console.log('Spam check: PASSED')
    
    // Required fields validation
    const validation = validateRequiredFields(formData)
    if (!validation.isValid) {
      console.log('Required field validation FAILED:', validation.missingFields)
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: `Please complete the following fields: ${validation.missingFields.join(', ')}`,
        missing: validation.missingFields 
      })
    }
    console.log('Required fields: PASSED')
    
    // Email format validation
    if (!validateEmail(formData.email)) {
      console.log('Email validation FAILED:', formData.email)
      return res.status(400).json({ 
        error: 'Invalid email format',
        message: 'Please enter a valid email address'
      })
    }
    console.log('Email validation: PASSED')
    
    // reCAPTCHA validation (if token provided)
    if (formData.recaptchaToken) {
      console.log('Verifying reCAPTCHA...')
      const recaptchaValid = await verifyCaptcha(formData.recaptchaToken)
      if (!recaptchaValid) {
        console.log('reCAPTCHA validation FAILED')
        return res.status(400).json({ 
          error: 'Security verification failed',
          message: 'Please complete the reCAPTCHA and try again'
        })
      }
      console.log('reCAPTCHA: PASSED')
    } else {
      console.log('reCAPTCHA: SKIPPED (no token provided)')
    }
    
    console.log('=== DATABASE PREPARATION PHASE ===')
    
    // Prepare COMPLETE database data with ALL FIELDS from schema
    const dbData = {
      // ==================== REQUIRED FIELDS ====================
      full_name: formData.full_name ? formData.full_name.trim() : null,
      company_name: formData.company_name ? formData.company_name.trim() : null,
      email: formData.email ? formData.email.trim().toLowerCase() : null,
      phone: formData.phone ? formData.phone.trim() : null,
      country_name: formData.country_name ? formData.country_name.trim() : null,
      
      // ==================== LOCATION & INDUSTRY ====================
      country_code: formData.country_code ? formData.country_code.trim() : null,
      country_flag: formData.country_flag || null,
      industry_dropdown: formData.industry_dropdown || null,
      industry_freetext: formData.industry_freetext || null,
      
      // ==================== MODEL PARAMETERS ====================
      quick_parameters_choice: formData.quick_parameters_choice || null,
      model_periodicity: formData.model_periodicity || null,
      historical_start_date: formData.historical_start_date || null,
      forecast_years: formData.forecast_years ? parseInt(formData.forecast_years) : null,
      
      // ==================== BUSINESS MODEL APPROACH ====================
      model_purpose_selected: safeParseJSON(formData.model_purpose_selected),
      model_purpose_freetext: formData.model_purpose_freetext || null,
      modeling_approach: formData.modeling_approach || null,
      
      // ==================== REVENUE STRUCTURE ====================
      revenue_generation_selected: safeParseJSON(formData.revenue_generation_selected),
      revenue_generation_freetext: formData.revenue_generation_freetext || null,
      charging_models: safeParseJSON(formData.charging_models),
      product_procurement_selected: safeParseJSON(formData.product_procurement_selected),
      product_procurement_freetext: formData.product_procurement_freetext || null,
      sales_channels_selected: safeParseJSON(formData.sales_channels_selected),
      sales_channels_freetext: formData.sales_channels_freetext || null,
      revenue_staff: formData.revenue_staff || null,
      
      // ==================== ASSETS ====================
      asset_types_selected: safeParseJSON(formData.asset_types_selected),
      asset_types_freetext: formData.asset_types_freetext || null,
      multiple_depreciation_methods: formData.multiple_depreciation_methods || null,
      units_of_production_depreciation: formData.units_of_production_depreciation || null,
      manufactures_products: formData.manufactures_products || null,
      
      // ==================== WORKING CAPITAL ====================
      multiple_inventory_methods: formData.multiple_inventory_methods || null,
      inventory_days_outstanding: formData.inventory_days_outstanding || null,
      prepaid_expenses_days: formData.prepaid_expenses_days || null,
      
      // ==================== TAXES ====================
      corporate_tax_enabled: convertBoolean(formData.corporate_tax_enabled),
      value_tax_enabled: convertBoolean(formData.value_tax_enabled),
      corporate_tax_model: formData.corporate_tax_model || null,
      corporate_tax_model_custom: formData.corporate_tax_model_custom || null,
      value_tax_model: formData.value_tax_model || null,
      value_tax_model_custom: formData.value_tax_model_custom || null,
      
      // ==================== CUSTOMIZATION PREFERENCES ====================
      customization_revenue: convertBoolean(formData.customization_revenue),
      customization_cogs: convertBoolean(formData.customization_cogs),
      customization_expenses: convertBoolean(formData.customization_expenses),
      customization_assets: convertBoolean(formData.customization_assets),
      customization_working_capital: convertBoolean(formData.customization_working_capital),
      customization_taxes: convertBoolean(formData.customization_taxes),
      customization_debt: convertBoolean(formData.customization_debt),
      customization_equity: convertBoolean(formData.customization_equity),
      customization_summary: safeParseJSON(formData.customization_summary),
      
      // ==================== EQUITY FINANCING ====================
      equity_financing_approach: formData.equity_financing_approach || null,
      equity_financing_custom: formData.equity_financing_custom || null,
      equity_financing_details: safeParseJSON(formData.equity_financing_details),
      
      // ==================== QUESTIONNAIRE COMPLETION TRACKING ====================
      questionnaire_completion_status: formData.questionnaire_completion_status || 'completed',
      total_completion_time_seconds: formData.total_completion_time_seconds ? parseInt(formData.total_completion_time_seconds) : null,
      modules_completed: safeParseJSON(formData.modules_completed),
      skipped_modules: safeParseJSON(formData.skipped_modules),
      
      // ==================== SYSTEM METADATA ====================
      ip_address: clientIP,
      user_agent: userAgent,
      submission_count: 1,
      
      // ==================== SPAM PROTECTION ====================
      honeypot_website: formData.honeypot_website || null,
      honeypot_phone: formData.honeypot_phone || null
    }
    
    // Remove any undefined values to prevent database errors
    Object.keys(dbData).forEach(key => {
      if (dbData[key] === undefined) {
        dbData[key] = null
      }
    })
    
    console.log('Database data prepared with', Object.keys(dbData).length, 'fields')
    
    // Log data type analysis
    console.log('Data type analysis:')
    const typeAnalysis = {}
    Object.keys(dbData).forEach(key => {
      const value = dbData[key]
      if (value === null) typeAnalysis[key] = 'NULL'
      else if (Array.isArray(value)) typeAnalysis[key] = `ARRAY[${value.length}]`
      else if (typeof value === 'object') typeAnalysis[key] = 'OBJECT'
      else if (typeof value === 'boolean') typeAnalysis[key] = `BOOLEAN(${value})`
      else if (typeof value === 'number') typeAnalysis[key] = `NUMBER(${value})`
      else typeAnalysis[key] = `STRING(${String(value).length})`
    })
    console.log('Field types:', typeAnalysis)
    
    console.log('=== DATABASE INSERTION PHASE ===')
    
    // Insert into Supabase
    console.log('Executing database insert...')
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .insert([dbData])
      .select('*')
      .single()
    
    if (error) {
      console.error('DATABASE ERROR DETAILS:')
      console.error('Message:', error.message)
      console.error('Details:', error.details)
      console.error('Hint:', error.hint)
      console.error('Code:', error.code)
      
      // Log sample values for debugging
      console.error('Sample field values that failed:')
      const sampleFields = ['full_name', 'email', 'charging_models', 'customization_revenue', 'modules_completed', 'corporate_tax_enabled', 'forecast_years']
      sampleFields.forEach(field => {
        const value = dbData[field]
        console.error(`  ${field}: ${typeof value} = ${JSON.stringify(value).substring(0, 200)}`)
      })
      
      return res.status(500).json({ 
        error: 'Database insertion failed',
        message: 'Failed to save your questionnaire submission',
        details: error.message,
        code: error.code
      })
    }
    
    if (!data || !data.id) {
      console.error('No data returned from database insert operation')
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Record was not created successfully'
      })
    }
    
    const endTime = Date.now()
    const processingTime = endTime - startTime
    
    console.log('SUCCESS: Database record created')
    console.log('Record ID:', data.id)
    console.log('Processing time:', processingTime + 'ms')
    console.log('Saved fields count:', Object.keys(data).length)
    console.log('============================================')
    
    // Return comprehensive success response
    return res.status(200).json({ 
      success: true, 
      message: 'Questionnaire submitted successfully',
      submission_id: data.id,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString(),
      fields_saved: Object.keys(data).length,
      data: {
        id: data.id,
        created_at: data.created_at,
        company_name: data.company_name,
        full_name: data.full_name,
        email: data.email,
        questionnaire_completion_status: data.questionnaire_completion_status,
        total_completion_time_seconds: data.total_completion_time_seconds,
        modules_completed: data.modules_completed,
        customization_summary: data.customization_summary,
        charging_models: data.charging_models,
        asset_types_selected: data.asset_types_selected,
        corporate_tax_enabled: data.corporate_tax_enabled
      }
    })
    
  } catch (error) {
    const endTime = Date.now()
    const processingTime = endTime - startTime
    
    console.error('============================================')
    console.error('CRITICAL ERROR IN SUBMISSION HANDLER')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Processing time before error:', processingTime + 'ms')
    console.error('============================================')
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred during submission',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again or contact support',
      timestamp: new Date().toISOString()
    })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasRecaptcha: !!process.env.RECAPTCHA_SECRET_KEY
    }
  })
})

// Catch-all route for SPA (should be last route)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Start server
app.listen(PORT, () => {
  console.log('============================================')
  console.log('SERVER STARTED SUCCESSFULLY')
  console.log(`Running on: http://localhost:${PORT}`)
  console.log(`Static files: ${path.join(__dirname, 'public')}`)
  console.log('Environment:', {
    nodeEnv: process.env.NODE_ENV || 'development',
    supabaseUrl: process.env.SUPABASE_URL ? 'Connected' : 'Missing',
    supabaseKey: process.env.SUPABASE_SERVICE_KEY ? 'Connected' : 'Missing',
    recaptchaKey: process.env.RECAPTCHA_SECRET_KEY ? 'Configured' : 'Missing'
  })
  console.log('============================================')
})