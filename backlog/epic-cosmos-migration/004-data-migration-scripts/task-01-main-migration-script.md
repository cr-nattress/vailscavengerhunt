# Task: Main Migration Script

## Objective
Create the primary script to migrate all data from Netlify Blobs to Cosmos DB with comprehensive error handling and validation.

## Prompt
```
Create a comprehensive data migration script to move all existing data from Netlify Blobs to Azure Cosmos DB.

Requirements:
1. Create `scripts/migrate-netlify-to-cosmos.js`
2. Migrate these data types with progress tracking:
   - Settings data from `settings/` prefix
   - Progress data from `progress/` prefix
   - Session data from `sessions/` prefix
3. Include these features:
   - Batch processing for large datasets
   - Progress reporting with counts
   - Error handling and retry logic
   - Data validation before insertion
   - Comprehensive logging
4. Calculate team scores during migration
5. Handle missing or corrupted data gracefully
6. Provide summary report at completion

Use this structure from the epic specification as your starting point:

```javascript
const { getStore } = require("@netlify/blobs");
const { CosmosClient } = require("@azure/cosmos");
require('dotenv').config();

async function migrateData() {
  console.log("Starting migration from Netlify Blobs to Cosmos DB...\\n");

  // Initialize connections
  // Process each data type
  // Provide summary
}

function calculateScore(progress) {
  return Object.values(progress).filter(p => p.done).length * 10;
}
```

Ensure the script is idempotent and provides clear feedback on what was migrated and any errors encountered.
```

## Expected Deliverables
- Complete migration script in `scripts/migrate-netlify-to-cosmos.js`
- Package.json script entry for execution
- Progress tracking and error reporting
- Data validation and summary reporting

## Success Criteria
- Script successfully migrates all data types
- Progress tracking shows real-time status
- Error handling prevents data corruption
- Summary report shows migration completeness