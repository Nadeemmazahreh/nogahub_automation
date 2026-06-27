#!/usr/bin/env node
/**
 * Import Void Acoustics 2026 Price List into Supabase
 *
 * Source: Google Sheet (MSRP effective March 1st 2026)
 * https://docs.google.com/spreadsheets/d/1uJBCDjOibgfdRjSX9__AOdds4YVGAzhbSRhbi6CFllw
 *
 * Tabs imported:
 *   gid=73114857  → MSRP Price List      (main products + brackets + accessories)
 *   gid=381110889 → MSRP Spares Price List (drivers, recones, diaphragms, crossovers)
 *
 * Dealer price strategy (no dealer column in 2026 sheet):
 *   - Existing SKU with % change  → new_dealer = old_dealer × (1 + pct)
 *   - Existing SKU, blank %       → dealer unchanged, needs_dealer_review = true
 *   - New SKU not in DB           → dealer_usd = msrp_usd (placeholder), needs_dealer_review = true
 *   - Spare SKU (no % column)     → dealer unchanged if in DB, else dealer = msrp
 *
 * Removed SKUs (in DB but not in either sheet) → is_active = false (not deleted)
 *
 * Usage:
 *   node scripts/import-void-2026-pricelist.js [--dry-run]
 */

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────

const SHEET_ID = '1uJBCDjOibgfdRjSX9__AOdds4YVGAzhbSRhbi6CFllw';
const TABS = {
  main:   { gid: '73114857',  label: 'MSRP Price List' },
  spares: { gid: '381110889', label: 'MSRP Spares Price List' },
};

const PRICELIST_VERSION         = '2026-03-01';
const PRICELIST_VERSION_INACTIVE = '2026-03-01-DEACTIVATED';
const DEFAULT_WEIGHT = 1.0;
const REPORT_PATH    = path.join('/tmp', 'void-2026-import-report.json');

const isDryRun = process.argv.includes('--dry-run');

const supabaseUrl     = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey     = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── CSV helpers ───────────────────────────────────────────────────────────

function parseCsvLine(line) {
  // RFC-4180-ish: handle double-quoted fields with embedded commas / quotes
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(field.trim()); field = ''; }
      else { field += ch; }
    }
  }
  fields.push(field.trim());
  return fields;
}

function parseCsv(text) {
  return text
    .split('\n')
    .map(l => l.endsWith('\r') ? l.slice(0, -1) : l)
    .map(parseCsvLine);
}

