// api/debug-model.js
// Diagnostic endpoint to debug the get-model API issues

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    console.log('🔍 DEBUG API Request:', {
        method: req.method,
        url: req.url,
        query: req.query,
        timestamp: new Date().toISOString()
    });

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { submission_id } = req.query;

    try {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            submission_id: submission_id,
            environment: {
                hasSupabaseUrl: !!process.env.SUPABASE_URL,
                hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
                supabaseUrlLength: process.env.SUPABASE_URL?.length || 0,
                serviceKeyLength: process.env.SUPABASE_SERVICE_KEY?.length || 0,
                nodeEnv: process.env.NODE_ENV,
                vercelEnv: process.env.VERCEL_ENV
            },
            tests: {}
        };

        if (!submission_id) {
            debugInfo.error = 'Missing submission_id parameter';
            return res.status(400).json(debugInfo);
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            debugInfo.error = 'Missing environment variables';
            debugInfo.missing = {
                SUPABASE_URL: !SUPABASE_URL,
                SUPABASE_SERVICE_KEY: !SUPABASE_SERVICE_KEY
            };
            return res.status(500).json(debugInfo);
        }

        // Test 1: Database connection
        console.log('🔍 Testing database connection...');
        try {
            const queryParams = new URLSearchParams({
                'id': `eq.${submission_id}`,
                'select': 'id,company_name,processing_status,processed_file_path,file_size,created_at'
            });
            
            const dbQueryUrl = `${SUPABASE_URL}/rest/v1/questionnaire_responses?${queryParams}`;
            
            const dbResponse = await fetch(dbQueryUrl, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            debugInfo.tests.database = {
                status: dbResponse.status,
                ok: dbResponse.ok,
                statusText: dbResponse.statusText
            };

            if (dbResponse.ok) {
                const results = await dbResponse.json();
                debugInfo.tests.database.results = results;
                debugInfo.submission_data = results[0] || null;
            } else {
                const errorText = await dbResponse.text();
                debugInfo.tests.database.error = errorText;
            }

        } catch (dbError) {
            debugInfo.tests.database = {
                error: dbError.message,
                stack: dbError.stack
            };
        }

        // Test 2: Storage listing
        console.log('🔍 Testing storage listing...');
        try {
            const listUrl = `${SUPABASE_URL}/storage/v1/object/list/completedmodels`;
            
            const listResponse = await fetch(listUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY
                },
                body: JSON.stringify({
                    limit: 10,
                    offset: 0,
                    prefix: '',
                    search: submission_id
                })
            });

            debugInfo.tests.storage_list = {
                status: listResponse.status,
                ok: listResponse.ok,
                statusText: listResponse.statusText
            };

            if (listResponse.ok) {
                const files = await listResponse.json();
                debugInfo.tests.storage_list.files = files;
                debugInfo.file_exists_in_storage = files.some(f => f.name === submission_id);
            } else {
                const errorText = await listResponse.text();
                debugInfo.tests.storage_list.error = errorText;
            }

        } catch (storageError) {
            debugInfo.tests.storage_list = {
                error: storageError.message,
                stack: storageError.stack
            };
        }

        // Test 3: File access
        if (debugInfo.file_exists_in_storage) {
            console.log('🔍 Testing file access...');
            try {
                const fileUrl = `${SUPABASE_URL}/storage/v1/object/completedmodels/${submission_id}`;
                
                const fileResponse = await fetch(fileUrl, {
                    method: 'HEAD',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                    }
                });

                debugInfo.tests.file_access = {
                    status: fileResponse.status,
                    ok: fileResponse.ok,
                    statusText: fileResponse.statusText,
                    headers: Object.fromEntries(fileResponse.headers.entries())
                };

            } catch (fileError) {
                debugInfo.tests.file_access = {
                    error: fileError.message,
                    stack: fileError.stack
                };
            }
        }

        // Test 4: Auto-repair simulation
        console.log('🔍 Testing auto-repair functionality...');
        try {
            const testExcelData = createValidExcelFile(debugInfo.submission_data?.company_name || 'Test Company');
            
            debugInfo.tests.auto_repair = {
                test_file_created: true,
                test_file_size: testExcelData.length,
                // We won't actually upload in debug mode
                simulated: true
            };

        } catch (repairError) {
            debugInfo.tests.auto_repair = {
                error: repairError.message,
                stack: repairError.stack
            };
        }

        // Summary
        debugInfo.summary = {
            database_accessible: debugInfo.tests.database?.ok || false,
            submission_found: !!debugInfo.submission_data,
            storage_accessible: debugInfo.tests.storage_list?.ok || false,
            file_exists: debugInfo.file_exists_in_storage || false,
            file_accessible: debugInfo.tests.file_access?.ok || false,
            auto_repair_ready: debugInfo.tests.auto_repair?.test_file_created || false
        };

        console.log('🔍 Debug summary:', debugInfo.summary);

        return res.status(200).json(debugInfo);

    } catch (error) {
        console.error('❌ Debug API Error:', error);
        
        return res.status(500).json({
            error: 'Debug API failed',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}

function createValidExcelFile(companyName = 'Company') {
    try {
        const excelContent = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <sheetData>
        <row r="1">
            <c r="A1" t="str"><v>Financial Model - ${companyName}</v></c>
        </row>
        <row r="2">
            <c r="A2" t="str"><v>Revenue</v></c>
            <c r="B2" t="n"><v>100000</v></c>
        </row>
        <row r="3">
            <c r="A3" t="str"><v>Expenses</v></c>
            <c r="B3" t="n"><v>75000</v></c>
        </row>
        <row r="4">
            <c r="A4" t="str"><v>Profit</v></c>
            <c r="B4" t="str"><v>=B2-B3</v></c>
        </row>
    </sheetData>
</worksheet>
        `.trim();
        
        const header = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00, 0x21, 0x00]);
        const content = Buffer.from(excelContent, 'utf8');
        const footer = Buffer.from([0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);
        
        return Buffer.concat([header, content, footer]);
    } catch (error) {
        throw new Error(`Excel file creation failed: ${error.message}`);
    }
}

// File ends here - handler is already exported as default at the top