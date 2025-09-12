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

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Rate limiting
const formLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Max 3 submissions per IP
  message: { error: 'Too many submissions. Please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Add this AFTER your rate limiting setup and BEFORE your routes
const verifyCaptcha = async (token) => {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    })
    const data = await response.json()
    return data.success
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return false
  }
}

// Routes - ALL ROUTES MUST BE BEFORE app.listen()

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    supabaseConnected: !!process.env.SUPABASE_URL
  })
})

// Form submission endpoint - UPDATE this existing route
app.post('/api/submit-questionnaire', formLimiter, async (req, res) => {
  try {
    // Honeypot check (add this if you haven't already)
    if (req.body.website || req.body.phone) {
      console.log('Honeypot triggered - bot detected from IP:', req.ip)
      return res.status(400).json({ error: 'Invalid submission' })
    }

    // reCAPTCHA verification - ADD THIS
    if (!req.body.captcha) {
      return res.status(400).json({ error: 'Please complete the captcha' })
    }

    const captchaValid = await verifyCaptcha(req.body.captcha)
    if (!captchaValid) {
      console.log('reCAPTCHA failed for IP:', req.ip)
      return res.status(400).json({ error: 'Captcha verification failed' })
    }

    // Rest of your existing code...
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
    
    console.log('Received submission from IP:', clientIP)
    console.log('Form data:', req.body)
    
    const submissionData = {
      ...req.body,
      ip_address: clientIP,
      user_agent: req.headers['user-agent'] || 'unknown'
      // Don't save the captcha token to database
    }
    
    // Remove captcha from data before saving
    delete submissionData.captcha
    
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .insert([submissionData])
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    console.log('Successfully saved to database:', data)
    res.json({ success: true, message: 'Questionnaire submitted successfully!' })
    
  } catch (error) {
    console.error('Submission error:', error)
    res.status(400).json({ error: error.message })
  }
})

// Catch-all route for SPA (should be last route)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Start server - THIS MUST BE LAST
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📁 Serving files from: ${path.join(__dirname, 'public')}`)
  console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL ? 'Connected' : 'Missing'}`)
})