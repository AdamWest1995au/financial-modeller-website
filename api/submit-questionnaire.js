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
 * Prepare data for database insertion - COMPLETE VERSION WITH ALL FIELDS
 */
function prepareDbData(formData, clientIP, userAgent) {
  return {
    // ==================== REQUIRED FIELDS ====================
    full_name: formData.full_name.trim(),
    company_name: formData.company_name.trim(),
    email: formData.email.trim().toLowerCase(),
    phone: formData.phone ? formData.phone.trim() : null,
    country_name: formData.country_name ? formData.country_name.trim() : null,
    
    // ==================== OPTIONAL LOCATION DATA ====================
    country_code: formData.country_code ? formData.country_code.trim() : null,
    country_flag: formData.country_flag || null,
    
    // ==================== INDUSTRY INFORMATION ====================
    industry_dropdown: formData.industry_dropdown || null,
    industry_freetext: formData.industry_freetext || null,
    
    // ==================== CONDITIONAL QUESTION FIELDS ====================
    quick_parameters_choice: formData.quick_parameters_choice || null,
    model_periodicity: formData.model_periodicity || null,
    historical_start_date: formData.historical_start_date || null,
    forecast_years: formData.forecast_years || null,
    
    // ==================== BUSINESS MODEL QUESTIONS (JSONB FIELDS) ====================
    model_purpose_selected: formData.model_purpose_selected || null,
    model_purpose_freetext: formData.model_purpose_freetext || null,
    modeling_approach: formData.modeling_approach || null,
    
    // ==================== REVENUE FIELDS ====================
    revenue_generation_selected: formData.revenue_generation_selected || null,
    revenue_generation_freetext: formData.revenue_generation_freetext || null,
    charging_models: formData.charging_models || null,
    product_procurement_selected: formData.product_procurement_selected || null,
    product_procurement_freetext: formData.product_procurement_freetext || null,
    sales_channels_selected: formData.sales_channels_selected || null,
    sales_channels_freetext: formData.sales_channels_freetext || null,
    revenue_staff: formData.revenue_staff || null,
    
    // ==================== ASSETS FIELDS ====================
    asset_types_selected: formData.asset_types_selected || null,
    asset_types_freetext: formData.asset_types_freetext || null,
    multiple_depreciation_methods: formData.multiple_depreciation_methods || null,
    units_of_production_depreciation: formData.units_of_production_depreciation || null,
    manufactures_products: formData.manufactures_products || null,
    
    // ==================== WORKING CAPITAL FIELDS ====================
    multiple_inventory_methods: formData.multiple_inventory_methods || null,
    inventory_days_outstanding: formData.inventory_days_outstanding || null,
    prepaid_expenses_days: formData.prepaid_expenses_days || null,
    
    // ==================== TAXES FIELDS ====================
    corporate_tax_enabled: formData.corporate_tax_enabled || null,
    value_tax_enabled: formData.value_tax_enabled || null,
    corporate_tax_model: formData.corporate_tax_model || null,
    corporate_tax_model_custom: formData.corporate_tax_model_custom || null,
    value_tax_model: formData.value_tax_model || null,
    value_tax_model_custom: formData.value_tax_model_custom || null,
    
    // ==================== CUSTOMIZATION FIELDS ====================
    customization_revenue: formData.customization_revenue || null,
    customization_cogs: formData.customization_cogs || null,
    customization_expenses: formData.customization_expenses || null,
    customization_assets: formData.customization_assets || null,
    customization_working_capital: formData.customization_working_capital || null,
    customization_taxes: formData.customization_taxes || null,
    customization_debt: formData.customization_debt || null,
    customization_equity: formData.customization_equity || null,
    customization_summary: formData.customization_summary || null,
    
    // ==================== EQUITY FINANCING FIELDS ====================
    equity_financing_approach: formData.equity_financing_approach || null,
    equity_financing_custom: formData.equity_financing_custom || null,
    equity_financing_details: formData.equity_financing_details || null,
    
    // ==================== QUESTIONNAIRE COMPLETION TRACKING ====================
    questionnaire_completion_status: formData.questionnaire_completion_status || 'pending',
    total_completion_time_seconds: formData.total_completion_time_seconds || null,
    modules_completed: formData.modules_completed || null,
    skipped_modules: formData.skipped_modules || null,
    
    // ==================== METADATA ====================
    ip_address: clientIP,
    user_agent: userAgent,
    submission_count: 1,
    
    // ==================== HONEYPOT FIELDS FOR SPAM DETECTION ====================
    honeypot_website: formData.honeypot_website || null,
    honeypot_phone: formData.honeypot_phone || null
    
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

    // COMPLETE FORM DATA LOGGING - ALL FIELDS
    console.log('📝 Form data received:', {
      // Required fields
      full_name: formData.full_name ? '✓' : '✗',
      company_name: formData.company_name ? '✓' : '✗',
      email: formData.email ? '✓' : '✗',
      phone: formData.phone ? '✓' : '✗',
      country_name: formData.country_name ? '✓' : '✗',
      
      // Parameters
      quick_parameters_choice: formData.quick_parameters_choice ? '✓' : '✗',
      model_periodicity: formData.model_periodicity ? '✓' : '✗',
      historical_start_date: formData.historical_start_date ? '✓' : '✗',
      forecast_years: formData.forecast_years ? '✓' : '✗',
      
      // Business model
      model_purpose_selected: formData.model_purpose_selected ? '✓' : '✗',
      modeling_approach: formData.modeling_approach ? '✓' : '✗',
      
      // Revenue fields
      revenue_generation_selected: formData.revenue_generation_selected ? '✓' : '✗',
      charging_models: formData.charging_models ? '✓' : '✗',
      product_procurement_selected: formData.product_procurement_selected ? '✓' : '✗',
      sales_channels_selected: formData.sales_channels_selected ? '✓' : '✗',
      revenue_staff: formData.revenue_staff ? '✓' : '✗',
      
      // Assets fields
      asset_types_selected: formData.asset_types_selected ? '✓' : '✗',
      multiple_depreciation_methods: formData.multiple_depreciation_methods ? '✓' : '✗',
      units_of_production_depreciation: formData.units_of_production_depreciation ? '✓' : '✗',
      manufactures_products: formData.manufactures_products ? '✓' : '✗',
      
      // Working capital fields
      multiple_inventory_methods: formData.multiple_inventory_methods ? '✓' : '✗',
      inventory_days_outstanding: formData.inventory_days_outstanding ? '✓' : '✗',
      prepaid_expenses_days: formData.prepaid_expenses_days ? '✓' : '✗',
      
      // Taxes fields
      corporate_tax_enabled: formData.corporate_tax_enabled ? '✓' : '✗',
      value_tax_enabled: formData.value_tax_enabled ? '✓' : '✗',
      corporate_tax_model: formData.corporate_tax_model ? '✓' : '✗',
      value_tax_model: formData.value_tax_model ? '✓' : '✗',
      
      // Customization fields
      customization_revenue: formData.customization_revenue ? '✓' : '✗',
      customization_cogs: formData.customization_cogs ? '✓' : '✗',
      customization_expenses: formData.customization_expenses ? '✓' : '✗',
      customization_assets: formData.customization_assets ? '✓' : '✗',
      customization_working_capital: formData.customization_working_capital ? '✓' : '✗',
      customization_taxes: formData.customization_taxes ? '✓' : '✗',
      customization_debt: formData.customization_debt ? '✓' : '✗',
      customization_equity: formData.customization_equity ? '✓' : '✗',
      
      // Completion tracking
      questionnaire_completion_status: formData.questionnaire_completion_status ? '✓' : '✗',
      total_completion_time_seconds: formData.total_completion_time_seconds ? '✓' : '✗',
      modules_completed: formData.modules_completed ? '✓' : '✗',
      skipped_modules: formData.skipped_modules ? '✓' : '✗',
      
      // Equity financing
      equity_financing_approach: formData.equity_financing_approach ? '✓' : '✗',
      equity_financing_details: formData.equity_financing_details ? '✓' : '✗',
      
      hasRecaptchaToken: !!formData.recaptchaToken
    })
    
    // Debug log with actual values (not just checkmarks) for key fields
    console.log('🔧 Key field values debug:', {
      quick_parameters_choice: formData.quick_parameters_choice,
      model_periodicity: formData.model_periodicity,
      charging_models: formData.charging_models,
      asset_types_selected: formData.asset_types_selected,
      customization_revenue: formData.customization_revenue,
      questionnaire_completion_status: formData.questionnaire_completion_status,
      corporate_tax_enabled: formData.corporate_tax_enabled,
      modules_completed: formData.modules_completed
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

    // Prepare data for database insertion
    const dbData = prepareDbData(formData, clientIP, userAgent)
    console.log('📦 Database data prepared with', Object.keys(dbData).length, 'fields')
    
    // Debug log for database data being inserted (show structure, not sensitive data)
    console.log('💾 Database data structure being inserted:', {
      requiredFields: ['full_name', 'company_name', 'email', 'phone', 'country_name'].map(f => f + ': ' + (dbData[f] ? 'SET' : 'NULL')).join(', '),
      parameterFields: ['quick_parameters_choice', 'model_periodicity', 'forecast_years'].map(f => f + ': ' + (dbData[f] ? 'SET' : 'NULL')).join(', '),
      revenueFields: ['revenue_generation_selected', 'charging_models', 'revenue_staff'].map(f => f + ': ' + (dbData[f] ? 'SET' : 'NULL')).join(', '),
      assetFields: ['asset_types_selected', 'multiple_depreciation_methods'].map(f => f + ': ' + (dbData[f] ? 'SET' : 'NULL')).join(', '),
      customizationFields: ['customization_revenue', 'customization_cogs', 'customization_taxes'].map(f => f + ': ' + (dbData[f] ? 'SET' : 'NULL')).join(', '),
      completionFields: ['questionnaire_completion_status', 'modules_completed'].map(f => f + ': ' + (dbData[f] ? 'SET' : 'NULL')).join(', ')
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

    // COMPLETE SUCCESS RESPONSE - ALL FIELDS
    return res.status(200).json({ 
      success: true, 
      message: 'Questionnaire submitted successfully',
      submission_id: data.id, // This is what the frontend expects
      data: {
        // Basic info
        id: data.id,
        created_at: data.created_at,
        full_name: data.full_name,
        company_name: data.company_name,
        email: data.email,
        phone: data.phone,
        country_name: data.country_name,
        country_code: data.country_code,
        industry_dropdown: data.industry_dropdown,
        industry_freetext: data.industry_freetext,
        
        // Parameters
        quick_parameters_choice: data.quick_parameters_choice,
        model_periodicity: data.model_periodicity,
        historical_start_date: data.historical_start_date,
        forecast_years: data.forecast_years,
        
        // Business model
        model_purpose_selected: data.model_purpose_selected,
        model_purpose_freetext: data.model_purpose_freetext,
        modeling_approach: data.modeling_approach,
        
        // Revenue fields
        revenue_generation_selected: data.revenue_generation_selected,
        revenue_generation_freetext: data.revenue_generation_freetext,
        charging_models: data.charging_models,
        product_procurement_selected: data.product_procurement_selected,
        product_procurement_freetext: data.product_procurement_freetext,
        sales_channels_selected: data.sales_channels_selected,
        sales_channels_freetext: data.sales_channels_freetext,
        revenue_staff: data.revenue_staff,
        
        // Assets fields
        asset_types_selected: data.asset_types_selected,
        asset_types_freetext: data.asset_types_freetext,
        multiple_depreciation_methods: data.multiple_depreciation_methods,
        units_of_production_depreciation: data.units_of_production_depreciation,
        manufactures_products: data.manufactures_products,
        
        // Working capital
        multiple_inventory_methods: data.multiple_inventory_methods,
        inventory_days_outstanding: data.inventory_days_outstanding,
        prepaid_expenses_days: data.prepaid_expenses_days,
        
        // Taxes
        corporate_tax_enabled: data.corporate_tax_enabled,
        value_tax_enabled: data.value_tax_enabled,
        corporate_tax_model: data.corporate_tax_model,
        corporate_tax_model_custom: data.corporate_tax_model_custom,
        value_tax_model: data.value_tax_model,
        value_tax_model_custom: data.value_tax_model_custom,
        
        // Customization
        customization_revenue: data.customization_revenue,
        customization_cogs: data.customization_cogs,
        customization_expenses: data.customization_expenses,
        customization_assets: data.customization_assets,
        customization_working_capital: data.customization_working_capital,
        customization_taxes: data.customization_taxes,
        customization_debt: data.customization_debt,
        customization_equity: data.customization_equity,
        customization_summary: data.customization_summary,
        
        // Completion tracking
        questionnaire_completion_status: data.questionnaire_completion_status,
        total_completion_time_seconds: data.total_completion_time_seconds,
        modules_completed: data.modules_completed,
        skipped_modules: data.skipped_modules,
        
        // Equity financing
        equity_financing_approach: data.equity_financing_approach,
        equity_financing_custom: data.equity_financing_custom,
        equity_financing_details: data.equity_financing_details
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