// /api/render-excel-preview.js
import ExcelJS from 'exceljs';
import { LRUCache } from 'lru-cache';

// In-memory cache for rendered sheets
const cache = new LRUCache({
  max: 50,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
  sizeCalculation: (value) => value.html.length,
  maxSize: 50 * 1024 * 1024, // 50MB max
});

export default async function handler(req, res) {
  const { submission_id, sheet_name = null, rows = 100, cols = 30 } = req.query;

  if (!submission_id) {
    return res.status(400).json({ error: 'Missing submission_id' });
  }

  // Generate cache key
  const cacheKey = `${submission_id}-${sheet_name || 'default'}-${rows}-${cols}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Cache hit for:', cacheKey);
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(cached);
  }

  try {
    console.log('Processing Excel file for submission:', submission_id);
    
    // Fetch the Excel file
    const fileBuffer = await fetchExcelFile(submission_id, req);
    
    // Load with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    // Convert to HTML
    const result = await renderWorkbookToHTML(workbook, sheet_name, {
      maxRows: parseInt(rows),
      maxCols: parseInt(cols)
    });
    
    // Extract metadata
    const metadata = {
      sheetNames: workbook.worksheets.map(ws => ws.name),
      company: extractCompanyName(workbook),
      createdDate: new Date().toISOString(),
      totalSheets: workbook.worksheets.length
    };
    
    const response = {
      html: result.html,
      metadata,
      cellCount: result.cellCount,
      hasFormulas: result.hasFormulas
    };
    
    // Cache the result
    cache.set(cacheKey, response);
    
    // Set cache headers
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Excel rendering error:', error);
    res.status(500).json({ 
      error: 'Failed to render Excel file',
      details: error.message 
    });
  }
}

// Fetch Excel file
async function fetchExcelFile(submissionId, req) {
  // Build the API URL
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['host'];
  const apiUrl = `${protocol}://${host}/api/get-model?submission_id=${submissionId}`;
  
  console.log('Fetching file from:', apiUrl);
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Render workbook to HTML
async function renderWorkbookToHTML(workbook, sheetName, limits) {
  const worksheet = sheetName 
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0];
    
  if (!worksheet) {
    throw new Error('Worksheet not found');
  }
  
  let htmlParts = [];
  let cellCount = 0;
  let hasFormulas = false;
  
  // Start table
  htmlParts.push('<table class="excel-table">');
  
  // Column headers
  htmlParts.push('<thead><tr><th></th>');
  for (let i = 1; i <= limits.maxCols; i++) {
    htmlParts.push(`<th>${getColumnLetter(i)}</th>`);
  }
  htmlParts.push('</tr></thead><tbody>');
  
  // Process rows
  let rowNum = 0;
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNum >= limits.maxRows) return;
    
    rowNum++;
    htmlParts.push(`<tr><th>${rowNumber}</th>`);
    
    for (let colNumber = 1; colNumber <= limits.maxCols; colNumber++) {
      const cell = row.getCell(colNumber);
      const cellHtml = renderCell(cell);
      htmlParts.push(cellHtml);
      cellCount++;
      
      if (cell.formula) {
        hasFormulas = true;
      }
    }
    
    htmlParts.push('</tr>');
  });
  
  htmlParts.push('</tbody></table>');
  
  return {
    html: htmlParts.join(''),
    cellCount,
    hasFormulas
  };
}

