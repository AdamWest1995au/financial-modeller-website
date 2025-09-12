// /api/excel-render-enhanced.js - FIXED VERSION with HyperFormula integration
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import ExcelJS from 'exceljs';
import { HyperFormula } from 'hyperformula';

const parseXML = promisify(parseString);

// Helper to get HyperFormula if available
async function getHyperFormula() {
  try {
    if (typeof HyperFormula !== 'undefined') {
      return HyperFormula;
    }
    return null;
  } catch (e) {
    console.log('HyperFormula not available:', e.message);
    return null;
  }
}

// HyperFormula integration for formula recalculation
async function recalculateFormulasWithHyperFormula(workbook, HyperFormula) {
  console.log('Starting HyperFormula recalculation...');
  
  if (!HyperFormula) {
    throw new Error('HyperFormula not available');
  }
  
  const hfOptions = {
    licenseKey: 'gpl-v3',
    useColumnIndex: true,
    useArrayArithmetic: false,
    smartRounding: true,
    maxRows: 10000,
    maxColumns: 1000
  };
  
  const hf = HyperFormula.buildEmpty(hfOptions);
  const worksheetMap = new Map();
  
  try {
    workbook.eachSheet((worksheet, worksheetId) => {
      console.log(`Processing worksheet: ${worksheet.name}`);
      
      const dimensions = worksheet.dimensions;
      if (!dimensions) {
        console.log(`Skipping empty worksheet: ${worksheet.name}`);
        return;
      }
      
      const sheetData = [];
      const maxRow = Math.min(dimensions.bottom, dimensions.top + 200);
      const maxCol = Math.min(dimensions.right, dimensions.left + 50);
      
      for (let rowNum = dimensions.top; rowNum <= maxRow; rowNum++) {
        const row = worksheet.getRow(rowNum);
        const rowData = [];
        
        for (let colNum = dimensions.left; colNum <= maxCol; colNum++) {
          const cell = row.getCell(colNum);
          
          if (!cell || cell.value === null || cell.value === undefined) {
            rowData.push(null);
            continue;
          }
          
          if (cell.type === ExcelJS.ValueType.Formula) {
            rowData.push(`=${cell.formula}`);
          } else if (cell.type === ExcelJS.ValueType.Number) {
            rowData.push(cell.value);
          } else if (cell.type === ExcelJS.ValueType.String) {
            rowData.push(cell.value);
          } else if (cell.type === ExcelJS.ValueType.Boolean) {
            rowData.push(cell.value);
          } else if (cell.type === ExcelJS.ValueType.Date) {
            const excelDate = (cell.value.getTime() - new Date(1900, 0, 1).getTime()) / (24 * 60 * 60 * 1000) + 2;
            rowData.push(excelDate);
          } else {
            rowData.push(cell.value);
          }
        }
        
        sheetData.push(rowData);
      }
      
      const sheetName = worksheet.name.replace(/[^a-zA-Z0-9_]/g, '_');
      const sheetId = hf.addSheet(sheetName);
      
      if (sheetData.length > 0) {
        hf.setSheetContent(sheetId, sheetData);
        console.log(`Added ${sheetData.length} rows to HyperFormula sheet: ${sheetName}`);
      }
      
      worksheetMap.set(sheetId, worksheet);
    });
    
    console.log('HyperFormula recalculating all formulas...');
    
    worksheetMap.forEach((worksheet, sheetId) => {
      const dimensions = worksheet.dimensions;
      if (!dimensions) return;
      
      const maxRow = Math.min(dimensions.bottom, dimensions.top + 200);
      const maxCol = Math.min(dimensions.right, dimensions.left + 50);
      
      let updatedCells = 0;
      
      for (let rowNum = dimensions.top; rowNum <= maxRow; rowNum++) {
        const row = worksheet.getRow(rowNum);
        
        for (let colNum = dimensions.left; colNum <= maxCol; colNum++) {
          const cell = row.getCell(colNum);
          
          if (cell.type === ExcelJS.ValueType.Formula) {
            try {
              const hfAddress = { sheet: sheetId, col: colNum - dimensions.left, row: rowNum - dimensions.top };
              const calculatedValue = hf.getCellValue(hfAddress);
              
              if (calculatedValue !== null && calculatedValue !== undefined) {
                cell.result = calculatedValue;
                updatedCells++;
                
                if (updatedCells <= 5) {
                  console.log(`Updated ${cell.address}: ${cell.formula} = ${calculatedValue}`);
                }
              }
            } catch (hfError) {
              console.log(`HyperFormula error for ${cell.address}: ${hfError.message}`);
            }
          }
        }
      }
      
      console.log(`Updated ${updatedCells} formula results in ${worksheet.name}`);
    });
    
    console.log('HyperFormula recalculation completed successfully');
    return workbook;
    
  } catch (error) {
    console.error('HyperFormula integration error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  console.log('API Handler started - excel-render-enhanced');
  console.log('Request method:', req.method);
  console.log('Request body keys:', req.body ? Object.keys(req.body) : 'no body');
  
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { submission_id, worksheet_name = null } = req.body;
    
    if (!submission_id) {
      return res.status(400).json({ error: 'Missing submission_id' });
    }

    console.log('Processing Excel render for submission:', submission_id);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    console.log('Checking folder: ' + submission_id);

    let actualFilePath = null;
    try {
      const { data: folderContents, error: folderError } = await supabase.storage
        .from('completedmodels')
        .list(submission_id, { limit: 5 });

      if (!folderError && folderContents && Array.isArray(folderContents) && folderContents.length > 0) {
        const actualFileName = folderContents[0].name;
        actualFilePath = `${submission_id}/${actualFileName}`;
        console.log(`Found file: ${actualFileName}`);
      }
    } catch (error) {
      console.log(`Folder listing error: ${error.message}`);
    }

    let fileData = null;
    let downloadError = null;

    if (actualFilePath) {
      const { data, error } = await supabase.storage
        .from('completedmodels')
        .download(actualFilePath);
      
      if (!error && data) {
        fileData = data;
        console.log(`Downloaded file successfully: ${actualFilePath}`);
      } else {
        downloadError = error;
      }
    }

    if (!fileData) {
      const fallbackPaths = [
        `${submission_id}/${submission_id}`,
        `${submission_id}/${submission_id}.xlsx`,
        `${submission_id}/${submission_id}.xlsm`
      ];
      
      for (const path of fallbackPaths) {
        console.log(`Trying fallback path: ${path}`);
        const { data, error } = await supabase.storage
          .from('completedmodels')
          .download(path);
        
        if (!error && data) {
          fileData = data;
          console.log(`Found file at: ${path}`);
          break;
        }
      }
    }

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return res.status(404).json({ error: 'File not found' });
    }

    const buffer = await fileData.arrayBuffer();
    
    let formattingData;
    try {
      formattingData = await extractCompleteFormatting(buffer);
    } catch (formatError) {
      console.log('Error extracting formatting, using defaults:', formatError.message);
      formattingData = {
        styles: { cellXfs: [], fills: [], fonts: [], borders: [], dxfs: [], numFmts: {} },
        conditionalFormats: {},
        themes: getDefaultThemeColors(),
        sharedStrings: [],
        numberFormats: {}
      };
    }
    
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(Buffer.from(buffer));
    } catch (workbookError) {
      console.error('Error loading workbook:', workbookError.message);
      return res.status(500).json({ error: 'Failed to parse Excel file' });
    }
    
    console.log('Attempting HyperFormula integration for formula recalculation...');
    let recalculatedWorkbook = null;
    try {
      const HyperFormula = await getHyperFormula();
      if (HyperFormula) {
        recalculatedWorkbook = await recalculateFormulasWithHyperFormula(workbook, HyperFormula);
        console.log('HyperFormula integration successful');
      } else {
        console.log('HyperFormula not available, skipping recalculation');
        recalculatedWorkbook = workbook;
      }
    } catch (hyperFormulaError) {
      console.log('HyperFormula integration failed, using original workbook:', hyperFormulaError.message);
      recalculatedWorkbook = workbook;
    }
    
    const finalWorkbook = recalculatedWorkbook || workbook;
    
    const worksheets = [];
    let hasWorksheets = false;
    
    try {
      finalWorkbook.eachSheet((worksheet) => {
        if (worksheet && worksheet.name) {
          hasWorksheets = true;
          worksheets.push({
            name: worksheet.name,
            id: worksheet.id || worksheet.name
          });
          console.log(`Found worksheet: ${worksheet.name}`);
        }
      });
    } catch (eachSheetError) {
      console.log('Error iterating worksheets:', eachSheetError.message);
    }
    
    if (!hasWorksheets && finalWorkbook.worksheets && Array.isArray(finalWorkbook.worksheets)) {
      finalWorkbook.worksheets.forEach((worksheet, index) => {
        if (worksheet && worksheet.name) {
          hasWorksheets = true;
          worksheets.push({
            name: worksheet.name,
            id: worksheet.id || worksheet.name
          });
          console.log(`Found worksheet via array: ${worksheet.name}`);
        }
      });
    }
    
    if (!hasWorksheets || worksheets.length === 0) {
      console.error('No valid worksheets found in workbook');
      console.log('Workbook info:', {
        worksheetCount: finalWorkbook.worksheets ? finalWorkbook.worksheets.length : 'undefined',
        worksheetNames: finalWorkbook.worksheetNames || 'undefined',
        hasEachSheet: typeof finalWorkbook.eachSheet === 'function'
      });
      return res.status(404).json({ error: 'No worksheets found in workbook' });
    }
    
    const targetWorksheetName = worksheet_name || worksheets[0].name;
    console.log(`Attempting to load worksheet: ${targetWorksheetName}`);
    
    let worksheet = null;
    try {
      worksheet = finalWorkbook.getWorksheet(targetWorksheetName);
      if (!worksheet && finalWorkbook.worksheets && finalWorkbook.worksheets.length > 0) {
        worksheet = finalWorkbook.worksheets[0];
        console.log(`Using fallback worksheet: ${worksheet.name}`);
      }
    } catch (getWorksheetError) {
      console.error('Error getting worksheet:', getWorksheetError.message);
      if (finalWorkbook.worksheets && finalWorkbook.worksheets.length > 0) {
        worksheet = finalWorkbook.worksheets[0];
        console.log(`Using first worksheet by index: ${worksheet.name}`);
      }
    }
    
    console.log(`Successfully loaded workbook with ${worksheets.length} worksheets`);
    
    if (!worksheet) {
      console.error(`Worksheet "${targetWorksheetName}" not found`);
      return res.status(404).json({ 
        error: 'Worksheet not found',
        availableWorksheets: worksheets.map(w => w.name),
        requestedWorksheet: targetWorksheetName
      });
    }
    
    console.log(`Successfully loaded worksheet: ${worksheet.name || 'unknown'}`);
    
    if (process.env.NODE_ENV === 'development') {
      debugDateCells(worksheet);
    }
    
    let htmlContent;
    try {
      console.log('Starting worksheet rendering...');
      htmlContent = await renderWorksheetWithCompleteFormatting(
        worksheet,
        formattingData,
        targetWorksheetName
      );
      console.log('Worksheet rendered successfully');
    } catch (renderError) {
      console.error('Error rendering worksheet:', renderError.message);
      console.error('Render error stack:', renderError.stack);
      htmlContent = '<p>Error rendering worksheet: ' + renderError.message + '</p>';
    }
    
    let metadata = {};
    try {
      const { data: metadataResult, error: metadataError } = await supabase
        .from('questionnaire_responses')
        .select('company_name, modeling_approach, revenue_generation_selected')
        .eq('id', submission_id)
        .single();
      
      if (!metadataError && metadataResult) {
        metadata = metadataResult;
      } else {
        console.log('No metadata found or metadata error:', metadataError);
      }
    } catch (metadataError) {
      console.log('Error fetching metadata:', metadataError.message);
    }
    
    console.log('Preparing response...');
    
    try {
      const response = {
        success: true,
        html: htmlContent,
        worksheets: worksheets,
        currentWorksheet: targetWorksheetName,
        metadata: metadata,
        styles: getEnhancedExcelStyles(),
        antiCopyScript: getAntiCopyScript()
      };
      
      console.log('Sending successful response');
      res.status(200).json(response);
    } catch (responseError) {
      console.error('Error preparing response:', responseError.message);
      res.status(500).json({
        error: 'Error preparing response',
        message: responseError.message,
        details: 'Failed to prepare API response'
      });
    }
    
  } catch (error) {
    console.error('Critical error in excel-render-enhanced handler:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: 'The Excel file could not be processed. Please check the server logs.',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Extract complete formatting including conditional formatting
async function extractCompleteFormatting(buffer) {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (zipError) {
    console.error('Error loading ZIP file:', zipError.message);
    throw new Error('Invalid Excel file format');
  }
  
  const formattingData = {
    styles: {},
    conditionalFormats: {},
    themes: {},
    sharedStrings: [],
    numberFormats: {}
  };
  
  try {
    const themeFile = zip.file('xl/theme/theme1.xml');
    if (themeFile) {
      const themeContent = await themeFile.async('string');
      const themeXml = await parseXML(themeContent);
      formattingData.themes = extractThemeColors(themeXml);
    } else {
      console.log('No theme file found, using defaults');
      formattingData.themes = getDefaultThemeColors();
    }
  } catch (e) {
    console.log('Error parsing theme file, using defaults:', e.message);
    formattingData.themes = getDefaultThemeColors();
  }
  
  try {
    const stylesFile = zip.file('xl/styles.xml');
    if (stylesFile) {
      const stylesContent = await stylesFile.async('string');
      const stylesXml = await parseXML(stylesContent);
      formattingData.styles = extractStyles(stylesXml, formattingData.themes);
    }
  } catch (e) {
    console.error('Failed to parse styles:', e.message);
  }
  
  try {
    const stringsFile = zip.file('xl/sharedStrings.xml');
    if (stringsFile) {
      const stringsContent = await stringsFile.async('string');
      const stringsXml = await parseXML(stringsContent);
      if (stringsXml && stringsXml.sst && stringsXml.sst.si && Array.isArray(stringsXml.sst.si)) {
        formattingData.sharedStrings = stringsXml.sst.si.map(si => {
          if (si && si.t && Array.isArray(si.t) && si.t.length > 0) {
            return si.t[0];
          } else if (si && si.r && Array.isArray(si.r)) {
            return si.r.map(r => (r && r.t && Array.isArray(r.t) && r.t.length > 0) ? r.t[0] : '').join('');
          }
          return '';
        });
      }
    }
  } catch (e) {
    console.log('No shared strings found:', e.message);
  }
  
  const worksheetFiles = Object.keys(zip.files).filter(f => 
    f.startsWith('xl/worksheets/') && f.endsWith('.xml')
  );
  
  for (const file of worksheetFiles) {
    const sheetMatch = file.match(/sheet(\d+)\.xml/);
    const sheetName = sheetMatch ? sheetMatch[1] : null;
    
    if (!sheetName) {
      console.log('Could not extract sheet name from: ' + file);
      continue;
    }
    
    try {
      const worksheetFile = zip.file(file);
      if (!worksheetFile) {
        console.log('Worksheet file not found: ' + file);
        continue;
      }
      
      const content = await worksheetFile.async('string');
      if (!content || content.length === 0) {
        console.log('Empty worksheet content: ' + file);
        continue;
      }
      
      const parsed = await parseXML(content);
      
      if (parsed && 
          parsed.worksheet && 
          parsed.worksheet.conditionalFormatting && 
          Array.isArray(parsed.worksheet.conditionalFormatting)) {
        
        const cfRules = [];
        
        for (const cf of parsed.worksheet.conditionalFormatting) {
          if (!cf || typeof cf !== 'object') {
            console.log('Skipping non-object conditional formatting rule');
            continue;
          }
          
          if (!cf.$ || typeof cf.$ !== 'object' || !cf.$.sqref) {
            console.log('Skipping malformed conditional formatting rule - missing required properties');
            continue;
          }
          
          const range = cf.$.sqref;
          
          if (!cf.cfRule || !Array.isArray(cf.cfRule)) {
            console.log('Skipping conditional formatting - no cfRule array found');
            continue;
          }
          
          for (const rule of cf.cfRule) {
            if (!rule || typeof rule !== 'object' || !rule.$ || typeof rule.$ !== 'object' || !rule.$.type) {
              console.log('Skipping malformed cfRule - missing required properties');
              continue;
            }
            
            const cfRule = {
              range: range,
              type: rule.$.type,
              dxfId: rule.$.dxfId,
              priority: parseInt(rule.$.priority || 1),
              operator: rule.$.operator,
              stopIfTrue: rule.$.stopIfTrue === '1'
            };
            
            if (rule.formula && Array.isArray(rule.formula)) {
              cfRule.formulas = rule.formula.map(f => {
                if (typeof f === 'string') return f;
                if (f && typeof f._ === 'string') return f._;
                if (f && typeof f === 'object' && f.toString) return f.toString();
                return '';
              }).filter(f => f.length > 0);
            }
            
            if (rule.colorScale && Array.isArray(rule.colorScale) && rule.colorScale.length > 0) {
              cfRule.colorScale = extractColorScaleDetails(rule.colorScale[0]);
            }
            
            if (rule.dataBar && Array.isArray(rule.dataBar) && rule.dataBar.length > 0) {
              cfRule.dataBar = extractDataBarDetails(rule.dataBar[0]);
            }
            
            if (cfRule.dxfId !== undefined && 
                formattingData.styles && 
                formattingData.styles.dxfs && 
                Array.isArray(formattingData.styles.dxfs) &&
                formattingData.styles.dxfs[cfRule.dxfId]) {
              cfRule.style = formattingData.styles.dxfs[cfRule.dxfId];
            }
            
            cfRules.push(cfRule);
          }
        }
        
        if (cfRules.length > 0) {
          formattingData.conditionalFormats['sheet' + sheetName] = cfRules;
          console.log('Found ' + cfRules.length + ' conditional formatting rules for sheet' + sheetName);
        }
      } else {
        console.log('No conditional formatting found in ' + file);
      }
    } catch (e) {
      console.log('Error parsing worksheet ' + file + ':', e.message);
    }
  }
  
  return formattingData;
}

// Extract theme colors from theme XML
function extractThemeColors(themeXml) {
  const colors = {};
  
  try {
    if (!themeXml || !themeXml['a:theme']) {
      console.log('Theme XML structure not found');
      return getDefaultThemeColors();
    }
    
    const theme = themeXml['a:theme'];
    if (!theme || !theme['a:themeElements']) {
      console.log('Theme elements not found');
      return getDefaultThemeColors();
    }
    
    const themeElements = theme['a:themeElements'];
    if (!Array.isArray(themeElements) || themeElements.length === 0) {
      console.log('Theme elements array not found');
      return getDefaultThemeColors();
    }
    
    const clrScheme = themeElements[0]['a:clrScheme'];
    if (!clrScheme || !Array.isArray(clrScheme) || clrScheme.length === 0) {
      console.log('Color scheme not found');
      return getDefaultThemeColors();
    }
    
    const scheme = clrScheme[0];
    
    const colorMap = {
      'a:lt1': 0,
      'a:dk1': 1,
      'a:lt2': 2,
      'a:dk2': 3,
      'a:accent1': 4,
      'a:accent2': 5,
      'a:accent3': 6,
      'a:accent4': 7,
      'a:accent5': 8,
      'a:accent6': 9,
      'a:hlink': 10,
      'a:folHlink': 11
    };
    
    Object.entries(colorMap).forEach(([key, index]) => {
      if (scheme[key] && Array.isArray(scheme[key]) && scheme[key].length > 0) {
        const colorNode = scheme[key][0];
        
        if (colorNode && colorNode['a:srgbClr'] && 
            Array.isArray(colorNode['a:srgbClr']) && 
            colorNode['a:srgbClr'].length > 0 &&
            colorNode['a:srgbClr'][0] && 
            colorNode['a:srgbClr'][0].$) {
          colors[index] = '#' + colorNode['a:srgbClr'][0].$.val;
        } else if (colorNode && colorNode['a:sysClr'] && 
                   Array.isArray(colorNode['a:sysClr']) &&
                   colorNode['a:sysClr'].length > 0 &&
                   colorNode['a:sysClr'][0] && 
                   colorNode['a:sysClr'][0].$) {
          colors[index] = '#' + (colorNode['a:sysClr'][0].$.lastClr || '000000');
        }
      }
    });
  } catch (e) {
    console.log('Error extracting theme colors:', e.message);
  }
  
  return Object.keys(colors).length > 0 ? colors : getDefaultThemeColors();
}

// Get default theme colors
function getDefaultThemeColors() {
  return {
    0: '#FFFFFF',
    1: '#000000',
    2: '#E7E6E6',
    3: '#44546A',
    4: '#5B9BD5',
    5: '#ED7D31',
    6: '#A5A5A5',
    7: '#FFC000',
    8: '#4472C4',
    9: '#70AD47',
    10: '#0563C1',
    11: '#954F72'
  };
}

// Extract styles from styles.xml
function extractStyles(stylesXml, themeColors) {
  const styles = {
    cellXfs: [],
    fills: [],
    fonts: [],
    borders: [],
    dxfs: [],
    numFmts: {}
  };
  
  try {
    if (!stylesXml || !stylesXml.styleSheet) {
      console.log('StyleSheet not found in styles XML');
      return styles;
    }
    
    const styleSheet = stylesXml.styleSheet;
    
    if (styleSheet.numFmts && 
        Array.isArray(styleSheet.numFmts) && 
        styleSheet.numFmts.length > 0 &&
        styleSheet.numFmts[0] && 
        styleSheet.numFmts[0].numFmt &&
        Array.isArray(styleSheet.numFmts[0].numFmt)) {
      
      styleSheet.numFmts[0].numFmt.forEach(fmt => {
        if (fmt && fmt.$ && fmt.$.numFmtId && fmt.$.formatCode) {
          styles.numFmts[fmt.$.numFmtId] = fmt.$.formatCode;
        }
      });
    }
    
    if (styleSheet.fills && 
        Array.isArray(styleSheet.fills) && 
        styleSheet.fills.length > 0 &&
        styleSheet.fills[0] && 
        styleSheet.fills[0].fill &&
        Array.isArray(styleSheet.fills[0].fill)) {
      
      styles.fills = styleSheet.fills[0].fill.map(fill => {
        const fillStyle = {};
        
        if (fill && fill.patternFill && Array.isArray(fill.patternFill) && fill.patternFill.length > 0) {
          const pf = fill.patternFill[0];
          fillStyle.patternType = (pf && pf.$) ? pf.$.patternType : null;
          
          if (pf && pf.fgColor && Array.isArray(pf.fgColor) && pf.fgColor.length > 0 && pf.fgColor[0] && pf.fgColor[0].$) {
            fillStyle.fgColor = parseColor(pf.fgColor[0].$, themeColors);
          }
          
          if (pf && pf.bgColor && Array.isArray(pf.bgColor) && pf.bgColor.length > 0 && pf.bgColor[0] && pf.bgColor[0].$) {
            fillStyle.bgColor = parseColor(pf.bgColor[0].$, themeColors);
          }
        }
        
        return fillStyle;
      });
    }
    
    if (styleSheet.fonts && 
        Array.isArray(styleSheet.fonts) && 
        styleSheet.fonts.length > 0 &&
        styleSheet.fonts[0] && 
        styleSheet.fonts[0].font &&
        Array.isArray(styleSheet.fonts[0].font)) {
      
      styles.fonts = styleSheet.fonts[0].font.map(font => {
        const fontStyle = {};
        
        if (font) {
          if (font.sz && Array.isArray(font.sz) && font.sz.length > 0 && font.sz[0] && font.sz[0].$) {
            fontStyle.size = parseFloat(font.sz[0].$.val);
          }
          if (font.name && Array.isArray(font.name) && font.name.length > 0 && font.name[0] && font.name[0].$) {
            fontStyle.name = font.name[0].$.val;
          }
          if (font.b) fontStyle.bold = true;
          if (font.i) fontStyle.italic = true;
          if (font.u) fontStyle.underline = true;
          
          if (font.color && Array.isArray(font.color) && font.color.length > 0 && font.color[0] && font.color[0].$) {
            fontStyle.color = parseColor(font.color[0].$, themeColors);
          }
        }
        
        return fontStyle;
      });
    }
    
    if (styleSheet.cellXfs && 
        Array.isArray(styleSheet.cellXfs) && 
        styleSheet.cellXfs.length > 0 &&
        styleSheet.cellXfs[0] && 
        styleSheet.cellXfs[0].xf &&
        Array.isArray(styleSheet.cellXfs[0].xf)) {
      
      styles.cellXfs = styleSheet.cellXfs[0].xf.map(xf => {
        const style = {};
        
        if (xf && xf.$) {
          if (xf.$.fillId) style.fillId = parseInt(xf.$.fillId);
          if (xf.$.fontId) style.fontId = parseInt(xf.$.fontId);
          if (xf.$.borderId) style.borderId = parseInt(xf.$.borderId);
          if (xf.$.numFmtId) style.numFmtId = parseInt(xf.$.numFmtId);
        }
        
        if (xf && xf.alignment && Array.isArray(xf.alignment) && xf.alignment.length > 0 && xf.alignment[0] && xf.alignment[0].$) {
          style.alignment = {
            horizontal: xf.alignment[0].$.horizontal,
            vertical: xf.alignment[0].$.vertical,
            wrapText: xf.alignment[0].$.wrapText === '1'
          };
        }
        
        return style;
      });
    }
    
    if (styleSheet.dxfs && 
        Array.isArray(styleSheet.dxfs) && 
        styleSheet.dxfs.length > 0 &&
        styleSheet.dxfs[0] && 
        styleSheet.dxfs[0].dxf &&
        Array.isArray(styleSheet.dxfs[0].dxf)) {
      
      styles.dxfs = styleSheet.dxfs[0].dxf.map(dxf => {
        const dxfStyle = {};
        
        if (dxf && dxf.fill && Array.isArray(dxf.fill) && dxf.fill.length > 0 && 
            dxf.fill[0] && dxf.fill[0].patternFill && 
            Array.isArray(dxf.fill[0].patternFill) && dxf.fill[0].patternFill.length > 0) {
          
          const pf = dxf.fill[0].patternFill[0];
          if (pf && pf.fgColor && Array.isArray(pf.fgColor) && pf.fgColor.length > 0 && pf.fgColor[0] && pf.fgColor[0].$) {
            dxfStyle.backgroundColor = parseColor(pf.fgColor[0].$, themeColors);
          }
        }
        
        if (dxf && dxf.font && Array.isArray(dxf.font) && dxf.font.length > 0 && dxf.font[0]) {
          if (dxf.font[0].color && Array.isArray(dxf.font[0].color) && dxf.font[0].color.length > 0 && 
              dxf.font[0].color[0] && dxf.font[0].color[0].$) {
            dxfStyle.color = parseColor(dxf.font[0].color[0].$, themeColors);
          }
          if (dxf.font[0].b) dxfStyle.fontWeight = 'bold';
          if (dxf.font[0].i) dxfStyle.fontStyle = 'italic';
        }
        
        return dxfStyle;
      });
    }
  } catch (e) {
    console.error('Error in extractStyles:', e.message);
  }
  
  return styles;
}

// Parse color from Excel XML format
function parseColor(colorNode, themeColors) {
  try {
    if (colorNode.rgb) {
      const rgb = colorNode.rgb.replace(/^FF/, '');
      return '#' + rgb;
    } else if (colorNode.theme !== undefined) {
      const themeIndex = parseInt(colorNode.theme);
      let color = (themeColors && themeColors[themeIndex]) ? themeColors[themeIndex] : '#000000';
      
      if (colorNode.tint) {
        color = applyTint(color, parseFloat(colorNode.tint));
      }
      
      return color;
    } else if (colorNode.indexed) {
      return getIndexedColor(parseInt(colorNode.indexed));
    }
  } catch (e) {
    console.log('Error parsing color:', e.message);
  }
  
  return '#000000';
}

// Apply tint to a color
function applyTint(hexColor, tint) {
  try {
    const rgb = hexToRgb(hexColor);
    
    let r, g, b;
    if (tint > 0) {
      r = rgb.r + (255 - rgb.r) * tint;
      g = rgb.g + (255 - rgb.g) * tint;
      b = rgb.b + (255 - rgb.b) * tint;
    } else {
      const factor = 1 + tint;
      r = rgb.r * factor;
      g = rgb.g * factor;
      b = rgb.b * factor;
    }
    
    return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
  } catch (e) {
    console.log('Error applying tint:', e.message);
    return hexColor;
  }
}

// Convert hex to RGB
function hexToRgb(hex) {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  } catch (e) {
    console.log('Error converting hex to RGB:', e.message);
    return { r: 0, g: 0, b: 0 };
  }
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
  try {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  } catch (e) {
    console.log('Error converting RGB to hex:', e.message);
    return '#000000';
  }
}

// Get indexed color from Excel's default palette
function getIndexedColor(index) {
  const palette = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0', '#808080',
    '#9999FF', '#993366', '#FFFFCC', '#CCFFFF', '#660066', '#FF8080', '#0066CC', '#CCCCFF',
    '#000080', '#FF00FF', '#FFFF00', '#00FFFF', '#800080', '#800000', '#008080', '#0000FF',
    '#00CCFF', '#CCFFFF', '#CCFFCC', '#FFFF99', '#99CCFF', '#FF99CC', '#CC99FF', '#FFCC99',
    '#3366FF', '#33CCCC', '#99CC00', '#FFCC00', '#FF9900', '#FF6600', '#666699', '#969696',
    '#003366', '#339966', '#003300', '#333300', '#993300', '#993366', '#333399', '#333333'
  ];
  
  return (palette && palette[index]) ? palette[index] : '#000000';
}