/** Parse currency strings like " 1,051.22 " or "1051.22" → number | null */
function parseCurrency(raw) {
  if (!raw) return null;
  const s = String(raw).trim().replace(/,/g, '');
  if (!s || s.toLowerCase().includes('contact') || s.toLowerCase().includes('tbc') || s === 'N/A') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Parse percentage strings like "3.5%", "-11.1%", "" → number | null */
function parsePct(raw) {
  if (!raw) return null;
  const s = String(raw).trim().replace('%', '');
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n / 100;
}

// ─── Fetch sheet tab ───────────────────────────────────────────────────────

async function fetchTab(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const response = await axios.get(url, { responseType: 'text', timeout: 30000 });
  return parseCsv(response.data);
}

// ─── Parse main tab ────────────────────────────────────────────────────────
//
// Columns (0-indexed):
//  0: (merged label, often empty)   1: (section label, often empty)
//  2: Product Number (IT####)       3: Product Type
//  4: Product Name                  5: Product Specifics
//  6: Description                   7-13: bracket compatibility dots
//  14: Suggested Amp               15: USD MSRP                16: +/- %

function parseMainTab(rows) {
  const items = new Map(); // code → item
  let section = null;

  for (const row of rows) {
    const col2 = (row[2] || '').trim();
    const col3 = (row[3] || '').trim();
    const col15 = row[15];
    const col16 = row[16];

    // Section header rows: text in col2, nothing in col3
    // Recognise them by no IT#### in col2 and non-empty text
    if (col2 && !col2.match(/^IT\d+/) && !col3) {
      // Skip sub-header lines like "Product Number", "TU,T51..." etc.
      if (!col2.match(/^(Product|,|\s)/) && col2.length < 120) {
        section = col2;
      }
      continue;
    }

    if (!col2.match(/^IT\d+/)) continue;

    const code  = col2.replace(/\s+/g, ''); // strip stray spaces e.g. "IT4458 "
    const name  = buildName(row);
    const msrp  = parseCurrency(col15);
    const pct   = parsePct(col16);

    if (!msrp) continue; // skip Contact Sales / blank price rows

    if (!items.has(code)) {
      items.set(code, { code, name, msrp_usd: msrp, pct_change: pct, equipment_type: section, source: 'main' });
    }
  }

  return items;
}

function buildName(row) {
  // name = "Product Name" + optional " - Product Specifics"
  const base  = (row[4] || '').trim();
  const spec  = (row[5] || '').trim();
  if (spec) return `${base} - ${spec}`;
  return base;
}

// ─── Parse spares tab ──────────────────────────────────────────────────────
//
// Columns (0-indexed, after header row 8):
//  0: (blank)  1: Series  2: Product  3: Use  4: Name  5: SKU  6: MSRP

function parseSparesTab(rows) {
  const items = new Map();
  let headerSeen = false;

  for (const row of rows) {
    const col1 = (row[1] || '').trim();
    const col5 = (row[5] || '').trim();
    const col6 = row[6];

    // Detect header row
    if (col1 === 'Series' && col5 === 'SKU') { headerSeen = true; continue; }
    if (!headerSeen) continue;

    if (!col5.match(/^IT\d+/)) continue;

    const code = col5.trim();
    const msrp = parseCurrency(col6);

    // "Contact Sales" → msrp is null → skip msrp update, but mark code as seen
    const series  = (row[1] || '').trim();
    const product = (row[2] || '').trim();
    const use     = (row[3] || '').trim();
    const partName = (row[4] || '').trim();
    const name    = `${product} - ${use} - ${partName}`.replace(/^( - )+|( - )+$/g, '').trim();

    if (!items.has(code)) {
      items.set(code, { code, name, msrp_usd: msrp, pct_change: null, equipment_type: 'Spares', source: 'spares' });
    }
  }

  return items;
}

// ─── Load existing DB rows ─────────────────────────────────────────────────

async function loadDbEquipment() {
  const { data, error } = await supabase
    .from('equipment')
    .select('id, code, name, msrp_usd, dealer_usd, weight, category, equipment_type, is_active');

  if (error) throw new Error(`Failed to load equipment: ${error.message}`);

  const map = new Map();
  for (const row of data) map.set(row.code, row);
  console.log(`✓ Loaded ${map.size} existing rows from DB`);
  return map;
}

// ─── Build upsert rows ─────────────────────────────────────────────────────

function buildImportRows(sheetItems, dbItems) {
  const importRows   = [];
  const reviewNeeded = [];
  const newSKUs      = [];

  for (const [code, item] of sheetItems) {
    const db = dbItems.get(code);
    let dealer, weight, needsReview;

    if (db) {
      weight = db.weight ?? DEFAULT_WEIGHT;

      if (item.source === 'spares') {
        // Spares: keep existing dealer unchanged; only refresh msrp if numeric
        dealer      = db.dealer_usd;
        needsReview = db.needs_dealer_review ?? false;
        // If msrp is null (Contact Sales), keep existing msrp
        if (!item.msrp_usd) item.msrp_usd = db.msrp_usd;
      } else if (item.pct_change !== null) {
        dealer      = Math.round(db.dealer_usd * (1 + item.pct_change) * 100) / 100;
        needsReview = false;
      } else {
        // No % change on this SKU (new launch) — keep old dealer if exists, flag review
        dealer      = db.dealer_usd || item.msrp_usd;
        needsReview = true;
        reviewNeeded.push({ code, name: item.name, msrp: item.msrp_usd, reason: 'no_pct_in_sheet' });
      }
    } else {
      // Entirely new SKU
      dealer      = item.msrp_usd;
      weight      = DEFAULT_WEIGHT;
      needsReview = true;
      newSKUs.push({ code, name: item.name, msrp: item.msrp_usd, equipment_type: item.equipment_type });
    }

    if (!item.msrp_usd || !dealer) continue; // can't insert without both prices

    importRows.push({
      code,
      name:                 item.name,
      msrp_usd:             item.msrp_usd,
      dealer_usd:           dealer,
      weight,
      category:             'void',
      equipment_type:       item.equipment_type,
      is_active:            true,
      pricelist_version:    PRICELIST_VERSION,
      needs_dealer_review:  needsReview,
    });
  }

  return { importRows, reviewNeeded, newSKUs };
}

// ─── Deactivate removed SKUs ───────────────────────────────────────────────

function findDeactivated(sheetItems, dbItems) {
  const deactivated = [];
  for (const [code, row] of dbItems) {
    if (!sheetItems.has(code) && row.is_active) {
      deactivated.push({ code, name: row.name, equipment_type: row.equipment_type });
    }
  }
  return deactivated;
}

// ─── Dry-run report ────────────────────────────────────────────────────────

function printDryRunReport(importRows, deactivated, reviewNeeded, newSKUs) {
  console.log('\n══════════════ DRY RUN REPORT ══════════════');

  // By section
  const byType = {};
  for (const r of importRows) {
    const t = r.equipment_type || 'Unknown';
    byType[t] = (byType[t] || 0) + 1;
  }
  console.log('\n📊 Items to upsert by section:');
  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, c]) => console.log(`   ${t}: ${c}`));
  console.log(`\n   TOTAL upsert: ${importRows.length}`);

  console.log(`\n🔴 SKUs to deactivate: ${deactivated.length}`);
  if (deactivated.length <= 30) {
    deactivated.forEach(d => console.log(`   ${d.code}  ${d.name}`));
  } else {
    deactivated.slice(0, 10).forEach(d => console.log(`   ${d.code}  ${d.name}`));
    console.log(`   ... and ${deactivated.length - 10} more`);
  }

  console.log(`\n🆕 New SKUs (not in DB, dealer = MSRP placeholder): ${newSKUs.length}`);
  newSKUs.forEach(s => console.log(`   ${s.code}  ${s.name}  MSRP=${s.msrp}  type=${s.equipment_type}`));

  console.log(`\n⚠️  Needs dealer review (no % or new SKU): ${reviewNeeded.length}`);
  reviewNeeded.forEach(r => console.log(`   ${r.code}  ${r.name}  MSRP=${r.msrp}  reason=${r.reason}`));

  console.log('\n──────────────────────────────────────────────');
  console.log('Run without --dry-run to apply these changes.');
}

