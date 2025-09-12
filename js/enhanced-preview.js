// Enhanced Financial Model Preview Application
// Uses xlsx library loaded via CDN in HTML

class EnhancedModelPreviewApp {
    constructor() {
        this.currentSheet = null;
        this.workbook = null;
        this.submissionId = null;
        this.renderMode = 'client'; // Force client mode for better formatting
        this.sheets = {};
        this.selectedCell = null;
        this.questionnaireData = null;
        this.isProcessing = false;
        this.debugMode = false;
    }

    async init() {
        console.log('🚀 Initializing Enhanced Model Preview...');
        
        // Get submission ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.submissionId = urlParams.get('submission_id');
        
        if (!this.submissionId) {
            this.showError('No submission ID provided');
            return;
        }

        // Force client mode for better formatting
        this.renderMode = 'client';
        this.updateRenderModeUI();

        console.log(`📊 Loading model with render mode: ${this.renderMode}`);
        
        // Load the model
        await this.loadModel();
    }

    async loadModel() {
        if (this.isProcessing) {
            console.log('⏳ Already processing, skipping duplicate request');
            return;
        }

        this.isProcessing = true;
        this.showLoading(true);

        try {
            console.log(`🔄 Fetching model for submission: ${this.submissionId}`);
            
            // First, fetch questionnaire data
            await this.fetchQuestionnaireData();
            
            // Always use client-side rendering for proper formatting
            await this.loadClientSide();
            
        } catch (error) {
            console.error('❌ Error loading model:', error);
            this.showError('Failed to load financial model', error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    async fetchQuestionnaireData() {
        try {
            const response = await fetch(`/api/get-questionnaire-data?submission_id=${this.submissionId}`);
            if (response.ok) {
                this.questionnaireData = await response.json();
                this.updateBusinessInfo();
            }
        } catch (error) {
            console.error('Error fetching questionnaire data:', error);
        }
    }

    updateBusinessInfo() {
        if (!this.questionnaireData) return;

        const data = this.questionnaireData;
        
        // Update company name
        const companyName = data.company_name || 'Your Company';
        document.getElementById('fileCompanyName').textContent = companyName;
        document.getElementById('headerCompanyName').textContent = companyName;
        
        // Update business info
        document.getElementById('modelingType').textContent = 
            data.modeling_preference || 'Standard';
        document.getElementById('revenueStreams').textContent = 
            data.revenue_streams ? data.revenue_streams.join(', ') : 'Multiple';
        document.getElementById('staffRevenue').textContent = 
            data.staff_generate_revenue || 'No';
        
        // Update created date
        document.getElementById('fileCreated').textContent = 
            new Date().toLocaleDateString();
    }

    async loadClientSide() {
        try {
            console.log('💻 Loading with client-side rendering...');
            
            const response = await fetch(`/api/get-model?submission_id=${this.submissionId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            console.log(`📦 Received file: ${arrayBuffer.byteLength} bytes`);
            
            // Parse with SheetJS with all features enabled
            this.workbook = XLSX.read(arrayBuffer, {
                type: 'array',
                cellStyles: true,
                cellFormula: true,
                cellDates: true,
                cellNF: true,
                sheetStubs: true,
                cellHTML: true,
                raw: true
            });
            
            console.log('📚 Workbook loaded:', {
                sheets: this.workbook.SheetNames,
                count: this.workbook.SheetNames.length
            });
            
            // Extract company name
            const firstSheet = this.workbook.Sheets[this.workbook.SheetNames[0]];
            const companyName = this.extractCompanyName(firstSheet);
            document.getElementById('fileCompanyName').textContent = companyName;
            document.getElementById('headerCompanyName').textContent = companyName;
            
            // Display the workbook
            this.displayWorkbook();
            
        } catch (error) {
            console.error('❌ Client-side loading error:', error);
            throw error;
        }
    }

    extractCompanyName(sheet) {
        // Check common cells for company name
        const possibleCells = ['A1', 'B1', 'A2', 'B2', 'C1', 'C2'];
        for (const addr of possibleCells) {
            const cell = sheet[addr];
            if (cell && cell.v && typeof cell.v === 'string' && 
                cell.v.length > 2 && cell.v.length < 100 &&
                !cell.v.includes('!')) {
                return cell.v;
            }
        }
        return 'Your Company';
    }

    displayWorkbook() {
        // Create sheet tabs
        this.createSheetTabs(this.workbook.SheetNames);
        
        // Display first sheet
        this.switchSheet(this.workbook.SheetNames[0]);
        
        // Show content
        document.getElementById('spreadsheetContent').style.display = 'block';
        this.showLoading(false);
    }

    createSheetTabs(sheetNames) {
        const tabsContainer = document.getElementById('sheetTabs');
        tabsContainer.innerHTML = '';
        
        sheetNames.forEach((name, index) => {
            const tab = document.createElement('button');
            tab.className = 'sheet-tab' + (index === 0 ? ' active' : '');
            tab.textContent = name;
            tab.onclick = () => this.switchSheet(name);
            tabsContainer.appendChild(tab);
        });
        
        tabsContainer.style.display = 'flex';
    }

    switchSheet(sheetName) {
        if (this.currentSheet === sheetName) return;
        
        console.log(`📄 Switching to sheet: ${sheetName}`);
        this.currentSheet = sheetName;
        
        // Update active tab
        document.querySelectorAll('.sheet-tab').forEach((tab, index) => {
            tab.classList.toggle('active', 
                this.workbook.SheetNames[index] === sheetName);
        });
        
        // Always use client-side rendering
        this.renderSheet(sheetName);
    }

    renderSheet(sheetName) {
        const sheet = this.workbook.Sheets[sheetName];
        if (!sheet) {
            console.error(`Sheet not found: ${sheetName}`);
            return;
        }
        
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100');
        const viewport = document.getElementById('excelViewport');
        
        // Clear existing content
        viewport.innerHTML = '';
        
        // Create new table
        const table = document.createElement('table');
        table.className = 'spreadsheet-table';
        table.id = 'spreadsheetTable';
        
        // Create header row with column letters
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th></th>';
        
        const maxCols = Math.min(range.e.c + 1, 26); // Limit to 26 columns (A-Z)
        for (let col = 0; col < maxCols; col++) {
            const th = document.createElement('th');
            th.textContent = XLSX.utils.encode_col(col);
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create tbody
        const tbody = document.createElement('tbody');
        
        // Render data rows
        const maxRows = Math.min(range.e.r + 1, 100);
        for (let row = 0; row < maxRows; row++) {
            const tr = document.createElement('tr');
            
            // Row number
            const rowHeader = document.createElement('th');
            rowHeader.textContent = row + 1;
            tr.appendChild(rowHeader);
            
            // Data cells
            for (let col = 0; col < maxCols; col++) {
                const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = sheet[cellAddr];
                const td = this.createCellElement(cell, cellAddr, sheet);
                tr.appendChild(td);
            }
            
            tbody.appendChild(tr);
        }
        
        table.appendChild(tbody);
        viewport.appendChild(table);
        
        // Attach interactions after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.attachCellInteractions();
        }, 100);
        
        console.log(`✅ Rendered ${maxRows} rows x ${maxCols} columns`);
    }

    createCellElement(cell, address, sheet) {
        const td = document.createElement('td');
        td.dataset.address = address;
        
        if (!cell) {
            td.className = 'empty-cell';
            td.innerHTML = '&nbsp;';
            return td;
        }
        
        // Get display value
        let displayValue = '';
        if (cell.w !== undefined) {
            // Use formatted value if available
            displayValue = cell.w;
        } else if (cell.v !== undefined) {
            if (cell.t === 'n') {
                displayValue = this.formatNumber(cell.v, cell.z);
            } else if (cell.t === 'd') {
                displayValue = this.formatDate(cell.v);
            } else {
                displayValue = String(cell.v);
            }
        }
        
        // Set text content
        td.textContent = displayValue || '';
        
        // Apply styling
        this.applyCellStyles(td, cell, sheet);
        
        // Store formula if present
        if (cell.f) {
            td.dataset.formula = cell.f;
        }
        
        // Store raw value for reference
        if (cell.v !== undefined) {
            td.dataset.value = cell.v;
        }
        
        return td;
    }

    applyCellStyles(td, cell, sheet) {
        const classes = [];
        const styles = [];
        
        if (!cell || !cell.s) {
            return;
        }
        
        const s = cell.s;
        
        // Font styling
        if (s.font) {
            if (s.font.bold) {
                styles.push('font-weight: bold');
            }
            if (s.font.italic) {
                styles.push('font-style: italic');
            }
            if (s.font.sz) {
                // Excel font sizes are in points, convert to pixels
                const fontSize = Math.round(s.font.sz * 1.33);
                styles.push(`font-size: ${fontSize}px`);
            }
            if (s.font.color) {
                const color = this.getColorString(s.font.color);
                if (color) {
                    styles.push(`color: ${color}`);
                    
                    // Special cell types based on color
                    if (color === '#0000FF' || color === '#0000ff') {
                        classes.push('cell-input');
                    } else if (color === '#FF0000' || color === '#ff0000') {
                        classes.push('number-negative');
                    } else if (color === '#008000' || color === '#008000') {
                        classes.push('cell-link');
                    }
                }
            }
        }
        
        // Fill (background)
        if (s.fill && s.fill.fgColor) {
            const bgColor = this.getColorString(s.fill.fgColor);
            if (bgColor && bgColor !== '#000000') {
                styles.push(`background-color: ${bgColor}`);
                
                // Special cell types based on background
                if (bgColor === '#14406B' || bgColor.toLowerCase() === '#14406b') {
                    classes.push('cell-header');
                    styles.push('color: white !important');
                } else if (bgColor === '#D9D9D9' || bgColor.toLowerCase() === '#d9d9d9') {
                    classes.push('cell-dateline');
                } else if (bgColor === '#DEEBF5' || bgColor.toLowerCase() === '#deebf5') {
                    classes.push('cell-breakline');
                } else if (bgColor === '#808080' || bgColor.toLowerCase() === '#808080') {
                    classes.push('cell-calculation');
                    styles.push('color: white !important');
                }
            }
        }
        
        // Alignment
        if (s.alignment) {
            if (s.alignment.horizontal) {
                styles.push(`text-align: ${s.alignment.horizontal}`);
            }
            if (s.alignment.vertical) {
                styles.push(`vertical-align: ${s.alignment.vertical}`);
            }
        }
        
        // Number formatting indicators
        if (cell.z) {
            if (cell.z.includes('$')) {
                classes.push('number-currency');
            }
            if (cell.z.includes('%')) {
                classes.push('number-percentage');
            }
        }
        
        // Apply classes and styles
        if (classes.length > 0) {
            td.className = classes.join(' ');
        }
        if (styles.length > 0) {
            td.style.cssText = styles.join('; ');
        }
    }

    getColorString(color) {
        if (!color) return null;
        
        // ARGB format (8 hex digits)
        if (color.argb) {
            return '#' + color.argb.substring(2);
        }
        
        // RGB format (6 hex digits)
        if (color.rgb) {
            if (color.rgb.length === 6) {
                return '#' + color.rgb;
            } else if (color.rgb.length === 8) {
                return '#' + color.rgb.substring(2);
            }
        }
        
        // Theme color
        if (color.theme !== undefined) {
            // Basic theme color mapping
            const themeColors = [
                '#FFFFFF', '#000000', '#E7E6E6', '#44546A',
                '#5B9BD5', '#ED7D31', '#A5A5A5', '#FFC000',
                '#4472C4', '#70AD47'
            ];
            return themeColors[color.theme] || null;
        }
        
        return null;
    }

    formatNumber(value, format) {
        if (!format || typeof value !== 'number') {
            return value.toString();
        }
        
        // Use XLSX's built-in formatter if available
        if (XLSX.SSF) {
            try {
                return XLSX.SSF.format(format, value);
            } catch (e) {
                // Fallback to manual formatting
            }
        }
        
        // Manual formatting fallback
        if (format.includes('$')) {
            const formatted = value.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
            return '$' + formatted;
        }
        
        if (format.includes('%')) {
            return (value * 100).toFixed(1) + '%';
        }
        
        if (format.includes('#,##0')) {
            return value.toLocaleString('en-US');
        }
        
        return value.toString();
    }

    formatDate(value) {
        if (value instanceof Date) {
            return value.toLocaleDateString();
        }
        // Excel date serial number
        if (typeof value === 'number') {
            const date = XLSX.SSF.parse_date_code(value);
            return `${date.m}/${date.d}/${date.y}`;
        }
        return value;
    }

    attachCellInteractions() {
        const table = document.getElementById('spreadsheetTable');
        if (!table) {
            console.error('Table not found for cell interactions');
            return;
        }
        
        // Remove any existing event listeners
        const cells = table.querySelectorAll('td');
        
        cells.forEach(cell => {
            // Make cells interactive
            cell.style.cursor = 'cell';
            
            // Remove old listeners
            cell.replaceWith(cell.cloneNode(true));
        });
        
        // Re-query cells after cloning
        const newCells = table.querySelectorAll('td');
        
        newCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectCell(cell);
            });
        });
        
        console.log(`✅ Attached interactions to ${newCells.length} cells`);
    }

    selectCell(cell) {
        // Remove previous selection
        const prevSelected = document.querySelectorAll('.selected');
        prevSelected.forEach(el => el.classList.remove('selected'));
        
        // Add selection
        cell.classList.add('selected');
        this.selectedCell = cell;
        
        // Update formula bar
        const formula = cell.dataset.formula || '';
        const value = cell.dataset.value || cell.textContent || '';
        const address = cell.dataset.address || '';
        
        const formulaContent = formula ? `=${formula}` : value;
        document.getElementById('formulaContent').textContent = formulaContent;
        
        console.log(`Selected cell ${address}:`, { formula, value });
    }

    setRenderMode(mode) {
        // Always use client mode for proper formatting
        this.renderMode = 'client';
        this.updateRenderModeUI();
        console.log('Render mode fixed to client for proper formatting');
    }

    updateRenderModeUI() {
        document.querySelectorAll('.render-mode-btn').forEach(btn => {
            const btnMode = btn.textContent === 'Quality' ? 'hybrid' : 'client';
            btn.classList.toggle('active', btnMode === 'client');
        });
    }

    showLoading(show) {
        document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
        document.getElementById('spreadsheetContent').style.display = show ? 'none' : 'block';
        document.getElementById('errorContainer').style.display = 'none';
    }

    showError(message, details = '') {
        console.error('🚨 Error:', message, details);
        
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('spreadsheetContent').style.display = 'none';
        document.getElementById('errorContainer').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
        
        if (this.debugMode && details) {
            const debugInfo = document.createElement('div');
            debugInfo.className = 'debug-info';
            debugInfo.innerHTML = `
                <strong>Debug Information:</strong><br>
                Submission ID: ${this.submissionId}<br>
                Render Mode: ${this.renderMode}<br>
                Error: ${details}<br>
                Time: ${new Date().toISOString()}
            `;
            document.getElementById('errorContainer').appendChild(debugInfo);
        }
    }
}

// Initialize the application and make it globally accessible
const app = new EnhancedModelPreviewApp();
window.app = app; // Make app globally accessible for HTML onclick handlers

// Global functions for buttons
function handlePurchase() {
    app.showError('Purchase functionality coming soon!');
}

function handleCustomization() {
    window.location.href = '/tailored-models';
}

function handleAssumptions() {
    window.location.href = '/questionnaire';
}

function retryLoad() {
    window.location.reload();
}

function toggleDebugInfo() {
    app.debugMode = !app.debugMode;
    app.showError(document.getElementById('errorMessage').textContent, 
        'Debug mode ' + (app.debugMode ? 'enabled' : 'disabled'));
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedModelPreviewApp;
}