// Main rendering function with complete formatting
async function renderWorksheetWithCompleteFormatting(worksheet, formattingData, worksheetName) {
  try {
    let html = '<div class="excel-table-wrapper">';
    html += '<table class="excel-formatted-table" data-worksheet="' + worksheetName + '">';
    
    if (!worksheet) {
      return '<p>Worksheet not found</p>';
    }
    
    const dimensions = worksheet.dimensions;
    if (!dimensions) {
      return '<p>Empty worksheet</p>';
    }
    
    if (typeof dimensions.left !== 'number' || 
        typeof dimensions.right !== 'number' || 
        typeof dimensions.top !== 'number' || 
        typeof dimensions.bottom !== 'number') {
      console.log('Invalid worksheet dimensions:', dimensions);
      return '<p>Invalid worksheet dimensions</p>';
    }
    
    const cellMap = {};
    let formulaCount = 0;
    let formulaWithResults = 0;
    let formulaWithoutResults = 0;
    
    try {
      worksheet.eachRow((row, rowNumber) => {
        if (row && typeof row.eachCell === 'function') {
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (cell && cell.address) {
              if (cell.type === ExcelJS.ValueType.Formula) {
                formulaCount++;
                if (cell.result !== undefined && cell.result !== null) {
                  formulaWithResults++;
                } else {
                  formulaWithoutResults++;
                  console.log('Formula without result: ' + cell.address + ' = ' + cell.formula);
                }
              }
              
              cellMap[cell.address] = {
                value: cell.value,
                type: cell.type,
                formula: cell.formula,
                result: cell.result,
                styleId: cell.style ? cell.style : 0,
                numFmt: cell.numFmt,
                master: cell.master
              };
            }
          });
        }
      });
      
      console.log('Formula Analysis:', {
        totalFormulas: formulaCount,
        formulasWithResults: formulaWithResults,
        formulasWithoutResults: formulaWithoutResults,
        successRate: formulaCount > 0 ? Math.round((formulaWithResults / formulaCount) * 100) + '%' : 'N/A'
      });
      
    } catch (cellMapError) {
      console.log('Error building cell map:', cellMapError.message);
    }
    
    html += '<thead><tr><th class="excel-row-header"></th>';
    for (let col = dimensions.left; col <= Math.min(dimensions.right, dimensions.left + 50); col++) {
      const colLetter = getColumnLetter(col);
      const column = worksheet.getColumn(col);
      let width = 10;
      if (column && typeof column.width === 'number' && column.width > 0) {
        width = column.width;
      }
      html += '<th class="excel-col-header" style="width: ' + (width * 7) + 'px">' + colLetter + '</th>';
    }
    html += '</tr></thead><tbody>';
    
    const sheetCfRules = (formattingData && 
                          formattingData.conditionalFormats && 
                          formattingData.conditionalFormats['sheet' + worksheet.id]) ? 
                          formattingData.conditionalFormats['sheet' + worksheet.id] : [];
    
    const maxRows = Math.min(dimensions.bottom, dimensions.top + 100);
    const maxCols = Math.min(dimensions.right, dimensions.left + 30);
    
    for (let rowNum = dimensions.top; rowNum <= maxRows; rowNum++) {
      try {
        const row = worksheet.getRow(rowNum);
        let rowHeight = 15;
        if (row && typeof row.height === 'number' && row.height > 0) {
          rowHeight = row.height;
        }
        
        html += '<tr style="height: ' + (rowHeight * 1.5) + 'px">';
        html += '<th class="excel-row-header">' + rowNum + '</th>';
        
        for (let colNum = dimensions.left; colNum <= maxCols; colNum++) {
          try {
            const cell = row ? row.getCell(colNum) : null;
            if (!cell) {
              html += '<td class="excel-cell"></td>';
              continue;
            }
            
            const address = cell.address;
            
            if (cell.isMerged && !cell.master) {
              continue;
            }
            
            let styles = {};
            if (typeof cell.style === 'object' && cell.style) {
              styles = extractDirectStyles(cell.style, formattingData);
            } else if (typeof cell.styleId === 'number' && 
                       formattingData && 
                       formattingData.styles && 
                       formattingData.styles.cellXfs &&
                       Array.isArray(formattingData.styles.cellXfs)) {
              const xf = formattingData.styles.cellXfs[cell.styleId];
              if (xf) {
                styles = applyXfStyles(xf, formattingData.styles);
              }
            }
            
            const cfStyles = evaluateAllConditionalFormats(
              address,
              cell.value,
              sheetCfRules,
              cellMap
            );
            
            Object.assign(styles, cfStyles);
            
            let colspan = 1, rowspan = 1;
            if (cell.isMerged && cell.master) {
              const merge = getMergeRange(worksheet, address);
              colspan = merge.colspan;
              rowspan = merge.rowspan;
            }
            
            const displayValue = formatCellValue(
              cell, 
              (formattingData && formattingData.styles && formattingData.styles.numFmts) ? 
              formattingData.styles.numFmts : {}
            );
            
            const cellClasses = ['excel-cell'];
            if (cell.formula) cellClasses.push('has-formula');
            if (cell.value && typeof cell.value === 'number') {
              if (cell.value > 0) cellClasses.push('positive-value');
              if (cell.value < 0) cellClasses.push('negative-value');
            }
            
            if (cell.style && cell.style.border) {
              if (cell.style.border.top) cellClasses.push('has-border-top');
              if (cell.style.border.bottom) cellClasses.push('has-border-bottom');
              if (cell.style.border.left) cellClasses.push('has-border-left');
              if (cell.style.border.right) cellClasses.push('has-border-right');
            }
            
            const styleStr = Object.entries(styles)
              .map(([k, v]) => camelToKebab(k) + ': ' + v)
              .join('; ');
            
            html += '<td class="' + cellClasses.join(' ') + '" ';
            html += 'data-address="' + address + '" ';
            if (cell.formula) html += 'data-formula="' + escapeHtml(cell.formula) + '" ';
            if (colspan > 1) html += 'colspan="' + colspan + '" ';
            if (rowspan > 1) html += 'rowspan="' + rowspan + '" ';
            html += 'style="' + styleStr + '">';
            html += escapeHtml(displayValue);
            html += '</td>';
          } catch (cellError) {
            console.log('Error processing cell at row ' + rowNum + ', col ' + colNum + ':', cellError.message);
            html += '<td class="excel-cell"></td>';
          }
        }
        
        html += '</tr>';
      } catch (rowError) {
        console.log('Error processing row ' + rowNum + ':', rowError.message);
      }
    }
    
    html += '</tbody></table></div>';
    
    return html;
  } catch (error) {
    console.error('Error in renderWorksheetWithCompleteFormatting:', error);
    return '<p>Error rendering worksheet: ' + error.message + '</p>';
  }
}

