#!/usr/bin/env node

/**
 * Analyze duplicate item codes in detail
 */

const XLSX = require('xlsx');
const path = require('path');
const os = require('os');

const PRICING_EXCEL_PATH = path.join(
  os.homedir(),
  'Desktop/void/Void Dealer 2025/USD (NON USA) DEALER 4536 June 2025.xlsx'
);

const DATA_START_ROW = 10;

function analyzeDuplicates() {
  console.log('🔍 Analyzing duplicate item codes in detail...\n');

  const workbook = XLSX.readFile(PRICING_EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  const codesMap = new Map();
  let currentCategory = null;

  // Process rows
  for (let i = DATA_START_ROW - 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Check for category row
    const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '');
    if (nonEmptyCells.length === 1 && typeof row[0] === 'string') {
      currentCategory = row[0].trim();
      continue;
    }

    const itemNumber = row[0];
    if (itemNumber && typeof itemNumber === 'string' && itemNumber.startsWith('IT')) {
      const code = itemNumber.trim();

      if (!codesMap.has(code)) {
        codesMap.set(code, []);
      }
      codesMap.get(code).push({
        rowNumber: i + 1,
        code: code,
        description: row[1],
        msrp: row[2],
        dealer: row[3],
        category: currentCategory
      });
    }
  }

  // Find and display duplicates
  let duplicateCount = 0;
  for (const [code, occurrences] of codesMap.entries()) {
    if (occurrences.length > 1) {
      duplicateCount++;
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`DUPLICATE #${duplicateCount}: Code "${code}" appears ${occurrences.length} times\n`);

      occurrences.forEach((item, index) => {
        console.log(`Occurrence ${index + 1}:`);
        console.log(`  Excel Row: ${item.rowNumber}`);
        console.log(`  Code: ${item.code}`);
        console.log(`  Description: ${item.description}`);
        console.log(`  MSRP: $${item.msrp}`);
        console.log(`  Dealer Price: $${item.dealer}`);
        console.log(`  Category: ${item.category}`);
        console.log('');
      });

      // Check if they're identical
      const first = occurrences[0];
      const allIdentical = occurrences.every(item =>
        item.description === first.description &&
        item.msrp === first.msrp &&
        item.dealer === first.dealer &&
        item.category === first.category
      );

      if (allIdentical) {
        console.log(`✓ All occurrences are IDENTICAL - safe to keep only first occurrence`);
      } else {
        console.log(`⚠️  Occurrences have DIFFERENT data - review needed!`);
      }
      console.log('');
    }
  }

  if (duplicateCount === 0) {
    console.log('✅ No duplicates found!');
  } else {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\nTotal duplicate codes found: ${duplicateCount}`);
    console.log(`\nCurrent behavior: Keeping FIRST occurrence of each duplicate`);
  }
}

analyzeDuplicates();
