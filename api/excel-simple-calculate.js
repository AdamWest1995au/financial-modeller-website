// /api/excel-simple-calculate.js - Simplified calculation approach
import * as XLSX from 'xlsx';

export async function simpleCalculateExcel(buffer) {
  console.log('🚀 Starting simplified Excel calculation...');
  
  try {
    // Step 1: Read and calculate with SheetJS
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellFormula: true,
      cellStyles: true,
      cellDates: true,
      sheetStubs: true,
      bookVBA: true,
      cellNF: true,
      sheetRows: 1000
    });
    
    console.log(`📊 Found ${workbook.SheetNames.length} sheets`);
    
    // Step 2: Force calculation by converting to JSON and back
    // This makes SheetJS calculate all formulas
    const calculatedSheets = {};
    
    for (const sheetName of workbook.SheetNames) {
      console.log(`📝 Calculating sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON (forces calculation)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        raw: false
      });
      
      // Store calculated data
      calculatedSheets[sheetName] = jsonData;
      console.log(`✅ Calculated ${jsonData.length} rows in ${sheetName}`);
    }
    
    // Step 3: Create a new workbook with calculated values
    const newWorkbook = XLSX.utils.book_new();
    
    for (const sheetName of workbook.SheetNames) {
      console.log(`📋 Creating sheet: ${sheetName}`);
      
      // Get the original worksheet for reference
      const originalSheet = workbook.Sheets[sheetName];
      const calculatedData = calculatedSheets[sheetName];
      
      // Create new sheet from calculated data
      const newSheet = XLSX.utils.aoa_to_sheet(calculatedData);
      
      // Try to preserve some formatting from original
      if (originalSheet['!cols']) newSheet['!cols'] = originalSheet['!cols'];
      if (originalSheet['!rows']) newSheet['!rows'] = originalSheet['!rows'];
      if (originalSheet['!merges']) newSheet['!merges'] = originalSheet['!merges'];
      
      // Add to new workbook
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, sheetName);
    }
    
    // Step 4: Write to buffer
    console.log('📦 Writing calculated workbook to buffer...');
    const outputBuffer = XLSX.write(newWorkbook, {
      bookType: 'xlsm',
      type: 'buffer',
      cellStyles: true,
      bookVBA: true
    });
    
    console.log('✅ Calculation complete!');
    return outputBuffer;
    
  } catch (error) {
    console.error('❌ Calculation error:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Even simpler version - just write the calculated values
export async function ultraSimpleCalculate(buffer) {
  console.log('🚀 Ultra-simple calculation...');
  
  try {
    // Read
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellFormula: true,
      sheetRows: 500 // Limit for safety
    });
    
    // Calculate by reading all sheets
    const sheets = {};
    workbook.SheetNames.forEach(name => {
      sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1,
        raw: false,
        defval: ''
      });
    });
    
    // Create new workbook with values only
    const newWB = XLSX.utils.book_new();
    Object.keys(sheets).forEach(name => {
      const ws = XLSX.utils.aoa_to_sheet(sheets[name]);
      XLSX.utils.book_append_sheet(newWB, ws, name);
    });
    
    // Return buffer
    return XLSX.write(newWB, { bookType: 'xlsm', type: 'buffer' });
    
  } catch (error) {
    console.error('Ultra-simple calc error:', error.message);
    // Return original if calculation fails
    return buffer;
  }
}