// Extract styles from direct ExcelJS style object
function extractDirectStyles(style, formattingData) {
  const styles = {};
  
  try {
    if (style && style.fill && style.fill.type === 'pattern' && style.fill.fgColor) {
      if (style.fill.fgColor.argb) {
        styles.backgroundColor = '#' + style.fill.fgColor.argb.slice(2);
      } else if (style.fill.fgColor.theme !== undefined && 
                 formattingData && 
                 formattingData.themes) {
        const color = formattingData.themes[style.fill.fgColor.theme] || '#FFFFFF';
        styles.backgroundColor = style.fill.fgColor.tint ? 
          applyTint(color, style.fill.fgColor.tint) : color;
      }
    }
    
    if (style && style.font) {
      if (style.font.color) {
        if (style.font.color.argb) {
          styles.color = '#' + style.font.color.argb.slice(2);
        } else if (style.font.color.theme !== undefined && 
                   formattingData && 
                   formattingData.themes) {
          const color = formattingData.themes[style.font.color.theme] || '#000000';
          styles.color = style.font.color.tint ? 
            applyTint(color, style.font.color.tint) : color;
        }
      }
      
      if (style.font.bold) styles.fontWeight = 'bold';
      if (style.font.italic) styles.fontStyle = 'italic';
      if (style.font.underline) styles.textDecoration = 'underline';
      if (style.font.size) styles.fontSize = style.font.size + 'pt';
      if (style.font.name) styles.fontFamily = style.font.name;
    }
    
    if (style && style.alignment) {
      if (style.alignment.horizontal) styles.textAlign = style.alignment.horizontal;
      if (style.alignment.vertical) {
        const vAlignMap = {
          'top': 'top',
          'middle': 'middle', 
          'bottom': 'bottom',
          'center': 'middle'
        };
        styles.verticalAlign = vAlignMap[style.alignment.vertical] || 'middle';
      }
      if (style.alignment.wrapText) {
        styles.whiteSpace = 'pre-wrap';
        styles.wordWrap = 'break-word';
      }
    }
    
    if (style && style.border) {
      const borderStyle = (border) => {
        if (!border || !border.style) return null;
        const width = border.style === 'thick' ? '2px' : '1px';
        const style = border.style === 'dashed' ? 'dashed' : 
                     border.style === 'dotted' ? 'dotted' : 'solid';
        const color = (border.color && border.color.argb) ? 
          '#' + border.color.argb.slice(2) : '#000000';
        return width + ' ' + style + ' ' + color;
      };
      
      if (style.border.top) styles.borderTop = borderStyle(style.border.top);
      if (style.border.bottom) styles.borderBottom = borderStyle(style.border.bottom);
      if (style.border.left) styles.borderLeft = borderStyle(style.border.left);
      if (style.border.right) styles.borderRight = borderStyle(style.border.right);
    }
  } catch (e) {
    console.log('Error extracting direct styles:', e.message);
  }
  
  return styles;
}

