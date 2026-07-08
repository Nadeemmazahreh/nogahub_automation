/**
 * PDF Generation Helper Functions
 * Shared utilities for generating PDF documents
 */

/**
 * Common PDF styles used across all document types
 */
export const PDF_STYLES = `
  @media print {
    @page { margin: 0.5in; }
    body { margin: 0; }
  }
  body {
    font-family: Arial, sans-serif;
    margin: 20px;
    font-size: 12px;
  }
  .header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
  }
  .company-info {
    margin-bottom: 15px;
    font-size: 11px;
  }
  .project-info {
    margin-bottom: 15px;
    font-size: 11px;
  }
  .equipment-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    font-size: 11px;
  }
  .equipment-table th, .equipment-table td {
    border: 1px solid #ddd;
    padding: 6px;
    text-align: left;
  }
  .equipment-table th {
    background-color: #f5f5f5;
    font-weight: bold;
  }
  .totals {
    margin-top: 20px;
    text-align: right;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }
  .totals-row.total-final {
    font-weight: bold;
    font-size: 14px;
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    margin-top: 10px;
  }
  .totals-row.discount {
    color: #16a34a;
    font-style: italic;
  }
  .notes {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #ddd;
    font-size: 10px;
    color: #666;
  }
`;

/**
 * Generate company header HTML
 */
export const generateCompanyHeader = (title) => `
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">${title}</h1>
    <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Nogahub - Deep Sound Technical Consultations</p>
  </div>
`;

/**
 * Generate project info section HTML
 */
export const generateProjectInfo = (project) => `
  <div class="project-info">
    <p><strong>Project Name:</strong> ${project.projectName || 'Untitled Project'}</p>
    <p><strong>Client:</strong> ${project.clientName || 'N/A'}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
  </div>
`;

/**
 * Generate company info section HTML
 */
export const generateCompanyInfo = () => `
  <div class="company-info">
    <p><strong>Nogahub</strong></p>
    <p>Deep Sound Technical Consultations</p>
    <p>Email: info@nogahub.com</p>
  </div>
`;

/**
 * Generate equipment table row HTML
 */
export const generateEquipmentRow = (item, index) => `
  <tr>
    <td>${index + 1}</td>
    <td>${item.name}</td>
    <td>${item.quantity}</td>
    <td>${Math.round(item.finalUnitPriceJOD || item.dealerPriceJOD || 0)} JOD</td>
    <td>${Math.round(item.finalTotalJOD || item.dealerTotalJOD || 0)} JOD</td>
  </tr>
`;

/**
 * Generate notes section HTML
 */
export const generateNotesSection = () => `
  <div class="notes">
    <p><strong>Notes:</strong></p>
    <ul>
      <li>All prices are in Jordanian Dinars (JOD)</li>
      <li>Prices include shipping and customs clearance</li>
      <li>This quotation is valid for 30 days from the date of issue</li>
      <li>Payment terms: As per agreement</li>
    </ul>
  </div>
`;

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses dynamic import to avoid build-time issues with DOMPurify
 */
export const sanitizeHTML = async (htmlContent) => {
  // Only import DOMPurify in browser environment
  if (typeof window !== 'undefined') {
    const DOMPurify = (await import('dompurify')).default;
    return DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: [
        'html', 'head', 'body', 'title', 'style', 'meta',
        'div', 'p', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'br', 'strong', 'em', 'b', 'i'
      ],
      ALLOWED_ATTR: ['class', 'style', 'id'],
      ALLOW_DATA_ATTR: false,
    });
  }
  // Fallback for non-browser environments (shouldn't happen in practice)
  return htmlContent;
};

/**
 * Open a new window and write PDF content
 * Sanitizes HTML content before writing to prevent XSS attacks
 */
export const openPDFWindow = async (htmlContent, title) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups for this site.');
  }

  // Sanitize HTML content to prevent XSS attacks
  const sanitizedContent = await sanitizeHTML(htmlContent);

  printWindow.document.open();
  printWindow.document.write(sanitizedContent);
  printWindow.document.close();
  printWindow.document.title = title;

  // Auto-print when loaded
  printWindow.onload = () => {
    printWindow.print();
  };
};

/**
 * Generate complete HTML document for PDF
 */
export const generatePDFDocument = (title, bodyContent) => `
  <html>
    <head>
      <title>${title}</title>
      <style>${PDF_STYLES}</style>
    </head>
    <body>
      ${bodyContent}
    </body>
  </html>
`;
