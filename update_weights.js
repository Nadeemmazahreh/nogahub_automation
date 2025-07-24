const XLSX = require('xlsx');
const axios = require('axios');
const fs = require('fs');

// Configuration
const CONFIG = {
    excelPath: '/Users/cardano/Desktop/Void/Void Dealer 2025/Weights & Dimensions Product List 2025.xlsx',
    backendUrl: 'https://nogahubautomation-production.up.railway.app/api', // Production Railway backend
    defaultWeight: 2.0, // Default weight for items not in Excel (2kg as requested)
    logFile: 'weight_update_log.txt'
};

// Helper function to log messages
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Helper function to clean weight value from Excel (remove 'kg' suffix if present)
function parseWeight(weightStr) {
    if (typeof weightStr === 'number') return weightStr;
    if (typeof weightStr === 'string') {
        const cleaned = weightStr.replace(/kg$/i, '').trim();
        const weight = parseFloat(cleaned);
        return isNaN(weight) ? null : weight;
    }
    return null;
}

// Read and parse Excel data
function readExcelData() {
    log('Reading Excel file...');
    
    try {
        const workbook = XLSX.readFile(CONFIG.excelPath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Skip header row and process data
        const weightData = {};
        const headers = jsonData[0];
        const itemNoIndex = headers.indexOf('Item No.');
        const weightIndex = headers.indexOf('Weight');
        
        if (itemNoIndex === -1 || weightIndex === -1) {
            throw new Error('Required columns (Item No. or Weight) not found in Excel file');
        }
        
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const itemCode = row[itemNoIndex];
            const weightValue = row[weightIndex];
            
            if (itemCode && weightValue) {
                const parsedWeight = parseWeight(weightValue);
                if (parsedWeight !== null && parsedWeight > 0) {
                    weightData[itemCode] = parsedWeight;
                }
            }
        }
        
        log(`Parsed ${Object.keys(weightData).length} items from Excel file`);
        return weightData;
        
    } catch (error) {
        log(`Error reading Excel file: ${error.message}`);
        throw error;
    }
}

// Get current equipment from database
async function getCurrentEquipment(authToken) {
    log('Fetching current equipment from database...');
    
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
        
        log(`Fetched ${response.data.equipment.length} equipment items from database`);
        return response.data.equipment;
        
    } catch (error) {
        log(`Error fetching equipment: ${error.message}`);
        throw error;
    }
}

// Update equipment weight
async function updateEquipmentWeight(equipment, newWeight, authToken) {
    try {
        const updateData = {
            code: equipment.code,
            name: equipment.name,
            msrpUSD: equipment.msrpUSD,
            dealerUSD: equipment.dealerUSD,
            weight: newWeight,
            category: equipment.category,
            isActive: equipment.isActive
        };
        
        const response = await axios.put(
            `${CONFIG.backendUrl}/equipment/${equipment.id}`,
            updateData,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data;
        
    } catch (error) {
        log(`Error updating equipment ${equipment.code}: ${error.message}`);
        throw error;
    }
}

// Main function to process weight updates
async function updateWeights(authToken) {
    try {
        // Clear log file
        fs.writeFileSync(CONFIG.logFile, '');
        log('Starting weight update process...');
        
        // Read Excel data
        const excelWeights = readExcelData();
        
        // Get current equipment
        const currentEquipment = await getCurrentEquipment(authToken);
        
        let updatedCount = 0;
        let notFoundCount = 0;
        let defaultWeightCount = 0;
        let errorCount = 0;
        
        // Process each equipment item
        for (const equipment of currentEquipment) {
            try {
                let newWeight;
                let updateReason;
                
                if (excelWeights[equipment.code]) {
                    // Found in Excel - use Excel weight
                    newWeight = excelWeights[equipment.code];
                    updateReason = `Updated from Excel (${equipment.weight}kg -> ${newWeight}kg)`;
                } else {
                    // Not found in Excel - use default weight
                    newWeight = CONFIG.defaultWeight;
                    updateReason = `Set to default weight (${equipment.weight}kg -> ${newWeight}kg) - not found in Excel`;
                    notFoundCount++;
                }
                
                // Only update if weight is different
                if (Math.abs(equipment.weight - newWeight) > 0.001) {
                    await updateEquipmentWeight(equipment, newWeight, authToken);
                    log(`${equipment.code}: ${updateReason}`);
                    updatedCount++;
                    
                    if (newWeight === CONFIG.defaultWeight) {
                        defaultWeightCount++;
                    }
                } else {
                    log(`${equipment.code}: Weight unchanged (${equipment.weight}kg)`);
                }
                
                // Add small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                log(`Failed to update ${equipment.code}: ${error.message}`);
                errorCount++;
            }
        }
        
        // Summary
        log('\\n=== UPDATE SUMMARY ===');
        log(`Total equipment items processed: ${currentEquipment.length}`);
        log(`Successfully updated: ${updatedCount}`);
        log(`Items not found in Excel (set to default ${CONFIG.defaultWeight}kg): ${notFoundCount}`);
        log(`Items set to default weight: ${defaultWeightCount}`);
        log(`Errors encountered: ${errorCount}`);
        log(`Items from Excel data: ${Object.keys(excelWeights).length}`);
        
        return {
            processed: currentEquipment.length,
            updated: updatedCount,
            notFound: notFoundCount,
            defaultWeight: defaultWeightCount,
            errors: errorCount
        };
        
    } catch (error) {
        log(`Critical error in weight update process: ${error.message}`);
        throw error;
    }
}

// Export the function for use in other scripts
module.exports = { updateWeights, CONFIG };

// If running directly, prompt for auth token
if (require.main === module) {
    console.log('Weight Update Script');
    console.log('===================');
    console.log('');
    console.log('This script will:');
    console.log('1. Read weights from the Excel file');
    console.log('2. Update equipment weights in the database');
    console.log('3. Set default weight of 2kg for items not in Excel');
    console.log('');
    console.log('IMPORTANT: You need an admin authentication token to run this script.');
    console.log('You can get a token by:');
    console.log('1. Logging into the application as an admin user');
    console.log('2. Opening browser dev tools > Application > Local Storage');
    console.log('3. Finding the "token" key and copying its value');
    console.log('');
    console.log('Usage: node update_weights.js <auth_token>');
    console.log('Example: node update_weights.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    
    const authToken = process.argv[2];
    if (!authToken) {
        console.log('\\nError: Please provide an authentication token as an argument.');
        process.exit(1);
    }
    
    updateWeights(authToken)
        .then(result => {
            console.log('\\nWeight update completed successfully!');
            console.log('Check weight_update_log.txt for detailed logs.');
        })
        .catch(error => {
            console.error('\\nWeight update failed:', error.message);
            console.log('Check weight_update_log.txt for detailed logs.');
            process.exit(1);
        });
}