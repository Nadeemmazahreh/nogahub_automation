#!/usr/bin/env node

/**
 * Import Equipment from Excel to Supabase
 *
 * This script imports equipment data from two Excel files:
 * 1. Pricing Excel: USD (NON USA) DEALER 4536 June 2025.xlsx
 * 2. Weights Excel: Weights & Dimensions Product List 2025.xlsx
 *
 * Usage:
 *   node scripts/import-equipment-excel.js [--dry-run]
 *
 * Options:
 *   --dry-run: Preview the data without making changes to the database
 */

require('dotenv').config();
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const os = require('os');

// Configuration
const PRICING_EXCEL_PATH = path.join(
  os.homedir(),
  'Desktop/void/Void Dealer 2025/USD (NON USA) DEALER 4536 June 2025.xlsx'
);

const WEIGHTS_EXCEL_PATH = path.join(
  os.homedir(),
  'Desktop/void/Void Dealer 2025/Weights & Dimensions Product List 2025.xlsx'
);

const DEFAULT_WEIGHT = 1.0; // kg
const HEADER_ROW = 8; // Row 8 contains headers (0-indexed = 7)
const DATA_START_ROW = 10; // Data starts at row 10 (0-indexed = 9)

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run');

// Create Supabase client with service role key (admin privileges)
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Read and parse the pricing Excel file
 * Returns array of equipment items with pricing and category
 */
function parsePricingExcel() {
  console.log('📖 Reading pricing Excel file...');

  const workbook = XLSX.readFile(PRICING_EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  const equipment = [];
  let currentCategory = null;

  // Process rows
  for (let i = DATA_START_ROW - 1; i < data.length; i++) {
    const row = data[i];

    if (!row || row.length === 0) continue;

    // Check if this is a category row (has only one non-empty cell)
    const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '');

    if (nonEmptyCells.length === 1 && typeof row[0] === 'string') {
      // This is a category header
      currentCategory = row[0].trim();
      continue;
    }

    // Check if this is a data row (starts with "IT" item number)
    const itemNumber = row[0];
    if (itemNumber && typeof itemNumber === 'string' && itemNumber.startsWith('IT')) {
      const description = row[1];
      const msrpUsd = row[2];
      const dealerUsd = row[3];

      if (description && dealerUsd) {
        equipment.push({
          code: itemNumber.trim(),
          name: description.trim(),
          msrp_usd: parseFloat(msrpUsd) || null,
          dealer_usd: parseFloat(dealerUsd),
          equipment_type: currentCategory,
          category: 'void', // All items are void category
          is_active: true
        });
      }
    }
  }

  console.log(`✓ Found ${equipment.length} equipment items in pricing Excel`);

  // Deduplicate by code (keep first occurrence)
  const uniqueEquipment = [];
  const seenCodes = new Set();
  const duplicates = [];

  equipment.forEach(item => {
    if (seenCodes.has(item.code)) {
      duplicates.push(item.code);
    } else {
      seenCodes.add(item.code);
      uniqueEquipment.push(item);
    }
  });

  if (duplicates.length > 0) {
    console.log(`⚠️  Removed ${duplicates.length} duplicate item codes: ${[...new Set(duplicates)].join(', ')}`);
  }

  return uniqueEquipment;
}

/**
 * Read and parse the weights Excel file
 * Returns a map of item codes to weights
 */
function parseWeightsExcel() {
  console.log('📖 Reading weights Excel file...');

  const workbook = XLSX.readFile(WEIGHTS_EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with headers
  const data = XLSX.utils.sheet_to_json(worksheet);

  const weightsMap = new Map();

  data.forEach(row => {
    const itemNo = row['Item No.'];
    const weight = row['Weight'];

    if (itemNo && weight) {
      weightsMap.set(itemNo.trim(), parseFloat(weight));
    }
  });

  console.log(`✓ Found ${weightsMap.size} items with weight data`);
  return weightsMap;
}

/**
 * Merge pricing and weight data
 */
function mergeEquipmentData(equipment, weightsMap) {
  console.log('🔄 Merging pricing and weight data...');

  let itemsWithWeight = 0;
  let itemsWithDefaultWeight = 0;

  equipment.forEach(item => {
    if (weightsMap.has(item.code)) {
      item.weight = weightsMap.get(item.code);
      itemsWithWeight++;
    } else {
      item.weight = DEFAULT_WEIGHT;
      itemsWithDefaultWeight++;
    }
  });

  console.log(`✓ ${itemsWithWeight} items have actual weight data`);
  console.log(`✓ ${itemsWithDefaultWeight} items using default weight (${DEFAULT_WEIGHT} kg)`);

  return equipment;
}

/**
 * Generate summary statistics
 */
function generateSummary(equipment) {
  const categoryStats = {};

  equipment.forEach(item => {
    const type = item.equipment_type || 'Unknown';
    if (!categoryStats[type]) {
      categoryStats[type] = 0;
    }
    categoryStats[type]++;
  });

  console.log('\n📊 Equipment Summary by Type:');
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count} items`);
    });

  console.log(`\n📦 Total Equipment Items: ${equipment.length}`);
}

/**
 * Import equipment to Supabase
 */
async function importToSupabase(equipment) {
  if (isDryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made to the database');
    console.log('\nSample equipment items (first 5):');
    equipment.slice(0, 5).forEach(item => {
      console.log(JSON.stringify(item, null, 2));
    });
    return;
  }

  console.log('\n🗑️  Deleting existing equipment data...');

  const { error: deleteError } = await supabase
    .from('equipment')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible condition for "all")

  if (deleteError) {
    console.error('❌ Error deleting existing equipment:', deleteError);
    throw deleteError;
  }

  console.log('✓ Existing equipment deleted');

  console.log('\n📥 Importing new equipment data...');

  // Insert in batches of 100 to avoid payload size limits
  const BATCH_SIZE = 100;
  let imported = 0;
  let errors = [];

  for (let i = 0; i < equipment.length; i += BATCH_SIZE) {
    const batch = equipment.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('equipment')
      .insert(batch)
      .select();

    if (error) {
      console.error(`❌ Error importing batch ${i / BATCH_SIZE + 1}:`, error);
      errors.push({ batch: i / BATCH_SIZE + 1, error });
    } else {
      imported += data.length;
      process.stdout.write(`\r   Imported: ${imported}/${equipment.length}`);
    }
  }

  console.log('\n');

  if (errors.length > 0) {
    console.error(`\n⚠️  ${errors.length} batches had errors`);
    errors.forEach(({ batch, error }) => {
      console.error(`   Batch ${batch}:`, error.message);
    });
  }

  console.log(`\n✅ Successfully imported ${imported} equipment items`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Equipment Import');
  console.log('================================\n');

  try {
    // Step 1: Parse pricing Excel
    const equipment = parsePricingExcel();

    // Step 2: Parse weights Excel
    const weightsMap = parseWeightsExcel();

    // Step 3: Merge data
    const mergedEquipment = mergeEquipmentData(equipment, weightsMap);

    // Step 4: Generate summary
    generateSummary(mergedEquipment);

    // Step 5: Import to Supabase
    await importToSupabase(mergedEquipment);

    console.log('\n✅ Import completed successfully!');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
