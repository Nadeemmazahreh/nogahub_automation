#!/usr/bin/env node

/**
 * Find duplicate item codes in the Excel file
 */

const XLSX = require('xlsx');
const path = require('path');
const os = require('os');

const PRICING_EXCEL_PATH = path.join(
  os.homedir(),
  'Desktop/void/Void Dealer 2025/USD (NON USA) DEALER 4536 June 2025.xlsx'
);

const DATA_START_ROW = 10;

function findDuplicates() {
  console.log('🔍 Searching for duplicate item codes...\n');

  const workbook = XLSX.readFile(PRICING_EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  const codesMap = new Map(); // code -> array of row numbers
  const itemsList = [];

  // Process rows
  for (let i = DATA_START_ROW - 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const itemNumber = row[0];
    if (itemNumber && typeof itemNumber === 'string' && itemNumber.startsWith('IT')) {
      const code = itemNumber.trim();

      if (!codesMap.has(code)) {
        codesMap.set(code, []);
      }
      codesMap.get(code).push({
        rowNumber: i + 1,
        description: row[1]
      });

      itemsList.push({
        code,
        description: row[1],
        rowNumber: i + 1
      });
    }
  }

  // Find duplicates
  const duplicates = [];
  for (const [code, occurrences] of codesMap.entries()) {
    if (occurrences.length > 1) {
      duplicates.push({ code, occurrences });
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found! All item codes are unique.');
    console.log(`Total unique items: ${codesMap.size}`);
  } else {
    console.log(`❌ Found ${duplicates.length} duplicate item codes:\n`);

    duplicates.forEach(({ code, occurrences }) => {
      console.log(`Code: ${code} (appears ${occurrences.length} times)`);
      occurrences.forEach(({ rowNumber, description }) => {
        console.log(`  - Row ${rowNumber}: ${description}`);
      });
      console.log('');
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total items in Excel: ${itemsList.length}`);
    console.log(`   Unique codes: ${codesMap.size}`);
    console.log(`   Duplicate codes: ${duplicates.length}`);
    console.log(`   Extra rows due to duplicates: ${itemsList.length - codesMap.size}`);
  }
}

findDuplicates();