// Apply XF styles
function applyXfStyles(xf, styles) {
  const cellStyles = {};
  
  try {
    if (xf.fillId !== undefined && 
        styles && 
        styles.fills && 
        Array.isArray(styles.fills) && 
        styles.fills[xf.fillId]) {
      const fill = styles.fills[xf.fillId];
      if (fill.patternType === 'solid' && fill.fgColor) {
        cellStyles.backgroundColor = fill.fgColor;
      }
    }
    
    if (xf.fontId !== undefined && 
        styles && 
        styles.fonts && 
        Array.isArray(styles.fonts) && 
        styles.fonts[xf.fontId]) {
      const font = styles.fonts[xf.fontId];
      if (font.color) cellStyles.color = font.color;
      if (font.bold) cellStyles.fontWeight = 'bold';
      if (font.italic) cellStyles.fontStyle = 'italic';
      if (font.underline) cellStyles.textDecoration = 'underline';
      if (font.size) cellStyles.fontSize = font.size + 'pt';
      if (font.name) cellStyles.fontFamily = font.name;
    }
    
    if (xf.alignment) {
      if (xf.alignment.horizontal) cellStyles.textAlign = xf.alignment.horizontal;
      if (xf.alignment.vertical) cellStyles.verticalAlign = xf.alignment.vertical;
      if (xf.alignment.wrapText) cellStyles.whiteSpace = 'pre-wrap';
    }
  } catch (e) {
    console.log('Error applying XF styles:', e.message);
  }
  
  return cellStyles;
}

