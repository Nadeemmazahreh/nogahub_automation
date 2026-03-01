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
 * Generate totals section HTML
 */
export const generateTotalsSection = (calculationResults, project) => {
  const hasDiscount = project.globalDiscount > 0;

  return `
    <div class="totals">
      ${hasDiscount ? `
        <div class="totals-row">
          <span>Equipment Subtotal (before discount):</span>
          <span>${Math.round(calculationResults.equipmentTotalJODBeforeDiscount || 0)} JOD</span>
        </div>
        <div class="totals-row discount">
          <span>Equipment Discount (${(parseFloat(project.globalDiscount) || 0).toFixed(2)}%):</span>
          <span>-${Math.round(((calculationResults.equipmentTotalJODBeforeDiscount || 0) * project.globalDiscount) / 100)} JOD</span>
        </div>
        <div class="totals-row">
          <span>Equipment Subtotal (after discount):</span>
          <span>${Math.round((calculationResults.equipmentTotalJODBeforeDiscount || 0) - (((calculationResults.equipmentTotalJODBeforeDiscount || 0) * project.globalDiscount) / 100))} JOD</span>
        </div>
      ` : `
        <div class="totals-row">
          <span>Equipment Subtotal:</span>
          <span>${Math.round(calculationResults.equipmentTotalJODBeforeDiscount || 0)} JOD</span>
        </div>
      `}
      ${calculationResults.customEquipmentDetails && calculationResults.customEquipmentDetails.length > 0 ? `
        <div class="totals-row">
          <span>Custom Equipment Subtotal:</span>
          <span>${Math.round(calculationResults.customEquipmentTotalJOD || 0)} JOD</span>
        </div>
      ` : ''}
      ${calculationResults.servicesTotal > 0 ? `
        <div class="totals-row">
          <span>Services Subtotal:</span>
          <span>${Math.round(calculationResults.servicesTotal || 0)} JOD</span>
        </div>
      ` : ''}
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>${Math.round(calculationResults.projectSubtotalJOD || 0)} JOD</span>
      </div>
      ${project.includeTax ? `
      <div class="totals-row">
        <span>VAT (16%):</span>
        <span>${Math.round(calculationResults.projectTaxJOD || 0)} JOD</span>
      </div>
      ` : ''}
      <div class="totals-row total-final">
        <span>TOTAL:</span>
        <span>${Math.round(calculationResults.projectTotalJOD || 0)} JOD</span>
      </div>
    </div>
  `;
};

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
 * Open a new window and write PDF content
 */
export const openPDFWindow = (htmlContent, title) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups for this site.');
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
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
