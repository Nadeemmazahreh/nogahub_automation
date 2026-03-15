# Equipment Import Script - Instructions

This script imports 478 equipment items from Excel files into your Supabase equipment database.

## What It Does

1. **Reads Pricing Data**: Parses `USD (NON USA) DEALER 4536 June 2025.xlsx` for item numbers, descriptions, and pricing
2. **Reads Weight Data**: Parses `Weights & Dimensions Product List 2025.xlsx` for weight information
3. **Merges Data**: Combines both sources by item code
4. **Imports to Database**: Replaces all existing equipment with the new data

## Prerequisites

### 1. Database Migration

First, apply the database migration to add the `equipment_type` column:

```bash
# If you haven't set up Supabase CLI, do this once:
npm install -g supabase
supabase link --project-ref your-project-id

# Push the new migration
supabase db push
```

Or manually run the migration in Supabase SQL Editor:
```sql
-- Copy the contents of:
-- supabase/migrations/20260315000004_add_equipment_type.sql
```

### 2. Environment Variables

Make sure your `.env` file has these variables set:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**IMPORTANT**: You need the **SERVICE_ROLE_KEY** (not the anon key) because this script:
- Deletes all existing equipment
- Batch inserts new equipment
- Bypasses Row Level Security (RLS) policies

## Usage

### Test First (Dry Run)

**Always test first** to preview the data without making changes:

```bash
node scripts/import-equipment-excel.js --dry-run
```

This will show you:
- How many items will be imported
- Equipment breakdown by category
- Sample data from the first 5 items
- How many items have actual weight vs. default weight

### Run the Import

Once you're satisfied with the dry-run results:

```bash
node scripts/import-equipment-excel.js
```

This will:
1. ✅ Delete all existing equipment data
2. ✅ Import 478 new equipment items
3. ✅ Show progress and summary

## Import Details

### Data Mapping

| Excel Column | Database Column | Notes |
|--------------|----------------|-------|
| Item Number | `code` | Unique identifier (e.g., "IT3045") |
| Description | `name` | Equipment name |
| MSRP USD exc tax | `msrp_usd` | Manufacturer's suggested retail price |
| DEALER exc tax | `dealer_usd` | Dealer price |
| Category (header rows) | `equipment_type` | Original Excel category (Air Series, Arc Series, etc.) |
| - | `category` | All set to 'void' |
| - | `weight` | From weights file, or 1 kg default |
| - | `is_active` | All set to `true` |

### Equipment Categories

The script found these equipment types:
- **Brackets** (107 items)
- **Spares** (91 items)
- **Drivers** (77 items)
- **Accessories** (44 items)
- **Air Series** (43 items)
- **Venu** (39 items)
- **Cyclone** (21 items)
- **Arc Series** (17 items)
- **Electronics** (17 items)
- **Indigo** (9 items)
- **Incubus And Nexus** (7 items)
- **Stasys** (5 items)
- **Cirrus** (1 item)

### Weight Handling

- **213 items** have actual weight data from the weights Excel file
- **265 items** use the default weight of **1 kg**

## Troubleshooting

### Error: Missing Supabase credentials

Make sure your `.env` file contains:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these from: Supabase Dashboard → Project Settings → API

### Error: Cannot find Excel files

The script looks for files at:
- `~/Desktop/void/Void Dealer 2025/USD (NON USA) DEALER 4536 June 2025.xlsx`
- `~/Desktop/void/Void Dealer 2025/Weights & Dimensions Product List 2025.xlsx`

Make sure these files exist at these exact paths.

### Error: Migration not applied

Run the database migration first:
```bash
supabase db push
```

Or manually apply `supabase/migrations/20260315000004_add_equipment_type.sql` in Supabase SQL Editor.

## Safety Features

- **Dry-run mode**: Test before importing
- **Batch processing**: Imports in batches of 100 to avoid timeouts
- **Error logging**: Shows which batches failed and why
- **Progress indicator**: Shows import progress in real-time

## After Import

Once imported, you can verify the data:

1. **In Supabase Dashboard**:
   - Go to Table Editor → equipment
   - Check that you have 478 rows
   - Verify the data looks correct

2. **In your application**:
   - The equipment should now be available in the equipment catalog
   - All items are marked as `is_active = true`
   - All items have `category = 'void'`

## Backup

**IMPORTANT**: This script **replaces all existing equipment data**. If you need to keep the old data:

1. Export existing equipment from Supabase before running:
   ```sql
   SELECT * FROM equipment;
   ```
   (Download as CSV from Supabase Dashboard)

2. Or create a backup table:
   ```sql
   CREATE TABLE equipment_backup AS SELECT * FROM equipment;
   ```