// Evaluate all conditional formats
function evaluateAllConditionalFormats(address, value, rules, cellMap) {
  const styles = {};
  
  try {
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return styles;
    }
    
    const sortedRules = [...rules].sort((a, b) => (a.priority || 1) - (b.priority || 1));
    
    for (const rule of sortedRules) {
      if (!rule || !rule.range || !rule.type) continue;
      
      if (!isInRange(address, rule.range)) continue;
      
      let shouldApply = false;
      
      switch (rule.type) {
        case 'cellIs':
          shouldApply = evaluateCellIsRule(value, rule);
          break;
          
        case 'containsText':
          shouldApply = value && rule.formulas && Array.isArray(rule.formulas) && rule.formulas.length > 0 &&
            value.toString().toLowerCase().includes(rule.formulas[0].toLowerCase());
          break;
          
        case 'expression':
          if (rule.formulas && Array.isArray(rule.formulas) && rule.formulas.length > 0) {
            shouldApply = evaluateExpression(address, rule.formulas[0], cellMap);
          }
          break;
          
        case 'colorScale':
          if (rule.colorScale) {
            const colorStyle = evaluateColorScale(value, rule.range, cellMap, rule.colorScale);
            if (colorStyle) Object.assign(styles, colorStyle);
          }
          break;
          
        case 'dataBar':
          if (rule.dataBar) {
            const barStyle = evaluateDataBar(value, rule.range, cellMap, rule.dataBar);
            if (barStyle) Object.assign(styles, barStyle);
          }
          break;
      }
      
      if (shouldApply && rule.style) {
        Object.assign(styles, rule.style);
        if (rule.stopIfTrue) break;
      }
    }
  } catch (e) {
    console.log('Error evaluating conditional formats:', e.message);
  }
  
  return styles;
}

