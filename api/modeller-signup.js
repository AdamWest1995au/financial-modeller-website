// =================================================================
// Modeller Signup API Endpoint for Vercel
// File: /api/modeller-signup.js
// =================================================================

import { createClient } from '@supabase/supabase-js';
import DOMPurify from 'isomorphic-dompurify';

console.log('Environment check:', {
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV
});

if (!process.env.SUPABASE_URL) {
  console.error('Missing SUPABASE_URL environment variable');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY environment variable');
}

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

const submissionCooldowns = new Map();

const validationRules = {
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\-'\.]+$/
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
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
  experience: {
    required: true,
    enum: ['1-3', '3-5', '5-10', '10+']
  },
  specialization: {
    required: true,
    enum: ['startup', 'saas', 'ecommerce', 'real-estate', 'services', 'fundraising', 'other']
  },
  portfolio: {
    required: false,
    maxLength: 500,
    pattern: /^https?:\/\/.+/
  },
  linkedin: {
    required: false,
    maxLength: 500,
    pattern: /^https?:\/\/.+/
  },
  message: {
    required: false,
    maxLength: 2000
  }
};

const fieldMessages = {
  firstName: 'First name contains invalid characters',
  lastName: 'Last name contains invalid characters',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  experience: 'Please select a valid experience level',
  specialization: 'Please select a valid specialization',
  portfolio: 'Please enter a valid URL',
  linkedin: 'Please enter a valid URL',
  message: 'Message contains invalid content'
};

function validateInput(field, value, rules) {
  if (!value && rules.required) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
  }
  
  if (!value) return null;
  
  if (rules.minLength && value.length < rules.minLength) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${rules.minLength} characters`;
  }
  
  if (rules.maxLength && value.length > rules.maxLength) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be no more than ${rules.maxLength} characters`;
  }
  
  if (rules.pattern && !rules.pattern.test(value)) {
    return fieldMessages[field] || `${field.charAt(0).toUpperCase() + field.slice(1)} format is invalid`;
  }
  
  if (rules.enum && !rules.enum.includes(value)) {
    return fieldMessages[field] || `${field.charAt(0).toUpperCase() + field.slice(1)} value is invalid`;
  }
  
  return null;
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input.trim());
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.headers['x-vercel-forwarded-for'] ||
         req.ip ||
         '127.0.0.1';
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function cleanupCooldowns() {
  const now = Date.now();
  const cutoffTime = now - 60000;
  
  for (const [key, time] of submissionCooldowns.entries()) {
    if (time < cutoffTime) {
      submissionCooldowns.delete(key);
    }
  }
}

export default async function handler(req, res) {
  console.log(`🚀 Modeller Signup API called: ${req.method} ${req.url}`);
  console.log('Headers:', {
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    origin: req.headers.origin
  });
  
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    console.log(`❌ Method ${req.method} not allowed`);
    return res.status(405).json({
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
  
  try {
    console.log('🔄 Processing modeller signup request...');
    
    if (!supabase) {
      console.error('❌ Supabase client not initialized - check environment variables');
      return res.status(500).json({
        error: 'Database connection failed',
        code: 'DATABASE_INIT_ERROR'
      });
    }
    
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`📍 Request from IP: ${clientIP}`);
    console.log(`🖥️ User Agent: ${userAgent.substring(0, 50)}...`);
    
    if (submissionCooldowns.size > 100) {
      cleanupCooldowns();
    }
    
    const cooldownKey = `${clientIP}_${userAgent.substring(0, 50)}`;
    const lastSubmission = submissionCooldowns.get(cooldownKey);
    const now = Date.now();
    
    if (lastSubmission && (now - lastSubmission) < 5000) {
      console.log('⏰ Request blocked by cooldown');
      return res.status(429).json({
        error: 'Please wait a moment before submitting again',
        code: 'SUBMISSION_COOLDOWN'
      });
    }
    
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      experience, 
      specialization,
      portfolio,
      linkedin,
      interests,
      message,
      terms
    } = req.body || {};
    
    console.log('📝 Received modeller signup data:', { 
      firstName: firstName ? 'provided' : 'missing',
      lastName: lastName ? 'provided' : 'missing',
      email: email ? 'provided' : 'missing',
      experience: experience ? 'provided' : 'missing',
      specialization: specialization ? 'provided' : 'missing',
      interests: Array.isArray(interests) ? interests.join(', ') : 'none',
      terms: terms ? 'accepted' : 'not accepted'
    });
    
    if (!req.body || typeof req.body !== 'object') {
      console.log('❌ Invalid request body');
      return res.status(400).json({
        error: 'Invalid request body',
        code: 'INVALID_BODY'
      });
    }
    
    if (!terms) {
      console.log('❌ Terms not accepted');
      return res.status(400).json({
        error: 'You must accept the terms and conditions',
        code: 'TERMS_REQUIRED'
      });
    }
    
    const errors = [];
    const fields = { 
      firstName, 
      lastName, 
      email, 
      phone, 
      experience, 
      specialization,
      portfolio,
      linkedin,
      message
    };
    
    for (const [field, value] of Object.entries(fields)) {
      if (validationRules[field]) {
        const error = validateInput(field, value, validationRules[field]);
        if (error) {
          errors.push(error);
        }
      }
    }
    
    if (!Array.isArray(interests) || interests.length === 0) {
      errors.push('Please select at least one area of interest');
    }
    
    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors);
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    const sanitizedData = {
      first_name: sanitizeInput(firstName),
      last_name: sanitizeInput(lastName),
      email: sanitizeInput(email),
      phone: phone ? sanitizeInput(phone) : null,
      experience: sanitizeInput(experience),
      specialization: sanitizeInput(specialization),
      portfolio_url: portfolio ? sanitizeInput(portfolio) : null,
      linkedin_url: linkedin ? sanitizeInput(linkedin) : null,
      interests: Array.isArray(interests) ? interests.map(i => sanitizeInput(i)) : [],
      message: message ? sanitizeInput(message) : null,
      terms_accepted: terms,
      ip_address: clientIP,
      user_agent: userAgent,
      status: 'pending',
      archived: false
    };
    
    console.log('🧹 Data sanitized successfully');
    console.log('💾 Attempting to insert into database...');
    
    const { data, error } = await supabase
      .from('modeller_signups')
      .insert([sanitizedData])
      .select();
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to submit application. Please try again.',
        code: 'DATABASE_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    submissionCooldowns.set(cooldownKey, now);
    
    console.log(`✅ Modeller signup submitted successfully!`);
    console.log(`📧 Email: ${sanitizedData.email}`);
    console.log(`👤 Name: ${sanitizedData.first_name} ${sanitizedData.last_name}`);
    console.log(`📍 IP: ${clientIP}`);
    console.log(`🆔 Submission ID: ${data[0]?.id}`);
    
    res.status(200).json({
      success: true,
      message: 'Thank you for your application! We\'ll review your profile and get back to you within 2-3 business days.',
      submissionId: data[0]?.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 API error:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      error: 'Internal server error. Please try again later.',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
