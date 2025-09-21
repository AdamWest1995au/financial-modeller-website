import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Simple in-memory rate limiting (resets on function restart)
const rateLimitMap = new Map()

/**
 * Rate limiting function
 */
function checkRateLimit(ip, maxRequests = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [])
  }
  
  const requests = rateLimitMap.get(ip)
  
  // Remove old requests outside the window
  const recentRequests = requests.filter(time => time > windowStart)
  
  if (recentRequests.length >= maxRequests) {
    return false // Rate limit exceeded
  }
  
  // Add current request
  recentRequests.push(now)
  rateLimitMap.set(ip, recentRequests)
  
  return true // Request allowed
}

/**
 * Verify reCAPTCHA token
 */
async function verifyRecaptcha(token) {
  if (!token) {
    console.log('⚠️ No reCAPTCHA token provided')
    return false
  }
  
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  if (!secretKey) {
    console.error('❌ RECAPTCHA_SECRET_KEY not configured')
    return true // Allow if not configured (for testing)
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
    console.log('🔐 reCAPTCHA verification result:', data.success)
    return data.success
  } catch (error) {
    console.error('❌ reCAPTCHA verification error:', error)
    return false
  }
}

/**
 * Validate required fields
 */
function validateRequiredFields(formData) {
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
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check for spam using honeypot fields
 */
function checkSpam(formData) {
  // Check honeypot fields - if any are filled, it's likely spam
  const honeypotFields = ['honeypot_website', 'website', 'honeypot_phone']
  
  for (const field of honeypotFields) {
    if (formData[field] && formData[field].trim() !== '') {
      console.log('🚨 Spam detected: honeypot field filled:', field, formData[field])
      return true
    }
  }
  
  return false
}

/**
 * COMPREHENSIVE DEBUG: Map frontend field names to database field names
 */
function mapFormDataToDatabase(formData) {
  console.log('🔄 === FIELD MAPPING DEBUG ===')
  console.log('🔄 Input form data keys:', Object.keys(formData))
  
  // Create a mapping of frontend names to database names
  const fieldMappings = {
    // Frontend might send these, but database expects these:
    'inventory_days_outstanding_method': 'inventory_days_outstanding',
    'prepaid_expenses_days_method': 'prepaid_expenses_days',
    'dividends_paid_when_declared': 'equity_financing_approach', // or map to correct field
    'is_generic_cogs_codb': null, // ignore this field
    'is_generic_working_capital': null, // ignore this field 
    'is_generic_assets': null, // ignore this field
    'is_generic_equity_financing': null, // ignore this field
  }
  
  // Start with the original form data
  const mappedData = { ...formData }
  
  // Apply field mappings
  Object.entries(fieldMappings).forEach(([frontendField, databaseField]) => {
    if (frontendField in mappedData) {
      if (databaseField === null) {
        // Remove this field
        delete mappedData[frontendField]
        console.log(`🗑️ Removed field: ${frontendField}`)
      } else {
        // Rename the field
        mappedData[databaseField] = mappedData[frontendField]
        delete mappedData[frontendField]
        console.log(`🔄 Mapped: ${frontendField} → ${databaseField}`)
      }
    }
  })
  
  console.log('🔄 Mapped form data keys:', Object.keys(mappedData))
  console.log('🔄 === END FIELD MAPPING DEBUG ===')
  
  return mappedData
}

/**
 * COMPREHENSIVE DEBUG: Convert frontend values to database-compatible formats
 */
function convertFormValues(formData) {
  console.log('🔧 === VALUE CONVERSION DEBUG ===')
  
  const converted = { ...formData }
  
  // Convert 'active'/'inactive' to 'yes'/'no' for specific fields
  const activeToYesFields = [
    'manufactures_products',
    'multiple_depreciation_methods',
    'units_of_production_depreciation', 
    'multiple_inventory_methods',
    'inventory_days_outstanding',
    'prepaid_expenses_days',
    'revenue_staff'
  ]
  
  activeToYesFields.forEach(field => {
    if (converted[field] === 'active') {
      converted[field] = 'yes'
      console.log(`🔧 Converted ${field}: 'active' → 'yes'`)
    } else if (converted[field] === 'inactive') {
      converted[field] = 'no'
      console.log(`🔧 Converted ${field}: 'inactive' → 'no'`)
    }
  })
  
  // Convert boolean to proper database format for tax fields
  if (typeof converted.corporate_tax_enabled === 'boolean') {
    console.log(`🔧 corporate_tax_enabled: ${converted.corporate_tax_enabled} (boolean)`)
  }
  if (typeof converted.value_tax_enabled === 'boolean') {
    console.log(`🔧 value_tax_enabled: ${converted.value_tax_enabled} (boolean)`)
  }
  
  // Log customization fields
  const customizationFields = [
    'customization_revenue', 'customization_cogs', 'customization_expenses',
    'customization_assets', 'customization_working_capital', 'customization_taxes',
    'customization_debt', 'customization_equity'
  ]
  
  customizationFields.forEach(field => {
    if (field in converted) {
      console.log(`🔧 ${field}: ${converted[field]} (${typeof converted[field]})`)
    }
  })
  
  console.log('🔧 === END VALUE CONVERSION DEBUG ===')
  
  return converted
}

/**
 * FIXED AND DEBUGGED: Complete data preparation function
 */
function prepareDbData(formData, clientIP, userAgent) {
  console.log('📦 === DATABASE PREPARATION DEBUG ===')
  console.log('📦 Original form data keys:', Object.keys(formData).sort())
  console.log('📦 Sample values:')
  Object.entries(formData).slice(0, 10).forEach(([key, value]) => {
    console.log(`   ${key}: ${value} (${typeof value})`)
  })
  
  // Step 1: Map field names
  const mappedData = mapFormDataToDatabase(formData)
  
  // Step 2: Convert values  
  const convertedData = convertFormValues(mappedData)
  
  // Step 3: Build final database object with all possible fields
  const dbData = {
    // ===== REQUIRED FIELDS =====
    full_name: convertedData.full_name ? convertedData.full_name.trim() : null,
    company_name: convertedData.company_name ? convertedData.company_name.trim() : null,
    email: convertedData.email ? convertedData.email.trim().toLowerCase() : null,
    phone: convertedData.phone ? convertedData.phone.trim() : null,
    country_name: convertedData.country_name ? convertedData.country_name.trim() : null,
    
    // ===== OPTIONAL LOCATION DATA =====
    country_code: convertedData.country_code ? convertedData.country_code.trim() : null,
    country_flag: convertedData.country_flag || null,
    
    // ===== INDUSTRY INFORMATION =====
    industry_dropdown: convertedData.industry_dropdown || null,
    industry_freetext: convertedData.industry_freetext || null,
    
    // ===== CONDITIONAL QUESTION FIELDS =====
    quick_parameters_choice: convertedData.quick_parameters_choice || null,
    model_periodicity: convertedData.model_periodicity || null,
    historical_start_date: convertedData.historical_start_date || null,
    forecast_years: convertedData.forecast_years ? parseInt(convertedData.forecast_years) : null,
    
    // ===== BUSINESS MODEL QUESTIONS (JSONB FIELDS) =====
    model_purpose_selected: convertedData.model_purpose_selected || null,
    model_purpose_freetext: convertedData.model_purpose_freetext || null,
    modeling_approach: convertedData.modeling_approach || null,
    revenue_generation_selected: convertedData.revenue_generation_selected || null,
    revenue_generation_freetext: convertedData.revenue_generation_freetext || null,
    revenue_staff: convertedData.revenue_staff || null,
    
    // ===== REVENUE & SALES FIELDS =====
    charging_models: convertedData.charging_models || null,
    product_procurement_selected: convertedData.product_procurement_selected || null,
    product_procurement_freetext: convertedData.product_procurement_freetext || null,
    sales_channels_selected: convertedData.sales_channels_selected || null,
    sales_channels_freetext: convertedData.sales_channels_freetext || null,
    
    // ===== MANUFACTURING =====
    manufactures_products: convertedData.manufactures_products || null,
    
    // ===== ASSETS FIELDS =====
    asset_types_selected: convertedData.asset_types_selected || null,
    asset_types_freetext: convertedData.asset_types_freetext || null,
    multiple_depreciation_methods: convertedData.multiple_depreciation_methods || null,
    units_of_production_depreciation: convertedData.units_of_production_depreciation || null,
    
    // ===== WORKING CAPITAL FIELDS =====
    multiple_inventory_methods: convertedData.multiple_inventory_methods || null,
    inventory_days_outstanding: convertedData.inventory_days_outstanding || null,
    prepaid_expenses_days: convertedData.prepaid_expenses_days || null,
    
    // ===== TAX FIELDS =====
    corporate_tax_enabled: convertedData.corporate_tax_enabled !== undefined ? 
      Boolean(convertedData.corporate_tax_enabled) : null,
    value_tax_enabled: convertedData.value_tax_enabled !== undefined ? 
      Boolean(convertedData.value_tax_enabled) : null,
    corporate_tax_model: convertedData.corporate_tax_model || null,
    corporate_tax_model_custom: convertedData.corporate_tax_model_custom || null,
    value_tax_model: convertedData.value_tax_model || null,
    value_tax_model_custom: convertedData.value_tax_model_custom || null,
    
    // ===== CUSTOMIZATION FIELDS =====
    customization_revenue: convertedData.customization_revenue !== undefined ? 
      Boolean(convertedData.customization_revenue) : null,
    customization_cogs: convertedData.customization_cogs !== undefined ? 
      Boolean(convertedData.customization_cogs) : null,
    customization_expenses: convertedData.customization_expenses !== undefined ? 
      Boolean(convertedData.customization_expenses) : null,
    customization_assets: convertedData.customization_assets !== undefined ? 
      Boolean(convertedData.customization_assets) : null,
    customization_working_capital: convertedData.customization_working_capital !== undefined ? 
      Boolean(convertedData.customization_working_capital) : null,
    customization_taxes: convertedData.customization_taxes !== undefined ? 
      Boolean(convertedData.customization_taxes) : null,
    customization_debt: convertedData.customization_debt !== undefined ? 
      Boolean(convertedData.customization_debt) : null,
    customization_equity: convertedData.customization_equity !== undefined ? 
      Boolean(convertedData.customization_equity) : null,
    customization_summary: convertedData.customization_summary || null,
    
    // ===== EQUITY FINANCING FIELDS =====
    equity_financing_approach: convertedData.equity_financing_approach || 
      convertedData.dividends_paid_when_declared || null, // Handle both field names
    equity_financing_custom: convertedData.equity_financing_custom || null,
    equity_financing_details: convertedData.equity_financing_details || null,
    
    // ===== COMPLETION TRACKING FIELDS =====
    questionnaire_completion_status: convertedData.questionnaire_completion_status || 'completed',
    total_completion_time_seconds: convertedData.total_completion_time_seconds ? 
      parseInt(convertedData.total_completion_time_seconds) : null,
    modules_completed: convertedData.modules_completed || null,
    skipped_modules: convertedData.skipped_modules || null,
    
    // ===== METADATA =====
    ip_address: clientIP,
    user_agent: userAgent,
    submission_count: 1,
    
    // ===== HONEYPOT FIELDS =====
    honeypot_website: convertedData.honeypot_website || null,
    honeypot_phone: convertedData.honeypot_phone || null
  }
  
  // Log final database object (without sensitive data)
  console.log('📦 Final database object keys:', Object.keys(dbData).sort())
  console.log('📦 Non-null field count:', Object.values(dbData).filter(v => v !== null).length)
  console.log('📦 Required fields check:')
  console.log(`   full_name: ${dbData.full_name}`)
  console.log(`   company_name: ${dbData.company_name}`)
  console.log(`   email: ${dbData.email}`)
  console.log(`   phone: ${dbData.phone}`)
  console.log(`   country_name: ${dbData.country_name}`)
  
  console.log('📦 === END DATABASE PREPARATION DEBUG ===')
  
  return dbData
}

/**
 * Main API handler with comprehensive debugging
 */
export default async function handler(req, res) {
  console.log('\n\n🚀 =============== API CALL START ===============')
  console.log('🚀 Method:', req.method)
  console.log('🚀 Timestamp:', new Date().toISOString())
  console.log('🔧 Environment check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasRecaptchaKey: !!process.env.RECAPTCHA_SECRET_KEY,
    supabaseUrlPreview: process.env.SUPABASE_URL ? 
      process.env.SUPABASE_URL.substring(0, 30) + '...' : 'missing'
  })

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight OPTIONS request handled')
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method)
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    })
  }

  try {
    // Get client information
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                    req.headers['x-real-ip'] || 
                    req.connection?.remoteAddress || 
                    'unknown'
    
    const userAgent = req.headers['user-agent'] || null
    
    console.log('👤 Client info:', { ip: clientIP, userAgent })
    
    // Check rate limit (5 requests per 15 minutes)
    if (!checkRateLimit(clientIP)) {
      console.log('🚫 Rate limit exceeded for IP:', clientIP)
      return res.status(429).json({ 
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again in 15 minutes.',
        retryAfter: '15 minutes'
      })
    }
    console.log('✅ Rate limit check passed')
    
    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing Supabase environment variables')
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Please contact support if this error persists'
      })
    }
    console.log('✅ Environment variables validated')

    // Extract and validate form data
    const formData = req.body
    
    if (!formData || typeof formData !== 'object') {
      console.error('❌ Invalid request body')
      return res.status(400).json({ 
        error: 'Invalid request body',
        message: 'Request body must be a valid JSON object'
      })
    }

    console.log('📝 === FORM DATA ANALYSIS ===')
    console.log('📝 Total fields received:', Object.keys(formData).length)
    console.log('📝 All form data keys:', Object.keys(formData).sort())
    
    // Show sample of the actual data (first 20 fields)
    console.log('📝 Sample form data:')
    Object.entries(formData).slice(0, 20).forEach(([key, value]) => {
      const valuePreview = typeof value === 'string' && value.length > 50 ? 
        value.substring(0, 50) + '...' : value
      console.log(`   ${key}: ${valuePreview} (${typeof value})`)
    })
    
    // Check for spam
    if (checkSpam(formData)) {
      console.log('🚨 Spam detected')
      return res.status(400).json({ 
        error: 'Submission failed validation',
        message: 'Your submission could not be processed'
      })
    }
    console.log('✅ Spam check passed')
    
    // Verify reCAPTCHA
    if (formData.recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptcha(formData.recaptchaToken)
      if (!isValidRecaptcha) {
        console.log('❌ reCAPTCHA verification failed')
        return res.status(400).json({ 
          error: 'Invalid reCAPTCHA',
          message: 'Please complete the reCAPTCHA verification and try again'
        })
      }
      console.log('✅ reCAPTCHA verification passed')
    } else {
      console.log('⚠️ No reCAPTCHA token provided')
    }
    
    // Validate required fields
    const validation = validateRequiredFields(formData)
    if (!validation.isValid) {
      console.log('❌ Missing required fields:', validation.missingFields)
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: `Please complete the following fields: ${validation.missingFields.join(', ')}`,
        missing: validation.missingFields 
      })
    }
    console.log('✅ Required fields validation passed')

    // Validate email format
    if (!validateEmail(formData.email)) {
      console.log('❌ Invalid email format:', formData.email)
      return res.status(400).json({ 
        error: 'Invalid email format',
        message: 'Please enter a valid email address'
      })
    }
    console.log('✅ Email validation passed')

    // Prepare data for database insertion with full debugging
    const dbData = prepareDbData(formData, clientIP, userAgent)
    
    console.log('💾 === DATABASE INSERTION DEBUG ===')
    console.log('💾 About to insert into Supabase...')
    console.log('💾 Supabase client status:', supabase ? 'initialized' : 'not initialized')

    // Insert data into Supabase with detailed error handling
    let insertResult
    try {
      insertResult = await supabase
        .from('questionnaire_responses')
        .insert([dbData])
        .select()
        .single()
      
      console.log('💾 Supabase insert completed')
      console.log('💾 Insert result status:', insertResult.error ? 'ERROR' : 'SUCCESS')
      
    } catch (supabaseError) {
      console.error('💾 Supabase client error:', supabaseError)
      return res.status(500).json({ 
        error: 'Database connection error',
        message: 'Failed to connect to database. Please try again.',
        details: supabaseError.message 
      })
    }

    // Check for Supabase errors
    if (insertResult.error) {
      console.error('💾 Supabase insert error:', insertResult.error)
      console.error('💾 Error details:', {
        message: insertResult.error.message,
        details: insertResult.error.details,
        hint: insertResult.error.hint,
        code: insertResult.error.code
      })
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to save your submission. Please try again.'
      if (insertResult.error.message?.includes('duplicate')) {
        errorMessage = 'A submission with this information already exists.'
      } else if (insertResult.error.message?.includes('constraint')) {
        errorMessage = 'Some of the provided data is invalid. Please check your entries.'
      } else if (insertResult.error.message?.includes('column')) {
        errorMessage = 'Database schema mismatch. Please contact support.'
      }
      
      return res.status(500).json({ 
        error: 'Database error',
        message: errorMessage,
        details: insertResult.error.message,
        supabaseError: insertResult.error
      })
    }

    // Check if data was actually inserted
    if (!insertResult.data || !insertResult.data.id) {
      console.error('💾 No data returned from database insert')
      console.error('💾 Insert result:', insertResult)
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Failed to create submission record'
      })
    }

    console.log('✅ Data successfully inserted with ID:', insertResult.data.id)
    console.log('✅ Created at:', insertResult.data.created_at)

    // Success response
    const successResponse = { 
      success: true, 
      message: 'Questionnaire submitted successfully',
      submission_id: insertResult.data.id,
      data: {
        id: insertResult.data.id,
        created_at: insertResult.data.created_at,
        full_name: insertResult.data.full_name,
        company_name: insertResult.data.company_name,
        email: insertResult.data.email,
        questionnaire_completion_status: insertResult.data.questionnaire_completion_status
      }
    }
    
    console.log('✅ Sending success response:', successResponse)
    console.log('🚀 =============== API CALL END ===============\n\n')
    
    return res.status(200).json(successResponse)

  } catch (error) {
    console.error('❌ =============== UNEXPECTED ERROR ===============')
    console.error('❌ Error type:', error.constructor.name)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ =============== END ERROR ===============')
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorType: error.constructor.name
    })
  }
}