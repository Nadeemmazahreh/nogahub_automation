#!/usr/bin/env node
// Dry-run: compare xlsx vs DB codes+prices, then write SQL update script
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const XLSX_PATH = '/Users/cardano/Desktop/Void/2026/USD (non-USA customer) Price List FY26 - 4536.xlsx';
const DB_JSON_PATH = process.argv[2]; // pass path to DB JSON export

// Parse xlsx
const wb = xlsx.readFile(XLSX_PATH);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

const xlsxMap = {};
for (let i = 9; i < rows.length; i++) {
  const code = String(rows[i][2]).replace(/\s+/g, '').trim();
  if (/^IT\d{4}/.test(code) && !xlsxMap[code]) {
    xlsxMap[code] = {
      name: String(rows[i][4]).trim(),
      type: String(rows[i][3]).trim(),
      msrp: Math.round(parseFloat(rows[i][15]) * 100) / 100,
      dealer: Math.round(parseFloat(rows[i][16]) * 100) / 100,
    };
  }
}

// Parse DB data (passed as JSON array)
const dbRaw = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
const dbMap = {};
dbRaw.forEach(r => dbMap[r.code] = r);

const dbCodes = new Set(Object.keys(dbMap));
const xlsxCodes = new Set(Object.keys(xlsxMap));

const toUpdate = [...xlsxCodes].filter(c => dbCodes.has(c));
const toInsert = [...xlsxCodes].filter(c => !dbCodes.has(c));
const dbOnly = [...dbCodes].filter(c => !xlsxCodes.has(c));
const reviewFixed = toUpdate.filter(c => dbMap[c].needs_dealer_review);
const reactivated = toUpdate.filter(c => !dbMap[c].is_active);

console.log('=== DRY RUN REPORT ===');
console.log(`XLSX unique codes : ${xlsxCodes.size}`);
console.log(`DB codes          : ${dbCodes.size}`);
console.log(`Will UPDATE       : ${toUpdate.length}`);
console.log(`  review cleared  : ${reviewFixed.length}`);
console.log(`  reactivated     : ${reactivated.length}`);
console.log(`Will INSERT       : ${toInsert.length}`);
console.log(`DB-only unchanged : ${dbOnly.length}`);

if (reactivated.length) {
  console.log('\nInactive codes xlsx covers (will set is_active=true):');
  reactivated.forEach(c => console.log(`  ${c} - ${dbMap[c].pricelist_version}`));
}

if (toInsert.length) {
  console.log('\nNew codes to INSERT:');
  toInsert.forEach(c => {
    const x = xlsxMap[c];
    console.log(`  ${c} - ${x.name} (${x.type}) msrp=${x.msrp} dealer=${x.dealer}`);
  });
}

const deltas = toUpdate
  .filter(c => dbMap[c].is_active)
  .map(c => ({
    code: c,
    oldDealer: parseFloat(dbMap[c].dealer_usd),
    newDealer: xlsxMap[c].dealer,
    delta: xlsxMap[c].dealer - parseFloat(dbMap[c].dealer_usd),
  }))
  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  .slice(0, 10);

console.log('\nTop 10 price deltas (dealer):');
deltas.forEach(d =>
  console.log(`  ${d.code}  old=${d.oldDealer.toFixed(2)}  new=${d.newDealer.toFixed(2)}  delta=${d.delta > 0 ? '+' : ''}${d.delta.toFixed(2)}`)
);

// Generate SQL
const lines = [];
lines.push('BEGIN;');

// Updates
for (const code of toUpdate) {
  const x = xlsxMap[code];
  const active = !dbMap[code].is_active ? ', is_active = true' : '';
  lines.push(
    `UPDATE public.equipment SET msrp_usd = ${x.msrp}, dealer_usd = ${x.dealer}, ` +
    `pricelist_version = '2026-06-09', needs_dealer_review = false${active} ` +
    `WHERE code = '${code}';`
  );
}

// Inserts
for (const code of toInsert) {
  const x = xlsxMap[code];
  const safeName = x.name.replace(/'/g, "''");
  const safeType = x.type.replace(/'/g, "''");
  lines.push(
    `INSERT INTO public.equipment (code, name, msrp_usd, dealer_usd, weight, category, equipment_type, is_active, pricelist_version, needs_dealer_review) ` +
    `VALUES ('${code}', '${safeName}', ${x.msrp}, ${x.dealer}, 1.0, 'void', '${safeType}', true, '2026-06-09', false) ` +
    `ON CONFLICT (code) DO NOTHING;`
  );
}

lines.push('COMMIT;');

const sqlPath = path.join(__dirname, 'update-void-prices-2026-06-09.sql');
fs.writeFileSync(sqlPath, lines.join('\n'));
console.log(`\nSQL written to: ${sqlPath}`);
console.log(`Total statements: ${lines.length - 2} (${toUpdate.length} updates + ${toInsert.length} inserts)`);
