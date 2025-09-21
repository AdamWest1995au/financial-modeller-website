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
 * FIXED: Complete data preparation function with ALL database fields
 */
function prepareDbData(formData, clientIP, userAgent) {
  return {
    // ===== REQUIRED FIELDS =====
    full_name: formData.full_name ? formData.full_name.trim() : null,
    company_name: formData.company_name ? formData.company_name.trim() : null,
    email: formData.email ? formData.email.trim().toLowerCase() : null,
    phone: formData.phone ? formData.phone.trim() : null,
    country_name: formData.country_name ? formData.country_name.trim() : null,
    
    // ===== OPTIONAL LOCATION DATA =====
    country_code: formData.country_code ? formData.country_code.trim() : null,
    country_flag: formData.country_flag || null,
    
    // ===== INDUSTRY INFORMATION =====
    industry_dropdown: formData.industry_dropdown || null,
    industry_freetext: formData.industry_freetext || null,
    
    // ===== CONDITIONAL QUESTION FIELDS =====
    quick_parameters_choice: formData.quick_parameters_choice || null,
    model_periodicity: formData.model_periodicity || null,
    historical_start_date: formData.historical_start_date || null,
    forecast_years: formData.forecast_years ? parseInt(formData.forecast_years) : null,
    
    // ===== BUSINESS MODEL QUESTIONS (JSONB FIELDS) =====
    model_purpose_selected: formData.model_purpose_selected || null,
    model_purpose_freetext: formData.model_purpose_freetext || null,
    modeling_approach: formData.modeling_approach || null,
    revenue_generation_selected: formData.revenue_generation_selected || null,
    revenue_generation_freetext: formData.revenue_generation_freetext || null,
    revenue_staff: formData.revenue_staff || null,
    
    // ===== MISSING FIELDS - THESE WERE CAUSING NULL VALUES =====
    
    // Revenue & Sales Fields
    charging_models: formData.charging_models || null,
    product_procurement_selected: formData.product_procurement_selected || null,
    product_procurement_freetext: formData.product_procurement_freetext || null,
    sales_channels_selected: formData.sales_channels_selected || null,
    sales_channels_freetext: formData.sales_channels_freetext || null,
    
    // Manufacturing
    manufactures_products: formData.manufactures_products || null,
    
    // Assets Fields
    asset_types_selected: formData.asset_types_selected || null,
    asset_types_freetext: formData.asset_types_freetext || null,
    multiple_depreciation_methods: formData.multiple_depreciation_methods || null,
    units_of_production_depreciation: formData.units_of_production_depreciation || null,
    
    // Working Capital Fields
    multiple_inventory_methods: formData.multiple_inventory_methods || null,
    inventory_days_outstanding: formData.inventory_days_outstanding || null,
    prepaid_expenses_days: formData.prepaid_expenses_days || null,
    
    // Tax Fields
    corporate_tax_enabled: formData.corporate_tax_enabled !== undefined ? 
      Boolean(formData.corporate_tax_enabled) : null,
    value_tax_enabled: formData.value_tax_enabled !== undefined ? 
      Boolean(formData.value_tax_enabled) : null,
    corporate_tax_model: formData.corporate_tax_model || null,
    corporate_tax_model_custom: formData.corporate_tax_model_custom || null,
    value_tax_model: formData.value_tax_model || null,
    value_tax_model_custom: formData.value_tax_model_custom || null,
    
    // Customization Fields (Boolean flags)
    customization_revenue: formData.customization_revenue !== undefined ? 
      Boolean(formData.customization_revenue) : null,
    customization_cogs: formData.customization_cogs !== undefined ? 
      Boolean(formData.customization_cogs) : null,
    customization_expenses: formData.customization_expenses !== undefined ? 
      Boolean(formData.customization_expenses) : null,
    customization_assets: formData.customization_assets !== undefined ? 
      Boolean(formData.customization_assets) : null,
    customization_working_capital: formData.customization_working_capital !== undefined ? 
      Boolean(formData.customization_working_capital) : null,
    customization_taxes: formData.customization_taxes !== undefined ? 
      Boolean(formData.customization_taxes) : null,
    customization_debt: formData.customization_debt !== undefined ? 
      Boolean(formData.customization_debt) : null,
    customization_equity: formData.customization_equity !== undefined ? 
      Boolean(formData.customization_equity) : null,
    customization_summary: formData.customization_summary || null,
    
    // Equity Financing Fields
    equity_financing_approach: formData.equity_financing_approach || null,
    equity_financing_custom: formData.equity_financing_custom || null,
    equity_financing_details: formData.equity_financing_details || null,
    
    // Completion Tracking Fields
    questionnaire_completion_status: formData.questionnaire_completion_status || 'pending',
    total_completion_time_seconds: formData.total_completion_time_seconds ? 
      parseInt(formData.total_completion_time_seconds) : null,
    modules_completed: formData.modules_completed || null,
    skipped_modules: formData.skipped_modules || null,
    
    // ===== METADATA =====
    ip_address: clientIP,
    user_agent: userAgent,
    submission_count: 1,
    
    // ===== HONEYPOT FIELDS FOR SPAM DETECTION =====
    honeypot_website: formData.honeypot_website || null,
    honeypot_phone: formData.honeypot_phone || null
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

    console.log('📝 Form data received:', {
      full_name: formData.full_name ? '✓' : '✗',
      company_name: formData.company_name ? '✓' : '✗',
      email: formData.email ? '✓' : '✗',
      phone: formData.phone ? '✓' : '✗',
      country_name: formData.country_name ? '✓' : '✗',
      // Additional fields that were missing
      charging_models: formData.charging_models ? '✓' : '✗',
      asset_types_selected: formData.asset_types_selected ? '✓' : '✗',
      customization_revenue: formData.customization_revenue !== undefined ? '✓' : '✗',
      corporate_tax_enabled: formData.corporate_tax_enabled !== undefined ? '✓' : '✗',
      hasRecaptchaToken: !!formData.recaptchaToken
    })
    
    // Debug log all received form fields
    console.log('🔧 All form data keys:', Object.keys(formData))
    
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

    // Prepare data for database insertion - NOW WITH ALL FIELDS
    const dbData = prepareDbData(formData, clientIP, userAgent)
    console.log('📦 Database data prepared with all fields')
    
    // Debug log database data being inserted (without sensitive info)
    console.log('💾 Database fields being inserted:', {
      requiredFields: ['full_name', 'company_name', 'email', 'phone', 'country_name'].map(f => 
        f + ': ' + (dbData[f] ? '✓' : '✗')).join(', '),
      conditionalFields: ['quick_parameters_choice', 'model_periodicity', 'forecast_years'].map(f => 
        f + ': ' + (dbData[f] ? '✓' : '✗')).join(', '),
      revenueFields: ['charging_models', 'product_procurement_selected', 'sales_channels_selected'].map(f => 
        f + ': ' + (dbData[f] ? '✓' : '✗')).join(', '),
      assetFields: ['asset_types_selected', 'multiple_depreciation_methods'].map(f => 
        f + ': ' + (dbData[f] ? '✓' : '✗')).join(', '),
      taxFields: ['corporate_tax_enabled', 'value_tax_enabled'].map(f => 
        f + ': ' + (dbData[f] !== null ? '✓' : '✗')).join(', '),
      customizationFields: ['customization_revenue', 'customization_assets', 'customization_taxes'].map(f => 
        f + ': ' + (dbData[f] !== null ? '✓' : '✗')).join(', ')
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
        // Include some of the new fields in response
        quick_parameters_choice: data.quick_parameters_choice,
        model_periodicity: data.model_periodicity,
        forecast_years: data.forecast_years,
        questionnaire_completion_status: data.questionnaire_completion_status
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