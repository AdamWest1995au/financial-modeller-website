// /api/check-file-status.js
// Combined API endpoint that handles both submission data and file status

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service key (full access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  console.log('🔍 Combined submission status API called');
  
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
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { submission_id } = req.body;
    
    if (!submission_id) {
      return res.status(400).json({ 
        success: false,
        error: 'submission_id is required' 
      });
    }

    console.log('🔍 Getting complete status for submission:', submission_id);

    // STEP 1: Get submission data from database
    console.log('📊 Step 1: Querying database for submission data...');
    const { data: submissionData, error: dbError } = await supabase
      .from('questionnaire_responses')
      .select('*')
      .eq('id', submission_id)
      .single();

    let databaseStatus = 'not_found';
    let companyName = 'Your Company';
    let fullName = 'Unknown';
    let processingStatus = 'unknown';
    let downloadUrl = null;

    if (dbError) {
      console.error('❌ Database query error:', dbError);
      
      if (dbError.code !== 'PGRST116') { // Not just "not found"
        return res.status(500).json({ 
          success: false,
          error: 'Database query failed',
          details: dbError.message 
        });
      }
      
      console.log('⚠️ Submission not found in database');
    } else {
      databaseStatus = 'found';
      companyName = submissionData.company_name || 'Your Company';
      fullName = submissionData.full_name || 'Unknown';
      processingStatus = submissionData.processing_status || 'unknown';
      downloadUrl = submissionData.download_url;
      
      console.log('✅ Database data retrieved:', {
        id: submissionData.id,
        company_name: companyName,
        full_name: fullName,
        processing_status: processingStatus,
        has_download_url: !!downloadUrl
      });
    }

    // STEP 2: Check if file exists in storage
    console.log('📁 Step 2: Checking storage for file...');
    const { data: files, error: storageError } = await supabase.storage
      .from('completedmodels')
      .list('', {
        limit: 1000,
        search: submission_id
      });

    let fileStatus = 'not_found';
    let fileInfo = null;
    let storageDownloadUrl = null;

    if (storageError) {
      console.error('❌ Storage check error:', storageError);
      fileStatus = 'storage_error';
    } else {
      const foundFile = files?.find(file => file.name === submission_id);
      
      if (foundFile) {
        fileStatus = 'found';
        fileInfo = foundFile;
        
        // Generate download URL from storage
        const { data: urlData } = supabase.storage
          .from('completedmodels')
          .getPublicUrl(submission_id);
        
        storageDownloadUrl = urlData.publicUrl;
        
        console.log('🎉 File found in storage:', {
          name: foundFile.name,
          size: foundFile.metadata?.size,
          created: foundFile.created_at
        });
      } else {
        console.log('📦 File not found in storage');
      }
    }

    // STEP 3: Determine overall processing status
    let overallStatus = 'processing';
    let statusMessage = 'Your model is being processed...';
    let isComplete = false;
    let finalDownloadUrl = null;

    // Priority: Database download URL > Storage URL > None
    if (downloadUrl) {
      finalDownloadUrl = downloadUrl;
    } else if (storageDownloadUrl) {
      finalDownloadUrl = storageDownloadUrl;
    }

    // FIXED LOGIC: Prioritize file existence over database status
    // If file exists, consider it completed regardless of database status
    if (fileStatus === 'found') {
      overallStatus = 'completed';
      statusMessage = 'Your financial model is ready!';
      isComplete = true;
      
      // Ensure we have a download URL if file exists
      if (!finalDownloadUrl) {
        finalDownloadUrl = storageDownloadUrl;
      }
      
      console.log('✅ File found in storage - marking as completed regardless of database status');
      
    } else if (processingStatus === 'completed' && downloadUrl) {
      // Database says completed and has download URL, but no file found in storage
      overallStatus = 'completed';
      statusMessage = 'Your financial model is ready!';
      isComplete = true;
      console.log('✅ Database marked as completed with download URL');
      
    } else if (processingStatus === 'failed' || processingStatus === 'upload_failed') {
      // Only mark as failed if no file exists AND database says failed
      if (fileStatus !== 'found') {
        overallStatus = 'failed';
        statusMessage = 'Processing failed. Please try again.';
        console.log('❌ Database marked as failed and no file found');
      } else {
        // File exists despite database saying failed - prioritize file existence
        overallStatus = 'completed';
        statusMessage = 'Your financial model is ready!';
        isComplete = true;
        console.log('✅ Database says failed but file exists - marking as completed');
      }
      
    } else if (processingStatus === 'processing' || processingStatus === 'uploading') {
      overallStatus = 'processing';
      statusMessage = 'Your model is being processed...';
      
    } else if (databaseStatus === 'not_found' && fileStatus === 'not_found') {
      overallStatus = 'not_found';
      statusMessage = 'Submission not found. Please check your submission ID.';
      
    } else {
      // Default processing state
      overallStatus = 'processing';
      statusMessage = 'Your model is being processed...';
    }

    console.log('🎯 Overall status determined:', overallStatus);

    // STEP 4: Return comprehensive response
    const response = {
      success: true,
      submission_id: submission_id,
      
      // Overall status
      status: overallStatus,
      message: statusMessage,
      is_complete: isComplete,
      
      // Company information
      company_name: companyName,
      full_name: fullName,
      
      // File information
      file_exists: fileStatus === 'found',
      download_url: finalDownloadUrl,
      file_path: fileStatus === 'found' ? `completedmodels/${submission_id}` : null,
      file_size: fileInfo?.metadata?.size || (fileStatus === 'found' ? 'Available for download' : null),
      
      // Database information
      database_status: databaseStatus,
      processing_status: processingStatus,
      
      // Storage information
      storage_status: fileStatus,
      
      // Metadata
      created_at: submissionData?.created_at || fileInfo?.created_at || new Date().toISOString(),
      last_modified: fileInfo?.updated_at || submissionData?.updated_at || null,
      
      // Debug info
      debug: {
        database_found: databaseStatus === 'found',
        file_found: fileStatus === 'found',
        has_db_download_url: !!downloadUrl,
        has_storage_url: !!storageDownloadUrl,
        final_download_source: downloadUrl ? 'database' : (storageDownloadUrl ? 'storage' : 'none')
      }
    };

    console.log('📤 Sending response:', {
      status: response.status,
      is_complete: response.is_complete,
      company_name: response.company_name,
      file_exists: response.file_exists,
      has_download_url: !!response.download_url
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}