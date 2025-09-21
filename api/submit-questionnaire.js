// submit-questionnaire.js - Complete standalone module
// This handles all questionnaire form submissions to Supabase

import { createClient } from '@supabase/supabase-js'
import rateLimit from 'express-rate-limit'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Rate limiting for form submissions
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 submissions per window
  message: {
    error: 'Too many submissions',
    message: 'Please wait 15 minutes before submitting again',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown'
})

// Simple in-memory rate limiting (backup)
const rateLimitMap = new Map()

/**
 * Additional rate limiting check
 */
function checkRateLimit(ip, maxRequests = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [])
  }
  
  const requests = rateLimitMap.get(ip)
  const recentRequests = requests.filter(time => time > windowStart)
  
  if (recentRequests.length >= maxRequests) {
    return false
  }
  
  recentRequests.push(now)
  rateLimitMap.set(ip, recentRequests)
  return true
}

/**
 * Verify reCAPTCHA token
 */
async function verifyRecaptcha(token) {
  if (!token) {
    console.log('No reCAPTCHA token provided')
    return false
  }
  
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY not configured')
    return true // Allow if not configured (for development)
  }
  
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
 * Validate email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Check for spam using honeypot fields
 */
function checkSpam(formData) {
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
 * Validate required fields
 */
function validateRequiredFields(formData) {
  const requiredFields = ['full_name', 'company_name', 'email', 'phone', 'country_name']
  const missingFields = requiredFields.filter(field => {
    const value = formData[field]
    return !value || (typeof value === 'string' && value.trim() === '')
  })
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}

/**
 * Safely parse JSON strings
 */
function safeParseJSON(value) {
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
function convertBoolean(value) {
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
 * Prepare complete database data with all field mappings
 */
function prepareDbData(formData, clientIP, userAgent) {
  console.log('Preparing database data from form submission...')
  
  const dbData = {
    // Required user information
    full_name: formData.full_name ? formData.full_name.trim() : null,
    company_name: formData.company_name ? formData.company_name.trim() : null,
    email: formData.email ? formData.email.trim().toLowerCase() : null,
    phone: formData.phone ? formData.phone.trim() : null,
    country_name: formData.country_name ? formData.country_name.trim() : null,
    
    // Optional location data
    country_code: formData.country_code ? formData.country_code.trim() : null,
    country_flag: formData.country_flag || null,
    
    // Industry information
    industry_dropdown: formData.industry_dropdown || null,
    industry_freetext: formData.industry_freetext || null,
    
    // Model parameters
    quick_parameters_choice: formData.quick_parameters_choice || null,
    model_periodicity: formData.model_periodicity || null,
    historical_start_date: formData.historical_start_date || null,
    forecast_years: formData.forecast_years ? parseInt(formData.forecast_years) : null,
    
    // Business model approach
    model_purpose_selected: safeParseJSON(formData.model_purpose_selected),
    model_purpose_freetext: formData.model_purpose_freetext || null,
    modeling_approach: formData.modeling_approach || null,
    
    // Revenue structure
    revenue_generation_selected: safeParseJSON(formData.revenue_generation_selected),
    revenue_generation_freetext: formData.revenue_generation_freetext || null,
    charging_models: safeParseJSON(formData.charging_models),
    product_procurement_selected: safeParseJSON(formData.product_procurement_selected),
    product_procurement_freetext: formData.product_procurement_freetext || null,
    sales_channels_selected: safeParseJSON(formData.sales_channels_selected),
    sales_channels_freetext: formData.sales_channels_freetext || null,
    revenue_staff: formData.revenue_staff || null,
    
    // Assets information
    asset_types_selected: safeParseJSON(formData.asset_types_selected),
    asset_types_freetext: formData.asset_types_freetext || null,
    multiple_depreciation_methods: formData.multiple_depreciation_methods || null,
    units_of_production_depreciation: formData.units_of_production_depreciation || null,
    manufactures_products: formData.manufactures_products || null,
    
    // Working capital
    multiple_inventory_methods: formData.multiple_inventory_methods || null,
    inventory_days_outstanding: formData.inventory_days_outstanding || null,
    prepaid_expenses_days: formData.prepaid_expenses_days || null,
    
    // Tax information
    corporate_tax_enabled: convertBoolean(formData.corporate_tax_enabled),
    value_tax_enabled: convertBoolean(formData.value_tax_enabled),
    corporate_tax_model: formData.corporate_tax_model || null,
    corporate_tax_model_custom: formData.corporate_tax_model_custom || null,
    value_tax_model: formData.value_tax_model || null,
    value_tax_model_custom: formData.value_tax_model_custom || null,
    
    // Customization preferences
    customization_revenue: convertBoolean(formData.customization_revenue),
    customization_cogs: convertBoolean(formData.customization_cogs),
    customization_expenses: convertBoolean(formData.customization_expenses),
    customization_assets: convertBoolean(formData.customization_assets),
    customization_working_capital: convertBoolean(formData.customization_working_capital),
    customization_taxes: convertBoolean(formData.customization_taxes),
    customization_debt: convertBoolean(formData.customization_debt),
    customization_equity: convertBoolean(formData.customization_equity),
    customization_summary: safeParseJSON(formData.customization_summary),
    
    // Equity financing
    equity_financing_approach: formData.equity_financing_approach || null,
    equity_financing_custom: formData.equity_financing_custom || null,
    equity_financing_details: safeParseJSON(formData.equity_financing_details),
    
    // Questionnaire completion tracking
    questionnaire_completion_status: formData.questionnaire_completion_status || 'completed',
    total_completion_time_seconds: formData.total_completion_time_seconds ? parseInt(formData.total_completion_time_seconds) : null,
    modules_completed: safeParseJSON(formData.modules_completed),
    skipped_modules: safeParseJSON(formData.skipped_modules),
    
    // System metadata
    ip_address: clientIP,
    user_agent: userAgent,
    submission_count: 1,
    
    // Spam protection honeypot fields
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
  return dbData
}

/**
 * Log form data analysis for debugging
 */
function logFormDataAnalysis(formData) {
  console.log('=== FORM DATA ANALYSIS ===')
  
  const fieldCategories = {
    'REQUIRED': ['full_name', 'company_name', 'email', 'phone', 'country_name'],
    'PARAMETERS': ['quick_parameters_choice', 'model_periodicity', 'historical_start_date', 'forecast_years'],
    'BUSINESS': ['model_purpose_selected', 'modeling_approach'],
    'REVENUE': ['revenue_generation_selected', 'charging_models', 'product_procurement_selected', 'sales_channels_selected', 'revenue_staff'],
    'ASSETS': ['asset_types_selected', 'multiple_depreciation_methods', 'units_of_production_depreciation', 'manufactures_products'],
    'WORKING_CAPITAL': ['multiple_inventory_methods', 'inventory_days_outstanding', 'prepaid_expenses_days'],
    'TAXES': ['corporate_tax_enabled', 'value_tax_enabled', 'corporate_tax_model', 'value_tax_model'],
    'CUSTOMIZATION': ['customization_revenue', 'customization_cogs', 'customization_expenses', 'customization_assets', 'customization_working_capital', 'customization_taxes', 'customization_debt', 'customization_equity'],
    'EQUITY': ['equity_financing_approach', 'equity_financing_details'],
    'COMPLETION': ['questionnaire_completion_status', 'total_completion_time_seconds', 'modules_completed', 'skipped_modules']
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
      } else {
        categoryData[field] = 'SET'
      }
    })
    console.log(`${category}:`, categoryData)
  }
  
  // Show sample actual values for key fields
  console.log('KEY VALUES:', {
    email: formData.email || 'NULL',
    company: formData.company_name || 'NULL',
    completion_status: formData.questionnaire_completion_status || 'NULL',
    modules_completed: formData.modules_completed ? (Array.isArray(formData.modules_completed) ? `array[${formData.modules_completed.length}]` : typeof formData.modules_completed) : 'NULL'
  })
}

/**
 * Main questionnaire submission handler
 */
async function handleQuestionnaireSubmission(req, res) {
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
    
    // Additional rate limit check
    if (!checkRateLimit(clientIP)) {
      console.log('Rate limit exceeded for IP:', clientIP)
      return res.status(429).json({ 
        error: 'Too many requests',
        message: 'Please wait 15 minutes before submitting again'
      })
    }
    
    // Validate request body
    const formData = req.body
    if (!formData || typeof formData !== 'object') {
      console.error('Invalid request body type:', typeof formData)
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Request body must be valid JSON object'
      })
    }
    
    // Log detailed form data analysis
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
      const recaptchaValid = await verifyRecaptcha(formData.recaptchaToken)
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
    
    console.log('=== DATABASE INSERTION PHASE ===')
    
    // Prepare database data
    const dbData = prepareDbData(formData, clientIP, userAgent)
    
    // Log what we're about to insert
    console.log('Attempting to insert record with data types:')
    const typeCheck = {}
    Object.keys(dbData).forEach(key => {
      const value = dbData[key]
      if (value === null) typeCheck[key] = 'NULL'
      else if (Array.isArray(value)) typeCheck[key] = `ARRAY[${value.length}]`
      else if (typeof value === 'object') typeCheck[key] = 'OBJECT'
      else if (typeof value === 'boolean') typeCheck[key] = `BOOLEAN(${value})`
      else if (typeof value === 'number') typeCheck[key] = `NUMBER(${value})`
      else typeCheck[key] = `STRING(${String(value).length})`
    })
    console.log('Data types:', typeCheck)
    
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
    console.log('============================================')
    
    // Return comprehensive success response
    return res.status(200).json({ 
      success: true, 
      message: 'Questionnaire submitted successfully',
      submission_id: data.id,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString(),
      data: {
        id: data.id,
        created_at: data.created_at,
        company_name: data.company_name,
        full_name: data.full_name,
        email: data.email,
        questionnaire_completion_status: data.questionnaire_completion_status,
        total_completion_time_seconds: data.total_completion_time_seconds,
        modules_completed: data.modules_completed,
        customization_summary: data.customization_summary
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
}

/**
 * Express route setup function
 */
function setupQuestionnaireRoutes(app) {
  // Apply rate limiting and handle the submission
  app.post('/api/submit-questionnaire', formLimiter, handleQuestionnaireSubmission)
  
  // Test endpoint for debugging
  app.get('/api/questionnaire-test', (req, res) => {
    res.json({
      message: 'Questionnaire submission module is loaded',
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasRecaptchaKey: !!process.env.RECAPTCHA_SECRET_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    })
  })
  
  console.log('Questionnaire submission routes configured')
}

// Export the setup function and individual components
export {
  setupQuestionnaireRoutes,
  handleQuestionnaireSubmission,
  formLimiter,
  verifyRecaptcha,
  validateEmail,
  checkSpam,
  validateRequiredFields,
  prepareDbData
}

// Default export
export default setupQuestionnaireRoutes