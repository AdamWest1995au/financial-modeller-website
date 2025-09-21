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
 * Prepare data for database insertion
 */
function prepareDbData(formData, clientIP, userAgent) {
  return {
    // Required fields
    full_name: formData.full_name.trim(),
    company_name: formData.company_name.trim(),
    email: formData.email.trim().toLowerCase(),
    phone: formData.phone ? formData.phone.trim() : null,
    country_name: formData.country_name ? formData.country_name.trim() : null,
    
    // Optional location data
    country_code: formData.country_code ? formData.country_code.trim() : null,
    country_flag: formData.country_flag || null,
    
    // Industry information
    industry_dropdown: formData.industry_dropdown || null,
    industry_freetext: formData.industry_freetext || null,
    
    // NEW: Conditional question fields
    quick_parameters_choice: formData.quick_parameters_choice || null,
    model_periodicity: formData.model_periodicity || null,
    historical_start_date: formData.historical_start_date || null,
    forecast_years: formData.forecast_years || null,
    
    // Business model questions (JSONB fields)
    model_purpose_selected: formData.model_purpose_selected || null,
    model_purpose_freetext: formData.model_purpose_freetext || null,
    modeling_approach: formData.modeling_approach || null,
    revenue_generation_selected: formData.revenue_generation_selected || null,
    revenue_generation_freetext: formData.revenue_generation_freetext || null,
    revenue_staff: formData.revenue_staff || null,
    
    // Metadata
    ip_address: clientIP,
    user_agent: userAgent,
    submission_count: 1,
    
    // Honeypot fields for spam detection
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

    console.log('📝 Form data received:', {
      full_name: formData.full_name ? '✓' : '✗',
      company_name: formData.company_name ? '✓' : '✗',
      email: formData.email ? '✓' : '✗',
      phone: formData.phone ? '✓' : '✗',
      country_name: formData.country_name ? '✓' : '✗',
      // NEW: Log conditional question fields
      quick_parameters_choice: formData.quick_parameters_choice ? '✓' : '✗',
      model_periodicity: formData.model_periodicity ? '✓' : '✗',
      historical_start_date: formData.historical_start_date ? '✓' : '✗',
      forecast_years: formData.forecast_years ? '✓' : '✗',
      hasRecaptchaToken: !!formData.recaptchaToken
    })
    
    // NEW: Debug log for conditional question values
    console.log('🔧 Conditional question values:', {
      quick_parameters_choice: formData.quick_parameters_choice,
      model_periodicity: formData.model_periodicity,
      historical_start_date: formData.historical_start_date,
      forecast_years: formData.forecast_years
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
    console.log('📦 Database data prepared')
    
    // NEW: Debug log for database data being inserted
    console.log('💾 Database data being inserted:', {
      ...dbData,
      // Don't log sensitive data, just show structure
      email: dbData.email ? '[EMAIL]' : null,
      phone: dbData.phone ? '[PHONE]' : null
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
        // NEW: Include conditional question fields in response
        quick_parameters_choice: data.quick_parameters_choice,
        model_periodicity: data.model_periodicity,
        historical_start_date: data.historical_start_date,
        forecast_years: data.forecast_years
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