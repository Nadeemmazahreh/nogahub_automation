# Equipment Weight Update Process

This document explains how to update equipment weights in the NogaHub database using the Excel sheet data.

## Overview

The weight update system will:
1. Read weight data from the Excel file "Weights & Dimensions Product List 2025.xlsx"
2. Update existing equipment weights in the database
3. Set a default weight of 2kg for items not found in the Excel sheet
4. Generate detailed logs of all changes

## Files Created

- `update_weights.js` - Main script to update equipment weights
- `weight_update_log.txt` - Log file (created when script runs)

## Excel File Structure

The Excel file should contain these columns:
- **Item No.** - Equipment code (matches database `code` field)
- **Weight** - Weight value in kg format (e.g., "2.5kg" or "2.5")

Current Excel file location: `/Users/cardano/Desktop/Void/Void Dealer 2025/Weights & Dimensions Product List 2025.xlsx`

## Database Schema

Equipment weights are stored in the `Equipment` table with:
- Field: `weight` (DECIMAL(8,2))
- Validation: Must be positive number with 2 decimal precision
- Required: Yes (cannot be null)

## How to Run the Weight Update

### Step 1: Get Admin Authentication Token

1. Open the NogaHub application in your browser
2. Log in as an admin user
3. Open browser Developer Tools (F12)
4. Go to Application > Local Storage
5. Find the `authToken` key and copy its value

### Step 2: Run the Update Script

```bash
node update_weights.js <your_auth_token>
```

Example:
```bash
node update_weights.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTY5...
```

### Step 3: Monitor the Process

The script will:
- Display progress in the console
- Create a detailed log file (`weight_update_log.txt`)
- Show a summary when completed

## Expected Results

### From Excel Analysis:
- **Total items in Excel**: 218
- **Sample weights**: Range from 0.12kg to 66kg
- **All items have valid weights**: Yes

### Update Process:
- Items found in Excel → Updated with Excel weight
- Items not in Excel → Set to default 2kg weight
- Unchanged items → Logged but not updated
- Errors → Logged and counted

## Sample Log Output

```
[2025-07-24T11:25:33.569Z] Starting weight update process...
[2025-07-24T11:25:33.605Z] Reading Excel file...
[2025-07-24T11:25:33.820Z] Parsed 218 items from Excel file
[2025-07-24T11:25:33.821Z] Fetching current equipment from database...
[2025-07-24T11:25:34.156Z] Fetched 150 equipment items from database
[2025-07-24T11:25:34.200Z] IT2900: Updated from Excel (1.0kg -> 0.12kg)
[2025-07-24T11:25:34.245Z] IT9999: Set to default weight (5.0kg -> 2.0kg) - not found in Excel

=== UPDATE SUMMARY ===
Total equipment items processed: 150
Successfully updated: 45
Items not found in Excel (set to default 2kg): 25
Items set to default weight: 25
Errors encountered: 0
Items from Excel data: 218
```

## API Endpoints Used

- **GET** `/api/equipment` - Fetch all equipment (requires admin auth)
- **PUT** `/api/equipment/:id` - Update equipment by ID (requires admin auth)

## Error Handling

The script handles:
- ✅ Missing Excel file
- ✅ Invalid Excel format
- ✅ Network errors
- ✅ Authentication failures
- ✅ Invalid weight values
- ✅ Missing equipment items

## Configuration

You can modify the configuration in `update_weights.js`:

```javascript
const CONFIG = {
    excelPath: '/path/to/your/excel/file.xlsx',
    backendUrl: 'http://localhost:5001/api',
    defaultWeight: 2.0, // Default weight in kg
    logFile: 'weight_update_log.txt'
};
```

## Railway Backend Integration

The script works with the Railway backend because:
1. It uses the same API endpoints as the frontend
2. Authentication is handled via JWT tokens
3. All changes are made through the existing validation layer
4. The database schema remains unchanged

## Verification

After running the script:
1. Check the log file for detailed results
2. Log into the NogaHub admin panel
3. Verify that equipment weights have been updated
4. Check that items not in Excel now show 2kg weight

## Troubleshooting

### Common Issues:

1. **"Authentication failed"**
   - Check that your auth token is valid
   - Ensure you're logged in as an admin user
   - Try getting a fresh token

2. **"Excel file not found"**
   - Verify the file path in CONFIG.excelPath
   - Check file permissions

3. **"Network errors"**
   - Ensure the backend server is running
   - Check the backendUrl in CONFIG

4. **"Permission denied"**
   - Only admin users can update equipment
   - Check your user role in the system

### Getting Help

If you encounter issues:
1. Check the `weight_update_log.txt` file for detailed error messages
2. Verify the backend server is running (`npm run dev` in backend directory)
3. Test API connection with the health endpoint: `curl http://localhost:5001/api/health`

## Security Notes

- Keep authentication tokens secure
- Don't commit tokens to version control
- Tokens expire - get a fresh one if script fails with auth errors
- Only run this script in a trusted environment

## Backup Recommendation

Before running the weight update:
1. Consider backing up your database
2. Test with a smaller subset first
3. Review the Excel data for accuracy