// Enhanced Invoice Management System for InvoiceGen
// Handles invoice CRUD operations, import/export, and advanced features

class InvoiceManager {
    constructor() {
        this.authService = window.ImprovedAuthService || window.AuthService;
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.supportedFormats = ['json', 'csv', 'xlsx'];
        this.init();
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[InvoiceManager] ${message}`, data);
        }
    }

    init() {
        this.log('📋 Initializing Invoice Manager');
        this.setupEventListeners();
        this.initializeInvoiceData();
    }

    setupEventListeners() {
        // Export button
        const exportBtn = document.getElementById('export-invoices-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportModal());
        }

        // Import button
        const importBtn = document.getElementById('import-invoices-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.showImportModal());
        }

        // File input for import
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileImport(e));
        }
    }

    initializeInvoiceData() {
        // Initialize with sample data if no invoices exist
        const invoices = this.getInvoices();
        if (invoices.length === 0) {
            this.createSampleInvoices();
        }
    }

    // CRUD Operations
    createInvoice(invoiceData) {
        try {
            const invoice = {
                id: this.generateInvoiceId(),
                userId: this.getCurrentUserId(),
                ...invoiceData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const invoices = this.getInvoices();
            invoices.push(invoice);
            this.saveInvoices(invoices);

            this.log('✅ Invoice created', invoice);
            return { success: true, invoice };
        } catch (error) {
            this.log('❌ Failed to create invoice', error);
            return { success: false, error: error.message };
        }
    }

    updateInvoice(invoiceId, updateData) {
        try {
            const invoices = this.getInvoices();
            const index = invoices.findIndex(inv => inv.id === invoiceId);
            
            if (index === -1) {
                throw new Error('Invoice not found');
            }

            invoices[index] = {
                ...invoices[index],
                ...updateData,
                updatedAt: new Date().toISOString()
            };

            this.saveInvoices(invoices);
            this.log('✅ Invoice updated', invoices[index]);
            return { success: true, invoice: invoices[index] };
        } catch (error) {
            this.log('❌ Failed to update invoice', error);
            return { success: false, error: error.message };
        }
    }

    deleteInvoice(invoiceId) {
        try {
            const invoices = this.getInvoices();
            const filteredInvoices = invoices.filter(inv => inv.id !== invoiceId);
            
            if (filteredInvoices.length === invoices.length) {
                throw new Error('Invoice not found');
            }

            this.saveInvoices(filteredInvoices);
            this.log('✅ Invoice deleted', invoiceId);
            return { success: true };
        } catch (error) {
            this.log('❌ Failed to delete invoice', error);
            return { success: false, error: error.message };
        }
    }

    getInvoice(invoiceId) {
        const invoices = this.getInvoices();
        return invoices.find(inv => inv.id === invoiceId);
    }

    getInvoices(filters = {}) {
        let invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        
        // Apply filters
        if (filters.status) {
            invoices = invoices.filter(inv => inv.status === filters.status);
        }
        
        if (filters.clientId) {
            invoices = invoices.filter(inv => inv.clientId === filters.clientId);
        }
        
        if (filters.dateFrom) {
            invoices = invoices.filter(inv => new Date(inv.date) >= new Date(filters.dateFrom));
        }
        
        if (filters.dateTo) {
            invoices = invoices.filter(inv => new Date(inv.date) <= new Date(filters.dateTo));
        }

        return invoices;
    }

    saveInvoices(invoices) {
        localStorage.setItem('invoices', JSON.stringify(invoices));
        this.dispatchInvoiceUpdateEvent();
    }

    // Export Functionality
    async exportInvoices(format = 'json', filters = {}) {
        try {
            this.log(`📤 Exporting invoices as ${format}`);
            
            const invoices = this.getInvoices(filters);
            
            if (invoices.length === 0) {
                throw new Error('No invoices to export');
            }

            let exportData;
            let filename;
            let mimeType;

            switch (format.toLowerCase()) {
                case 'json':
                    exportData = JSON.stringify(invoices, null, 2);
                    filename = `invoices_${this.getDateString()}.json`;
                    mimeType = 'application/json';
                    break;
                
                case 'csv':
                    exportData = this.convertToCSV(invoices);
                    filename = `invoices_${this.getDateString()}.csv`;
                    mimeType = 'text/csv';
                    break;
                
                case 'xlsx':
                    // For XLSX, we'll create a CSV for now (can be enhanced with a library)
                    exportData = this.convertToCSV(invoices);
                    filename = `invoices_${this.getDateString()}.csv`;
                    mimeType = 'text/csv';
                    break;
                
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            this.downloadFile(exportData, filename, mimeType);
            this.log('✅ Export completed', { format, count: invoices.length });
            
            return { success: true, count: invoices.length };
        } catch (error) {
            this.log('❌ Export failed', error);
            return { success: false, error: error.message };
        }
    }

    convertToCSV(invoices) {
        const headers = [
            'Invoice Number', 'Date', 'Due Date', 'Status', 'Client Name', 
            'Client Email', 'Subtotal', 'Tax', 'Total', 'Notes'
        ];
        
        const rows = invoices.map(invoice => [
            invoice.number || '',
            invoice.date || '',
            invoice.dueDate || '',
            invoice.status || '',
            this.getClientName(invoice.clientId) || '',
            this.getClientEmail(invoice.clientId) || '',
            invoice.subtotal || 0,
            invoice.tax || 0,
            invoice.total || 0,
            (invoice.notes || '').replace(/"/g, '""') // Escape quotes
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    // Import Functionality
    async importInvoices(file) {
        try {
            this.log('📥 Importing invoices', { filename: file.name, size: file.size });
            
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (!this.supportedFormats.includes(fileExtension)) {
                throw new Error(`Unsupported file format: ${fileExtension}`);
            }

            const fileContent = await this.readFile(file);
            let importedInvoices;

            switch (fileExtension) {
                case 'json':
                    importedInvoices = this.parseJSONImport(fileContent);
                    break;
                
                case 'csv':
                    importedInvoices = this.parseCSVImport(fileContent);
                    break;
                
                default:
                    throw new Error(`Import parser not implemented for: ${fileExtension}`);
            }

            const result = await this.processImportedInvoices(importedInvoices);
            this.log('✅ Import completed', result);
            
            return result;
        } catch (error) {
            this.log('❌ Import failed', error);
            return { success: false, error: error.message };
        }
    }

    parseJSONImport(content) {
        try {
            const data = JSON.parse(content);
            
            // Handle both single invoice and array of invoices
            if (Array.isArray(data)) {
                return data;
            } else if (data && typeof data === 'object') {
                return [data];
            } else {
                throw new Error('Invalid JSON structure');
            }
        } catch (error) {
            throw new Error('Invalid JSON format: ' + error.message);
        }
    }

    parseCSVImport(content) {
        try {
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                throw new Error('CSV file must contain headers and at least one data row');
            }

            const headers = this.parseCSVLine(lines[0]);
            const invoices = [];

            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                
                if (values.length !== headers.length) {
                    this.log(`⚠️ Skipping row ${i + 1}: column count mismatch`);
                    continue;
                }

                const invoice = this.mapCSVRowToInvoice(headers, values);
                if (invoice) {
                    invoices.push(invoice);
                }
            }

            return invoices;
        } catch (error) {
            throw new Error('CSV parsing error: ' + error.message);
        }
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    mapCSVRowToInvoice(headers, values) {
        try {
            const invoice = {
                id: this.generateInvoiceId(),
                userId: this.getCurrentUserId(),
                status: 'draft',
                items: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Map standard fields
            const fieldMapping = {
                'Invoice Number': 'number',
                'Date': 'date',
                'Due Date': 'dueDate',
                'Status': 'status',
                'Subtotal': 'subtotal',
                'Tax': 'tax',
                'Total': 'total',
                'Notes': 'notes'
            };

            headers.forEach((header, index) => {
                const field = fieldMapping[header];
                if (field && values[index]) {
                    if (['subtotal', 'tax', 'total'].includes(field)) {
                        invoice[field] = parseFloat(values[index]) || 0;
                    } else {
                        invoice[field] = values[index];
                    }
                }
            });

            // Handle client information
            const clientName = values[headers.indexOf('Client Name')];
            const clientEmail = values[headers.indexOf('Client Email')];
            
            if (clientName || clientEmail) {
                const client = this.findOrCreateClient(clientName, clientEmail);
                invoice.clientId = client.id;
            }

            // Validate required fields
            if (!invoice.number) {
                invoice.number = `IMP-${Date.now()}`;
            }

            return invoice;
        } catch (error) {
            this.log('❌ Failed to map CSV row', error);
            return null;
        }
    }

    async processImportedInvoices(importedInvoices) {
        const existingInvoices = this.getInvoices();
        const results = {
            success: true,
            imported: 0,
            skipped: 0,
            errors: []
        };

        for (const importedInvoice of importedInvoices) {
            try {
                // Check for duplicates
                const duplicate = existingInvoices.find(inv => 
                    inv.number === importedInvoice.number
                );

                if (duplicate) {
                    results.skipped++;
                    this.log(`⚠️ Skipping duplicate invoice: ${importedInvoice.number}`);
                    continue;
                }

                // Validate and clean imported invoice
                const cleanedInvoice = this.validateAndCleanInvoice(importedInvoice);
                
                if (cleanedInvoice) {
                    existingInvoices.push(cleanedInvoice);
                    results.imported++;
                } else {
                    results.skipped++;
                }
            } catch (error) {
                results.errors.push({
                    invoice: importedInvoice.number || 'Unknown',
                    error: error.message
                });
            }
        }

        if (results.imported > 0) {
            this.saveInvoices(existingInvoices);
        }

        return results;
    }

    validateAndCleanInvoice(invoice) {
        try {
            // Ensure required fields
            if (!invoice.number) {
                invoice.number = `IMP-${Date.now()}`;
            }

            if (!invoice.date) {
                invoice.date = new Date().toISOString().split('T')[0];
            }

            if (!invoice.status) {
                invoice.status = 'draft';
            }

            // Ensure numeric fields
            invoice.subtotal = parseFloat(invoice.subtotal) || 0;
            invoice.tax = parseFloat(invoice.tax) || 0;
            invoice.total = parseFloat(invoice.total) || invoice.subtotal + invoice.tax;

            // Ensure items array
            if (!Array.isArray(invoice.items)) {
                invoice.items = [];
            }

            // Set timestamps
            invoice.createdAt = invoice.createdAt || new Date().toISOString();
            invoice.updatedAt = new Date().toISOString();
            invoice.userId = invoice.userId || this.getCurrentUserId();

            return invoice;
        } catch (error) {
            this.log('❌ Invoice validation failed', error);
            return null;
        }
    }

    // Utility Functions
    generateInvoiceId() {
        return 'INV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    getCurrentUserId() {
        const authService = this.authService ? new this.authService() : null;
        const user = authService?.getCurrentUser();
        return user?.id || 'default-user';
    }

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }

    getClientName(clientId) {
        if (!clientId) return '';
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        const client = clients.find(c => c.id === clientId);
        return client?.name || '';
    }

    getClientEmail(clientId) {
        if (!clientId) return '';
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        const client = clients.find(c => c.id === clientId);
        return client?.email || '';
    }

    findOrCreateClient(name, email) {
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        
        // Try to find existing client
        let client = clients.find(c => 
            (name && c.name.toLowerCase() === name.toLowerCase()) ||
            (email && c.email.toLowerCase() === email.toLowerCase())
        );

        if (!client && (name || email)) {
            // Create new client
            client = {
                id: 'CLIENT-' + Date.now(),
                userId: this.getCurrentUserId(),
                name: name || 'Imported Client',
                email: email || '',
                phone: '',
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zip: '',
                    country: ''
                },
                createdAt: new Date().toISOString()
            };

            clients.push(client);
            localStorage.setItem('clients', JSON.stringify(clients));
            this.log('✅ Created new client during import', client);
        }

        return client;
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    dispatchInvoiceUpdateEvent() {
        const event = new CustomEvent('invoicesUpdated');
        document.dispatchEvent(event);
    }

    // UI Helper Methods
    showExportModal() {
        const modal = this.createExportModal();
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.modal-content').classList.remove('scale-95');
        }, 10);
    }

    createExportModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 opacity-0 transition-opacity duration-300';
        
        modal.innerHTML = `
            <div class="modal-content bg-white rounded-lg p-6 max-w-md w-full mx-4 transform scale-95 transition-transform duration-300">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold text-gray-900">Export Invoices</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                        <select id="export-format" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                            <option value="json">JSON</option>
                            <option value="csv">CSV</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                        <select id="export-status-filter" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                            <input type="date" id="export-date-from" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                            <input type="date" id="export-date-to" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                        </div>
                    </div>
                </div>
                
                <div class="flex space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700">
                        Cancel
                    </button>
                    <button onclick="window.invoiceManager.executeExport()" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                        Export
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    showImportModal() {
        const modal = this.createImportModal();
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.modal-content').classList.remove('scale-95');
        }, 10);
    }

    createImportModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 opacity-0 transition-opacity duration-300';
        
        modal.innerHTML = `
            <div class="modal-content bg-white rounded-lg p-6 max-w-md w-full mx-4 transform scale-95 transition-transform duration-300">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold text-gray-900">Import Invoices</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600 mb-2">Choose a file to import</p>
                        <p class="text-sm text-gray-500 mb-4">Supported formats: JSON, CSV</p>
                        <input type="file" id="import-file-input" accept=".json,.csv" class="hidden" onchange="window.invoiceManager.handleFileSelect(event)">
                        <button onclick="document.getElementById('import-file-input').click()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            Select File
                        </button>
                    </div>
                    
                    <div id="import-file-info" class="hidden">
                        <div class="bg-gray-50 rounded-lg p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-medium text-gray-900" id="import-filename"></p>
                                    <p class="text-sm text-gray-600" id="import-filesize"></p>
                                </div>
                                <button onclick="document.getElementById('import-file-input').value=''; document.getElementById('import-file-info').classList.add('hidden')" class="text-red-600 hover:text-red-800">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-medium text-blue-900 mb-2">Import Notes:</h4>
                        <ul class="text-sm text-blue-800 space-y-1">
                            <li>• Duplicate invoices (same number) will be skipped</li>
                            <li>• Missing clients will be created automatically</li>
                            <li>• Invalid data will be cleaned or skipped</li>
                        </ul>
                    </div>
                </div>
                
                <div class="flex space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700">
                        Cancel
                    </button>
                    <button onclick="window.invoiceManager.executeImport()" id="import-execute-btn" disabled class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        Import
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('import-filename').textContent = file.name;
            document.getElementById('import-filesize').textContent = this.formatFileSize(file.size);
            document.getElementById('import-file-info').classList.remove('hidden');
            document.getElementById('import-execute-btn').disabled = false;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async executeExport() {
        const format = document.getElementById('export-format').value;
        const filters = {
            status: document.getElementById('export-status-filter').value,
            dateFrom: document.getElementById('export-date-from').value,
            dateTo: document.getElementById('export-date-to').value
        };

        // Remove empty filters
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        const result = await this.exportInvoices(format, filters);
        
        if (result.success) {
            this.showAlert(`Successfully exported ${result.count} invoices`, 'success');
        } else {
            this.showAlert(`Export failed: ${result.error}`, 'error');
        }

        // Close modal
        document.querySelector('.fixed').remove();
    }

    async executeImport() {
        const fileInput = document.getElementById('import-file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showAlert('Please select a file to import', 'error');
            return;
        }

        // Show loading state
        const importBtn = document.getElementById('import-execute-btn');
        const originalText = importBtn.textContent;
        importBtn.textContent = 'Importing...';
        importBtn.disabled = true;

        const result = await this.importInvoices(file);
        
        if (result.success) {
            let message = `Import completed: ${result.imported} imported`;
            if (result.skipped > 0) {
                message += `, ${result.skipped} skipped`;
            }
            if (result.errors.length > 0) {
                message += `, ${result.errors.length} errors`;
            }
            this.showAlert(message, 'success');
        } else {
            this.showAlert(`Import failed: ${result.error}`, 'error');
        }

        // Close modal
        document.querySelector('.fixed').remove();
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        const colors = {
            success: 'bg-green-100 border-green-400 text-green-700',
            error: 'bg-red-100 border-red-400 text-red-700',
            info: 'bg-blue-100 border-blue-400 text-blue-700'
        };

        alertDiv.className = `fixed top-4 right-4 ${colors[type]} border px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm`;
        alertDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">&times;</button>
            </div>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }

    createSampleInvoices() {
        const sampleInvoices = [
            {
                id: 'INV-001',
                userId: 'demo-user',
                clientId: 'client-001',
                number: 'INV-001',
                date: '2025-09-01',
                dueDate: '2025-09-30',
                status: 'paid',
                items: [
                    {
                        description: 'Web Design Services',
                        quantity: 1,
                        rate: 2500.00,
                        amount: 2500.00
                    }
                ],
                subtotal: 2500.00,
                tax: 250.00,
                total: 2750.00,
                notes: 'Thank you for your business!',
                createdAt: '2025-09-01T10:00:00Z',
                updatedAt: '2025-09-01T10:00:00Z'
            },
            {
                id: 'INV-002',
                userId: 'demo-user',
                clientId: 'client-002',
                number: 'INV-002',
                date: '2025-09-15',
                dueDate: '2025-10-15',
                status: 'sent',
                items: [
                    {
                        description: 'Consulting Services',
                        quantity: 20,
                        rate: 90.00,
                        amount: 1800.00
                    }
                ],
                subtotal: 1800.00,
                tax: 180.00,
                total: 1980.00,
                notes: 'Payment terms: Net 30',
                createdAt: '2025-09-15T14:30:00Z',
                updatedAt: '2025-09-15T14:30:00Z'
            }
        ];

        localStorage.setItem('invoices', JSON.stringify(sampleInvoices));
        this.log('✅ Sample invoices created');
    }
}

// Global functions for UI integration
window.createInvoice = function() {
    window.location.href = 'create-invoice.html';
};

window.exportInvoices = function() {
    if (window.invoiceManager) {
        window.invoiceManager.showExportModal();
    }
};

window.importInvoices = function() {
    if (window.invoiceManager) {
        window.invoiceManager.showImportModal();
    }
};

window.viewInvoice = function(invoiceId) {
    // This would open invoice details view
    console.log('View invoice:', invoiceId);
};

window.editInvoice = function(invoiceId) {
    // This would open invoice edit form
    console.log('Edit invoice:', invoiceId);
};

window.deleteInvoice = function(invoiceId) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        if (window.invoiceManager) {
            const result = window.invoiceManager.deleteInvoice(invoiceId);
            if (result.success) {
                window.invoiceManager.showAlert('Invoice deleted successfully', 'success');
                // Refresh the invoice list
                if (typeof refreshInvoiceList === 'function') {
                    refreshInvoiceList();
                }
            } else {
                window.invoiceManager.showAlert('Failed to delete invoice: ' + result.error, 'error');
            }
        }
    }
};

// Initialize invoice manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.invoiceManager = new InvoiceManager();
});
