// /api/excel-calculate-sheetjs.js - Use SheetJS for calculation only
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export async function calculateWithSheetJS(buffer) {
  console.log('📊 Starting SheetJS calculation...');
  
  try {
    // Step 1: Read with SheetJS and force calculation
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellFormula: true,      // Parse formulas
      cellStyles: true,       // Preserve styles (even in free version)
      cellDates: true,        // Handle dates properly
      sheetStubs: true,       // Include empty cells
      bookVBA: true,          // Preserve VBA (for .xlsm)
      cellNF: true,           // Number formats
      sheetRows: 1000         // Limit rows for performance
    });
    
    // Step 2: Force recalculation of all formulas
    // SheetJS calculates formulas when you access sheet data as JSON
    const calculatedData = {};
    
    for (const sheetName of workbook.SheetNames) {
      console.log(`📝 Calculating sheet: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      
      // This forces SheetJS to calculate all formulas!
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,          // Return as array of arrays
        defval: null,       // Default value for empty cells
        raw: false,         // Force calculation of formulas
        dateNF: 'yyyy-mm-dd'
      });
      
      // Also get the full sheet data with formulas calculated
      const fullData = {};
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          
          if (cell) {
            fullData[cellAddress] = {
              value: cell.v,      // Calculated value
              formula: cell.f,    // Original formula
              type: cell.t,       // Cell type
              format: cell.z,     // Number format
              style: cell.s       // Style (if using Pro)
            };
            
            // Handle array formulas / spill ranges
            if (cell.F) {
              // This is an array formula range
              console.log(`📐 Array formula found at ${cellAddress}: ${cell.F}`);
              fullData[cellAddress].arrayFormula = cell.F;
            }
          }
        }
      }
      
      calculatedData[sheetName] = {
        json: jsonData,
        cells: fullData,
        range: range,
        merges: worksheet['!merges'] || []
      };
    }
    
    // Step 3: Create new ExcelJS workbook with calculated values
    console.log('📋 Creating ExcelJS workbook with calculated values...');
    
    const outputWorkbook = new ExcelJS.Workbook();
    
    // Read original with ExcelJS to preserve ALL formatting
    const templateWorkbook = new ExcelJS.Workbook();
    
    try {
      await templateWorkbook.xlsx.load(buffer);
      console.log('✅ Template workbook loaded successfully');
    } catch (loadError) {
      console.error('❌ Failed to load template workbook:', loadError);
      throw new Error(`Failed to load template: ${loadError.message}`);
    }
    
    // Copy each sheet with calculated values
    let processedSheets = 0;
    
    for (const templateSheet of templateWorkbook.worksheets) {
      try {
        const sheetName = templateSheet.name;
        console.log(`📝 Processing sheet ${processedSheets + 1}/${templateWorkbook.worksheets.length}: ${sheetName}`);
        
        const calcData = calculatedData[sheetName];
        
        if (!calcData) {
          console.log(`⚠️ No calculated data for sheet: ${sheetName}, skipping`);
          continue;
        }
        
        const newSheet = outputWorkbook.addWorksheet(sheetName);
        
        // Copy all sheet properties
        newSheet.properties = { ...templateSheet.properties };
        newSheet.views = templateSheet.views;
        newSheet.pageSetup = templateSheet.pageSetup;
        
        // Copy column properties safely
        if (templateSheet.columns && templateSheet.columns.length > 0) {
          templateSheet.columns.forEach((col, index) => {
            try {
              if (col && newSheet.getColumn(index + 1)) {
                const newCol = newSheet.getColumn(index + 1);
                if (col.width) newCol.width = col.width;
                if (col.hidden) newCol.hidden = col.hidden;
                if (col.outlineLevel) newCol.outlineLevel = col.outlineLevel;
              }
            } catch (colError) {
              console.log(`⚠️ Error copying column ${index}:`, colError.message);
            }
          });
        }
      
        // Copy all cells with calculated values
        let cellCount = 0;
        const maxRows = Math.min(templateSheet.rowCount || 1000, 1000);
        
        for (let rowNumber = 1; rowNumber <= maxRows; rowNumber++) {
          try {
            const templateRow = templateSheet.getRow(rowNumber);
            const newRow = newSheet.getRow(rowNumber);
            
            // Copy row properties
            if (templateRow.height) newRow.height = templateRow.height;
            if (templateRow.hidden) newRow.hidden = templateRow.hidden;
            if (templateRow.outlineLevel) newRow.outlineLevel = templateRow.outlineLevel;
            
            const maxCols = Math.min(templateRow.cellCount || 100, 100);
            
            for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
              try {
                const templateCell = templateRow.getCell(colNumber);
                const newCell = newRow.getCell(colNumber);
                const cellAddress = templateCell.address;
                
                // Get calculated value from SheetJS
                const calcCell = calcData.cells[cellAddress];
                
                if (calcCell && calcCell.value !== undefined) {
                  // Use calculated value
                  newCell.value = calcCell.value;
                  cellCount++;
                  
                  // Log first few array formula results
                  if (calcCell.arrayFormula && cellCount <= 5) {
                    console.log(`✅ Array formula ${cellAddress}: ${calcCell.value}`);
                  }
                } else {
                  // Fallback to original value
                  if (templateCell.value !== null && templateCell.value !== undefined) {
                    newCell.value = templateCell.value;
                  }
                }
                
                // Copy ALL formatting from template
                if (templateCell.style) {
                  try {
                    newCell.style = JSON.parse(JSON.stringify(templateCell.style));
                  } catch (styleError) {
                    console.log(`⚠️ Error copying style for ${cellAddress}:`, styleError.message);
                  }
                }
                
                // Handle merged cells
                if (templateCell.isMerged && templateCell.master === templateCell) {
                  try {
                    const merges = templateSheet.model.merges;
                    if (merges && merges[cellAddress]) {
                      newSheet.mergeCells(merges[cellAddress]);
                    }
                  } catch (mergeError) {
                    console.log(`⚠️ Error merging cells at ${cellAddress}:`, mergeError.message);
                  }
                }
              } catch (cellError) {
                console.log(`⚠️ Error processing cell at row ${rowNumber}, col ${colNumber}:`, cellError.message);
              }
            }
          } catch (rowError) {
            console.log(`⚠️ Error processing row ${rowNumber}:`, rowError.message);
          }
        }
        
        console.log(`✅ Processed ${cellCount} cells in ${sheetName}`);
        processedSheets++;
        
      } catch (sheetError) {
        console.error(`❌ Error processing sheet ${templateSheet.name}:`, sheetError);
        throw sheetError;
      }
    }
    
    console.log(`✅ SheetJS calculation complete! Processed ${processedSheets} sheets`);
    return outputWorkbook;
    
  } catch (error) {
    console.error('❌ SheetJS calculation error:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Helper function to detect and handle spill ranges
function handleSpillRange(worksheet, formula, startCell) {
  // Detect #spill references like D5#
  const spillRefMatch = formula.match(/([A-Z]+\d+)#/g);
  
  if (spillRefMatch) {
    console.log(`🌊 Detected spill reference: ${spillRefMatch}`);
    
    // In SheetJS, array formulas are marked with F property
    // We need to find the extent of the spill range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const startAddr = XLSX.utils.decode_cell(startCell);
    
    // Look for contiguous non-empty cells
    let endRow = startAddr.r;
    let endCol = startAddr.c;
    
    // Check downward for spill
    for (let r = startAddr.r + 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r: r, c: startAddr.c });
      if (worksheet[addr] && worksheet[addr].v !== null) {
        endRow = r;
      } else {
        break;
      }
    }
    
    // Check rightward for spill
    for (let c = startAddr.c + 1; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: startAddr.r, c: c });
      if (worksheet[addr] && worksheet[addr].v !== null) {
        endCol = c;
      } else {
        break;
      }
    }
    
    return {
      start: startAddr,
      end: { r: endRow, c: endCol }
    };
  }
  
  return null;
}

// Integration function for your existing code
export async function getSheetJSCalculatedBuffer(originalBuffer) {
  const calculatedWorkbook = await calculateWithSheetJS(originalBuffer);
  const buffer = await calculatedWorkbook.xlsx.writeBuffer();
  return buffer;
}