// Evaluate cellIs conditional format
function evaluateCellIsRule(value, rule) {
  try {
    if (value == null || !rule.formulas || !Array.isArray(rule.formulas) || rule.formulas.length === 0) {
      return false;
    }
    
    const numValue = typeof value === 'number' ? value : parseFloat(value);  
    if (isNaN(numValue)) return false;
    
    const compareValue = parseFloat(rule.formulas[0]);
    if (isNaN(compareValue)) return false;
    
    switch (rule.operator) {
      case 'greaterThan': return numValue > compareValue;
      case 'lessThan': return numValue < compareValue;
      case 'greaterThanOrEqual': return numValue >= compareValue;
      case 'lessThanOrEqual': return numValue <= compareValue;
      case 'equal': return numValue === compareValue;
      case 'notEqual': return numValue !== compareValue;
      case 'between':
        if (rule.formulas.length >= 2) {
          const val2 = parseFloat(rule.formulas[1]);
          if (!isNaN(val2)) {
            return numValue >= compareValue && numValue <= val2;
          }
        }
        return false;
      case 'notBetween':
        if (rule.formulas.length >= 2) {
          const val2 = parseFloat(rule.formulas[1]);
          if (!isNaN(val2)) {
            return numValue < compareValue || numValue > val2;
          }
        }
        return false;
    }
  } catch (e) {
    console.log('Error evaluating cellIs rule:', e.message);
  }
  
  return false;
}

// Simple expression evaluator
function evaluateExpression(address, formula, cellMap) {
  if (!formula || !cellMap) return false;
  
  try {
    let expr = formula;
    const cellRefs = formula.match(/[A-Z]+\d+/g) || [];
    
    for (const ref of cellRefs) {
      const cellData = cellMap[ref];
      if (cellData && cellData.value !== null && cellData.value !== undefined) {
        expr = expr.replace(new RegExp(ref, 'g'), cellData.value);
      }
    }
    
    if (/^[\d\s\+\-\*\/\(\)><=!&|.]+$/.test(expr)) {
      return Function('"use strict"; return (' + expr + ')')();
    }
  } catch (e) {
    console.warn('Failed to evaluate expression:', e.message);
  }
  
  return false;
}

// Helper functions
function isInRange(address, range) {
  try {
    if (!range || !address) return false;
    
    const ranges = range.split(/[\s,]+/);
    const addr = parseAddress(address);
    
    for (const r of ranges) {
      if (r.includes(':')) {
        const [start, end] = r.split(':');
        const startAddr = parseAddress(start);
        const endAddr = parseAddress(end);
        
        if (addr.row >= startAddr.row && addr.row <= endAddr.row &&
            addr.col >= startAddr.col && addr.col <= endAddr.col) {
          return true;
        }
      } else if (r === address) {
        return true;
      }
    }
  } catch (e) {
    console.log('Error checking if address is in range:', e.message);
  }
  
  return false;
}

function parseAddress(address) {
  try {
    const match = address.match(/([A-Z]+)(\d+)/);
    if (!match) return { row: 0, col: 0 };
    
    const col = match[1].split('').reduce((acc, char, i, arr) => 
      acc + (char.charCodeAt(0) - 64) * Math.pow(26, arr.length - i - 1), 0);
    const row = parseInt(match[2]);
    
    return { row, col };
  } catch (e) {
    console.log('Error parsing address:', e.message);
    return { row: 0, col: 0 };
  }
}

function getColumnLetter(col) {
  try {
    let letter = '';
    while (col > 0) {
      const mod = (col - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      col = Math.floor((col - 1) / 26);
    }
    return letter;
  } catch (e) {
    console.log('Error getting column letter:', e.message);
    return 'A';
  }
}

function getMergeRange(worksheet, address) {
  try {
    if (worksheet && worksheet.model && worksheet.model.merges) {
      const merges = worksheet.model.merges;
      
      let mergeArray = [];
      if (Array.isArray(merges)) {
        mergeArray = merges;
      } else if (typeof merges === 'object') {
        mergeArray = Object.keys(merges).map(key => merges[key]);
      }
      
      for (const merge of mergeArray) {
        const mergeRange = typeof merge === 'string' ? merge : merge.range;
        if (mergeRange && isInRange(address, mergeRange)) {
          const [start, end] = mergeRange.split(':');
          const startAddr = parseAddress(start);
          const endAddr = parseAddress(end);
          
          return {
            colspan: endAddr.col - startAddr.col + 1,
            rowspan: endAddr.row - startAddr.row + 1
          };
        }
      }
    }
    
    if (worksheet && worksheet.merges) {
      for (const merge of worksheet.merges) {
        if (isInRange(address, merge)) {
          const [start, end] = merge.split(':');
          const startAddr = parseAddress(start);
          const endAddr = parseAddress(end);
          
          return {
            colspan: endAddr.col - startAddr.col + 1,
            rowspan: endAddr.row - startAddr.row + 1
          };
        }
      }
    }
  } catch (e) {
    console.log('Error getting merge range:', e.message);
  }
  
  return { colspan: 1, rowspan: 1 };
}

// Format cell value with date support
function formatCellValue(cell, numFormats) {
  try {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    
    if (cell.type === ExcelJS.ValueType.Formula) {
      if (cell.result !== undefined && cell.result !== null) {
        if (typeof cell.result === 'string' || typeof cell.result === 'number' || typeof cell.result === 'boolean') {
          if (typeof cell.result === 'string' && cell.result.startsWith('#')) {
            return handleErrorValue(cell.result, cell.formula);
          }
          return formatValue(cell.result, cell.numFmt, numFormats);
        }
      }
      
      return getFormulaPlaceholder(cell.formula);
    }
    
    if (cell.value !== null && typeof cell.value === 'object') {
      if (cell.value.richText && Array.isArray(cell.value.richText)) {
        return cell.value.richText.map(rt => (rt && rt.text) ? rt.text : '').join('');
      }
      
      if (cell.value.text) return cell.value.text;
      if (cell.value.v !== undefined) return String(cell.value.v);
      if (cell.value.value !== undefined) return String(cell.value.value);
      
      const objStr = JSON.stringify(cell.value);
      if (objStr && objStr !== '{}' && objStr !== '[object Object]') {
        try {
          const parsed = JSON.parse(objStr);
          if (parsed.result !== undefined) return String(parsed.result);
          if (parsed.value !== undefined) return String(parsed.value);
          if (parsed.v !== undefined) return String(parsed.v);
        } catch (e) {
          // If we can't parse, return empty
        }
      }
      
      return '';
    }
    
    if (cell.type === ExcelJS.ValueType.Date) {
      return new Date(cell.value).toLocaleDateString();
    }
    
    if (cell.type === ExcelJS.ValueType.Boolean) {
      return cell.value ? 'TRUE' : 'FALSE';
    }
    
    if (cell.type === ExcelJS.ValueType.Error) {
      return '';
    }
    
    if (cell.type === ExcelJS.ValueType.Number && typeof cell.value === 'number') {
      if (isExcelDateFormat(cell.numFmt)) {
        return formatExcelDateValue(cell.value, cell.numFmt);
      }
    }
    
    return formatValue(cell.value, cell.numFmt, numFormats);
  } catch (e) {
    console.log('Error formatting cell value:', e.message);
    return '';
  }
}

// Check if format is a date format
function isExcelDateFormat(numFmt) {
  if (!numFmt) return false;
  
  const dateFormatIds = [14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47];
  
  if (typeof numFmt === 'number') {
    return dateFormatIds.includes(numFmt);
  }
  
  if (typeof numFmt === 'string') {
    const fmt = numFmt.toLowerCase();
    
    if (fmt.includes('"') || fmt.includes('general') || fmt.includes('#,##')) {
      return false;
    }
    
    const hasDateComponent = (
      (fmt.includes('d') && !fmt.match(/^\d+$/)) ||
      (fmt.includes('m') && !fmt.match(/^\d+$/)) ||
      (fmt.includes('y')) ||
      (fmt.includes('h') && fmt.includes(':'))
    );
    
    const hasDateSeparator = fmt.includes('/') || fmt.includes('-') || fmt.includes(':');
    
    return hasDateComponent && hasDateSeparator;
  }
  
  return false;
}

// Format Excel date value
function formatExcelDateValue(serialNumber, numFmt) {
  try {
    const excelEpoch = new Date(1899, 11, 30);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    
    let adjustedSerial = serialNumber;
    if (serialNumber > 59) {
      adjustedSerial = serialNumber - 1;
    }
    
    const date = new Date(excelEpoch.getTime() + (adjustedSerial * millisecondsPerDay));
    
    if (isNaN(date.getTime())) {
      return String(serialNumber);
    }
    
    if (typeof numFmt === 'number') {
      switch(numFmt) {
        case 14: return date.toLocaleDateString('en-US');
        case 15: return formatDateShort(date);
        case 16: return formatDateMonthDay(date);
        case 17: return formatDateMonthYear(date);
        case 18:
        case 19:
        case 20:
        case 21: return date.toLocaleTimeString('en-US');
        case 22: return date.toLocaleString('en-US');
        default: return date.toLocaleDateString('en-US');
      }
    } else if (typeof numFmt === 'string') {
      const fmt = numFmt.toLowerCase();
      
      if (fmt.includes('d') && fmt.includes('mmm') && fmt.includes('yy')) {
        return formatDateShort(date);
      } else if (fmt.includes('mmm') && fmt.includes('yy') && !fmt.includes('d')) {
        return formatDateMonthYear(date);
      } else if (fmt.includes('h:') || fmt.includes('h:')) {
        return date.toLocaleTimeString('en-US');
      } else {
        return date.toLocaleDateString('en-US');
      }
    }
    
    return date.toLocaleDateString('en-US');
  } catch (e) {
    console.log('Error formatting Excel date:', e.message);
    return String(serialNumber);
  }
}

// Date formatting helpers
function formatDateShort(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return date.getDate() + '-' + months[date.getMonth()] + '-' + String(date.getFullYear()).slice(-2);
}

function formatDateMonthDay(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return date.getDate() + '-' + months[date.getMonth()];
}

function formatDateMonthYear(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()] + '-' + String(date.getFullYear()).slice(-2);
}