// Render individual cell
function renderCell(cell) {
  const attrs = [];
  const classes = ['c'];
  const styles = [];
  
  // Extract styling
  const styling = extractCellStyling(cell);
  
  // Background color
  if (styling.bgColor) {
    styles.push(`background-color:${styling.bgColor}`);
  }
  
  // Font color
  if (styling.fontColor) {
    styles.push(`color:${styling.fontColor}`);
  }
  
  // Font weight
  if (styling.bold) {
    classes.push('b');
  }
  
  // Font size
  if (styling.fontSize) {
    styles.push(`font-size:${styling.fontSize}px`);
  }
  
  // Alignment
  if (styling.textAlign) {
    styles.push(`text-align:${styling.textAlign}`);
  }
  
  // Cell type
  const cellType = detectCellType(cell, styling);
  if (cellType !== 'standard') {
    classes.push(cellType.charAt(0));
  }
  
  // Formula
  if (cell.formula) {
    attrs.push(`data-f="${escapeHtml(cell.formula)}"`);
  }
  
  // Value
  const value = getCellDisplayValue(cell);
  
  // Build HTML
  const classAttr = classes.length > 1 ? ` class="${classes.join(' ')}"` : '';
  const styleAttr = styles.length ? ` style="${styles.join(';')}"` : '';
  const dataAttrs = attrs.join(' ');
  
  return `<td${classAttr}${styleAttr}${dataAttrs ? ' ' + dataAttrs : ''}>${value}</td>`;
}

// Extract cell styling
function extractCellStyling(cell) {
  const styling = {};
  
  // Background
  if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid') {
    if (cell.fill.fgColor?.argb) {
      styling.bgColor = '#' + cell.fill.fgColor.argb.substring(2);
    }
  }
  
  // Font
  if (cell.font) {
    if (cell.font.color?.argb) {
      styling.fontColor = '#' + cell.font.color.argb.substring(2);
    }
    if (cell.font.bold) {
      styling.bold = true;
    }
    if (cell.font.size) {
      styling.fontSize = Math.round(cell.font.size * 0.75);
    }
  }
  
  // Alignment
  if (cell.alignment?.horizontal) {
    styling.textAlign = cell.alignment.horizontal;
  }
  
  return styling;
}

// Detect cell type
function detectCellType(cell, styling) {
  // Headers
  if (styling.bgColor === '#14406B' && styling.bold) {
    return 'header';
  }
  
  // Date lines
  if (styling.bgColor === '#D9D9D9') {
    return 'dateline';
  }
  
  // Input cells
  if (styling.fontColor === '#0000FF' && !cell.formula) {
    return 'input';
  }
  
  // Links
  if (cell.formula && (cell.formula.includes('!') || cell.formula.includes('HYPERLINK'))) {
    return 'link';
  }
  
  // Errors
  if (cell.value && typeof cell.value === 'object' && cell.value.error) {
    return 'error';
  }
  
  return 'standard';
}

// Get cell display value
function getCellDisplayValue(cell) {
  if (!cell.value) return '';
  
  // Errors
  if (cell.value && typeof cell.value === 'object' && cell.value.error) {
    return `<span class="e">${cell.value.error}</span>`;
  }
  
  // Dates
  if (cell.type === ExcelJS.ValueType.Date) {
    return cell.value.toLocaleDateString();
  }
  
  // Numbers with formatting
  if (cell.type === ExcelJS.ValueType.Number && cell.numFmt) {
    return formatNumber(cell.value, cell.numFmt);
  }
  
  // Default
  return escapeHtml(cell.text || cell.value.toString());
}

// Format numbers
function formatNumber(value, numFmt) {
  if (numFmt.includes('$')) {
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }
  
  if (numFmt.includes('%')) {
    return (value * 100).toFixed(1) + '%';
  }
  
  if (numFmt.includes('#,##0')) {
    return value.toLocaleString('en-US');
  }
  
  return value.toString();
}

// Utilities
function getColumnLetter(col) {
  let letter = '';
  while (col > 0) {
    letter = String.fromCharCode(65 + ((col - 1) % 26)) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractCompanyName(workbook) {
  const props = workbook.properties;
  if (props?.company) return props.company;
  
  const worksheet = workbook.worksheets[0];
  const possibleCells = ['A1', 'B1', 'A2', 'B2'];
  
  for (const addr of possibleCells) {
    const cell = worksheet.getCell(addr);
    if (cell.text && cell.text.length > 2 && cell.text.length < 100) {
      return cell.text;
    }
  }
  
  return 'Your Company';
}