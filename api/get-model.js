// api/get-model.js - Robust version that won't crash
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    // Always set headers first
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { submission_id, debug } = req.query;
    const isDebugMode = debug === 'true';

    if (!submission_id) {
        return res.status(400).json({ error: 'Missing submission_id parameter' });
    }

    try {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            return res.status(500).json({ error: 'Missing environment variables' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('🔧 Starting file lookup for:', submission_id);

        // Get database record first
        const { data: dbData, error: dbError } = await supabase
            .from('questionnaire_responses')
            .select('id,company_name,processing_status,processed_file_path,file_size,created_at,modeling_approach,revenue_generation_selected,revenue_staff')
            .eq('id', submission_id)
            .single();

        if (dbError || !dbData) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        console.log('📊 Found record for:', dbData.company_name);

        // Step 1: Try to find the actual file in the folder
        let actualFilePath = null;
        let actualFileName = null;

        try {
            console.log(`📁 Checking folder: ${submission_id}`);
            const { data: folderContents, error: folderError } = await supabase.storage
                .from('completedmodels')
                .list(submission_id, { limit: 5 });

            if (!folderError && folderContents && folderContents.length > 0) {
                actualFileName = folderContents[0].name;
                actualFilePath = `${submission_id}/${actualFileName}`;
                console.log(`✅ Found file: ${actualFileName}`);
            } else {
                console.log(`❌ No files found in folder: ${folderError?.message || 'Empty folder'}`);
            }
        } catch (error) {
            console.log(`❌ Folder listing error: ${error.message}`);
        }

        if (isDebugMode) {
            return res.json({
                submission_id,
                debug_timestamp: new Date().toISOString(),
                database_record: dbData,
                folder_check: {
                    folder_name: submission_id,
                    file_found: !!actualFileName,
                    actual_filename: actualFileName,
                    full_path: actualFilePath
                },
                next_step: actualFilePath ? 'Will try to download this file' : 'Will try fallback paths'
            });
        }

        // Step 2: Try to download the file
        let fileBuffer = null;
        let successPath = null;
        let pathsToTry = [];

        // Add the discovered path first (if we found one)
        if (actualFilePath) {
            pathsToTry.push(actualFilePath);
        }

        // Add some fallback paths
        pathsToTry.push(
            `${submission_id}/${submission_id}`,
            `${submission_id}/${submission_id}.xlsx`,
            `${submission_id}/${submission_id}.xlsm`,
            dbData.processed_file_path || submission_id,
            submission_id
        );

        // Remove duplicates and empty values
        pathsToTry = [...new Set(pathsToTry.filter(Boolean))];

        console.log('📂 Trying paths:', pathsToTry);

        // Try each path
        for (const filePath of pathsToTry) {
            console.log(`📥 Trying: ${filePath}`);

            try {
                // Method 1: Supabase client
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from('completedmodels')
                    .download(filePath);

                if (!downloadError && fileData) {
                    const arrayBuffer = await fileData.arrayBuffer();
                    if (arrayBuffer.byteLength > 100) {
                        fileBuffer = arrayBuffer;
                        successPath = filePath;
                        console.log(`✅ SUCCESS with Supabase client: ${filePath} (${arrayBuffer.byteLength} bytes)`);
                        break;
                    }
                }
            } catch (error) {
                console.log(`❌ Supabase client failed for ${filePath}: ${error.message}`);
            }

            // Method 2: Direct fetch if client failed
            if (!fileBuffer) {
                try {
                    const directUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/completedmodels/${filePath}`;
                    const response = await fetch(directUrl, {
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                            'apikey': SUPABASE_SERVICE_KEY
                        }
                    });

                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        if (arrayBuffer.byteLength > 100) {
                            fileBuffer = arrayBuffer;
                            successPath = filePath;
                            console.log(`✅ SUCCESS with direct fetch: ${filePath} (${arrayBuffer.byteLength} bytes)`);
                            break;
                        }
                    }
                } catch (error) {
                    console.log(`❌ Direct fetch failed for ${filePath}: ${error.message}`);
                }
            }

            if (fileBuffer) break;
        }

        // Step 3: Return result
        if (!fileBuffer) {
            return res.status(404).json({
                error: 'File not found',
                message: 'Could not access file with any method',
                details: {
                    submission_id,
                    company_name: dbData.company_name,
                    folder_checked: submission_id,
                    file_discovered: actualFileName,
                    paths_attempted: pathsToTry
                },
                suggestion: 'Use ?debug=true to see more details'
            });
        }

        // Success! Serve the file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${dbData.company_name || 'Financial'}_Model.xlsx"`);
        res.setHeader('Content-Length', fileBuffer.byteLength);
        res.setHeader('X-Success-Path', successPath);
        res.setHeader('X-Original-Filename', actualFileName || 'unknown');

        console.log(`✅ SUCCESS! Serving ${fileBuffer.byteLength} bytes from: ${successPath}`);
        if (actualFileName) {
            console.log(`📄 Original filename: ${actualFileName}`);
        }

        return res.send(Buffer.from(fileBuffer));

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: error.stack?.substring(0, 200)
        });
    }
}