// ─── Apply to Supabase ─────────────────────────────────────────────────────

async function applyToSupabase(importRows, deactivated) {
  const BATCH = 100;
  let upserted = 0;
  const errors = [];

  console.log('\n📥 Upserting equipment rows (on conflict: code)...');
  for (let i = 0; i < importRows.length; i += BATCH) {
    const batch = importRows.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('equipment')
      .upsert(batch, { onConflict: 'code' })
      .select('id');

    if (error) {
      errors.push({ batch: Math.floor(i / BATCH) + 1, message: error.message });
      console.error(`   ❌ Batch ${Math.floor(i / BATCH) + 1} error: ${error.message}`);
    } else {
      upserted += data.length;
      process.stdout.write(`\r   Upserted: ${upserted}/${importRows.length}`);
    }
  }
  console.log();

  if (deactivated.length > 0) {
    console.log(`\n🔴 Deactivating ${deactivated.length} removed SKUs...`);
    const codes = deactivated.map(d => d.code);

    for (let i = 0; i < codes.length; i += BATCH) {
      const batch = codes.slice(i, i + BATCH);
      const { error } = await supabase
        .from('equipment')
        .update({ is_active: false, pricelist_version: PRICELIST_VERSION_INACTIVE })
        .in('code', batch);

      if (error) {
        errors.push({ batch: `deactivate-${i}`, message: error.message });
        console.error(`   ❌ Deactivate batch error: ${error.message}`);
      }
    }
    console.log('   ✓ Done');
  }

  if (errors.length) {
    console.error(`\n⚠️  ${errors.length} batch errors — see report`);
  }

  return { upserted, errors };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Void Acoustics 2026 Price List Import');
  console.log('==========================================\n');
  if (isDryRun) console.log('🔍 DRY RUN — no changes will be made\n');

  // 1. Fetch sheet tabs
  console.log('📡 Fetching sheet tabs from Google Sheets...');
  const [mainRows, sparesRows] = await Promise.all([
    fetchTab(TABS.main.gid),
    fetchTab(TABS.spares.gid),
  ]);
  console.log(`   Main tab:   ${mainRows.length} CSV rows`);
  console.log(`   Spares tab: ${sparesRows.length} CSV rows`);

  // 2. Parse
  console.log('\n🔍 Parsing...');
  const mainItems   = parseMainTab(mainRows);
  const sparesItems = parseSparesTab(sparesRows);

  // Merge: spares win only for codes not already in main
  const allSheetItems = new Map(mainItems);
  for (const [code, item] of sparesItems) {
    if (!allSheetItems.has(code)) allSheetItems.set(code, item);
  }

  console.log(`   Main products:  ${mainItems.size}`);
  console.log(`   Spare parts:    ${sparesItems.size}`);
  console.log(`   Combined:       ${allSheetItems.size} unique codes`);

  // 3. Load DB
  console.log('\n📊 Loading existing DB equipment...');
  const dbItems = await loadDbEquipment();

  // 4. Build import rows
  const { importRows, reviewNeeded, newSKUs } = buildImportRows(allSheetItems, dbItems);
  const deactivated = findDeactivated(allSheetItems, dbItems);

  // 5. Report
  if (isDryRun) {
    printDryRunReport(importRows, deactivated, reviewNeeded, newSKUs);
    process.exit(0);
  }

  // 6. Apply
  const { upserted, errors } = await applyToSupabase(importRows, deactivated);

  // 7. Write report
  const report = {
    run_at:        new Date().toISOString(),
    pricelist_version: PRICELIST_VERSION,
    summary: {
      upserted,
      deactivated:       deactivated.length,
      new_skus:          newSKUs.length,
      needs_dealer_review: reviewNeeded.length + newSKUs.length,
      errors:            errors.length,
    },
    new_skus:          newSKUs,
    needs_dealer_review: reviewNeeded,
    deactivated,
    errors,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report written to ${REPORT_PATH}`);

  console.log('\n✅ Import complete!');
  console.log(`   Upserted:            ${upserted}`);
  console.log(`   Deactivated:         ${deactivated.length}`);
  console.log(`   New SKUs (review):   ${newSKUs.length}`);
  console.log(`   Dealer review items: ${reviewNeeded.length}`);

  if (reviewNeeded.length + newSKUs.length > 0) {
    console.log(`\n⚠️  ${reviewNeeded.length + newSKUs.length} items need real dealer prices.`);
    console.log(`   See ${REPORT_PATH} → needs_dealer_review + new_skus.`);
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
