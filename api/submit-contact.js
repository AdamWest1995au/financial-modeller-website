// =================================================================
// Contact Form API Endpoint for Vercel - FIXED VERSION
// File: /api/submit-contact.js
// =================================================================

import { createClient } from '@supabase/supabase-js';
import DOMPurify from 'isomorphic-dompurify';

// Debug environment variables
console.log('Environment check:', {
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV
});

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  console.error('Missing SUPABASE_URL environment variable');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY environment variable');
}

// Initialize Supabase client with validation
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('Supabase client initialized successfully');
  } else {
    console.error('Cannot initialize Supabase - missing environment variables');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

// Rate limiting store (in-memory)
const submissionCooldowns = new Map();

// Input validation schemas
const validationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-'\.]+$/
  },
  email: {
    required: true,
    maxLength: 255,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    required: false,
    maxLength: 20,
    pattern: /^[\+]?[1-9][\d\s\-\(\)]{7,19}$/
  },
  message: {
    required: true,
    minLength: 10,
    maxLength: 2000
  }
};

// Field messages for validation errors
const fieldMessages = {
  name: 'Name contains invalid characters',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  message: 'Message contains invalid content'
};

// Validation function
function validateInput(field, value, rules) {
  if (!value && rules.required) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
  }
  
  if (!value) return null; // Skip validation for optional empty fields
  
  if (rules.minLength && value.length < rules.minLength) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${rules.minLength} characters`;
  }
  
  if (rules.maxLength && value.length > rules.maxLength) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be no more than ${rules.maxLength} characters`;
  }
  
  if (rules.pattern && !rules.pattern.test(value)) {
    return fieldMessages[field] || `${field.charAt(0).toUpperCase() + field.slice(1)} format is invalid`;
  }
  
  return null;
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input.trim());
}

// Get client IP address (Vercel-specific)
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.headers['x-vercel-forwarded-for'] ||
         req.ip ||
         '127.0.0.1';
}

// CORS configuration
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Clean up old cooldown entries
function cleanupCooldowns() {
  const now = Date.now();
  const cutoffTime = now - 60000; // 1 minute ago
  
  for (const [key, time] of submissionCooldowns.entries()) {
    if (time < cutoffTime) {
      submissionCooldowns.delete(key);
    }
  }
}

// Main API handler (Vercel serverless function)
export default async function handler(req, res) {
  console.log(`🚀 API called: ${req.method} ${req.url}`);
  console.log('Headers:', {
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    origin: req.headers.origin
  });
  
  // Set CORS headers
  setCorsHeaders(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    res.status(200).end();
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`❌ Method ${req.method} not allowed`);
    return res.status(405).json({
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
  
  try {
    console.log('🔄 Processing POST request...');
    
    // Check if Supabase is initialized
    if (!supabase) {
      console.error('❌ Supabase client not initialized - check environment variables');
      return res.status(500).json({
        error: 'Database connection failed',
        code: 'DATABASE_INIT_ERROR'
      });
    }
    
    // Get client information
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`📍 Request from IP: ${clientIP}`);
    console.log(`🖥️ User Agent: ${userAgent.substring(0, 50)}...`);
    
    // Clean up old cooldown entries periodically
    if (submissionCooldowns.size > 100) {
      cleanupCooldowns();
    }
    
    // Simple cooldown check (3 seconds)
    const cooldownKey = `${clientIP}_${userAgent.substring(0, 50)}`;
    const lastSubmission = submissionCooldowns.get(cooldownKey);
    const now = Date.now();
    
    if (lastSubmission && (now - lastSubmission) < 3000) {
      console.log('⏰ Request blocked by cooldown');
      return res.status(429).json({
        error: 'Please wait a moment before submitting again',
        code: 'SUBMISSION_COOLDOWN'
      });
    }
    
    // Extract and validate request body
    const { name, email, phone, message } = req.body || {};
    
    console.log('📝 Received form data:', { 
      name: name ? 'provided' : 'missing', 
      email: email ? 'provided' : 'missing', 
      phone: phone ? 'provided' : 'empty', 
      messageLength: message?.length || 0 
    });
    
    if (!req.body || typeof req.body !== 'object') {
      console.log('❌ Invalid request body');
      return res.status(400).json({
        error: 'Invalid request body',
        code: 'INVALID_BODY'
      });
    }
    
    // Validate all fields
    const errors = [];
    const fields = { name, email, phone, message };
    
    for (const [field, value] of Object.entries(fields)) {
      if (validationRules[field]) {
        const error = validateInput(field, value, validationRules[field]);
        if (error) {
          errors.push(error);
        }
      }
    }
    
    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors);
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: phone ? sanitizeInput(phone) : null,
      message: sanitizeInput(message),
      ip_address: clientIP,
      user_agent: userAgent,
      status: 'new',
      archived: false
    };
    
    console.log('🧹 Data sanitized successfully');
    console.log('💾 Attempting to insert into database...');
    
    // Insert into database
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert([sanitizedData])
      .select();
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to submit form. Please try again.',
        code: 'DATABASE_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // Set submission cooldown
    submissionCooldowns.set(cooldownKey, now);
    
    // Log successful submission
    console.log(`✅ Contact form submitted successfully!`);
    console.log(`📧 Email: ${sanitizedData.email}`);
    console.log(`📍 IP: ${clientIP}`);
    console.log(`🆔 Submission ID: ${data[0]?.id}`);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Thank you for reaching out! We\'ll get back to you within 24 hours.',
      submissionId: data[0]?.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 API error:', error);
    console.error('Stack trace:', error.stack);
    
    // Generic error response
    res.status(500).json({
      error: 'Internal server error. Please try again later.',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}