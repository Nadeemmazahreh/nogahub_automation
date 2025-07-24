const XLSX = require('xlsx');
const axios = require('axios');
const fs = require('fs');

// Configuration
const CONFIG = {
    backendUrl: 'https://nogahubautomation-production.up.railway.app/api',
    outputFile: 'equipment_database_export.xlsx',
    logFile: 'export_log.txt'
};

// Helper function to log messages
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Fetch all equipment from the database
async function fetchAllEquipment(authToken) {
    log('Fetching all equipment from production database...');
    
    try {
        const response = await axios.get(`${CONFIG.backendUrl}/equipment`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            params: {
                limit: 10000 // Get all equipment
            }
        });
        
        log(`Successfully fetched ${response.data.equipment.length} equipment items`);
        return response.data.equipment;
        
    } catch (error) {
        log(`Error fetching equipment: ${error.message}`);
        throw error;
    }
}

// Convert equipment data to Excel format
function createExcelWorkbook(equipmentData) {
    log('Converting equipment data to Excel format...');
    
    // Prepare data for Excel
    const excelData = equipmentData.map(item => ({
        'Item Code': item.code,
        'Item Name': item.name,
        'Category': item.category,
        'Weight (kg)': item.weight,
        'MSRP USD': item.msrpUSD || 'N/A',
        'Dealer Price USD': item.dealerUSD,
        'Active': item.isActive ? 'Yes' : 'No',
        'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A',
        'Updated At': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
        { wch: 12 }, // Item Code
        { wch: 50 }, // Item Name
        { wch: 15 }, // Category
        { wch: 12 }, // Weight
        { wch: 12 }, // MSRP USD
        { wch: 15 }, // Dealer Price USD
        { wch: 8 },  // Active
        { wch: 12 }, // Created At
        { wch: 12 }  // Updated At
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipment Database');

    // Create summary worksheet
    const summary = [
        { Metric: 'Total Equipment Items', Value: equipmentData.length },
        { Metric: 'Active Items', Value: equipmentData.filter(item => item.isActive).length },
        { Metric: 'Inactive Items', Value: equipmentData.filter(item => !item.isActive).length },
        { Metric: 'Void Category Items', Value: equipmentData.filter(item => item.category === 'void').length },
        { Metric: 'Accessory Category Items', Value: equipmentData.filter(item => item.category === 'accessory').length },
        { Metric: 'Export Date', Value: new Date().toLocaleString() },
        { Metric: 'Lightest Item (kg)', Value: Math.min(...equipmentData.map(item => item.weight)) },
        { Metric: 'Heaviest Item (kg)', Value: Math.max(...equipmentData.map(item => item.weight)) },
        { Metric: 'Average Weight (kg)', Value: Math.round((equipmentData.reduce((sum, item) => sum + item.weight, 0) / equipmentData.length) * 100) / 100 },
        { Metric: 'Total Weight (kg)', Value: Math.round(equipmentData.reduce((sum, item) => sum + item.weight, 0) * 100) / 100 }
    ];

    const summaryWorksheet = XLSX.utils.json_to_sheet(summary);
    summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    return workbook;
}

// Save workbook to file
function saveExcelFile(workbook) {
    log(`Saving Excel file: ${CONFIG.outputFile}`);
    
    try {
        XLSX.writeFile(workbook, CONFIG.outputFile);
        log(`Excel file saved successfully: ${CONFIG.outputFile}`);
        
        const stats = fs.statSync(CONFIG.outputFile);
        log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
        
    } catch (error) {
        log(`Error saving Excel file: ${error.message}`);
        throw error;
    }
}

// Main export function
async function exportEquipmentToExcel(authToken) {
    try {
        // Clear log file
        fs.writeFileSync(CONFIG.logFile, '');
        log('Starting equipment database export to Excel...');
        
        // Fetch equipment data
        const equipmentData = await fetchAllEquipment(authToken);
        
        if (equipmentData.length === 0) {
            log('No equipment data found to export');
            return;
        }
        
        // Create Excel workbook
        const workbook = createExcelWorkbook(equipmentData);
        
        // Save to file
        saveExcelFile(workbook);
        
        // Final summary
        log('\n=== EXPORT SUMMARY ===');
        log(`Equipment items exported: ${equipmentData.length}`);
        log(`Output file: ${CONFIG.outputFile}`);
        log(`Log file: ${CONFIG.logFile}`);
        log('Export completed successfully!');
        
        return {
            success: true,
            itemCount: equipmentData.length,
            outputFile: CONFIG.outputFile
        };
        
    } catch (error) {
        log(`Critical error during export: ${error.message}`);
        throw error;
    }
}

// Export the function for use in other scripts
module.exports = { exportEquipmentToExcel, CONFIG };

// If running directly, prompt for auth token
if (require.main === module) {
    console.log('Equipment Database Export to Excel');
    console.log('===================================');
    console.log('');
    console.log('This script will:');
    console.log('1. Fetch all equipment from the production database');
    console.log('2. Export data to Excel with equipment details and summary');
    console.log('3. Include columns: Code, Name, Category, Weight, Prices, Status');
    console.log('');
    console.log('IMPORTANT: You need an admin authentication token to run this script.');
    console.log('You can get a token by:');
    console.log('1. Logging into the application as an admin user');
    console.log('2. Opening browser dev tools > Application > Local Storage');
    console.log('3. Finding the "authToken" key and copying its value');
    console.log('');
    console.log('Usage: node export_equipment_to_excel.js <auth_token>');
    console.log('Example: node export_equipment_to_excel.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    
    const authToken = process.argv[2];
    if (!authToken) {
        console.log('\nError: Please provide an authentication token as an argument.');
        process.exit(1);
    }
    
    exportEquipmentToExcel(authToken)
        .then(result => {
            console.log('\nExport completed successfully!');
            console.log(`Exported ${result.itemCount} items to ${result.outputFile}`);
            console.log('Check export_log.txt for detailed logs.');
        })
        .catch(error => {
            console.error('\nExport failed:', error.message);
            console.log('Check export_log.txt for detailed logs.');
            process.exit(1);
        });
}