// Handle error values
function handleErrorValue(errorValue, formula) {
  if (errorValue === '#VALUE!') {
    return getFormulaPlaceholder(formula);
  } else if (errorValue === '#REF!') {
    return '';
  } else if (errorValue === '#NAME?') {
    return '';
  } else if (errorValue === '#DIV/0!') {
    return '0';
  } else if (errorValue === '#NULL!') {
    return '';
  } else if (errorValue === '#NUM!') {
    return '0';
  } else if (errorValue === '#N/A') {
    return '';
  }
  return '';
}

// Get formula placeholder
function getFormulaPlaceholder(formula) {
  if (!formula) return '';
  
  const upperFormula = formula.toUpperCase();
  
  if (upperFormula.includes('FILTER')) return '';
  if (upperFormula.includes('UNIQUE')) return '';
  if (upperFormula.includes('SORT')) return '';
  if (upperFormula.includes('SEQUENCE')) return '';
  if (upperFormula.includes('ANCHORARRAY')) return '';
  if (upperFormula.includes('XLOOKUP')) return '';
  if (upperFormula.includes('RANDARRAY')) return '';
  if (upperFormula.includes('SUM')) return '';
  if (upperFormula.includes('COUNT')) return '';
  if (upperFormula.includes('AVERAGE')) return '';
  if (upperFormula.includes('IF')) return '';
  
  return '';
}

// Format value
function formatValue(value, numFmt, customFormats) {
  try {
    if (value !== null && typeof value === 'object') {
      if (value.v !== undefined) value = value.v;
      else if (value.value !== undefined) value = value.value;
      else if (value.result !== undefined) value = value.result;
      else if (value.text !== undefined) value = value.text;
      else if (Array.isArray(value) && value.length > 0) {
        value = value[0];
        if (Array.isArray(value) && value.length > 0) {
          value = value[0];
        }
      }
      else {
        const str = value.toString();
        if (str !== '[object Object]') {
          value = str;
        } else {
          return '';
        }
      }
    }
    
    if (typeof value !== 'number') return String(value);
    
    const builtInDateFormats = {
      14: 'm/d/yyyy',
      15: 'd-mmm-yy',
      16: 'd-mmm',
      17: 'mmm-yy',
      18: 'h:mm AM/PM',
      19: 'h:mm:ss AM/PM',
      20: 'h:mm',
      21: 'h:mm:ss',
      22: 'm/d/yyyy h:mm',
      45: 'mm:ss',
      46: '[h]:mm:ss',
      47: 'mm:ss.0'
    };
    
    if (typeof numFmt === 'number' && builtInDateFormats[numFmt]) {
      return formatExcelDateValue(value, numFmt);
    }
    
    let format = numFmt;
    if (typeof numFmt === 'number' && customFormats && customFormats[numFmt]) {
      format = customFormats[numFmt];
    }
    
    if (!format || format === 'General') return String(value);
    
    if (format.includes('$') || format.includes('¤')) {
      const decimals = (format.match(/0\.(0+)/) || ['', ''])[1].length;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    }
    
    if (format.includes('%')) {
      const decimals = (format.match(/0\.(0+)/) || ['', ''])[1].length;
      return (value * 100).toFixed(decimals) + '%';
    }
    
    if (format.includes('#,##')) {
      const decimals = (format.match(/0\.(0+)/) || ['', ''])[1].length;
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    }
    
    if (format.includes('_-') || format.includes('* ')) {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(Math.abs(value));
      
      return value < 0 ? '(' + formatted + ')' : formatted;
    }
    
    return String(value);
  } catch (e) {
    console.log('Error formatting value:', e.message);
    return String(value);
  }
}

function camelToKebab(str) {
  try {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  } catch (e) {
    console.log('Error converting camel to kebab:', e.message);
    return str;
  }
}

function escapeHtml(text) {
  try {
    if (text == null) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  } catch (e) {
    console.log('Error escaping HTML:', e.message);
    return String(text || '');
  }
}

// Get enhanced Excel styles
function getEnhancedExcelStyles() {
  return `
    .excel-table-wrapper {
      max-width: 100%;
      overflow-x: auto;
      overflow-y: auto;
      border: 1px solid #b7b7b7;
      background: #ffffff;
      position: relative;
      font-family: 'Calibri', 'Arial', sans-serif;
    }
    
    .excel-formatted-table {
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
      white-space: nowrap;
      background: #ffffff;
      width: 100%;
    }
    
    .excel-formatted-table th,
    .excel-formatted-table td {
      border: none;
      padding: 2px 3px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .excel-formatted-table td.has-border-top {
      border-top: 1px solid #d0d7de !important;
    }
    
    .excel-formatted-table td.has-border-bottom {
      border-bottom: 1px solid #d0d7de !important;
    }
    
    .excel-formatted-table td.has-border-left {
      border-left: 1px solid #d0d7de !important;
    }
    
    .excel-formatted-table td.has-border-right {
      border-right: 1px solid #d0d7de !important;
    }
    
    .excel-row-header,
    .excel-col-header {
      background: linear-gradient(180deg, #f0f0f0 0%, #e0e0e0 100%);
      color: #1f2937;
      font-weight: normal;
      text-align: center;
      font-size: 11px;
      padding: 4px 8px;
      position: sticky;
      z-index: 10;
      user-select: none;
      border: 1px solid #d0d7de;
    }
    
    .excel-row-header {
      left: 0;
      width: 40px;
      min-width: 40px;
      max-width: 40px;
    }
    
    .excel-col-header {
      top: 0;
      height: 20px;
    }
    
    .excel-cell {
      background: inherit;
      position: relative;
      cursor: cell;
      vertical-align: bottom;
      line-height: 1.2;
    }
    
    .excel-cell.has-formula {
      font-style: normal;
    }
    
    .excel-cell:hover {
      outline: 1px solid #4a90e2;
      outline-offset: -1px;
    }
    
    .excel-cell.selected {
      outline: 2px solid #1a73e8;
      outline-offset: -1px;
      background-color: rgba(26, 115, 232, 0.08) !important;
    }
    
    .excel-cell[data-formula]:hover::after {
      content: '=' attr(data-formula);
      position: absolute;
      bottom: 100%;
      left: 0;
      background: #333;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      z-index: 1000;
      pointer-events: none;
      margin-bottom: 2px;
    }
    
    .excel-header-dark-blue {
      background-color: #1f3a5a !important;
      color: white !important;
    }
    
    .excel-theme-accent3 {
      background-color: #d9d9d9 !important;
    }
    
    .excel-cell.cf-data-bar {
      background-image: linear-gradient(to right, #638ec6 var(--bar-width), transparent var(--bar-width));
      background-repeat: no-repeat;
      background-position: left center;
    }
    
    .positive-value {
      color: #008000;
    }
    
    .negative-value {
      color: #ff0000;
    }
    
    @media print {
      .excel-formatted-table {
        display: none !important;
      }
    }
    
    .excel-formatted-table {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
  `;
}

