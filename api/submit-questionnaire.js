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
 * Prepare data for database insertion - FIXED to include ALL fields
 */
function prepareDbData(formData, clientIP, userAgent) {
  // Helper function to safely extract value
  const safeExtract = (value) => {
    if (value === undefined || value === null || value === '') {
      return null
    }
    return value
  }

  // Helper function to safely extract boolean
  const safeBool = (value) => {
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
    return null
  }

  // Helper function to safely extract integer
  const safeInt = (value) => {
    if (value === undefined || value === null || value === '') return null
    const parsed = parseInt(value)
    return isNaN(parsed) ? null : parsed
  }

  // Helper function to safely extract JSONB
  const safeJsonb = (value) => {
    if (value === undefined || value === null || value === '') return null
    // If it's already an object/array, return as is
    if (typeof value === 'object') return value
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    }
    return null
  }

  return {
    // Required fields
    full_name: formData.full_name ? formData.full_name.trim() : '',
    company_name: formData.company_name ? formData.company_name.trim() : '',
    email: formData.email ? formData.email.trim().toLowerCase() : '',
    phone: formData.phone ? formData.phone.trim() : null,
    country_name: formData.country_name ? formData.country_name.trim() : null,
    
    // Optional location data
    country_code: safeExtract(formData.country_code?.trim()),
    country_flag: safeExtract(formData.country_flag),
    
    // Industry information
    industry_dropdown: safeExtract(formData.industry_dropdown),
    industry_freetext: safeExtract(formData.industry_freetext),
    
    // Conditional question fields
    quick_parameters_choice: safeExtract(formData.quick_parameters_choice),
    model_periodicity: safeExtract(formData.model_periodicity),
    historical_start_date: safeExtract(formData.historical_start_date),
    forecast_years: safeInt(formData.forecast_years),
    
    // Business model questions (JSONB fields)
    model_purpose_selected: safeJsonb(formData.model_purpose_selected),
    model_purpose_freetext: safeExtract(formData.model_purpose_freetext),
    modeling_approach: safeExtract(formData.modeling_approach),
    revenue_generation_selected: safeJsonb(formData.revenue_generation_selected),
    revenue_generation_freetext: safeExtract(formData.revenue_generation_freetext),
    revenue_staff: safeExtract(formData.revenue_staff),
    
    // FIXED: Added all missing revenue-related fields
    charging_models: safeJsonb(formData.charging_models),
    product_procurement_selected: safeJsonb(formData.product_procurement_selected),
    product_procurement_freetext: safeExtract(formData.product_procurement_freetext),
    sales_channels_selected: safeJsonb(formData.sales_channels_selected),
    sales_channels_freetext: safeExtract(formData.sales_channels_freetext),
    
    // FIXED: Added manufacturing field
    manufactures_products: safeExtract(formData.manufactures_products),
    
    // FIXED: Added all asset-related fields
    asset_types_selected: safeJsonb(formData.asset_types_selected),
    asset_types_freetext: safeExtract(formData.asset_types_freetext),
    multiple_depreciation_methods: safeExtract(formData.multiple_depreciation_methods),
    units_of_production_depreciation: safeExtract(formData.units_of_production_depreciation),
    
    // FIXED: Added inventory and working capital fields
    multiple_inventory_methods: safeExtract(formData.multiple_inventory_methods),
    inventory_days_outstanding: safeExtract(formData.inventory_days_outstanding),
    prepaid_expenses_days: safeExtract(formData.prepaid_expenses_days),
    
    // FIXED: Added tax-related fields
    corporate_tax_enabled: safeBool(formData.corporate_tax_enabled),
    value_tax_enabled: safeBool(formData.value_tax_enabled),
    corporate_tax_model: safeExtract(formData.corporate_tax_model),
    corporate_tax_model_custom: safeExtract(formData.corporate_tax_model_custom),
    value_tax_model: safeExtract(formData.value_tax_model),
    value_tax_model_custom: safeExtract(formData.value_tax_model_custom),
    
    // FIXED: Added customization preferences
    customization_revenue: safeBool(formData.customization_revenue),
    customization_cogs: safeBool(formData.customization_cogs),
    customization_expenses: safeBool(formData.customization_expenses),
    customization_assets: safeBool(formData.customization_assets),
    customization_working_capital: safeBool(formData.customization_working_capital),
    customization_taxes: safeBool(formData.customization_taxes),
    customization_debt: safeBool(formData.customization_debt),
    customization_equity: safeBool(formData.customization_equity),
    customization_summary: safeJsonb(formData.customization_summary),
    
    // FIXED: Added equity financing fields
    equity_financing_approach: safeExtract(formData.equity_financing_approach),
    equity_financing_custom: safeExtract(formData.equity_financing_custom),
    equity_financing_details: safeJsonb(formData.equity_financing_details),
    
    // FIXED: Added completion tracking fields
    questionnaire_completion_status: safeExtract(formData.questionnaire_completion_status) || 'completed',
    total_completion_time_seconds: safeInt(formData.total_completion_time_seconds) || 
                                   (formData.completion_time ? Math.round(formData.completion_time / 1000) : null),
    modules_completed: safeJsonb(formData.modules_completed),
    skipped_modules: safeJsonb(formData.skipped_modules),
    
    // Metadata
    ip_address: clientIP,
    user_agent: userAgent,
    submission_count: 1,
    
    // Honeypot fields for spam detection
    honeypot_website: safeExtract(formData.honeypot_website),
    honeypot_phone: safeExtract(formData.honeypot_phone)
    
    // Note: created_at and updated_at will be automatically added by Supabase if they exist in the schema
  }
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
  console.log('🚀 API called - Method:', req.method)
  console.log('🔧 Environment check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasRecaptchaKey: !!process.env.RECAPTCHA_SECRET_KEY
  })

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
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
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
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
    
    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing Supabase environment variables')
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Please contact support if this error persists'
      })
    }

    // Extract and validate form data
    const formData = req.body
    
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid request body',
        message: 'Request body must be a valid JSON object'
      })
    }

    console.log('📝 Form data received - field check:', {
      // Required fields
      full_name: formData.full_name ? '✓' : '✗',
      company_name: formData.company_name ? '✓' : '✗',
      email: formData.email ? '✓' : '✗',
      phone: formData.phone ? '✓' : '✗',
      country_name: formData.country_name ? '✓' : '✗',
      
      // Conditional fields
      quick_parameters_choice: formData.quick_parameters_choice ? '✓' : '✗',
      model_periodicity: formData.model_periodicity ? '✓' : '✗',
      historical_start_date: formData.historical_start_date ? '✓' : '✗',
      forecast_years: formData.forecast_years ? '✓' : '✗',
      
      // Revenue fields
      charging_models: formData.charging_models ? '✓' : '✗',
      product_procurement_selected: formData.product_procurement_selected ? '✓' : '✗',
      sales_channels_selected: formData.sales_channels_selected ? '✓' : '✗',
      
      // Asset fields
      asset_types_selected: formData.asset_types_selected ? '✓' : '✗',
      multiple_depreciation_methods: formData.multiple_depreciation_methods ? '✓' : '✗',
      
      // Tax fields
      corporate_tax_enabled: formData.corporate_tax_enabled !== undefined ? '✓' : '✗',
      value_tax_enabled: formData.value_tax_enabled !== undefined ? '✓' : '✗',
      
      // Customization fields
      customization_summary: formData.customization_summary ? '✓' : '✗',
      
      // Completion tracking
      modules_completed: formData.modules_completed ? '✓' : '✗',
      
      // Security
      hasRecaptchaToken: !!formData.recaptchaToken
    })
    
    // FIXED: Debug log for all received values
    console.log('🔧 All received field values:', {
      ...formData,
      // Mask sensitive data
      email: formData.email ? '[MASKED]' : null,
      phone: formData.phone ? '[MASKED]' : null,
      full_name: formData.full_name ? '[MASKED]' : null
    })
    
    // Check for spam
    if (checkSpam(formData)) {
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

    // Prepare data for database insertion with ALL fields
    const dbData = prepareDbData(formData, clientIP, userAgent)
    console.log('📦 Database data prepared with all fields')
    
    // FIXED: Enhanced debug log showing all fields being inserted
    console.log('💾 Complete database data being inserted:', {
      ...dbData,
      // Mask sensitive fields
      email: '[MASKED]',
      phone: '[MASKED]',
      full_name: '[MASKED]',
      ip_address: '[MASKED]',
      // Show field counts for JSONB fields
      charging_models_count: Array.isArray(dbData.charging_models) ? dbData.charging_models.length : 'N/A',
      asset_types_count: Array.isArray(dbData.asset_types_selected) ? dbData.asset_types_selected.length : 'N/A',
      modules_completed_count: Array.isArray(dbData.modules_completed) ? dbData.modules_completed.length : 'N/A'
    })

    // Insert data into Supabase
    console.log('💾 Inserting data into database...')
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .insert([dbData])
      .select()
      .single() // Get single record instead of array

    if (error) {
      console.error('❌ Supabase error:', error)
      console.error('❌ Error details:', error.details)
      console.error('❌ Error hint:', error.hint)
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Failed to save your submission. Please try again.',
        details: error.message 
      })
    }

    if (!data || !data.id) {
      console.error('❌ No data returned from database insert')
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Failed to create submission record'
      })
    }

    console.log('✅ Data successfully inserted with ID:', data.id)

    // Success response - return submission_id directly at root level
    return res.status(200).json({ 
      success: true, 
      message: 'Questionnaire submitted successfully',
      submission_id: data.id, // This is what the frontend expects
      data: {
        id: data.id,
        created_at: data.created_at,
        full_name: data.full_name,
        company_name: data.company_name,
        email: data.email,
        // Include all submitted fields in response for confirmation
        quick_parameters_choice: data.quick_parameters_choice,
        model_periodicity: data.model_periodicity,
        historical_start_date: data.historical_start_date,
        forecast_years: data.forecast_years,
        questionnaire_completion_status: data.questionnaire_completion_status,
        modules_completed: data.modules_completed
      }
    })

  } catch (error) {
    console.error('❌ Unexpected API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}