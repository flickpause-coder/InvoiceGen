// Enhanced Invoice Automation System
class InvoiceAutomation {
    constructor() {
        this.invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        this.clients = JSON.parse(localStorage.getItem('clients') || '[]');
        this.settings = JSON.parse(localStorage.getItem('invoiceSettings') || '{}');
        this.templates = JSON.parse(localStorage.getItem('invoiceTemplates') || '[]');
        
        this.initializeDefaults();
    }

    initializeDefaults() {
        // Initialize default settings if not present
        if (Object.keys(this.settings).length === 0) {
            this.settings = {
                autoNumbering: true,
                defaultDueDays: 30,
                defaultTaxRate: 0.1,
                currency: 'USD',
                companyInfo: {
                    name: 'Your Company Name',
                    address: '',
                    email: '',
                    phone: '',
                    website: ''
                }
            };
            this.saveSettings();
        }

        // Initialize default templates if not present
        if (this.templates.length === 0) {
            this.templates = [
                {
                    id: 'default',
                    name: 'Default Template',
                    design: {
                        template: 'professional',
                        color: 'blue',
                        headingFont: 'sans',
                        bodyFont: 'sans',
                        fontSize: 'medium'
                    }
                }
            ];
            this.saveTemplates();
        }
    }

    // Invoice Creation
    createInvoice(invoiceData) {
        try {
            const invoice = {
                id: this.generateInvoiceId(),
                number: this.generateInvoiceNumber(),
                clientId: invoiceData.clientId,
                date: invoiceData.date || new Date().toISOString().split('T')[0],
                dueDate: invoiceData.dueDate || this.calculateDueDate(invoiceData.date),
                items: invoiceData.items || [],
                subtotal: 0,
                taxRate: invoiceData.taxRate || this.settings.defaultTaxRate,
                taxAmount: 0,
                total: 0,
                status: 'draft',
                notes: invoiceData.notes || '',
                terms: invoiceData.terms || '',
                design: invoiceData.design || this.getDefaultDesign(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Calculate totals
            this.calculateInvoiceTotals(invoice);

            // Add to invoices array
            this.invoices.push(invoice);
            this.saveInvoices();

            // Dispatch event for UI updates
            this.dispatchInvoiceEvent('invoiceCreated', invoice);

            return invoice;
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw new Error('Failed to create invoice');
        }
    }

    // Invoice Calculation
    calculateInvoiceTotals(invoice) {
        invoice.subtotal = invoice.items.reduce((sum, item) => {
            return sum + (item.quantity * item.rate);
        }, 0);

        invoice.taxAmount = invoice.subtotal * invoice.taxRate;
        invoice.total = invoice.subtotal + invoice.taxAmount;

        return invoice;
    }

    // Invoice Management
    updateInvoice(invoiceId, updates) {
        const invoiceIndex = this.invoices.findIndex(inv => inv.id === invoiceId);
        if (invoiceIndex === -1) {
            throw new Error('Invoice not found');
        }

        const invoice = { ...this.invoices[invoiceIndex], ...updates };
        invoice.updatedAt = new Date().toISOString();

        // Recalculate totals if items changed
        if (updates.items) {
            this.calculateInvoiceTotals(invoice);
        }

        this.invoices[invoiceIndex] = invoice;
        this.saveInvoices();

        this.dispatchInvoiceEvent('invoiceUpdated', invoice);
        return invoice;
    }

    deleteInvoice(invoiceId) {
        const invoiceIndex = this.invoices.findIndex(inv => inv.id === invoiceId);
        if (invoiceIndex === -1) {
            throw new Error('Invoice not found');
        }

        const deletedInvoice = this.invoices.splice(invoiceIndex, 1)[0];
        this.saveInvoices();

        this.dispatchInvoiceEvent('invoiceDeleted', deletedInvoice);
        return deletedInvoice;
    }

    // Invoice Status Management
    updateInvoiceStatus(invoiceId, status) {
        const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid invoice status');
        }

        return this.updateInvoice(invoiceId, { status });
    }

    // Import/Export Functionality
    exportInvoices(format = 'json') {
        try {
            let data, filename, mimeType;

            switch (format.toLowerCase()) {
                case 'json':
                    data = JSON.stringify(this.invoices, null, 2);
                    filename = `invoices_${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
                    break;

                case 'csv':
                    data = this.convertToCSV(this.invoices);
                    filename = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = 'text/csv';
                    break;

                default:
                    throw new Error('Unsupported export format');
            }

            this.downloadFile(data, filename, mimeType);
            return { success: true, message: `Invoices exported as ${format.toUpperCase()}` };
        } catch (error) {
            console.error('Export error:', error);
            return { success: false, message: error.message };
        }
    }

    importInvoices(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    let importedInvoices = [];

                    if (file.name.endsWith('.json')) {
                        importedInvoices = JSON.parse(content);
                    } else if (file.name.endsWith('.csv')) {
                        importedInvoices = this.parseCSV(content);
                    } else {
                        throw new Error('Unsupported file format. Please use JSON or CSV.');
                    }

                    // Validate and process imported invoices
                    const processedInvoices = this.processImportedInvoices(importedInvoices);
                    
                    // Add to existing invoices
                    this.invoices.push(...processedInvoices);
                    this.saveInvoices();

                    this.dispatchInvoiceEvent('invoicesImported', processedInvoices);
                    
                    resolve({
                        success: true,
                        message: `Successfully imported ${processedInvoices.length} invoices`,
                        count: processedInvoices.length
                    });
                } catch (error) {
                    console.error('Import error:', error);
                    reject({
                        success: false,
                        message: error.message
                    });
                }
            };

            reader.onerror = () => {
                reject({
                    success: false,
                    message: 'Failed to read file'
                });
            };

            reader.readAsText(file);
        });
    }

    processImportedInvoices(invoices) {
        return invoices.map(invoice => {
            // Ensure required fields and generate new IDs
            const processedInvoice = {
                id: this.generateInvoiceId(),
                number: invoice.number || this.generateInvoiceNumber(),
                clientId: invoice.clientId || null,
                date: invoice.date || new Date().toISOString().split('T')[0],
                dueDate: invoice.dueDate || this.calculateDueDate(invoice.date),
                items: invoice.items || [],
                subtotal: invoice.subtotal || 0,
                taxRate: invoice.taxRate || this.settings.defaultTaxRate,
                taxAmount: invoice.taxAmount || 0,
                total: invoice.total || 0,
                status: invoice.status || 'draft',
                notes: invoice.notes || '',
                terms: invoice.terms || '',
                design: invoice.design || this.getDefaultDesign(),
                createdAt: invoice.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Recalculate totals
            this.calculateInvoiceTotals(processedInvoice);

            return processedInvoice;
        });
    }

    // CSV Conversion
    convertToCSV(invoices) {
        const headers = [
            'ID', 'Number', 'Client ID', 'Date', 'Due Date', 
            'Subtotal', 'Tax Rate', 'Tax Amount', 'Total', 'Status', 'Notes'
        ];

        const rows = invoices.map(invoice => [
            invoice.id,
            invoice.number,
            invoice.clientId || '',
            invoice.date,
            invoice.dueDate,
            invoice.subtotal,
            invoice.taxRate,
            invoice.taxAmount,
            invoice.total,
            invoice.status,
            `"${(invoice.notes || '').replace(/"/g, '""')}"`
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    parseCSV(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const invoice = {};
            
            headers.forEach((header, index) => {
                const value = values[index]?.trim() || '';
                
                switch (header.toLowerCase()) {
                    case 'id':
                        invoice.id = value;
                        break;
                    case 'number':
                        invoice.number = value;
                        break;
                    case 'client id':
                        invoice.clientId = value;
                        break;
                    case 'date':
                        invoice.date = value;
                        break;
                    case 'due date':
                        invoice.dueDate = value;
                        break;
                    case 'subtotal':
                        invoice.subtotal = parseFloat(value) || 0;
                        break;
                    case 'tax rate':
                        invoice.taxRate = parseFloat(value) || 0;
                        break;
                    case 'tax amount':
                        invoice.taxAmount = parseFloat(value) || 0;
                        break;
                    case 'total':
                        invoice.total = parseFloat(value) || 0;
                        break;
                    case 'status':
                        invoice.status = value;
                        break;
                    case 'notes':
                        invoice.notes = value.replace(/^"|"$/g, '').replace(/""/g, '"');
                        break;
                }
            });
            
            return invoice;
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    // Utility Functions
    generateInvoiceId() {
        return 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateInvoiceNumber() {
        if (!this.settings.autoNumbering) {
            return '';
        }

        const currentYear = new Date().getFullYear();
        const yearInvoices = this.invoices.filter(inv => 
            inv.date && inv.date.startsWith(currentYear.toString())
        );
        
        const nextNumber = yearInvoices.length + 1;
        return `INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    }

    calculateDueDate(invoiceDate) {
        const date = new Date(invoiceDate || new Date());
        date.setDate(date.getDate() + this.settings.defaultDueDays);
        return date.toISOString().split('T')[0];
    }

    getDefaultDesign() {
        const defaultTemplate = this.templates.find(t => t.id === 'default');
        return defaultTemplate ? defaultTemplate.design : {
            template: 'professional',
            color: 'blue',
            headingFont: 'sans',
            bodyFont: 'sans',
            fontSize: 'medium'
        };
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

    // Data Persistence
    saveInvoices() {
        localStorage.setItem('invoices', JSON.stringify(this.invoices));
    }

    saveSettings() {
        localStorage.setItem('invoiceSettings', JSON.stringify(this.settings));
    }

    saveTemplates() {
        localStorage.setItem('invoiceTemplates', JSON.stringify(this.templates));
    }

    // Event System
    dispatchInvoiceEvent(eventType, data) {
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
    }

    // Query Methods
    getInvoice(invoiceId) {
        return this.invoices.find(inv => inv.id === invoiceId);
    }

    getInvoicesByClient(clientId) {
        return this.invoices.filter(inv => inv.clientId === clientId);
    }

    getInvoicesByStatus(status) {
        return this.invoices.filter(inv => inv.status === status);
    }

    getInvoicesByDateRange(startDate, endDate) {
        return this.invoices.filter(inv => {
            const invoiceDate = new Date(inv.date);
            return invoiceDate >= new Date(startDate) && invoiceDate <= new Date(endDate);
        });
    }

    // Statistics
    getInvoiceStatistics() {
        const stats = {
            total: this.invoices.length,
            draft: this.invoices.filter(inv => inv.status === 'draft').length,
            sent: this.invoices.filter(inv => inv.status === 'sent').length,
            paid: this.invoices.filter(inv => inv.status === 'paid').length,
            overdue: this.invoices.filter(inv => inv.status === 'overdue').length,
            cancelled: this.invoices.filter(inv => inv.status === 'cancelled').length,
            totalRevenue: this.invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
            pendingRevenue: this.invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.total, 0),
            overdueRevenue: this.invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0)
        };

        return stats;
    }
}

// Global instance
window.InvoiceAutomation = InvoiceAutomation;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (!window.invoiceAutomation) {
        window.invoiceAutomation = new InvoiceAutomation();
    }
});