// Get anti-copy script
function getAntiCopyScript() {
  return `
    (function() {
      const tables = document.querySelectorAll('.excel-formatted-table');
      
      tables.forEach(table => {
        table.addEventListener('contextmenu', e => {
          e.preventDefault();
          return false;
        });
        
        table.addEventListener('selectstart', e => {
          e.preventDefault();
          return false;
        });
        
        table.addEventListener('dragstart', e => {
          e.preventDefault();
          return false;
        });
      });
      
      document.addEventListener('keydown', e => {
        if (document.querySelector('.excel-formatted-table:hover')) {
          if ((e.ctrlKey || e.metaKey) && ['c', 'a', 'x', 'v'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            return false;
          }
          
          if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            alert('Printing is disabled for this document.');
            return false;
          }
        }
      });
      
      if (navigator.clipboard) {
        const originalWriteText = navigator.clipboard.writeText;
        navigator.clipboard.writeText = async function(text) {
          if (document.querySelector('.excel-formatted-table:hover')) {
            throw new Error('Copying is disabled');
          }
          return originalWriteText.call(this, text);
        };
      }
      
      document.addEventListener('click', e => {
        const cell = e.target.closest('.excel-cell');
        if (cell) {
          document.querySelectorAll('.excel-cell.selected').forEach(c => {
            c.classList.remove('selected');
          });
          
          cell.classList.add('selected');
          
          const formulaBar = document.getElementById('formulaContent');
          if (formulaBar) {
            const formula = cell.dataset.formula;
            const value = cell.textContent;
            formulaBar.textContent = formula ? '=' + formula : value;
          }
        }
      });
    })();
  `;
}

// Extract color scale details
function extractColorScaleDetails(colorScale) {
  const details = {
    minColor: '#F8696B',
    midColor: '#FFEB84',
    maxColor: '#63BE7B'
  };
  
  try {
    if (colorScale && colorScale.cfvo && Array.isArray(colorScale.cfvo) && colorScale.cfvo.length >= 2) {
      if (colorScale.cfvo[0] && colorScale.cfvo[0].$ && colorScale.cfvo[0].$.type) {
        details.minType = colorScale.cfvo[0].$.type;
      }
      const lastIndex = colorScale.cfvo.length - 1;
      if (colorScale.cfvo[lastIndex] && colorScale.cfvo[lastIndex].$ && colorScale.cfvo[lastIndex].$.type) {
        details.maxType = colorScale.cfvo[lastIndex].$.type;
      }
    }
    
    if (colorScale && colorScale.color && Array.isArray(colorScale.color) && colorScale.color.length >= 2) {
      if (colorScale.color[0] && colorScale.color[0].$ && colorScale.color[0].$.rgb) {
        details.minColor = '#' + colorScale.color[0].$.rgb.slice(-6);
      }
      const lastIndex = colorScale.color.length - 1;
      if (colorScale.color[lastIndex] && 
          colorScale.color[lastIndex].$ && 
          colorScale.color[lastIndex].$.rgb) {
        details.maxColor = '#' + colorScale.color[lastIndex].$.rgb.slice(-6);
      }
    }
  } catch (e) {
    console.log('Error extracting color scale details:', e.message);
  }
  
  return details;
}

// Extract data bar details
function extractDataBarDetails(dataBar) {
  const details = {
    color: '#638EC6',
    showValue: true
  };
  
  try {
    if (dataBar && dataBar.color && Array.isArray(dataBar.color) && dataBar.color.length > 0 && 
        dataBar.color[0] && dataBar.color[0].$ && dataBar.color[0].$.rgb) {
      details.color = '#' + dataBar.color[0].$.rgb.slice(-6);
    }
    
    if (dataBar && dataBar.$ && dataBar.$.showValue === '0') {
      details.showValue = false;
    }
  } catch (e) {
    console.log('Error extracting data bar details:', e.message);
  }
  
  return details;
}

// Evaluate color scale
function evaluateColorScale(value, range, cellMap, colorScaleConfig) {
  try {
    if (typeof value !== 'number') return null;
    
    const values = getRangeValues(range, cellMap).filter(v => typeof v === 'number');
    if (values.length === 0) return null;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    if (min === max) return null;
    
    const percent = (value - min) / (max - min);
    const color = interpolateColor(
      (colorScaleConfig && colorScaleConfig.minColor) ? colorScaleConfig.minColor : '#F8696B',
      (colorScaleConfig && colorScaleConfig.maxColor) ? colorScaleConfig.maxColor : '#63BE7B',
      percent
    );
    
    return { backgroundColor: color };
  } catch (e) {
    console.log('Error evaluating color scale:', e.message);
    return null;
  }
}

// Evaluate data bar
function evaluateDataBar(value, range, cellMap, dataBarConfig) {
  try {
    if (typeof value !== 'number') return null;
    
    const values = getRangeValues(range, cellMap).filter(v => typeof v === 'number');
    if (values.length === 0) return null;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    if (min === max) return null;
    
    const percent = ((value - min) / (max - min)) * 100;
    const color = (dataBarConfig && dataBarConfig.color) ? dataBarConfig.color : '#638EC6';
    
    return {
      '--bar-width': percent + '%',
      backgroundImage: 'linear-gradient(to right, ' + color + ' ' + percent + '%, transparent ' + percent + '%)'
    };
  } catch (e) {
    console.log('Error evaluating data bar:', e.message);
    return null;
  }
}

// Get values from a range
function getRangeValues(range, cellMap) {
  const values = [];
  
  try {
    if (!range || !cellMap) return values;
    
    const ranges = range.split(/[\s,]+/);
    
    for (const r of ranges) {
      if (r.includes(':')) {
        const [start, end] = r.split(':');
        const startAddr = parseAddress(start);
        const endAddr = parseAddress(end);
        
        for (let row = startAddr.row; row <= endAddr.row; row++) {
          for (let col = startAddr.col; col <= endAddr.col; col++) {
            const addr = getColumnLetter(col) + row;
            if (cellMap[addr] && cellMap[addr].value !== null && cellMap[addr].value !== undefined) {
              values.push(cellMap[addr].value);
            }
          }
        }
      } else if (cellMap[r] && cellMap[r].value !== null && cellMap[r].value !== undefined) {
        values.push(cellMap[r].value);
      }
    }
  } catch (e) {
    console.log('Error getting range values:', e.message);
  }
  
  return values;
}

// Color interpolation
function interpolateColor(color1, color2, factor) {
  try {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    
    return rgbToHex(r, g, b);
  } catch (e) {
    console.log('Error interpolating color:', e.message);
    return color1;
  }
}

// Debug function to analyze date cells
function debugDateCells(worksheet) {
  console.log('=== DEBUGGING DATE CELLS ===');
  
  const debugInfo = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 20) return;
    
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (cell.value !== null && cell.value !== undefined) {
        const info = {
          address: cell.address,
          type: cell.type,
          valueType: typeof cell.value,
          value: cell.value,
          numFmt: cell.numFmt,
          numFmtId: cell.style && cell.style.numFmt,
          formula: cell.formula,
          result: cell.result
        };
        
        if (cell.type === ExcelJS.ValueType.Number && typeof cell.value === 'number') {
          if (cell.value > 1 && cell.value < 80000) {
            info.possibleDate = true;
            info.asDate = new Date(1899, 11, 30 + cell.value).toLocaleDateString();
          }
        }
        
        if (cell.type === ExcelJS.ValueType.Date || 
            (cell.numFmt && cell.numFmt.toString().match(/[dmy]/i)) ||
            info.possibleDate) {
          debugInfo.push(info);
        }
      }
    });
  });
  
  console.table(debugInfo);
  
  console.log('ExcelJS ValueType enum:', ExcelJS.ValueType);
  
  return debugInfo;
}