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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Trust proxy for accurate IP addresses
app.set('trust proxy', true)

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')))

// Supabase client - Using service key for bypassing RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Changed to service key for proper permissions
)

// Rate limiting
const formLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // Increased to 5 submissions per IP for testing
  message: { error: 'Too many submissions. Please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// reCAPTCHA verification function
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

// Validate required fields
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

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Check for spam using honeypot fields
const checkSpam = (formData) => {
  const honeypotFields = ['honeypot_website', 'website', 'honeypot_phone']
  
  for (const field of honeypotFields) {
    if (formData[field] && formData[field].trim() !== '') {
      console.log('Spam detected: honeypot field filled:', field, formData[field])
      return true
    }
  }
  
  return false
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
    supabaseConnected: !!process.env.SUPABASE_URL,
    hasRecaptchaKey: !!process.env.RECAPTCHA_SECRET_KEY
  })
})

// UPDATED: Form submission endpoint with proper data handling
app.post('/api/submit-questionnaire', formLimiter, async (req, res) => {
  console.log('API called - Method:', req.method)
  console.log('Environment check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasRecaptchaKey: !!process.env.RECAPTCHA_SECRET_KEY
  })

  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || null
    
    console.log('Client info:', { ip: clientIP, userAgent })
    
    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase environment variables')
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

    console.log('Form data received:', {
      full_name: formData.full_name ? 'Present' : 'Missing',
      company_name: formData.company_name ? 'Present' : 'Missing',
      email: formData.email ? 'Present' : 'Missing',
      phone: formData.phone ? 'Present' : 'Missing',
      country_name: formData.country_name ? 'Present' : 'Missing',
      hasRecaptchaToken: !!formData.recaptchaToken
    })
    
    // Check for spam
    if (checkSpam(formData)) {
      return res.status(400).json({ 
        error: 'Submission failed validation',
        message: 'Your submission could not be processed'
      })
    }
    console.log('Spam check passed')
    
    // Verify reCAPTCHA if provided
    if (formData.recaptchaToken) {
      const isValidRecaptcha = await verifyCaptcha(formData.recaptchaToken)
      if (!isValidRecaptcha) {
        return res.status(400).json({ 
          error: 'Invalid reCAPTCHA',
          message: 'Please complete the reCAPTCHA verification and try again'
        })
      }
      console.log('reCAPTCHA verification passed')
    } else {
      console.log('No reCAPTCHA token provided')
    }
    
    // Validate required fields
    const validation = validateRequiredFields(formData)
    if (!validation.isValid) {
      console.log('Missing required fields:', validation.missingFields)
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: `Please complete the following fields: ${validation.missingFields.join(', ')}`,
        missing: validation.missingFields 
      })
    }
    console.log('Required fields validation passed')

    // Validate email format
    if (!validateEmail(formData.email)) {
      console.log('Invalid email format:', formData.email)
      return res.status(400).json({ 
        error: 'Invalid email format',
        message: 'Please enter a valid email address'
      })
    }
    console.log('Email validation passed')

    // Prepare data for database insertion
    const dbData = {
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
      
      // Conditional question fields
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
      charging_models: formData.charging_models || null,
      product_procurement_selected: formData.product_procurement_selected || null,
      product_procurement_freetext: formData.product_procurement_freetext || null,
      sales_channels_selected: formData.sales_channels_selected || null,
      sales_channels_freetext: formData.sales_channels_freetext || null,
      revenue_staff: formData.revenue_staff || null,
      
      // Metadata
      ip_address: clientIP,
      user_agent: userAgent,
      submission_count: 1,
      
      // Honeypot fields for spam detection
      honeypot_website: formData.honeypot_website || null,
      honeypot_phone: formData.honeypot_phone || null
    }
    
    console.log('Database data prepared')
    
    // Insert data into Supabase
    console.log('Inserting data into database...')
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .insert([dbData])
      .select()
      .single() // Get single record instead of array

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Failed to save your submission. Please try again.',
        details: error.message 
      })
    }

    if (!data || !data.id) {
      console.error('No data returned from database insert')
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Failed to create submission record'
      })
    }

    console.log('Data successfully inserted with ID:', data.id)

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
        email: data.email
      }
    })

  } catch (error) {
    console.error('Unexpected API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Catch-all route for SPA (should be last route)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Start server - THIS MUST BE LAST
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Serving files from: ${path.join(__dirname, 'public')}`)
  console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'Connected' : 'Missing'}`)
  console.log(`reCAPTCHA configured: ${process.env.RECAPTCHA_SECRET_KEY ? 'Yes' : 'No'}`)
})